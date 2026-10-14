const assert = require("node:assert/strict");
const { mkdirSync, writeFileSync } = require("node:fs");
const { performance } = require("node:perf_hooks");
const { Game, TURRETS, AMMUNITION } = require("../src/core/index.js");
const g = new Game({
  terrain: false,
  creative: true,
  enemyCap: 100,
  enemyHp: 100000,
  enemySpeed: 0,
  enemyDamage: 0,
});
const types = Object.keys(TURRETS),
  lanes = [];
const place = (type, x, y) => {
  assert.equal(g.place(type, x, y), "");
  return g.grid.get(x, y);
};
for (let row = 0; row < 10; row++)
  for (let col = 0; col < 10; col++) {
    const x = 20 + col * 7,
      y = 30 + row * 7,
      type = types[(row + col) % types.length];
    const b = place(type, x, y),
      inlet = place("belt", x - 3, y);
    place("router", x - 2, y);
    place("junction", x - 1, y);
    const spec = TURRETS[type];
    for (let box = 0; box < spec.capacity / AMMUNITION[spec.ammo].rounds; box++)
      assert(g.accept(b, spec.ammo, [x - 1, y]));
    b.angle = -Math.PI / 2;
    lanes.push({ b, inlet, spec });
  }
for (let i = 0; i < 100; i++)
  assert(g.combat.spawn(18 + (i % 20) * 3, 12 + Math.floor(i / 20) * 2));
const samples = [];
let peakShells = 0,
  peakProjectiles = 0;
for (let tick = 0; tick < 1200; tick++) {
  for (const { inlet, spec } of lanes)
    if (!inlet.item) assert(g.accept(inlet, spec.ammo, [inlet.x - 1, inlet.y]));
  const start = performance.now();
  g.tick();
  if (tick >= 200) samples.push(performance.now() - start);
  peakShells = Math.max(
    peakShells,
    g.combat.projectiles.filter((p) => p.artillery).length,
  );
  peakProjectiles = Math.max(peakProjectiles, g.combat.projectiles.length);
  assert(g.combat.pathNodes <= g.config.pathNodesPerTick);
  for (const { b, spec } of lanes)
    assert(b.ammo >= 0 && b.ammo <= spec.capacity && Number.isInteger(b.ammo));
}
assert(peakShells >= 2, "Multiple artillery shells coexist");
assert(peakProjectiles < 1000, "Projectiles remain bounded");
samples.sort((a, b) => a - b);
const result = {
  turrets: 100,
  logisticsBuildings: 300,
  enemies: 100,
  measuredTicks: samples.length,
  meanMs: samples.reduce((a, b) => a + b) / samples.length,
  p95Ms: samples[Math.floor(samples.length * 0.95)],
  peakProjectiles,
  peakShells,
};
mkdirSync("test-results", { recursive: true });
writeFileSync(
  "test-results/ammunition-performance.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log("PASS: continuously supplied mixed defense stress test.", result);
