// Traffic: the city's own drivers. Each car owns a road and a direction and
// drives its lane; at an intersection it may turn onto the crossing road.
// Cars stop for the car ahead of them, slow for the player's car, and honk
// (a brake light flash) when something blocks them. A traffic car has a
// driver who flees on foot when the car is stolen.
import { CAR, TRAFFIC } from './config.js';
import { int, pick, range } from './random.js';

const BODIES = ['sedan', 'sedan', 'sport', 'truck', 'taxi', 'sedan'];

export function spawnTrafficCar(game, x, y) {
  // A car given a point sits on the road through that point, facing along
  // it; a car given no point picks a road of its own.
  let vertical = game.random() < 0.5;
  let k = int(game.random, 0, 9);
  let px = x;
  let py = y;
  if (px !== undefined) {
    let bestV = Infinity;
    let bestH = Infinity;
    let bestVK = 0;
    let bestHK = 0;
    for (let i = 0; i < 10; i += 1) {
      const dV = Math.abs(px - (180 + 360 * i));
      const dH = Math.abs(py - (180 + 360 * i));
      if (dV < bestV) { bestV = dV; bestVK = i; }
      if (dH < bestH) { bestH = dH; bestHK = i; }
    }
    vertical = bestV <= bestH;
    k = vertical ? bestVK : bestHK;
  }
  const center = 180 + 360 * k;
  const dir = game.random() < 0.5 ? 1 : -1;
  const lane = dir > 0 ? 22 : -22;
  const car = {
    kind: 'traffic',
    body: pick(game.random, BODIES),
    color: pick(game.random, game.city.carColors),
    x: px !== undefined ? (vertical ? center + lane : px) : (vertical ? center + lane : range(game.random, 120, 3480)),
    y: py !== undefined ? (vertical ? py : center + lane) : (vertical ? range(game.random, 120, 3480) : center + lane),
    angle: vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
    speed: 0,
    cruise: TRAFFIC.cruise + range(game.random, -TRAFFIC.cruiseJitter, TRAFFIC.cruiseJitter),
    road: vertical ? 'v' : 'h',
    roadIndex: k,
    dir,
    driver: true,
    owned: false,
    stolen: false,
    wrecked: false,
    blocked: 0,
  };
  game.cars.push(car);
  return car;
}

/** The car ahead of `car` on its lane, if it is close enough to matter. */
function carAhead(game, car) {
  let best = null;
  let bestD = TRAFFIC.gap + 60;
  for (const other of game.cars) {
    if (other === car || other.wrecked) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const along = car.road === 'v' ? dy * car.dir : dx * car.dir;
    const side = car.road === 'v' ? Math.abs(dx) : Math.abs(dy);
    if (along > 0 && along < bestD && side < 30) { bestD = along; best = other; }
  }
  return best;
}

/** Near an intersection centre, a car may turn onto the crossing road. */
function maybeTurn(game, car) {
  const centres = [180, 540, 900, 1260, 1620, 1980, 2340, 2700, 3060, 3420];
  const along = car.road === 'v' ? car.y : car.x;
  for (let k = 0; k < centres.length; k += 1) {
    if (Math.abs(along - centres[k]) < 6 && game.random() < 0.35) {
      const newDir = game.random() < 0.5 ? 1 : -1;
      const lane = newDir > 0 ? 22 : -22;
      if (car.road === 'v') {
        car.road = 'h';
        car.roadIndex = k;
        car.dir = newDir;
        car.y = centres[k] + lane;
        car.angle = newDir > 0 ? 0 : Math.PI;
      } else {
        car.road = 'v';
        car.roadIndex = k;
        car.dir = newDir;
        car.x = centres[k] + lane;
        car.angle = newDir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      return;
    }
  }
}

export function stepTraffic(game, dt) {
  for (const car of game.cars) {
    if (car.kind !== 'traffic' || car.wrecked) continue;
    if (car === game.player.car) continue;
    const ahead = carAhead(game, car);
    const target = ahead ? 0 : car.cruise;
    car.speed += (target - car.speed) * Math.min(1, dt * 2.2);
    car.blocked = ahead ? car.blocked + dt : 0;
    maybeTurn(game, car);
    const dx = Math.cos(car.angle) * car.speed * dt;
    const dy = Math.sin(car.angle) * car.speed * dt;
    const moved = game.city.moveAxis(car.x, car.y, CAR.radius, dx, dy);
    // A traffic car that hits a wall (a bad turn) reverses out of it.
    if ((moved.x === car.x && Math.abs(dx) > 0.01) || (moved.y === car.y && Math.abs(dy) > 0.01)) {
      car.angle += Math.PI;
      car.dir *= -1;
      car.speed = 40;
    }
    car.x = moved.x;
    car.y = moved.y;
  }
}
