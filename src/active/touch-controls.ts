/**
 * Direct-drag touch controls for the active piece (Puyo-Touch style).
 * Pointer Events on the canvas — no Pixi UI, no virtual pad.
 *
 * All gesture thresholds use **stage / cell units** after letterbox conversion
 * so different phone CSS sizes track the board, not raw device pixels.
 */
import { app } from "../runtime";
import {
  STAGE_HEIGHT,
  STAGE_WIDTH,
  TOUCH_AXIS_DOMINANCE,
  TOUCH_CONTINUOUS_GAIN,
  TOUCH_FLICK_HARD_VEL_STAGE,
  TOUCH_FLICK_LIFT_VEL_STAGE,
  TOUCH_FLICK_VERTICAL_RATIO,
  TOUCH_TAP_MAX_MS,
  touchStageThresholds,
} from "../config";
import { isControlsSwapped } from "../fun/effects";
import { isReplayPlayback, recordReplayAction } from "../replay";
import {
  canSoftDropSteer,
  classifyFlick,
  clientDeltaToStage,
  clientToStageScale,
  consumeGridSteps,
  isTapGesture,
  resolveAxisLock,
  shouldArmSoftDrop,
  shouldReleaseSoftDrop,
  type AxisLock,
} from "./touch-math";

/** Minimal action surface for touch (avoids import cycle with controls.ts). */
export type TouchPieceActions = {
  moveLeft: () => void;
  moveRight: () => void;
  rotateCW: () => void;
  rotateCCW: () => void;
  hardDrop: () => void;
  softDrop: () => void;
  normalSpeed: () => void;
  tryLift?: () => void;
  shiftBy?: (stageDx: number) => boolean;
};

export type TouchControlOptions = {
  /**
   * When true, horizontal drag maps to continuous stage pixels via shiftBy.
   * When false, drag accumulates into discrete column steps (moveLeft/Right).
   */
  continuous: boolean;
};

const THRESH = touchStageThresholds();

/** Canvas mid-x for rotate zones (letterbox-safe). */
const isLeftHalf = (clientX: number): boolean => {
  const rect = viewEl().getBoundingClientRect();
  if (rect.width <= 0) return clientX < window.innerWidth / 2;
  return clientX < rect.left + rect.width / 2;
};

type TouchSession = {
  pointerId: number;
  originX: number;
  originY: number;
  lastX: number;
  lastY: number;
  lastAt: number;
  startedAt: number;
  axis: AxisLock;
  /** Grid: leftover stage-x after column steps. */
  gridAccumX: number;
  softDropArmed: boolean;
  /** Once true, this contact will never emit a rotate tap. */
  consumedAsPan: boolean;
  ended: boolean;
  /** Recent **stage** velocity Y (stage-px/ms, down positive). */
  recentVelY: number;
};

const viewEl = (): HTMLElement => app.view as HTMLElement;

const scaleForView = () => {
  const rect = viewEl().getBoundingClientRect();
  return clientToStageScale(rect, STAGE_WIDTH, STAGE_HEIGHT);
};

const fireRotateAt = (actions: TouchPieceActions, clientX: number) => {
  const swapped = isControlsSwapped();
  const wantCw = !isLeftHalf(clientX);
  const cw = wantCw !== swapped;
  (cw ? actions.rotateCW : actions.rotateCCW)();
  recordReplayAction(cw ? "CW" : "CCW");
};

const fireHorizontalStep = (actions: TouchPieceActions, wantLeft: boolean) => {
  const swapped = isControlsSwapped();
  const goLeft = wantLeft !== swapped;
  (goLeft ? actions.moveLeft : actions.moveRight)();
  recordReplayAction(goLeft ? "L" : "R");
};

const applyContinuousDx = (
  actions: TouchPieceActions,
  stageDx: number,
): void => {
  if (!stageDx || !Number.isFinite(stageDx)) return;
  const damped = stageDx * TOUCH_CONTINUOUS_GAIN;
  if (!damped) return;
  const swapped = isControlsSwapped();
  const logicalDx = swapped ? -damped : damped;
  if (actions.shiftBy) {
    const moved = actions.shiftBy(logicalDx);
    if (moved) {
      recordReplayAction(logicalDx < 0 ? "L" : "R");
    }
    return;
  }
  if (logicalDx < 0) fireHorizontalStep(actions, true);
  else fireHorizontalStep(actions, false);
};

const applyGridDx = (
  session: TouchSession,
  actions: TouchPieceActions,
  stageDx: number,
): void => {
  session.gridAccumX += stageDx;
  const { steps, remainder } = consumeGridSteps(
    session.gridAccumX,
    THRESH.gridStep,
  );
  session.gridAccumX = remainder;
  if (steps === 0) return;
  const swapped = isControlsSwapped();
  const dir = steps > 0 ? 1 : -1;
  const count = Math.abs(steps);
  for (let i = 0; i < count; i++) {
    const wantLeft = dir < 0;
    const goLeft = wantLeft !== swapped;
    (goLeft ? actions.moveLeft : actions.moveRight)();
    recordReplayAction(goLeft ? "L" : "R");
  }
};

const armSoftDrop = (session: TouchSession, actions: TouchPieceActions) => {
  if (session.softDropArmed) return;
  session.softDropArmed = true;
  actions.softDrop();
  recordReplayAction("SD");
};

const releaseSoftDrop = (session: TouchSession, actions: TouchPieceActions) => {
  if (!session.softDropArmed) return;
  session.softDropArmed = false;
  actions.normalSpeed();
  recordReplayAction("ND");
};

/**
 * Bind direct-drag touch on the game canvas. Returns dispose().
 */
export const bindTouchControls = (
  actions: TouchPieceActions,
  options: TouchControlOptions,
): (() => void) => {
  if (isReplayPlayback()) return () => {};

  const canvas = viewEl();
  let session: TouchSession | null = null;

  const clearSession = (releaseSoft: boolean) => {
    if (session && releaseSoft) releaseSoftDrop(session, actions);
    session = null;
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (session) return;

    session = {
      pointerId: e.pointerId,
      originX: e.clientX,
      originY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastAt: performance.now(),
      startedAt: performance.now(),
      axis: "none",
      gridAccumX: 0,
      softDropArmed: false,
      consumedAsPan: false,
      ended: false,
      recentVelY: 0,
    };
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* capture optional */
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!session || session.ended || e.pointerId !== session.pointerId) return;

    const now = performance.now();
    const scale = scaleForView();
    const clientDxFromOrigin = e.clientX - session.originX;
    const clientDyFromOrigin = e.clientY - session.originY;
    const clientDxStep = e.clientX - session.lastX;
    const clientDyStep = e.clientY - session.lastY;
    const stepDt = Math.max(now - session.lastAt, 1);

    const stageFromOrigin = clientDeltaToStage(
      clientDxFromOrigin,
      clientDyFromOrigin,
      scale,
    );
    const stageStep = clientDeltaToStage(clientDxStep, clientDyStep, scale);

    // Stage-space velocity for density-independent flicks.
    const sampleVelY = stageStep.dy / stepDt;
    session.recentVelY = session.recentVelY * 0.35 + sampleVelY * 0.65;
    session.lastX = e.clientX;
    session.lastY = e.clientY;
    session.lastAt = now;

    if (session.axis === "none") {
      session.axis = resolveAxisLock(
        stageFromOrigin.dx,
        stageFromOrigin.dy,
        THRESH.deadZone,
        TOUCH_AXIS_DOMINANCE,
      );
      if (session.axis === "none") return;
      session.consumedAsPan = true;
    }

    // Soft drop from vertical commitment (stage cells).
    if (
      !session.softDropArmed &&
      shouldArmSoftDrop(stageFromOrigin.dy, THRESH.softDrop)
    ) {
      armSoftDrop(session, actions);
    } else if (
      session.softDropArmed &&
      shouldReleaseSoftDrop(stageFromOrigin.dy, THRESH.softDrop)
    ) {
      releaseSoftDrop(session, actions);
    }

    // Horizontal only when H-locked, or soft-drop + intentional lateral steer.
    // Pure vertical flicks never move columns.
    const allowH =
      session.axis === "h" ||
      (session.softDropArmed &&
        canSoftDropSteer(stageFromOrigin.dx, THRESH.softSteer));
    if (allowH && Math.abs(stageStep.dx) > 0.5) {
      if (session.axis === "v" && allowH) session.axis = "h";
      if (options.continuous) {
        applyContinuousDx(actions, stageStep.dx);
      } else {
        applyGridDx(session, actions, stageStep.dx);
      }
    }
  };

  const endPointer = (e: PointerEvent, cancelled: boolean) => {
    if (!session || e.pointerId !== session.pointerId) return;
    if (session.ended) {
      clearSession(true);
      return;
    }

    const durationMs = performance.now() - session.startedAt;
    const scale = scaleForView();
    const stageTotal = clientDeltaToStage(
      e.clientX - session.originX,
      e.clientY - session.originY,
      scale,
    );
    const dt = Math.max(durationMs, 1);
    const avgVelY = stageTotal.dy / dt;
    const velocityY =
      Math.abs(session.recentVelY) > Math.abs(avgVelY)
        ? session.recentVelY
        : avgVelY;

    if (!cancelled && !session.consumedAsPan) {
      if (
        isTapGesture(
          durationMs,
          stageTotal.dx,
          stageTotal.dy,
          THRESH.deadZone,
          TOUCH_TAP_MAX_MS,
        )
      ) {
        fireRotateAt(actions, e.clientX);
        session.ended = true;
        clearSession(true);
        return;
      }
    }

    // Flicks: vertical-primary contacts only; stage distance + stage velocity.
    const verticalPrimary =
      session.axis === "v" ||
      Math.abs(stageTotal.dy) >=
        Math.abs(stageTotal.dx) * TOUCH_FLICK_VERTICAL_RATIO;
    if (!cancelled && session.consumedAsPan && verticalPrimary) {
      const flick = classifyFlick(velocityY, stageTotal.dy, stageTotal.dx, {
        hardVelocity: TOUCH_FLICK_HARD_VEL_STAGE,
        liftVelocity: TOUCH_FLICK_LIFT_VEL_STAGE,
        minDistance: THRESH.flickMin,
        verticalRatio: TOUCH_FLICK_VERTICAL_RATIO,
      });
      if (flick === "hardDrop") {
        actions.hardDrop();
        recordReplayAction("HD");
        session.ended = true;
        clearSession(true);
        return;
      }
      if (flick === "lift" && actions.tryLift) {
        actions.tryLift();
        recordReplayAction("LF");
        session.ended = true;
        clearSession(true);
        return;
      }
    }

    clearSession(true);
  };

  const onPointerUp = (e: PointerEvent) => endPointer(e, false);
  const onPointerCancel = (e: PointerEvent) => endPointer(e, true);

  const onLostCapture = (e: PointerEvent) => {
    if (session && e.pointerId === session.pointerId) {
      clearSession(true);
    }
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  canvas.addEventListener("lostpointercapture", onLostCapture);

  return () => {
    clearSession(true);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerCancel);
    canvas.removeEventListener("lostpointercapture", onLostCapture);
  };
};
