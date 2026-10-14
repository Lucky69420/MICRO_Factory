(async () => {
  const assert = require("node:assert/strict"),
    { Game, BUILDINGS, START_INVENTORY } = require("./flat-fixture.cjs"),
    { Stroke } = require("../src/input/BuildStroke.js"),
    { boot } = require("./ui.cjs");
  const total = (o) => Object.values(o).reduce((n, v) => n + v, 0),
    conserved = (g) =>
      assert.equal(
        total(START_INVENTORY) + g.produced + g.convertedGain,
        total(g.stock) +
          g.spent +
          g.inventory() +
          g.fuelConsumed +
          g.discarded +
          g.ammoConsumed,
      );
  function p(g, t, x, y, d = 0) {
    assert.equal(g.place(t, x, y, d), "");
    return g.grid.get(x, y);
  }
  let g = new Game({ creative: true });
  let stroke = new Stroke("belt", 10, 10);
  stroke.extend(100, 10);
  stroke.extend(100, 40);
  assert.equal(g.entities.size, 1, "Preview is read-only");
  const preview = stroke.preview(g);
  assert.equal(preview.entries.length, 121);
  assert.equal(preview.entries.find((e) => e.x === 100 && e.y === 10).dir, 1);
  assert.equal(stroke.commit(g).placed, 121);
  for (let x = 10; x <= 100; x++)
    assert.equal(g.grid.get(x, 10).dir, x === 100 ? 1 : 0);
  for (let y = 11; y <= 40; y++) assert.equal(g.grid.get(100, y).dir, 1);
  assert.equal(g.grid.get(100, 10).beltShape, "curve");
  // The entire line is traversable by a real item, including its corner.
  const sink = g.add("depot", 100, 41, 0);
  sink.queue = [];
  g.accept(g.grid.get(10, 10), "sand", [9, 10]);
  g.produced++;
  for (let i = 0; i < 1500; i++) g.tick();
  assert.deepEqual(sink.queue, ["sand"]);
  let validations = 0;
  const originalPlan = g.planPlacement;
  g.planPlacement = function (...args) {
    validations++;
    return originalPlan.apply(this, args);
  };
  stroke.preview(g);
  const firstPass = validations;
  stroke.preview(g);
  assert.equal(validations, firstPass, "Unchanged preview is cached");
  g.planPlacement = originalPlan;
  // Backtracking never charges or constructs a tile twice.
  stroke = new Stroke("wall", 10, 60);
  stroke.extend(40, 60);
  stroke.extend(20, 60);
  assert.equal(stroke.preview(g).entries.length, 11);
  assert.equal(stroke.commit(g).placed, 11);
  assert.equal(stroke.commit(g).placed, 0);
  assert.equal(g.grid.get(20, 60).hp, 200);
  assert.equal(g.rotateBuilding(g.grid.get(20, 60), 1), false);
  // Two-tile machines are spaced by their footprint and do not erase other classes.
  g = new Game({ creative: true });
  stroke = new Stroke("smelter", 10, 20);
  stroke.extend(20, 20);
  assert.equal(stroke.commit(g).placed, 6);
  for (let x = 10; x <= 20; x += 2) {
    assert.equal(g.grid.get(x, 20).type, "smelter");
    assert.equal(g.grid.get(x + 1, 21), g.grid.get(x, 20));
  }
  const machine = g.grid.get(14, 20);
  stroke = new Stroke("belt", 10, 20);
  stroke.extend(22, 20);
  const r = stroke.commit(g);
  assert.equal(r.skipped, 12);
  assert.equal(g.grid.get(14, 20), machine);
  assert.equal(g.grid.get(22, 20).type, "belt");
  assert(g.place("smelter", 22, 20), "Conveyor cannot be erased by a machine");
  // All logistics classes replace each other; same-type rotation preserves contents at no cost.
  g = new Game();
  let a = p(g, "belt", 10, 10);
  g.accept(a, "coal", [9, 10]);
  g.produced++;
  const stock = { ...g.stock },
    spent = g.spent;
  assert.equal(g.place("belt", 10, 10, 1), "");
  assert.equal(g.grid.get(10, 10), a);
  assert.equal(a.dir, 1);
  assert.equal(a.item.type, "coal");
  assert.equal(g.spent, spent);
  assert.deepEqual(g.stock, stock);
  assert.equal(g.planPlacement("router", 10, 10).action, "replace");
  assert.equal(g.place("router", 10, 10), "");
  assert.equal(g.discarded, 1);
  assert.equal(g.stock.iron_ingot, stock.iron_ingot - 3);
  for (const t of ["junction", "belt", "splitter", "router"]) p(g, t, 10, 10);
  conserved(g);
  // Incompatible classes, partial machine footprints and insufficient funds are atomic failures.
  g = new Game();
  a = p(g, "smelter", 10, 10);
  const snapshot = JSON.stringify(g.stock);
  assert(g.place("belt", 10, 10));
  assert(g.place("bender", 10, 10));
  assert(g.place("smelter", 11, 10));
  assert.equal(g.grid.get(10, 10), a);
  assert.equal(JSON.stringify(g.stock), snapshot);
  p(g, "belt", 20, 10);
  g.stock.iron_ingot = 0;
  const old = g.grid.get(20, 10),
    version = g.network.version;
  assert(g.place("router", 20, 10));
  assert.equal(g.grid.get(20, 10), old);
  assert.equal(g.network.version, version);
  assert.equal(g.place("belt", 20, 10, 3), "");
  assert.equal(old.dir, 3);
  // Explicit metadata compatibility permits a same-footprint production replacement.
  g = new Game({ creative: true });
  a = p(g, "bender", 10, 10);
  g.accept(a, "iron_ingot", [9, 10]);
  g.produced++;
  const group = BUILDINGS.wiremill.replacementGroup;
  BUILDINGS.wiremill.replacementGroup = BUILDINGS.bender.replacementGroup;
  assert.equal(g.place("wiremill", 10, 10), "");
  assert.equal(g.grid.get(10, 10).type, "wiremill");
  assert.equal(g.discarded, 1);
  BUILDINGS.wiremill.replacementGroup = group;
  conserved(g);
  // Cumulative cost previews skip unaffordable positions without overspending.
  g = new Game();
  g.stock.iron_ingot = 5;
  stroke = new Stroke("belt", 10, 10);
  stroke.extend(19, 10);
  const budget = stroke.preview(g);
  assert.equal(budget.entries.filter((p) => !p.error).length, 5);
  assert.deepEqual(budget.cost, { iron_ingot: 5 });
  assert.equal(stroke.commit(g).placed, 5);
  assert.equal(g.stock.iron_ingot, 0);
  // Underground drag builds paired, contiguous surface endpoints; blocked endpoints leave old structures intact.
  g = new Game({ creative: true });
  stroke = new Stroke("underground", 10, 20);
  stroke.extend(23, 20);
  assert.equal(stroke.commit(g).placed, 2);
  assert.equal(g.grid.get(10, 20).link, g.grid.get(16, 20));
  assert.equal(g.grid.get(17, 20).link, g.grid.get(23, 20));
  const tunnel = g.grid.get(10, 20).connection;
  assert.equal(stroke.commit(g).placed, 0);
  assert.equal(g.grid.get(10, 20).connection, tunnel);
  g.grid.terrain[g.grid.key(33, 20)] = 6;
  p(g, "router", 30, 20);
  a = g.grid.get(30, 20);
  assert(g.placePair(30, 20, 33, 20));
  assert.equal(g.grid.get(30, 20), a);
  assert.equal(g.grid.terrainAt(33, 20), "water");
  // Wall placement charges iron; enemies cannot walk through its occupied tile.
  g = new Game();
  const wall = p(g, "wall", 10, 10);
  assert.equal(g.stock.iron_ingot, 95);
  const enemy = g.combat.spawn(9.5, 10.5);
  for (let i = 0; i < 30; i++) g.tick();
  assert.equal(enemy.x, 9.5);
  assert(wall.hp < 200);
  conserved(g);
  // Actual pointer/keyboard handlers: category slots, release-to-commit, orientation, cancellation and both rotations.
  const u = await boot(),
    { exec, scope, elements, canvas } = u;
  exec("game.creative=true");
  const key = (key, extra = {}) =>
    scope.onkeydown({ key, preventDefault() {}, ...extra });
  key("q");
  key("1");
  assert.equal(exec("tool"), "belt");
  const point = (x, y, button = 0) => {
    const cam = exec("({...cam})");
    return {
      button,
      pointerId: 1,
      clientX: (x + 0.5 - cam.x) * cam.scale + 500,
      clientY: (y + 0.5 - cam.y) * cam.scale + 350,
    };
  };
  canvas.onpointerdown(point(10, 10));
  canvas.onpointermove(point(80, 10));
  assert.equal(exec("game.grid.get(10,10)"), undefined);
  u.frame(1000);
  assert(!elements["drag-summary"].hidden);
  canvas.onpointerup(point(80, 10));
  assert.equal(exec("game.grid.get(79,10).dir"), 0);
  assert.equal(exec("tool"), "belt");
  key("2");
  assert.equal(exec("tool"), "router");
  u.click(15, 10);
  assert.equal(exec("game.grid.get(15,10).type"), "router");
  key("1");
  const initial = exec("dir");
  key("r");
  assert.equal(exec("dir"), (initial + 1) % 4);
  key("R", { shiftKey: true });
  assert.equal(exec("dir"), initial);
  key("e");
  key("1");
  assert.equal(exec("tool"), "smelter");
  canvas.onpointerdown(point(30, 30));
  canvas.onpointermove(point(40, 30));
  key("Escape");
  canvas.onpointerup();
  assert.equal(exec("game.grid.get(30,30)"), undefined);
  key("t");
  key("1");
  assert.equal(exec("tool"), "wall");
  const d = exec("dir");
  key("r");
  assert.equal(exec("dir"), d);
  key("1", { target: { tagName: "INPUT" } });
  assert.equal(exec("tool"), "wall");
  key("q", { target: { isContentEditable: true } });
  assert.equal(exec("category"), "defense");
  // Middle-drag does not construct, and cancellation does not spend resources.
  const count = exec("game.entities.size");
  canvas.onpointerdown(point(30, 30, 1));
  canvas.onpointermove(point(40, 30, 1));
  canvas.onpointerup();
  assert.equal(exec("game.entities.size"), count);
  key("q");
  key("1");
  canvas.onpointerdown(point(40, 40));
  canvas.onpointermove(point(50, 40));
  canvas.onpointercancel();
  assert.equal(exec("game.grid.get(40,40)"), undefined);
  // Persisted bindings reject conflicts and reserved number slots, reset cleanly, and never fire while typing.
  const input = elements["binding-logistics"],
    ev = (key) => ({ key, preventDefault() {}, stopPropagation() {} });
  input.onkeydown(ev("z"));
  assert.equal(exec("bindings.logistics"), "z");
  input.onkeydown(ev("e"));
  assert.equal(exec("bindings.logistics"), "z");
  input.onkeydown(ev("2"));
  assert.equal(exec("bindings.logistics"), "z");
  assert.equal((await boot()).exec("bindings.logistics"), "z");
  elements["reset-bindings"].onclick();
  assert.equal(exec("bindings.logistics"), "q");
  assert.equal((await boot()).exec("bindings.logistics"), "q");
  elements["palette-toggle"].onclick();
  assert(elements["palette-body"].hidden);
  elements["palette-toggle"].onclick();
  assert(!elements["palette-body"].hidden);
  key("Escape");
  u.click(15, 10);
  assert.equal(elements["building-name"].textContent, "Router");
  // Paging can address more than ten definitions without consuming number shortcuts globally.
  exec(
    "categories.logistics.tools.push(...Array(8).fill('wall').map((_,i)=>'extra'+i));for(let i=0;i<8;i++)Factory.BUILDINGS['extra'+i]={...Factory.BUILDINGS.wall,id:'extra'+i,name:'Extra '+i,category:'logistics'};setCategory('logistics')",
  );
  elements["palette-next"].onclick();
  assert.equal(exec("palettePage"), 1);
  key("1");
  assert.equal(exec("tool"), "extra5");
  elements["palette-prev"].onclick();
  assert.equal(exec("palettePage"), 0);
  console.log(
    "PASS: gap-free routed belts, actual corner throughput, footprint spacing, every logistics replacement, atomic failures, explicit production compatibility, cumulative budgets, paired tunnels, walls/combat, pointer release/cancel/pan, category slots, Shift+R, typing guards, persistent conflict-free bindings, palette collapse/paging and inspection.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
