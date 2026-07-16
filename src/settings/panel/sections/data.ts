import { clearAppData, clearAppCaches } from "../../data";
import { t } from "../../../i18n";
import {
  makeDangerButton,
  makeOptionsRow,
  makeSettingGroup,
} from "../widgets";

export const appendDataSection = (panel: HTMLElement): void => {
  const group = makeSettingGroup(t("settings.data.label"));
  const options = makeOptionsRow();
  options.style.flexDirection = "column";
  options.style.alignItems = "stretch";

  const status = document.createElement("div");
  status.className = "setting-status";

  const clearCacheBtn = makeDangerButton(t("settings.data.clearCache"));
  const clearDataBtn = makeDangerButton(t("settings.data.clearData"));

  clearCacheBtn.onclick = async () => {
    if (!window.confirm(t("settings.data.clearCacheConfirm"))) return;
    clearCacheBtn.disabled = true;
    clearDataBtn.disabled = true;
    status.textContent = t("settings.data.working");
    try {
      await clearAppCaches();
      status.textContent = t("settings.data.clearCacheDone");
    } catch {
      status.textContent = t("settings.data.clearFailed");
    } finally {
      clearCacheBtn.disabled = false;
      clearDataBtn.disabled = false;
    }
  };

  clearDataBtn.onclick = () => {
    if (!window.confirm(t("settings.data.clearDataConfirm"))) return;
    clearCacheBtn.disabled = true;
    clearDataBtn.disabled = true;
    status.textContent = t("settings.data.working");
    try {
      clearAppData();
      status.textContent = t("settings.data.clearDataDone");
      setTimeout(() => window.location.reload(), 450);
    } catch {
      status.textContent = t("settings.data.clearFailed");
      clearCacheBtn.disabled = false;
      clearDataBtn.disabled = false;
    }
  };

  options.appendChild(clearCacheBtn);
  options.appendChild(clearDataBtn);
  options.appendChild(status);
  group.appendChild(options);
  panel.appendChild(group);
};
