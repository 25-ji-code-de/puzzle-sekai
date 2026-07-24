/**
 * Stick mode — floating virtual stick + velocity superposition + charge hard-drop.
 * Extracted from the previous single-path touch-controls.
 */
import { gameTicker } from "../runtime";
import {
  CONTINUOUS_STRAFE_SPEED,
  TOUCH_FLICK_HARD_VEL_STAGE,
  TOUCH_FLICK_LIFT_VEL_STAGE,
  TOUCH_FLICK_VERTICAL_RATIO,
  TOUCH_STICK_PROFILE_COMPACT,
  TOUCH_STICK_PROFILE_DESKTOP,
  TOUCH_TAP_MAX_MS,
  touchStageThresholds,
  type TouchStickProfile,
} from "../config";
import { isReplayPlayback, recordReplayAction } from "../replay";
import { isCompactPointerViewport } from "../ui/display-policy";
import {
  classifyFlick,
  clientDeltaToStage,
  isTapGesture,
  sampleStick,
  softDropWithHysteresis,
  type StickSample,
} from "./touch-math";
import { createStickUi } from "./touch-stick-ui";
import {
  MAX_DELTA,
  applyContinuousDx,
  armSoftDrop,
  fireHorizontalStep,
  fireRotateAt,
  isTouchUiBlocked,
  openTouchSurface,
  releaseSoftDrop,
  scaleForView,
  type TouchBindOptions,
  type TouchPieceActions,
} from "./touch-shared";

export const resolveStickProfile = (): TouchStickProfile => {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return TOUCH_STICK_PROFILE_DESKTOP;
  }
  return isCompactPointerViewport(window.matchMedia.bind(window))
    ? TOUCH_STICK_PROFILE_COMPACT
    : TOUCH_STICK_PROFILE_DESKTOP;
};

type StickSession = {
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
  intentSx: number;
  lastGridStepAt: number;
  hardChargeMs: number;
  lastChargeAt: number;
  hardFired: boolean;
  leftDeadZone: boolean;
  magFrac: number;
};

export const bindStickTouch = (
  actions: TouchPieceActions,
  options: TouchBindOptions,
): (() => void) => {
  if (isReplayPlayback()) return () => {};

  const profile = resolveStickProfile();
  const thresh = touchStageThresholds(undefined, profile.radiusCells);
  const { surface, restore } = openTouchSurface();
  const stick = createStickUi();
  let session: StickSession | null = null;
  let hooked = false;

  const baseStrafe =
    options.strafeSpeed && options.strafeSpeed > 0
      ? options.strafeSpeed
      : CONTINUOUS_STRAFE_SPEED;
  const strafeSpeed = baseStrafe * profile.strafeMult;

  const sampleFromOrigin = (
    sess: StickSession,
    clientX: number,
    clientY: number,
  ): { sample: StickSample } => {
    const scale = scaleForView();
    const stage = clientDeltaToStage(
      clientX - sess.originX,
      clientY - sess.originY,
      scale,
    );
    return {
      sample: sampleStick(stage.dx, stage.dy, {
        radiusStage: thresh.stickRadius,
        deadFrac: profile.deadFrac,
        softVy: profile.softVy,
      }),
    };
  };

  const unhookTick = () => {
    if (!hooked) return;
    gameTicker.remove(onStickTick);
    hooked = false;
  };

  const ensureHooked = () => {
    if (hooked) return;
    gameTicker.add(onStickTick);
    hooked = true;
  };

  const clearSession = (releaseSoft: boolean) => {
    if (session && releaseSoft) releaseSoftDrop(session, actions);
    session = null;
    unhookTick();
    stick.hide();
  };

  const fireHardDrop = (sess: StickSession) => {
    if (sess.hardFired || sess.ended) return;
    sess.hardFired = true;
    sess.ended = true;
    actions.hardDrop();
    recordReplayAction("HD");
    clearSession(true);
  };

  const onStickTick = (delta: number) => {
    if (!session || session.ended) return;

    if (!session.hardFired) {
      const now = performance.now();
      const dtMs = Math.min(Math.max(now - session.lastChargeAt, 0), 50);
      session.lastChargeAt = now;

      if (session.magFrac <= profile.hardChargeFrac) {
        session.hardChargeMs += dtMs;
        const need = Math.max(
          session.leftDeadZone
            ? profile.hardChargeReturnMs
            : profile.hardChargeMs,
          1,
        );
        const p = Math.min(1, session.hardChargeMs / need);
        stick.setCharge(p);
        if (p >= 1) {
          fireHardDrop(session);
          return;
        }
      } else if (session.hardChargeMs > 0) {
        session.hardChargeMs = 0;
        stick.setCharge(0);
      }
    }

    const sxRaw = session.intentSx;
    const sx =
      Math.abs(sxRaw) > profile.sxMax
        ? Math.sign(sxRaw) * profile.sxMax
        : sxRaw;
    if (Math.abs(sx) < 0.02) return;

    if (options.continuous) {
      const raw = Number.isFinite(delta) && delta > 0 ? delta : 0;
      if (raw <= 0) return;
      const dt = Math.min(raw, MAX_DELTA);
      const dist = strafeSpeed * sx * dt;
      if (!dist) return;
      applyContinuousDx(actions, dist);
      return;
    }

    const now = performance.now();
    const strength = Math.max(Math.abs(sx), 0.08);
    const interval = Math.max(
      profile.gridStepMinMs,
      profile.gridStepMs / strength,
    );
    if (session.lastGridStepAt <= 0) {
      session.lastGridStepAt = now - interval * 0.55;
    }
    if (now - session.lastGridStepAt < interval) return;
    session.lastGridStepAt = now;
    fireHorizontalStep(actions, sx < 0);
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
      intentSx: 0,
      lastGridStepAt: 0,
      hardChargeMs: 0,
      lastChargeAt: now,
      hardFired: false,
      leftDeadZone: false,
      magFrac: 0,
    };

    const scale = scaleForView();
    const radiusCss = thresh.stickRadius / (scale.sx > 0 ? scale.sx : 1);
    stick.show(e.clientX, e.clientY, radiusCss);
    ensureHooked();

    try {
      surface.setPointerCapture(e.pointerId);
    } catch {
      /* optional */
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!session || session.ended || e.pointerId !== session.pointerId) return;

    const now = performance.now();
    const scale = scaleForView();
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

    const { sample } = sampleFromOrigin(session, e.clientX, e.clientY);
    stick.setKnob(
      sample.knobDx / (scale.sx > 0 ? scale.sx : 1),
      sample.knobDy / (scale.sy > 0 ? scale.sy : 1),
      Math.abs(sample.sx) > 0.02 || sample.softDrop,
    );

    session.magFrac = sample.magFrac;
    if (sample.magFrac > profile.deadFrac) {
      session.consumedAsPan = true;
      session.leftDeadZone = true;
    }
    session.intentSx = sample.sx;
    ensureHooked();

    const wantSoft = softDropWithHysteresis(
      sample,
      session.softDropArmed,
      profile.softVy,
      profile.softVyRelease,
    );
    if (wantSoft && !session.softDropArmed) armSoftDrop(session, actions);
    else if (!wantSoft && session.softDropArmed)
      releaseSoftDrop(session, actions);
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
          thresh.deadZone,
          TOUCH_TAP_MAX_MS,
        )
      ) {
        fireRotateAt(actions, e.clientX);
        session.ended = true;
        clearSession(true);
        return;
      }
    }

    const verticalPrimary =
      Math.abs(stageTotal.dy) >=
      Math.abs(stageTotal.dx) * TOUCH_FLICK_VERTICAL_RATIO;
    if (!cancelled && session.consumedAsPan && verticalPrimary) {
      const flick = classifyFlick(velocityY, stageTotal.dy, stageTotal.dx, {
        hardVelocity: TOUCH_FLICK_HARD_VEL_STAGE,
        liftVelocity: TOUCH_FLICK_LIFT_VEL_STAGE,
        minDistance: thresh.flickMin,
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
    if (session && e.pointerId === session.pointerId) clearSession(true);
  };

  surface.addEventListener("pointerdown", onPointerDown);
  surface.addEventListener("pointermove", onPointerMove);
  surface.addEventListener("pointerup", onPointerUp);
  surface.addEventListener("pointercancel", onPointerCancel);
  surface.addEventListener("lostpointercapture", onLostCapture);

  return () => {
    clearSession(true);
    stick.dispose();
    restore();
    surface.removeEventListener("pointerdown", onPointerDown);
    surface.removeEventListener("pointermove", onPointerMove);
    surface.removeEventListener("pointerup", onPointerUp);
    surface.removeEventListener("pointercancel", onPointerCancel);
    surface.removeEventListener("lostpointercapture", onLostCapture);
  };
};
