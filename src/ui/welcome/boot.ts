/**
 * Boot welcome shell: static HTML adopt, load progress, click-to-continue.
 * Layout for #boot-welcome lives in index.html (LCP). Fallback uses same classes.
 */
import { prefersReducedMotion, trapFocus, type FocusTrapHandle } from "../../a11y";
import { t, getLocale, onLocaleChange } from "../../i18n";
import { unlockAudio } from "../../audio/bgm";
import { playMenuBgm } from "../../audio/session";
import welcomeImg from "../../assets/welcome.png";

let modalEl: HTMLDivElement | null = null;
let clickPromptEl: HTMLDivElement | null = null;
let dimOverlayEl: HTMLDivElement | null = null;
/** True once all boot assets are ready and the shell accepts a click/key. */
let welcomeReady = false;
let bootShellShown = false;
let bootLocaleListening = false;
let lastLoadProgress = 0;
let howtoWired = false;
let howtoOpen = false;
let howtoFocusTrap: FocusTrapHandle | null = null;

/** Called after the boot shell is dismissed (audio unlocked, menu should open). */
let onBootContinue: (() => void) | null = null;

export const setOnBootContinue = (fn: () => void) => {
  onBootContinue = fn;
};

const formatLoadingPrompt = (pct: number): string =>
  `${t("loading")} ${Math.floor(pct)}%`;

const refreshBootPromptText = () => {
  if (!clickPromptEl || welcomeReady) return;
  clickPromptEl.textContent = formatLoadingPrompt(lastLoadProgress);
};

const isInteractiveBootTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "a, button, input, textarea, select, label, [data-boot-interactive]",
    ),
  );
};

const localeHowtoBlockSelector = (): string => {
  const locale = getLocale();
  if (locale === "ja") return 'div[lang="ja"]';
  if (locale === "en") return 'div[lang="en"]';
  return 'div[lang="zh-CN"]';
};

const fillHowtoBody = () => {
  const body = document.getElementById("boot-howto-body");
  const source = document.getElementById("seo-howto");
  if (!body || !source) return;

  body.replaceChildren();

  // Prefer the active locale block(s); fall back to full howto if missing.
  const preferred = source.querySelectorAll(localeHowtoBlockSelector());
  const nodes =
    preferred.length > 0 ? Array.from(preferred) : Array.from(source.children);

  for (const node of nodes) {
    body.appendChild(node.cloneNode(true));
  }
};

const closeHowtoPanel = () => {
  const panel = document.getElementById("boot-howto-panel");
  if (!panel) return;
  howtoOpen = false;
  howtoFocusTrap?.release();
  howtoFocusTrap = null;
  panel.classList.remove("is-open");
  panel.hidden = true;
  panel.setAttribute("aria-hidden", "true");
};

const openHowtoPanel = (e?: Event) => {
  e?.preventDefault();
  e?.stopPropagation();
  const panel = document.getElementById("boot-howto-panel");
  if (!panel) return;
  fillHowtoBody();
  howtoOpen = true;
  panel.hidden = false;
  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");
  const closeBtn = document.getElementById(
    "boot-howto-close",
  ) as HTMLElement | null;
  howtoFocusTrap?.release({ restore: false });
  howtoFocusTrap = trapFocus(panel, {
    initialFocus: closeBtn,
    onEscape: () => closeHowtoPanel(),
  });
};

const wireHowtoUi = () => {
  if (howtoWired) return;
  const btn = document.getElementById("boot-howto-btn");
  const panel = document.getElementById("boot-howto-panel");
  const closeBtn = document.getElementById("boot-howto-close");
  if (!btn || !panel) return;
  howtoWired = true;

  btn.addEventListener("click", openHowtoPanel);

  closeBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeHowtoPanel();
  });

  panel.addEventListener("click", (e) => {
    if (e.target === panel) {
      e.stopPropagation();
      closeHowtoPanel();
    }
  });

  // Card clicks must not dismiss the boot shell underneath.
  panel
    .querySelector(".boot-howto__card")
    ?.addEventListener("click", (e) => e.stopPropagation());
};

const refreshBootCopy = () => {
  if (!modalEl) return;
  const title = modalEl.querySelector(".welcome-title");
  const subtitle = modalEl.querySelector(".welcome-subtitle");
  const desc = modalEl.querySelector(".welcome-desc");
  const disc = modalEl.querySelector(".welcome-disclaimer");
  const howtoBtn = document.getElementById("boot-howto-btn");
  const howtoTitle = document.getElementById("boot-howto-title");
  const howtoClose = document.getElementById("boot-howto-close");
  if (title) title.textContent = t("welcome.title");
  if (subtitle) subtitle.textContent = t("welcome.subtitle");
  if (desc) desc.innerHTML = t("welcome.desc");
  if (disc) {
    disc.innerHTML =
      t("welcome.disclaimer") +
      ' · <a class="welcome-disclaimer__link" href="https://github.com/25-ji-code-de/puzzle-sekai" target="_blank" rel="noopener noreferrer">GitHub</a>';
  }
  if (howtoBtn) howtoBtn.textContent = t("welcome.howto");
  if (howtoTitle) howtoTitle.textContent = t("welcome.howto");
  if (howtoClose) howtoClose.textContent = t("welcome.howtoClose");
  if (welcomeReady && clickPromptEl) {
    clickPromptEl.textContent = t("welcome.click");
  } else {
    refreshBootPromptText();
  }
  if (howtoOpen) fillHowtoBody();
};

/**
 * Upgrade the static HTML shell once the app bundle is running:
 * - set the welcome cover background (hashed URL from Vite)
 * - attach locale font scheme classes (CSS vars from fonts.ts)
 */
const enhanceBootShell = (shell: HTMLDivElement) => {
  shell.style.backgroundImage = `url(${welcomeImg})`;

  const title = shell.querySelector(".welcome-title") as HTMLElement | null;
  const subtitle = shell.querySelector(
    ".welcome-subtitle",
  ) as HTMLElement | null;
  const desc = shell.querySelector(".welcome-desc") as HTMLElement | null;
  const disc = shell.querySelector(".welcome-disclaimer") as HTMLElement | null;
  title?.classList.add("font-brand");
  subtitle?.classList.add("font-brand");
  // Disclaimer is Japanese in every locale — force brand (NishikiTeki).
  disc?.classList.add("font-brand");
  desc?.classList.add("font-body");
  clickPromptEl?.classList.add("font-action");
};

/**
 * Fallback only: recreate the shell if index.html's static node is missing.
 * Uses the same classes as index.html critical CSS (no duplicate cssText).
 */
const createBootShellFallback = (): HTMLDivElement => {
  const shell = document.createElement("div");
  shell.id = "boot-welcome";
  shell.style.backgroundImage = `url(${welcomeImg})`;

  const overlay = document.createElement("div");
  overlay.className = "boot-welcome__dim";
  shell.appendChild(overlay);

  const content = document.createElement("div");
  content.className = "welcome-card";
  content.innerHTML = `
    <h1 class="welcome-title font-brand">${t("welcome.title")}</h1>
    <div class="welcome-subtitle font-brand">${t("welcome.subtitle")}</div>
    <div class="welcome-desc font-body">${t("welcome.desc")}</div>
    <div class="welcome-click font-action">${formatLoadingPrompt(0)}</div>
    <div class="welcome-actions">
      <button type="button" id="boot-howto-btn" class="welcome-howto-btn">${t(
        "welcome.howto",
      )}</button>
    </div>
    <p class="welcome-disclaimer font-brand">${t(
      "welcome.disclaimer",
    )} · <a class="welcome-disclaimer__link" href="https://github.com/25-ji-code-de/puzzle-sekai" target="_blank" rel="noopener noreferrer">GitHub</a></p>
  `;
  shell.appendChild(content);
  document.body.appendChild(shell);

  if (!document.getElementById("boot-howto-panel")) {
    const panel = document.createElement("div");
    panel.id = "boot-howto-panel";
    panel.className = "boot-howto";
    panel.hidden = true;
    panel.setAttribute("aria-hidden", "true");
    panel.innerHTML = `
      <div class="boot-howto__card" role="dialog" aria-modal="true" aria-labelledby="boot-howto-title">
        <h2 id="boot-howto-title" class="boot-howto__title">${t(
          "welcome.howto",
        )}</h2>
        <div id="boot-howto-body" class="boot-howto__body"></div>
        <button type="button" id="boot-howto-close" class="boot-howto__close">${t(
          "welcome.howtoClose",
        )}</button>
      </div>
    `;
    document.body.appendChild(panel);
  }

  return shell;
};

export const showBootWelcome = () => {
  if (bootShellShown) return;
  bootShellShown = true;

  let shell = document.getElementById("boot-welcome") as HTMLDivElement | null;
  if (!shell) {
    shell = createBootShellFallback();
  }

  modalEl = shell;
  dimOverlayEl = shell.querySelector(".boot-welcome__dim");
  clickPromptEl = shell.querySelector(".welcome-click");
  enhanceBootShell(shell);
  refreshBootCopy();
  wireHowtoUi();

  if (!bootLocaleListening) {
    bootLocaleListening = true;
    onLocaleChange(() => refreshBootCopy());
  }
};

export const setWelcomeLoadProgress = (pct: number) => {
  lastLoadProgress = Math.max(0, Math.min(100, pct));
  refreshBootPromptText();
};

export const markWelcomeReady = () => {
  welcomeReady = true;
  if (clickPromptEl) {
    clickPromptEl.textContent = t("welcome.click");
    if (!prefersReducedMotion()) {
      clickPromptEl.style.animation = "promptPulse 1.8s ease-in-out infinite";
    }
  }
  if (modalEl) {
    modalEl.style.cursor = "pointer";
  }

  const continueOnce = (e?: Event) => {
    if (!welcomeReady || !modalEl) return;
    if (howtoOpen) return;
    if (e && isInteractiveBootTarget(e.target)) return;

    welcomeReady = false;
    window.removeEventListener("keydown", onKey);
    modalEl.removeEventListener("click", onClick);

    unlockAudio();
    void playMenuBgm();

    closeHowtoPanel();

    const fadeMs = prefersReducedMotion() ? 0 : 400;
    if (dimOverlayEl) dimOverlayEl.style.opacity = "0";
    modalEl.style.opacity = "0";
    if (fadeMs > 0) {
      modalEl.style.transition = `opacity ${fadeMs}ms ease`;
    }
    const shell = modalEl;
    setTimeout(() => {
      shell?.remove();
      modalEl = null;
      clickPromptEl = null;
      dimOverlayEl = null;
      // Keep how-to panel node for potential re-entry is unnecessary after boot.
      document.getElementById("boot-howto-panel")?.remove();
      onBootContinue?.();
    }, fadeMs);
  };

  const onClick = (e: MouseEvent) => continueOnce(e);
  const onKey = (e: KeyboardEvent) => {
    if (howtoOpen) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeHowtoPanel();
      }
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      continueOnce(e);
    }
  };
  modalEl?.addEventListener("click", onClick);
  window.addEventListener("keydown", onKey);
};

/**
 * Shell main-loop entry (boot only). The real shell is shown earlier via
 * {@link showBootWelcome}; this is a no-op once that has run. Not a match state.
 */
export const welcome = () => {
  showBootWelcome();
};
