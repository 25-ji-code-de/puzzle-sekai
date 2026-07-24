/**
 * Gesture mode — swipe / tap / press recognition at the end of each contact.
 *
 * Original HS: swipeleft/right → one col step, swipedown → hardDrop,
 * swipeup → lift, press/pressup → softDrop, tap → half-canvas rotate.
 *
 * Defaults (v2.0.8):
 *   Swipe: threshold 10 CSS-px, velocity 0.3 CSS-px/ms, fire on END
 *   Press: time 251ms, threshold 9 CSS-px
 *   Tap:   time 250ms, threshold 9 CSS-px
 *
 * Recognition uses **client CSS pixels**, not stage cells.
 */
import { isReplayPlayback, recordReplayAction } from "../replay";
import {
  fireHorizontalStep,
  fireRotateAt,
  isTouchUiBlocked,
  openTouchSurface,
  type TouchBindOptions,
  type TouchPieceActions,
} from "./touch-shared";

/** Swipe defaults. */
const SWIPE_THRESHOLD_CSS = 10;
const SWIPE_VELOCITY_CSS = 0.3; // px/ms
/** Press defaults. */
const PRESS_TIME_MS = 251;
const PRESS_THRESHOLD_CSS = 9;
/** Tap defaults. */
const TAP_TIME_MS = 250;
const TAP_THRESHOLD_CSS = 9;
/**
 * Dominant-axis ratio so diagonal flicks don't count as both H and V.
 * The original recognizer picks one direction via angle; we approximate with axis dominance.
 */
const AXIS_RATIO = 1.15;

type Session = {
  pointerId: number;
  originX: number;
  originY: number;
  lastX: number;
  lastY: number;
  lastAt: number;
  startedAt: number;
  softDropArmed: boolean;
  ended: boolean;
  /** Peak |velocity| samples for end-of-gesture swipe (CSS-px/ms). */
  recentVelX: number;
  recentVelY: number;
  pressEligible: boolean;
  pressTimer: ReturnType<typeof setTimeout> | null;
};

export const bindGestureTouch = (
  actions: TouchPieceActions,
  _options: TouchBindOptions,
): (() => void) => {
  if (isReplayPlayback()) return () => {};

  const { surface, restore } = openTouchSurface();
  let session: Session | null = null;

  const clearPressTimer = (sess: Session) => {
    if (sess.pressTimer != null) {
      clearTimeout(sess.pressTimer);
      sess.pressTimer = null;
    }
  };

  const clearSession = (releaseSoft: boolean) => {
    if (session) {
      clearPressTimer(session);
      if (releaseSoft && session.softDropArmed) {
        session.softDropArmed = false;
        actions.normalSpeed();
        recordReplayAction("ND");
      }
    }
    session = null;
  };

  const armSoft = (sess: Session) => {
    if (sess.softDropArmed) return;
    sess.softDropArmed = true;
    actions.softDrop();
    recordReplayAction("SD");
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (session) return;
    if (isTouchUiBlocked(e.target)) return;
    const now = performance.now();
    const sess: Session = {
      pointerId: e.pointerId,
      originX: e.clientX,
      originY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastAt: now,
      startedAt: now,
      softDropArmed: false,
      ended: false,
      recentVelX: 0,
      recentVelY: 0,
      pressEligible: true,
      pressTimer: null,
    };
    session = sess;

    // Press — soft-drop after hold with little movement.
    sess.pressTimer = setTimeout(() => {
      if (!session || session !== sess || session.ended) return;
      if (!session.pressEligible) return;
      armSoft(session);
    }, PRESS_TIME_MS);

    try {
      surface.setPointerCapture(e.pointerId);
    } catch {
      /* optional */
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!session || session.ended || e.pointerId !== session.pointerId) return;
    const now = performance.now();
    const dx = e.clientX - session.lastX;
    const dy = e.clientY - session.lastY;
    const stepDt = Math.max(now - session.lastAt, 1);
    // EMA of CSS-px/ms velocity (original uses overall gesture velocity at end).
    session.recentVelX = session.recentVelX * 0.35 + (dx / stepDt) * 0.65;
    session.recentVelY = session.recentVelY * 0.35 + (dy / stepDt) * 0.65;
    session.lastX = e.clientX;
    session.lastY = e.clientY;
    session.lastAt = now;

    const travel = Math.hypot(
      e.clientX - session.originX,
      e.clientY - session.originY,
    );
    // Press fails past threshold CSS-px from start.
    if (session.pressEligible && travel > PRESS_THRESHOLD_CSS) {
      session.pressEligible = false;
      clearPressTimer(session);
    }
    // No mid-gesture moves — Swipe fires only on END.
  };

  const endPointer = (e: PointerEvent, cancelled: boolean) => {
    if (!session || e.pointerId !== session.pointerId) return;
    if (session.ended) {
      clearSession(true);
      return;
    }
    clearPressTimer(session);

    const durationMs = Math.max(performance.now() - session.startedAt, 1);
    const totalDx = e.clientX - session.originX;
    const totalDy = e.clientY - session.originY;
    const dist = Math.hypot(totalDx, totalDy);
    // Overall velocity: distance / duration (CSS-px/ms).
    const avgVelX = totalDx / durationMs;
    const avgVelY = totalDy / durationMs;
    // Blend peak recent sample so a quick snap still registers.
    const velX =
      Math.abs(session.recentVelX) > Math.abs(avgVelX)
        ? session.recentVelX
        : avgVelX;
    const velY =
      Math.abs(session.recentVelY) > Math.abs(avgVelY)
        ? session.recentVelY
        : avgVelY;
    const speed = Math.hypot(velX, velY);

    if (cancelled) {
      clearSession(true);
      return;
    }

    // --- Tap: short + little movement ---
    if (durationMs <= TAP_TIME_MS && dist <= TAP_THRESHOLD_CSS) {
      // Don't treat as tap if press already armed soft-drop (long still hold).
      if (!session.softDropArmed) {
        fireRotateAt(actions, e.clientX);
        session.ended = true;
      }
      clearSession(true);
      return;
    }

    // --- Swipe: on END, distance + velocity ---
    const isSwipe = dist >= SWIPE_THRESHOLD_CSS && speed >= SWIPE_VELOCITY_CSS;
    if (isSwipe) {
      const adx = Math.abs(totalDx);
      const ady = Math.abs(totalDy);
      // Prefer the dominant axis.
      if (adx >= ady * AXIS_RATIO) {
        // Horizontal swipe → one column / continuousMoveStep via actions.
        fireHorizontalStep(actions, totalDx < 0);
        session.ended = true;
        clearSession(true);
        return;
      }
      if (ady >= adx * AXIS_RATIO) {
        if (totalDy > 0) {
          actions.hardDrop();
          recordReplayAction("HD");
        } else if (actions.tryLift) {
          actions.tryLift();
          recordReplayAction("LF");
        }
        session.ended = true;
        clearSession(true);
        return;
      }
    }

    // Pressup or cancelled pan — release soft-drop if armed.
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
    restore();
    surface.removeEventListener("pointerdown", onPointerDown);
    surface.removeEventListener("pointermove", onPointerMove);
    surface.removeEventListener("pointerup", onPointerUp);
    surface.removeEventListener("pointercancel", onPointerCancel);
    surface.removeEventListener("lostpointercapture", onLostCapture);
  };
};
