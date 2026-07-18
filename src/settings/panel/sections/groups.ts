import { GAME_GROUPS, GROUP_LABELS, getGroupColor } from "../../types";
import { t } from "../../../i18n";
import {
  commitAndRefresh,
  makeChip,
  makeOptionsRow,
  makeSettingGroup,
  type SettingsSectionCtx,
} from "../widgets";

export const appendGroupsSection = (
  panel: HTMLElement,
  ctx: SettingsSectionCtx,
): void => {
  const group = makeSettingGroup(t("settings.groups.label"));
  const options = makeOptionsRow();
  GAME_GROUPS.forEach((unit) => {
    const isSelected = ctx.settings.selectedGroups.includes(unit);
    const color = getGroupColor(unit);
    const chip = makeChip(
      GROUP_LABELS[unit],
      isSelected,
      () => {
        const idx = ctx.settings.selectedGroups.indexOf(unit);
        if (idx >= 0) {
          if (ctx.settings.selectedGroups.length > 3) {
            ctx.settings.selectedGroups.splice(idx, 1);
          }
        } else if (ctx.settings.selectedGroups.length < 5) {
          ctx.settings.selectedGroups.push(unit);
        }
        commitAndRefresh(ctx);
      },
      { className: "group-opt", title: unit },
    );
    chip.style.setProperty("--group-color", color);
    options.appendChild(chip);
  });
  group.appendChild(options);
  panel.appendChild(group);
};
