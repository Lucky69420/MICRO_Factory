import * as Factory from "../data/index.js";

import { Art } from "../rendering/Art.js";

export function recipeMarkup(app, r) {
  return (
    Object.entries(r.inputs)
      .map(([t, n]) => `${Art.icon(t)}<b>${n}</b>`)
      .join("<span>+</span>") +
    `<span>→</span>${Art.icon(r.output)}<b>${r.outputCount}</b>`
  );
}
export function showInspection(app, force = false) {
  if (app.selected && !app.game.entities.has(app.selected)) app.selected = null;
  const panel = app.$("building-panel");
  panel.hidden = !app.selected;
  if (!app.selected) {
    app.inspectorEntity = null;
    return;
  }
  const b = app.selected,
    info = app.game.inspect(b),
    changed = app.inspectorEntity !== b || force;
  app.inspectorEntity = b;
  panel.classList.toggle("minimal", Boolean(info.minimal));
  app.$("inspection-body").hidden = Boolean(info.minimal);
  app.$("building-name").textContent = info.name;
  app.$("building-icon").innerHTML = Art.buildingIcon(b.type);
  app.$("building-hp").textContent = info.hp + " HP";
  app.$("building-status").textContent = info.status;
  app.$("building-input").innerHTML = app.itemList(info.input);
  app.$("building-output").innerHTML = app.itemList(info.output);
  app.$("building-progress").value = info.progress ?? 0;
  app.$("progress-wrap").hidden = info.progress === null;
  app.$("building-details").innerHTML =
    (info.direction
      ? "<div>Direction <b>" + info.direction + "</b></div>"
      : "") +
    Object.entries(info.details)
      .map(([k, v]) => `<div>${k} <b>${v}</b></div>`)
      .join("");
  const machine = b.type === "smelter" || b.isProcessor;
  app.$("input-heading").hidden = machine;
  app.$("building-input").hidden = machine;
  app.$("output-heading").hidden = machine;
  app.$("building-output").hidden = machine;
  if (machine && info.recipe)
    app.$("building-details").innerHTML +=
      `<div class="recipe-line">${app.recipeMarkup(info.recipe)}</div>`;
  app.$("dispatch").hidden = b.type !== "depot";
  app.$("dispatch").disabled =
    app.game.truck.state !== "loading" || !app.game.truck.cargo.length;
  app.$("recipe-controls").hidden = !Factory.PROCESSORS.has(b.type);
  app.$("reclaim-inputs").disabled = !b.input.length;
  if (Factory.PROCESSORS.has(b.type)) {
    app.$("active-recipe").innerHTML = app.recipeMarkup(
      Factory.RECIPES[b.recipe],
    );
    if (changed) {
      app.$("recipe-options").innerHTML = Object.values(Factory.RECIPES)
        .filter((r) => r.machine === b.type)
        .map(
          (r) =>
            `<button class="recipe-choice ${r.id === b.recipe ? "chosen" : ""}" data-recipe="${r.id}" title="${Factory.RESOURCES[r.input].name} → ${Factory.RESOURCES[r.output].name}">${app.recipeMarkup(r)}</button>`,
        )
        .join("");
    }
  }
}

export function initializeInspectionPanel(app) {
  app.$("close-inspect").onclick = () => {
    app.selected = null;
    app.showInspection(true);
  };
  app.$("dispatch").onclick = () => {
    if (app.game.dispatch())
      app.message(
        "Truck dispatched. Cargo joins inventory after leaving the map.",
      );
    app.showInspection();
  };
  app.$("recipe-options").onclick = (e) => {
    const button = e.target.closest("[data-recipe]");
    if (
      button &&
      app.selected &&
      app.game.setRecipe(app.selected, button.dataset.recipe)
    ) {
      app.message(
        "Recipe changed. Active jobs finish before the new recipe starts.",
      );
      app.showInspection(true);
    }
  };
  app.$("reclaim-inputs").onclick = () => {
    const n = app.game.reclaimInputs(app.selected);
    app.message(`${n} uncommitted ingredients returned to global inventory.`);
    app.updateInventory();
    app.showInspection(true);
  };
}
