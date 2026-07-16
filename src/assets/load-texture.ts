/**
 * Shared PIXI loader texture fetch (pieces + items).
 */
import type * as PIXI from "pixi.js-legacy";
import { app } from "../index";

export const loadTexture = async (file: string): Promise<PIXI.Texture> =>
  app.loader.resources[file]?.texture ??
  (await new Promise((resolve) => {
    app.loader
      .add(file)
      .load((_, resources) => resolve(resources[file]!.texture!));
  }));
