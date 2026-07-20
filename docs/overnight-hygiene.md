# Overnight session notes (local main)

Autonomous hygiene/refactor stream on `main` starting at `d800e57` (not pushed unless asked).

## Goals (standing)

- Safe DX / testability / pure helper extraction
- Do **not** change score formulas, physics constants, or clear rules semantics
- Prefer unit-tested pure modules under `src/util/` and thin adapters

## Highlights shipped

- `src/util/`: clamp, color, pad, format, hash, date-key, css-class, dialog-class, dev-log, nearest
- Soft `console.warn` on best-effort paths → `devWarn` (prod quiet)
- Replay parse, hidden-pause, display-policy, contact-math, focus-trap math, live-region math
- Docs: `docs/architecture.md`, CONTRIBUTING/native notes for `build:fast` / util policy

## Quality bar

```bash
yarn test && yarn typecheck && yarn lint && yarn format:check
# optional full: yarn ci
```

Approximate suite size after session: ~551 tests / ~80 files (grows with util tests).

## Recent tip commits (local)

- `devWarn` sweep across auth/native/sync/UI/game
- `nonNegative` / `clamp` adoption in score, sync, replay, active
- Dialog/settings class builders + `nearestIndex`

## Do not touch without review

- Score mult tables, dan thresholds, clear connectivity rules
- Rapier collider masses / gravity constants
- Public i18n keys without `yarn i18n:check`
