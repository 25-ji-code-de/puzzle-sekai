import {
  SpeedLevel,
  TimeAttackDuration,
  ItemDropRate,
  SpawnOrientation,
  GAME_GROUPS,
  GROUP_LABELS,
  getSpeedLabel,
  getTimeLabel,
  ITEM_DROP_RATES,
  getItemDropLabel,
  ITEM_DROP_SCORE_FACTORS,
  SPAWN_ORIENTATIONS,
  SPAWN_ORIENTATION_SCORE_FACTORS,
  getCurrentSettings,
  updateCurrentSettings,
  getDifficultyLevel,
  getScoreMultiplierBreakdown,
  isEntertainmentMode,
  clearAppData,
  clearAppCaches,
  clampVolumePercent,
} from "./settings";
import {
  FUN_MODE_DEFS,
  FunModeId,
  PHYSICS_FUN_MODE_IDS,
  scaleItemLinkedFactor,
} from "./fun-modes";
import {
  t,
  setLocale,
  SUPPORTED_LOCALES,
  getLocale,
  Locale,
} from "./i18n";
import { domFontStyle } from "./fonts";
import { diffColorStyle } from "./menu-utils";
import { applyBgmVolume, playSfxPreview, playVoicePreview } from "./bgm";

export interface SettingsPanelOptions {
  /** Called after the panel finishes its close animation and is removed. */
  onClosed?: () => void;
}

let settingsContainer: HTMLDivElement | null = null;
let onClosedCallback: (() => void) | null = null;

/** Immediately tear down the panel (no animation). Used on locale rebuild. */
export const disposeSettingsPanel = () => {
  settingsContainer?.remove();
  settingsContainer = null;
  onClosedCallback = null;
};

export const closeSettingsPanel = () => {
  if (!settingsContainer) return;

  const settingsPanel = settingsContainer.querySelector(
    "div:nth-child(2)",
  ) as HTMLElement | null;
  if (settingsPanel) {
    settingsPanel.style.animation = "slideOut 0.3s ease forwards";
  }
  setTimeout(() => {
    settingsContainer?.remove();
    settingsContainer = null;
    const cb = onClosedCallback;
    onClosedCallback = null;
    cb?.();
  }, 300);
};

const refreshSettingsPanel = () => {
  if (!settingsContainer) return;
  const opts: SettingsPanelOptions = {
    onClosed: onClosedCallback ?? undefined,
  };
  settingsContainer.remove();
  settingsContainer = null;
  // Keep the callback across rebuilds
  onClosedCallback = opts.onClosed ?? null;
  showSettingsPanel(opts);
};

export const showSettingsPanel = (options: SettingsPanelOptions = {}) => {
  if (settingsContainer) return;

  onClosedCallback = options.onClosed ?? null;
  const settings = getCurrentSettings();

  settingsContainer = document.createElement("div");
  settingsContainer.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;
    display:flex;justify-content:flex-end;
  `;

  const backdrop = document.createElement("div");
  backdrop.style.cssText = `
    position:absolute;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.5);
  `;
  backdrop.onclick = () => closeSettingsPanel();
  settingsContainer.appendChild(backdrop);

  const settingsPanel = document.createElement("div");
  settingsPanel.style.cssText = `
    position:relative;width:320px;height:100%;
    background:rgba(15,20,40,0.95);border-left:1px solid rgba(100,200,255,0.2);
    box-shadow:-10px 0 40px rgba(0,0,0,0.5);
    padding:24px;overflow-y:auto;
    animation:slideIn 0.3s ease;
  `;

  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    @keyframes slideOut {
      from { transform: translateX(0); }
      to { transform: translateX(100%); }
    }
    .setting-group { margin-bottom:24px; }
    .setting-label {
      font-size:15px;color:rgba(180,220,255,0.8);margin-bottom:10px;
      letter-spacing:1px;
    }
    .setting-options { display:flex;gap:6px;flex-wrap:wrap; }
    .setting-opt {
      padding:9px 13px;border-radius:6px;font-size:15px;cursor:pointer;
      background:rgba(100,200,255,0.1);border:1px solid rgba(100,200,255,0.2);
      color:rgba(255,255,255,0.7);transition:all 0.2s ease;
      ${domFontStyle("body")}
    }
    .setting-opt:hover { background:rgba(100,200,255,0.2); }
    .setting-opt.active {
      background:rgba(100,200,255,0.3);border-color:rgba(100,200,255,0.8);
      color:#fff;
    }
    .setting-opt.group-opt {
      flex:1;min-width:80px;text-align:center;
    }
    .setting-opt.group-opt.active {
      background:rgba(100,200,255,0.4);border-color:#4488ff;
    }
  `;
  settingsPanel.appendChild(style);

  const header = document.createElement("div");
  header.style.cssText = `
    display:flex;justify-content:space-between;align-items:center;
    margin-bottom:24px;padding-bottom:16px;
    border-bottom:1px solid rgba(100,200,255,0.1);
  `;
  header.innerHTML = `
    <div style="font-size:20px;color:#fff;letter-spacing:1px;${domFontStyle(
      "heading",
    )}">${t("settings.title")}</div>
  `;

  const closeBtn = document.createElement("button");
  closeBtn.style.cssText = `
    width:32px;height:32px;border:none;border-radius:6px;
    background:rgba(255,255,255,0.1);color:#fff;font-size:18px;
    cursor:pointer;transition:all 0.2s ease;
  `;
  closeBtn.textContent = "✕";
  closeBtn.onmouseenter = () =>
    (closeBtn.style.background = "rgba(255,255,255,0.2)");
  closeBtn.onmouseleave = () =>
    (closeBtn.style.background = "rgba(255,255,255,0.1)");
  closeBtn.onclick = () => closeSettingsPanel();
  header.appendChild(closeBtn);
  settingsPanel.appendChild(header);

  // Language
  const langGroup = document.createElement("div");
  langGroup.className = "setting-group";
  langGroup.innerHTML = `<div class="setting-label">${t(
    "settings.lang.label",
  )}</div>`;
  const langOptions = document.createElement("div");
  langOptions.className = "setting-options";
  const currentLocale = getLocale();
  SUPPORTED_LOCALES.forEach(({ value, label }) => {
    const opt = document.createElement("div");
    opt.className = `setting-opt ${value === currentLocale ? "active" : ""}`;
    opt.textContent = label;
    opt.onclick = () => {
      setLocale(value as Locale);
      refreshSettingsPanel();
    };
    langOptions.appendChild(opt);
  });
  langGroup.appendChild(langOptions);
  settingsPanel.appendChild(langGroup);

  // Audio volumes (BGM / SFX / voice)
  const audioGroup = document.createElement("div");
  audioGroup.className = "setting-group";
  audioGroup.innerHTML = `<div class="setting-label">${t(
    "settings.audio.label",
  )}</div>`;

  const audioStyle = document.createElement("style");
  audioStyle.textContent = `
    .vol-row {
      display:flex;align-items:center;gap:10px;margin-bottom:10px;
    }
    .vol-name {
      width:72px;flex-shrink:0;font-size:14px;color:rgba(255,255,255,0.75);
    }
    .vol-slider {
      flex:1;-webkit-appearance:none;appearance:none;height:6px;border-radius:3px;
      background:rgba(100,200,255,0.2);outline:none;cursor:pointer;
    }
    .vol-slider::-webkit-slider-thumb {
      -webkit-appearance:none;appearance:none;width:16px;height:16px;border-radius:50%;
      background:#8ec8ff;border:1px solid rgba(255,255,255,0.5);cursor:pointer;
    }
    .vol-slider::-moz-range-thumb {
      width:16px;height:16px;border-radius:50%;
      background:#8ec8ff;border:1px solid rgba(255,255,255,0.5);cursor:pointer;
    }
    .vol-value {
      width:40px;text-align:right;font-size:13px;color:rgba(170,204,255,0.9);
      font-variant-numeric:tabular-nums;
    }
  `;
  audioGroup.appendChild(audioStyle);

  type VolKey = "bgmVolume" | "sfxVolume" | "voiceVolume";
  const volRows: { key: VolKey; labelKey: string }[] = [
    { key: "bgmVolume", labelKey: "settings.audio.bgm" },
    { key: "sfxVolume", labelKey: "settings.audio.sfx" },
    { key: "voiceVolume", labelKey: "settings.audio.voice" },
  ];

  // Throttle preview SFX/voice while dragging so we don't spam every pixel.
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

    const commit = (raw: string, opts: { preview?: boolean; force?: boolean } = {}) => {
      const next = clampVolumePercent(Number(raw));
      settings[key] = next;
      slider.value = String(next);
      value.textContent = `${next}%`;
      updateCurrentSettings(settings);
      if (key === "bgmVolume") applyBgmVolume();
      if (opts.preview) playPreview(!!opts.force);
    };
    // Continuous drag: live value + throttled preview
    slider.oninput = () => commit(slider.value, { preview: true });
    // Pointer/keyboard release: always play once at the final level
    slider.onchange = () => commit(slider.value, { preview: true, force: true });

    row.appendChild(name);
    row.appendChild(slider);
    row.appendChild(value);
    audioGroup.appendChild(row);
  });
  settingsPanel.appendChild(audioGroup);

  // Speed
  const speedGroup = document.createElement("div");
  speedGroup.className = "setting-group";
  speedGroup.innerHTML = `<div class="setting-label">${t(
    "settings.speed.label",
  )}</div>`;
  const speedOptions = document.createElement("div");
  speedOptions.className = "setting-options";
  for (let i = 1; i <= 5; i++) {
    const level = i as SpeedLevel;
    const opt = document.createElement("div");
    opt.className = `setting-opt ${
      level === settings.speedLevel ? "active" : ""
    }`;
    opt.textContent = getSpeedLabel(level);
    opt.onclick = () => {
      settings.speedLevel = level;
      updateCurrentSettings(settings);
      refreshSettingsPanel();
    };
    speedOptions.appendChild(opt);
  }
  speedGroup.appendChild(speedOptions);
  settingsPanel.appendChild(speedGroup);

  // Time attack duration
  const timeGroup = document.createElement("div");
  timeGroup.className = "setting-group";
  timeGroup.innerHTML = `<div class="setting-label">${t(
    "settings.ta.label",
  )}</div>`;
  const timeOptions = document.createElement("div");
  timeOptions.className = "setting-options";
  ([60, 90, 120, 180] as TimeAttackDuration[]).forEach((duration) => {
    const opt = document.createElement("div");
    opt.className = `setting-opt ${
      duration === settings.timeAttackDuration ? "active" : ""
    }`;
    opt.textContent = getTimeLabel(duration);
    opt.onclick = () => {
      settings.timeAttackDuration = duration;
      updateCurrentSettings(settings);
      refreshSettingsPanel();
    };
    timeOptions.appendChild(opt);
  });
  timeGroup.appendChild(timeOptions);
  settingsPanel.appendChild(timeGroup);

  // Groups
  const groupGroup = document.createElement("div");
  groupGroup.className = "setting-group";
  groupGroup.innerHTML = `<div class="setting-label">${t(
    "settings.groups.label",
  )}</div>`;
  const groupOptions = document.createElement("div");
  groupOptions.className = "setting-options";
  GAME_GROUPS.forEach((group) => {
    const isSelected = settings.selectedGroups.includes(group);
    const opt = document.createElement("div");
    opt.className = `setting-opt group-opt ${isSelected ? "active" : ""}`;
    opt.textContent = GROUP_LABELS[group];
    opt.onclick = () => {
      const idx = settings.selectedGroups.indexOf(group);
      if (idx >= 0) {
        if (settings.selectedGroups.length > 3) {
          settings.selectedGroups.splice(idx, 1);
        }
      } else {
        if (settings.selectedGroups.length < 5) {
          settings.selectedGroups.push(group);
        }
      }
      updateCurrentSettings(settings);
      refreshSettingsPanel();
    };
    groupOptions.appendChild(opt);
  });
  groupGroup.appendChild(groupOptions);
  settingsPanel.appendChild(groupGroup);

  // Item drop rate
  const itemGroup = document.createElement("div");
  itemGroup.className = "setting-group";
  itemGroup.innerHTML = `<div class="setting-label">${t(
    "settings.item.label",
  )}</div>`;
  const itemOptions = document.createElement("div");
  itemOptions.className = "setting-options";
  const currentItemRate = (settings.itemDropRate ?? 10) as ItemDropRate;
  ITEM_DROP_RATES.forEach((rate) => {
    const opt = document.createElement("div");
    opt.className = `setting-opt ${rate === currentItemRate ? "active" : ""}`;
    opt.title = t("settings.item.tooltip", {
      factor: ITEM_DROP_SCORE_FACTORS[rate].toFixed(2),
    });
    opt.innerHTML = `<div>${getItemDropLabel(rate)}</div>
      <div style="font-size:12px;opacity:0.65;margin-top:2px;">×${ITEM_DROP_SCORE_FACTORS[
        rate
      ].toFixed(2)}</div>`;
    opt.onclick = () => {
      settings.itemDropRate = rate;
      updateCurrentSettings(settings);
      refreshSettingsPanel();
    };
    itemOptions.appendChild(opt);
  });
  itemGroup.appendChild(itemOptions);
  settingsPanel.appendChild(itemGroup);

  // Spawn orientation (head-down / head-up while falling)
  const orientGroup = document.createElement("div");
  orientGroup.className = "setting-group";
  orientGroup.innerHTML = `<div class="setting-label">${t(
    "settings.orientation.label",
  )}</div>`;
  const orientOptions = document.createElement("div");
  orientOptions.className = "setting-options";
  const currentOrient = (settings.spawnOrientation ??
    "inverted") as SpawnOrientation;
  SPAWN_ORIENTATIONS.forEach((orient) => {
    const opt = document.createElement("div");
    opt.className = `setting-opt ${orient === currentOrient ? "active" : ""}`;
    opt.title = t(`settings.orientation.${orient}Help`);
    opt.innerHTML = `<div>${t(`settings.orientation.${orient}`)}</div>
      <div style="font-size:12px;opacity:0.65;margin-top:2px;">×${SPAWN_ORIENTATION_SCORE_FACTORS[
        orient
      ].toFixed(2)}</div>`;
    opt.onclick = () => {
      settings.spawnOrientation = orient;
      updateCurrentSettings(settings);
      refreshSettingsPanel();
    };
    orientOptions.appendChild(opt);
  });
  orientGroup.appendChild(orientOptions);
  const orientHelp = document.createElement("div");
  orientHelp.style.cssText = `
    margin-top:8px;font-size:13px;line-height:1.5;color:rgba(255,255,255,0.55);
  `;
  orientHelp.textContent = t(`settings.orientation.${currentOrient}Help`);
  orientGroup.appendChild(orientHelp);
  settingsPanel.appendChild(orientGroup);

  // Fun modes
  if (!settings.funModes) {
    settings.funModes = FUN_MODE_DEFS.reduce((acc, d) => {
      acc[d.id] = false;
      return acc;
    }, {} as Record<FunModeId, boolean>);
  }

  const funGroup = document.createElement("div");
  funGroup.className = "setting-group";
  funGroup.innerHTML = `<div class="setting-label">${t(
    "settings.fun.label",
  )}</div>`;

  const funOptions = document.createElement("div");
  funOptions.className = "setting-options";
  funOptions.style.flexDirection = "column";
  funOptions.style.alignItems = "stretch";

  const funChipRow = document.createElement("div");
  funChipRow.className = "setting-options";

  const funHelp = document.createElement("div");
  funHelp.style.cssText = `
    margin-top:10px;padding:10px 12px;border-radius:8px;
    background:rgba(0,0,0,0.25);border:1px solid rgba(100,200,255,0.15);
    color:rgba(255,255,255,0.7);font-size:14px;line-height:1.65;min-height:3.4em;
    white-space:pre-wrap;
  `;
  funHelp.textContent = t("settings.fun.help");

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
      funHelp.textContent = t(`fun.${def.id}.description`);
    };
    opt.onclick = () => {
      const next = !settings.funModes[def.id];
      settings.funModes[def.id] = next;
      // Physics engines are mutually exclusive
      if (
        next &&
        (PHYSICS_FUN_MODE_IDS as readonly string[]).includes(def.id)
      ) {
        for (const other of PHYSICS_FUN_MODE_IDS) {
          if (other !== def.id) settings.funModes[other] = false;
        }
      }
      updateCurrentSettings(settings);
      refreshSettingsPanel();
    };
    funChipRow.appendChild(opt);
  });

  funOptions.appendChild(funChipRow);
  funOptions.appendChild(funHelp);
  funGroup.appendChild(funOptions);
  settingsPanel.appendChild(funGroup);

  // Difficulty summary
  const diffSummary = document.createElement("div");
  diffSummary.className = "setting-group";
  const breakdown = getScoreMultiplierBreakdown(settings);
  const mult = breakdown.final;
  const label = breakdown.difficultyLabel;
  const diffLevel = getDifficultyLevel(settings);
  const entOn = isEntertainmentMode(settings);

  const linesHtml = breakdown.lines
    .map(
      (line) =>
        `<div style="display:flex;justify-content:space-between;gap:12px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="color:rgba(255,255,255,0.75);">${line.label}</span>
          <span style="${domFontStyle(
            "numeric",
          )}color:#aaccff;white-space:nowrap;">×${line.factor.toFixed(2)}</span>
        </div>`,
    )
    .join("");

  const card = document.createElement("div");
  card.style.cssText = `
    position:relative;padding:12px 14px;border-radius:8px;
    background:rgba(100,200,255,0.12);border:1px solid rgba(100,200,255,0.25);
    color:#fff;font-size:15px;line-height:1.65;cursor:help;
  `;
  card.innerHTML = `
    <div><span style="${diffColorStyle(diffLevel)}">${label}</span>${
    entOn
      ? ` <span style="color:#ffcc66;">${t(
          "settings.difficulty.entertainment",
        )}</span>`
      : ""
  }</div>
    <div style="color:#aaccff;">
      <span style="${domFontStyle("numeric")}">×${mult.toFixed(2)}</span>
      <span style="font-size:13px;opacity:0.55;margin-left:6px;${domFontStyle(
        "body",
      )}">${t("settings.difficulty.info")}</span>
    </div>
  `;

  const tip = document.createElement("div");
  tip.style.cssText = `
    display:none;position:absolute;left:0;right:0;bottom:calc(100% + 8px);z-index:20;
    padding:12px 14px;border-radius:10px;
    background:rgba(12,16,32,0.97);border:1px solid rgba(100,200,255,0.35);
    box-shadow:0 8px 28px rgba(0,0,0,0.45);font-size:14px;line-height:1.5;
  `;
  tip.innerHTML = `
    <div style="font-size:13px;color:rgba(180,220,255,0.8);letter-spacing:1px;margin-bottom:8px;">${t(
      "settings.difficulty.breakdownTitle",
    )}</div>
    ${linesHtml}
    <div style="display:flex;justify-content:space-between;gap:12px;padding-top:8px;margin-top:4px;border-top:1px solid rgba(100,200,255,0.25);font-weight:600;">
      <span>${t("settings.difficulty.total")}</span>
      <span style="${domFontStyle("numeric")}color:#fff;">×${mult.toFixed(
    2,
  )}</span>
    </div>
  `;
  card.appendChild(tip);
  card.onmouseenter = () => {
    tip.style.display = "block";
  };
  card.onmouseleave = () => {
    tip.style.display = "none";
  };
  card.onclick = (e) => {
    e.stopPropagation();
    tip.style.display = tip.style.display === "block" ? "none" : "block";
  };

  diffSummary.innerHTML = `<div class="setting-label">${t(
    "settings.difficulty.label",
  )}</div>`;
  diffSummary.appendChild(card);
  settingsPanel.appendChild(diffSummary);

  // Data / cache
  const dataGroup = document.createElement("div");
  dataGroup.className = "setting-group";
  dataGroup.innerHTML = `<div class="setting-label">${t(
    "settings.data.label",
  )}</div>`;
  const dataOptions = document.createElement("div");
  dataOptions.className = "setting-options";
  dataOptions.style.flexDirection = "column";
  dataOptions.style.alignItems = "stretch";

  const dataStatus = document.createElement("div");
  dataStatus.style.cssText = `
    margin-top:8px;min-height:1.4em;font-size:13px;line-height:1.4;
    color:rgba(180,220,255,0.75);
  `;

  const makeDangerBtn = (label: string) => {
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

  const clearCacheBtn = makeDangerBtn(t("settings.data.clearCache"));
  clearCacheBtn.onclick = async () => {
    if (!window.confirm(t("settings.data.clearCacheConfirm"))) return;
    clearCacheBtn.disabled = true;
    clearDataBtn.disabled = true;
    dataStatus.textContent = t("settings.data.working");
    try {
      await clearAppCaches();
      dataStatus.textContent = t("settings.data.clearCacheDone");
    } catch {
      dataStatus.textContent = t("settings.data.clearFailed");
    } finally {
      clearCacheBtn.disabled = false;
      clearDataBtn.disabled = false;
    }
  };

  const clearDataBtn = makeDangerBtn(t("settings.data.clearData"));
  clearDataBtn.onclick = () => {
    if (!window.confirm(t("settings.data.clearDataConfirm"))) return;
    clearCacheBtn.disabled = true;
    clearDataBtn.disabled = true;
    dataStatus.textContent = t("settings.data.working");
    try {
      clearAppData();
      dataStatus.textContent = t("settings.data.clearDataDone");
      // Reload so locale / menu / high-score UI all rehydrate from defaults
      setTimeout(() => window.location.reload(), 450);
    } catch {
      dataStatus.textContent = t("settings.data.clearFailed");
      clearCacheBtn.disabled = false;
      clearDataBtn.disabled = false;
    }
  };

  dataOptions.appendChild(clearCacheBtn);
  dataOptions.appendChild(clearDataBtn);
  dataOptions.appendChild(dataStatus);
  dataGroup.appendChild(dataOptions);
  settingsPanel.appendChild(dataGroup);

  settingsContainer.appendChild(settingsPanel);
  document.body.appendChild(settingsContainer);
};
