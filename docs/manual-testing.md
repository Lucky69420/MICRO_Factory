# Manual regression checklist

Use `npm run dev` or the Pages URL in a fresh test browser profile. Keep a
separate production save/profile. For comparisons, use the same world seed,
settings and action sequence in the original and refactored checkouts.

| Area           | Reproduction                                                                             | Expected result                                                                            |
| -------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| World          | Settings → New World; enter the same seed twice                                          | Same terrain/ores, northern spawn access, clear southern road                              |
| Terrain        | Try walls/multi-tile machines on water, mountains and road, including Creative Mode      | Invalid surface endpoints rejected; stock unchanged                                        |
| Placement      | Drag belts across 50+ tiles with a turn, backtrack, then release                         | Continuous route, no duplicate costs, corner orientations correct                          |
| Replacement    | Rotate a loaded belt by placement; replace it with a router/junction                     | Rotation keeps contents/free cost; replacement follows existing cost/content removal rules |
| Footprints     | Drag smelters, cross existing machines, release over a panel; cancel a preview           | Footprint spacing retained; blocked cells skipped; cancel/panel release builds nothing     |
| Routing        | Feed a router with several outlets, block one branch, then unblock it                    | Fair distribution, no transfer back into the input belt, no loss or duplication            |
| Junctions      | Cross simultaneous ore and coal streams in each direction                                | Independent straight lanes, instant multi-crossing transfer, independent blockage          |
| Tunnels        | Build tunnels under machines, terrain and road; block/unblock the exit                   | FIFO/timing match belts; no crossing interference; blocked items retained                  |
| Production     | Feed 8 iron ore + 1 coal into a smelter; route results into a bender                     | Existing recipes/rates; one committed job; output blockage prevents another cycle          |
| Recipe changes | Switch a processor with partial ingredients, then with an active job                     | Partial ingredients return to stock; active job keeps original recipe                      |
| Mining         | Place miners on ore and sand, block outputs, then reconnect                              | Correct resources, backpressure and unlimited sand                                         |
| Truck          | Route output into depot; dispatch partial cargo; allow an automatic full trip            | Stock credited once after departure; return timing and road unchanged                      |
| Combat         | Enable spawning, feed ammo physically to a turret, place walls, remove/rebuild obstacles | Existing spawn cap/range/damage, nearest targeting, wall attacks and repathing             |
| Controls       | Try category keys, number slots, R/Shift+R, Escape, arrows, middle drag and zoom         | Same selection, rotations, cancellation and camera behavior                                |
| Rebinding      | Change a binding; try a duplicate/number; reload/reset                                   | Valid keys persist; conflicts rejected; typing in seed/binding controls does not build     |
| UI             | Toggle inventory/palette; inspect each building; change grid/debug settings              | Same layout, icons, HP, recipe details and collapsed state behavior                        |
| Creative       | Toggle on/off, build tunnels/machines, create a new world                                | Free construction only; no ammo/items granted; setting persists                            |
| Saves          | Save a live factory with jobs, loaded logistics, tunnels and combat; reload              | State/stock restored, graph rebuilt, continued production/combat                           |
| Bad save       | In a disposable profile, store invalid JSON under `microfactory.factory`, then load      | Error toast; current factory retained                                                      |
| Pause/tab      | Pause, switch tabs, return, resume; inspect far-off production                           | No hidden catch-up burst; camera-independent simulation and interpolation retained         |
| Small screens  | Resize below 600px and inspect menus/settings                                            | Existing responsive layout; controls usable and no missing artwork                         |

These are reproducible procedures, not a claim that all were manually executed.
The automated suites cover their simulation/handler equivalents. Chromium CI
adds native module loading, assets, placement/costs, inspection, save/load,
settings persistence and desktop/mobile screenshots.
