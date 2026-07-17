/**
 * Match-open gate: after top-out / time-up, ignore concurrent land/settle work.
 * Phase is also set to gameOver; this flag is synchronous so async land handlers
 * that started before setPlayPhase still bail out once end is requested.
 */
let matchOpen = false;

export const openMatch = (): void => {
  matchOpen = true;
};

export const closeMatch = (): void => {
  matchOpen = false;
};

export const isMatchOpen = (): boolean => matchOpen;
