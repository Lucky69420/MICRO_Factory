const assert = require("node:assert/strict"),
  {
    Game,
    CONFIG,
    RESOURCES,
    START_INVENTORY,
    counts,
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
const place = (g, t, x, y, d = 0) => {
  assert.equal(g.place(t, x, y, d), "");
  return g.grid.get(x, y);
};
const put = (g, b, r, from) => {
  assert(g.accept(b, r, from));
  g.produced++;
};
const remove = (g, b) => {
  const r = b.item.type;
  b.item = null;
  g.discarded++;
  return r;
};
// All entry sides always exit opposite; every resource uses the same common interface.
for (const type of Object.keys(RESOURCES))
  for (let side = 0; side < 4; side++) {
    const g = new Game(),
      j = place(g, "junction", 10, 10, 3),
      d = [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ][side],
      out = place(g, "belt", 10 - d[0], 10 - d[1], (side + 2) % 4);
    put(g, j, type, [10 + d[0], 10 + d[1]]);
    run(g, 0.6);
    assert.equal(out.item.type, type);
    conserved(g);
  }
// Two inputs enter in the same tick and retain lane identity through adjacent crossings.
let g = new Game();
const j1 = place(g, "junction", 10, 10),
  _j2 = place(g, "junction", 12, 10),
  east = place(g, "belt", 13, 10),
  south = place(g, "belt", 10, 11, 1);
place(g, "router", 11, 10);
put(g, j1, "coal", [9, 10]);
put(g, j1, "iron", [10, 9]);
assert(!g.accept(j1, "tin", [11, 10]));
assert.equal(g.inventory(), 2);
run(g, 1.8);
assert.equal(east.item.type, "coal");
assert.equal(south.item.type, "iron");
assert.equal(g.inspect(j1).direction, null);
assert.equal(g.inspect(j1).details["Horizontal channel"], "Empty");
conserved(g);
// Horizontal output blocked; vertical channel continues independently.
g = new Game();
const cross = place(g, "junction", 10, 10),
  vertical = place(g, "belt", 10, 11, 1),
  upstream = place(g, "belt", 9, 10);
put(g, upstream, "copper_wire", [8, 10]);
for (let i = 0; i < 6; i++) {
  put(g, cross, "tin_foil", [10, 9]);
  run(g, 0.6);
  assert.equal(remove(g, vertical), "tin_foil");
  assert.equal(upstream.item, null);
  assert.equal(cross.channels.horizontal.type, "copper_wire");
  conserved(g);
}
assert.equal(
  g.inspect(cross).details["Horizontal channel"],
  "Blocked Copper wire",
);
g.damage(cross, 50);
assert.equal(g.discarded, 7);
conserved(g);
// Router output rotation is balanced, never returns to west input, skips blocked outputs.
g = new Game();
const router = place(g, "router", 10, 10),
  west = place(g, "belt", 9, 10, 0),
  outputs = [
    place(g, "belt", 11, 10),
    place(g, "belt", 10, 11, 1),
    place(g, "belt", 10, 9, 3),
  ];
assert.deepEqual(g.cost("router"), { iron_ingot: 3 });
assert.equal(g.configureRouter, undefined);
const seen = [0, 0, 0];
for (let i = 0; i < 30; i++) {
  put(g, router, i % 2 ? "iron_plate" : "coal", [9, 10]);
  run(g, 0.6);
  assert.equal(west.item, null);
  outputs.forEach((b, k) => {
    if (b.item) {
      seen[k]++;
      remove(g, b);
    }
  });
}
assert.deepEqual(seen, [10, 10, 10]);
conserved(g);
put(g, outputs[0], "tin", [10, 10]);
for (let i = 0; i < 10; i++) {
  put(g, router, "copper", [9, 10]);
  run(g, 0.6);
  assert.equal(outputs[0].item.type, "tin");
  outputs.slice(1).forEach((b) => {
    if (b.item) remove(g, b);
  });
}
conserved(g);
// All exits blocked: hold indefinitely, then resume without a duplicate.
outputs.slice(1).forEach((b) => put(g, b, "iron", [10, 10]));
put(g, router, "tin_screw", [9, 10]);
run(g, 30);
assert.equal(router.item.type, "tin_screw");
assert.equal(g.inspect(router).status, "Outputs Blocked");
conserved(g);
remove(g, outputs[1]);
run(g, 0.1);
assert.equal(outputs[1].item.type, "tin_screw");
assert.equal(router.item, null);
conserved(g);
// Direct Miner -> Router -> three Smelters, no belts needed.
g = new Game();
g.deposits.set(g.grid.key(11, 10), "coal");
place(g, "miner", 11, 10, 2);
place(g, "router", 10, 10);
const furnaces = [
  place(g, "smelter", 10, 8),
  place(g, "smelter", 10, 11),
  place(g, "smelter", 8, 10),
];
run(g, 52);
assert.deepEqual(
  furnaces.map((b) => b.coal),
  [1, 1, 1],
);
conserved(g);
// Direct Smelter -> Router -> Depot at the full warehouse perimeter.
g = new Game();
const sm = place(g, "smelter", 70, 125);
place(g, "router", 72, 125);
sm.batch = {
  time: 2,
  seconds: 2,
  remaining: { iron_ingot: 1, copper_ingot: 1, tin_ingot: 1 },
};
g.produced = 3;
run(g, 3);
assert.deepEqual(counts(g.truck.cargo), {
  iron_ingot: 1,
  copper_ingot: 1,
  tin_ingot: 1,
});
conserved(g);
// Router chain advances without immediate backtracking and produces at the destination.
g = new Game();
const chain = [
    place(g, "router", 10, 10),
    place(g, "router", 11, 10),
    place(g, "router", 12, 10),
  ],
  sink = place(g, "smelter", 13, 10);
put(g, chain[0], "coal", [9, 10]);
run(g, 3);
assert.equal(sink.coal, 1);
assert(chain.every((b) => !b.item));
conserved(g);
// A router ring safely circulates until an outlet is connected.
g = new Game();
const ring = [
  place(g, "router", 10, 10),
  place(g, "router", 11, 10),
  place(g, "router", 11, 11),
  place(g, "router", 10, 11),
];
put(g, ring[0], "coal", [9, 10]);
run(g, 50);
assert.equal(g.inventory(), 1);
conserved(g);
const outlet = place(g, "smelter", 12, 10);
run(g, 2);
assert.equal(outlet.coal, 1);
conserved(g);
// Underground endpoint -> crossing -> router remains compatible.
g = new Game();
assert.equal(g.placePair(5, 10, 9, 10, 0), "");
const entry = g.grid.get(5, 10);
place(g, "junction", 10, 10);
place(g, "router", 11, 10);
const dest = place(g, "smelter", 12, 10);
put(g, entry, "coal", [4, 10]);
run(g, 5);
assert.equal(dest.coal, 1);
conserved(g);
console.log(
  "PASS: 23 resources × 4 straight crossing directions, dual simultaneous lanes, lane isolation, adjacent crossings, balanced routers, skips/backpressure, direct machines, chains, cycle prevention, underground compatibility, conservation.",
);
