/**
 * Clear / blast particle burst VFX.
 * Pooled Graphics + one shared ticker callback to avoid long-match GC thrash.
 * No-op when prefers-reduced-motion is set.
 */
import * as PIXI from "pixi.js-legacy";
import { prefersReducedMotion } from "../a11y";
import { app, gameTicker } from "../runtime";
import type { SpriteData } from "../game/board-state";
import { unitInterval } from "../util/clamp";

const PARTICLE_COUNT = 8;
const LIFE_FRAMES = 20;
const POOL_CAP = 256;

type Particle = {
  g: PIXI.Graphics;
  vx: number;
  vy: number;
  age: number;
  active: boolean;
};

const pool: Particle[] = [];
let tickerHooked = false;

const acquire = (): Particle => {
  for (const p of pool) {
    if (!p.active) return p;
  }
  if (pool.length < POOL_CAP) {
    const g = new PIXI.Graphics();
    g.beginFill(0xffffff);
    g.drawCircle(0, 0, 4);
    g.endFill();
    const p: Particle = { g, vx: 0, vy: 0, age: 0, active: false };
    pool.push(p);
    return p;
  }
  // Soft overflow: reuse oldest active (rare under normal clear rates).
  return pool[0];
};

const release = (p: Particle): void => {
  p.active = false;
  p.age = 0;
  p.g.alpha = 1;
  p.g.scale.set(1);
  if (p.g.parent) p.g.parent.removeChild(p.g);
};

const tickParticles = (delta: number): void => {
  let any = false;
  for (const p of pool) {
    if (!p.active) continue;
    any = true;
    p.age += delta;
    p.g.x += p.vx * delta;
    p.g.y += p.vy * delta;
    const t = unitInterval(p.age / LIFE_FRAMES);
    p.g.alpha = 1 - t;
    p.g.scale.set(1 - t);
    if (p.age >= LIFE_FRAMES) release(p);
  }
  if (!any && tickerHooked) {
    gameTicker.remove(tickParticles);
    tickerHooked = false;
  }
};

const ensureTicker = (): void => {
  if (tickerHooked) return;
  gameTicker.add(tickParticles);
  tickerHooked = true;
};

export const createParticles = (list: SpriteData[]) => {
  if (prefersReducedMotion()) return;
  for (const sp of list) {
    const { x, y } = sp.sprite;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = acquire();
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.age = 0;
      p.active = true;
      p.g.x = x;
      p.g.y = y;
      p.g.alpha = 1;
      p.g.scale.set(1);
      if (!p.g.parent) app.stage.addChild(p.g);
    }
  }
  ensureTicker();
};

/** Test / teardown helper. */
export const clearParticlePool = (): void => {
  for (const p of pool) {
    release(p);
    p.g.destroy();
  }
  pool.length = 0;
  if (tickerHooked) {
    gameTicker.remove(tickParticles);
    tickerHooked = false;
  }
};
