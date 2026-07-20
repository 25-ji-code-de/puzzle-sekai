/**
 * Rapier world lifecycle + body registry for truePhysics.
 * One rigid body per piece entity; body translation == sprite.x/y.
 */
import type * as PIXI from "pixi.js-legacy";
import {
  BOARD_ORIGIN_X,
  BOARD_ORIGIN_Y,
  BOX_SIZE,
  COLUMNS,
  OFFSET_BOTTOM,
  ROWS,
  STAGE_HEIGHT,
} from "../../config";
import type { EntityId } from "../../domain/types";
import type { PieceKind } from "../../domain/types";
import { buildAlphaShape, hullToFloat32, type LocalPoint } from "./alpha-shape";
import { colliderSpecFor, massOfKind } from "./colliders";
import { resolveComOffset, type ComOffset } from "./com-table";
import { poseAabb } from "./pose";
import { loadRapier, type RapierMod } from "./rapier-loader";
import { clamp } from "../../util/clamp";

/** World gravity (px/s²). Tuned for puzzle-like fall feel. */
export const WORLD_GRAVITY_Y = 520;

const WALL_THICKNESS = 40;
const FLOOR_THICKNESS = 40;

export type BodyEntry = {
  entityId: EntityId;
  kind: PieceKind;
  body: import("@dimforge/rapier2d-compat").RigidBody;
  collider: import("@dimforge/rapier2d-compat").Collider;
  sprite: PIXI.Sprite;
  /** Active kinematic controller body (not yet landed). */
  active: boolean;
  /**
   * Body-local convex hull from texture alpha (if available).
   * Used by continuous control AABB tests so move/rotate match physics.
   */
  localPoints?: LocalPoint[];
  /** Hardcoded alpha-weighted COM in body-local space (for control + mass props). */
  com?: ComOffset;
};

type WorldState = {
  RAPIER: RapierMod;
  world: import("@dimforge/rapier2d-compat").World;
  registry: Map<EntityId, BodyEntry>;
  /** Active (pre-land) bodies keyed by sprite ref — no entityId yet. */
  activeBySprite: Map<PIXI.Sprite, BodyEntry>;
  eventQueue: import("@dimforge/rapier2d-compat").EventQueue;
};

let state: WorldState | null = null;

export const hasPhysicsWorld = (): boolean => !!state;

export const getRapierMod = (): RapierMod | null => state?.RAPIER ?? null;

export const ensureWorld = async (): Promise<void> => {
  if (state) return;
  const RAPIER = await loadRapier();
  const world = new RAPIER.World({ x: 0, y: WORLD_GRAVITY_Y });
  world.timestep = 1 / 60;

  const playLeft = BOARD_ORIGIN_X;
  const playRight = BOARD_ORIGIN_X + COLUMNS * BOX_SIZE;
  const playBottom = STAGE_HEIGHT - OFFSET_BOTTOM;
  const playWidth = playRight - playLeft;
  const playCenterX = (playLeft + playRight) / 2;
  // Tall walls so falling pieces from above still collide sideways
  const wallHeight = ROWS * BOX_SIZE + 600;
  const wallCenterY = playBottom - wallHeight / 2;

  const makeFixed = (x: number, y: number, hx: number, hy: number) => {
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(x, y),
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(hx, hy).setFriction(0.8).setRestitution(0.05),
      body,
    );
  };

  // Floor
  makeFixed(
    playCenterX,
    playBottom + FLOOR_THICKNESS / 2,
    playWidth / 2 + 20,
    FLOOR_THICKNESS / 2,
  );
  // Left / right walls
  makeFixed(
    playLeft - WALL_THICKNESS / 2,
    wallCenterY,
    WALL_THICKNESS / 2,
    wallHeight / 2,
  );
  makeFixed(
    playRight + WALL_THICKNESS / 2,
    wallCenterY,
    WALL_THICKNESS / 2,
    wallHeight / 2,
  );

  state = {
    RAPIER,
    world,
    registry: new Map(),
    activeBySprite: new Map(),
    eventQueue: new RAPIER.EventQueue(true),
  };
};

export const destroyWorld = (): void => {
  if (!state) return;
  try {
    state.world.free();
  } catch {
    /* already freed */
  }
  try {
    state.eventQueue.free();
  } catch {
    /* ignore */
  }
  state = null;
};

const requireState = (): WorldState => {
  if (!state) throw new Error("Physics world not created");
  return state;
};

type AttachOpts = {
  characterName?: string | null;
  itemFile?: string | null;
  assetFile?: string | null;
  isShrunk?: boolean;
};

const principalInertiaFor = (kind: PieceKind, mass: number): number => {
  const spec = colliderSpecFor(kind);
  const w = 2 * spec.halfExtents.x;
  const h = 2 * spec.halfExtents.y;
  // Solid rectangle about center: I = m/12 * (w² + h²)
  return (mass / 12) * (w * w + h * h);
};

const applyHardcodedCom = (
  body: import("@dimforge/rapier2d-compat").RigidBody,
  kind: PieceKind,
  com: ComOffset,
): void => {
  // Prefer body-level override so hull or cuboid both share the same COM table.
  // Zero out collider-derived mass first by setting additional props as the
  // authoritative total (Rapier adds additional to collider mass — so we set
  // collider density ~0 below and put full mass here).
  const mass = massOfKind(kind);
  const principalInertia = principalInertiaFor(kind, mass);
  body.setAdditionalMassProperties(
    mass,
    { x: com.x, y: com.y },
    principalInertia,
    true,
  );
};

const attachCollider = (
  s: WorldState,
  body: import("@dimforge/rapier2d-compat").RigidBody,
  kind: PieceKind,
  sprite: PIXI.Sprite,
  opts: AttachOpts = {},
): {
  collider: import("@dimforge/rapier2d-compat").Collider;
  localPoints?: LocalPoint[];
  com: ComOffset;
} => {
  const spec = colliderSpecFor(kind);
  const com = resolveComOffset({
    kind,
    characterName: opts.characterName,
    itemFile: opts.itemFile,
    assetFile: opts.assetFile,
    isShrunk: opts.isShrunk,
  });
  const mass = massOfKind(kind);
  const principalInertia = principalInertiaFor(kind, mass);
  const alpha = buildAlphaShape(sprite);

  let collider: import("@dimforge/rapier2d-compat").Collider;
  let localPoints: LocalPoint[] | undefined;

  if (alpha && alpha.points.length >= 3) {
    const flat = hullToFloat32(alpha.points);
    const hullDesc = s.RAPIER.ColliderDesc.convexHull(flat);
    if (hullDesc) {
      // Density 0 — mass/COM come from body additional mass props
      hullDesc.setDensity(0).setFriction(0.75).setRestitution(0.05);
      collider = s.world.createCollider(hullDesc, body);
      localPoints = alpha.points;
      applyHardcodedCom(body, kind, com);
      return { collider, localPoints, com };
    }
  }

  // Fallback: cuboid by PieceKind (density 0 + body mass props)
  const desc = s.RAPIER.ColliderDesc.cuboid(
    spec.halfExtents.x,
    spec.halfExtents.y,
  )
    .setTranslation(spec.offset.x, spec.offset.y)
    .setDensity(0)
    .setFriction(0.75)
    .setRestitution(0.05);
  collider = s.world.createCollider(desc, body);
  // Keep unused principalInertia reference honest for future setMassProperties
  void principalInertia;
  applyHardcodedCom(body, kind, com);
  return { collider, com };
};

/** Create a kinematic active body driven by player controls. */
export const createActiveBody = (
  sprite: PIXI.Sprite,
  kind: PieceKind,
  opts: AttachOpts = {},
): BodyEntry => {
  const s = requireState();
  // Replace any previous active body for this sprite
  removeActiveBody(sprite);

  const body = s.world.createRigidBody(
    s.RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(sprite.x, sprite.y)
      .setRotation(sprite.rotation)
      .setCcdEnabled(true),
  );
  const { collider, localPoints, com } = attachCollider(
    s,
    body,
    kind,
    sprite,
    opts,
  );
  const entry: BodyEntry = {
    entityId: "" as EntityId,
    kind,
    body,
    collider,
    sprite,
    active: true,
    localPoints,
    com,
  };
  s.activeBySprite.set(sprite, entry);
  return entry;
};

export const getActiveBody = (sprite: PIXI.Sprite): BodyEntry | undefined =>
  state?.activeBySprite.get(sprite);

export const removeActiveBody = (sprite: PIXI.Sprite): void => {
  if (!state) return;
  const entry = state.activeBySprite.get(sprite);
  if (!entry) return;
  state.world.removeRigidBody(entry.body);
  state.activeBySprite.delete(sprite);
};

/** Sync kinematic body to current sprite pose (after player move). */
export const syncActiveFromSprite = (sprite: PIXI.Sprite): void => {
  const entry = state?.activeBySprite.get(sprite);
  if (!entry) return;
  entry.body.setNextKinematicTranslation({ x: sprite.x, y: sprite.y });
  entry.body.setNextKinematicRotation(sprite.rotation);
};

/**
 * Convert active kinematic body into a settled dynamic body with entityId.
 * If no active body exists, creates a fresh dynamic body at the sprite pose.
 */
export const commitDynamicBody = (
  entityId: EntityId,
  sprite: PIXI.Sprite,
  kind: PieceKind,
  opts: AttachOpts = {},
): BodyEntry => {
  const s = requireState();
  removeBody(entityId);

  const active = s.activeBySprite.get(sprite);
  if (active) {
    s.activeBySprite.delete(sprite);
    s.world.removeRigidBody(active.body);
  }

  const body = s.world.createRigidBody(
    s.RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(sprite.x, sprite.y)
      .setRotation(sprite.rotation)
      .setCcdEnabled(true)
      .setLinearDamping(0.4)
      .setAngularDamping(0.8)
      .setCanSleep(true),
  );
  // Prefer hull already computed on the active body
  const prevPoints = active?.localPoints;
  const prevCom = active?.com;
  const { collider, localPoints, com } = attachCollider(
    s,
    body,
    kind,
    sprite,
    opts,
  );
  const entry: BodyEntry = {
    entityId,
    kind,
    body,
    collider,
    sprite,
    active: false,
    localPoints: localPoints ?? prevPoints,
    com: com ?? prevCom,
  };
  s.registry.set(entityId, entry);
  return entry;
};

/** Rebuild collider after kind change (e.g. emu shrink). */
export const rebuildBodyKind = (
  entityId: EntityId,
  kind: PieceKind,
  pose?: { x: number; y: number; rotation: number },
  opts: AttachOpts = {},
): void => {
  const s = state;
  if (!s) return;
  const prev = s.registry.get(entityId);
  if (!prev) return;
  const x = pose?.x ?? prev.body.translation().x;
  const y = pose?.y ?? prev.body.translation().y;
  const rot = pose?.rotation ?? prev.body.rotation();
  const sprite = prev.sprite;
  s.world.removeRigidBody(prev.body);
  const body = s.world.createRigidBody(
    s.RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y)
      .setRotation(rot)
      .setCcdEnabled(true)
      .setLinearDamping(0.4)
      .setAngularDamping(0.8)
      .setCanSleep(true),
  );
  const { collider, localPoints, com } = attachCollider(s, body, kind, sprite, {
    isShrunk: kind === "shrunk",
    ...opts,
  });
  s.registry.set(entityId, {
    entityId,
    kind,
    body,
    collider,
    sprite,
    active: false,
    localPoints,
    com,
  });
  sprite.x = x;
  sprite.y = y;
  sprite.rotation = rot;
};

export const removeBody = (entityId: EntityId): void => {
  if (!state) return;
  const entry = state.registry.get(entityId);
  if (!entry) return;
  state.world.removeRigidBody(entry.body);
  state.registry.delete(entityId);
};

export const getBodyEntry = (entityId: EntityId): BodyEntry | undefined =>
  state?.registry.get(entityId);

export const allSettledBodies = (): BodyEntry[] =>
  state ? [...state.registry.values()] : [];

/** Step the world once and sync all sprites from bodies. */
export const stepWorld = (dtSeconds: number = 1 / 60): void => {
  if (!state) return;
  // Rapier uses fixed timestep; set then step
  state.world.timestep = clamp(dtSeconds, 1 / 240, 1 / 30);
  state.world.step(state.eventQueue);
  syncSpritesFromBodies();
};

export const syncSpritesFromBodies = (): void => {
  if (!state) return;
  for (const entry of state.registry.values()) {
    const t = entry.body.translation();
    entry.sprite.x = t.x;
    entry.sprite.y = t.y;
    entry.sprite.rotation = entry.body.rotation();
  }
  // Active kinematics are driven the other way (sprite → body) each control frame.
  for (const entry of state.activeBySprite.values()) {
    entry.body.setNextKinematicTranslation({
      x: entry.sprite.x,
      y: entry.sprite.y,
    });
    entry.body.setNextKinematicRotation(entry.sprite.rotation);
  }
};

export const wakeBody = (entityId: EntityId): void => {
  const entry = state?.registry.get(entityId);
  if (!entry) return;
  entry.body.wakeUp();
};

export const setBodyPose = (
  entityId: EntityId,
  x: number,
  y: number,
  rotation?: number,
): void => {
  const entry = state?.registry.get(entityId);
  if (!entry) return;
  entry.body.setTranslation({ x, y }, true);
  if (rotation !== undefined) entry.body.setRotation(rotation, true);
  entry.sprite.x = x;
  entry.sprite.y = y;
  if (rotation !== undefined) entry.sprite.rotation = rotation;
  entry.body.wakeUp();
};

/** Highest settled body top (for item-rain height gate). */
export const highestBodyTop = (): number => {
  let top = STAGE_HEIGHT;
  for (const entry of allSettledBodies()) {
    const t = entry.body.translation();
    const aabb = poseAabb(
      entry.kind,
      { x: t.x, y: t.y, rotation: entry.body.rotation() },
      entry.localPoints,
    );
    if (aabb.minY < top) top = aabb.minY;
  }
  return top;
};

/** True if any settled body AABB top is above the top-out line. */
export const anyBodyAboveTopOut = (): boolean => {
  const line = BOARD_ORIGIN_Y + BOX_SIZE * 0.25;
  for (const entry of allSettledBodies()) {
    const t = entry.body.translation();
    const aabb = poseAabb(
      entry.kind,
      { x: t.x, y: t.y, rotation: entry.body.rotation() },
      entry.localPoints,
    );
    if (aabb.minY < line) return true;
  }
  return false;
};

/** Look up body-local hull for a live sprite (active or settled). */
export const localPointsForSprite = (
  sprite: PIXI.Sprite,
): LocalPoint[] | undefined => {
  if (!state) return undefined;
  const active = state.activeBySprite.get(sprite);
  if (active?.localPoints) return active.localPoints;
  for (const e of state.registry.values()) {
    if (e.sprite === sprite) return e.localPoints;
  }
  return undefined;
};

export { BOARD_ORIGIN_Y, BOX_SIZE };
