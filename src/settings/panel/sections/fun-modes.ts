import type { ItemDropRate } from "../../types";
import {
  FUN_MODE_DEFS,
  PHYSICS_FUN_MODE_IDS,
  scaleItemLinkedFactor,
  type FunModeId,
} from "../../../fun/modes";
import { t } from "../../../i18n";
import {
  commitAndRefresh,
  makeOptionsRow,
  makeSettingGroup,
  type SettingsSectionCtx,
} from "../widgets";

export const appendFunModesSection = (
  panel: HTMLElement,
  ctx: SettingsSectionCtx,
): void => {
  const { settings } = ctx;
  if (!settings.funModes) {
    settings.funModes = FUN_MODE_DEFS.reduce(
      (acc, d) => {
        acc[d.id] = false;
        return acc;
      },
      {} as Record<FunModeId, boolean>,
    );
  }

  const group = makeSettingGroup(t("settings.fun.label"));
  const options = makeOptionsRow();
  options.style.flexDirection = "column";
  options.style.alignItems = "stretch";

  const chipRow = makeOptionsRow();
  const help = document.createElement("div");
  help.style.cssText = `
    margin-top:10px;padding:10px 12px;border-radius:8px;
    background:rgba(0,0,0,0.25);border:1px solid rgba(100,200,255,0.15);
    color:rgba(255,255,255,0.7);font-size:14px;line-height:1.65;min-height:3.4em;
    white-space:pre-wrap;
  `;
  help.textContent = t("settings.fun.help");

  const currentItemRate = (settings.itemDropRate ?? 10) as ItemDropRate;

  FUN_MODE_DEFS.forEach((def) => {
    const on = !!settings.funModes[def.id];
    const opt = document.createElement("div");
    opt.className = `setting-opt ${on ? "active" : ""}`;
    opt.title = t(`fun.${def.id}.description`);
    const shownFactor = def.itemLinked
      ? scaleItemLinkedFactor(def.scoreFactor, currentItemRate)
      : def.scoreFactor;
    const factorNote = def.itemLinked ? t("settings.fun.itemLinked") : "";
    opt.innerHTML = `<div style="font-size:15px;">${t(
      `fun.${def.id}.name`,
    )}</div>
      <div style="font-size:12px;opacity:0.65;margin-top:2px;">${t(
        `fun.${def.id}.subtitle`,
      )} · ×${shownFactor.toFixed(2)}${factorNote}</div>`;
    opt.onmouseenter = () => {
      help.textContent = t(`fun.${def.id}.description`);
    };
    opt.onclick = () => {
      const next = !settings.funModes[def.id];
      settings.funModes[def.id] = next;
      if (
        next &&
        (PHYSICS_FUN_MODE_IDS as readonly string[]).includes(def.id)
      ) {
        for (const other of PHYSICS_FUN_MODE_IDS) {
          if (other !== def.id) settings.funModes[other] = false;
        }
      }
      commitAndRefresh(ctx);
    };
    chipRow.appendChild(opt);
  });

  options.appendChild(chipRow);
  options.appendChild(help);
  group.appendChild(options);
  panel.appendChild(group);
};
