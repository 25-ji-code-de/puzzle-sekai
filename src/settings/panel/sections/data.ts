import { clearAppData, clearAppCaches } from "../../data";
import { getAuthSnapshot, logout } from "../../../auth";
import { t } from "../../../i18n";
import { confirmDialog } from "../../../ui/confirm-dialog";
import {
  makeDangerButton,
  makeNeutralButton,
  makeOptionsRow,
  makeSettingGroup,
} from "../widgets";

export const appendDataSection = (panel: HTMLElement): void => {
  const group = makeSettingGroup(t("settings.data.label"));
  const options = makeOptionsRow();
  options.classList.add("setting-options--stack");

  const status = document.createElement("div");
  status.className = "setting-status";

  if (getAuthSnapshot().loggedIn) {
    const logoutBtn = makeNeutralButton(t("auth.logout"));
    logoutBtn.onclick = async () => {
      if (
        !(await confirmDialog(t("auth.logout"), {
          confirmLabel: t("auth.logout"),
        }))
      ) {
        return;
      }
      logout();
      status.textContent = t("auth.logout");
    };
    options.appendChild(logoutBtn);
  }

  const clearCacheBtn = makeDangerButton(t("settings.data.clearCache"));
  const clearDataBtn = makeDangerButton(t("settings.data.clearData"));

  clearCacheBtn.onclick = async () => {
    if (
      !(await confirmDialog(t("settings.data.clearCacheConfirm"), {
        confirmLabel: t("settings.data.clearCache"),
      }))
    ) {
      return;
    }
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

  clearDataBtn.onclick = async () => {
    if (
      !(await confirmDialog(t("settings.data.clearDataConfirm"), {
        confirmLabel: t("settings.data.clearData"),
      }))
    ) {
      return;
    }
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
