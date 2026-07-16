/**
 * Item asset catalog + carrot/fries predicates.
 */
import material008 from "../assets/objects/material008.png";
import material013 from "../assets/objects/material013.png";
import material044 from "../assets/objects/material044.png";
import material105 from "../assets/objects/material105.png";
import material106 from "../assets/objects/material106.png";
import material107 from "../assets/objects/material107.png";
import material108 from "../assets/objects/material108.png";
import material109 from "../assets/objects/material109.png";
import material110 from "../assets/objects/material110.png";
import material111 from "../assets/objects/material111.png";
import material112 from "../assets/objects/material112.png";
import material113 from "../assets/objects/material113.png";
import material205 from "../assets/objects/material205.png";
import material218 from "../assets/objects/material218.png";
import material221 from "../assets/objects/material221.png";
import material222 from "../assets/objects/material222.png";
import material225 from "../assets/objects/material225.png";
import material226 from "../assets/objects/material226.png";

// Item groups - each group contains variants of the same item
const itemGroups: string[][] = [
  [material008, material013], // Group A: carrots / にんじん
  [
    material044,
    material105,
    material106,
    material107,
    material108,
    material109,
    material110,
    material111,
    material112,
    material113,
  ], // Group B: fries / ポテト
  [material218, material221], // Group C
  [material222, material225], // Group D
  [material205], // Group E
  [material226], // Group F
];

/** Group A: carrot materials (にんじん) — used by itemAllergy fun mode */
export const CARROT_ITEMS = [material008, material013];
export const isCarrotItem = (file: string) => CARROT_ITEMS.includes(file);

/** Group B: fries / ポテト / 薯条 — used by mizukiShift fun mode */
export const FRIES_ITEMS: readonly string[] = itemGroups[1];
export const isFriesItem = (file: string): boolean => FRIES_ITEMS.includes(file);

// Get a random item - first select group, then select variant
export const getRandomItem = (): string => {
  const group = itemGroups[Math.floor(Math.random() * itemGroups.length)];
  return group[Math.floor(Math.random() * group.length)];
};

// Flat list of all items (for the boot loader)
export const items = itemGroups.flat();
