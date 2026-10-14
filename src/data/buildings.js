import { CONFIG } from "../core/Config.js";
import { RECIPES } from "./recipes.js";
const PROCESSORS = new Set(["bender", "wiremill", "lathe", "ammo_factory"]);
const MACHINE_NAMES = {
  wiremill: "Wire Mill",
  bender: "Bender",
  lathe: "Lathe",
  ammo_factory: "Ammunition Factory",
  turret: "Basic Turret",
  belt: "Conveyor",
  underground: "Underground Conveyor",
};
const COSTS = {
  wall: { iron_ingot: 5 },
  ammo_factory: { iron_plate: 15, copper_plate: 5 },
  turret: { iron_plate: 20, copper_plate: 10 },
  miner: { iron_ingot: 10 },
  belt: { iron_ingot: 1 },
  underground: { iron_ingot: 4 },
  junction: { iron_ingot: 3 },
  splitter: { iron_ingot: 3, copper_ingot: 1 },
  router: { iron_ingot: 3 },
  smelter: { iron_ingot: 15, copper_ingot: 5 },
  bender: { iron_plate: 15, copper_ingot: 5 },
  wiremill: { iron_plate: 10, copper_plate: 5 },
  lathe: { iron_plate: 15, copper_wire: 5 },
};
const SPECS = {
  wall: { size: 1, hp: 200 },
  ammo_factory: { size: 2, hp: 150 },
  turret: { size: 2, hp: 200 },
  miner: { size: 1, hp: 100 },
  belt: { size: 1, hp: 30 },
  smelter: { size: 2, hp: 150 },
  depot: { size: 3, hp: 1000 },
  underground: { size: 1, hp: 30 },
  junction: { size: 1, hp: 50 },
  splitter: { size: 1, hp: 50 },
  router: { size: 1, hp: 50 },
  bender: { size: 2, hp: 150 },
  wiremill: { size: 2, hp: 150 },
  lathe: { size: 2, hp: 150 },
};
const TRANSPORT = new Set([
  "belt",
  "underground",
  "junction",
  "splitter",
  "router",
]);
const BUILDINGS = SPECS;
for (const [id, d] of Object.entries(BUILDINGS))
  Object.assign(d, {
    id,
    name: MACHINE_NAMES[id] || id[0].toUpperCase() + id.slice(1),
    maxHp: d.hp,
    cost: COSTS[id] || {},
    inputCapacity:
      id === "turret"
        ? CONFIG.ammoCapacity
        : id === "depot"
          ? CONFIG.depotCapacity
          : 1,
    outputCapacity:
      id === "turret" || id === "smelter" || PROCESSORS.has(id) ? 0 : 1,
    supportedRecipes: Object.values(RECIPES)
      .filter((r) => r.machine === id)
      .map((r) => r.id),
    processingSpeed: 1,
    behavior:
      d.behavior ||
      (id === "turret"
        ? "combat"
        : PROCESSORS.has(id)
          ? "recipe"
          : id === "smelter"
            ? "smelting"
            : id === "miner"
              ? "mining"
              : TRANSPORT.has(id)
                ? "transport"
                : "storage"),
    inputBehavior: id === "miner" ? "none" : "compatible perimeter",
    outputBehavior:
      id === "turret"
        ? "none"
        : id === "junction"
          ? "straight channels"
          : id === "router"
            ? "round robin"
            : "directional port",
    sprite: "assets/building-" + id + ".svg",
  });
PROCESSORS.clear();
for (const [id, d] of Object.entries(BUILDINGS))
  if (d.behavior === "recipe") PROCESSORS.add(id);
const DESCRIPTIONS = {
  belt: "Move items along a continuous lane",
  router: "Distribute items to available outlets",
  junction: "Cross two straight transport lanes",
  underground: "Carry items beneath obstacles, up to six tiles",
  splitter: "Alternate between left and right outlets",
  miner: "Extract ore or unlimited sand",
  wall: "Block enemies and absorb melee attacks",
  turret: "Fire physically delivered ammunition",
  smelter: "Smelt metal ore using coal",
  depot: "Load the delivery truck",
};
for (const [id, b] of Object.entries(BUILDINGS))
  Object.assign(b, {
    description: DESCRIPTIONS[id] || "Process materials with a selected recipe",
    category: TRANSPORT.has(id)
      ? "logistics"
      : id === "miner"
        ? "mining"
        : ["wall", "turret", "ammo_factory"].includes(id)
          ? "defense"
          : id === "depot"
            ? "infrastructure"
            : "production",
    replacementGroup: TRANSPORT.has(id) ? "logistics" : id,
    footprint: [b.size, b.size],
    rotatable: !["wall", "depot", "router", "junction"].includes(id),
  });

for (const b of Object.values(BUILDINGS))
  if (b.behavior === "smelting" || b.behavior === "recipe") {
    b.inputCapacity = Math.max(
      ...b.supportedRecipes.map((id) =>
        Object.values(RECIPES[id].inputs).reduce((a, n) => a + n, 0),
      ),
    );
    b.outputCapacity = 0;
  }
export { BUILDINGS, SPECS, COSTS, TRANSPORT, PROCESSORS };
