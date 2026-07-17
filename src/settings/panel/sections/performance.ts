/**
 * Display / performance settings (render resolution, etc.).
 */
import { updateCurrentSettings } from "../../store";
import { t } from "../../../i18n";
import {
  makeChip,
  makeOptionsRow,
  makeSettingGroup,
  type SettingsSectionCtx,
} from "../widgets";

export const appendPerformanceSection = (
  panel: HTMLElement,
  ctx: SettingsSectionCtx,
): void => {
  const { settings } = ctx;
  const group = makeSettingGroup(t("settings.performance.label"));
  const options = makeOptionsRow();

  const low = !!settings.lowPerformance;

  options.appendChild(
    makeChip(t("settings.performance.normal"), !low, () => {
      if (!settings.lowPerformance) return;
      settings.lowPerformance = false;
      // store → applyPerformanceMode (keeps renderer in sync)
      updateCurrentSettings(settings);
      ctx.refresh();
    }),
  );
  options.appendChild(
    makeChip(t("settings.performance.low"), low, () => {
      if (settings.lowPerformance) return;
      settings.lowPerformance = true;
      updateCurrentSettings(settings);
      ctx.refresh();
    }),
  );

  const help = document.createElement("div");
  help.className = "setting-help";
  help.textContent = low
    ? t("settings.performance.lowHelp")
    : t("settings.performance.normalHelp");

  group.appendChild(options);
  group.appendChild(help);
  panel.appendChild(group);
};
