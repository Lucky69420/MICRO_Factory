(async () => {
  const assert = require("node:assert/strict");
  const fs = require("node:fs");
  const path = require("node:path");
  const vm = require("node:vm");
  const graph = new Map();
  function inspect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        inspect(file);
        continue;
      }
      if (!file.endsWith(".js")) continue;
      const source = fs.readFileSync(file, "utf8");
      const module = new vm.SourceTextModule(source);
      const dependencies = module.dependencySpecifiers.map((specifier) =>
        path.normalize(path.join(path.dirname(file), specifier)),
      );
      for (const dependency of dependencies)
        assert(fs.existsSync(dependency), `${file}: missing ${dependency}`);
      graph.set(file, dependencies);
      if (
        /^src\/(buildings|combat|production|logistics|world|persistence|data|utils)\//.test(
          file,
        ) ||
        /^src\/core\/(?!GameLoop)/.test(file)
      ) {
        assert(
          !/\b(document|window|CanvasRenderingContext2D|localStorage)\b/.test(
            source,
          ),
          `${file} depends on browser presentation`,
        );
        for (const dependency of dependencies)
          assert(
            !/^src\/(ui|rendering|input)\//.test(dependency),
            `${file} imports a presentation module`,
          );
      }
    }
  }
  inspect("src");
  const visiting = new Set(),
    visited = new Set();
  function visit(file) {
    assert(
      !visiting.has(file),
      `Circular dependency: ${[...visiting, file].join(" -> ")}`,
    );
    if (visited.has(file)) return;
    visiting.add(file);
    for (const dependency of graph.get(file)) visit(dependency);
    visiting.delete(file);
    visited.add(file);
  }
  for (const file of graph.keys()) visit(file);
  const { boot } = require("./ui.cjs");
  const ui = await boot();
  ui.exec(
    "game.creative=true;game.place('router',10,10);game.accept(game.grid.get(10,10),'coal',[9,10]);cam.x=10;cam.y=10;select('belt');hover={x:15,y:10}",
  );
  const renderedOrder = [
    ...ui.elements["inventory-panel"].innerHTML.matchAll(/id="stock-([^"]+)"/g),
  ].map((match) => match[1]);
  assert.deepEqual(
    renderedOrder,
    require("./fixtures/inventory-order.json"),
    "Inventory ordering changed",
  );
  const before = ui.exec("JSON.stringify(game.save())"),
    version = ui.exec("game.network.version");
  for (let frame = 0; frame < 10; frame++) ui.exec("render(100)");
  assert.equal(
    ui.exec("JSON.stringify(game.save())"),
    before,
    "Rendering mutated simulation",
  );
  assert.equal(ui.exec("game.network.version"), version);
  assert.equal(ui.scope.Factory, ui.exec("Factory"));
  console.log(
    `PASS: ${graph.size} native modules, resolved imports, no cycles, simulation/presentation boundaries and read-only rendering.`,
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
