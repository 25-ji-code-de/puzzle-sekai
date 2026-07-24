/**
 * Zones mode — beginner edge-hold move + center tap rotate + bottom soft-drop.
 * Center hold charges hard-drop; flicks still work.
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
  TOUCH_ZONES_HARD_CHARGE_MS,
  TOUCH_ZONES_HARD_CHARGE_MS_COMPACT,
  TOUCH_ZONES_STEP_MS,
  TOUCH_ZONES_STEP_MS_COMPACT,
  touchStageThresholds,
} from "../config";
import { isReplayPlayback, recordReplayAction } from "../replay";
import { isCompactPointerViewport } from "../ui/display-policy";
import {
  classifyFlick,
  clientDeltaToStage,
  hitTestZone,
  isTapGesture,
  type ZoneKind,
} from "./touch-math";
import { createZonesChargeUi } from "./zones-charge-ui";
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
  viewEl,
  type TouchBindOptions,
  type TouchPieceActions,
} from "./touch-shared";

const isCompact = (): boolean => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function")
    return false;
  return isCompactPointerViewport(window.matchMedia.bind(window));
};

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
  zone: ZoneKind;
  hardChargeMs: number;
  lastChargeAt: number;
  hardFired: boolean;
  lastStepAt: number;
  firstStepDone: boolean;
};

export const bindZonesTouch = (
  actions: TouchPieceActions,
  options: TouchBindOptions,
): (() => void) => {
  if (isReplayPlayback()) return () => {};

  const compact = isCompact();
  const profile = compact
    ? TOUCH_STICK_PROFILE_COMPACT
    : TOUCH_STICK_PROFILE_DESKTOP;
  const thresh = touchStageThresholds();
  const stepMs = compact ? TOUCH_ZONES_STEP_MS_COMPACT : TOUCH_ZONES_STEP_MS;
  const chargeMs = compact
    ? TOUCH_ZONES_HARD_CHARGE_MS_COMPACT
    : TOUCH_ZONES_HARD_CHARGE_MS;
  const { surface, restore } = openTouchSurface();
  // Cytus-like thin neon scan ring at finger (not the stick pad).
  const chargeUi = createZonesChargeUi();
  let session: Session | null = null;
  let hooked = false;

  const baseStrafe =
    options.strafeSpeed && options.strafeSpeed > 0
      ? options.strafeSpeed
      : CONTINUOUS_STRAFE_SPEED;

  const unhook = () => {
    if (!hooked) return;
    gameTicker.remove(onTick);
    hooked = false;
  };
  const ensureHooked = () => {
    if (hooked) return;
    gameTicker.add(onTick);
    hooked = true;
  };

  const clearSession = (releaseSoft: boolean) => {
    if (session && releaseSoft) releaseSoftDrop(session, actions);
    session = null;
    unhook();
    chargeUi.hide();
  };

  const fireHard = (sess: Session) => {
    if (sess.hardFired || sess.ended) return;
    sess.hardFired = true;
    sess.ended = true;
    actions.hardDrop();
    recordReplayAction("HD");
    clearSession(true);
  };

  const onTick = (delta: number) => {
    if (!session || session.ended) return;
    const now = performance.now();

    // Center charge → hard-drop.
    if (session.zone === "center" && !session.hardFired) {
      const dtMs = Math.min(Math.max(now - session.lastChargeAt, 0), 50);
      session.lastChargeAt = now;
      if (!session.consumedAsPan) {
        session.hardChargeMs += dtMs;
        const p = Math.min(1, session.hardChargeMs / Math.max(chargeMs, 1));
        chargeUi.setProgress(p);
        if (p >= 1) {
          fireHard(session);
          return;
        }
      }
    }

    // Edge hold move.
    if (session.zone === "left" || session.zone === "right") {
      const wantLeft = session.zone === "left";
      if (options.continuous && actions.shiftBy) {
        const raw = Number.isFinite(delta) && delta > 0 ? delta : 0;
        if (raw <= 0) return;
        const dt = Math.min(raw, MAX_DELTA);
        const dist = baseStrafe * profile.strafeMult * dt;
        applyContinuousDx(actions, wantLeft ? -dist : dist);
      } else {
        // First step is fired on pointerdown; ticker only auto-repeats.
        if (!session.firstStepDone) return;
        if (now - session.lastStepAt < stepMs) return;
        session.lastStepAt = now;
        fireHorizontalStep(actions, wantLeft);
      }
    }
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (session) return;
    if (isTouchUiBlocked(e.target)) return;

    const rect = viewEl().getBoundingClientRect();
    const zone = hitTestZone(e.clientX, e.clientY, rect);
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
      zone,
      hardChargeMs: 0,
      lastChargeAt: now,
      hardFired: false,
      lastStepAt: now,
      firstStepDone: false,
    };

    if (zone === "bottom") {
      armSoftDrop(session, actions);
    }
    if (zone === "center") {
      // Compact scan ring at finger — not the virtual-stick pad.
      chargeUi.show(e.clientX, e.clientY, 34);
      chargeUi.setProgress(0);
    }
    // Edge: move one cell immediately on tap/press (not after a hold delay).
    if (zone === "left" || zone === "right") {
      fireHorizontalStep(actions, zone === "left");
      session.firstStepDone = true;
      session.lastStepAt = now;
      ensureHooked();
    } else if (zone === "center") {
      ensureHooked();
    }

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
      // Leaving center cancels charge.
      if (session.zone === "center" && session.hardChargeMs > 0) {
        session.hardChargeMs = 0;
        chargeUi.setProgress(0);
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

    // Center short tap → rotate (half-screen still used for CW/CCW).
    if (
      !cancelled &&
      session.zone === "center" &&
      !session.consumedAsPan &&
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
    chargeUi.dispose();
    restore();
    surface.removeEventListener("pointerdown", onPointerDown);
    surface.removeEventListener("pointermove", onPointerMove);
    surface.removeEventListener("pointerup", onPointerUp);
    surface.removeEventListener("pointercancel", onPointerCancel);
    surface.removeEventListener("lostpointercapture", onLostCapture);
  };
};
