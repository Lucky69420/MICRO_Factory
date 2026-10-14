const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}
function digest(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}
function fingerprint(game) {
  return digest({
    save: game.save(),
    terrain: [...game.grid.terrain],
    variants: [...game.grid.variants],
    transitions: [...game.grid.transitions],
  });
}
function place(game, type, x, y, direction = 0) {
  assert.equal(game.place(type, x, y, direction), "");
  return game.grid.get(x, y);
}
function inject(game, building, type, from) {
  assert(game.accept(building, type, from));
  game.produced++;
}

function runBaselines(API) {
  const results = {
    definitions: digest({
      config: API.CONFIG,
      resources: API.RESOURCES,
      buildings: API.BUILDINGS,
      recipes: API.RECIPES,
      start: API.START_INVENTORY,
    }),
    worlds: {},
    factory: {},
    logistics: {},
    combat: {},
  };
  for (const seed of ["micro-factory", "regression-world", "123456"])
    for (const width of [64, 150, 256]) {
      const game = new API.Game({ seed, width, height: width });
      results.worlds[`${seed}/${width}`] = fingerprint(game);
    }
  const factory = new API.Game({ seed: "parity-factory", terrain: false });
  place(factory, "miner", 69, 125);
  place(factory, "smelter", 70, 125);
  place(factory, "belt", 72, 125);
  place(factory, "miner", 69, 131, 3);
  for (const [x, y, direction] of [
    [69, 130, 3],
    [69, 129, 3],
    [69, 128, 0],
    [70, 128, 3],
    [70, 127, 3],
  ])
    place(factory, "belt", x, y, direction);
  for (let tick = 1; tick <= 6000; tick++) {
    factory.tick();
    if ([1, 40, 160, 1000, 3000, 6000].includes(tick))
      results.factory[tick] = fingerprint(factory);
  }
  const logistics = new API.Game({
    seed: "parity-logistics",
    terrain: false,
    creative: true,
  });
  place(logistics, "belt", 10, 10);
  const router = place(logistics, "router", 11, 10);
  place(logistics, "junction", 12, 10);
  assert.equal(logistics.placePair(13, 10, 19, 10), "");
  place(logistics, "belt", 20, 10);
  place(logistics, "belt", 11, 11, 1);
  for (let tick = 1; tick <= 1000; tick++) {
    const inlet = logistics.grid.get(10, 10);
    if (!inlet.item)
      inject(logistics, inlet, tick % 2 ? "iron" : "coal", [9, 10]);
    if (tick === 200) logistics.place("junction", 11, 10);
    if (tick === 400) logistics.destroy(logistics.grid.get(19, 10));
    if (tick === 600) logistics.placePair(13, 10, 19, 10);
    logistics.tick();
    if ([1, 40, 200, 400, 600, 1000].includes(tick))
      results.logistics[tick] = fingerprint(logistics);
  }
  assert(router.removed);
  const combat = new API.Game({
    seed: "parity-combat",
    terrain: false,
    creative: true,
  });
  const turret = place(combat, "turret", 72, 10);
  place(combat, "wall", 73, 5);
  for (let i = 0; i < 50; i++) inject(combat, turret, "basic_ammo", [71, 10]);
  combat.combat.enabled = true;
  for (let tick = 1; tick <= 1600; tick++) {
    combat.tick();
    if ([1, 100, 200, 400, 800, 1600].includes(tick))
      results.combat[tick] = fingerprint(combat);
  }
  return results;
}

function legacySave(API) {
  const game = new API.Game({
    seed: "legacy-save",
    width: 64,
    height: 64,
    terrain: false,
    creative: true,
  });
  for (const [key] of game.deposits) game.deposits.delete(key);
  const junction = place(game, "junction", 10, 10);
  inject(game, junction, "iron_wire", [9, 10]);
  inject(game, junction, "coal", [10, 9]);
  place(game, "router", 15, 10);
  game.placePair(20, 10, 26, 10);
  inject(game, game.grid.get(20, 10), "tin", [19, 10]);
  const lathe = place(game, "lathe", 30, 10);
  inject(game, lathe, "iron_ingot", [29, 10]);
  const wall = place(game, "wall", 10, 20);
  game.damage(wall, 10);
  const turret = place(game, "turret", 20, 20);
  inject(game, turret, "basic_ammo", [19, 20]);
  game.combat.spawn(10.5, 17.5);
  game.depot.queue.push("copper_plate");
  game.produced++;
  for (let tick = 0; tick < 20; tick++) game.tick();
  return game.save();
}
module.exports = { digest, fingerprint, runBaselines, legacySave };
