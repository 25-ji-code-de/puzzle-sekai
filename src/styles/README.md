# DOM chrome styles

Static UI chrome (menus, dialogs, settings, rotate gate) lives here as SCSS.

- **Entry for deferred load:** `ui-chrome.scss` (imported dynamically from `src/index.ts`)
- **Canvas shell only:** `src/style.scss` (sync, small)
- **Boot LCP:** inlined in `index.html` — do not move into the JS bundle

TS should assign `className` / `classList`. Do not re-introduce large `cssText` or injected CSS strings for static rules. Dynamic exceptions: hashed asset URLs, fade opacity, locale font CSS variables, data-driven colors.
