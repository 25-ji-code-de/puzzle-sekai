import * as PIXI from "pixi.js-legacy";
import "pixi-sound";
import { app, gameTicker, hammerManager } from ".";
import {
  LEFT_BORDER,
  RIGHT_BORDER,
  BOX_SIZE,
  COLUMNS,
  SPEED,
  NEXT_CHARACTER_Y,
  NEXT_CHARACTER_X,
  OFFSET_BOTTOM,
  FALL_DELAY,
  FALL_SPEED,
} from "./config";
import {
  getCoordinates,
  willCollide,
  getStackHeight,
  getOffset,
} from "./utils";
import { characterData, CharacterData } from "./character-data";
import { createNeneRobo } from "./nenerobo";
import { addDropScore } from "./score";
import { getCurrentSettings, getSpeedMultiplier } from "./settings";

// Get filtered character list based on selected groups
const getFilteredCharacterData = (): CharacterData[] => {
  const settings = getCurrentSettings();
  return characterData.filter(c => settings.selectedGroups.includes(c.group as any) || c.group === "Special");
};

export let nextCharacter: CharacterData | undefined;
let characterList: CharacterData[] = [];

export const fly = (
  sprite: PIXI.Sprite,
  onExit: (sprite: PIXI.Sprite) => void,
) => {
  const settings = getCurrentSettings();
  const speedMultiplier = getSpeedMultiplier(settings);
  const handleFly = (delta: number) => {
    sprite.y -= 25 * SPEED * speedMultiplier * delta;
    if (sprite.y + 2 * BOX_SIZE < 0) {
      gameTicker.remove(handleFly);
      onExit(sprite);
    }
  };
  gameTicker.add(handleFly);
};
export const fall = (
  sprite: PIXI.Sprite,
  onFall?: (sprite: PIXI.Sprite) => void,
) => {
  let timer: number;
  const cleanup = () => {
    gameTicker.remove(checkOffset);
    onFall && onFall(sprite);
  };

  const checkOffset = (delta: number) => {
    // each frame we spin the bunny around a bit
    const offset = getOffset(sprite);
    const stackHeight = getStackHeight(sprite);
    const dropHeight =
      app.renderer.height -
      (BOX_SIZE / 2 + OFFSET_BOTTOM) -
      BOX_SIZE * stackHeight -
      (offset === 2 ? BOX_SIZE : 0);
    if (sprite.y < dropHeight) {
      sprite.y += FALL_SPEED * delta;
      if (timer) clearTimeout(timer);
    } else {
      if (!timer) {
        timer = setTimeout(() => {
          sprite.y =
            app.renderer.height -
            (BOX_SIZE / 2 + OFFSET_BOTTOM) -
            (offset === 2 ? BOX_SIZE : 0) -
            BOX_SIZE * stackHeight;
          cleanup();
        }, FALL_DELAY);
      }
    }
  };

  // Listen for frame updates
  gameTicker.add(checkOffset);
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

export const showNextPiece = async (file: string) => {
  const texture =
    app.loader.resources[file]?.texture ??
    (await new Promise((resolve) => {
      app.loader
        .add(file)
        .load((_, resources) => resolve(resources[file]!.texture!));
    }));

  const kasumi = new PIXI.Sprite(texture);
  kasumi.anchor.x = 0.5;
  kasumi.anchor.y = 1;

  kasumi.y = NEXT_CHARACTER_Y;
  kasumi.x = NEXT_CHARACTER_X;

  app.stage.addChild(kasumi);
  return kasumi;
};

export const createPiece = async (
  file: string,
  onDropped: (sprite: PIXI.Sprite) => void,
) => {
  // load the texture we need

  if (file.includes("nenerobo") || file.includes("mikudayo")) return await createNeneRobo(file, onDropped);
  const texture =
    app.loader.resources[file]?.texture ??
    (await new Promise((resolve) => {
      app.loader
        .add(file)
        .load((_, resources) => resolve(resources[file]!.texture!));
    }));

  const kasumi = new PIXI.Sprite(texture);

  kasumi.x = (LEFT_BORDER + RIGHT_BORDER) / 2 - BOX_SIZE / 2;
  kasumi.y = -BOX_SIZE / 2;

  kasumi.anchor.x = 0.5;
  kasumi.anchor.y = 0.25;

  kasumi.rotation = Math.PI;
  // app.stage.addChild(bunny);

  let dropped: number | undefined = undefined;
  const settings = getCurrentSettings();
  const speedMultiplier = getSpeedMultiplier(settings);
  let speed = SPEED * speedMultiplier;
  let dropScore = 0;

  const onMoved = () => {
    if (dropped) {
      clearTimeout(dropped);
      dropped = undefined;
    }
    const sound = app.loader.resources.move.sound;
    if (sound.isPlaying) {
      sound.stop();
    }
    sound.play({ volume: 0.05 });
  };

  const moveUp = () => {
    const { x, y } = getCoordinates(kasumi, "ceil");
    if (y >= 0 && !willCollide(x, y - 1, kasumi.rotation)) {
      kasumi.y -= BOX_SIZE;
      onMoved();
    }
  };

  const moveLeft = () => {
    const { x, y } = getCoordinates(kasumi, "ceil");
    if (x > 0 && !willCollide(x - 1, y, kasumi.rotation)) {
      kasumi.x -= BOX_SIZE;
      onMoved();
    }
  };

  const moveRight = () => {
    const { x, y } = getCoordinates(kasumi, "ceil");
    if (x < COLUMNS - 1 && !willCollide(x + 1, y, kasumi.rotation)) {
      kasumi.x += BOX_SIZE;
      onMoved();
    }
  };
  const rotateCW = () => {
    const { x, y } = getCoordinates(kasumi, "ceil");
    if (!willCollide(x, y, kasumi.rotation + Math.PI / 2)) {
      const offset = (getOffset(kasumi) - 1) / 2;
      kasumi.rotation = offset * Math.PI;
      onMoved();
    }
  };

  const rotateCCW = () => {
    const { x, y } = getCoordinates(kasumi, "ceil");
    if (!willCollide(x, y, kasumi.rotation - Math.PI / 2)) {
      const offset = (getOffset(kasumi) + 1) / 2;
      kasumi.rotation = offset * Math.PI;
      onMoved();
    }
  };

  const hardDrop = () => {
    const offset = getOffset(kasumi);
    const stackHeight = getStackHeight(kasumi);
    const newY =
      app.renderer.height -
      (BOX_SIZE / 2 + OFFSET_BOTTOM) -
      (offset === 2 ? BOX_SIZE : 0) -
      BOX_SIZE * stackHeight;
    const distance = Math.floor((newY - kasumi.y) / BOX_SIZE);
    dropScore += distance * 5;
    kasumi.y = newY;
    onMoved();
  };

  const softDrop = () => {
    speed = SPEED * 4 * speedMultiplier;
  };

  const normalSpeed = () => {
    speed = SPEED * speedMultiplier;
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    switch (event.key.toLowerCase()) {
      case "arrowleft":
        moveLeft();
        break;
      case "arrowright":
        moveRight();
        break;
      case "arrowup":
        if (event.shiftKey && file.includes("emu")) {
          moveUp();
          break;
        }
        rotateCW();
        break;
      case "x":
        rotateCW();
        break;
      case "z":
      case "control":
        rotateCCW();
        break;
      case "arrowdown":
        softDrop();
        break;
      case " ":
        hardDrop();
        break;
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      speed = SPEED * speedMultiplier;
    }
  };

  const handleTap = (e: HammerInput) => {
    if (e.center.x < window.innerWidth / 2) {
      rotateCCW();
    } else {
      rotateCW();
    }
  };

  window.addEventListener("keydown", handleKeyPress, false);
  window.addEventListener("keyup", handleKeyUp, false);

  hammerManager.on("swipeleft", moveLeft);
  hammerManager.on("swiperight", moveRight);
  hammerManager.on("swipedown", hardDrop);
  hammerManager.on("press", softDrop);
  hammerManager.on("pressup", normalSpeed);
  hammerManager.on("tap", handleTap);

  app.stage.addChild(kasumi);

  const cleanup = () => {
    window.removeEventListener("keydown", handleKeyPress, false);
    window.removeEventListener("keyup", handleKeyUp, false);

    hammerManager.off("swiperight", moveRight);
    hammerManager.off("tap", handleTap);
    hammerManager.off("swipeleft", moveLeft);
    hammerManager.off("swipedown", hardDrop);
    hammerManager.off("press", softDrop);
    hammerManager.off("pressup", normalSpeed);

    gameTicker.remove(checkOffset);

    // Add accumulated drop score
    if (dropScore > 0) {
      addDropScore(dropScore);
    }

    onDropped(kasumi);
  };
  const checkOffset = (delta: number) => {
    // each frame we spin the bunny around a bit
    const offset = getOffset(kasumi);
    const stackHeight = getStackHeight(kasumi);
    const dropHeight =
      app.renderer.height -
      (BOX_SIZE / 2 + OFFSET_BOTTOM) -
      BOX_SIZE * stackHeight -
      (offset === 2 ? BOX_SIZE : 0);
    if (kasumi.y < dropHeight) {
      const prevY = kasumi.y;
      kasumi.y += speed * delta;
      if (kasumi.y > dropHeight) kasumi.y = dropHeight;
      // Accumulate score based on actual movement
      const moved = Math.floor((kasumi.y - prevY) / BOX_SIZE);
      if (moved > 0) {
        const mult = speed > SPEED ? 2 : 1;
        dropScore += moved * mult;
      }
    } else {
      if (!dropped) {
        dropped = setTimeout(() => {
          app.loader.resources.land.sound.play({ volume: 0.5 });
          kasumi.y =
            app.renderer.height -
            (BOX_SIZE / 2 + OFFSET_BOTTOM) -
            (offset === 2 ? BOX_SIZE : 0) -
            BOX_SIZE * stackHeight;
          cleanup();
        }, 200);
      }
    }
  };
  // Listen for frame updates
  gameTicker.add(checkOffset);

  return kasumi;
};
