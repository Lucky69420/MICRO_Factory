import * as BeltAPI from "../logistics/BeltGeometry.js";

export function transport(game, dt) {
  const epoch = game.tickCount,
    c = game.config,
    active = game._active,
    ready = game._ready;
  active.length = 0;
  ready.length = 0;
  for (const link of game.undergroundLinks)
    for (const record of link.pipeline)
      record.remaining = Math.max(0, record.remaining - dt);
  for (const n of game.network.active) {
    if (n.transport) n.occupiedEpoch = epoch;
    active.push(n);
  }
  for (const b of game.miners)
    if (!b.item) {
      b.progress += dt;
      if (b.progress + 1e-9 >= c.productionSeconds) {
        b.item = {
          type: game.resourceAt(b.x, b.y),
          progress: 1,
          previousProgress: 1,
          from: [0, 0],
        };
        b.progress = 0;
        game.produced++;
        ready.push(b.itemNode);
      }
    }
  for (const n of active) {
    const b = n.entity,
      item = n.item;
    if (n.transport) {
      if (["junction", "router"].includes(b.type)) item.progress = 1;
      game.capturePrevious(b, item);
      item.previousProgress = item.progress;
      if (item.progress < 1) {
        const seconds =
          b.type === "belt"
            ? c.beltSeconds *
              BeltAPI.paths[
                (item.entrySide ??
                  game.side(b, [
                    b.x + (item.from?.[0] || 0),
                    b.y + (item.from?.[1] || 0),
                  ])) *
                  4 +
                  b.dir
              ].length
            : c.beltSeconds;
        item.progress = Math.min(1, item.progress + dt / seconds);
      }
    }
    if (item.progress >= 1) ready.push(n);
  }
  for (const b of game.machines)
    if (game.pendingOutput(b)) ready.push(b.outputNode);
  ready.sort((a, b) => a.id - b.id);
  if (ready.length) {
    const offset = epoch % ready.length;
    ready.push(...ready.splice(0, offset));
  }
  for (const n of ready) {
    const b = n.entity,
      item = n.slot === "output" ? null : n.item,
      type = item?.type || game.pendingOutput(b);
    if (!type) continue;
    if (b.type === "underground" && b.mode === "entrance" && b.connection) {
      const link = b.connection;
      if (link.pipeline.length < link.distance - 1) {
        link.pipeline.push({
          item,
          remaining: (link.distance - 1) * c.beltSeconds,
        });
        game.network.clear(n);
      }
      continue;
    }
    const result = game.resolveTransfer(n, type, item, epoch);
    if (!result) continue;
    game.network.clear(n);
    if (n.slot === "output" && !game.pendingOutput(b)) b.batch = null;
    if (b.type === "splitter")
      b.turn = result.firstEdge.direction === (b.dir + 3) % 4 ? 1 : 0;
  }
  // Drain only a mature FIFO head into an exit that was empty at tick start.
  for (const link of game.undergroundLinks) {
    const head = link.pipeline[0],
      exit = link.exit;
    if (
      head &&
      head.remaining <= 1e-9 &&
      exit.itemNode.occupiedEpoch !== epoch &&
      game.accept(
        exit,
        head.item.type,
        [link.entrance.x, link.entrance.y],
        link.entrance,
        head.item,
      )
    ) {
      link.pipeline.shift();
      exit.itemNode.occupiedEpoch = epoch;
    }
  }
}
