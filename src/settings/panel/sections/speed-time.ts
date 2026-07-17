import type { SpeedLevel, TimeAttackDuration } from "../../types";
import { getSpeedLabel, getTimeLabel } from "../../difficulty";
import { t } from "../../../i18n";
import {
  commitAndRefresh,
  makeChip,
  makeOptionsRow,
  makeSettingGroup,
  type SettingsSectionCtx,
} from "../widgets";

export const appendSpeedSection = (
  panel: HTMLElement,
  ctx: SettingsSectionCtx,
): void => {
  const group = makeSettingGroup(t("settings.speed.label"));
  const options = makeOptionsRow();
  for (let i = 1; i <= 5; i++) {
    const level = i as SpeedLevel;
    options.appendChild(
      makeChip(getSpeedLabel(level), level === ctx.settings.speedLevel, () =>
        commitAndRefresh(ctx, () => {
          ctx.settings.speedLevel = level;
        }),
      ),
    );
  }
  group.appendChild(options);
  panel.appendChild(group);
};

export const appendTimeAttackSection = (
  panel: HTMLElement,
  ctx: SettingsSectionCtx,
): void => {
  const group = makeSettingGroup(t("settings.ta.label"));
  const options = makeOptionsRow();
  ([60, 90, 120, 180] as TimeAttackDuration[]).forEach((duration) => {
    options.appendChild(
      makeChip(
        getTimeLabel(duration),
        duration === ctx.settings.timeAttackDuration,
        () =>
          commitAndRefresh(ctx, () => {
            ctx.settings.timeAttackDuration = duration;
          }),
      ),
    );
  });
  group.appendChild(options);
  panel.appendChild(group);
};
