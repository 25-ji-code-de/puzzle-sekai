import { app } from "../index";
import * as PIXI from "pixi.js-legacy";
import {
  avatar_X,
  avatar_Y,
  LEFT_BORDER,
  RIGHT_BORDER,
  BOX_SIZE,
} from "../config";
import { fly, showNextPiece } from "../piece";
import avatar from "../assets/chara/avatar.png";
import avatar1 from "../assets/objects/avatar-1.png";
import avatar2 from "../assets/objects/avatar-2.png";
import avatar3 from "../assets/objects/avatar-3.png";

export const avatarTextures = [avatar1, avatar2, avatar3];
export const createavatarSan = () => {
  const textureArray = [avatar1, avatar2, avatar3].map((e) =>
    PIXI.Texture.from(e),
  );
  const avatar = new PIXI.AnimatedSprite(textureArray);
  avatar.animationSpeed = 0.2;
  avatar.x = avatar_X;
  avatar.y = avatar_Y;

  avatar.zIndex = 99;

  avatar.loop = false;

  return avatar;
};

export let avatarFlyDown: PIXI.Sprite;

export const createFallingavatar = () => {
  avatarFlyDown = new PIXI.Sprite(app.loader.resources[avatar].texture);

  avatarFlyDown.x = (LEFT_BORDER + RIGHT_BORDER) / 2 - BOX_SIZE / 2;
  avatarFlyDown.y = -BOX_SIZE / 2;

  avatarFlyDown.anchor.x = 0.5;
  avatarFlyDown.anchor.y = 0.25;

  avatarFlyDown.rotation = Math.PI;

  app.stage.addChild(avatarFlyDown);

  return avatarFlyDown;
};

export let avatarFly: PIXI.Sprite;

export const createFlyingavatar = async (
  onExit: (sprite: PIXI.Sprite) => void = () => {},
) => {
  avatarFly = await showNextPiece(avatar);
  fly(avatarFly, () => {
    onExit(avatarFly);
  });
  app.stage.addChild(avatarFly);
  return avatarFly;
};
