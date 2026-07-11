import { app, gameTicker, hammerManager } from ".";
import {
  LEFT_BORDER,
  RIGHT_BORDER,
  BOX_SIZE,
  SPEED,
  COLUMNS,
  OFFSET_BOTTOM,
  FALL_DELAY,
  FALL_SPEED,
} from "./config";
import * as PIXI from "pixi.js-legacy";
import "pixi-sound";
import { pieces } from "./states";
import { addDropScore } from "./score";

export const createNeneRobo = async (
  file: string,
  onDropped: (sprite: PIXI.Sprite) => void,
) => {
  // load the texture we need
  const texture =
    app.loader.resources[file]?.texture ??
    (await new Promise((resolve) => {
      app.loader
        .add(file)
        .load((_, resources) => resolve(resources[file]?.texture));
    }));

  const nenerobo = new PIXI.Sprite(texture);

  nenerobo.x = (LEFT_BORDER + RIGHT_BORDER) / 2 - BOX_SIZE;
  nenerobo.y = -BOX_SIZE / 2;

  nenerobo.anchor.x = 0.5;
  nenerobo.anchor.y = 0.5;

  nenerobo.rotation = Math.PI;
  // app.stage.addChild(bunny);

  let dropped: number | undefined = undefined;
  let speed = SPEED;
  const startY = nenerobo.y;
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

  const moveLeft = () => {
    const { x, y } = getNeneRoboCoordinates(nenerobo, "ceil");
    if (y <= 0 && x > 0 && !pieces[0][x - 1]) {
      nenerobo.x -= BOX_SIZE;
      onMoved();
    } else if (x > 0 && !pieces[y][x - 1] && !pieces[y + 1][x - 1]) {
      nenerobo.x -= BOX_SIZE;
      onMoved();
    }
  };

  const moveRight = () => {
    const { x, y } = getNeneRoboCoordinates(nenerobo, "ceil");
    if (y <= 0 && x + 2 < COLUMNS && !pieces[0][x + 2]) {
      nenerobo.x += BOX_SIZE;
      onMoved();
    } else if (x + 2 < COLUMNS && !pieces[y][x + 2] && !pieces[y + 1][x + 2]) {
      nenerobo.x += BOX_SIZE;
      onMoved();
    }
  };
  const rotateCW = () => {
    nenerobo.rotation += Math.PI / 2;
    onMoved();
  };

  const rotateCCW = () => {
    nenerobo.rotation -= Math.PI / 2;
    onMoved();
  };

  const hardDrop = () => {
    const stackHeight = getNeneRoboStackHeight(nenerobo);
    const newY = app.renderer.height - OFFSET_BOTTOM - BOX_SIZE * stackHeight - BOX_SIZE;
    const distance = Math.floor((newY - nenerobo.y) / BOX_SIZE);
    dropScore += distance * 5;
    nenerobo.y = newY;
    onMoved();
  };

  const softDrop = () => {
    speed = SPEED * 4;
  };

  const normalSpeed = () => {
    speed = SPEED;
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    switch (event.key.toLowerCase()) {
      case "arrowleft":
        moveLeft();
        break;
      case "arrowright":
        moveRight();
        break;
      case "x":
      case "arrowup":
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
      normalSpeed();
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

  app.stage.addChild(nenerobo);

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
      addDropScore(dropScore, 1);
    }

    onDropped(nenerobo);
  };
  const checkOffset = (delta: number) => {
    // each frame we spin the bunny around a bit
    const stackHeight = getNeneRoboStackHeight(nenerobo);
    const dropHeight =
      app.renderer.height - (BOX_SIZE + OFFSET_BOTTOM) - BOX_SIZE * stackHeight;
    if (nenerobo.y < dropHeight) {
      const prevY = nenerobo.y;
      nenerobo.y += speed * delta;
      if (nenerobo.y > dropHeight) nenerobo.y = dropHeight;
      const moved = Math.floor((nenerobo.y - prevY) / BOX_SIZE);
      if (moved > 0) {
        const mult = speed > SPEED ? 2 : 1;
        dropScore += moved * mult;
      }
    } else {
      if (!dropped) {
        dropped = setTimeout(() => {
          app.loader.resources.land.sound.play({ volume: 0.5 });
          nenerobo.y =
            app.renderer.height -
            OFFSET_BOTTOM -
            BOX_SIZE * stackHeight -
            BOX_SIZE;
          cleanup();
        }, 200);
      }
    }
  };
  // Listen for frame updates
  gameTicker.add(checkOffset);

  return nenerobo;
};

export const neneRoboFall = (
  sprite: PIXI.Sprite,
  onFell: (sprite: PIXI.Sprite) => void,
) => {
  let timer: number;
  const cleanup = () => {
    gameTicker.remove(checkOffset);
    onFell(sprite);
  };
  const checkOffset = (delta: number) => {
    // each frame we spin the bunny around a bit
    const stackHeight = getNeneRoboStackHeight(sprite);
    const dropHeight =
      app.renderer.height - (BOX_SIZE + OFFSET_BOTTOM) - BOX_SIZE * stackHeight;
    if (sprite.y < dropHeight) {
      sprite.y += FALL_SPEED * delta;
      if (timer) clearTimeout(timer);
    } else {
      if (!timer) {
        timer = setTimeout(() => {
          sprite.y =
            app.renderer.height -
            OFFSET_BOTTOM -
            BOX_SIZE * stackHeight -
            BOX_SIZE;
          cleanup();
        }, FALL_DELAY);
      }
    }
  };
  // Listen for frame updates
  gameTicker.add(checkOffset);
};

export const getNeneRoboCoordinates = (
  sprite: PIXI.Sprite,
  method: "floor" | "ceil" | "round" = "ceil",
): { x: number; y: number } => {
  return {
    x: Math[method]((sprite.x - BOX_SIZE - LEFT_BORDER) / BOX_SIZE),
    y: Math[method]((sprite.y - BOX_SIZE) / BOX_SIZE),
  };
};

export const getNeneRoboStackHeight = (sprite: PIXI.Sprite): number => {
  const { x, y } = getNeneRoboCoordinates(sprite);
  return pieces
    .map((row) => [row[x + 1], row[x]])
    .filter((_, index) => index + 1 > y)
    .reverse()
    .reduce((acc, row, index) => (row[0] || row[1] ? index + 1 : acc), 0);
};
