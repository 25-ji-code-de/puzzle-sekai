/**
 * Small DOM helpers shared by settings panel sections.
 * Visual styles: styles/_settings-panel.scss
 */
import type { GameSettings } from "../types";
import { updateCurrentSettings } from "../store";

export type SettingsSectionCtx = {
  settings: GameSettings;
  refresh: () => void;
};

export const makeSettingGroup = (label: string): HTMLDivElement => {
  const group = document.createElement("div");
  group.className = "setting-group";
  const lab = document.createElement("div");
  lab.className = "setting-label";
  lab.textContent = label;
  group.appendChild(lab);
  return group;
};

export const makeOptionsRow = (): HTMLDivElement => {
  const row = document.createElement("div");
  row.className = "setting-options";
  return row;
};

export const makeChip = (
  label: string,
  active: boolean,
  onClick: () => void,
  opts?: {
    className?: string;
    title?: string;
    html?: string;
    subtitle?: string;
  },
): HTMLDivElement => {
  const opt = document.createElement("div");
  opt.className = `setting-opt ${opts?.className ?? ""} ${
    active ? "active" : ""
  }`.trim();
  if (opts?.title) opt.title = opts.title;
  if (opts?.html) {
    opt.innerHTML = opts.html;
  } else if (opts?.subtitle) {
    const main = document.createElement("div");
    main.textContent = label;
    const sub = document.createElement("div");
    sub.className = "setting-opt-sub";
    sub.textContent = opts.subtitle;
    opt.appendChild(main);
    opt.appendChild(sub);
  } else {
    opt.textContent = label;
  }
  opt.onclick = onClick;
  return opt;
};

/** Commit a mutation on the live settings object and rebuild the panel. */
export const commitAndRefresh = (
  ctx: SettingsSectionCtx,
  mutate?: () => void,
) => {
  mutate?.();
  updateCurrentSettings(ctx.settings);
  // Incremental play-pack warm when groups / mikudayo (etc.) change.
  void import("../../assets/play-pack").then((m) => {
    void m.ensurePlayPack();
  });
  ctx.refresh();
};

export const makeDangerButton = (label: string): HTMLButtonElement => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "setting-opt setting-danger";
  btn.textContent = label;
  return btn;
};
