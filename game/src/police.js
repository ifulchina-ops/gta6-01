// The Solara Bay police: a wanted level from 0 to 5 stars, and the response
// it buys. At one star a cruiser shadows the player; at three the cruisers
// ram and officers get out and shoot; at five the whole bay is after him.
// Heat rises with every crime and cools when the player stays clean and out
// of sight. Get busted (an officer reaches the player) or wasted (health
// hits zero) and the run restarts at Bay General, lighter in the wallet.
import { CAR, POLICE, WANTED_CRIME } from './config.js';
import { range } from './random.js';

export function starsFromHeat(heat) {
  let stars = 0;
  for (let s = 0; s <= 5; s += 1) if (heat >= POLICE.starHeat[s]) stars = s;
  return stars;
}

/** Spawn a police cruiser at the road edge nearest the player. */
function spawnCopCar(game) {
  const angle = game.random() * Math.PI * 2;
  const dist = 700 + game.random() * 300;
  const near = game.city.nearestRoadPoint(
    game.player.x + Math.cos(angle) * dist,
    game.player.y + Math.sin(angle) * dist,
  );
  const car = {
    kind: 'police', body: 'police', color: '#1c1e24',
    x: near.x, y: near.y, angle: 0, speed: 0,
    cruise: POLICE.chaseSpeed, road: 'v', roadIndex: 0, dir: 1,
    driver: true, owned: false, stolen: false, wrecked: false, blocked: 0,
    siren: 0,
  };
  game.cops.push(car);
  game.cars.push(car);
  return car;
}

function spawnOfficer(game, x, y) {
  const officer = {
    kind: 'officer', x, y, radius: 13, health: 50,
    speed: POLICE.officerSpeed, shootTimer: 1 + game.random(),
    state: 'chase',
  };
  game.officers.push(officer);
  return officer;
}

/** Keep the number of cruisers in step with the wanted level. */
function maintainForce(game) {
  const want = game.wanted === 0 ? 0 : Math.min(POLICE.maxCars, 1 + game.wanted);
  let cars = game.cops.filter((c) => c.kind === 'police');
  while (cars.length < want) {
    spawnCopCar(game);
    cars = game.cops.filter((c) => c.kind === 'police');
  }
  // Officers on foot appear at three stars and up, two at a time at most.
  if (game.wanted >= 3 && game.officers.length < 2 && game.random() < 0.02) {
    const near = game.city.nearestRoadPoint(game.player.x + range(game.random, -300, 300), game.player.y + range(game.random, -300, 300));
    spawnOfficer(game, near.x, near.y);
  }
}

function steerToward(game, car, tx, ty, dt) {
  const want = Math.atan2(ty - car.y, tx - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
  const target = POLICE.chaseSpeed;
  car.speed += (target - car.speed) * Math.min(1, dt * 1.8);
  const dx = Math.cos(car.angle) * car.speed * dt;
  const dy = Math.sin(car.angle) * car.speed * dt;
  const moved = game.city.moveAxis(car.x, car.y, CAR.radius, dx, dy);
  if (moved.x === car.x && Math.abs(dx) > 0.01) car.angle += 0.9 * dt * 8;
  if (moved.y === car.y && Math.abs(dy) > 0.01) car.angle -= 0.9 * dt * 8;
  car.x = moved.x;
  car.y = moved.y;
}

export function stepPolice(game, dt) {
  // Heat cools when the player commits no crime; faster when no cruiser can see him.
  const seen = game.cops.some((c) => Math.hypot(c.x - game.player.x, c.y - game.player.y) < 500);
  if (game.heat > 0 && game.time - game.lastCrimeAt > 4) {
    game.heat = Math.max(0, game.heat - (seen ? POLICE.decay : POLICE.decayHidden) * dt);
  }
  const stars = starsFromHeat(game.heat);
  if (stars !== game.wanted) {
    game.wanted = stars;
    if (stars === 0) game.toast('You lost the cops. Clean — for now.');
    else if (stars >= 3) game.toast(`${stars} stars! The whole bay is after you!`);
  }
  if (game.wanted === 0) {
    // The force stands down: cruisers drive off and despawn at range.
    for (const cop of game.cops) {
      if (Math.hypot(cop.x - game.player.x, cop.y - game.player.y) > 1200) {
        cop.gone = true;
      }
    }
    game.cops = game.cops.filter((c) => !c.gone);
    game.cars = game.cars.filter((c) => !c.gone);
    game.officers = [];
    return;
  }
  maintainForce(game);
  for (const cop of game.cops) {
    if (cop.kind !== 'police') continue;
    steerToward(game, cop, game.player.x, game.player.y, dt);
    cop.siren += dt;
    // Ramming the player's car hurts the player and the cruiser alike.
    const playerCar = game.player.car;
    const target = playerCar || game.player;
    const d = Math.hypot(cop.x - target.x, cop.y - target.y);
    if (d < 46) {
      const push = Math.atan2(target.y - cop.y, target.x - cop.x);
      if (playerCar) {
        playerCar.speed *= 0.6;
        game.player.health -= POLICE.ramDamage * dt * 2;
        game.audio.crash();
        playerCar.x += Math.cos(push) * 30 * dt;
        playerCar.y += Math.sin(push) * 30 * dt;
      } else if (game.player.health > 0) {
        // A cruiser shoves Rico on foot — it hurts, but the shove breaks
        // contact, so a running player can get away instead of being pinned.
        game.player.health -= POLICE.ramDamage * dt;
        const shove = game.city.moveAxis(game.player.x, game.player.y, game.player.radius, Math.cos(push) * 140 * dt, Math.sin(push) * 140 * dt);
        game.player.x = shove.x;
        game.player.y = shove.y;
      }
    }
  }
  for (const officer of game.officers) {
    const d = Math.hypot(officer.x - game.player.x, officer.y - game.player.y);
    // An arrest takes a moment of contact: a sprinting player can break free.
    if (d < POLICE.bustRange && !game.player.car) {
      officer.bustTimer = (officer.bustTimer || 0) + dt;
      if (officer.bustTimer >= 0.7) {
        game.busted();
        return;
      }
    } else {
      officer.bustTimer = 0;
    }
    if (d < POLICE.shootRange && game.wanted >= 2) {
      officer.shootTimer -= dt;
      if (officer.shootTimer <= 0) {
        officer.shootTimer = 0.9 + game.random() * 0.6;
        game.enemyShoot(officer.x, officer.y, game.player.x, game.player.y, 8);
      }
    }
    const move = Math.atan2(game.player.y - officer.y, game.player.x - officer.x);
    const step = officer.speed * dt;
    const moved = game.city.moveAxis(officer.x, officer.y, officer.radius, Math.cos(move) * step, Math.sin(move) * step);
    officer.x = moved.x;
    officer.y = moved.y;
  }
}

/** A crime the law can see: adds heat and stamps the time. */
export function addHeat(game, amount) {
  game.heat = Math.min(100, game.heat + amount);
  game.lastCrimeAt = game.time;
  game.wanted = starsFromHeat(game.heat);
}

export { WANTED_CRIME };
