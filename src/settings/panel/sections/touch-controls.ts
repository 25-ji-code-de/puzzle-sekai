/**
 * Touch control mode settings (stick / gesture / drag / zones).
 */
import { updateCurrentSettings } from "../../store";
import {
  isTouchControlMode,
  TOUCH_CONTROL_MODES,
  type TouchControlMode,
} from "../../types";
import { t } from "../../../i18n";
import {
  makeChip,
  makeOptionsRow,
  makeSettingGroup,
  type SettingsSectionCtx,
} from "../widgets";

const labelFor = (mode: TouchControlMode): string =>
  t(`settings.touchControl.${mode}`);

const helpFor = (mode: TouchControlMode): string =>
  t(`settings.touchControl.${mode}Help`);

export const appendTouchControlSection = (
  panel: HTMLElement,
  ctx: SettingsSectionCtx,
): void => {
  const { settings } = ctx;
  const group = makeSettingGroup(t("settings.touchControl.label"));
  const options = makeOptionsRow();

  const current: TouchControlMode = isTouchControlMode(
    settings.touchControlMode,
  )
    ? settings.touchControlMode
    : "stick";

  const apply = (mode: TouchControlMode) => {
    if (mode === current) return;
    settings.touchControlMode = mode;
    updateCurrentSettings(settings);
    ctx.refresh();
  };

  for (const mode of TOUCH_CONTROL_MODES) {
    options.appendChild(
      makeChip(labelFor(mode), mode === current, () => apply(mode)),
    );
  }

  const help = document.createElement("div");
  help.className = "setting-help";
  help.textContent = `${helpFor(current)} · ${t("settings.touchControl.nextPieceHint")}`;

  group.appendChild(options);
  group.appendChild(help);
  panel.appendChild(group);
};
