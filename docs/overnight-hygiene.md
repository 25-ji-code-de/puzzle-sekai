# Overnight session notes (local main)

Autonomous hygiene/refactor stream on `main` starting at `d800e57` (not pushed unless asked).

## Goals (standing)

- Safe DX / testability / pure helper extraction
- Do **not** change score formulas, physics constants, or clear rules semantics
- Prefer unit-tested pure modules under `src/util/` and thin adapters

## Highlights shipped

- `src/util/`: clamp (+atLeastOne, unitInterval, clampCount), color, pad, format, hash, date-key, css-class, dialog-class, dev-log, nearest, manhattan, minmax, ease, json
- Soft `console.warn` on best-effort paths → `devWarn` (prod quiet)
- Replay parse, hidden-pause, display-policy, contact-math, focus-trap math, live-region math
- Docs: `docs/architecture.md`, CONTRIBUTING/native notes for `build:fast` / util policy

## Quality bar

```bash
yarn test && yarn typecheck && yarn lint && yarn format:check
# optional full: yarn ci
```

Approximate suite size after session: ~566+ tests / ~84 files (grows with util tests).
Local stream: ~46+ commits from `d800e57` (not pushed unless asked).

## Recent tip commits (local)

- `devWarn` sweep across auth/native/sync/UI/game
- `nonNegative` / `clamp` / `atLeastOne` adoption
- Dialog/settings class builders + `nearestIndex`
- Pure helpers for a11y / daily / contact / hidden-pause

## Do not touch without review

- Score mult tables, dan thresholds, clear connectivity rules
- Rapier collider masses / gravity constants
- Public i18n keys without `yarn i18n:check`
