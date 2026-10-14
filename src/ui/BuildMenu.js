import * as Factory from "../data/index.js";

export function categoryTools(app, id) {
  return [
    ...new Set([
      ...app.categories[id].tools,
      ...Object.values(Factory.BUILDINGS)
        .filter((b) => b.category === id && b.id !== "depot")
        .map((b) => b.id),
    ]),
  ];
}
export function palette(app) {
  const tools = app.categoryTools(app.category),
    page = tools.slice(app.palettePage * 10, app.palettePage * 10 + 10);
  app.$("palette-grid").innerHTML = page
    .map((id, i) => {
      const b = Factory.BUILDINGS[id],
        missing = app.game.missing(id).length,
        description =
          id === "demolish"
            ? "Remove buildings and contents. No refund."
            : `${b.name} · ${b.description} · ${b.size}×${b.size} · ${b.maxHp} HP`,
        cost = Object.entries(app.game.cost(id))
          .map(([r, n]) => n + " " + Factory.RESOURCES[r].name)
          .join(", ");
      return `<button class="build ${app.tool === id ? "active" : ""} ${missing ? "unaffordable" : ""}" data-tool="${id}" title="${description}${cost ? " — " + cost : ""}" aria-label="${b?.name || "Demolish"}" aria-pressed="${app.tool === id}">${id === "demolish" ? '<span class="demolition-icon">×</span>' : `<img src="${b.sprite}" alt="">`}<kbd>${(i + 1) % 10}</kbd></button>`;
    })
    .join("");
  app.$("category-name").textContent = app.categories[app.category].name;
  app.$("palette-prev").disabled = app.palettePage === 0;
  app.$("palette-next").disabled = (app.palettePage + 1) * 10 >= tools.length;
  for (const id of Object.keys(app.categories)) {
    const button = app.$("category-" + id);
    button.classList.toggle("active", id === app.category);
    button.textContent =
      app.categories[id].name + " · " + app.bindings[id].toUpperCase();
    button.setAttribute("aria-pressed", String(id === app.category));
  }
}
export function setCategory(app, id) {
  app.category = id;
  app.palettePage = 0;
  app.palette();
}
export function select(app, t) {
  app.pending = null;
  app.drag = null;
  app.strokePreview = null;
  app.tool = t;
  if (t) {
    app.selected = null;
    app.showInspection(true);
    const id = Object.keys(app.categories).find((id) =>
      app.categoryTools(id).includes(t),
    );
    if (id) {
      app.category = id;
      app.palettePage = Math.floor(app.categoryTools(id).indexOf(t) / 10);
    }
  }
  app.$("rotate").disabled = !!t && !Factory.BUILDINGS[t]?.rotatable;
  app.palette();
}
export function cancel(app) {
  app.pending = null;
  app.drag = null;
  app.strokePreview = null;
  app.tool = null;
  app.selected = null;
  app.showInspection(true);
  app.palette();
}

export function initializeBuildMenu(app) {
  app.$("palette-grid").onclick = (e) => {
    const b = e.target.closest("[data-tool]");
    if (b) app.select(b.dataset.tool);
  };
  document
    .querySelectorAll(".build")
    .forEach((b) => (b.onclick = () => app.select(b.dataset.tool)));
  for (const id of Object.keys(app.categories))
    app.$("category-" + id).onclick = () => app.setCategory(id);
  app.$("palette-prev").onclick = () => {
    app.palettePage = Math.max(0, app.palettePage - 1);
    app.palette();
  };
  app.$("palette-next").onclick = () => {
    if ((app.palettePage + 1) * 10 < app.categoryTools(app.category).length)
      app.palettePage++;
    app.palette();
  };
  app.$("palette-toggle").onclick = () => {
    const hidden = (app.$("palette-body").hidden =
      !app.$("palette-body").hidden);
    app.$("palette-toggle").setAttribute("aria-expanded", String(!hidden));
    app.$("palette-toggle").textContent = hidden ? "▴" : "▾";
  };
  app.$("rotate").onclick = () => app.rotate(1);
  app.$("rotate-back").onclick = () => app.rotate(-1);
  app.$("home").onclick = () => {
    app.cam.x = app.game.depot.x + 0.5;
    app.cam.y = app.game.depot.y - 1;
  };
  app.$("help").onclick = () => {
    app.$("settings-dialog").showModal();
    app.$("controls").open = true;
  };
  app.$("pause").onclick = () => {
    app.paused = !app.paused;
    app.clock.reset();
    app.game.freezeInterpolation();
    app.$("pause").textContent = app.paused ? "▶" : "Ⅱ";
    app.message(app.paused ? "Simulation paused." : "Simulation resumed.");
  };
}
