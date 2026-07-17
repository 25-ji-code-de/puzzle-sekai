import { app } from "../runtime";
import * as PIXI from "pixi.js-legacy";
import barrelTexture from "../assets/objects/barrel.png";
import { avatar_X, avatar_Y, STAGE_HEIGHT } from "../config";

export let curtain: PIXI.Sprite;

export const gameOverCurtain = (onFinish: () => void = () => {}) => {
  curtain = new PIXI.Sprite(app.loader.resources["gameOver"].texture);
  curtain.anchor.x = 0;
  curtain.anchor.y = 1;
  curtain.x = 0;
  curtain.y = 0;
  curtain.zIndex = 9999;
  let bounce = 0;
  // STAGE_HEIGHT is logical stage size. app.renderer.height is buffer pixels
  // and only covers half the stage under low-performance mode.
  const floorY = STAGE_HEIGHT;
  const moveDown = (delta: number) => {
    if (
      bounce % 2 == 0
        ? curtain.y < floorY
        : curtain.y > floorY - 80
    ) {
      curtain.y += ((bounce % 2) * -2 + 1) * 10 * delta;
    } else {
      if (bounce < 2) {
        bounce++;
      } else {
        app.ticker.remove(moveDown);
        onFinish();
      }
    }
  };
  app.stage.addChild(curtain);
  app.ticker.add(moveDown);
};

export let barrel: PIXI.Sprite;
export const createBarrel = () => {
  barrel = new PIXI.Sprite(app.loader.resources[barrelTexture].texture);

  barrel.x = avatar_X;
  barrel.y = avatar_Y;

  barrel.zIndex = 99;

  app.stage.addChild(barrel);
  return barrel;
};
