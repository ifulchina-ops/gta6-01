// Solara Bay, the city itself: a 10x10 grid of blocks split by roads, with a
// beach and water along the south edge. Builds every building, park and
// landmark from a seed, and answers the questions the rest of the game asks:
// is this point on a road, does it hit a building, where is a random road or
// sidewalk point. Nothing here draws or moves; it is pure geometry.
import { CAR_COLORS, PALETTE, PED_SHIRTS, ROAD, ROOFS, WORLD } from './config.js';
import { int, pick, range } from './random.js';

/** Centre of the road at index k (0..9) along one axis. */
export function roadCenter(k) {
  return 180 + ROAD.pitch * k;
}

/** Centre of the block (i, j): blocks sit between the roads. */
export function blockCenter(i, j) {
  return { x: 360 + ROAD.pitch * i, y: 360 + ROAD.pitch * j };
}

// Named places the story uses. Block coords (i, j); the centre is derived.
export const LANDMARKS = {
  plaza: { i: 4, j: 4, name: 'Solara Plaza' },
  casino: { i: 7, j: 2, name: 'Grand Casino' },
  docks: { i: 1, j: 1, name: 'The Docks' },
  hospital: { i: 8, j: 8, name: 'Bay General' },
  mall: { i: 2, j: 7, name: 'Solara Mall' },
  bank: { i: 5, j: 5, name: 'Solara Bank' },
  safehouse: { i: 0, j: 5, name: 'Safehouse' },
  palms: { i: 9, j: 0, name: 'Palm Park' },
};

export function landmarkPos(key) {
  const mark = LANDMARKS[key];
  return blockCenter(mark.i, mark.j);
}

export function createCity(random) {
  const buildings = [];
  const parks = [];
  const trees = [];
  const containers = [];

  function addBuilding(x, y, w, h, color, label) {
    buildings.push({ x, y, w, h, color, label: label || '' });
  }

  for (let j = 0; j < 10; j += 1) {
    for (let i = 0; i < 10; i += 1) {
      const c = blockCenter(i, j);
      const bx = c.x - 135;
      const by = c.y - 135;
      const key = Object.keys(LANDMARKS).find((k) => LANDMARKS[k].i === i && LANDMARKS[k].j === j);
      if (j === 9) {
        // Beachfront row: sand and palms, no buildings.
        parks.push({ x: bx, y: by, w: 270, h: 270, kind: 'sand' });
        for (let t = 0; t < 4; t += 1) {
          trees.push({ x: bx + range(random, 30, 240), y: by + range(random, 30, 240), r: 12 });
        }
        continue;
      }
      if (key === 'plaza') {
        parks.push({ x: bx, y: by, w: 270, h: 270, kind: 'plaza' });
        trees.push({ x: c.x, y: c.y, r: 26 });
        continue;
      }
      if (key === 'palms') {
        parks.push({ x: bx, y: by, w: 270, h: 270, kind: 'park' });
        for (let t = 0; t < 7; t += 1) {
          trees.push({ x: bx + range(random, 24, 246), y: by + range(random, 24, 246), r: 11 });
        }
        continue;
      }
      if (key === 'casino') {
        addBuilding(bx + 25, by + 55, 220, 160, '#d9a441', 'CASINO');
        continue;
      }
      if (key === 'docks') {
        for (let t = 0; t < 6; t += 1) {
          containers.push({ x: bx + 20 + (t % 3) * 80, y: by + 30 + Math.floor(t / 3) * 100, w: 64, h: 40, color: pick(random, ['#b8542f', '#2f7ab8', '#4f9e57', '#c9a13d']) });
        }
        continue;
      }
      if (key === 'hospital') {
        addBuilding(bx + 45, by + 45, 180, 180, '#f0f0e8', 'HOSPITAL');
        continue;
      }
      if (key === 'mall') {
        addBuilding(bx + 20, by + 60, 230, 150, '#8fc7e8', 'MALL');
        continue;
      }
      if (key === 'bank') {
        addBuilding(bx + 55, by + 55, 160, 160, '#e8e0c8', 'BANK');
        continue;
      }
      if (key === 'safehouse') {
        addBuilding(bx + 75, by + 75, 120, 120, '#a8d8a0', 'SAFEHOUSE');
        continue;
      }
      if (random() < 0.16) {
        parks.push({ x: bx, y: by, w: 270, h: 270, kind: 'park' });
        for (let t = 0; t < int(random, 3, 6); t += 1) {
          trees.push({ x: bx + range(random, 24, 246), y: by + range(random, 24, 246), r: 11 });
        }
        continue;
      }
      // Ordinary block: one to three buildings with a courtyard gap.
      const n = int(random, 1, 3);
      if (n === 1) {
        addBuilding(bx + 30, by + 30, 210, 210, pick(random, ROOFS));
      } else if (n === 2) {
        addBuilding(bx + 25, by + 25, 100, 220, pick(random, ROOFS));
        addBuilding(bx + 145, by + 25, 100, 220, pick(random, ROOFS));
      } else {
        addBuilding(bx + 25, by + 25, 105, 105, pick(random, ROOFS));
        addBuilding(bx + 140, by + 25, 105, 105, pick(random, ROOFS));
        addBuilding(bx + 25, by + 140, 220, 105, pick(random, ROOFS));
      }
    }
  }

  /** True when the point is on asphalt (a road), not a block or the beach. */
  function isRoad(x, y) {
    if (y >= WORLD.beachY) return false;
    for (let k = 0; k < ROAD.count; k += 1) {
      if (Math.abs(x - roadCenter(k)) <= ROAD.width / 2) return true;
      if (Math.abs(y - roadCenter(k)) <= ROAD.width / 2) return true;
    }
    return false;
  }

  /** True when a circle of radius r at (x, y) touches a building, container or the edge. */
  function solidAt(x, y, r) {
    if (x < r || y < r || x > WORLD.size - r || y > WORLD.size - r) return true;
    if (y > WORLD.waterY - r) return true;
    for (const b of buildings) {
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
    }
    for (const c of containers) {
      if (x + r > c.x && x - r < c.x + c.w && y + r > c.y && y - r < c.y + c.h) return true;
    }
    return false;
  }

  /** Slide a circle along one axis: returns the furthest reachable position. */
  function moveAxis(x, y, r, dx, dy) {
    let nx = x + dx;
    let ny = y + dy;
    if (!solidAt(nx, y, r)) x = nx;
    if (!solidAt(x, ny, r)) y = ny;
    return { x, y };
  }

  /** A random point on a road, for spawning traffic. */
  function randomRoadPoint() {
    const vertical = random() < 0.5;
    const k = int(random, 0, ROAD.count - 1);
    const along = range(random, 120, WORLD.size - 120);
    return vertical ? { x: roadCenter(k), y: along } : { x: along, y: roadCenter(k) };
  }

  /** A random point on a sidewalk (road edge), for spawning pedestrians. */
  function randomSidewalkPoint() {
    const p = randomRoadPoint();
    const edge = ROAD.width / 2 + 8;
    if (random() < 0.5) p.x += random() < 0.5 ? edge : -edge;
    else p.y += random() < 0.5 ? edge : -edge;
    return p;
  }

  /** The nearest point on a road centre line to (x, y). */
  function nearestRoadPoint(x, y) {
    let best = null;
    let bestD = Infinity;
    for (let k = 0; k < ROAD.count; k += 1) {
      const cx = roadCenter(k);
      const d1 = Math.abs(x - cx);
      if (d1 < bestD) { bestD = d1; best = { x: cx, y }; }
      const d2 = Math.abs(y - cx);
      if (d2 < bestD) { bestD = d2; best = { x, y: cx }; }
    }
    return best;
  }

  return {
    buildings, parks, trees, containers,
    isRoad, solidAt, moveAxis, randomRoadPoint, randomSidewalkPoint, nearestRoadPoint,
    palette: PALETTE, carColors: CAR_COLORS, pedShirts: PED_SHIRTS,
  };
}
