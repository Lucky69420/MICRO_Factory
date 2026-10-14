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
RECIPES.basic_ammo = {
  id: "basic_ammo",
  machine: "ammo_factory",
  input: "iron_plate",
  inputCount: 3,
  output: "basic_ammo",
  outputCount: 5,
  seconds: 2,
  inputs: { iron_plate: 2, coal: 1 },
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
export { RECIPES };
