// Pedestrians: Solara Bay's people, strolling the sidewalks between random
// corners. A gunshot, a speeding car or a body nearby scares them: they run
// away from the threat and keep running until they feel safe. A pedestrian
// hit by a car is knocked down — a crime the police take seriously.
import { PED, WANTED_CRIME } from './config.js';
import { pick, range } from './random.js';

export function spawnPedestrian(game, x, y) {
  const spot = x !== undefined ? { x, y } : game.city.randomSidewalkPoint();
  const ped = {
    x: spot.x, y: spot.y, radius: PED.radius,
    tx: spot.x, ty: spot.y, speed: 0,
    shirt: pick(game.random, game.city.pedShirts),
    state: 'walk', down: false, downTimer: 0, scared: 0,
  };
  game.peds.push(ped);
  return ped;
}

function pickDestination(game, ped) {
  const spot = game.city.randomSidewalkPoint();
  ped.tx = spot.x;
  ped.ty = spot.y;
}

/** Scare every pedestrian near (x, y): they run from the threat. */
export function scarePeds(game, x, y, radius) {
  for (const ped of game.peds) {
    if (ped.down) continue;
    const d = Math.hypot(ped.x - x, ped.y - y);
    if (d < radius) {
      ped.state = 'flee';
      ped.scared = 2.5;
      const away = Math.atan2(ped.y - y, ped.x - x);
      ped.tx = ped.x + Math.cos(away) * 300;
      ped.ty = ped.y + Math.sin(away) * 300;
    }
  }
}

/** Knock a pedestrian down; counts as a crime if a car did it. */
export function knockPed(game, ped, byCar) {
  if (ped.down) return;
  ped.down = true;
  ped.downTimer = 6;
  ped.state = 'down';
  if (byCar) {
    game.addHeat(WANTED_CRIME.hitPed);
    game.toast('You hit a pedestrian!');
  }
}

export function stepPeds(game, dt) {
  for (const ped of game.peds) {
    if (ped.down) {
      ped.downTimer -= dt;
      if (ped.downTimer <= 0) {
        ped.down = false;
        ped.state = 'flee';
        ped.scared = 3;
        const away = Math.atan2(ped.y - game.player.y, ped.x - game.player.x);
        ped.tx = ped.x + Math.cos(away) * 300;
        ped.ty = ped.y + Math.sin(away) * 300;
      }
      continue;
    }
    if (ped.scared > 0) {
      ped.scared -= dt;
      if (ped.scared <= 0 && ped.state === 'flee') ped.state = 'walk';
    }
    const dx = ped.tx - ped.x;
    const dy = ped.ty - ped.y;
    const d = Math.hypot(dx, dy);
    if (d < 12) {
      pickDestination(game, ped);
      continue;
    }
    const speed = ped.state === 'flee' ? PED.flee : PED.walk;
    const step = Math.min(d, speed * dt);
    const nx = ped.x + (dx / d) * step;
    const ny = ped.y + (dy / d) * step;
    if (!game.city.solidAt(nx, ny, ped.radius)) {
      ped.x = nx;
      ped.y = ny;
    } else {
      pickDestination(game, ped);
    }
    // A fast car ploughing through a pedestrian knocks them down.
    const car = game.player.car;
    if (car && Math.abs(car.speed) > 120) {
      const cd = Math.hypot(ped.x - car.x, ped.y - car.y);
      if (cd < 34) knockPed(game, ped, true);
    }
    for (const other of game.cars) {
      if (other === car || other.wrecked) continue;
      if (Math.abs(other.speed) > 120 && Math.hypot(ped.x - other.x, ped.y - other.y) < 34) {
        knockPed(game, ped, false);
      }
    }
  }
}
