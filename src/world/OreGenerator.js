import { SeededRandom } from "./SeededRandom.js";
import { startingSources } from "./MapValidator.js";
const DEPOSIT_CONFIG = {
  iron: { min: 8, max: 25, weight: 4 },
  coal: { min: 8, max: 20, weight: 4 },
  copper: { min: 6, max: 20, weight: 2 },
  tin: { min: 5, max: 15, weight: 2 },
  lead: { min: 8, max: 22, weight: 3 },
  sulfur: { min: 8, max: 20, weight: 3 },
  spacing: 9,
  patchesPer10000: 26,
};
function generateDeposits(game, settings = {}) {
  const cfg = { ...DEPOSIT_CONFIG, ...settings },
    rng = new SeededRandom(game.seed),
    grid = game.grid,
    centers = [];
  game.depositPatches = [];
  const allowed = (x, y) =>
    (!game.sandSource ||
      (x - game.sandSource.x) ** 2 + (y - game.sandSource.y) ** 2 > 11) &&
    grid.inside(x, y) &&
    grid.buildable(x, y) &&
    grid.reachable?.[grid.key(x, y)] &&
    !grid.get(x, y) &&
    !game.road(x, y) &&
    !game.reserved(x, y) &&
    !game.deposits.has(grid.key(x, y));
  function patch(type, x, y) {
    const rule = { ...DEPOSIT_CONFIG[type], ...cfg[type] },
      target = rng.integer(rule.min, rule.max),
      frontier = [[x, y]],
      seen = new Set(),
      tiles = [];
    while (frontier.length && tiles.length < target) {
      const index = rng.integer(0, frontier.length - 1),
        [tx, ty] = frontier[index];
      frontier[index] = frontier[frontier.length - 1];
      frontier.pop();
      const key = grid.key(tx, ty);
      if (seen.has(key)) continue;
      seen.add(key);
      if (!allowed(tx, ty)) continue;
      game.deposits.set(key, type);
      tiles.push([tx, ty]);
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ])
        if (allowed(tx + dx, ty + dy)) frontier.push([tx + dx, ty + dy]);
    }
    if (tiles.length) {
      centers.push([x, y]);
      game.depositPatches.push({ type, x, y, tiles });
    }
  }
  // Guaranteed seeds are near the start, with copper/tin farther out and open building space.
  for (const p of startingSources(game)) patch(p.type, p.x, p.y);
  const weighted = [];
  for (const type of game.config.contentVersion >= 3
    ? ["iron", "coal", "copper", "tin", "lead", "sulfur"]
    : ["iron", "coal", "copper", "tin"])
    for (let i = 0; i < cfg[type].weight; i++) weighted.push(type);
  const count = Math.round(
    ((grid.width * grid.height) / 10000) * cfg.patchesPer10000,
  );
  for (let i = 0, tries = 0; i < count && tries < count * 30; tries++) {
    const x = rng.integer(4, grid.width - 5),
      y = rng.integer(4, grid.height - 5);
    if (
      centers.some((p) => Math.hypot(x - p[0], y - p[1]) < cfg.spacing) ||
      Math.hypot(x - game.depot.x, y - game.depot.y) < 12 ||
      !allowed(x, y)
    )
      continue;
    const type = weighted[rng.integer(0, weighted.length - 1)];
    if (
      type === "sulfur" &&
      !["stone", "gravel", "rock"].includes(grid.terrainAt(x, y)) &&
      tries < count * 15
    )
      continue;
    patch(type, x, y);
    i++;
  }
}
export { DEPOSIT_CONFIG, generateDeposits };
