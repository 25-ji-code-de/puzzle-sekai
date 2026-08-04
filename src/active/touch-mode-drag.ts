/**
 * Drag mode — competitive finger-relative 1:1 steer from press origin.
 * No stick UI / no center charge; flicks + soft-drop hold still work.
 */
import { TOUCH_DRAG_CONTINUOUS_GAIN, touchStageThresholds } from "../config";
import { isReplayPlayback } from "../replay";
import {
  clientDeltaToStage,
  consumeGridSteps,
  shouldArmSoftDrop,
  shouldReleaseSoftDrop,
} from "./touch-math";
import {
  applyContinuousDx,
  armSoftDrop,
  finishTouchGesture,
  fireHorizontalStep,
  isTouchUiBlocked,
  openTouchSurface,
  releaseSoftDrop,
  scaleForView,
  tryCapturePointer,
  type TouchBindOptions,
  type TouchPieceActions,
} from "./touch-shared";

type Session = {
  pointerId: number;
  originX: number;
  originY: number;
  lastX: number;
  lastY: number;
  lastAt: number;
  startedAt: number;
  softDropArmed: boolean;
  consumedAsPan: boolean;
  ended: boolean;
  recentVelY: number;
  gridAccumX: number;
};

export const bindDragTouch = (
  actions: TouchPieceActions,
  options: TouchBindOptions,
): (() => void) => {
  if (isReplayPlayback()) return () => {};

  const thresh = touchStageThresholds();
  const { surface, restore } = openTouchSurface();
  let session: Session | null = null;

  const clearSession = (releaseSoft: boolean) => {
    if (session && releaseSoft) releaseSoftDrop(session, actions);
    session = null;
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (session) return;
    if (isTouchUiBlocked(e.target)) return;
    const now = performance.now();
    session = {
      pointerId: e.pointerId,
      originX: e.clientX,
      originY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastAt: now,
      startedAt: now,
      softDropArmed: false,
      consumedAsPan: false,
      ended: false,
      recentVelY: 0,
      gridAccumX: 0,
    };
    tryCapturePointer(surface, e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!session || session.ended || e.pointerId !== session.pointerId) return;
    const now = performance.now();
    const scale = scaleForView();
    const stageFromOrigin = clientDeltaToStage(
      e.clientX - session.originX,
      e.clientY - session.originY,
      scale,
    );
    const stageStep = clientDeltaToStage(
      e.clientX - session.lastX,
      e.clientY - session.lastY,
      scale,
    );
    const stepDt = Math.max(now - session.lastAt, 1);
    session.recentVelY =
      session.recentVelY * 0.35 + (stageStep.dy / stepDt) * 0.65;
    session.lastX = e.clientX;
    session.lastY = e.clientY;
    session.lastAt = now;

    if (Math.hypot(stageFromOrigin.dx, stageFromOrigin.dy) > thresh.deadZone) {
      session.consumedAsPan = true;
    }

    if (
      !session.softDropArmed &&
      shouldArmSoftDrop(stageFromOrigin.dy, thresh.softDrop)
    ) {
      armSoftDrop(session, actions);
    } else if (
      session.softDropArmed &&
      shouldReleaseSoftDrop(stageFromOrigin.dy, thresh.softDrop)
    ) {
      releaseSoftDrop(session, actions);
    }

    // Always allow H once panned (drag = follow finger).
    if (!session.consumedAsPan || Math.abs(stageStep.dx) < 0.25) return;

    if (options.continuous && actions.shiftBy) {
      applyContinuousDx(actions, stageStep.dx * TOUCH_DRAG_CONTINUOUS_GAIN);
    } else {
      session.gridAccumX += stageStep.dx;
      const { steps, remainder } = consumeGridSteps(
        session.gridAccumX,
        thresh.gridStep,
      );
      session.gridAccumX = remainder;
      for (let i = 0; i < Math.abs(steps); i++) {
        fireHorizontalStep(actions, steps < 0);
      }
    }
  };

  const endPointer = (e: PointerEvent, cancelled: boolean) => {
    if (!session || e.pointerId !== session.pointerId) return;
    finishTouchGesture(e, session, actions, () => clearSession(true), {
      cancelled,
      allowTap: true,
      deadZone: thresh.deadZone,
      flickMin: thresh.flickMin,
    });
  };

  const onPointerUp = (e: PointerEvent) => endPointer(e, false);
  const onPointerCancel = (e: PointerEvent) => endPointer(e, true);
  const onLostCapture = (e: PointerEvent) => {
    if (session && e.pointerId === session.pointerId) clearSession(true);
  };

  surface.addEventListener("pointerdown", onPointerDown);
  surface.addEventListener("pointermove", onPointerMove);
  surface.addEventListener("pointerup", onPointerUp);
  surface.addEventListener("pointercancel", onPointerCancel);
  surface.addEventListener("lostpointercapture", onLostCapture);

  return () => {
    clearSession(true);
    restore();
    surface.removeEventListener("pointerdown", onPointerDown);
    surface.removeEventListener("pointermove", onPointerMove);
    surface.removeEventListener("pointerup", onPointerUp);
    surface.removeEventListener("pointercancel", onPointerCancel);
    surface.removeEventListener("lostpointercapture", onLostCapture);
  };
};
