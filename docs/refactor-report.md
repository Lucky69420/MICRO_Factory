# Architecture refactor verification

Baseline: `686c515c91e8410c03b0daeb2f3ca45687de0974` on `main`.

## Changes

The original browser app became 1,182 lines and simulation became 1,437 lines
when normally formatted. The original CSS was one physical line. Source now
uses native ES modules grouped by simulation, building state/placement,
logistics, production, combat, world generation, persistence, rendering, input,
UI, static definitions and utilities. See the README's module map.

`Game` remains the simulation owner and retains its public commands and tick
order. No prototype patching or runtime globals are required. A session-owned
`App` supplies the browser integration. Rendering leaves gameplay state
unchanged; UI refresh and drag cost summaries live outside Canvas drawing.

Resource/item/recipe/building/terrain/control definitions are separated from
behavior. The inventory derives slots from registered resources while keeping
the original item/group ordering. Placement planning is shared between mouse
clicks, drag previews and commits. All input senders still share the existing
transfer validator and atomic route resolution. Graph locality, active item
indexes, rotating priorities, tunnel FIFOs and terrain caches are retained.

ESLint, Prettier, a strict file-length checker, static server/build scripts and
GitHub quality/browser workflows are included. No bundler/backend is added;
`dist/` is generated automatically for deployment. Assets and license files are
moved unchanged into `public/` and copied into the same deployed URL paths.

## Verified locally

- All original runnable regression scripts passed before refactoring, including
  the performance script.
- The current 15 regression suites pass: the 13 existing assertion suites plus
  architecture and baseline parity. Their original gameplay assertions are
  retained; UI harnesses now load native modules. Lint also exposed and fixed an
  accidental global variable in a historical test fixture.
- Baseline parity compares SHA-256 fingerprints of all definitions, nine
  seeded worlds across three sizes, and 18 full simulation checkpoints across
  factory production, routing/replacement/tunnels and combat. Results match the
  original commit exactly.
- A populated v2 save created by the original code loads correctly, including
  held crossing lanes, tunnel pipeline, active production, wall HP and enemies.
  Repeated save/load and continued simulation agree. Existing v1 migration,
  invalid-save retention and browser-storage handler tests pass.
- The architecture test checks 52 native modules: all imports resolve, the
  dependency graph is acyclic, simulation does not import presentation/browser
  APIs, and repeated rendering leaves the full save and topology unchanged.
- ESLint, formatting, strict file-length checking and the static build pass.
  The largest maintained file is `tests/v08.cjs` at 480 lines; the largest runtime
  module is `src/rendering/Renderer.js` at 338 lines. Every maintained
  source is below 1,000. Run `npm run check:files -- --report` for exact counts.

## Performance measurements

Same deterministic fixtures, Node 24, 40 warm-up ticks and 300 measured ticks.
Rendering is CPU preparation against a mock Canvas, not browser GPU/FPS.
One before/after run is reported below; small differences include measurement
noise and do not establish speedup or slowdown.

| Fixture                   | Original simulation ms/tick | Refactored simulation ms/tick | Original mock draw ms | Refactored mock draw ms |
| ------------------------- | --------------------------: | ----------------------------: | --------------------: | ----------------------: |
| 100 belts, 15 machines    |                       0.038 |                         0.033 |                 0.151 |                   0.151 |
| 1,000 belts, 75 machines  |                       0.173 |                         0.197 |                 1.182 |                   1.018 |
| 5,000 belts, 220 machines |                       0.713 |                         0.724 |                 2.509 |                   2.148 |

Draw-command counts, graph-node counts and chunk counts are identical for all
three fixtures. Combat/terrain stress and fixed-step/30–60–144 FPS equivalence
checks also pass. No speculative simulation optimization or balance changes
were introduced.

## Browser and deployment

Native module imports and all bundled assets are relative to the document URL,
including `/MICRO_Factory/`. Build output retains `index.html`, `assets/` and
`licenses/` at the deployed root. Existing `microfactory.*` storage keys and
save versions 1/2 are unchanged.

A Chromium smoke test is included in both quality and Pages workflows. It loads
the actual static build at `/MICRO_Factory/`, rejects module/HTTP/image errors,
exercises controls, construction/costs, inspection, save/load and setting
persistence, and captures desktop/mobile screenshots.

Local real-browser verification could not run: the browser download was
truncated, and the separate cloud browser cannot reach the scratch server.
The branch passed the real Chromium smoke test in
[GitHub Actions](https://github.com/Lucky69420/MICRO_Factory/actions/runs/38522420488),
including module/asset loading, construction/costs, inspection, save/load,
settings persistence and desktop/mobile screenshots. The Pages workflow repeats
these checks before publishing. The detailed manual checklist is documented
separately; its unexecuted entries are not counted as manual passes.

## Remaining technical debt

- Loading retains the historical save validation policy. More exhaustive
  schema/range validation deserves a separate, behavior-focused change.
- Combat remains one focused 317-line module; separate pathfinding/movement if
  future mechanics make it grow.
- Existing building-specific transfer and inspection branches remain where
  their behaviors differ; introduce new interfaces only with concrete needs.
- Browser startup assumes one app per page. Add teardown before supporting
  multiple embedded sessions or hot module replacement.
- Real GPU/FPS performance and browser engines beyond Chromium are not measured
  by the Node benchmarks or mocked UI suites.
