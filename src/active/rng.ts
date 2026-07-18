/**
 * Character bag RNG for the next / current piece.
 * Uses the match-scoped PRNG ({@link initMatchRng}) so a seed can replay
 * the bag order. Call {@link initRNG} once at match start.
 */
import { characterData, CharacterData } from "../characters/data";
import type { GroupName } from "../settings/types";
import { getCurrentSettings } from "../settings";
import { initMatchRng, takeRandom } from "../domain/prng";

export let nextCharacter: CharacterData | undefined;
let characterList: CharacterData[] = [];

const isSelectedGroup = (
  group: CharacterData["group"],
  selected: readonly GroupName[],
): group is GroupName => group !== "Special" && selected.includes(group);

const getFilteredCharacterData = (): CharacterData[] => {
  const settings = getCurrentSettings();
  return characterData.filter(
    (c) =>
      isSelectedGroup(c.group, settings.selectedGroups) ||
      (c.group === "Special" && !!settings.funModes?.mikudayo),
  );
};

/**
 * Reset the bag and (re)seed the match PRNG.
 * @param seed Optional 32-bit seed; omit for a fresh random seed.
 * @returns The seed installed for this match (for daily challenge / repro).
 */
export const initRNG = (seed?: number): number => {
  const used = initMatchRng(seed);
  const filtered = getFilteredCharacterData();
  characterList = [...filtered];
  nextCharacter = takeRandom(characterList);
  return used;
};

export const randomCharacter = (): CharacterData => {
  if (characterList.length === 0) {
    const filtered = getFilteredCharacterData();
    characterList = [...filtered];
  }
  if (!nextCharacter) {
    const res = takeRandom(characterList);
    if (!res) {
      // Empty filter (no groups): should not happen in normal play.
      throw new Error("[rng] character bag empty");
    }
    return res;
  }
  const res = { ...nextCharacter };
  nextCharacter = takeRandom(characterList);
  return res;
};
