# Micro Factory v0.11 — ammunition supply chains

Lead ore and sulfur join the mineable resources. Lead uses the existing smelter
batch convention: eight ore plus one coal produce eight ingots in eight seconds.
New worlds guarantee reachable starting patches; sulfur favors stone and gravel.
Old worlds receive accessible lead/sulfur patches without regenerating terrain or
changing existing deposits and buildings.

The 2×2 Mixer collects only one cycle of coal and sulfur, then makes two gunpowder
in two seconds. The former Ammunition Factory is now labeled **Assembler**;
its existing `ammo_factory` ID, sprite, footprint and construction costs remain
compatible. The Mixer and Assembler are in Production (E), turrets in Defense (T).

## Recipes

These are fictional game abstractions. Machines collect exact ingredients for a
single job. Completed products leave through their existing directional port;
blocked results remain in that job and prevent the next cycle.

| Recipe    | Ingredients                                 | Output      | Time |
| --------- | ------------------------------------------- | ----------- | ---- |
| Mixer     | 1 coal + 1 sulfur                           | 2 gunpowder | 2 s  |
| Primitive | 1 iron ingot + 1 coal                       | 1 box       | 2 s  |
| 5.56mm    | 1 iron ingot + 1 lead ingot + 1 gunpowder   | 1 box       | 3 s  |
| 7.62mm    | 2 iron ingots + 1 lead ingot + 1 gunpowder  | 1 box       | 3 s  |
| 155mm     | 4 iron ingots + 2 lead ingots + 3 gunpowder | 1 crate     | 6 s  |

## Defense

| Turret            | Box         | Shots/box | Capacity (shots) | Range | Shots/s | Damage |
| ----------------- | ----------- | --------- | ---------------- | ----- | ------- | ------ |
| Basic             | Primitive   | 30        | 90               | 15    | 2       | 8      |
| Light machine gun | 5.56mm      | 60        | 180              | 18    | 6       | 6      |
| Heavy machine gun | 7.62mm      | 40        | 120              | 21    | 3       | 14     |
| Artillery         | 155mm crate | 1         | 6                | 6–45  | 0.2     | 200    |

Conveyors, routers, junctions, tunnels, depots and trucks carry complete boxes.
Each turret admits only compatible boxes that fit completely. Each shot removes
one internal round. Empty ammo shows a red indicator; inspection lists caliber,
remaining shots, capacity, target and weapon statistics.

Artillery has a 3×3 footprint, slow rotation, a six-tile exclusion radius and a
five-second cooldown. Its visible arcing shell lands at the target's position at
launch, dealing full damage within two tiles. Fast enemies can evade it. Shells
still land if the initial target dies; friendly structures receive no blast damage.
Small bullets keep the existing homing impact mechanic. Armor is not a separate
mechanic in the current game; heavy guns distinguish themselves through damage.

## Configuration and architecture

- `src/data/ammunition.js`: logistics item IDs, box sizes and colors.
- `src/data/turrets.js`: caliber, capacities, range, rate, damage, rotation and projectiles.
- `src/data/recipes.js`: all recipe ingredients, yields and times.
- `src/data/buildings.js`: costs, footprints, categories and existing shared behaviors.
- `src/combat/Ammunition.js`: loading quantities and partial-box stock recovery.
- `src/combat/Weapons.js`: shared firing, projectile flight and impact logic.
- `src/persistence/SaveMigration.js`: historical loose-round conversion.

No runtime dependencies were added. All native module imports and assets remain
relative for GitHub Pages subdirectory hosting. Existing demolition and enemy
destruction rules still discard contents without refund. Rotating an existing
turret retains its loaded shots.

## Save compatibility

New snapshots use version 3. Versions 1 and 2 still load. Existing turret shot
counts remain unchanged; excess above the new basic capacity returns to stock.
Historical loose ammo becomes partial primitive boxes with an explicit round
count, keeping its exact shot value through all logistics and save/load.
Stock packs groups of 30 into boxes; an incomplete box appears as `N + Rr`.
Finished historical ammo jobs return their remaining rounds to inventory.
Unfinished historical ammo jobs refund their committed ingredients and restart
with the new recipe. Other active jobs retain their progress. Existing
uncommitted ingredients that no longer match the recipe return to inventory.

The old terrain generator remains selected for migrated saves, including future
reloads. Nine original terrain and texture-variant fingerprints verify this.
Historical aggregate item counters refer to the previous loose-round unit and
are not a new box-conservation baseline; physical resource/round quantities
are preserved independently.

## Verification

Run `npm run check` for all regression suites, lint, formatting, the 1,000-line
limit and static build. New suites cover production, mining, all calibers,
logistics, migration, impact/splash, range, rotation, resupply, UI and stress.
Original exact-content fingerprints are retained as historical fixtures, while
save continuation and historical terrain fingerprints remain active checks.

The stress scenario continuously supplies 100 mixed turrets through 300 logistics
buildings against 100 enemies for 1,200 ticks (200 warmup plus 1,000 measurements).
It asserts ammunition bounds, concurrent artillery and bounded projectiles.
Machine-specific timing is reported in `test-results/ammunition-performance.json`;
it measures simulation CPU time, not browser rendering or universal frame rate.

Real browser QA was unavailable during this update. The retained Chromium smoke
suite runs in the GitHub Pages workflow before deployment. The simulation/UI
harness and static module/asset checks are verified locally. Follow the manual
checklist below to assess appearance and gameplay feel.

## Manual checks

1. Mine lead/sulfur, smelt lead, feed the Mixer and select each Assembler recipe.
2. Block machine output, overfeed an ingredient and change the selected recipe.
3. Supply mixed boxes through belts, routers, crossings, tunnels and a depot.
4. Fill each turret, observe refusal of incompatible/full deliveries, then fire,
   exhaust it and resupply it. Rotate and demolish loaded turrets.
5. Select artillery: verify both range rings, slow aim, arcing shell, muzzle flash,
   explosion, splash, close targets ignored and friendly buildings intact.
6. Reload old and new saves; compare terrain, inventories, boxes and loaded shots.
7. Check item icons at conveyor scale and menus on desktop and a narrow viewport.
