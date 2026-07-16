import { clampVolumePercent } from "../../volume";
import { updateCurrentSettings } from "../../store";
import { t, type MessageKey } from "../../../i18n";
import {
  applyBgmVolume,
  playSfxPreview,
  playVoicePreview,
} from "../../../audio/bgm";
import { makeSettingGroup, type SettingsSectionCtx } from "../widgets";

export const appendAudioSection = (
  panel: HTMLElement,
  ctx: SettingsSectionCtx,
): void => {
  const { settings } = ctx;
  const group = makeSettingGroup(t("settings.audio.label"));

  type VolKey = "bgmVolume" | "sfxVolume" | "voiceVolume";
  const volRows: { key: VolKey; labelKey: MessageKey }[] = [
    { key: "bgmVolume", labelKey: "settings.audio.bgm" },
    { key: "sfxVolume", labelKey: "settings.audio.sfx" },
    { key: "voiceVolume", labelKey: "settings.audio.voice" },
  ];

  let sfxPreviewAt = 0;
  let voicePreviewAt = 0;
  const PREVIEW_GAP_MS = 140;

  volRows.forEach(({ key, labelKey }) => {
    const row = document.createElement("div");
    row.className = "vol-row";

    const name = document.createElement("div");
    name.className = "vol-name";
    name.textContent = t(labelKey);

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "100";
    slider.step = "1";
    slider.className = "vol-slider";
    slider.value = String(clampVolumePercent(settings[key]));
    slider.setAttribute("aria-label", t(labelKey));

    const value = document.createElement("div");
    value.className = "vol-value";
    value.textContent = `${slider.value}%`;

    const playPreview = (force: boolean) => {
      const now = performance.now();
      if (key === "sfxVolume") {
        if (force || now - sfxPreviewAt >= PREVIEW_GAP_MS) {
          sfxPreviewAt = now;
          playSfxPreview();
        }
      } else if (key === "voiceVolume") {
        if (force || now - voicePreviewAt >= PREVIEW_GAP_MS) {
          voicePreviewAt = now;
          playVoicePreview();
        }
      }
    };

    const commit = (
      raw: string,
      opts: { preview?: boolean; force?: boolean } = {},
    ) => {
      const next = clampVolumePercent(Number(raw));
      settings[key] = next;
      slider.value = String(next);
      value.textContent = `${next}%`;
      updateCurrentSettings(settings);
      if (key === "bgmVolume") applyBgmVolume();
      if (opts.preview) playPreview(!!opts.force);
    };
    slider.oninput = () => commit(slider.value, { preview: true });
    slider.onchange = () =>
      commit(slider.value, { preview: true, force: true });

    row.appendChild(name);
    row.appendChild(slider);
    row.appendChild(value);
    group.appendChild(row);
  });
  panel.appendChild(group);
};
