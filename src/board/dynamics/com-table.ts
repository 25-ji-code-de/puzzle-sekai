/**
 * Hardcoded alpha-weighted centers of mass (body-local px).
 * Origin = PIXI sprite anchor. +Y down.
 *
 * Generated from PNG alpha (threshold 24, weight = a/255).
 * Recompute: `node scripts/gen-com-table.mjs`
 */
import type { PieceKind } from "../../domain/types";
import type { CharacterName } from "../../characters/ids";
import { CHAR } from "../../characters/ids";

export type ComOffset = { readonly x: number; readonly y: number };

/** Per-asset COM relative to standard anchors (cell2: 0.5/0.25, else 0.5/0.5). */
export const COM_BY_ASSET: Readonly<Record<string, ComOffset>> = {
  // —— cell2 characters ——
  ichika: { x: -0.3, y: 49.68 },
  saki: { x: 0.81, y: 53.32 },
  honami: { x: 6.53, y: 48.53 },
  shiho: { x: 5.67, y: 47.67 },
  miku_leo: { x: -2.32, y: 37.03 },
  minori: { x: 0.57, y: 48.7 },
  haruka: { x: -1.78, y: 44.82 },
  airi: { x: -2.57, y: 53.84 },
  shizuku: { x: 1.59, y: 54.96 },
  miku_mmj: { x: 3.18, y: 45.37 },
  kohane: { x: 1.55, y: 49.38 },
  an: { x: -1.26, y: 62.41 },
  akito: { x: 2.02, y: 45.58 },
  toya: { x: -0.91, y: 46.79 },
  miku_vbs: { x: 3.91, y: 48.38 },
  tsukasa: { x: -2.48, y: 45.34 },
  emu: { x: 0.86, y: 45.29 },
  nene: { x: -1.96, y: 63.8 },
  rui: { x: 2.24, y: 47.75 },
  miku_wxs: { x: -1.18, y: 63.05 },
  kanade: { x: 2.13, y: 63.35 },
  mafuyu: { x: -0.27, y: 52.33 },
  ena: { x: 0.45, y: 47.41 },
  mizuki: { x: 16.43, y: 53.02 },
  miku_25ji: { x: -2.22, y: 64.85 },
  // —— big2x2 ——
  nenerobo: { x: 2.15, y: 4.83 },
  mikudayo: { x: 0.12, y: 16 },
  // —— shrunk emu (BOX×BOX display) ——
  emu_shrunk: { x: 0.51, y: -11.74 },
  // —— items ——
  material008: { x: 0.69, y: -4.23 },
  material013: { x: -0.68, y: -6.18 },
  material044: { x: -9.84, y: -0.83 },
  material105: { x: -9.97, y: -0.78 },
  material106: { x: -9.97, y: -0.78 },
  material107: { x: -9.97, y: -0.78 },
  material108: { x: -9.97, y: -0.78 },
  material109: { x: -9.97, y: -0.78 },
  material110: { x: -9.97, y: -0.78 },
  material111: { x: -9.97, y: -0.78 },
  material112: { x: -9.97, y: -0.78 },
  material113: { x: -9.97, y: -0.78 },
  material205: { x: -4.29, y: -1.96 },
  material218: { x: 0.97, y: 0.36 },
  material221: { x: 1.33, y: 0.48 },
  material222: { x: 0.74, y: -0.19 },
  material225: { x: 1.36, y: 0.17 },
  material226: { x: 10.86, y: -10.4 },
};

/** Kind defaults when asset key missing (cuboid geometric centers). */
export const COM_BY_KIND_DEFAULT: Readonly<Record<PieceKind, ComOffset>> = {
  cell2: { x: 0, y: 66.5 }, // BOX_SIZE/2 — matches cuboid offset
  big2x2: { x: 0, y: 0 },
  item: { x: 0, y: 0 },
  shrunk: { x: 0, y: 0 },
};

/** CharacterName → asset key in COM_BY_ASSET. */
export const CHAR_TO_COM_KEY: Readonly<Partial<Record<CharacterName, string>>> =
  {
    [CHAR.Ichika]: "ichika",
    [CHAR.Saki]: "saki",
    [CHAR.Honami]: "honami",
    [CHAR.Shiho]: "shiho",
    [CHAR.MikuLeo]: "miku_leo",
    [CHAR.Minori]: "minori",
    [CHAR.Haruka]: "haruka",
    [CHAR.Airi]: "airi",
    [CHAR.Shizuku]: "shizuku",
    [CHAR.MikuMMJ]: "miku_mmj",
    [CHAR.Kohane]: "kohane",
    [CHAR.An]: "an",
    [CHAR.Akito]: "akito",
    [CHAR.Toya]: "toya",
    [CHAR.MikuVBS]: "miku_vbs",
    [CHAR.Tsukasa]: "tsukasa",
    [CHAR.Emu]: "emu",
    [CHAR.Nene]: "nene",
    [CHAR.Rui]: "rui",
    [CHAR.NeneRobo]: "nenerobo",
    [CHAR.MikuWxS]: "miku_wxs",
    [CHAR.Kanade]: "kanade",
    [CHAR.Mafuyu]: "mafuyu",
    [CHAR.Ena]: "ena",
    [CHAR.Mizuki]: "mizuki",
    [CHAR.Miku25ji]: "miku_25ji",
    [CHAR.Mikudayo]: "mikudayo",
  };

/** Extract `material###` basename from a Vite asset URL / path. */
export const itemAssetKey = (
  itemFile: string | undefined | null,
): string | null => {
  if (!itemFile) return null;
  const m = itemFile.match(/material\d+/i);
  return m ? m[0].toLowerCase() : null;
};

/**
 * Resolve body-local COM for a piece.
 * Priority: shrunk → character name → item file → any asset key in file URL → kind default.
 */
export const resolveComOffset = (opts: {
  kind: PieceKind;
  characterName?: string | null;
  itemFile?: string | null;
  /** Active-piece asset path / Vite URL — used to match COM_BY_ASSET keys. */
  assetFile?: string | null;
  isShrunk?: boolean;
}): ComOffset => {
  if (opts.isShrunk || opts.kind === "shrunk") {
    return COM_BY_ASSET.emu_shrunk ?? COM_BY_KIND_DEFAULT.shrunk;
  }
  if (opts.characterName) {
    const key = CHAR_TO_COM_KEY[opts.characterName as CharacterName];
    if (key && COM_BY_ASSET[key]) return COM_BY_ASSET[key];
  }
  if (opts.kind === "item") {
    const key = itemAssetKey(opts.itemFile ?? opts.assetFile);
    if (key && COM_BY_ASSET[key]) return COM_BY_ASSET[key];
  }
  const fromPath = assetKeyFromFile(opts.assetFile ?? opts.itemFile);
  if (fromPath && COM_BY_ASSET[fromPath]) return COM_BY_ASSET[fromPath];
  return COM_BY_KIND_DEFAULT[opts.kind] ?? { x: 0, y: 0 };
};

/** Match a file URL/path against COM_BY_ASSET keys (longest key first). */
export const assetKeyFromFile = (
  file: string | undefined | null,
): string | null => {
  if (!file) return null;
  const lower = file.toLowerCase();
  const keys = Object.keys(COM_BY_ASSET).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (lower.includes(k)) return k;
  }
  return null;
};
