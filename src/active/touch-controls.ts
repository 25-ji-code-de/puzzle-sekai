/**
 * Direct-drag touch controls for the active piece.
 * Pointer Events on the full viewport + floating stick.
 *
 * Velocity model:  v_final = v_base_fall + v_stick(position)
 * Stick unit-disk (sx, sy): sx → horizontal rate, +sy → soft-drop on top of gravity.
 */
import { app, gameTicker } from "../runtime";
import {
  CONTINUOUS_STRAFE_SPEED,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  TOUCH_FLICK_HARD_VEL_STAGE,
  TOUCH_FLICK_LIFT_VEL_STAGE,
  TOUCH_FLICK_VERTICAL_RATIO,
  TOUCH_STICK_PROFILE_COMPACT,
  TOUCH_STICK_PROFILE_DESKTOP,
  TOUCH_TAP_MAX_MS,
  touchStageThresholds,
  type TouchStickProfile,
} from "../config";
import { isControlsSwapped } from "../fun/effects";
import { isReplayPlayback, recordReplayAction } from "../replay";
import { isCompactPointerViewport } from "../ui/display-policy";
import {
  classifyFlick,
  clientDeltaToStage,
  clientToStageScale,
  isTapGesture,
  sampleStick,
  softDropWithHysteresis,
  type StickSample,
} from "./touch-math";
import { createStickUi } from "./touch-stick-ui";

/**
 * Clicks that must not start a stick session (pause FAB, dialogs, form fields).
 */
const TOUCH_UI_BLOCKER =
  'button, a, input, textarea, select, label, [contenteditable="true"], ' +
  '[contenteditable=""], .ui-overlay, .ui-dialog, .pause-fab, #pause-button, ' +
  "#pause-overlay, #settings-panel, [data-no-touch-play]";

/** True when the event target is chrome that owns the pointer. */
export const isTouchUiBlocked = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(TOUCH_UI_BLOCKER));
};

/** Compact (phone) vs desktop stick profile for current viewport. */
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
  continuous: boolean;
  /** Continuous hold-strafe speed (px / PIXI delta); scaled by profile.strafeMult. */
  strafeSpeed?: number;
};

const MAX_DELTA = 3;

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
  softDropArmed: boolean;
  consumedAsPan: boolean;
  ended: boolean;
  recentVelY: number;
  /** Horizontal velocity component sx ∈ [-1, 1]. */
  intentSx: number;
  lastGridStepAt: number;
  /**
   * Hard-drop charge: ms accumulated while magFrac stays in charge radius.
   * Leaving the center resets to 0. Full charge → hardDrop.
   */
  hardChargeMs: number;
  lastChargeAt: number;
  hardFired: boolean;
  /**
   * Once true this press, the finger left the dead zone — returning to center
   * uses the slower return charge (3s) instead of the direct hold (~0.5s).
   */
  leftDeadZone: boolean;
  /** Latest stick |offset|/radius for charge gating. */
  magFrac: number;
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
  const swapped = isControlsSwapped();
  const logicalDx = swapped ? -stageDx : stageDx;
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
 * Bind stick + flick touch on the full viewport (letterbox included).
 */
export const bindTouchControls = (
  actions: TouchPieceActions,
  options: TouchControlOptions,
): (() => void) => {
  if (isReplayPlayback()) return () => {};

  const profile = resolveStickProfile();
  const thresh = touchStageThresholds(undefined, profile.radiusCells);

  const surface: HTMLElement = document.documentElement;
  const stick = createStickUi();
  let session: TouchSession | null = null;
  let hooked = false;
  const prevTouchAction = surface.style.touchAction;
  surface.style.touchAction = "none";

  const baseStrafe =
    options.strafeSpeed && options.strafeSpeed > 0
      ? options.strafeSpeed
      : CONTINUOUS_STRAFE_SPEED;
  // Max |sx|=1 → this many stage-px per ticker delta.
  const strafeSpeed = baseStrafe * profile.strafeMult;

  const sampleFromOrigin = (
    sess: TouchSession,
    clientX: number,
    clientY: number,
  ): { sample: StickSample; scale: ReturnType<typeof scaleForView> } => {
    const scale = scaleForView();
    const stage = clientDeltaToStage(
      clientX - sess.originX,
      clientY - sess.originY,
      scale,
    );
    const sample = sampleStick(stage.dx, stage.dy, {
      radiusStage: thresh.stickRadius,
      deadFrac: profile.deadFrac,
      softVy: profile.softVy,
    });
    return { sample, scale };
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

  const fireHardDrop = (sess: TouchSession) => {
    if (sess.hardFired || sess.ended) return;
    sess.hardFired = true;
    sess.ended = true;
    actions.hardDrop();
    recordReplayAction("HD");
    clearSession(true);
  };

  const onStickTick = (delta: number) => {
    if (!session || session.ended) return;

    // Hard-drop charge ring: hold near center; leave center → reset.
    // Direct press (never left dead zone) → fast charge; after a pan out and
    // return → slightly slower charge so accidental re-center is less twitchy.
    if (!session.hardFired) {
      const now = performance.now();
      const dtMs = Math.min(
        Math.max(now - session.lastChargeAt, 0),
        50, // cap so a long stall frame doesn't skip the ring
      );
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
    // Cap runaway flings; rim is |sx|=1, outside can go up to sxMax.
    const sx =
      Math.abs(sxRaw) > profile.sxMax
        ? Math.sign(sxRaw) * profile.sxMax
        : sxRaw;
    if (Math.abs(sx) < 0.02) return;

    if (options.continuous) {
      const raw = Number.isFinite(delta) && delta > 0 ? delta : 0;
      if (raw <= 0) return;
      const dt = Math.min(raw, MAX_DELTA);
      // v_x = sx * rimStrafe  (sx can exceed 1 outside the drawn ring).
      const dist = strafeSpeed * sx * dt;
      if (!dist) return;
      applyContinuousDx(actions, dist);
      return;
    }

    // Grid: step rate scales with |sx| (half-side ≈ half as often; outside ring faster).
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

  const clearSession = (releaseSoft: boolean) => {
    if (session && releaseSoft) releaseSoftDrop(session, actions);
    session = null;
    unhookTick();
    stick.hide();
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
    // Start charging immediately (center hold) — tick accumulates.
    ensureHooked();

    try {
      surface.setPointerCapture(e.pointerId);
    } catch {
      /* capture optional */
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!session || session.ended || e.pointerId !== session.pointerId) return;

    const now = performance.now();
    const scale = scaleForView();
    const clientDxStep = e.clientX - session.lastX;
    const clientDyStep = e.clientY - session.lastY;
    const stepDt = Math.max(now - session.lastAt, 1);
    const stageStep = clientDeltaToStage(clientDxStep, clientDyStep, scale);

    const sampleVelY = stageStep.dy / stepDt;
    session.recentVelY = session.recentVelY * 0.35 + sampleVelY * 0.65;
    session.lastX = e.clientX;
    session.lastY = e.clientY;
    session.lastAt = now;

    const { sample } = sampleFromOrigin(session, e.clientX, e.clientY);
    const knobCssDx = sample.knobDx / (scale.sx > 0 ? scale.sx : 1);
    const knobCssDy = sample.knobDy / (scale.sy > 0 ? scale.sy : 1);
    const active = Math.abs(sample.sx) > 0.02 || sample.softDrop;
    stick.setKnob(knobCssDx, knobCssDy, active);

    session.magFrac = sample.magFrac;
    if (sample.magFrac > profile.deadFrac) {
      session.consumedAsPan = true;
      session.leftDeadZone = true;
    }

    session.intentSx = sample.sx;
    // Keep ticker for charge even when sx≈0 (center hold).
    ensureHooked();

    // Soft-drop from +sy (down component) — stacks on base gravity.
    // While charging hard-drop in center, don't soft-drop (sy≈0 anyway).
    const wantSoft = softDropWithHysteresis(
      sample,
      session.softDropArmed,
      profile.softVy,
      profile.softVyRelease,
    );
    if (wantSoft && !session.softDropArmed) {
      armSoftDrop(session, actions);
    } else if (!wantSoft && session.softDropArmed) {
      releaseSoftDrop(session, actions);
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
    if (session && e.pointerId === session.pointerId) {
      clearSession(true);
    }
  };

  surface.addEventListener("pointerdown", onPointerDown);
  surface.addEventListener("pointermove", onPointerMove);
  surface.addEventListener("pointerup", onPointerUp);
  surface.addEventListener("pointercancel", onPointerCancel);
  surface.addEventListener("lostpointercapture", onLostCapture);

  return () => {
    clearSession(true);
    stick.dispose();
    surface.style.touchAction = prevTouchAction;
    surface.removeEventListener("pointerdown", onPointerDown);
    surface.removeEventListener("pointermove", onPointerMove);
    surface.removeEventListener("pointerup", onPointerUp);
    surface.removeEventListener("pointercancel", onPointerCancel);
    surface.removeEventListener("lostpointercapture", onLostCapture);
  };
};
