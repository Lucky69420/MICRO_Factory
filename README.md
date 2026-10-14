# Micro Factory

A browser factory game with mining, production, conveyors, underground transport,
a depot/truck economy, procedural terrain, and optional enemy combat.

Version 0.11 adds lead, sulfur, a gunpowder Mixer, ammunition boxes and four
specialized turrets including long-range artillery. See the [content update](docs/ammunition-update.md)
for recipes, balancing, migration and verification.

**[Play Micro Factory](https://Lucky69420.github.io/MICRO_Factory/)**

## Run locally

Use Node.js 24 or newer for development:

```sh
npm ci
npm run dev
```

Open the URL printed by the server. Assets and modules also work under
`/MICRO_Factory/`, matching GitHub Pages. Serve the game over HTTP; ES modules do
not load reliably when an HTML file is opened using `file://`.

Players need only a modern browser. There are no runtime npm dependencies,
external CDNs, backend services, or accounts.

## Structure and ownership

| Location                             | Purpose                                                                                   |
| ------------------------------------ | ----------------------------------------------------------------------------------------- |
| `index.html`                         | Existing interface markup and module entry                                                |
| `src/main.js`, `src/App.js`          | Browser startup and session-owned presentation state                                      |
| `src/core/`                          | Simulation owner, fixed clock, tick order, interpolation and inspection model             |
| `src/data/`                          | Building/item/recipe/terrain definitions, costs, starting stock and default controls      |
| `src/buildings/`                     | Placement transactions, replacement, footprints, health and removal                       |
| `src/logistics/`                     | Shared transfer validation, directed graph, instant routes, tunnel FIFO and belt geometry |
| `src/production/`                    | Recipe selection, committed jobs, input recovery and output transfer                      |
| `src/world/`                         | Chunk storage, seeded noise, terrain/deposit generation and connectivity checks           |
| `src/combat/`                        | Enemy spawning, bounded pathfinding, targeting, attacks and projectiles                   |
| `src/rendering/`                     | Camera conversion, cached artwork/terrain and world drawing                               |
| `src/input/`                         | Pointer and keyboard listeners, drag planning, rotation and rebinding                     |
| `src/ui/`                            | Build menu, inventory, inspection, settings and notifications                             |
| `src/persistence/`                   | Snapshot serialization, loading and legacy migration                                      |
| `src/utils/`                         | Shared item counts, directions and seed creation                                          |
| `styles/`                            | Base, palette, panel, settings and responsive CSS, imported in original order             |
| `public/assets/`, `public/licenses/` | Bundled artwork, provenance and original license notices                                  |
| `tests/`                             | Existing regressions plus architecture, original-state parity and legacy-save fixtures    |
| `scripts/`                           | Static server/build, test runners, formatting support and file-length validation          |

`Game` owns simulation state. Its public commands delegate to focused functions
that receive the game explicitly. These functions do not import UI, Canvas or
browser storage. `Game.tick()` retains the original damage → transport →
production → truck → combat order and 20 TPS timing.

`App` owns selection, previews, camera, settings and key state. UI and input call
commands such as `place`, `placePair`, `rotateBuilding`, `setRecipe`, `dispatch`,
`setCreative`, `save` and `Game.fromSave`. Rendering reads the simulation and
changes only presentation caches. UI refresh runs outside world drawing.

Dependencies use native `import`/`export`. No bundler or state framework is
required. Public barrel modules support tests/tools; runtime modules keep
explicit dependencies. An architecture test rejects import cycles and imports
from simulation modules into presentation modules.

## Checks

```sh
npm run check          # lint, formatting, file lengths, regressions, static build
npm test               # 15 regression suites, including original-state parity
npm run lint
npm run format:check
npm run format         # apply the shared formatting rules
npm run check:files -- --report
npm run bench          # simulation CPU and mock Canvas command preparation
```

For the real Chromium smoke test:

```sh
npx playwright install --with-deps chromium
npm run build
npm run test:browser
```

`BASE_URL=https://Lucky69420.github.io/MICRO_Factory/ npm run test:browser`
checks the deployed game instead. Browser tests use a fresh browser context and
their own disposable save. Screenshots and benchmark output go into ignored
`test-results/`.

The historical tests retain CommonJS assertion runners. They load the native
simulation modules through Node 24, and UI tests evaluate actual ES modules in
isolated VM browser fixtures. VM modules require an experimental Node flag;
`npm test` supplies it automatically.

The file-length check counts blank lines and comments and fails above 1,000
lines. It checks maintained JS, CSS, HTML, JSON, SVG, workflows and documentation.
Dependencies, generated build/lock/results files and verbatim upstream licenses
are excluded. Source files are formatted normally, without line compression.

## Build and deploy

```sh
npm run build
node scripts/serve.js --dist
```

The build copies HTML, source modules, styles, assets and licenses into `dist/`.
Edit the maintained source, not `dist/`. All runtime paths are relative to the
page, so the repository subdirectory remains supported.

GitHub Actions checks branches and pull requests. Updates to `main` run all
checks and the Chromium smoke test before publishing `dist/` through the
existing Pages workflow. The playable URL stays the same. Repository Settings
→ Pages must continue to use **GitHub Actions** as its source.

## Add content

### Buildings

1. Add the footprint/HP definition, costs and optional name/description in
   `src/data/buildings.js`. `BUILDINGS` derives the shared metadata once.
2. Use an existing behavior (`recipe`, `smelting`, `mining`, `transport`,
   `combat`, `storage`) when applicable. Recipe processors also belong in the
   processor behavior set in that same module. Implement genuinely new behavior
   in the corresponding simulation system.
3. Add `public/assets/building-<id>.svg`. The artwork registry loads it by ID.
4. Set its category. The palette discovers registered buildings automatically;
   `src/data/keybindings.js` provides the established category ordering.
5. Add a focused regression for placement, inputs/outputs and conservation.

For recipe processors, changing a few definition entries is sufficient. A new
transport topology or combat mechanic also needs deliberate system and drawing
support. `replacementGroup` and equal footprints control replacement;
`planPlacement` remains the authoritative validation path for clicks and drags.

### Items and recipes

Add items in `src/data/items.js`, with names, forms, groups, icons and fallbacks.
Metal forms are generated from the existing metal definitions. Add processing
recipes in `src/data/recipes.js`; preserve explicit `inputs`, `outputs`, timing
and fuel where applicable. Machine ingredient capacities and recipe choices
are derived from this registry.

The inventory panel builds its slots from the resource registry, preserving the
existing group and item order. Test conservation and delivery for new resources.

### Terrain

Add metadata in `src/data/terrain.js`, preserve IDs of existing terrain types,
and update generation in `src/world/TerrainGenerator.js`. Register textures and
blend priority in `src/rendering/TerrainArt.js`. Check placement, passability,
starting resources and wide spawn-to-depot connectivity in terrain tests.

### Controls

Change defaults/categories in `src/data/keybindings.js`, dispatch in
`src/input/KeyboardControls.js`, and pointer behavior in
`src/input/MouseControls.js`. Keep the help text in `index.html` synchronized.
Existing browser keybindings continue to override defaults until reset.

## Saves, validation and remaining work

Factory save versions 1, 2 and 3 and all `microfactory.*` browser storage keys are
preserved. Saves rebuild graphs/caches and retain active jobs, items, tunnels,
truck state, stock, terrain seed and combat. Failed loads leave the running
factory intact. Saves remain tied to the browser and origin.

See [the content update](docs/ammunition-update.md) for current behavior and
[the historical refactor report](docs/refactor-report.md) for earlier measurements,
[the manual regression checklist](docs/manual-testing.md), and
[historical gameplay notes](docs/history.md).

Remaining architecture work includes stricter validation of malformed save
fields, extracting bounded combat pathfinding if it grows, and replacing the
preserved per-machine type branches when new behavior warrants it. The browser
bootstrap assumes one app per page; add explicit teardown before supporting
multiple sessions within the same page.

Artwork and licensing are unchanged. See `public/licenses/ATTRIBUTION.txt` and
the provenance files packaged with each artwork collection.
