import { t } from "../i18n";
import type { DialogButtonVariant } from "./dialog-button";
import {
  armDialogFocus,
  buildDialogButton,
  buildDialogShell,
} from "./dialog-button";

const CONFIRM_DIALOG_ID = "confirm-dialog";

let dismissActiveDialog: (() => void) | null = null;

export const confirmDialog = (
  message: string,
  options: {
    confirmLabel?: string;
    confirmVariant?: DialogButtonVariant;
  } = {},
): Promise<boolean> => {
  dismissActiveDialog?.();

  return new Promise((resolve) => {
    const { overlay, card } = buildDialogShell({
      id: CONFIRM_DIALOG_ID,
      title: t("common.confirmTitle"),
    });

    const messageEl = document.createElement("div");
    messageEl.id = `${CONFIRM_DIALOG_ID}-message`;
    messageEl.className = "ui-dialog__message";
    messageEl.textContent = message;
    overlay.setAttribute("aria-describedby", messageEl.id);
    card.appendChild(messageEl);

    const footer = document.createElement("div");
    footer.className = "ui-dialog__footer ui-dialog__footer--actions";

    let settled = false;
    let focusTrap: ReturnType<typeof armDialogFocus> | null = null;
    const finish = (confirmed: boolean) => {
      if (settled) return;
      settled = true;
      focusTrap?.release();
      overlay.remove();
      if (dismissActiveDialog === dismiss) dismissActiveDialog = null;
      resolve(confirmed);
    };
    const dismiss = () => finish(false);

    const cancelButton = buildDialogButton(
      t("common.cancel"),
      "neutral",
      dismiss,
    );
    const confirmButton = buildDialogButton(
      options.confirmLabel ?? t("common.confirm"),
      options.confirmVariant ?? "danger",
      () => finish(true),
    );
    footer.append(cancelButton, confirmButton);
    card.appendChild(footer);

    overlay.onclick = (event) => {
      if (event.target === overlay) dismiss();
    };

    dismissActiveDialog = dismiss;
    document.body.appendChild(overlay);
    focusTrap = armDialogFocus(overlay, {
      initialFocus: cancelButton,
      onEscape: dismiss,
    });
  });
};
