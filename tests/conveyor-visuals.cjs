(async () => {
  const assert = require("node:assert/strict"),
    { boot } = require("./ui.cjs"),
    fs = require("node:fs");
  const u = await boot();
  u.exec(
    "for(const [key] of game.deposits)game.deposits.delete(key);game.creative=true;game.place('router',10,10);game.place('junction',12,10);game.place('belt',13,10);game.accept(game.grid.get(10,10),'coal',[9,10]);game.accept(game.grid.get(12,10),'tin_wire',[11,10]);cam.x=11;cam.y=10;const savedDraw=Art.draw;let drawnItems=0;Art.draw=(ctx,img,...args)=>{if(Object.values(Art.items).includes(img))drawnItems++;savedDraw(ctx,img,...args)}",
  );
  u.exec("render(100)");
  assert.equal(u.exec("drawnItems"), 2);
  assert.equal(u.exec("game.inventory()"), 2);
  u.exec(
    "game.place('belt',9,10);game.accept(game.grid.get(9,10),'coal',[8,10]);drawnItems=0;render(100)",
  );
  assert.equal(u.exec("drawnItems"), 3);
  // Shape and sprite cache update on placement/rotation/demolition, without render lookups.
  u.exec(
    "game.place('belt',30,30,1);game.place('belt',29,30,0);game.place('belt',30,31,1)",
  );
  assert.equal(u.exec("game.grid.get(30,30).beltShape"), "curve");
  assert.equal(
    u.exec("game.grid.get(30,30).beltSprite"),
    "assets/belts/1-6.svg",
  );
  u.exec("game.rotateBuilding(game.grid.get(29,30),3)");
  assert.equal(u.exec("game.grid.get(30,30).beltInputMask"), 0);
  u.exec(
    "game.rotateBuilding(game.grid.get(29,30),0);game.destroy(game.grid.get(30,31))",
  );
  assert.equal(u.exec("game.grid.get(30,30).beltShape"), "endpoint");
  // An endpoint on the far side of a Junction updates the upstream cached belt mask.
  u.exec("game.place('belt',39,30);game.place('junction',40,30)");
  assert.equal(u.exec("game.grid.get(39,30).beltOutputMask"), 1);
  u.exec("game.place('belt',41,30)");
  assert.equal(u.exec("game.grid.get(39,30).beltOutputMask"), 1);
  // Every cached variant exists; all are exact full-tile SVGs and arcs are present.
  for (let dir = 0; dir < 4; dir++)
    for (let mask = 0; mask < 16; mask++) {
      const text = fs.readFileSync(
        `public/assets/belts/${dir}-${mask}.svg`,
        "utf8",
      );
      assert(text.includes('viewBox="0 0 32 32"'));
      assert(text.includes('shape-rendering="crispEdges"'));
    }
  assert(
    fs.readFileSync("public/assets/belts/1-6.svg", "utf8").includes("A 16 16"),
  );
  // Noninteger zoom positions share snapped boundaries: no half-pixel belt gaps.
  u.exec(
    "let beltRects=[];Art.draw=(ctx,img,x,y,w,h=w)=>beltRects.push([Math.round(x),Math.round(y),w,h]);drawLogistics(game.grid.get(39,30),10.2,10.2,33.5);drawLogistics(game.grid.get(41,30),43.7,10.2,33.5)",
  );
  const rects = u.exec("beltRects");
  assert.equal(rects[0][0] + rects[0][2], rects[1][0]);
  console.log(
    "PASS: held Router/Junction item sprites, ordinary items visible, cached connection/corner updates, structural compatibility, 64 sharp variants and seamless fractional-zoom boundaries.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
