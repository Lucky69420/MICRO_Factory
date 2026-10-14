import { BUILDINGS, RECIPES } from "../data/index.js";

export function machineRecipe(game, b) {
  return b.type === "smelter"
    ? RECIPES[
        "smelter_" + (b.ore[0] || b.recipe?.replace("smelter_", "") || "iron")
      ]
    : RECIPES[b.recipe];
}
export function pendingOutput(game, b) {
  return b.batch?.remaining
    ? Object.keys(b.batch.remaining).find((t) => b.batch.remaining[t] > 0)
    : undefined;
}
export function setRecipe(game, b, id) {
  if (!b || !game.entities.has(b) || RECIPES[id]?.machine !== b.type)
    return false;
  if (b.recipe !== id) game.reclaimInputs(b);
  b.recipe = id;
  return true;
}
export function reclaimInputs(game, b) {
  if (!b || !(b.isProcessor || b.type === "smelter") || !game.entities.has(b))
    return 0;
  const items = [...b.input, ...b.ore, ...Array(b.coal).fill("coal")];
  for (const type of items) game.stock[type]++;
  b.input = [];
  b.ore = [];
  b.coal = 0;
  return items.length;
}
export function processMachine(game, b, dt) {
  const smelting = b.type === "smelter",
    r = game.machineRecipe(b),
    buffer = smelting ? b.ore : b.input,
    definition = BUILDINGS[b.type];
  if (
    !b.batch &&
    r &&
    Object.entries(r.inputs).every(
      ([t, n]) =>
        (smelting
          ? t === "coal"
            ? b.coal
            : buffer.filter((v) => v === t).length
          : buffer.filter((v) => v === t).length) === n,
    )
  ) {
    b.batch = {
      ...r,
      inputs: { ...r.inputs },
      outputs: { ...r.outputs },
      type: r.output,
      time: 0,
    };
    buffer.length = 0;
    if (smelting) {
      b.coal = 0;
      game.fuelConsumed += r.fuelCount || 0;
    }
  }
  if (!b.batch) return;
  const job = b.batch;
  if (!job.remaining) {
    job.time = Math.min(
      job.seconds,
      job.time + dt * definition.processingSpeed,
    );
    if (job.time + 1e-9 < job.seconds) return;
    job.remaining = { ...job.outputs };
    game.convertedGain +=
      Object.values(job.outputs).reduce((a, n) => a + n, 0) -
      Object.values(job.inputs).reduce((a, n) => a + n, 0) +
      (job.fuelCount || 0);
  }
  // Completed results remain part of game one job until all units leave.
  game.flushMachine(b);
}
export function flushMachine(game, b) {
  let type;
  while ((type = game.pendingOutput(b))) {
    const result = game.resolveTransfer(
      b.outputNode,
      type,
      null,
      game.tickCount,
    );
    if (!result) break;
    game.network.clear(b.outputNode);
  }
  if (b.batch?.remaining && !game.pendingOutput(b)) b.batch = null;
}
