import { TURRETS } from "../data/turrets.js";
import { AMMUNITION } from "../data/ammunition.js";

export function advanceProjectiles(combat, dt) {
  for (let i = combat.projectiles.length - 1; i >= 0; i--) {
    const p = combat.projectiles[i];
    p.previousX = p.x;
    p.previousY = p.y;
    p.life -= dt;
    if (p.artillery) {
      // Fixed impact position: a moving target can evade a slow shell.
      p.elapsed = Math.min(p.duration, p.elapsed + dt);
      const t = p.elapsed / p.duration;
      p.x = p.startX + (p.impactX - p.startX) * t;
      p.y = p.startY + (p.impactY - p.startY) * t;
      if (t < 1) continue;
      for (const e of combat.enemies.values())
        if (Math.hypot(e.x - p.impactX, e.y - p.impactY) <= p.splashRadius)
          combat.hit(e, p.damage);
      combat.effects.push({
        x: p.impactX,
        y: p.impactY,
        time: 0.65,
        duration: 0.65,
        radius: p.splashRadius,
        color: "#ffad61",
      });
      combat.projectiles.splice(i, 1);
      continue;
    }
    const target = combat.enemies.get(p.target);
    if (!target || p.life <= 0) {
      combat.projectiles.splice(i, 1);
      continue;
    }
    const dx = target.x - p.x,
      dy = target.y - p.y,
      d = Math.hypot(dx, dy),
      step = (p.speed || combat.game.config.projectileSpeed) * dt;
    if (d <= step + 0.15) {
      combat.hit(target, p.damage);
      combat.projectiles.splice(i, 1);
    } else {
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
    }
  }
}
export function fireTurrets(combat, dt) {
  const g = combat.game;
  for (const b of g.turrets) {
    const spec = TURRETS[b.type];
    b.flash = Math.max(0, b.flash - dt);
    b.cooldown = Math.max(0, b.cooldown - dt);
    const x = b.x + b.size / 2,
      y = b.y + b.size / 2,
      e = combat.nearest(x, y, spec.range, spec.minRange);
    b.target = e;
    if (!e) continue;
    const desired = Math.atan2(e.y - y, e.x - x),
      delta = Math.atan2(
        Math.sin(desired - b.angle),
        Math.cos(desired - b.angle),
      ),
      rotation = Math.min(Math.abs(delta), spec.rotationSpeed * dt);
    b.angle += Math.sign(delta) * rotation;
    if (!b.ammo || b.cooldown > 1e-9 || Math.abs(delta) - rotation > 0.08)
      continue;
    b.ammo--;
    // Conservation tracks logistics units, not internal rounds.
    g.ammoConsumed += 1 / AMMUNITION[spec.ammo].rounds;
    b.cooldown = 1 / spec.fireRate;
    b.flash = b.type === "artillery" ? 0.24 : 0.08;
    const projectile = {
      x,
      y,
      previousX: x,
      previousY: y,
      target: e.id,
      damage: spec.damage,
      speed: spec.projectileSpeed,
      color: spec.color,
      life: g.config.projectileLifetime,
    };
    if (spec.splashRadius)
      Object.assign(projectile, {
        artillery: true,
        startX: x,
        startY: y,
        impactX: e.x,
        impactY: e.y,
        duration: Math.max(
          0.25,
          Math.hypot(e.x - x, e.y - y) / spec.projectileSpeed,
        ),
        elapsed: 0,
        splashRadius: spec.splashRadius,
      });
    combat.projectiles.push(projectile);
  }
}
