import type { ItemDropRate, SpawnOrientation } from "../../types";
import {
  ITEM_DROP_RATES,
  ITEM_DROP_SCORE_FACTORS,
  SPAWN_ORIENTATIONS,
  SPAWN_ORIENTATION_SCORE_FACTORS,
} from "../../types";
import { getItemDropLabel } from "../../difficulty";
import { t } from "../../../i18n";
import {
  commitAndRefresh,
  makeChip,
  makeOptionsRow,
  makeSettingGroup,
  type SettingsSectionCtx,
} from "../widgets";

export const appendItemDropSection = (
  panel: HTMLElement,
  ctx: SettingsSectionCtx,
): void => {
  const group = makeSettingGroup(t("settings.item.label"));
  const options = makeOptionsRow();
  const currentItemRate = (ctx.settings.itemDropRate ?? 10) as ItemDropRate;
  ITEM_DROP_RATES.forEach((rate) => {
    options.appendChild(
      makeChip(
        getItemDropLabel(rate),
        rate === currentItemRate,
        () =>
          commitAndRefresh(ctx, () => {
            ctx.settings.itemDropRate = rate;
          }),
        {
          title: t("settings.item.tooltip", {
            factor: ITEM_DROP_SCORE_FACTORS[rate].toFixed(2),
          }),
          html: `<div>${getItemDropLabel(rate)}</div>
      <div style="font-size:12px;opacity:0.65;margin-top:2px;">×${ITEM_DROP_SCORE_FACTORS[
        rate
      ].toFixed(2)}</div>`,
        },
      ),
    );
  });
  group.appendChild(options);
  panel.appendChild(group);
};

export const appendOrientationSection = (
  panel: HTMLElement,
  ctx: SettingsSectionCtx,
): void => {
  const group = makeSettingGroup(t("settings.orientation.label"));
  const options = makeOptionsRow();
  const currentOrient = (ctx.settings.spawnOrientation ??
    "inverted") as SpawnOrientation;
  SPAWN_ORIENTATIONS.forEach((orient) => {
    options.appendChild(
      makeChip(
        t(`settings.orientation.${orient}`),
        orient === currentOrient,
        () =>
          commitAndRefresh(ctx, () => {
            ctx.settings.spawnOrientation = orient;
          }),
        {
          title: t(`settings.orientation.${orient}Help`),
          html: `<div>${t(`settings.orientation.${orient}`)}</div>
      <div style="font-size:12px;opacity:0.65;margin-top:2px;">×${SPAWN_ORIENTATION_SCORE_FACTORS[
        orient
      ].toFixed(2)}</div>`,
        },
      ),
    );
  });
  group.appendChild(options);
  const help = document.createElement("div");
  help.style.cssText = `
    margin-top:8px;font-size:13px;line-height:1.5;color:rgba(255,255,255,0.55);
  `;
  help.textContent = t(`settings.orientation.${currentOrient}Help`);
  group.appendChild(help);
  panel.appendChild(group);
};
