// The story: six jobs that take Rico from a nobody with no wheels to the
// king of Solara Bay. Each mission is a list of steps — steal a car, reach a
// place, grab a package before the clock runs out, clear a turf of Vipers,
// lose the heat, rob the bank and get away. The marker on the map and the
// objective line always show the current step; finishing a job pays cash and
// saves the game.
import { landmarkPos } from './city.js';
import { dropPickup } from './combat.js';

export const MISSIONS = [
  {
    id: 'wheels-up', title: 'Wheels Up', reward: 300,
    brief: 'Rico just rolled into Solara Bay with empty pockets. First rule of the bay: nobody walks. Steal a car, then meet the fixer at Solara Plaza.',
    steps: [
      { type: 'stealCar', label: 'Steal a car (walk up to one, press E)' },
      { type: 'goto', place: 'plaza', radius: 100, label: 'Drive to Solara Plaza' },
    ],
  },
  {
    id: 'hot-package', title: 'Hot Package', reward: 500,
    brief: 'The fixer has a package at the Docks and a buyer at the Grand Casino. Grab it and get it there in 75 seconds — the buyer does not wait.',
    steps: [
      { type: 'pickup', place: 'docks', radius: 90, label: 'Pick up the package at the Docks' },
      { type: 'timedGoto', place: 'casino', radius: 100, seconds: 75, label: 'Deliver to the Grand Casino — fast!' },
    ],
  },
  {
    id: 'turf-war', title: 'Turf War', reward: 800,
    brief: 'The Vipers think the Mall is theirs. The fixer disagrees. Clear four of them out — on foot, pistol out. Watch for their shots.',
    steps: [
      { type: 'kill', place: 'mall', count: 4, label: 'Take out the Vipers at Solara Mall (0/4)' },
    ],
  },
  {
    id: 'heat-check', title: 'Heat Check', reward: 1000,
    brief: 'A job went loud and the whole bay is lit up — three stars and climbing. No shooting your way out of this one. Lose the cops and go dark.',
    steps: [
      { type: 'loseHeat', label: 'Lose the cops — get back to 0 stars' },
    ],
  },
  {
    id: 'the-big-one', title: 'The Big One', reward: 2500,
    brief: 'Solara Bank. Five seconds inside the vault door and the cash is yours — but the alarm brings four stars of heat. Grab it, then run for the Safehouse.',
    steps: [
      { type: 'goto', place: 'bank', radius: 110, label: 'Get to Solara Bank' },
      { type: 'hold', place: 'bank', radius: 110, seconds: 5, label: 'Hold the vault — stay inside!' },
      { type: 'escape', place: 'safehouse', radius: 110, label: 'Escape to the Safehouse!' },
    ],
  },
  {
    id: 'king-of-solara', title: 'King of Solara', reward: 5000,
    brief: 'Vince and his Vipers run this city — or they did. End it at the Grand Casino: six of them, Vince last. Then walk to Solara Plaza and take the crown.',
    steps: [
      { type: 'kill', place: 'casino', count: 6, label: 'Take down Vince and his crew (0/6)' },
      { type: 'goto', place: 'plaza', radius: 100, label: 'Walk to Solara Plaza — the city is yours' },
    ],
  },
];

function stepPlace(step) {
  return landmarkPos(step.place);
}

export function createMissionState() {
  return { index: 0, step: 0, kills: 0, timer: 0, holdTimer: 0, spawned: false, started: false };
}

export function currentMission(game) {
  return MISSIONS[game.mission.index] || null;
}

export function missionObjective(game) {
  const mission = currentMission(game);
  if (!mission) return 'Solara Bay is yours — free roam. Press E near a car to drive.';
  const step = mission.steps[game.mission.step];
  if (!step) return mission.title;
  if (step.type === 'kill') return `${mission.title}: ${step.label.replace(/\(\d+\/\d+\)/, `(${game.mission.kills}/${step.count})`)}`;
  return `${mission.title}: ${step.label}`;
}

/** The yellow marker on the map and minimap for the current step, or null. */
export function missionMarker(game) {
  const mission = currentMission(game);
  if (!mission) return null;
  const step = mission.steps[game.mission.step];
  if (!step || !step.place) return null;
  return stepPlace(step);
}

function spawnCrew(game, place, count, boss) {
  const at = landmarkPos(place);
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const isBoss = boss && i === count - 1;
    game.enemies.push({
      kind: isBoss ? 'boss' : 'viper',
      name: isBoss ? 'Vince' : 'Viper',
      x: at.x + Math.cos(angle) * 120,
      y: at.y + Math.sin(angle) * 120,
      radius: 14,
      health: isBoss ? 260 : 70,
      speed: isBoss ? 165 : 150,
      shootTimer: 1 + game.random() * 1.5,
    });
  }
}

function beginStep(game, mission, step) {
  game.mission.timer = step.seconds || 0;
  game.mission.holdTimer = 0;
  game.mission.spawned = false;
  if (step.type === 'kill') {
    spawnCrew(game, step.place, step.count, mission.id === 'king-of-solara');
    game.mission.spawned = true;
  }
  if (mission.id === 'heat-check' && game.mission.step === 0) {
    game.addHeat(52);
    game.toast('Three stars! Lose the cops!');
  }
  if (mission.id === 'the-big-one' && step.type === 'escape') {
    game.addHeat(74);
    game.toast('Four stars! Run for the Safehouse!');
  }
}

function advanceStep(game) {
  const mission = currentMission(game);
  game.mission.step += 1;
  game.mission.kills = 0;
  if (game.mission.step >= mission.steps.length) {
    game.money += mission.reward;
    game.audio.missionDone();
    game.toast(`${mission.title} complete! +$${mission.reward}`);
    game.mission.index += 1;
    game.mission.step = 0;
    game.mission.kills = 0;
    if (game.mission.index >= MISSIONS.length) {
      game.storyDone = true;
      game.save();
      return;
    }
    game.save();
    beginStep(game, currentMission(game), currentMission(game).steps[0]);
    return;
  }
  beginStep(game, mission, mission.steps[game.mission.step]);
}

function restartMission(game) {
  const mission = currentMission(game);
  game.mission.step = 0;
  game.mission.kills = 0;
  game.enemies = [];
  game.toast(`${mission.title} failed — starting the job over.`);
  beginStep(game, mission, mission.steps[0]);
}

export function updateMissions(game, dt) {
  const mission = currentMission(game);
  if (!mission) return;
  if (!game.mission.started) {
    game.mission.started = true;
    beginStep(game, mission, mission.steps[0]);
  }
  const step = mission.steps[game.mission.step];
  if (!step) return;
  const player = game.player;
  const at = step.place ? stepPlace(step) : null;
  const dist = at ? Math.hypot(player.x - at.x, player.y - at.y) : Infinity;
  switch (step.type) {
    case 'stealCar':
      if (player.car) advanceStep(game);
      break;
    case 'goto':
    case 'escape':
      if (dist < step.radius) advanceStep(game);
      break;
    case 'pickup':
      if (dist < step.radius) {
        game.audio.pickup();
        game.toast('Package secured. Go!');
        advanceStep(game);
      }
      break;
    case 'timedGoto':
      game.mission.timer -= dt;
      if (dist < step.radius) {
        advanceStep(game);
      } else if (game.mission.timer <= 0) {
        game.toast('Too slow — the buyer walked away.');
        restartMission(game);
      }
      break;
    case 'hold':
      if (dist < step.radius) {
        game.mission.holdTimer += dt;
        if (game.mission.holdTimer >= step.seconds) {
          game.money += 400;
          game.toast('Vault cash grabbed! +$400');
          advanceStep(game);
        }
      } else {
        game.mission.holdTimer = Math.max(0, game.mission.holdTimer - dt);
      }
      break;
    case 'kill':
      if (game.mission.kills >= step.count) advanceStep(game);
      break;
    case 'loseHeat':
      if (game.wanted === 0 && game.heat <= 0) advanceStep(game);
      break;
    default:
      break;
  }
}

/** Gang members and the boss hunt the player and shoot at him. */
export function stepEnemies(game, dt) {
  for (const enemy of game.enemies) {
    if (enemy.health <= 0) continue;
    const d = Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y);
    enemy.shootTimer -= dt;
    if (d < 420 && d > 60) {
      if (enemy.shootTimer <= 0) {
        enemy.shootTimer = 1.1 + game.random() * 0.8;
        game.enemyShoot(enemy.x, enemy.y, game.player.x, game.player.y, enemy.kind === 'boss' ? 12 : 9);
      }
    }
    if (d > 50) {
      const move = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
      const step = enemy.speed * dt;
      const moved = game.city.moveAxis(enemy.x, enemy.y, enemy.radius, Math.cos(move) * step, Math.sin(move) * step);
      enemy.x = moved.x;
      enemy.y = moved.y;
    }
  }
  game.enemies = game.enemies.filter((e) => e.health > 0);
}

/** Called when the player drops an enemy: drops loot and counts the kill. */
export function onEnemyDown(game, enemy) {
  const mission = currentMission(game);
  if (mission && mission.steps[game.mission.step] && mission.steps[game.mission.step].type === 'kill') {
    game.mission.kills += 1;
  }
  game.money += enemy.kind === 'boss' ? 500 : 75;
  game.toast(`${enemy.name} down! +$${enemy.kind === 'boss' ? 500 : 75}`);
  dropPickup(game, enemy.x, enemy.y, game.random() < 0.5 ? 'health' : 'ammo', enemy.kind === 'boss' ? 50 : 25);
  game.addHeat(6);
}
