export { prefersReducedMotion, onReducedMotionChange } from "./motion";
export {
  trapFocus,
  type FocusTrapHandle,
  type FocusTrapOptions,
  nextTabIndex,
  shouldWrapTab,
} from "./focus-trap";
export {
  ensureLiveRegions,
  announce,
  disposeLiveRegions,
  type AnnounceOptions,
} from "./live-region";
export {
  announceMatchStart,
  announceMatchEnd,
  scheduleScoreAnnounce,
  announceTimerIfNeeded,
  announcePaused,
  announceResumed,
  announceGameOver,
  announceMenu,
} from "./announce-game";
export {
  TIME_CRITICAL_SEC,
  formatTimerClock,
  shouldAnnounceTimeLow,
  scoreAnnounceKind,
  shouldSpeakScore,
} from "./announce-format";
