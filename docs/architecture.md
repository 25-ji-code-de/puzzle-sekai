# Architecture sketch

Short map of `src/` for contributors. Prefer domain purity and thin presentation.

## Layers

| Area         | Path                             | Notes                                                          |
| ------------ | -------------------------------- | -------------------------------------------------------------- |
| Boot         | `src/index.ts`, `src/runtime.ts` | PIXI app, tickers; low-perf flag via storage helper            |
| Domain       | `src/domain/`                    | Pure grid/piece/PRNG/daily — no PIXI                           |
| Presentation | `src/presentation/`              | Sprite placement / entity-id map                               |
| Application  | `src/application/`               | Match gate, land/spawn, fun-effect plugins                     |
| Board        | `src/board/`                     | Clear, physics, fun board mutations, dynamics (Rapier)         |
| Active       | `src/active/`                    | Falling piece controls / fall / RNG                            |
| Game         | `src/game/`                      | Match FSM (`states`), board-state, time-attack, hidden-pause   |
| Settings     | `src/settings/`                  | Prefs, difficulty, high scores — **not** replay                |
| Replay       | `src/replay/`                    | Recording/playback + pure `parse.ts`                           |
| Score        | `src/score/`                     | Model, rank, dan, HUD, performance                             |
| Util         | `src/util/`                      | Shared pure helpers: clamp, color, pad, format, hash, date-key |

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
