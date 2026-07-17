/**
 * Character name constants + file-token matchers.
 * Prefer name equality when SpriteData is available; use file tokens only for
 * active-piece controllers that only know the asset path at spawn time.
 */

export const CHAR = {
  Ichika: "Ichika",
  Saki: "Saki",
  Honami: "Honami",
  Shiho: "Shiho",
  MikuLeo: "MikuLeo",
  Minori: "Minori",
  Haruka: "Haruka",
  Airi: "Airi",
  Shizuku: "Shizuku",
  MikuMMJ: "MikuMMJ",
  Kohane: "Kohane",
  An: "An",
  Akito: "Akito",
  Toya: "Toya",
  MikuVBS: "MikuVBS",
  Tsukasa: "Tsukasa",
  Emu: "Emu",
  Nene: "Nene",
  Rui: "Rui",
  NeneRobo: "NeneRobo",
  MikuWxS: "MikuWxS",
  Kanade: "Kanade",
  Mafuyu: "Mafuyu",
  Ena: "Ena",
  Mizuki: "Mizuki",
  Miku25ji: "Miku25ji",
  Mikudayo: "Mikudayo",
} as const;

export type CharacterName = (typeof CHAR)[keyof typeof CHAR];

/** Lowercase path/name token → character id (for asset file matching). */
const FILE_TOKENS: { token: string; name: CharacterName }[] = [
  { token: "nenerobo", name: CHAR.NeneRobo },
  { token: "mikudayo", name: CHAR.Mikudayo },
  { token: "mizuki", name: CHAR.Mizuki },
  { token: "kanade", name: CHAR.Kanade },
  { token: "shiho", name: CHAR.Shiho },
  { token: "akito", name: CHAR.Akito },
  { token: "ena", name: CHAR.Ena },
  { token: "emu", name: CHAR.Emu },
  { token: "mafuyu", name: CHAR.Mafuyu },
  { token: "rui", name: CHAR.Rui },
  { token: "shizuku", name: CHAR.Shizuku },
];

/** Match a Vite asset URL / path to a known character when possible. */
export const characterFromFile = (file: string): CharacterName | undefined => {
  const lower = file.toLowerCase();
  for (const { token, name } of FILE_TOKENS) {
    if (lower.includes(token)) return name;
  }
  return undefined;
};

export const fileIsCharacter = (file: string, name: CharacterName): boolean =>
  characterFromFile(file) === name;

export const fileIsBig2x2 = (file: string): boolean => {
  const id = characterFromFile(file);
  return id === CHAR.NeneRobo || id === CHAR.Mikudayo;
};

export const isAllergyAvoiderName = (name?: string | null): boolean =>
  name === CHAR.Ena || name === CHAR.Akito;

export const isAllergyAvoiderFile = (file: string): boolean =>
  fileIsCharacter(file, CHAR.Ena) || fileIsCharacter(file, CHAR.Akito);
