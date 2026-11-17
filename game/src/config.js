// Solara Bay — every tuning number and colour in one place. The world is a
// fixed 3600x3600 open city; the camera follows the player, so no rule below
// depends on the screen size.
export const WORLD = { size: 3600, beachY: 3465, waterY: 3540 };

// Roads run on a 360 px pitch: centres at 180 + 360k, 90 px wide, so blocks
// are 270 px squares with a 45 px sidewalk ring on each side.
export const ROAD = { pitch: 360, width: 90, lane: 22, count: 10 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const PLAYER = {
  walkSpeed: 210,
  runSpeed: 330,
  radius: 14,
  maxHealth: 100,
  pistolDamage: 34,
  fireInterval: 0.22,
  startAmmo: 48,
  maxAmmo: 240,
};

export const CAR = {
  radius: 20,
  accel: 520,
  brake: 900,
  reverseMax: 160,
  friction: 1.6,
  grip: 2.6,
  // top speed by body: sedan, sport, truck, taxi, police
  topSpeed: { sedan: 420, sport: 560, truck: 340, taxi: 430, police: 520 },
};

export const TRAFFIC = { count: 26, cruise: 150, cruiseJitter: 60, gap: 70 };

export const PED = { count: 34, walk: 55, flee: 190, radius: 11 };

export const POLICE = {
  maxCars: 5,
  chaseSpeed: 470,
  ramDamage: 12,
  shootRange: 320,
  officerSpeed: 235,
  bustRange: 26,
  // heat thresholds per star; heat 0..100, stars shown 0..5
  starHeat: [0, 12, 30, 52, 74, 92],
  decay: 2.2,
  decayHidden: 5.0,
};

export const WANTED_CRIME = { steal: 14, hitPed: 10, killPed: 22, shoot: 6, ramCop: 18, killCop: 30 };

export const SAVE_KEY = 'solara-bay.save.v1';

// The seeded city: the same seed always builds the same Solara Bay.
export const DEFAULT_SEED = 20261117;

export const PALETTE = {
  grass: '#7fae62',
  park: '#6da054',
  sand: '#e8d29a',
  water: '#2fa8c9',
  waterDeep: '#1e7fa8',
  sidewalk: '#b9b3a4',
  road: '#3c3f46',
  roadLine: '#e8d44d',
  buildingEdge: '#00000033',
  plaza: '#cbb98f',
  text: '#f5f1e6',
  muted: '#cfc8b4',
  gold: '#f2c94c',
  red: '#e5534b',
  blue: '#4fc3f7',
  copBlue: '#2f6df6',
  copRed: '#f63232',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// Sun-soaked pastel rooftops, one per building, picked by seed.
export const ROOFS = ['#e8a0a8', '#f2c94c', '#8fc7e8', '#a8d8a0', '#e8b48a', '#c9a8e8', '#f0f0e8', '#e88a7a'];
export const CAR_COLORS = ['#d94f3d', '#3d7bd9', '#f2c94c', '#e8e8e8', '#4a4a52', '#7ac74f', '#e88ac7', '#8a6fd9'];
export const PED_SHIRTS = ['#e5534b', '#4fc3f7', '#f2c94c', '#7ac74f', '#e88ac7', '#ffffff', '#ff8c42', '#8a6fd9'];
