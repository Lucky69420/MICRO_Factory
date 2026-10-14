import { AMMUNITION } from "../data/ammunition.js";

export function migrateSave(snapshot) {
  if (snapshot.version >= 3) return snapshot;
  snapshot.config = { ...snapshot.config, contentVersion: 2 };
  snapshot.ammoRemainders = {};
  const recoverRounds = (n) => {
    const total = (snapshot.ammoRemainders.primitive_ammo || 0) + n;
    snapshot.stock.primitive_ammo =
      (snapshot.stock.primitive_ammo || 0) +
      Math.floor(total / AMMUNITION.primitive_ammo.rounds);
    snapshot.ammoRemainders.primitive_ammo =
      total % AMMUNITION.primitive_ammo.rounds;
  };
  const migrateItem = (item) => {
    if (item === "basic_ammo") return { type: "primitive_ammo", rounds: 1 };
    if (item?.type === "basic_ammo")
      return { ...item, type: "primitive_ammo", rounds: 1 };
    return item;
  };
  recoverRounds(snapshot.stock.basic_ammo || 0);
  delete snapshot.stock.basic_ammo;
  for (const b of snapshot.buildings) {
    if (b.type === "turret" && b.ammo > 90) {
      recoverRounds(b.ammo - 90);
      b.ammo = 90;
    }
    b.item = migrateItem(b.item);
    if (b.channels)
      for (const lane of Object.keys(b.channels))
        b.channels[lane] = migrateItem(b.channels[lane]);
    if (b.queue) b.queue = b.queue.map(migrateItem);
    if (b.output) {
      recoverRounds(b.output.filter((t) => t === "basic_ammo").length);
      b.output = b.output.filter((t) => t !== "basic_ammo");
    }
    if (b.recipe === "basic_ammo") b.recipe = "primitive_ammo";
    if (b.batch?.output === "basic_ammo" || b.batch?.type === "basic_ammo") {
      if (b.batch.remaining) recoverRounds(b.batch.remaining.basic_ammo || 0);
      else
        for (const [t, n] of Object.entries(
          b.batch.inputs || { iron_plate: 2, coal: 1 },
        ))
          snapshot.stock[t] = (snapshot.stock[t] || 0) + n;
      b.batch = null;
    }
  }
  if (snapshot.truck?.cargo)
    snapshot.truck.cargo = snapshot.truck.cargo.map(migrateItem);
  for (const link of snapshot.links || [])
    for (const packet of link.pipeline) {
      // Pipelines retain their original packet wrapper.
      if (packet.item) packet.item = migrateItem(packet.item);
      else if (packet.type === "basic_ammo")
        Object.assign(packet, migrateItem(packet));
    }
  return snapshot;
}
