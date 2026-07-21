# Overnight session notes (local main)

Autonomous hygiene/refactor stream on `main` starting at `d800e57` (not pushed unless asked).

## Goals (standing)

- Safe DX / testability / pure helper extraction
- Do **not** change score formulas, physics constants, or clear rules semantics
- Prefer unit-tested pure modules under `src/util/` and thin adapters

## Highlights shipped

- `src/util/`: clamp, color, pad, format, hash, date-key, css-class, dialog-class, dev-log, nearest, manhattan, minmax, ease, json, number
- Soft `console.warn` on best-effort paths → `devWarn` (prod quiet)
- Pure extract: replay parse, hidden-pause, display-policy, contact-math, focus-trap, live-region, time-attack clock
- Storage path: `safeJsonParse` + `toNonNegInt` / `toFiniteNumber` for settings/auth/dan/replay/sync
- Docs: `docs/architecture.md`, CONTRIBUTING/native notes for `build:fast` / util policy

## Quality bar

```bash
yarn test && yarn typecheck && yarn lint && yarn format:check
# optional full: yarn ci
```

Approximate suite size after session: **569 tests / 85 files**.
Local stream: **~50 commits** from `d800e57` (not pushed unless asked).

## Recent tip themes

- Shared clamp family (`nonNegative`, `atLeastOne`, `unitInterval`, `clampCount`)
- `safeJsonParse` + number coercion for every storage blob
- Geometry helpers: `manhattan`, `maxOf`/`minOf`, `nearestIndex`, `easeInQuad`
- UI class builders + `formatTimesMult` / `formatPercent`

## Do not touch without review

- Score mult tables, dan thresholds, clear connectivity rules
- Rapier collider masses / gravity constants
- Public i18n keys without `yarn i18n:check`
