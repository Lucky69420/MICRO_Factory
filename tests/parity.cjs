const assert = require("node:assert/strict");
const API = require("../src/core/index.js");
const { runBaselines, fingerprint } = require("./support/scenarios.cjs");
const expected = require("./fixtures/original-baseline.json");
const legacy = require("./fixtures/legacy-v2-save.json");

assert.deepEqual(
  runBaselines(API),
  expected,
  "Simulation changed from commit 686c515",
);
const restored = API.Game.fromSave(legacy);
assert.equal(restored.grid.get(10, 10).channels.horizontal.type, "iron_wire");
assert.equal(restored.grid.get(10, 10).channels.vertical.type, "coal");
assert.equal(restored.grid.get(20, 10).connection.pipeline.length, 1);
assert(restored.grid.get(30, 10).batch);
assert.equal(restored.combat.enemies.size, 1);
const reloaded = API.Game.fromSave(restored.save());
for (let tick = 0; tick < 200; tick++) {
  restored.tick();
  reloaded.tick();
}
assert.equal(
  fingerprint(restored),
  fingerprint(reloaded),
  "Save roundtrip changed continued simulation",
);
console.log(
  "PASS: original definition digest, nine generated worlds, 18 simulation checkpoints and original v2 save continuation.",
);
