import { Game } from "./core/Game.js";
import { FixedClock } from "./core/FixedClock.js";
import { categories, defaultBindings } from "./data/keybindings.js";
import { randomSeed } from "./utils/randomSeed.js";
import {
  categoryTools,
  palette,
  setCategory,
  select,
  cancel,
  initializeBuildMenu,
} from "./ui/BuildMenu.js";
import { rotate, build } from "./input/BuildControls.js";
import { screen, tile, zoom } from "./rendering/Camera.js";
import { message } from "./ui/Notifications.js";
import {
  bindingNotice,
  bindControls,
  initializeKeybindings,
} from "./input/Keybindings.js";
import { arrow, drawLogistics } from "./rendering/LogisticsRenderer.js";
import {
  itemList,
  updateInventory,
  initializeInventory,
} from "./ui/InventoryPanel.js";
import {
  recipeMarkup,
  showInspection,
  initializeInspectionPanel,
} from "./ui/InspectionPanel.js";
import { render } from "./rendering/Renderer.js";
import { drawCombat } from "./rendering/CombatRenderer.js";
import { frame } from "./core/GameLoop.js";
import { updateAffordability } from "./ui/UIManager.js";
import { initializeMouseControls } from "./input/MouseControls.js";
import { initializeKeyboardControls } from "./input/KeyboardControls.js";
import { initializeSettingsMenu } from "./ui/SettingsMenu.js";

/** Builds one browser session; the simulation itself never imports this module. */
export function createApp({ config = {}, gameClass = Game } = {}) {
  const game = new gameClass({ seed: randomSeed(), ...config });
  const canvas = document.querySelector("canvas");
  const app = {
    Game: gameClass,
    game,
    canvas,
    ctx: canvas.getContext("2d"),
    clock: new FixedClock(),
    $: (id) => document.getElementById(id),
    cam: { x: game.depot.x + 0.5, y: game.depot.y - 1, scale: 36 },
    keys: new Set(),
    selected: null,
    pending: null,
    uiStamp: 0,
    tool: null,
    dir: 0,
    hover: null,
    drag: null,
    paused: false,
    last: 0,
    interpolation: 1,
    toastUntil: 5,
    bindings: { ...defaultBindings },
    category: "logistics",
    palettePage: 0,
    strokePreview: null,
    categories: structuredClone(categories),
    settings: { showGrid: true, creative: false, enemies: false },
    monitoring: {
      frames: 0,
      ticks: 0,
      start: 0,
      fps: 0,
      tps: 0,
      simulationMs: 0,
      renderMs: 0,
    },
    visibleBuildings: new Set(),
    visibleDeposits: [],
    inspectorEntity: null,
  };
  app.categoryTools = (id) => categoryTools(app, id);
  app.palette = () => palette(app);
  app.setCategory = (id) => setCategory(app, id);
  app.select = (t) => select(app, t);
  app.cancel = () => cancel(app);
  app.rotate = (step = 1) => rotate(app, step);
  app.build = (t) => build(app, t);
  app.screen = (x, y) => screen(app, x, y);
  app.tile = (e) => tile(app, e);
  app.zoom = (f) => zoom(app, f);
  app.message = (t) => message(app, t);
  app.bindingNotice = (text) => bindingNotice(app, text);
  app.bindControls = () => bindControls(app);
  app.arrow = (cx, cy, d, s, color) => arrow(app, cx, cy, d, s, color);
  app.drawLogistics = (b, x, y, s) => drawLogistics(app, b, x, y, s);
  app.itemList = (items) => itemList(app, items);
  app.updateInventory = () => updateInventory(app);
  app.recipeMarkup = (r) => recipeMarkup(app, r);
  app.showInspection = (force = false) => showInspection(app, force);
  app.render = (now) => render(app, now);
  app.drawCombat = (xmin, ymin, xmax, ymax) =>
    drawCombat(app, xmin, ymin, xmax, ymax);
  app.frame = (ms) => frame(app, ms);
  app.updateAffordability = () => updateAffordability(app);
  initializeInventory(app);
  initializeKeybindings(app);
  initializeBuildMenu(app);
  initializeMouseControls(app);
  initializeKeyboardControls(app);
  initializeSettingsMenu(app);
  initializeInspectionPanel(app);
  requestAnimationFrame(app.frame);
  return app;
}
