import { SPECS, TRANSPORT } from "../data/index.js";

export function add(game, type, x, y, dir) {
  const spec = SPECS[type],
    b = {
      type,
      x,
      y,
      dir,
      id: game.grid.key(x, y),
      isTransport: TRANSPORT.has(type),
      isProcessor: spec.behavior === "recipe",
      size: spec.size,
      hp: spec.maxHp,
      maxHp: spec.maxHp,
      progress: 0,
      item: null,
      channels: { horizontal: null, vertical: null },
      input: [],
      recipe: spec.supportedRecipes[0] || null,
      ore: [],
      coal: 0,
      output: [],
      batch: null,
      mode: "entrance",
      link: null,
      turn: 0,
      ammo: 0,
      cooldown: 0,
      angle: 0,
      flash: 0,
      target: null,
    };
  if (type === "smelter" || b.isProcessor) delete b.output;
  game.entities.add(b);
  for (let yy = y; yy < y + b.size; yy++)
    for (let xx = x; xx < x + b.size; xx++) game.grid.set(xx, yy, b);
  if (type === "miner") game.miners.add(b);
  if (type === "turret") game.turrets.add(b);
  if (type === "smelter" || b.isProcessor) game.machines.add(b);
  game.network.add(b);
  if (type === "belt") game.beltCount++;
  return b;
}
export function contents(game, b) {
  return (
    (b.item ? 1 : 0) +
    (b.channels.horizontal ? 1 : 0) +
    (b.channels.vertical ? 1 : 0) +
    b.input.length +
    b.ore.length +
    b.coal +
    (b.output?.length || 0) +
    (b.batch
      ? b.batch.remaining
        ? Object.values(b.batch.remaining).reduce((a, n) => a + n, 0)
        : Object.values(
            b.batch.inputs || {
              legacy: b.batch.inputCount ?? game.config.batchSize,
            },
          ).reduce((a, n) => a + n, 0) - (b.batch.fuelCount || 0)
      : 0) +
    (b.queue ? b.queue.length : 0) +
    (b.ammo || 0) +
    (b.mode === "entrance" && b.connection ? b.connection.pipeline.length : 0)
  );
}
export function destroy(game, b) {
  if (!game.entities.has(b)) return;
  game.discarded += game.contents(b);
  for (let y = b.y; y < b.y + b.size; y++)
    for (let x = b.x; x < b.x + b.size; x++) game.grid.remove(x, y);
  b.removed = true;
  game.entities.delete(b);
  if (b.type === "belt") game.beltCount--;
  game.miners.delete(b);
  game.machines.delete(b);
  game.turrets.delete(b);
  if (b.connection) {
    if (b.mode === "exit") game.discarded += b.connection.pipeline.length;
    b.connection.pipeline.length = 0;
    game.undergroundLinks.delete(b.connection);
    game.grid.indexLink(b.connection, true);
  }
  const partner = b.link;
  if (partner) {
    partner.link = null;
    partner.connection = null;
    b.link = null;
  }
  game.network.remove(b);
  if (partner) game.network.refreshAround(partner);
}
export function queueDamage(game, b, amount) {
  if (game.entities.has(b) && Number.isFinite(amount) && amount > 0)
    game.pendingDamage.push({ b, amount });
}
export function damage(game, b, amount) {
  if (!b || !Number.isFinite(amount) || amount <= 0) return;
  b.hp = Math.max(0, b.hp - amount);
  if (!b.hp) game.destroy(b);
}
export function port(game, b) {
  return [
    [b.x + b.size, b.y],
    [b.x + b.size - 1, b.y + b.size],
    [b.x - 1, b.y + b.size - 1],
    [b.x, b.y - 1],
  ][b.dir];
}
