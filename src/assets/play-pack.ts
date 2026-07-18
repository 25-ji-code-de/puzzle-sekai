/**
 * Play-pack textures: characters for enabled groups, items, avatar, props.
 *
 * Boot only loads the shell (bg / welcome / basic SFX). This module loads the
 * rest on idle prewarm, Start, or when group / mikudayo settings change.
 */
import avatar from "../assets/chara/avatar.png";
import barrelTexture from "../assets/objects/barrel.png";
import gameOver from "../assets/gameOver.png";
import { characterData } from "../characters/data";
import { avatarTextures } from "../characters/avatar";
import { items } from "../items";
import {
  getCurrentSettings,
  type GameSettings,
  type GroupName,
} from "../settings";
import { ensureTextures, type LoaderEntry } from "./load-texture";

/** Same filter as active/rng — enabled units + optional Special (mikudayo). */
export const listPlayCharacters = (
  settings: GameSettings = getCurrentSettings(),
) =>
  characterData.filter(
    (c) =>
      settings.selectedGroups.includes(c.group as GroupName) ||
      (c.group === "Special" && settings.funModes?.mikudayo),
  );

/** Deduped loader entries needed before a match can safely spawn. */
export const listPlayTextureEntries = (
  settings: GameSettings = getCurrentSettings(),
): LoaderEntry[] => {
  const entries: LoaderEntry[] = [];
  for (const c of listPlayCharacters(settings)) {
    entries.push(c.file);
    if (c.preview) entries.push(c.preview);
  }
  for (const img of items) entries.push(img);
  for (const t of avatarTextures) entries.push(t);
  entries.push(avatar);
  entries.push(barrelTexture);
  // Named key — props/objects reads resources["gameOver"]
  entries.push({ name: "gameOver", url: gameOver });

  const seen = new Set<string>();
  return entries.filter((e) => {
    const key = typeof e === "string" ? e : e.name;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Serial chain so concurrent Start / idle / settings calls share work and a
 * settings change after a load still picks up newly required URLs.
 */
let chain: Promise<void> = Promise.resolve();

export type EnsurePlayPackOpts = {
  onProgress?: (pct: number) => void;
  settings?: GameSettings;
};

/** Ensure play textures for the given (or live) settings. Resolves when ready. */
export const ensurePlayPack = (
  opts: EnsurePlayPackOpts = {},
): Promise<void> => {
  const settings = opts.settings;
  const onProgress = opts.onProgress;
  const job = () =>
    ensureTextures(
      listPlayTextureEntries(settings ?? getCurrentSettings()),
      onProgress,
    );
  const next = chain.then(job, job);
  // Keep the chain unbroken even if a job rejects.
  chain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
};
