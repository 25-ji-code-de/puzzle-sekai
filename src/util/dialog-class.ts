/**
 * Pure class-name builders for shared dialog UI.
 */
import { joinClassNames } from "./css-class";

/** Overlay class: default or stronger dim when alpha ≥ 0.75. */
export const dialogOverlayClassName = (backdropAlpha?: number): string =>
  backdropAlpha !== undefined && backdropAlpha >= 0.75
    ? "ui-overlay ui-overlay--dim"
    : "ui-overlay";

/** Dialog card: optional wide variant. */
export const dialogCardClassName = (wide?: boolean): string =>
  wide ? "ui-dialog ui-dialog--wide" : "ui-dialog";

/** Primary / neutral / danger button. */
export const dialogButtonClassName = (
  variant: "primary" | "neutral" | "danger",
): string => `ui-btn ui-btn--${variant}`;

/** Settings chip with optional extra class + active state. */
export const settingOptClassName = (active: boolean, extra?: string): string =>
  joinClassNames("setting-opt", extra, active && "active");
