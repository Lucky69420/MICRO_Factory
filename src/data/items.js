const RESOURCES = {
  sand: {
    name: "Sand",
    color: "#e5cb91",
    form: "raw",
    group: "Raw materials",
    icon: "assets/mindustry/item-sand.png",
    fallback: "assets/sand.svg",
  },
  coal: {
    name: "Coal",
    color: "#555963",
    form: "ore",
    group: "Raw materials",
    icon: "assets/coal.svg",
  },
};
const METALS = {
  iron: { name: "Iron", color: "#b5c0ce", oreColor: "#b76049" },
  copper: { name: "Copper", color: "#d99760", oreColor: "#cf8c49" },
  tin: { name: "Tin", color: "#dde7ec", oreColor: "#b1c3ce" },
};
for (const [metal, m] of Object.entries(METALS)) {
  RESOURCES[metal] = {
    name: m.name + " ore",
    color: m.oreColor,
    form: "ore",
    group: "Raw materials",
    icon: `assets/${metal}.svg`,
  };
  for (const [form, label] of Object.entries({
    ingot: "ingot",
    plate: "plate",
    foil: "foil",
    wire: "wire",
    rod: "rod",
    screw: "screw",
  })) {
    const id = metal + "_" + form;
    RESOURCES[id] = {
      name: m.name + " " + label,
      color: m.color,
      form,
      group: form === "ingot" ? "Ingots" : "Components",
      icon: `assets/${id}.svg`,
    };
  }
}
for (const r of Object.values(RESOURCES)) {
  r.fallback = r.fallback || r.icon;
  if (r.form !== "ore" && r.form !== "raw")
    r.icon = r.icon
      .replace("assets/", "assets/modernity/")
      .replace(".svg", ".png");
}
// Mindustry ore overlays also supply the shared raw-material icons.
for (const [id, r] of Object.entries(RESOURCES))
  if (r.form === "ore") {
    r.icon = `assets/mindustry/ore-${id}1.png`;
    r.oreTextures = [1, 2, 3].map((i) => `assets/mindustry/ore-${id}${i}.png`);
  }
RESOURCES.basic_ammo = {
  name: "Basic Ammo",
  color: "#ecc26c",
  form: "ammo",
  group: "Components",
  icon: "assets/basic_ammo.svg",
  fallback: "assets/basic_ammo.svg",
};
export { RESOURCES, METALS };
