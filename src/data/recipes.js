import { METALS } from "./items.js";
const RECIPES = {};
for (const metal of Object.keys(METALS))
  for (const [machine, from, to, count] of [
    ["bender", "ingot", "plate", 1],
    ["bender", "plate", "foil", 2],
    ["wiremill", "ingot", "wire", 2],
    ["lathe", "ingot", "rod", 2],
    ["lathe", "rod", "screw", 2],
  ]) {
    const id = machine + "_" + metal + "_" + to;
    RECIPES[id] = {
      id,
      machine,
      input: metal + "_" + from,
      inputCount: 1,
      output: metal + "_" + to,
      outputCount: count,
      seconds: 2,
    };
  }
RECIPES.gunpowder = {
  id: "gunpowder",
  machine: "mixer",
  input: "coal",
  inputCount: 2,
  inputs: { coal: 1, sulfur: 1 },
  output: "gunpowder",
  outputCount: 2,
  seconds: 2,
};
for (const [id, inputs, seconds] of [
  ["primitive_ammo", { iron_ingot: 1, coal: 1 }, 2],
  ["ammo_556", { iron_ingot: 1, lead_ingot: 1, gunpowder: 1 }, 3],
  ["ammo_762", { iron_ingot: 2, lead_ingot: 1, gunpowder: 1 }, 3],
  ["artillery_shell", { iron_ingot: 4, lead_ingot: 2, gunpowder: 3 }, 6],
])
  RECIPES[id] = {
    id,
    machine: "ammo_factory",
    input: "iron_ingot",
    inputCount: Object.values(inputs).reduce((a, n) => a + n, 0),
    inputs,
    output: id,
    outputCount: 1,
    seconds,
  };
for (const r of Object.values(RECIPES)) {
  r.inputs = r.inputs || { [r.input]: r.inputCount };
  r.outputs = { [r.output]: r.outputCount };
}
for (const metal of Object.keys(METALS)) {
  const id = "smelter_" + metal;
  RECIPES[id] = {
    id,
    machine: "smelter",
    input: metal,
    inputCount: 8,
    output: metal + "_ingot",
    outputCount: 8,
    seconds: 8,
    inputs: { [metal]: 8, coal: 1 },
    outputs: { [metal + "_ingot"]: 8 },
    fuel: "coal",
    fuelCount: 1,
  };
}

RECIPES.smelter_lead = {
  id: "smelter_lead",
  machine: "smelter",
  input: "lead",
  inputCount: 8,
  output: "lead_ingot",
  outputCount: 8,
  seconds: 8,
  inputs: { lead: 8, coal: 1 },
  outputs: { lead_ingot: 8 },
  fuel: "coal",
  fuelCount: 1,
};

export { RECIPES };
