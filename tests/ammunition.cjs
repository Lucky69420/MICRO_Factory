const assert = require("node:assert/strict");
const {
  Game,
  AMMUNITION,
  TURRETS,
  RECIPES,
  BUILDINGS,
} = require("../src/core/index.js");
const flat = (config = {}) =>
  new Game({
    terrain: false,
    creative: true,
    enemySpeed: 0,
    enemyDamage: 0,
    ...config,
  });
const place = (g, t, x, y, d = 0) => {
  assert.equal(g.place(t, x, y, d), "");
  return g.grid.get(x, y);
};
const run = (g, seconds) => {
  for (let i = 0; i < Math.round(seconds / g.config.step); i++) g.tick();
};
const feed = (g, b, type, item) =>
  assert(g.accept(b, type, [b.x - 1, b.y], undefined, item));
// World generation is deterministic, reachable, and supplies every chain on small and large worlds.
for (const seed of ["ammo-world", "micro-factory", "rocks", "tiny"])
  for (const width of [64, 150, 256]) {
    const g = new Game({ seed, width, height: width, creative: true });
    assert(g.terrainValidation.valid);
    for (const type of ["lead", "sulfur"]) {
      const deposits = [...g.deposits].filter(([, t]) => t === type);
      assert(deposits.length >= 8, `${seed}/${width}: insufficient ${type}`);
      const key = deposits[0][0],
        x = key % width,
        y = Math.floor(key / width);
      assert(g.grid.reachable[key]);
      const drill = place(g, "miner", x, y);
      run(g, 2);
      assert.equal(drill.item.type, type);
    }
  }
// All new jobs use the existing single-cycle processor; exact ingredients and blocked output survive reload.
for (const id of [
  "smelter_lead",
  "gunpowder",
  "primitive_ammo",
  "ammo_556",
  "ammo_762",
  "artillery_shell",
]) {
  const g = flat(),
    r = RECIPES[id],
    b = place(g, r.machine, 20, 20);
  assert(g.setRecipe(b, id));
  for (const [type, n] of Object.entries(r.inputs)) {
    for (let i = 0; i < n; i++) feed(g, b, type);
    assert(!g.accept(b, type, [19, 20]), `${id}: excess ${type}`);
  }
  run(g, r.seconds + 0.5);
  assert.deepEqual(b.batch.remaining, r.outputs);
  assert(!g.accept(b, r.input, [19, 20]));
  const h = Game.fromSave(g.save()),
    restored = h.grid.get(20, 20);
  assert.deepEqual(restored.batch.remaining, r.outputs);
  const belt = place(h, "belt", 22, 20),
    delivered = [];
  for (let i = 0; i < 400; i++) {
    h.tick();
    if (belt.item) {
      delivered.push(belt.item.type);
      belt.item = null;
    }
  }
  assert.deepEqual(delivered, Array(r.outputCount).fill(r.output));
  assert.equal(restored.batch, null);
}
// Every caliber rejects other boxes, keeps full-box backpressure, consumes deterministically and resumes.
for (const [type, spec] of Object.entries(TURRETS)) {
  const g = flat({ enemyHp: 10000 }),
    b = place(g, type, 20, 20),
    a = AMMUNITION[spec.ammo];
  assert.equal(g.turrets.size, 1);
  assert(b.inputNode);
  for (const other of Object.keys(AMMUNITION))
    if (other !== spec.ammo) assert(!g.accept(b, other, [19, 20]));
  assert(!g.accept(b, "basic_ammo", [19, 20]));
  for (let n = 0; n < spec.capacity / a.rounds; n++) feed(g, b, spec.ammo);
  assert.equal(b.ammo, spec.capacity);
  assert(!g.accept(b, spec.ammo, [19, 20]));
  const near = g.combat.spawn(21 + spec.minRange + 2, 21);
  b.angle = 0;
  g.tick();
  assert.equal(b.ammo, spec.capacity - 1);
  assert.equal(near.hp, 10000, "Damage occurs on impact only");
  if (a.rounds > 1)
    assert(!g.accept(b, spec.ammo, [19, 20]), "Whole box must fit");
  run(g, 1);
  assert(near.hp < 10000);
  assert(g.inspect(b).details["Accepted ammunition"].includes(a.name));
  b.ammo = 0;
  b.cooldown = 0;
  g.combat.projectiles = [];
  run(g, 1);
  assert.equal(b.ammo, 0);
  assert.equal(g.combat.projectiles.length, 0);
  feed(g, b, spec.ammo);
  g.tick();
  assert.equal(b.ammo, a.rounds - 1);
  const saved = Game.fromSave(g.save());
  assert.equal(saved.grid.get(20, 20).ammo, b.ammo);
  g.destroy(b);
  assert.equal(g.turrets.size, 0);
  assert(!g.grid.get(21, 21));
}
// All boxes cross routers/junctions/tunnels unchanged, reaching only compatible turrets.
for (const [type, spec] of Object.entries(TURRETS))
  for (const d of [0, 1, 2, 3]) {
    const g = flat(),
      [dx, dy] = [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ][d];
    assert.equal(g.placePair(30, 30, 30 + dx * 6, 30 + dy * 6, d), "");
    assert(g.accept(g.grid.get(30, 30), spec.ammo, [30 - dx, 30 - dy]));
    const exit = g.grid.get(30 + dx * 6, 30 + dy * 6);
    g.tick();
    assert.equal(exit.item, null);
    run(g, 4);
    assert.equal(exit.item.type, spec.ammo);
    assert.equal(exit.item.rounds, undefined);
    const router = place(g, "router", 50, 50),
      junction = place(g, "junction", 51, 50),
      b = place(g, type, 52, 50);
    feed(g, router, spec.ammo);
    g.tick();
    assert.equal(b.ammo, AMMUNITION[spec.ammo].rounds);
    assert.equal(router.item, null);
    assert.equal(junction.channels.horizontal, null);
  }
// Mixed routers distribute boxes to compatible recipients and retain incompatible packets.
{
  const g = flat(),
    r = place(g, "router", 20, 20),
    light = place(g, "light_turret", 21, 20),
    heavy = place(g, "heavy_turret", 19, 21);
  feed(g, r, "ammo_762");
  g.tick();
  assert.equal(heavy.ammo, 40);
  assert.equal(light.ammo, 0);
  feed(g, r, "ammo_556");
  g.tick();
  assert.equal(light.ammo, 60);
  feed(g, r, "artillery_shell");
  run(g, 2);
  assert.equal(r.item.type, "artillery_shell");
  // Capacity check follows partial historical box metadata through instant chains.
  light.ammo = 179;
  r.item = null;
  feed(g, r, "ammo_556", { type: "ammo_556", rounds: 1 });
  g.tick();
  assert.equal(light.ammo, 180);
}
// Artillery respects minimum/maximum range, slow rotation, fixed impacts, splash and friendly immunity.
{
  const g = flat({ enemyHp: 500 }),
    b = place(g, "artillery", 20, 20),
    close = g.combat.spawn(24, 21.5),
    far = g.combat.spawn(70, 21.5);
  feed(g, b, "artillery_shell");
  run(g, 1);
  assert.equal(b.ammo, 1);
  const a = g.combat.spawn(40, 21.5),
    neighbor = g.combat.spawn(40.8, 21.5),
    outside = g.combat.spawn(43, 21.5),
    wall = place(g, "wall", 39, 22);
  g.tick();
  assert.equal(b.ammo, 0);
  assert.equal(g.combat.projectiles.length, 1);
  assert(g.combat.projectiles[0].artillery);
  const h = Game.fromSave(g.save());
  run(g, 2);
  run(h, 2);
  assert.equal(a.hp, 300);
  assert.equal(neighbor.hp, 300);
  assert.equal(outside.hp, 500);
  assert.equal(close.hp, 500);
  assert.equal(far.hp, 500);
  assert.equal(wall.hp, wall.maxHp);
  assert.equal(h.combat.enemies.get(a.id).hp, a.hp);
  assert.deepEqual(h.save(), g.save());
  feed(g, b, "artillery_shell");
  run(g, 1);
  assert.equal(b.ammo, 1, "Five-second cooldown");
}
{
  const g = flat(),
    b = place(g, "artillery", 20, 20);
  feed(g, b, "artillery_shell");
  g.combat.spawn(21.5, 40);
  g.tick();
  assert.equal(b.ammo, 1);
  assert(b.angle > 0 && b.angle <= 0.65 * g.config.step + 1e-9);
  run(g, 3);
  assert.equal(b.ammo, 0);
}
// Historical loose rounds retain exactly their value in stock, packets, turrets and completed jobs.
{
  const old = require("./fixtures/legacy-v2-save.json");
  const snapshot = JSON.parse(JSON.stringify(old));
  snapshot.stock.basic_ammo = 61;
  const gun = snapshot.buildings.find((b) => b.type === "turret");
  gun.ammo = 17;
  const belt = snapshot.buildings.find((b) => b.type === "junction");
  belt.channels.horizontal.type = "basic_ammo";
  snapshot.truck.cargo = ["basic_ammo"];
  snapshot.links[0].pipeline[0].item.type = "basic_ammo";
  const before = JSON.parse(JSON.stringify(snapshot));
  const g = Game.fromSave(snapshot);
  assert.equal(g.stock.primitive_ammo, 2);
  assert.equal(g.ammoRemainders.primitive_ammo, 1);
  assert(!Object.hasOwn(g.stock, "basic_ammo"));
  assert.equal(g.grid.get(gun.x, gun.y).ammo, 17);
  assert.equal(g.grid.get(belt.x, belt.y).channels.horizontal.rounds, 1);
  assert.equal([...g.undergroundLinks][0].pipeline[0].item.rounds, 1);
  assert.equal(g.truck.cargo[0].rounds, 1);
  assert([...g.deposits.values()].includes("lead"));
  assert([...g.deposits.values()].includes("sulfur"));
  const h = Game.fromSave(g.save());
  assert.deepEqual(h.save(), g.save());
  assert.deepEqual(snapshot, before); // Input snapshot itself is never changed.
}
assert.equal(BUILDINGS.mixer.category, "production");
assert.equal(BUILDINGS.ammo_factory.name, "Assembler");
assert.equal(TURRETS.turret.range, 15);
console.log(
  "PASS: new ores/mining, six multi-input chains, exact box loading, all logistics, mixed caliber backpressure, every turret, artillery impact/splash/rotation/range/cooldown, v2 migration and v3 continuation.",
);
