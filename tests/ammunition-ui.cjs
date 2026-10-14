(async () => {
  const assert = require("node:assert/strict");
  const { boot } = require("./ui.cjs");
  const u = await boot();
  u.exec("game.creative=true;setCategory('production')");
  assert(u.elements["palette-grid"].innerHTML.includes('data-tool="mixer"'));
  assert(
    u.elements["palette-grid"].innerHTML.includes('data-tool="ammo_factory"'),
  );
  u.exec("setCategory('defense')");
  for (const type of ["turret", "light_turret", "heavy_turret", "artillery"]) {
    assert(
      u.elements["palette-grid"].innerHTML.includes(`data-tool="${type}"`),
    );
    u.exec(
      `game.place('${type}',20,20);selected=game.grid.get(20,20);showInspection(true);cam.x=21;cam.y=21;render(100)`,
    );
    const markup = u.elements["building-details"].innerHTML;
    for (const label of [
      "Accepted ammunition",
      "Remaining shots",
      "Range",
      "Damage",
      "Fire rate",
      "Target",
    ])
      assert(markup.includes(label));
    assert.equal(u.elements["building-status"].textContent, "Out of Ammo");
    u.exec("game.destroy(selected);selected=null");
  }
  u.exec(
    "game.place('mixer',20,20);selected=game.grid.get(20,20);showInspection(true)",
  );
  assert(u.elements["active-recipe"].innerHTML.includes("sulfur.svg"));
  assert(u.elements["active-recipe"].innerHTML.includes("gunpowder.svg"));
  assert(u.elements["active-recipe"].innerHTML.includes("2s"));
  u.exec(
    "game.accept(selected,'coal',[19,20]);game.accept(selected,'sulfur',[19,20]);game.tick();showInspection(true)",
  );
  assert.equal(u.elements["building-status"].textContent, "Processing");
  u.exec(
    "game.destroy(selected);game.place('ammo_factory',20,20);selected=game.grid.get(20,20);showInspection(true)",
  );
  for (const id of [
    "primitive_ammo",
    "ammo_556",
    "ammo_762",
    "artillery_shell",
  ])
    assert(
      u.elements["recipe-options"].innerHTML.includes(`data-recipe="${id}"`),
    );
  u.exec(
    "game.place('artillery',30,30);let artillery=game.grid.get(30,30);game.accept(artillery,'artillery_shell',[29,30]);game.combat.spawn(45,31.5);game.tick();cam.x=35;cam.y=31;render(100)",
  );
  const before = u.exec("JSON.stringify(game.save())");
  for (let i = 0; i < 5; i++) u.exec("render(100)");
  assert.equal(u.exec("JSON.stringify(game.save())"), before);
  console.log(
    "PASS: new menus, ingredient/output/time icons, turret inspectors, no-ammo status and artillery rendering in UI harness.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
