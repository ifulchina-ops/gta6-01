// Combat: bullets, muzzle flashes, hits and pickups. Rico's pistol fires
// where the mouse points; gang members and officers shoot back with worse
// aim. Ammo, health and cash pickups drop from beaten enemies and sit on the
// street until collected. Particles are the sparks, blood puffs and smoke.
import { PLAYER } from './config.js';

export function createCombat() {
  return { bullets: [], particles: [], pickups: [] };
}

export function fireBullet(game, x, y, angle, speed, damage, fromPlayer) {
  game.combat.bullets.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.9, damage, fromPlayer });
  spawnParticles(game, x, y, 4, '#f2c94c', 120);
}

/** An enemy shoots at a point with a spread, so the player can dodge. */
export function enemyShoot(game, x, y, tx, ty, damage) {
  const base = Math.atan2(ty - y, tx - x);
  const angle = base + (game.random() - 0.5) * 0.35;
  fireBullet(game, x, y, angle, 640, damage, false);
  game.audio.enemyShot();
}

export function spawnParticles(game, x, y, count, color, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = game.random() * Math.PI * 2;
    const v = (speed || 160) * (0.4 + game.random() * 0.8);
    game.combat.particles.push({ x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, life: 0.4 + game.random() * 0.3, max: 0.7, color });
  }
}

export function dropPickup(game, x, y, kind, amount) {
  game.combat.pickups.push({ x, y, kind, amount, bob: game.random() * Math.PI * 2 });
}

function hitCircle(b, x, y, r) {
  return Math.hypot(b.x - x, b.y - y) < r + 4;
}

export function stepCombat(game, dt) {
  const combat = game.combat;
  for (const bullet of combat.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    if (bullet.life <= 0) continue;
    if (game.city.solidAt(bullet.x, bullet.y, 2)) {
      bullet.life = 0;
      spawnParticles(game, bullet.x, bullet.y, 5, '#c9c2ae', 120);
      continue;
    }
    if (bullet.fromPlayer) {
      for (const enemy of game.enemies) {
        if (enemy.health <= 0) continue;
        if (hitCircle(bullet, enemy.x, enemy.y, enemy.radius)) {
          bullet.life = 0;
          enemy.health -= bullet.damage;
          spawnParticles(game, bullet.x, bullet.y, 6, '#e5534b', 180);
          if (enemy.health <= 0) game.enemyDown(enemy);
          break;
        }
      }
      if (bullet.life <= 0) continue;
      for (const officer of game.officers) {
        if (hitCircle(bullet, officer.x, officer.y, officer.radius)) {
          bullet.life = 0;
          officer.health -= bullet.damage;
          spawnParticles(game, bullet.x, bullet.y, 6, '#2f6df6', 180);
          if (officer.health <= 0) {
            game.addHeat(30);
            game.officers = game.officers.filter((o) => o !== officer);
            game.money += 50;
            game.toast('Officer down! +$50 — but the heat is on.');
          }
          break;
        }
      }
    } else {
      const player = game.player;
      const target = player.car || player;
      if (hitCircle(bullet, target.x, target.y, player.car ? 20 : player.radius)) {
        bullet.life = 0;
        player.health -= bullet.damage;
        spawnParticles(game, bullet.x, bullet.y, 5, '#e5534b', 140);
        if (player.health <= 0) game.wasted();
      }
    }
  }
  combat.bullets = combat.bullets.filter((b) => b.life > 0);
  for (const p of combat.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 2 * dt;
    p.vy *= 1 - 2 * dt;
    p.life -= dt;
  }
  combat.particles = combat.particles.filter((p) => p.life > 0);
  // Pickups: walk or drive over one to collect it.
  const player = game.player;
  for (const pickup of combat.pickups) {
    pickup.bob += dt * 3;
    if (Math.hypot(pickup.x - player.x, pickup.y - player.y) < 30) {
      pickup.taken = true;
      if (pickup.kind === 'health') {
        player.health = Math.min(PLAYER.maxHealth, player.health + pickup.amount);
        game.toast(`Health +${pickup.amount}`);
      } else if (pickup.kind === 'ammo') {
        player.ammo = Math.min(PLAYER.maxAmmo, player.ammo + pickup.amount);
        game.toast(`Ammo +${pickup.amount}`);
      } else {
        game.money += pickup.amount;
        game.toast(`+$${pickup.amount}`);
        game.audio.cash();
        continue;
      }
      game.audio.pickup();
    }
  }
  combat.pickups = combat.pickups.filter((p) => !p.taken);
}

/** The player's own shot, from wherever Rico stands, toward the mouse. */
export function playerShoot(game, angle) {
  const player = game.player;
  if (player.car || player.fireTimer > 0 || player.ammo <= 0) return;
  player.ammo -= 1;
  player.fireTimer = PLAYER.fireInterval;
  const gx = player.x + Math.cos(angle) * 20;
  const gy = player.y + Math.sin(angle) * 20;
  fireBullet(game, gx, gy, angle, 900, PLAYER.pistolDamage, true);
  game.audio.shot();
  game.addHeat(2);
  game.scarePeds(gx, gy, 260);
}
