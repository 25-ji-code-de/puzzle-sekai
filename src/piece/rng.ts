/**
 * Character bag RNG for the next / current piece.
 */
import { characterData, CharacterData } from "../characters/data";
import { getCurrentSettings } from "../settings";

export let nextCharacter: CharacterData | undefined;
let characterList: CharacterData[] = [];

const getFilteredCharacterData = (): CharacterData[] => {
  const settings = getCurrentSettings();
  return characterData.filter(
    (c) =>
      settings.selectedGroups.includes(c.group as any) ||
      (c.group === "Special" && settings.funModes?.mikudayo),
  );
};

export const initRNG = () => {
  const filtered = getFilteredCharacterData();
  characterList = [...filtered];
  nextCharacter = characterList.splice(
    Math.floor(Math.random() * characterList.length),
    1,
  )[0];
};

export const randomCharacter = (): CharacterData => {
  if (characterList.length === 0) {
    const filtered = getFilteredCharacterData();
    characterList = [...filtered];
  }
  let res: CharacterData;
  if (!nextCharacter) {
    res = characterList.splice(
      Math.floor(Math.random() * characterList.length),
      1,
    )[0];
    return res;
  } else {
    res = { ...nextCharacter };
    nextCharacter = characterList.splice(
      Math.floor(Math.random() * characterList.length),
      1,
    )[0];
  }
  return res;
};
