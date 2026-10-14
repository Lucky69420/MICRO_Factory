import { TURRETS } from "./turrets.js";
import { CONFIG } from "../core/Config.js";
import { RECIPES } from "./recipes.js";
const PROCESSORS = new Set([
  "bender",
  "wiremill",
  "lathe",
  "ammo_factory",
  "mixer",
]);
const MACHINE_NAMES = {
  wiremill: "Wire Mill",
  bender: "Bender",
  lathe: "Lathe",
  ammo_factory: "Assembler",
  mixer: "Mixer",
  light_turret: "Light Machine Gun Turret",
  heavy_turret: "Heavy Machine Gun Turret",
  artillery: "Artillery Turret",
  turret: "Basic Turret",
  belt: "Conveyor",
  underground: "Underground Conveyor",
};
const COSTS = {
  mixer: { iron_plate: 12, copper_ingot: 5 },
  light_turret: { iron_plate: 25, copper_plate: 15, lead_ingot: 5 },
  heavy_turret: { iron_plate: 40, copper_plate: 20, lead_ingot: 10 },
  artillery: { iron_plate: 100, copper_plate: 40, lead_ingot: 30 },
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
  mixer: { size: 2, hp: 150 },
  light_turret: { size: 2, hp: 180 },
  heavy_turret: { size: 2, hp: 280 },
  artillery: { size: 3, hp: 400 },
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
    inputCapacity: TURRETS[id]
      ? TURRETS[id].capacity
      : id === "depot"
        ? CONFIG.depotCapacity
        : 1,
    outputCapacity:
      TURRETS[id] || id === "smelter" || PROCESSORS.has(id) ? 0 : 1,
    supportedRecipes: Object.values(RECIPES)
      .filter((r) => r.machine === id)
      .map((r) => r.id),
    processingSpeed: 1,
    behavior:
      d.behavior ||
      (TURRETS[id]
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
    outputBehavior: TURRETS[id]
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
        : id === "wall" || TURRETS[id]
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
