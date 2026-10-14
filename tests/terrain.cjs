(async () => {
  const assert = require("node:assert/strict"),
    fs = require("node:fs"),
    { Game, RESOURCES } = require("../src/core/index.js"),
    World = require("../src/world/index.js");
  const seeds = [
    "Estonia",
    "0",
    "hello",
    "mountains near spawn",
    "water near road",
    ...Array.from({ length: 100 }, (_, i) => "terrain-" + i),
  ];
  let totalTime = 0;
  for (const seed of seeds) {
    const t = performance.now(),
      g = new Game({ seed }),
      v = World.terrainValidation(g);
    totalTime += performance.now() - t;
    assert(v.valid, seed + ": " + v.problems);
    assert(v.wide[g.grid.key(g.spawner.x + 1, 1)]);
    assert(g.terrainValidation.startingLand >= 400);
    for (const [k] of g.deposits) {
      assert(v.reachable[k]);
      assert(g.grid.buildable(k % 150, Math.floor(k / 150)));
    }
    for (let y = g.parkY; y < 150; y++)
      for (let x = g.depot.x; x < g.depot.x + 3; x++) {
        assert.equal(g.grid.terrainAt(x, y), "road");
        assert(!g.resourceAt(x, y));
      }
    for (const p of World.startingSources(g)) {
      assert.equal(g.deposits.get(g.grid.key(p.x, p.y)), p.type);
      assert(v.wide[g.grid.key(p.x, p.y)]);
    }
    for (const x of [0, 1, 148, 149])
      for (const y of [10, 30, 60, 90])
        assert.equal(g.grid.terrainAt(x, y), "mountain");
  }
  for (const size of [64, 150, 256, 512]) {
    const a = new Game({ width: size, height: size, seed: "size-" + size }),
      b = new Game({ width: size, height: size, seed: "size-" + size });
    assert.deepEqual(a.grid.terrain, b.grid.terrain);
    assert.deepEqual(a.grid.variants, b.grid.variants);
    assert.deepEqual([...a.deposits], [...b.deposits]);
    assert(World.terrainValidation(a).valid);
  }
  const a = new Game({ seed: "Estonia" }),
    b = new Game({ seed: "another valley" });
  assert.notDeepEqual(a.grid.terrain, b.grid.terrain);
  for (const t of Object.values(World.TERRAIN))
    assert(a.grid.terrain.includes(t.id), t.name);
  // Every tile in a footprint must be buildable, even with Creative Mode enabled.
  let g = new Game({ seed: "placement", creative: true });
  for (const type of ["hill", "mountain", "water"]) {
    const k = g.grid.terrain.indexOf(World.TERRAIN[type].id),
      x = k % 150,
      y = Math.floor(k / 150);
    assert(g.place("belt", x, y));
    assert(!g.grid.get(x, y));
    assert(!g.combat.spawn(x + 0.5, y + 0.5));
  }
  g = new Game({ terrain: false, creative: true });
  g.grid.terrain[g.grid.key(11, 10)] = 6;
  assert(g.validate("smelter", 10, 10).includes("Water"));
  assert.equal(
    g.placePair(9, 10, 13, 10, 0),
    "",
    "Underground crosses natural obstacles",
  );
  assert(g.placePair(20, 10, 11, 10, 2), "Blocked endpoint rejected");
  // Sand prioritizes an ore overlay when present; mining itself never changes the floor.
  g = new Game({ seed: "sand", creative: true });
  const x = g.depot.x + 9,
    y = g.depot.y - 7;
  assert.equal(g.grid.terrainAt(x, y), "sand");
  assert.equal(g.resourceAt(x, y), "sand");
  assert.equal(g.place("miner", x, y, 0), "");
  assert.equal(g.place("belt", x + 1, y, 0), "");
  assert.equal(g.place("router", x + 2, y, 0), "");
  assert.equal(g.place("junction", x + 3, y, 0), "");
  assert.equal(g.placePair(x + 4, y, x + 8, y, 0), "");
  const sink = g.add("depot", x + 9, y, 0);
  sink.queue = [];
  for (let i = 0; i < 300; i++) g.tick();
  assert(sink.queue.length > 0);
  assert(sink.queue.every((t) => t === "sand"));
  assert.equal(g.grid.terrainAt(x, y), "sand");
  assert.equal(g.resourceAt(x, y), "sand");
  assert.equal(g.inspect(g.grid.get(x, y)).details.Resource, "Sand");
  assert(fs.existsSync("public/" + RESOURCES.sand.icon));
  g.deposits.set(g.grid.key(x, y), "iron");
  assert.equal(g.resourceAt(x, y), "iron");
  // Actual enemies route around a lake instead of crossing it; placed obstacles trigger replanning.
  g = new Game({
    terrain: false,
    creative: true,
    enemySpeed: 3,
    enemyDamage: 1,
    pathNodesPerTick: 20,
  });
  for (let yy = 4; yy < 16; yy++) g.grid.terrain[g.grid.key(18, yy)] = 6;
  const target = g.add("belt", 23, 10, 0),
    enemy = g.combat.spawn(13.5, 10.5);
  let sawDetour = false;
  for (let i = 0; i < 400; i++) {
    g.tick();
    assert(g.combat.pathNodes <= 20);
    assert(g.grid.passable(Math.floor(enemy.x), Math.floor(enemy.y)));
    if (enemy.y < 4 || enemy.y >= 16) sawDetour = true;
    if (g.combat.adjacent(enemy, target)) break;
  }
  assert(sawDetour);
  assert(g.combat.adjacent(enemy, target));
  g.combat.clear();
  const e = g.combat.spawn(13.5, 10.5);
  for (let i = 0; i < 200 && !e.path; i++) g.tick();
  assert(e.path);
  const next = e.path[e.pathIndex];
  assert.equal(g.place("belt", Math.floor(next[0]), Math.floor(next[1])), "");
  const oldVersion = e.pathVersion;
  g.tick();
  assert(
    !e.path || e.pathVersion !== oldVersion,
    "Network change invalidates the cached path",
  );
  // Deliberately sever the northern entrance; validator rejects it and broad carving repairs it.
  g = new Game({ seed: "repair" });
  for (let y = 4; y < 12; y++)
    for (let x = 0; x < 150; x++) {
      g.grid.terrain[g.grid.key(x, y)] = 5;
      g.deposits.delete(g.grid.key(x, y));
    }
  assert(!World.terrainValidation(g).valid);
  World.carvePass(
    g,
    g.spawner.x + 1,
    2,
    g.depot.x + 1,
    g.depot.y,
    new World.TerrainNoise(g.seed),
  );
  assert(World.terrainValidation(g).valid);
  assert(World.floodTerrain(g, 1)[g.grid.key(g.spawner.x + 1, 1)]);
  // Legacy/flat fixture construction remains available without losing road reservations.
  g = new Game({ terrain: false });
  assert.equal(g.grid.terrainAt(10, 10), "grass");
  assert.equal(g.grid.terrainAt(g.depot.x, g.parkY), "road");
  const u = await require("./ui.cjs").boot({ terrain: true });
  u.frame(1000);
  u.exec(
    "game=new Game({seed:'terrain UI',creative:true});cam.x=game.depot.x+10;cam.y=game.depot.y-7;game.place('miner',game.depot.x+9,game.depot.y-7)",
  );
  u.click(u.exec("game.depot.x+9"), u.exec("game.depot.y-7"));
  assert(u.elements["building-details"].innerHTML.includes("Sand"));
  u.frame(1200);
  assert(u.exec("TerrainArt.cache.size") > 0);
  assert(u.exec("TerrainArt.cache.size") <= 16);
  const prior = u.exec("TerrainArt.cache.size");
  u.frame(1300);
  assert.equal(u.exec("TerrainArt.cache.size"), prior);
  assert(u.elements["stock-sand"]);
  console.log(
    "PASS: " +
      seeds.length +
      " seeds, 64/150/256/512 determinism, wide spawn/resource routes, clear road, border, footprint/creative restrictions, sand mining and complete logistics, lake detours, repathing, adversarial repair, terrain cache and sand UI. Mean 150x150 generation+independent validation " +
      (totalTime / seeds.length).toFixed(1) +
      " ms.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
