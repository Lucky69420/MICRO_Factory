import { RESOURCES, RECIPES, TURRETS } from "../data/index.js";

import { boxRounds } from "../combat/Ammunition.js";

export function side(game, b, from) {
  const dx = from[0] - b.x,
    dy = from[1] - b.y;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : dy > 0 ? 1 : 3;
}
export function lane(game, fromSide) {
  return fromSide % 2 === 0 ? "horizontal" : "vertical";
}
export function canAccept(game, b, type, from, source, _item) {
  if (!b || b.removed || !RESOURCES[type]) return false;
  if (b.isTransport) {
    const side = game.side(b, from);
    if (b.type === "belt" && b.dir === side) return false;
    if (b.type === "junction") return !b.channels[game.lane(side)];
    if (b.itemNode.item) return false;
    if (b.type === "splitter" && side !== (b.dir + 2) % 4) return false;
    if (b.type === "underground") {
      if (b.mode === "exit") return source === b.link && source?.link === b;
      if (side !== (b.dir + 2) % 4) return false;
    }
    return true;
  }
  if (TURRETS[b.type]) {
    const spec = TURRETS[b.type],
      rounds = boxRounds(type, _item);
    return type === spec.ammo && rounds > 0 && b.ammo + rounds <= spec.capacity;
  }
  if (b.isProcessor || b.type === "smelter") {
    if (b.batch) return false;
    const r =
      b.type === "smelter" &&
      !b.ore.length &&
      ["iron", "copper", "tin", "lead"].includes(type)
        ? RECIPES["smelter_" + type]
        : game.machineRecipe(b);
    if (!r || !Object.hasOwn(r.inputs, type)) return false;
    const have =
      b.type === "smelter"
        ? type === "coal"
          ? b.coal
          : b.ore.filter((t) => t === type).length
        : b.input.filter((t) => t === type).length;
    return (
      have < r.inputs[type] &&
      (b.type !== "smelter" ||
        type === "coal" ||
        !b.ore.length ||
        b.ore[0] === type)
    );
  }
  if (b.type === "depot") return b.queue.length < game.config.depotCapacity;
  return false;
}
export function accept(game, b, type, from, source, item) {
  if (!game.canAccept(b, type, from, source, item)) return false;
  if (b.isTransport) {
    const side = game.side(b, from),
      dx = from[0] - b.x,
      dy = from[1] - b.y;
    const next = item || { type, from: [0, 0] };
    next.type = type;
    next.progress = ["junction", "router"].includes(b.type) ? 1 : 0;
    next.previousProgress = next.progress;
    next.from = [Math.sign(dx), Math.sign(dy)];
    next.entrySide = side;
    next.direction = (side + 2) % 4;
    delete next.routerTrail;
    if (
      ["junction", "router"].includes(b.type) ||
      source?.type === "underground"
    ) {
      next.previousX = undefined;
      next.previousY = undefined;
    }
    if (b.type === "junction") b.channels[game.lane(side)] = next;
    else b.item = next;
  } else if (TURRETS[b.type]) b.ammo += boxRounds(type, item);
  else if (b.isProcessor) b.input.push(type);
  else if (b.type === "depot")
    b.queue.push(
      item?.rounds !== undefined ? { type, rounds: item.rounds } : type,
    );
  else if (type === "coal") b.coal++;
  else b.ore.push(type);
  return true;
}
export function targets(game, b, item = b.item) {
  const node =
    b.type === "junction"
      ? item?.direction % 2 === 0
        ? b.horizontalNode
        : b.verticalNode
      : b.outputNode || b.itemNode;
  if (!node) return [];
  const edges = node.edges;
  if (b.type === "junction")
    return edges.filter((e) => e.direction === item.direction);
  if (b.type === "router") {
    const ordered = [];
    for (let i = 0; i < 4; i++) {
      const d = (b.turn + i) % 4;
      if (d !== item.entrySide) {
        const edge = edges.find((e) => e.direction === d);
        if (edge) ordered.push(edge);
      }
    }
    return ordered;
  }
  if (b.type === "splitter") return b.turn ? [...edges].reverse() : edges;
  return edges;
}
export function resolveTransfer(game, node, type, item, epoch) {
  const source = node.entity,
    visited = new Set([node.id]),
    explored = new Set(),
    stack = [
      {
        node,
        b: source,
        item: item || { type },
        edges: game.targets(source, item),
        index: 0,
      },
    ];
  const commit = (edge, frame) => {
    const transfer = item || { type, from: [0, 0] };
    if (!game.accept(edge.target, type, edge.from, frame.b, transfer))
      return null;
    for (let i = 0; i < stack.length; i++) {
      const hop = stack[i],
        chosen = i === stack.length - 1 ? edge : hop.edges[hop.index - 1];
      if (hop.b.type === "router") hop.b.turn = (chosen.direction + 1) % 4;
      if (hop.node.transport) hop.node.occupiedEpoch = epoch;
    }
    if (edge.node?.transport) edge.node.occupiedEpoch = epoch;
    if (stack.length > 1 || ["router", "junction"].includes(source.type)) {
      transfer.previousX = undefined;
      transfer.previousY = undefined;
    }
    return { edge, firstEdge: stack[0].edges[stack[0].index - 1] };
  };
  while (stack.length) {
    const frame = stack[stack.length - 1];
    if (frame.index >= frame.edges.length) {
      visited.delete(frame.node.id);
      stack.pop();
      continue;
    }
    const edge = frame.edges[frame.index++],
      target = edge.target;
    if (
      !target ||
      visited.has(edge.node?.id) ||
      (edge.node?.transport && edge.node.occupiedEpoch === epoch) ||
      !game.canAccept(target, type, edge.from, frame.b, frame.item)
    )
      continue;
    if (["junction", "router"].includes(target.type)) {
      const side = game.side(target, edge.from),
        state = edge.node.id * 4 + side;
      if (explored.has(state)) continue;
      explored.add(state);
      const incoming = {
        ...frame.item,
        type,
        entrySide: side,
        direction: (side + 2) % 4,
      };
      visited.add(edge.node.id);
      stack.push({
        node: edge.node,
        b: target,
        item: incoming,
        edges: game.targets(target, incoming),
        index: 0,
      });
      continue;
    }
    const result = commit(edge, frame);
    if (result) return result;
  }
  // No downstream outlet: retain one item in an empty router / crossing lane.
  // This also permits feeding a junction before its outlet has been built.
  stack.push({
    node,
    b: source,
    item,
    edges: game.targets(source, item),
    index: 0,
  });
  const frame = stack[0];
  for (const edge of frame.edges) {
    frame.index++;
    if (
      ["router", "junction"].includes(edge.target.type) &&
      edge.node.occupiedEpoch !== epoch &&
      game.canAccept(edge.target, type, edge.from, source, item)
    ) {
      const result = commit(edge, frame);
      if (result) return result;
    }
  }
  return null;
}
