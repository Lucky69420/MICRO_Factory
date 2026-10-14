import { BUILDINGS, RESOURCES } from "../data/index.js";
import { DIRS } from "../utils/directions.js";

import * as WorldAPI from "../world/index.js";

export function replacementCompatible(game, old, type, x, y) {
  const next = BUILDINGS[type],
    prior = BUILDINGS[old.type];
  return (
    old.type !== "depot" &&
    old.x === x &&
    old.y === y &&
    prior.replacementGroup === next.replacementGroup &&
    prior.footprint[0] === next.footprint[0] &&
    prior.footprint[1] === next.footprint[1]
  );
}
export function planPlacement(game, type, x, y, dir = 0, budget = game.stock) {
  const old = game.grid.get(x, y),
    plan = {
      type,
      x,
      y,
      dir: ((dir % 4) + 4) % 4,
      old: null,
      action: "place",
      cost: {},
      error: "",
    };
  const fail = (error) => ({ ...plan, error });
  if (type === "demolish")
    return old && old.type !== "depot"
      ? { ...plan, old, action: "demolish" }
      : fail(old ? "The depot is permanent." : "Choose a building to remove.");
  const spec = BUILDINGS[type];
  if (!spec || type === "depot") return fail("Select a building first.");
  for (let yy = y; yy < y + spec.size; yy++)
    for (let xx = x; xx < x + spec.size; xx++) {
      if (!game.grid.inside(xx, yy))
        return fail("Outside the factory boundary.");
      if (game.road(xx, yy)) return fail("Keep the truck road clear.");
      if (game.reserved(xx, yy))
        return fail("Keep the northern spawner clear.");
      if (!game.grid.buildable(xx, yy))
        return fail(
          WorldAPI.TERRAIN[game.grid.terrainAt(xx, yy)].name +
            " cannot be built on.",
        );
      const cell = game.grid.get(xx, yy);
      if (cell) {
        if (cell !== old || !game.replacementCompatible(cell, type, x, y))
          return fail("Incompatible building or footprint.");
        plan.old = cell;
      }
    }
  if (type === "miner" && !game.resourceAt(x, y))
    return fail("Miners need an ore deposit or sandy terrain.");
  if (plan.old) {
    plan.action =
      plan.old.type === type && type !== "underground"
        ? spec.rotatable && plan.old.dir !== plan.dir
          ? "rotate"
          : "noop"
        : "replace";
  }
  plan.cost =
    game.creative || ["rotate", "noop"].includes(plan.action)
      ? {}
      : { ...game.cost(type) };
  const missing = Object.entries(plan.cost)
    .filter(([r, n]) => (budget[r] || 0) < n)
    .map(([r, n]) => `${n - (budget[r] || 0)} ${RESOURCES[r].name}`);
  if (missing.length) return fail("Missing: " + missing.join(", "));
  return plan;
}
export function validate(game, type, x, y, dir = 0) {
  return game.planPlacement(type, x, y, dir).error;
}
export function planPair(game, x, y, ex, ey, dir = 0, budget = game.stock) {
  dir = ((dir % 4) + 4) % 4;
  const [dx, dy] = DIRS[dir],
    distance = (ex - x) * dx + (ey - y) * dy,
    a = game.grid.get(x, y),
    b = game.grid.get(ex, ey),
    same =
      a?.type === "underground" &&
      a.mode === "entrance" &&
      a.link === b &&
      b?.mode === "exit" &&
      a.dir === dir &&
      b.dir === dir,
    plan = {
      type: "underground",
      kind: "pair",
      x,
      y,
      ex,
      ey,
      dir,
      action: same ? "noop" : a || b ? "replace" : "place",
      cost: game.creative || same ? {} : { ...game.cost("underground") },
      error: "",
    };
  if (
    !Number.isInteger(distance) ||
    distance < 2 ||
    distance > game.config.undergroundRange ||
    ex !== x + dx * distance ||
    ey !== y + dy * distance
  )
    return {
      ...plan,
      error: `Place the exit 2–${game.config.undergroundRange} tiles ahead, in the same direction.`,
    };
  const funds = same
    ? Object.fromEntries(Object.keys(RESOURCES).map((r) => [r, Infinity]))
    : budget;
  plan.error =
    game.planPlacement("underground", x, y, dir, funds).error ||
    game.planPlacement("underground", ex, ey, dir, funds).error;
  return plan;
}
export function validatePair(game, x, y, ex, ey, dir) {
  return game.planPair(x, y, ex, ey, dir).error;
}
export function placePair(game, x, y, ex, ey, dir = 0) {
  const plan = game.planPair(x, y, ex, ey, dir);
  if (plan.error) return plan.error;
  if (plan.action === "noop") return "";
  dir = plan.dir;
  game.consume("underground");
  const oldA = game.grid.get(x, y),
    oldB = game.grid.get(ex, ey);
  if (oldA) game.destroy(oldA);
  if (oldB && game.entities.has(oldB)) game.destroy(oldB);
  const a = game.add("underground", x, y, dir),
    b = game.add("underground", ex, ey, dir);
  a.mode = "entrance";
  b.mode = "exit";
  a.link = b;
  b.link = a;
  const connection = {
    entrance: a,
    exit: b,
    distance: Math.abs(x - ex) + Math.abs(y - ey),
    pipeline: [],
  };
  a.connection = b.connection = connection;
  game.undergroundLinks.add(connection);
  game.grid.indexLink(connection);
  game.network.refreshAround(a);
  game.network.refreshAround(b);
  return "";
}
export function place(game, type, x, y, dir = 0) {
  if (type === "underground") return "Place an entrance and exit as a pair.";
  const p = game.planPlacement(type, x, y, dir);
  if (p.error) return p.error;
  if (p.action === "noop") return "";
  if (p.action === "rotate") {
    game.rotateBuilding(p.old, p.dir);
    return "";
  }
  if (p.old) game.destroy(p.old);
  if (p.action === "demolish") return "";
  for (const [r, n] of Object.entries(p.cost)) {
    game.stock[r] -= n;
    game.spent += n;
  }
  game.add(type, x, y, p.dir);
  return "";
}
export function rotateBuilding(game, b, dir) {
  if (!b || !game.entities.has(b) || !BUILDINGS[b.type].rotatable) return false;
  if (b.type === "underground" && b.link) return false;
  b.dir = ((dir % 4) + 4) % 4;
  game.network.refreshAround(b);
  return true;
}
