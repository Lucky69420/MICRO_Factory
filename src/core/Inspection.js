import {
  BUILDINGS,
  RESOURCES,
  TRANSPORT,
  TURRETS,
  AMMUNITION,
} from "../data/index.js";
import { DIRS } from "../utils/directions.js";
import { counts } from "../utils/items.js";

export function inspect(game, b) {
  const c = game.config,
    dirNames = ["East", "South", "West", "North"],
    info = {
      name: BUILDINGS[b.type].name,
      hp: `${b.hp} / ${b.maxHp}`,
      direction: dirNames[b.dir],
      status: "Idle",
      input: {},
      output: {},
      progress: null,
      details: {},
    };
  if (b.type === "miner") {
    const r = game.resourceAt(b.x, b.y);
    info.status = b.item ? "Output Blocked" : "Mining";
    info.output = b.item ? counts([b.item.type]) : {};
    info.progress = b.progress / c.productionSeconds;
    info.details = {
      Resource: RESOURCES[r].name,
      "Mining rate": `1 / ${c.productionSeconds} seconds`,
    };
  }
  if (b.type === "smelter" || b.isProcessor) {
    const r = b.batch || game.machineRecipe(b);
    info.input = counts(
      b.type === "smelter"
        ? [...b.ore, ...Array(b.coal).fill("coal")]
        : b.input,
    );
    info.output = {};
    info.progress = b.batch ? Math.min(1, b.batch.time / b.batch.seconds) : 0;
    info.recipe = r;
    info.status = b.batch?.remaining
      ? "Output Blocked"
      : b.batch
        ? b.type === "smelter"
          ? "Smelting"
          : "Processing"
        : "Waiting for Ingredients";
    info.details = {
      Cycle: b.batch?.remaining
        ? "Completed — waiting for output"
        : b.batch
          ? "Processing committed ingredients"
          : "Collecting one recipe",
      "Required ingredients": Object.entries(r.inputs)
        .map(([t, n]) => n + " " + RESOURCES[t].name)
        .join(" + "),
    };
    if (b.batch?.remaining)
      info.details["Awaiting transfer"] = Object.entries(b.batch.remaining)
        .filter(([_type, n]) => n)
        .map(([t, n]) => n + " " + RESOURCES[t].name)
        .join(", ");
  }
  if (b.type === "depot") {
    info.input = counts(b.queue);
    info.output = counts(game.truck.cargo);
    info.status = game.truck.state;
    info.details = {
      Queue: `${b.queue.length} / ${c.depotCapacity}`,
      Truck: `${game.truck.cargo.length} / ${c.truckCapacity}`,
    };
  }
  if (TRANSPORT.has(b.type)) {
    info.output = b.item ? counts([b.item.type]) : {};
    info.progress = b.item?.progress || 0;
    info.status = b.item
      ? b.item.progress >= 1
        ? "Waiting for output"
        : "Transporting"
      : "Empty";
    info.details = {
      Speed: ["junction", "router"].includes(b.type)
        ? "Instant"
        : `1 tile / ${c.beltSeconds} seconds`,
    };
    if (b.type === "splitter")
      info.details.Outputs = `${dirNames[(b.dir + 3) % 4]} / ${dirNames[(b.dir + 1) % 4]} (rear input)`;
    if (b.type === "underground") {
      info.details.Mode = b.mode;
      info.details.Connection = b.link
        ? `${Math.abs(b.x - b.link.x) + Math.abs(b.y - b.link.y)} tiles`
        : "Unpaired — rebuild pair";
    }
    if (b.type === "router") {
      info.direction = null;
      info.status = b.item
        ? game
            .targets(b)
            .some((o) =>
              game.canAccept(o.target, b.item.type, o.from, b, b.item),
            )
          ? "Distributing"
          : "Outputs Blocked"
        : "Empty";
      info.details = {
        "Input side": b.item ? dirNames[b.item.entrySide] : "—",
        "Available outputs": b.item
          ? game
              .targets(b)
              .filter((o) =>
                game.canAccept(o.target, b.item.type, o.from, b, b.item),
              )
              .map((o) => dirNames[o.direction])
              .join(", ") || "None"
          : DIRS.map((d, i) =>
              game.grid.get(b.x + d[0], b.y + d[1]) ? dirNames[i] : null,
            )
              .filter(Boolean)
              .join(", ") || "None",
        Routing: "Automatic round robin; no return to input",
      };
    }
  }
  if (b.type === "junction") {
    info.direction = null;
    info.progress = null;
    info.output = counts(
      Object.values(b.channels)
        .filter(Boolean)
        .map((i) => i.type),
    );
    info.status = Object.values(b.channels).some(Boolean)
      ? "Straight-through transport"
      : "Empty";
    info.details = {};
    for (const [lane, item] of Object.entries(b.channels)) {
      const target = item ? game.targets(b, item)[0] : null;
      info.details[lane[0].toUpperCase() + lane.slice(1) + " channel"] = !item
        ? "Empty"
        : item.progress < 1
          ? "Transporting " + RESOURCES[item.type].name
          : target &&
              game.canAccept(target.target, item.type, target.from, b, item)
            ? "Ready"
            : "Blocked " + RESOURCES[item.type].name;
    }
  }

  if (TURRETS[b.type]) {
    const spec = TURRETS[b.type],
      a = AMMUNITION[spec.ammo];
    info.direction = null;
    info.input = {};
    info.status = !b.ammo ? "Out of Ammo" : b.target ? "Firing" : "Idle";
    info.details = {
      "Accepted ammunition": a.name,
      "Rounds per box": a.rounds,
      "Remaining shots": `${b.ammo} / ${spec.capacity}`,
      Target: b.target ? `Enemy ${b.target.id}` : "None",
      Range: `${spec.range} tiles`,
      Damage: spec.damage,
      "Fire rate": `${spec.fireRate} shots / second`,
      ...(spec.minRange
        ? {
            "Minimum range": `${spec.minRange} tiles`,
            "Blast radius": `${spec.splashRadius} tiles`,
          }
        : {}),
    };
  }
  if (["belt", "underground", "wall"].includes(b.type)) info.minimal = true;
  if (!BUILDINGS[b.type].rotatable) info.direction = null;
  return info;
}
