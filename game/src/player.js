// The player: Rico, a getaway driver new to Solara Bay. On foot he walks,
// runs and shoots where the mouse points; in a car he drives it. Entering a
// car parks him inside it — the car becomes his body until he steps out.
// Stealing a car the player does not own is a crime the police notice.
import { CAR, PLAYER, WANTED_CRIME } from './config.js';

export function createPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, radius: PLAYER.radius,
    health: PLAYER.maxHealth, ammo: PLAYER.startAmmo,
    car: null, speed: 0, moving: false, firing: false, fireTimer: 0,
  };
}

/** The nearest drivable car within reach, or null. */
export function nearestCar(game, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of game.cars) {
    if (car.wrecked) continue;
    const d = Math.hypot(car.x - game.player.x, car.y - game.player.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

/** Step out of the car onto the nearest free sidewalk spot. */
export function exitCar(game) {
  const player = game.player;
  const car = player.car;
  if (!car) return;
  player.car = null;
  player.speed = 0;
  const side = { x: car.x + Math.cos(car.angle + Math.PI / 2) * 34, y: car.y + Math.sin(car.angle + Math.PI / 2) * 34 };
  const spot = game.city.solidAt(side.x, side.y, player.radius) ? { x: car.x, y: car.y - 40 } : side;
  player.x = spot.x;
  player.y = spot.y;
  player.angle = car.angle;
}

/** Climb into a car. A car with a driver gets its driver thrown out; stealing
 * a stranger's car in view of the law raises the heat. */
export function enterCar(game, car) {
  const player = game.player;
  if (car.driver) {
    car.driver = null;
    if (!car.owned) {
      game.addHeat(WANTED_CRIME.steal);
      game.toast('Car stolen! The cops were watching.');
    }
  } else if (!car.owned && !car.stolen) {
    car.stolen = true;
    game.addHeat(WANTED_CRIME.steal);
    game.toast('Car stolen! Lose the heat.');
  }
  player.car = car;
  player.x = car.x;
  player.y = car.y;
  car.owned = true;
  game.audio.unlock();
}

function driveStep(game, dt, steer) {
  const player = game.player;
  const car = player.car;
  const top = CAR.topSpeed[car.body] || CAR.topSpeed.sedan;
  const accel = steer.y < 0 ? CAR.accel : steer.y > 0 ? CAR.brake : 0;
  if (steer.y < 0) car.speed += accel * dt;
  else if (steer.y > 0) car.speed -= CAR.brake * dt * (car.speed > 0 ? 1 : 0.4);
  // Rolling friction and the handbrake.
  car.speed -= car.speed * CAR.friction * dt;
  if (game.input.handbrake()) car.speed -= car.speed * 4 * dt;
  car.speed = Math.max(-CAR.reverseMax, Math.min(top, car.speed));
  const turn = steer.x * CAR.grip * dt * Math.min(1, Math.abs(car.speed) / 120) * (car.speed < 0 ? -1 : 1);
  car.angle += turn;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const moved = game.city.moveAxis(car.x, car.y, CAR.radius, nx - car.x, ny - car.y);
  const hitWall = (moved.x === car.x && Math.abs(nx - car.x) > 0.01) || (moved.y === car.y && Math.abs(ny - car.y) > 0.01);
  if (hitWall) {
    car.speed *= 0.4;
    // A crash sound at most twice a second, not once a frame.
    if (game.time - (game.lastCrashAt || -99) > 0.5) {
      game.lastCrashAt = game.time;
      game.audio.crash();
    }
  }
  car.x = moved.x;
  car.y = moved.y;
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  player.speed = car.speed;
  player.moving = Math.abs(car.speed) > 5;
}

function walkStep(game, dt, steer, aimAngle) {
  const player = game.player;
  const speed = game.input.running() ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const len = Math.hypot(steer.x, steer.y) || 1;
  const vx = (steer.x / len) * speed * (steer.x || steer.y ? 1 : 0);
  const vy = (steer.y / len) * speed * (steer.x || steer.y ? 1 : 0);
  const moved = game.city.moveAxis(player.x, player.y, player.radius, vx * dt, vy * dt);
  player.x = moved.x;
  player.y = moved.y;
  player.moving = vx !== 0 || vy !== 0;
  // On foot Rico faces where he shoots; otherwise where he walks.
  if (game.input.mouse().down || player.firing) player.angle = aimAngle;
  else if (player.moving) player.angle = Math.atan2(vy, vx);
  player.speed = 0;
}

/** One step of the player, on foot or behind the wheel. */
export function stepPlayer(game, dt, aimAngle) {
  const player = game.player;
  if (player.fireTimer > 0) player.fireTimer -= dt;
  if (player.car) driveStep(game, dt, game.input.steer());
  else walkStep(game, dt, game.input.steer(), aimAngle);
}
