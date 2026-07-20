/**
 * Display mode (windowed / borderless / fullscreen) settings section.
 * Applies the window chrome immediately on Tauri desktop; browsers only
 * honour fullscreen via user-gesture Fullscreen API (borderless is a no-op
 * there, matching windowed).
 */
import { updateCurrentSettings } from "../../store";
import { DISPLAY_MODES, isDisplayMode, type DisplayMode } from "../../types";
import { t } from "../../../i18n";
import { isNativeBuild } from "../../../auth/config";
import {
  makeChip,
  makeOptionsRow,
  makeSettingGroup,
  type SettingsSectionCtx,
} from "../widgets";

const ORDER: DisplayMode[] = [...DISPLAY_MODES];

const labelFor = (mode: DisplayMode): string => t(`settings.display.${mode}`);

export const appendDisplaySection = (
  panel: HTMLElement,
  ctx: SettingsSectionCtx,
): void => {
  const { settings } = ctx;
  const group = makeSettingGroup(t("settings.display.label"));
  const options = makeOptionsRow();

  const current: DisplayMode = isDisplayMode(settings.displayMode)
    ? settings.displayMode
    : "windowed";

  const apply = (mode: DisplayMode) => {
    if (mode === current) return;
    settings.displayMode = mode;
    updateCurrentSettings(settings);
    // Apply chrome right away on native; on web this is a no-op except
    // fullscreen which requires a gesture — the game start will request it.
    if (isNativeBuild()) {
      void import("../../../native/shell").then(({ applyWindowDisplayMode }) =>
        applyWindowDisplayMode(mode),
      );
    } else if (mode === "fullscreen") {
      void import("../../../ui/display").then(({ requestAppFullscreen }) =>
        requestAppFullscreen(),
      );
    }
    ctx.refresh();
  };

  for (const mode of ORDER) {
    options.appendChild(
      makeChip(labelFor(mode), mode === current, () => apply(mode)),
    );
  }

  const help = document.createElement("div");
  help.className = "setting-help";
  help.textContent = t(`settings.display.${current}Help`);

  group.appendChild(options);
  group.appendChild(help);
  panel.appendChild(group);
};
