import { t } from "../i18n";
import { buildDialogButton, buildDialogShell } from "./dialog-button";

const CONTROLS_OVERLAY_ID = "controls-overlay";
const ABOUT_OVERLAY_ID = "about-overlay";

/** Drop ephemeral menu overlays (e.g. on locale change). */
export const disposeMenuOverlays = () => {
  document.getElementById(ABOUT_OVERLAY_ID)?.remove();
  document.getElementById(CONTROLS_OVERLAY_ID)?.remove();
};

const attachDismiss = (overlay: HTMLDivElement) => {
  const closeBtn = overlay.querySelector(
    ".overlay-close-btn",
  ) as HTMLButtonElement | null;
  if (closeBtn) closeBtn.onclick = () => overlay.remove();
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };
};

export const showControlsOverlay = () => {
  document.getElementById(CONTROLS_OVERLAY_ID)?.remove();

  const { overlay, card, title } = buildDialogShell({
    id: CONTROLS_OVERLAY_ID,
    title: t("controls.title"),
    backdropAlpha: 0.8,
    wide: true,
  });
  title.classList.add("ui-dialog__title--spaced");
  overlay.classList.add("ui-overlay--dim");

  const table = document.createElement("table");
  table.className = "overlay-table";
  const rows: [string, string, string?][] = [
    [t("controls.keyboard"), t("controls.moveLeftRight"), "label"],
    ["", t("controls.rotateClockwise")],
    ["", t("controls.rotateCounter")],
    ["", t("controls.softDrop")],
    ["", t("controls.hardDrop")],
    ["", t("controls.restart")],
    ["", t("controls.pause")],
    [t("controls.mobile"), t("controls.swipeMove"), "mobile"],
    ["", t("controls.tapRotate")],
    ["", t("controls.swipeHardDrop")],
    ["", t("controls.pressSoftDrop")],
    ["", t("controls.easterEgg"), "note"],
  ];
  for (const [label, value, kind] of rows) {
    const tr = document.createElement("tr");
    const tdL = document.createElement("td");
    const tdV = document.createElement("td");
    if (kind === "label") tdL.className = "overlay-table__label";
    if (kind === "mobile") tdL.className = "overlay-table__label--mobile";
    tdL.textContent = label;
    if (kind === "note") {
      tdV.className = "overlay-table__note";
    }
    tdV.textContent = value;
    tr.appendChild(tdL);
    tr.appendChild(tdV);
    table.appendChild(tr);
  }
  card.appendChild(table);

  const footer = document.createElement("div");
  footer.className = "ui-dialog__footer";
  const close = buildDialogButton(t("controls.close"), "neutral", () =>
    overlay.remove(),
  );
  close.classList.add("ui-btn--compact", "overlay-close-btn");
  footer.appendChild(close);
  card.appendChild(footer);

  attachDismiss(overlay);
  document.body.appendChild(overlay);
};

export const showAboutOverlay = () => {
  document.getElementById(ABOUT_OVERLAY_ID)?.remove();

  const link = (text: string, href: string) => {
    const a = document.createElement("a");
    a.className = "about-link";
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = text;
    return a;
  };

  const row = (label: string, content: HTMLElement | string) => {
    const wrap = document.createElement("div");
    wrap.className = "about-row";
    const lab = document.createElement("span");
    lab.className = "about-row__label font-caption";
    lab.textContent = label;
    const val = document.createElement("span");
    val.className = "about-row__value font-body";
    if (typeof content === "string") val.textContent = content;
    else val.appendChild(content);
    wrap.appendChild(lab);
    wrap.appendChild(val);
    return wrap;
  };

  const { overlay, card, title } = buildDialogShell({
    id: ABOUT_OVERLAY_ID,
    title: t("about.title"),
    backdropAlpha: 0.8,
    wide: true,
  });
  title.classList.add("ui-dialog__title--spaced");
  overlay.classList.add("ui-overlay--dim");
  card.style.maxHeight = "min(85vh, 720px)";
  card.style.overflowY = "auto";

  const join = (...nodes: (Node | string)[]) => {
    const span = document.createElement("span");
    for (const n of nodes) {
      if (typeof n === "string") span.appendChild(document.createTextNode(n));
      else span.appendChild(n);
    }
    return span;
  };

  card.appendChild(
    row(
      t("footer.original"),
      join(
        link("Pazuru-Pico", "https://github.com/hamzaabamboo/pazuru-pico"),
        " (",
        link("HamP", "https://ham-san.net/"),
        ")",
      ),
    ),
  );
  card.appendChild(
    row(
      t("footer.inspiration"),
      link(
        "BanG Dream! ☆PICO ～OHMORI～ Ep.9",
        "https://www.youtube.com/watch?v=q5YETLAebUY",
      ),
    ),
  );
  card.appendChild(
    row(
      t("footer.thisProject"),
      link("GitHub", "https://github.com/25-ji-code-de/puzzle-sekai"),
    ),
  );
  card.appendChild(
    row(
      t("footer.author"),
      link(
        "bili_47177171806",
        "https://space.bilibili.com/3546904856103196",
      ),
    ),
  );
  card.appendChild(
    row(
      t("footer.support"),
      link(t("about.afdian"), "https://afdian.com/a/1806P"),
    ),
  );
  card.appendChild(
    row(
      t("footer.feedback"),
      link(
        t("about.reportIssue"),
        "https://github.com/25-ji-code-de/puzzle-sekai/issues/new",
      ),
    ),
  );

  const legal = document.createElement("div");
  legal.className = "about-legal font-caption";
  const strong = document.createElement("p");
  strong.innerHTML = `<strong>${t("about.disclaimerTitle")}</strong>`;
  legal.appendChild(strong);
  for (const key of [
    "about.disclaimerP1",
    "about.disclaimerP2",
    "about.disclaimerP3",
    "about.disclaimerP4",
  ] as const) {
    const p = document.createElement("p");
    p.textContent = t(key);
    legal.appendChild(p);
  }
  const agree = document.createElement("p");
  agree.style.marginTop = "12px";
  agree.style.fontSize = "12px";
  agree.style.opacity = "0.8";
  agree.textContent = t("about.disclaimerAgree");
  legal.appendChild(agree);
  card.appendChild(legal);

  const footer = document.createElement("div");
  footer.className = "ui-dialog__footer";
  const close = buildDialogButton(t("controls.close"), "neutral", () =>
    overlay.remove(),
  );
  close.classList.add("ui-btn--compact", "overlay-close-btn");
  footer.appendChild(close);
  card.appendChild(footer);

  attachDismiss(overlay);
  document.body.appendChild(overlay);
};
