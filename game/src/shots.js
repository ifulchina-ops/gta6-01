// Staged screenshot scenes: ?shot=chase|drive|fight|start (with &seed=N)
// sets the world up in a chosen moment, paints it twice and sets
// window.__shotReady so a screenshot tool knows the frame is settled. The
// scenes are real game states — police chasing, traffic on the avenue, a
// shootout — not mock-ups, so the screenshots show the game itself.
import { SCREEN_DONE, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { landmarkPos } from './city.js';
import { spawnTrafficCar } from './traffic.js';
import { spawnPedestrian } from './pedestrians.js';
import { addHeat } from './police.js';

function fillStreets(game, count) {
  for (let i = 0; i < count; i += 1) {
    const p = game.city.randomRoadPoint();
    spawnTrafficCar(game, p.x, p.y);
  }
  for (let i = 0; i < 18; i += 1) spawnPedestrian(game);
}

function parkPlayerCar(game, x, y, angle) {
  const car = spawnTrafficCar(game, x, y);
  car.body = 'sport';
  car.color = '#d94f3d';
  car.angle = angle;
  car.speed = 240;
  return car;
}

function stageChase(game) {
  // Cover shot: Rico fleeing down the avenue at four stars, three cruisers
  // on his tail, the getaway marker ahead on the minimap.
  const at = { x: 1800, y: 1980 };
  game.player.x = at.x;
  game.player.y = at.y;
  const car = parkPlayerCar(game, at.x, at.y, 0);
  game.player.car = car;
  car.owned = true;
  game.mission.index = 4;
  game.mission.step = 2;
  game.mission.started = true;
  game.money = 12840;
  addHeat(game, 74);
  fillStreets(game, 12);
  for (let i = 0; i < 3; i += 1) {
    game.cops.push({
      kind: 'police', body: 'police', color: '#1c1e24',
      x: at.x - 180 - i * 90, y: at.y + (i - 1) * 44,
      angle: 0, speed: 420, cruise: 470, road: 'h', roadIndex: 5, dir: 1,
      driver: true, owned: false, stolen: false, wrecked: false, blocked: 0, siren: i,
    });
    game.cars.push(game.cops[game.cops.length - 1]);
  }
  game.toastText = 'Four stars! Run for the Safehouse!';
  game.toastTimer = 3;
  return SCREEN_PLAY;
}

function stageDrive(game) {
  // Rico cruising the downtown avenue in his red sportscar, traffic and
  // pedestrians around him, the first job's marker on the map.
  const at = { x: 1260, y: 1620 };
  game.player.x = at.x;
  game.player.y = at.y;
  const car = parkPlayerCar(game, at.x, at.y, Math.PI / 2);
  game.player.car = car;
  car.owned = true;
  game.mission.index = 0;
  game.mission.step = 1;
  game.mission.started = true;
  game.money = 1240;
  fillStreets(game, 20);
  game.toastText = 'Drive to Solara Plaza';
  game.toastTimer = 3;
  return SCREEN_PLAY;
}

function stageFight(game) {
  // On-foot shootout outside the Grand Casino: Rico behind cover of his
  // stolen sedan, Vipers closing in, three stars overhead.
  const at = landmarkPos('casino');
  game.player.x = at.x - 160;
  game.player.y = at.y + 40;
  game.player.angle = 0;
  game.player.ammo = 96;
  game.player.health = 82;
  game.mission.index = 5;
  game.mission.step = 0;
  game.mission.kills = 2;
  game.mission.started = true;
  game.money = 7310;
  const car = parkPlayerCar(game, at.x - 120, at.y + 90, 0.3);
  car.owned = true;
  for (let i = 0; i < 4; i += 1) {
    game.enemies.push({
      kind: i === 3 ? 'boss' : 'viper', name: i === 3 ? 'Vince' : 'Viper',
      x: at.x + 60 + i * 50, y: at.y - 60 + (i % 2) * 120,
      radius: 14, health: i === 3 ? 260 : 70, speed: 150, shootTimer: 0.5 + i * 0.4,
    });
  }
  addHeat(game, 52);
  fillStreets(game, 8);
  game.toastText = 'Take down Vince and his crew (2/6)';
  game.toastTimer = 3;
  return SCREEN_PLAY;
}

export function stageShot(name, game) {
  game.screen = SCREEN_PLAY;
  if (name === 'chase') return stageChase(game);
  if (name === 'drive') return stageDrive(game);
  if (name === 'fight') return stageFight(game);
  if (name === 'start') {
    game.player.x = 1800;
    game.player.y = 1800;
    fillStreets(game, 10);
    return SCREEN_TITLE;
  }
  return SCREEN_DONE;
}
