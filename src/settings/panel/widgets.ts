/**
 * Small DOM helpers shared by settings panel sections.
 */
import type { GameSettings } from "../types";
import { updateCurrentSettings } from "../store";
import { domFontStyle } from "../../ui/fonts";

export type SettingsSectionCtx = {
  settings: GameSettings;
  refresh: () => void;
};

export const makeSettingGroup = (label: string): HTMLDivElement => {
  const group = document.createElement("div");
  group.className = "setting-group";
  group.innerHTML = `<div class="setting-label">${label}</div>`;
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
  opts?: { className?: string; title?: string; html?: string },
): HTMLDivElement => {
  const opt = document.createElement("div");
  opt.className = `setting-opt ${opts?.className ?? ""} ${
    active ? "active" : ""
  }`.trim();
  if (opts?.title) opt.title = opts.title;
  if (opts?.html) opt.innerHTML = opts.html;
  else opt.textContent = label;
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
  ctx.refresh();
};

export const makeDangerButton = (label: string): HTMLButtonElement => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "setting-opt";
  btn.textContent = label;
  btn.style.cssText = `
    width:100%;text-align:center;cursor:pointer;${domFontStyle("body")}
    background:rgba(255,80,100,0.12);border:1px solid rgba(255,100,120,0.35);
    color:rgba(255,200,210,0.95);
  `;
  btn.onmouseenter = () => {
    btn.style.background = "rgba(255,80,100,0.22)";
  };
  btn.onmouseleave = () => {
    btn.style.background = "rgba(255,80,100,0.12)";
  };
  return btn;
};
