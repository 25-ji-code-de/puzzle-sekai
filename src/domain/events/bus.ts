/**
 * Tiny typed event bus for domain / application events.
 * Presentation and audio subscribe; producers only emit.
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
