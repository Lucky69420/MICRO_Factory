import { migrateSave } from "./SaveMigration.js";
import { ensureContentDeposits } from "../world/ContentDeposits.js";
import * as F from "../data/index.js";
import { RECIPES } from "../data/recipes.js";
const fields = [
  "type",
  "x",
  "y",
  "dir",
  "hp",
  "progress",
  "item",
  "channels",
  "input",
  "recipe",
  "ore",
  "coal",
  "batch",
  "mode",
  "turn",
  "ammo",
  "cooldown",
  "angle",
  "queue",
];
const counters = [
  "tickCount",
  "time",
  "spent",
  "delivered",
  "produced",
  "discarded",
  "fuelConsumed",
  "convertedGain",
  "ammoConsumed",
];
export function saveGame(game) {
  const buildings = [...game.entities].map((b) =>
    Object.fromEntries(
      fields.filter((k) => b[k] !== undefined).map((k) => [k, b[k]]),
    ),
  );
  const combat = game.combat;
  return JSON.parse(
    JSON.stringify({
      version: 3,
      ammoRemainders: game.ammoRemainders,
      config: { ...game.config, seed: game.seed, creative: game.creative },
      seed: game.seed,
      creative: game.creative,
      stock: game.stock,
      counters: Object.fromEntries(counters.map((k) => [k, game[k]])),
      depot: {
        x: game.depot.x,
        y: game.depot.y,
        removed: !!game.depot.removed,
      },
      deposits: [...game.deposits],
      truck: game.truck,
      buildings,
      links: [...game.undergroundLinks].map((l) => ({
        entrance: l.entrance.id,
        exit: l.exit.id,
        distance: l.distance,
        pipeline: l.pipeline,
      })),
      combat: {
        enabled: combat.enabled,
        spawnTimer: combat.spawnTimer,
        nextId: combat.nextId,
        enemies: [...combat.enemies.values()].map((e) => ({
          ...e,
          targetId: e.target?.id,
          target: undefined,
          pathVersion: undefined,
        })),
        projectiles: combat.projectiles,
        effects: combat.effects,
      },
    }),
  );
}
export function loadGame(data, Game) {
  if (
    !data ||
    ![1, 2, 3].includes(data.version) ||
    !Array.isArray(data.buildings)
  )
    throw new Error("Unsupported factory save.");
  const snapshot = migrateSave(JSON.parse(JSON.stringify(data))),
    g = new Game({
      ...snapshot.config,
      seed: snapshot.seed,
      creative: snapshot.creative,
    });
  // Construct into a fresh game so malformed saves cannot damage the running world.
  for (const b of [...g.entities]) g.destroy(b);
  Object.assign(g.stock, snapshot.stock);
  g.ammoRemainders = snapshot.ammoRemainders || {};
  for (const k of counters) g[k] = snapshot.counters?.[k] || 0;
  g.tickCount = snapshot.counters?.tickCount || 0;
  for (const [k] of g.deposits) g.deposits.delete(k);
  for (const [k, v] of snapshot.deposits || []) g.deposits.set(k, v);
  for (const state of snapshot.buildings) {
    const def = F.BUILDINGS[state.type];
    if (!def || !Number.isInteger(state.x) || !Number.isInteger(state.y))
      throw new Error("Invalid saved building.");
    for (let y = state.y; y < state.y + def.size; y++)
      for (let x = state.x; x < state.x + def.size; x++)
        if (!g.grid.inside(x, y) || g.grid.get(x, y))
          throw new Error("Invalid saved footprint.");
    const b = g.add(state.type, state.x, state.y, state.dir);
    for (const k of fields)
      if (k in state && !["type", "x", "y", "dir"].includes(k)) {
        if (k === "channels") {
          b.channels.horizontal = state.channels.horizontal;
          b.channels.vertical = state.channels.vertical;
        } else b[k] = state[k];
      }
    if (b.type === "depot") g.depot = b;
    if (b.type === "smelter" || b.isProcessor) {
      // Recover historical stockpiles to global stock. An in-flight job is retained.
      for (const type of state.output || []) g.stock[type]++;
      if (snapshot.version === 1) {
        if (b.batch) {
          const r =
            RECIPES[b.batch.id] ||
            RECIPES["smelter_" + b.batch.type?.replace("_ingot", "")];
          if (!r) throw new Error("Unknown saved recipe.");
          b.batch = {
            ...r,
            ...b.batch,
            inputs: { ...r.inputs },
            outputs: { ...r.outputs },
          };
        }
        g.reclaimInputs(b);
      } else if (!b.batch) {
        const r = g.machineRecipe(b),
          used = {};
        const recover = (items) =>
          items.filter((type) => {
            used[type] = (used[type] || 0) + 1;
            if (used[type] <= (r?.inputs[type] || 0)) return true;
            g.stock[type]++;
            return false;
          });
        b.input = recover(b.input);
        b.ore = recover(b.ore);
        const excess = Math.max(0, b.coal - (r?.inputs.coal || 0));
        b.coal -= excess;
        g.stock.coal += excess;
      } else g.reclaimInputs(b);
    }
  }
  if (snapshot.depot?.removed) {
    g.depot = {
      ...g.depot,
      ...snapshot.depot,
      type: "depot",
      size: 3,
      queue: [],
      removed: true,
    };
  }
  g.parkY = g.depot.y + 3;
  g.truck = snapshot.truck;
  for (const state of snapshot.links || []) {
    const a = g.grid.get(
        state.entrance % g.config.width,
        Math.floor(state.entrance / g.config.width),
      ),
      b = g.grid.get(
        state.exit % g.config.width,
        Math.floor(state.exit / g.config.width),
      );
    if (
      a?.type !== "underground" ||
      b?.type !== "underground" ||
      a.connection ||
      b.connection
    )
      throw new Error("Invalid saved tunnel.");
    const link = {
      entrance: a,
      exit: b,
      distance: state.distance,
      pipeline: state.pipeline,
    };
    a.link = b;
    b.link = a;
    a.connection = b.connection = link;
    g.undergroundLinks.add(link);
    g.grid.indexLink(link);
  }
  for (const b of g.entities) g.network.refreshAround(b);
  const c = snapshot.combat;
  if (c) {
    Object.assign(g.combat, {
      enabled: c.enabled,
      spawnTimer: c.spawnTimer,
      nextId: c.nextId,
      projectiles: c.projectiles,
      effects: c.effects,
    });
    for (const e of c.enemies) {
      e.target = [...g.entities].find((b) => b.id === e.targetId) || null;
      delete e.targetId;
      e.pathVersion = g.network.version;
      g.combat.enemies.set(e.id, e);
    }
    g.combat.index();
  }
  if (data.version < 3) ensureContentDeposits(g);
  g.freezeInterpolation();
  return g;
}
