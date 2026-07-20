# Architecture sketch

Short map of `src/` for contributors. Prefer domain purity and thin presentation.

## Layers

| Area         | Path                             | Notes                                                                                                     |
| ------------ | -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Boot         | `src/index.ts`, `src/runtime.ts` | PIXI app, tickers; low-perf flag via storage helper                                                       |
| Domain       | `src/domain/`                    | Pure grid/piece/PRNG/daily — no PIXI                                                                      |
| Presentation | `src/presentation/`              | Sprite placement / entity-id map                                                                          |
| Application  | `src/application/`               | Match gate, land/spawn, fun-effect plugins                                                                |
| Board        | `src/board/`                     | Clear, physics, fun board mutations, dynamics (Rapier)                                                    |
| Active       | `src/active/`                    | Falling piece controls / fall / RNG                                                                       |
| Game         | `src/game/`                      | Match FSM (`states`), board-state, time-attack, hidden-pause                                              |
| Settings     | `src/settings/`                  | Prefs, difficulty, high scores — **not** replay                                                           |
| Replay       | `src/replay/`                    | Recording/playback + pure `parse.ts`                                                                      |
| Score        | `src/score/`                     | Model, rank, dan, HUD, performance                                                                        |
| Util         | `src/util/`                      | Shared pure helpers: clamp, color, pad, format, hash, date-key, css-class, dialog-class, dev-log, nearest |

## Shared utils (`src/util/`)

| Module            | Role                                                                                |
| ----------------- | ----------------------------------------------------------------------------------- |
| `clamp.ts`        | `clamp` / `clampInt` / `nonNegative` / `atLeastOne` / `unitInterval` / `clampCount` |
| `color.ts`        | `hexToPixi` / `hexToRgba` / `parseHexRgb`                                           |
| `pad.ts`          | zero-pad digits for scores / timers                                                 |
| `format.ts`       | `×mult`, percent, factor strings                                                    |
| `hash.ts`         | FNV-1a 32 (daily seed)                                                              |
| `date-key.ts`     | UTC `YYYY-MM-DD`                                                                    |
| `css-class.ts`    | `joinClassNames` for settings chips                                                 |
| `dialog-class.ts` | overlay / card / button / setting-opt class builders                                |
| `dev-log.ts`      | DEV-only `devWarn`                                                                  |
| `manhattan.ts`    | cell Manhattan distance helpers                                                     |
| `nearest.ts`      | `nearestIndex` for column lock / snap                                               |
| `index.ts`        | barrel re-exports                                                                   |

## Dual physics

- **Grid** (default): discrete cells
- **cantilever**: tip physics in `board/physics.ts`
- **truePhysics**: Rapier continuous (`board/dynamics/*`)

Most land/clear/fun paths branch on `isContinuousPhysics()`. Prefer fixing both sides when touching land orchestration.

## Fun effects

1. Mode defs: `fun/modes.ts`
2. Residual globals: `fun/effects.ts`
3. Board mutations: `board/fun/*`
4. Plugins / registry: `application/fun-effects/*`

## Tests

- Co-located `*.test.ts` under `src/`
- Strong coverage: domain, score pure math, settings store, dynamics units, auth PKCE
- Prefer pure helpers extractable from DOM/PIXI for new tests

## Local quality gate

```bash
yarn ci   # test + typecheck + lint + i18n:check + format:check + build
```

See `CONTRIBUTING.md` for Node/Yarn notes and `yarn build:fast`.
