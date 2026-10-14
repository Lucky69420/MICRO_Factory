import { CARDINAL } from "../data/terrain.js";
import { hash2, TerrainNoise } from "./TerrainNoise.js";
import { SeededRandom } from "./SeededRandom.js";
import {
  startingSources,
  floodTerrain,
  terrainValidation,
} from "./MapValidator.js";
function carvePass(game, ax, ay, bx, by, noise) {
  const grid = game.grid;
  let x = ax,
    y = ay;
  const brush = (x, y) => {
    const radius = 3;
    for (let dy = -radius; dy <= radius; dy++)
      for (let dx = -radius; dx <= radius; dx++)
        if (
          dx * dx + dy * dy <= radius * radius + 1 &&
          grid.inside(x + dx, y + dy)
        ) {
          const xx = x + dx,
            yy = y + dy;
          if (game.road(xx, yy)) continue;
          const k = grid.key(xx, yy);
          if (!grid.passable(xx, yy))
            grid.terrain[k] = noise.value(xx / 12, yy / 12) > 0.55 ? 2 : 0;
        }
  };
  // A gently wandering seven-tile-wide pass; each step stays cardinally connected.
  brush(x, y);
  while (y !== by) {
    y += Math.sign(by - y);
    const t = Math.abs((y - ay) / (by - ay || 1)),
      want = Math.round(
        ax +
          (bx - ax) * t +
          Math.sin(t * Math.PI) * (noise.value(y / 23, 17) - 0.5) * 12,
      );
    while (x !== want) {
      x += Math.sign(want - x);
      brush(x, y);
    }
    brush(x, y);
  }
  while (x !== bx) {
    x += Math.sign(bx - x);
    brush(x, y);
  }
}
function finalizeTerrain(game) {
  const g = game.grid,
    n = g.width * g.height,
    variantSeed = new SeededRandom(game.seed).state;
  for (let k = 0; k < n; k++) {
    const x = k % g.width,
      y = Math.floor(k / g.width);
    g.variants[k] = hash2(x, y, variantSeed) % 3;
    let mask = 0;
    for (let i = 0; i < 4; i++) {
      const [dx, dy] = CARDINAL[i];
      if (
        g.inside(x + dx, y + dy) &&
        g.terrain[g.key(x + dx, y + dy)] !== g.terrain[k]
      )
        mask |= 1 << i;
    }
    g.transitions[k] = mask;
  }
  g.terrainVersion++;
}
function generateTerrain(game) {
  const g = game.grid,
    w = g.width,
    h = g.height,
    noise = new TerrainNoise(game.seed),
    enabled = game.config.terrain !== false;
  if (enabled) {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const k = g.key(x, y),
          e = noise.fractal(x / 28, y / 28),
          moist = noise.fractal(x / 36 + 81, y / 36 - 37),
          ridge =
            1 - Math.abs(noise.fractal(x / 25 - 58, y / 25 + 91) - 0.5) * 2,
          border = Math.min(x, y, w - 1 - x, h - 1 - y),
          thickness = 2 + Math.floor(noise.value(x / 12 + 120, y / 12) * 4);
        let t = 0;
        if (e < 0.32) t = 6;
        else if (e < 0.39 || moist < 0.33) t = 1;
        else if (ridge > 0.9 && e > 0.49) t = 5;
        else if (ridge > 0.84 && e > 0.47) t = 4;
        else if (e > 0.68) t = 3;
        else if ((ridge > 0.78 && e > 0.44) || e > 0.61) t = 2;
        if (border < thickness) t = 5;
        g.terrain[k] = t;
      }
    // Shore bands, scree and foothills soften region boundaries before passage repair.
    const before = g.terrain.slice();
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const k = g.key(x, y),
          near = CARDINAL.map(([dx, dy]) => before[g.key(x + dx, y + dy)]);
        if (before[k] < 4 && near.includes(6)) g.terrain[k] = 1;
        else if (before[k] < 2 && near.some((t) => t === 4 || t === 5))
          g.terrain[k] = 2;
      }
  }
  const pad = (cx, cy, r, terrain = 0) => {
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r; x <= cx + r; x++)
        if (
          (x - cx) ** 2 + (y - cy) ** 2 <= r * r + 2 &&
          g.inside(x, y) &&
          !game.road(x, y)
        )
          g.terrain[g.key(x, y)] = terrain;
  };
  if (enabled) {
    pad(game.depot.x + 1, game.depot.y, 14);
    for (const p of startingSources(game)) pad(p.x, p.y, 5);
    pad(game.spawner.x + 1, 2, 3);
    pad(game.depot.x + 1, h - 2, 3);
    game.sandSource = { x: game.depot.x + 10, y: game.depot.y - 7 };
    pad(game.sandSource.x, game.sandSource.y, 3, 1);
  }
  for (let y = game.parkY; y < h; y++)
    for (let x = game.depot.x; x < game.depot.x + 3; x++)
      g.terrain[g.key(x, y)] = 7;
  if (enabled) {
    let check = terrainValidation(game);
    if (!check.wide[g.key(game.spawner.x + 1, 1)])
      carvePass(
        game,
        game.spawner.x + 1,
        2,
        game.depot.x + 1,
        game.depot.y,
        noise,
      );
    for (const p of startingSources(game)) {
      check = terrainValidation(game);
      if (!check.wide[g.key(p.x, p.y)])
        carvePass(game, p.x, p.y, game.depot.x + 1, game.depot.y, noise);
    }
    check = terrainValidation(game);
    if (!check.valid)
      throw new Error(
        "Terrain generation failed connectivity validation: " +
          check.problems.join(", "),
      );
    g.reachable = check.reachable;
    game.terrainValidation = {
      valid: true,
      startingLand: check.startingLand,
    };
  } else g.reachable = floodTerrain(game);
  finalizeTerrain(game);
}

export { carvePass, finalizeTerrain, generateTerrain };
