import { DIRS } from "../utils/directions.js";

import * as BeltAPI from "../logistics/BeltGeometry.js";

export function capturePrevious(game, b, item) {
  if (b.type === "router" || b.type === "junction") return;
  if (b.type === "belt") {
    if (
      item.previousProgress === item.progress &&
      item.previousX !== undefined &&
      item.previousExit === b.dir
    )
      return;
    item.previousExit = b.dir;
    const entry =
        item.entrySide ??
        game.side(b, [
          b.x + (item.from?.[0] || 0),
          b.y + (item.from?.[1] || 0),
        ]),
      p = BeltAPI.sample(entry, b.dir, item.progress);
    item.previousX = b.x + p[0];
    item.previousY = b.y + p[1];
    return;
  }
  if (
    b.type !== "router" &&
    item.previousProgress === item.progress &&
    item.previousX !== undefined
  )
    return;
  let direction = b.type === "junction" ? item.direction : b.dir;
  if (b.type === "router") {
    const o = game
      .targets(b, item)
      .find((e) => game.canAccept(e.target, item.type, e.from, b, item));
    direction = o?.direction ?? item.direction;
  }
  const p = item.progress,
    from = item.from || [0, 0],
    d = DIRS[direction],
    hx = b.type === "junction" && direction % 2 === 1 ? 0.06 : 0,
    vy = b.type === "junction" && direction % 2 === 0 ? -0.06 : 0;
  item.previousX =
    b.x + 0.5 + (p < 0.5 ? from[0] * (0.5 - p) : d[0] * (p - 0.5)) + hx;
  item.previousY =
    b.y + 0.5 + (p < 0.5 ? from[1] * (0.5 - p) : d[1] * (p - 0.5)) + vy;
}
export function freezeInterpolation(game) {
  for (const n of game.network.active) {
    game.capturePrevious(n.entity, game.network.item(n));
  }
  game.truck.previousY = game.truck.y;
  for (const e of game.combat.enemies.values()) {
    e.previousX = e.x;
    e.previousY = e.y;
  }
  for (const p of game.combat.projectiles) {
    p.previousX = p.x;
    p.previousY = p.y;
  }
}
