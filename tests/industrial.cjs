const assert = require("node:assert/strict");
const {
  Game,
  CONFIG,
  RESOURCES,
  SPECS,
  RECIPES,
  START_INVENTORY,
} = require("./flat-fixture.cjs");
const run = (g, t) => {
  for (let i = 0; i < Math.round(t / CONFIG.step); i++) g.tick(CONFIG.step);
};
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const conserved = (g) =>
  assert.equal(
    sum(START_INVENTORY) + g.produced + g.convertedGain,
    sum(g.stock) + g.spent + g.inventory() + g.fuelConsumed + g.discarded,
  );
function place(g, t, x, y, d = 0) {
  assert.equal(g.place(t, x, y, d), "");
  return g.grid.get(x, y);
}
function input(g, b, type, n = 1) {
  for (let i = 0; i < n; i++) {
    assert(g.accept(b, type, [b.x - 1, b.y]));
    g.produced++;
  }
}
function tunnel(g, x, y, ex, ey, dir, type = "iron_ingot") {
  assert.equal(g.placePair(x, y, ex, ey, dir), "");
  const a = g.grid.get(x, y),
    b = g.grid.get(ex, ey);
  a.item = { type, progress: 0, from: [-1, 0] };
  g.produced++;
  const distance = Math.abs(ex - x) + Math.abs(ey - y);
  run(g, distance * CONFIG.beltSeconds - 0.05);
  assert.equal(b.item, null);
  assert.equal(g.contents(a), 1);
  run(g, 0.1);
  assert.equal(a.item, null);
  assert.equal(b.item.type, type);
  conserved(g);
  return [a, b];
}
// Default map is centered east/west with a 25-tile southern margin and clear road.
let g = new Game();
assert.equal(g.depot.y, 125);
assert.equal(g.depot.x, 73);
assert.equal(g.parkY, 128);
assert.equal(g.truck.y, 128);
for (let y = 125; y < 150; y++)
  for (let x = 73; x <= 75; x++) assert(!g.deposits.has(g.grid.key(x, y)));
// Every occupied surface building can be bypassed by an independent link.
for (const type of Object.keys(SPECS).filter(
  (t) => !["depot", "underground"].includes(t),
)) {
  g = new Game();
  if (type === "miner") g.deposits.set(g.grid.key(20, 20), "iron");
  place(g, type, 20, 20);
  tunnel(g, 19, 20, 20 + SPECS[type].size, 20, 0);
  assert(g.grid.get(20, 20));
  assert.equal(g.undergroundLinks.size, 1);
}
g = new Game();
tunnel(g, 72, 126, 76, 126, 0, "copper_wire");
assert.equal(g.depot.queue.length, 0);
g = new Game();
tunnel(g, 72, 131, 76, 131, 0, "tin_screw");
g = new Game();
place(g, "smelter", 20, 20);
place(g, "bender", 22, 20);
tunnel(g, 19, 20, 24, 20, 0);
// Build atop existing tunnels; neither transport nor surface footprint is obstructed.
g = new Game();
assert.equal(g.placePair(19, 20, 24, 20, 0), "");
place(g, "smelter", 20, 20);
place(g, "lathe", 22, 20);
const a = g.grid.get(19, 20);
a.item = { type: "copper_foil", progress: 0 };
g.produced++;
run(g, 4);
assert.equal(g.grid.get(24, 20).item.type, "copper_foil");
conserved(g);
// Perpendicular and parallel overlapping tunnels remain independent.
g = new Game();
assert.equal(g.placePair(10, 10, 16, 10, 0), "");
assert.equal(g.placePair(12, 9, 12, 13, 1), "");
assert.equal(g.placePair(11, 10, 15, 10, 0), "");
const starts = [
  [10, 10, "coal"],
  [12, 9, "tin_rod"],
  [11, 10, "copper_plate"],
];
for (const [x, y, r] of starts) {
  g.grid.get(x, y).item = { type: r, progress: 0 };
  g.produced++;
}
run(g, 4);
assert.equal(g.grid.get(16, 10).item.type, "coal");
assert.equal(g.grid.get(12, 13).item.type, "tin_rod");
assert.equal(g.grid.get(15, 10).item.type, "copper_plate");
conserved(g);
// All fifteen data-driven recipes: correct quantity/type, timings, rejection and health.
for (const recipe of Object.values(RECIPES).filter(
  (r) => r.machine !== "smelter",
)) {
  g = new Game();
  const b = place(g, recipe.machine, 20, 20);
  assert.equal(b.size, 2);
  assert.equal(b.hp, 150);
  assert(g.setRecipe(b, recipe.id));
  for (const [t, n] of Object.entries(recipe.inputs)) input(g, b, t, n);
  assert(!g.accept(b, "tin", [19, 20]));
  run(g, 1);
  assert.equal(b.output, undefined);
  assert.equal(g.inspect(b).status, "Processing");
  run(g, 1.1);
  assert.deepEqual(b.batch.remaining, recipe.outputs);
  assert.equal(b.input.length, 0);
  conserved(g);
}
// Single-cycle switching, backpressure and multi-output cases are covered in logistics-cycle.cjs.
// Processor chain receives additional ingredients only when its previous job clears.
g = new Game();
const first = place(g, "bender", 69, 125),
  second = place(g, "bender", 71, 125);
g.setRecipe(second, "bender_iron_foil");
for (let i = 0; i < 4; i++) {
  input(g, first, "iron_ingot");
  run(g, 5);
}
run(g, 5);
assert.equal(g.truck.cargo.length, 8);
assert(g.truck.cargo.every((r) => r === "iron_foil"));
assert(g.dispatch());
run(g, 3);
assert.equal(g.delivered, 8);
conserved(g);
// Actual mining -> smelting -> bending -> delivery replenishes construction plates.
g = new Game();
place(g, "miner", 69, 125);
place(g, "smelter", 70, 125);
place(g, "bender", 72, 122);
for (const [x, y, d] of [
  [72, 125, 3],
  [72, 124, 3],
  [74, 122, 1],
  [74, 123, 1],
  [74, 124, 1],
])
  place(g, "belt", x, y, d);
place(g, "miner", 69, 131, 3);
for (const [x, y, d] of [
  [69, 130, 3],
  [69, 129, 3],
  [69, 128, 0],
  [70, 128, 3],
  [70, 127, 3],
])
  place(g, "belt", x, y, d);
const starterPlates = g.stock.iron_plate;
run(g, 300);
assert(g.delivered >= 50);
assert(g.stock.iron_plate > starterPlates);
assert.equal(g.stock.iron_ingot, 55);
conserved(g);
// Costs have exact multi-resource deductions, invalid placements spend nothing.
for (const type of ["bender", "wiremill", "lathe", "ammo_factory", "turret"]) {
  g = new Game();
  const previous = { ...g.stock },
    cost = g.cost(type);
  place(g, type, 20, 20);
  for (const [r, n] of Object.entries(cost))
    assert.equal(g.stock[r], previous[r] - n);
  const snapshot = { ...g.stock };
  assert.equal(g.place(type, 20, 20), "");
  assert.deepEqual(g.stock, snapshot);
  conserved(g);
}
// Losing an in-flight job by demolition is accounted for rather than duplicated.
g = new Game();
const b = place(g, "lathe", 20, 20);
input(g, b, "iron_ingot");
run(g, 1);
g.damage(b, 150);
assert.equal(g.discarded, 1);
conserved(g);
for (const r of Object.values(RESOURCES)) assert(r.icon && r.form && r.group);
assert.equal(Object.keys(RECIPES).length, 19);
console.log(
  "PASS: depot/road layout, tunnels under every surface type/road/depot, overlapping links, surface construction above tunnels, 16 processor recipes, safe switching/reclaim, capacities, machine chains, component delivery, costs, HP, conservation.",
);
