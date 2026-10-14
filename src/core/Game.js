import { storeItem } from "../combat/Ammunition.js";
import { CONFIG } from "./Config.js";
import { COSTS, RESOURCES, START_INVENTORY } from "../data/index.js";

import * as WorldAPI from "../world/index.js";

import * as NetworkAPI from "../logistics/LogisticsGraph.js";
import * as CombatAPI from "../combat/Combat.js";
import { Grid } from "../world/Grid.js";
import { saveGame, loadGame } from "../persistence/SaveManager.js";
import {
  replacementCompatible,
  planPlacement,
  validate,
  planPair,
  validatePair,
  placePair,
  place,
  rotateBuilding,
} from "../buildings/BuildingPlacement.js";
import {
  add,
  contents,
  destroy,
  queueDamage,
  damage,
  port,
} from "../buildings/BuildingState.js";
import {
  machineRecipe,
  pendingOutput,
  setRecipe,
  reclaimInputs,
  processMachine,
  flushMachine,
} from "../production/ProductionSystem.js";
import {
  side,
  lane,
  canAccept,
  accept,
  targets,
  resolveTransfer,
} from "../logistics/ItemTransfer.js";
import { transport } from "../logistics/LogisticsSystem.js";
import { capturePrevious, freezeInterpolation } from "../core/Interpolation.js";
import { inspect } from "../core/Inspection.js";

/** Owns mutable simulation state. Public commands delegate to focused systems. */
export class Game {
  constructor(config = {}) {
    this.config = { ...CONFIG, contentVersion: 3, ...config };
    this.ammoRemainders = {};
    this.creative = Boolean(config.creative);
    this.seed = String(config.seed ?? "micro-factory");
    this.grid = new Grid(this.config);
    this.entities = new Set();
    this.miners = new Set();
    this.machines = new Set();
    this.network = new NetworkAPI.LogisticsGraph(this);
    this._active = [];
    this._ready = [];
    this.tickCount = 0;
    this.beltCount = 0;
    this.pendingDamage = [];
    this.undergroundLinks = new Set();
    this.turrets = new Set();
    this.ammoConsumed = 0;
    this.spawner = {
      x: Math.floor((this.config.width - 3) / 2),
      y: 0,
      size: 3,
    };
    this.deposits = this.grid.deposits;
    this.stock = Object.fromEntries(Object.keys(RESOURCES).map((r) => [r, 0]));
    Object.assign(this.stock, START_INVENTORY, config.startInventory || {});
    this.costs = config.costs || COSTS;
    this.spent = 0;
    this.delivered = 0;
    this.produced = 0;
    this.discarded = 0;
    this.fuelConsumed = 0;
    this.convertedGain = 0;
    this.time = 0;
    this.depot = this.add(
      "depot",
      Math.floor((this.config.width - 3) / 2),
      this.config.height - 25,
      0,
    );
    this.parkY = this.depot.y + 3;
    for (let y = this.parkY; y < this.config.height; y++)
      for (let x = this.depot.x; x < this.depot.x + 3; x++)
        this.grid.chunkAt(x, y, true).roads.add(this.grid.key(x, y));
    this.depot.queue = [];
    this.truck = { state: "loading", cargo: [], y: this.parkY, timer: 0 };
    this.generate();
    this.combat = new CombatAPI.Combat(this);
  }
  reserved(x, y) {
    const a = this.spawner;
    return x >= a.x && x < a.x + a.size && y >= a.y && y < a.y + a.size;
  }
  road(x, y) {
    return (
      x >= this.depot.x &&
      x < this.depot.x + 3 &&
      y >= this.parkY &&
      y < this.config.height
    );
  }
  generate() {
    WorldAPI.generateTerrain(this);
    WorldAPI.generateDeposits(this, this.config.depositSettings);
    if (this.config.terrain !== false) {
      const check = WorldAPI.terrainValidation(this);
      if (!check.valid)
        throw new Error(
          "World validation failed: " + check.problems.join(", "),
        );
      this.terrainValidation = {
        valid: true,
        startingLand: check.startingLand,
        oreTiles: this.deposits.size,
      };
    }
  }
  resourceAt(x, y) {
    return (
      this.deposits.get(this.grid.key(x, y)) ||
      (this.grid.terrainAt(x, y) === "sand" ? "sand" : undefined)
    );
  }
  add(type, x, y, dir) {
    return add(this, type, x, y, dir);
  }
  cost(type) {
    return this.costs[type] || {};
  }
  missing(type) {
    if (this.creative) return [];
    return Object.entries(this.cost(type))
      .filter(([r, n]) => this.stock[r] < n)
      .map(([r, n]) => `${n - this.stock[r]} ${RESOURCES[r].name}`);
  }
  consume(type) {
    if (this.creative) return;
    for (const [r, n] of Object.entries(this.cost(type))) {
      this.stock[r] -= n;
      this.spent += n;
    }
  }
  replacementCompatible(old, type, x, y) {
    return replacementCompatible(this, old, type, x, y);
  }
  planPlacement(type, x, y, dir = 0, budget = this.stock) {
    return planPlacement(this, type, x, y, dir, budget);
  }
  validate(type, x, y, dir = 0) {
    return validate(this, type, x, y, dir);
  }
  planPair(x, y, ex, ey, dir = 0, budget = this.stock) {
    return planPair(this, x, y, ex, ey, dir, budget);
  }
  validatePair(x, y, ex, ey, dir) {
    return validatePair(this, x, y, ex, ey, dir);
  }
  placePair(x, y, ex, ey, dir = 0) {
    return placePair(this, x, y, ex, ey, dir);
  }
  place(type, x, y, dir = 0) {
    return place(this, type, x, y, dir);
  }
  contents(b) {
    return contents(this, b);
  }
  destroy(b) {
    return destroy(this, b);
  }
  queueDamage(b, amount) {
    return queueDamage(this, b, amount);
  }
  damage(b, amount) {
    return damage(this, b, amount);
  }
  port(b) {
    return port(this, b);
  }
  side(b, from) {
    return side(this, b, from);
  }
  lane(fromSide) {
    return lane(this, fromSide);
  }
  machineRecipe(b) {
    return machineRecipe(this, b);
  }
  pendingOutput(b) {
    return pendingOutput(this, b);
  }
  canAccept(b, type, from, source, item) {
    return canAccept(this, b, type, from, source, item);
  }
  accept(b, type, from, source, item) {
    return accept(this, b, type, from, source, item);
  }
  setRecipe(b, id) {
    return setRecipe(this, b, id);
  }
  reclaimInputs(b) {
    return reclaimInputs(this, b);
  }
  processMachine(b, dt) {
    return processMachine(this, b, dt);
  }
  flushMachine(b) {
    return flushMachine(this, b);
  }
  dispatch() {
    const t = this.truck;
    if (t.state !== "loading" || !t.cargo.length) return false;
    t.state = "outbound";
    return true;
  }
  capturePrevious(b, item) {
    return capturePrevious(this, b, item);
  }
  freezeInterpolation() {
    return freezeInterpolation(this);
  }
  rotateBuilding(b, dir) {
    return rotateBuilding(this, b, dir);
  }
  targets(b, item = b.item) {
    return targets(this, b, item);
  }
  resolveTransfer(node, type, item, epoch) {
    return resolveTransfer(this, node, type, item, epoch);
  }
  transport(dt) {
    return transport(this, dt);
  }
  tick(dt = this.config.step) {
    for (const hit of this.pendingDamage)
      if (this.entities.has(hit.b)) this.damage(hit.b, hit.amount);
    this.pendingDamage.length = 0;
    this.tickCount++;
    this.time += dt;
    this.truck.previousY = this.truck.y;
    const c = this.config;
    this.transport(dt);
    for (const b of this.machines) this.processMachine(b, dt);
    const t = this.truck;
    if (t.state === "loading" && this.entities.has(this.depot)) {
      while (t.cargo.length < c.truckCapacity && this.depot.queue.length)
        t.cargo.push(this.depot.queue.shift());
      if (t.cargo.length === c.truckCapacity) this.dispatch();
    } else if (t.state === "outbound") {
      t.y += c.truckSpeed * dt;
      if (t.y > c.height + 1) {
        for (const r of t.cargo) storeItem(this, r);
        this.delivered += t.cargo.length;
        t.cargo = [];
        t.state = "waiting";
        t.timer = 0;
      }
    } else if (t.state === "waiting") {
      t.timer += dt;
      if (t.timer >= c.returnSeconds) {
        t.state = "returning";
        t.y = c.height + 1;
      }
    } else if (t.state === "returning") {
      t.y -= c.truckSpeed * dt;
      if (t.y <= this.parkY) {
        t.y = this.parkY;
        t.state = "loading";
      }
    }
    this.combat.tick(dt);
  }
  inspect(b) {
    return inspect(this, b);
  }
  inventory() {
    return (
      [...this.entities].reduce((n, b) => n + this.contents(b), 0) +
      this.truck.cargo.length
    );
  }
  save() {
    return saveGame(this);
  }
  static fromSave(data) {
    return loadGame(data, this);
  }
  setCreative(enabled) {
    this.creative = Boolean(enabled);
  }
  setEnemiesEnabled(enabled) {
    this.combat.enabled = Boolean(enabled);
  }
  clearEnemies() {
    this.combat.clear();
  }
}
