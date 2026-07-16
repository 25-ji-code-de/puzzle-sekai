/**
 * Exhaustiveness helper — forces TS to prove all union members handled.
 */
export const assertNever = (value: never, message?: string): never => {
  throw new Error(message ?? `Unexpected value: ${String(value)}`);
};
