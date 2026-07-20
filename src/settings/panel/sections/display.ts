/**
 * Display mode (windowed / borderless / fullscreen) settings section.
 *
 * - Web/PWA: only windowed vs fullscreen (browser Fullscreen API). Borderless
 *   is meaningless without OS window chrome, so it is hidden.
 * - Native (Tauri desktop): all three modes; chrome applied immediately.
 * - Capacitor Android: fullscreen maps to immersive/system fullscreen where
 *   available; borderless is also hidden (no OS window decorations).
 */
import { updateCurrentSettings } from "../../store";
import { isDisplayMode, type DisplayMode } from "../../types";
import { t } from "../../../i18n";
import { isNativeBuild } from "../../../auth/config";
import {
  makeChip,
  makeOptionsRow,
  makeSettingGroup,
  type SettingsSectionCtx,
} from "../widgets";

/** Desktop shell (Tauri) — only place borderless makes sense. */
const isDesktopShell = (): boolean => {
  if (!isNativeBuild()) return false;
  try {
    return (
      typeof window !== "undefined" &&
      !!(window as Window & { __TAURI_INTERNALS__?: unknown })
        .__TAURI_INTERNALS__
    );
  } catch {
    return false;
  }
};

const modesForPlatform = (): DisplayMode[] => {
  // Borderless = undecorated maximized window → desktop only.
  if (isDesktopShell()) return ["windowed", "borderless", "fullscreen"];
  // Web + Capacitor: windowed (default page) or fullscreen (Fullscreen API).
  return ["windowed", "fullscreen"];
};

const labelFor = (mode: DisplayMode): string => t(`settings.display.${mode}`);

export const appendDisplaySection = (
  panel: HTMLElement,
  ctx: SettingsSectionCtx,
): void => {
  const { settings } = ctx;
  const group = makeSettingGroup(t("settings.display.label"));
  const options = makeOptionsRow();
  const available = modesForPlatform();

  let current: DisplayMode = isDisplayMode(settings.displayMode)
    ? settings.displayMode
    : "windowed";
  // If a desktop-only mode was saved but we're on web/Android, fall back.
  if (!available.includes(current)) {
    current = "windowed";
    settings.displayMode = "windowed";
    updateCurrentSettings(settings);
  }

  const apply = (mode: DisplayMode) => {
    if (mode === current) return;
    settings.displayMode = mode;
    updateCurrentSettings(settings);
    if (isDesktopShell()) {
      void import("../../../native/shell").then(({ applyWindowDisplayMode }) =>
        applyWindowDisplayMode(mode),
      );
    } else if (mode === "fullscreen") {
      // Web / Android WebView: Fullscreen API needs a user gesture — this
      // chip click counts.
      void import("../../../ui/display").then(({ requestAppFullscreen }) =>
        requestAppFullscreen(),
      );
    } else if (mode === "windowed") {
      // Exit browser fullscreen if active.
      try {
        if (document.fullscreenElement) {
          void document.exitFullscreen();
        }
      } catch {
        /* ignore */
      }
    }
    ctx.refresh();
  };

  for (const mode of available) {
    options.appendChild(
      makeChip(labelFor(mode), mode === current, () => apply(mode)),
    );
  }

  const help = document.createElement("div");
  help.className = "setting-help";
  help.textContent =
    current === "windowed" && !isDesktopShell()
      ? t("settings.display.windowedWebHelp")
      : t(`settings.display.${current}Help`);

  group.appendChild(options);
  group.appendChild(help);
  panel.appendChild(group);
};
