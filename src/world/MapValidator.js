import { CARDINAL } from "../data/terrain.js";
function startingSources(game) {
  const g = game.grid,
    clamp = (v, n) => Math.max(5, Math.min(n - 6, v));
  return [
    ["iron", game.depot.x - 4, game.depot.y],
    ["coal", game.depot.x - 4, game.depot.y + 6],
    ["copper", game.depot.x + 17, game.depot.y - 14],
    ["tin", game.depot.x - 21, game.depot.y - 22],
  ].map(([type, x, y]) => ({
    type,
    x: clamp(x, g.width),
    y: clamp(y, g.height),
  }));
}
function floodTerrain(game, radius = 0) {
  const g = game.grid,
    n = g.width * g.height,
    seen = new Uint8Array(n),
    queue = new Int32Array(n);
  let head = 0,
    tail = 0;
  const clear = (x, y) => {
      if (!g.inside(x, y) || !g.passable(x, y)) return false;
      for (let dy = -radius; dy <= radius; dy++)
        for (let dx = -radius; dx <= radius; dx++)
          if (g.inside(x + dx, y + dy) && !g.passable(x + dx, y + dy))
            return false;
      return true;
    },
    x = game.depot.x + 1,
    y = game.depot.y + 1,
    start = g.key(x, y);
  if (!clear(x, y)) return seen;
  seen[start] = 1;
  queue[tail++] = start;
  while (head < tail) {
    const k = queue[head++],
      x = k % g.width,
      y = Math.floor(k / g.width);
    for (const [dx, dy] of CARDINAL) {
      const nx = x + dx,
        ny = y + dy;
      if (!g.inside(nx, ny)) continue;
      const nk = g.key(nx, ny);
      if (!seen[nk] && clear(nx, ny)) {
        seen[nk] = 1;
        queue[tail++] = nk;
      }
    }
  }
  return seen;
}
function terrainValidation(game) {
  const grid = game.grid,
    reachable = floodTerrain(game),
    wide = floodTerrain(game, 1),
    problems = [];
  if (!wide[grid.key(game.spawner.x + 1, 1)]) problems.push("spawn");
  let roadClear = true;
  for (let y = game.parkY; y < grid.height; y++)
    for (let x = game.depot.x; x < game.depot.x + 3; x++)
      if (
        grid.terrainAt(x, y) !== "road" ||
        !reachable[grid.key(x, y)] ||
        game.deposits.has(grid.key(x, y))
      )
        roadClear = false;
  for (let y = game.parkY; y < grid.height; y++)
    if (!wide[grid.key(game.depot.x + 1, y)]) roadClear = false;
  if (!roadClear) problems.push("road");
  let land = 0,
    area = 0;
  for (let y = game.depot.y - 10; y <= game.depot.y + 9; y++)
    for (let x = game.depot.x - 10; x <= game.depot.x + 12; x++)
      if (grid.inside(x, y)) {
        area++;
        if (grid.buildable(x, y) && reachable[grid.key(x, y)]) land++;
      }
  if (land < area * 0.75) problems.push("starting land");
  if (
    game.sandSource &&
    (!reachable[grid.key(game.sandSource.x, game.sandSource.y)] ||
      grid.terrainAt(game.sandSource.x, game.sandSource.y) !== "sand" ||
      game.deposits.has(grid.key(game.sandSource.x, game.sandSource.y)))
  )
    problems.push("sand");
  for (const p of startingSources(game))
    if (!wide[grid.key(p.x, p.y)]) problems.push(p.type);
  for (const [key] of game.deposits)
    if (
      !reachable[key] ||
      !grid.buildable(key % grid.width, Math.floor(key / grid.width))
    )
      problems.push("ore");
  return {
    valid: !problems.length,
    problems,
    reachable,
    wide,
    startingLand: land,
  };
}
export { startingSources, floodTerrain, terrainValidation };
