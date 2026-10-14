export function ensureContentDeposits(game) {
  const grid = game.grid;
  for (const type of ["lead", "sulfur"]) {
    if ([...game.deposits.values()].includes(type)) continue;
    const candidates = [];
    for (let y = 4; y < grid.height - 4; y++)
      for (let x = 4; x < grid.width - 4; x++) {
        const key = grid.key(x, y);
        if (
          !grid.buildable(x, y) ||
          !grid.reachable[key] ||
          grid.get(x, y) ||
          game.road(x, y) ||
          game.reserved(x, y) ||
          game.deposits.has(key)
        )
          continue;
        const distance = Math.hypot(x - game.depot.x, y - game.depot.y);
        if (distance < 12) continue;
        candidates.push({
          key,
          x,
          y,
          score:
            distance +
            (type === "sulfur" && grid.terrainAt(x, y) !== "stone" ? 8 : 0),
        });
      }
    candidates.sort((a, b) => a.score - b.score || a.key - b.key);
    const start = candidates[0];
    if (!start) continue;
    const allowed = new Set(candidates.map((p) => p.key)),
      queue = [start.key],
      seen = new Set();
    let placed = 0;
    while (queue.length && placed < 16) {
      const key = queue.shift();
      if (seen.has(key) || !allowed.has(key)) continue;
      seen.add(key);
      game.deposits.set(key, type);
      placed++;
      const x = key % grid.width,
        y = Math.floor(key / grid.width);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ])
        queue.push(grid.key(x + dx, y + dy));
    }
  }
}
