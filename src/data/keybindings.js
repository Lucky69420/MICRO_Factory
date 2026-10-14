export const categories = {
  logistics: {
    name: "Logistics",
    key: "q",
    tools: ["belt", "router", "junction", "underground", "splitter"],
  },
  production: {
    name: "Production",
    key: "e",
    tools: ["smelter", "bender", "wiremill", "lathe", "mixer", "ammo_factory"],
  },
  mining: { name: "Mining", key: "f", tools: ["miner"] },
  defense: {
    name: "Defense",
    key: "t",
    tools: ["wall", "turret", "light_turret", "heavy_turret", "artillery"],
  },
  infrastructure: { name: "Tools", key: "g", tools: ["demolish"] },
};
export const defaultBindings = {
  logistics: "q",
  production: "e",
  mining: "f",
  defense: "t",
  infrastructure: "g",
  clockwise: "r",
  counterclockwise: "shift+r",
  demolish: "x",
  cancel: "escape",
  pause: "space",
  up: "w",
  left: "a",
  down: "s",
  right: "d",
};
export const token = (e) =>
  (e.shiftKey ? "shift+" : "") +
  (e.key === " " ? "space" : e.key.toLowerCase());
