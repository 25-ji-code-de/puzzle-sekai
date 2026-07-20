/**
 * Replay record / playback session state.
 */
import { getMatchSeed } from "../domain/prng";
import { isUtcDateKey } from "../domain/daily";
import { DEFAULT_FUN_MODES } from "../fun/modes";
import type {
  DifficultyLevel,
  GameMode,
  GameSettings,
  GroupName,
} from "../settings/types";
import {
  getActiveDailyDateKey,
  getCurrentGameMode,
  getCurrentSettings,
} from "../settings/store";
import { appendReplayEntry } from "./store";
import {
  REPLAY_VERSION,
  type ReplayAction,
  type ReplayEntry,
  type ReplayInput,
  type ReplaySettingsSnapshot,
} from "./types";
import { nonNegative } from "../util/clamp";

type ReplayFinishSummary = {
  score: number;
  maxCombo: number;
  difficulty: DifficultyLevel;
  entertainment: boolean;
  multiplier: number;
  scoreRank: string;
  playedSeconds: number;
};

const nowMs = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

const cloneSettingsSnapshot = (
  settings: GameSettings,
): ReplaySettingsSnapshot => ({
  speedLevel: settings.speedLevel,
  timeAttackDuration: settings.timeAttackDuration,
  selectedGroups: [...settings.selectedGroups] as GroupName[],
  funModes: { ...DEFAULT_FUN_MODES, ...settings.funModes },
  itemDropRate: settings.itemDropRate,
  spawnOrientation: settings.spawnOrientation,
});

type ReplayRecordSession = {
  startedAt: number;
  pausedAt: number;
  pausedAccumMs: number;
  seed: number;
  mode: GameMode;
  dailyDateKey?: string;
  settings: ReplaySettingsSnapshot;
  inputs: ReplayInput[];
  lastAction?: ReplayAction;
};

type ReplayPlaySession = {
  entry: ReplayEntry;
  startedAt: number;
  pausedAt: number;
  pausedAccumMs: number;
  cursor: number;
  pendingSoftDrop: boolean;
};

let recordSession: ReplayRecordSession | null = null;
let queuedReplayEntry: ReplayEntry | null = null;
let playSession: ReplayPlaySession | null = null;

export type ReplayControlTarget = {
  moveLeft: () => void;
  moveRight: () => void;
  rotateCW: () => void;
  rotateCCW: () => void;
  hardDrop: () => void;
  softDrop: () => void;
  normalSpeed: () => void;
  tryLift?: () => void;
};

let liveControlTarget: ReplayControlTarget | null = null;

export const isReplayPlayback = (): boolean => playSession != null;
export const hasQueuedReplayPlayback = (): boolean => queuedReplayEntry != null;
export const isReplayRecording = (): boolean => recordSession != null;

export const setReplayLiveControlTarget = (
  target: ReplayControlTarget | null,
): void => {
  liveControlTarget = target;
};

export const getReplayLiveControlTarget = (): ReplayControlTarget | null =>
  liveControlTarget;

export const replayModeLabel = (mode: GameMode): string =>
  mode === "timeAttack" ? "timeAttack" : mode === "daily" ? "daily" : "endless";

const elapsedMs = (startedAt: number, pausedAccumMs: number): number =>
  Math.floor(nonNegative(nowMs() - startedAt - pausedAccumMs));

const isReplayRecordableSettings = (settings: GameSettings): boolean =>
  settings.funModes?.truePhysics !== true;

export const isCurrentRunReplayRecordable = (): boolean =>
  isReplayRecordableSettings(getCurrentSettings()) && !isReplayPlayback();

export const beginReplayRecording = (): boolean => {
  if (isReplayPlayback()) return false;
  const settings = getCurrentSettings();
  if (!isReplayRecordableSettings(settings)) {
    recordSession = null;
    return false;
  }
  const seed = getMatchSeed();
  if (seed === undefined) {
    recordSession = null;
    return false;
  }
  const mode = getCurrentGameMode();
  const dailyDateKey = getActiveDailyDateKey();
  recordSession = {
    startedAt: nowMs(),
    pausedAt: 0,
    pausedAccumMs: 0,
    seed,
    mode,
    dailyDateKey: isUtcDateKey(dailyDateKey) ? dailyDateKey : undefined,
    settings: cloneSettingsSnapshot(settings),
    inputs: [],
  };
  return true;
};

export const clearReplayRecording = (): void => {
  recordSession = null;
};

export const recordReplayAction = (action: ReplayAction): void => {
  if (!recordSession || isReplayPlayback()) return;
  const t = elapsedMs(recordSession.startedAt, recordSession.pausedAccumMs);
  const last = recordSession.inputs[recordSession.inputs.length - 1];
  if (last && last.t === t && last.a === action) return;
  recordSession.inputs.push({ t, a: action });
  recordSession.lastAction = action;
};

export const pauseReplayRecordingClock = (): void => {
  if (!recordSession || recordSession.pausedAt) return;
  recordSession.pausedAt = nowMs();
};

export const resumeReplayRecordingClock = (): void => {
  if (!recordSession || !recordSession.pausedAt) return;
  recordSession.pausedAccumMs += nonNegative(nowMs() - recordSession.pausedAt);
  recordSession.pausedAt = 0;
};

const buildReplayEntry = (
  summary: ReplayFinishSummary,
  session: ReplayRecordSession,
): ReplayEntry | null => {
  if (session.inputs.length === 0 || summary.score <= 0) return null;
  const durationMs = elapsedMs(session.startedAt, session.pausedAccumMs);
  const savedAt = Date.now();
  return {
    v: REPLAY_VERSION,
    id: `${savedAt}-${session.seed}-${session.inputs.length}`,
    savedAt,
    seed: session.seed >>> 0,
    mode: session.mode,
    dailyDateKey: session.dailyDateKey,
    settings: session.settings,
    score: summary.score,
    maxCombo: summary.maxCombo,
    difficulty: summary.difficulty as DifficultyLevel,
    entertainment: summary.entertainment,
    multiplier: summary.multiplier,
    scoreRank: summary.scoreRank,
    playedSeconds: summary.playedSeconds,
    durationMs,
    inputs: [...session.inputs],
  };
};

export const finishReplayRecording = (
  summary: ReplayFinishSummary,
): ReplayEntry | null => {
  if (!recordSession || isReplayPlayback()) {
    recordSession = null;
    return null;
  }
  if (recordSession.pausedAt) {
    resumeReplayRecordingClock();
  }
  const session = recordSession;
  recordSession = null;
  const entry = buildReplayEntry(summary, session);
  if (!entry) return null;
  appendReplayEntry(entry);
  return entry;
};

export const queueReplayPlayback = (entry: ReplayEntry): void => {
  queuedReplayEntry = entry;
};

export const consumeQueuedReplayPlayback = (): ReplayEntry | null => {
  if (!queuedReplayEntry) return null;
  const entry = queuedReplayEntry;
  queuedReplayEntry = null;
  return entry;
};

export const activateReplayPlayback = (entry: ReplayEntry): void => {
  playSession = {
    entry,
    startedAt: nowMs(),
    pausedAt: 0,
    pausedAccumMs: 0,
    cursor: 0,
    pendingSoftDrop: false,
  };
  recordSession = null;
};

export const clearReplayPlayback = (): void => {
  queuedReplayEntry = null;
  playSession = null;
  liveControlTarget = null;
};

export const getReplayPlaybackEntry = (): ReplayEntry | null =>
  playSession?.entry ?? null;

export const pauseReplayPlaybackClock = (): void => {
  if (!playSession || playSession.pausedAt) return;
  playSession.pausedAt = nowMs();
};

export const resumeReplayPlaybackClock = (): void => {
  if (!playSession || !playSession.pausedAt) return;
  playSession.pausedAccumMs += nonNegative(nowMs() - playSession.pausedAt);
  playSession.pausedAt = 0;
};

const runReplayAction = (
  action: ReplayAction,
  target: ReplayControlTarget,
): void => {
  switch (action) {
    case "L":
      target.moveLeft();
      break;
    case "R":
      target.moveRight();
      break;
    case "CW":
      target.rotateCW();
      break;
    case "CCW":
      target.rotateCCW();
      break;
    case "HD":
      target.hardDrop();
      break;
    case "SD":
      target.softDrop();
      break;
    case "ND":
      target.normalSpeed();
      break;
    case "LF":
      target.tryLift?.();
      break;
  }
};

export const flushReplayPlayback = (): void => {
  if (!playSession || playSession.pausedAt) return;
  const target = liveControlTarget;
  if (!target) return;
  const elapsed = elapsedMs(playSession.startedAt, playSession.pausedAccumMs);
  const inputs = playSession.entry.inputs;
  while (
    playSession.cursor < inputs.length &&
    inputs[playSession.cursor]!.t <= elapsed
  ) {
    const next = inputs[playSession.cursor]!;
    runReplayAction(next.a, target);
    playSession.pendingSoftDrop =
      next.a === "SD"
        ? true
        : next.a === "ND"
          ? false
          : playSession.pendingSoftDrop;
    playSession.cursor++;
  }
  if (playSession.pendingSoftDrop) {
    target.softDrop();
  }
};
