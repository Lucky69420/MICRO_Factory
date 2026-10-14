import * as Factory from "../data/index.js";

import { Art } from "../rendering/Art.js";

/** Keep the established inventory order while admitting new registered resources. */
export function initializeInventory(app) {
  const metals = Object.keys(Factory.METALS);
  const order = [
    "coal",
    "sand",
    ...metals,
    ...metals.map((metal) => metal + "_ingot"),
    "basic_ammo",
    ...metals.flatMap((metal) =>
      ["plate", "foil", "wire", "rod", "screw"].map(
        (form) => metal + "_" + form,
      ),
    ),
  ];
  const rank = new Map(order.map((id, index) => [id, index]));
  const groups = new Map(
    ["Raw materials", "Ingots", "Components"].map((group) => [group, []]),
  );
  const entries = Object.entries(Factory.RESOURCES).sort(
    ([a], [b]) => (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity),
  );
  for (const [id, resource] of entries) {
    if (!groups.has(resource.group)) groups.set(resource.group, []);
    groups
      .get(resource.group)
      .push(
        `<span class="stock-item" title="${resource.name}">${Art.icon(id)}<b id="stock-${id}">0</b></span>`,
      );
  }
  app.$("inventory-panel").innerHTML =
    "<h2>Global inventory</h2>" +
    [...groups]
      .map(
        ([group, items]) =>
          `<section><h3>${group}</h3><div class="stock-grid">${items.join("")}</div></section>`,
      )
      .join("");
}

export function itemList(app, items) {
  const entries = Object.entries(items).filter(([, n]) => n);
  return entries.length
    ? entries
        .map(
          ([r, n]) =>
            `<span class="item-stack" title="${Factory.RESOURCES[r].name}">${Art.icon(r)}<b>${n}</b></span>`,
        )
        .join("")
    : '<p class="muted">Empty</p>';
}
export function updateInventory(app) {
  for (const [r, n] of Object.entries(app.game.stock))
    app.$("stock-" + r).textContent = n;
}
