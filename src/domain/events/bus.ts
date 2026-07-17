/**
 * Tiny typed event bus for domain / application events.
 * Optional scaffold: play paths do not emit yet. Subscribe/emit when wiring
 * presentation or audio to domain outcomes; safe to keep unused.
 */
import type { GameEvent } from "../types/events";

export type GameEventListener = (event: GameEvent) => void;

const listeners = new Set<GameEventListener>();

export const onGameEvent = (fn: GameEventListener): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const emitGameEvent = (event: GameEvent): void => {
  for (const fn of listeners) {
    try {
      fn(event);
    } catch (e) {
      console.warn("[game-event]", event.type, e);
    }
  }
};

export const emitGameEvents = (events: readonly GameEvent[]): void => {
  for (const e of events) emitGameEvent(e);
};

/** Test helper */
export const clearGameEventListeners = (): void => {
  listeners.clear();
};
