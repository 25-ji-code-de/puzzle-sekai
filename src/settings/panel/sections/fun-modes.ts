import type { ItemDropRate } from "../../types";
import {
  FUN_MODE_DEFS,
  PHYSICS_FUN_MODE_IDS,
  scaleItemLinkedFactor,
  type FunModeId,
} from "../../../fun/modes";
import { t, type MessageKey } from "../../../i18n";
import { formatTimesMult } from "../../../util/format";
import { settingOptClassName } from "../../../util/dialog-class";
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
  options.classList.add("setting-options--stack");

  const chipRow = makeOptionsRow();
  const help = document.createElement("div");
  help.className = "setting-help";
  help.textContent = t("settings.fun.help");

  const currentItemRate = (settings.itemDropRate ?? 10) as ItemDropRate;

  FUN_MODE_DEFS.forEach((def) => {
    const on = !!settings.funModes[def.id];
    const opt = document.createElement("div");
    opt.className = settingOptClassName(on);
    opt.title = t(`fun.${def.id}.description` as MessageKey);
    const shownFactor = def.itemLinked
      ? scaleItemLinkedFactor(def.scoreFactor, currentItemRate)
      : def.scoreFactor;
    const factorNote = def.itemLinked ? t("settings.fun.itemLinked") : "";
    opt.innerHTML = `<div>${t(`fun.${def.id}.name` as MessageKey)}</div>
      <div class="setting-opt-sub">${t(
        `fun.${def.id}.subtitle` as MessageKey,
      )} · ${formatTimesMult(shownFactor)}${factorNote}</div>`;
    opt.onmouseenter = () => {
      help.textContent = t(`fun.${def.id}.description` as MessageKey);
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
      if (next && def.id === "truePhysics") {
        void import("../../../board/dynamics").then((m) => m.warmRapier());
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
