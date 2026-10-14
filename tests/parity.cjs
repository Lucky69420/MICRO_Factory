const assert = require("node:assert/strict");
const API = require("../src/core/index.js");
const { fingerprint } = require("./support/scenarios.cjs");
const legacy = require("./fixtures/legacy-v2-save.json");

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
  "PASS: original v2 save migration and deterministic continuation after v3 roundtrip.",
);

// v2 world regeneration retains the exact historical landscape while adding ores safely.
const { createHash } = require("node:crypto");
for (const row of require("./fixtures/legacy-terrain-hashes.json")) {
  const g = new API.Game({
    seed: row.seed,
    width: row.width,
    height: row.width,
    contentVersion: 2,
  });
  const snapshot = g.save();
  snapshot.version = 2;
  const migrated = API.Game.fromSave(snapshot);
  const hash = (values) =>
    createHash("sha256").update(Buffer.from(values)).digest("hex");
  assert.equal(hash(migrated.grid.terrain), row.terrain);
  assert.equal(hash(migrated.grid.variants), row.variants);
  assert([...migrated.deposits.values()].includes("lead"));
  assert([...migrated.deposits.values()].includes("sulfur"));
}
console.log(
  "PASS: nine historical terrain/variant fingerprints preserved during v2 migration.",
);
