// Drawing only: the city, its people and cars, and the screens. The camera
// follows the player and zooms to fit the window; the world is painted in
// visible slices (ground, roads, buildings, then everything that moves), and
// the HUD is drawn in screen space on top by hud.js. Flat colours, warm sun,
// long soft shadows — a sun-soaked bay city of its own.
import { FONT, PALETTE, ROAD, WORLD } from './config.js';
import { missionMarker } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_DONE = 'done';

const CENTRES = [180, 540, 900, 1260, 1620, 1980, 2340, 2700, 3060, 3420];

export function createRenderer(canvas, hud) {
  const ctx = canvas.getContext('2d');
  const view = { width: 1280, height: 720, zoom: 1, camX: 1800, camY: 1800 };
  const fonts = new Map();
  function font(size, weight) {
    const key = `${weight || ''}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight || ''}${size}px ${FONT}`);
    return fonts.get(key);
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    view.width = window.innerWidth;
    view.height = window.innerHeight;
    canvas.width = Math.round(view.width * ratio);
    canvas.height = Math.round(view.height * ratio);
    view.ratio = ratio;
    view.zoom = Math.max(0.72, Math.min(1.15, view.width / 1280));
  }

  resize();
  window.addEventListener('resize', resize);

  function text(value, x, y, size, color, align, weight) {
    ctx.font = font(size, weight);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(value, x, y);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawGround(cam) {
    const x0 = Math.max(0, cam.x - view.width / view.zoom / 2 - 60);
    const y0 = Math.max(0, cam.y - view.height / view.zoom / 2 - 60);
    const x1 = Math.min(WORLD.size, cam.x + view.width / view.zoom / 2 + 60);
    const y1 = Math.min(WORLD.size, cam.y + view.height / view.zoom / 2 + 60);
    // Base grass.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // Parks, sand and the plaza.
    for (const park of cam.city.parks) {
      if (park.x + park.w < x0 || park.x > x1 || park.y + park.h < y0 || park.y > y1) continue;
      ctx.fillStyle = park.kind === 'sand' ? PALETTE.sand : park.kind === 'plaza' ? PALETTE.plaza : PALETTE.park;
      ctx.fillRect(park.x, park.y, park.w, park.h);
    }
    // Water along the south edge, with wave lines.
    if (y1 > WORLD.waterY) {
      ctx.fillStyle = PALETTE.water;
      ctx.fillRect(x0, WORLD.waterY, x1 - x0, WORLD.size - WORLD.waterY);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      for (let wx = Math.floor(x0 / 90) * 90; wx < x1; wx += 90) {
        ctx.beginPath();
        ctx.moveTo(wx, WORLD.waterY + 14);
        ctx.quadraticCurveTo(wx + 22, WORLD.waterY + 8, wx + 45, WORLD.waterY + 14);
        ctx.stroke();
      }
    }
    // Sidewalks: a pale ring around every block in view.
    ctx.fillStyle = PALETTE.sidewalk;
    for (let j = 0; j < 10; j += 1) {
      for (let i = 0; i < 10; i += 1) {
        const bx = 225 + 360 * i;
        const by = 225 + 360 * j;
        if (bx + 270 < x0 || bx > x1 || by + 270 < y0 || by > y1) continue;
        ctx.fillRect(bx, by, 270, 270);
      }
    }
    // Roads: dark asphalt bands with dashed centre lines.
    ctx.fillStyle = PALETTE.road;
    for (const c of CENTRES) {
      if (c > y0 - 45 && c < y1 + 45) ctx.fillRect(x0, c - 45, x1 - x0, 90);
      if (c > x0 - 45 && c < x1 + 45) ctx.fillRect(c - 45, y0, 90, y1 - y0);
    }
    ctx.strokeStyle = PALETTE.roadLine;
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 30]);
    for (const c of CENTRES) {
      if (c > y0 - 45 && c < y1 + 45) {
        ctx.beginPath();
        ctx.moveTo(x0, c);
        ctx.lineTo(x1, c);
        ctx.stroke();
      }
      if (c > x0 - 45 && c < x1 + 45) {
        ctx.beginPath();
        ctx.moveTo(c, y0);
        ctx.lineTo(c, y1);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
  }

  function drawBuildings(cam) {
    const x0 = cam.x - view.width / view.zoom / 2 - 80;
    const y0 = cam.y - view.height / view.zoom / 2 - 80;
    const x1 = cam.x + view.width / view.zoom / 2 + 80;
    const y1 = cam.y + view.height / view.zoom / 2 + 80;
    for (const b of cam.city.buildings) {
      if (b.x + b.w < x0 || b.x > x1 || b.y + b.h < y0 || b.y > y1) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(b.x + 8, b.y + 10, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(b.x + 10, b.y + 10, b.w - 20, 14);
      if (b.label) {
        ctx.font = font(16, 'bold ');
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
      }
    }
    for (const c of cam.city.containers) {
      if (c.x + c.w < x0 || c.x > x1 || c.y + c.h < y0 || c.y > y1) continue;
      ctx.fillStyle = c.color;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
    }
    for (const t of cam.city.trees) {
      if (t.x < x0 || t.x > x1 || t.y < y0 || t.y > y1) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.arc(t.x + 4, t.y + 5, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4d8a3d';
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#67ab4f';
      ctx.beginPath();
      ctx.arc(t.x - 3, t.y - 3, t.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCar(car, game) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(-26, -13 + 5, 52, 26, 9);
    ctx.fill();
    ctx.fillStyle = car.color;
    roundRect(-26, -13, 52, 26, 9);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,24,32,0.85)';
    roundRect(-6, -11, 16, 22, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    roundRect(12, -10, 6, 20, 2);
    ctx.fill();
    // Headlights and brake lights.
    ctx.fillStyle = '#fff8c9';
    ctx.fillRect(24, -11, 3, 5);
    ctx.fillRect(24, 6, 3, 5);
    if (car.blocked > 0.2 || car.speed < -10) {
      ctx.fillStyle = '#ff2e2e';
      ctx.fillRect(-28, -11, 3, 5);
      ctx.fillRect(-28, 6, 3, 5);
    }
    if (car.kind === 'police') {
      const flash = Math.floor(game.time * 6) % 2 === 0;
      ctx.fillStyle = flash ? PALETTE.copRed : PALETTE.copBlue;
      ctx.fillRect(-4, -13, 10, 5);
      ctx.fillStyle = flash ? PALETTE.copBlue : PALETTE.copRed;
      ctx.fillRect(-4, 8, 10, 5);
    }
    if (car === game.player.car) {
      ctx.strokeStyle = '#f2c94c';
      ctx.lineWidth = 2;
      roundRect(-29, -16, 58, 32, 10);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPed(ped) {
    ctx.save();
    ctx.translate(ped.x, ped.y);
    if (ped.down) {
      ctx.rotate(1.2);
      ctx.fillStyle = ped.shirt;
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(2, 3, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.shirt;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8b48a';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPlayer(game) {
    const p = game.player;
    if (p.car) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.arc(3, 4, 14, 0, Math.PI * 2);
    ctx.fill();
    // Rico: teal jacket, dark jeans.
    ctx.fillStyle = '#1f8a70';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8b48a';
    ctx.beginPath();
    ctx.arc(4, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    // Pistol points where he aims.
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(24, 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawMarker(game) {
    const marker = missionMarker(game);
    if (!marker) return;
    const pulse = 1 + Math.sin(game.time * 4) * 0.12;
    ctx.save();
    ctx.translate(marker.x, marker.y);
    ctx.strokeStyle = 'rgba(242, 201, 76, 0.9)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 46 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(242, 201, 76, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, 46 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath();
    ctx.moveTo(0, -58);
    ctx.lineTo(-12, -34);
    ctx.lineTo(12, -34);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawWorld(game, cam) {
    ctx.setTransform(view.ratio, 0, 0, view.ratio, 0, 0);
    ctx.fillStyle = '#10131a';
    ctx.fillRect(0, 0, view.width, view.height);
    ctx.setTransform(view.ratio * view.zoom, 0, 0, view.ratio * view.zoom,
      view.ratio * (view.width / 2 - cam.x * view.zoom),
      view.ratio * (view.height / 2 - cam.y * view.zoom));
    drawGround(cam);
    drawBuildings(cam);
    drawMarker(game);
    for (const pickup of game.combat.pickups) {
      const bob = Math.sin(pickup.bob) * 3;
      ctx.fillStyle = pickup.kind === 'health' ? '#7ac74f' : pickup.kind === 'ammo' ? '#f2c94c' : '#4fc3f7';
      ctx.beginPath();
      ctx.arc(pickup.x, pickup.y + bob, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.font = font(12, 'bold ');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pickup.kind === 'health' ? '+' : pickup.kind === 'ammo' ? 'A' : '$', pickup.x, pickup.y + bob);
    }
    for (const ped of game.peds) drawPed(ped);
    for (const car of game.cars) if (!car.wrecked) drawCar(car, game);
    for (const enemy of game.enemies) {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.arc(2, 3, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = enemy.kind === 'boss' ? '#8a1f1f' : '#c22f2f';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8b48a';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      // Health bar above the head.
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-16, -26, 32, 5);
      ctx.fillStyle = '#e5534b';
      ctx.fillRect(-16, -26, 32 * Math.max(0, enemy.health / (enemy.kind === 'boss' ? 260 : 70)), 5);
      if (enemy.kind === 'boss') {
        ctx.font = font(13, 'bold ');
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('VINCE', 0, -46);
      }
      ctx.restore();
    }
    for (const officer of game.officers) {
      ctx.save();
      ctx.translate(officer.x, officer.y);
      ctx.fillStyle = '#2f6df6';
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8b48a';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1c1e24';
      ctx.fillRect(-8, -15, 16, 5);
      ctx.restore();
    }
    drawPlayer(game);
    // Bullets as bright streaks, particles as fading sparks.
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 3;
    for (const b of game.combat.bullets) {
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (const p of game.combat.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawPanel(title, lines, prompt, accent) {
    ctx.setTransform(view.ratio, 0, 0, view.ratio, 0, 0);
    ctx.fillStyle = 'rgba(10, 12, 18, 0.55)';
    ctx.fillRect(0, 0, view.width, view.height);
    const w = 640;
    const h = 210 + lines.length * 30;
    const x = (view.width - w) / 2;
    const y = (view.height - h) / 2;
    ctx.fillStyle = 'rgba(16, 19, 26, 0.92)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = accent || PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    text(title, view.width / 2, y + 36, 44, PALETTE.text, 'center', 'bold ');
    lines.forEach((line, i) => {
      text(line, view.width / 2, y + 106 + i * 30, 18, PALETTE.muted, 'center');
    });
    text(prompt, view.width / 2, y + h - 44, 20, accent || PALETTE.gold, 'center', 'bold ');
  }

  return {
    view,
    draw(game, screen) {
      // The camera chases the player and stays inside the city.
      const halfW = view.width / view.zoom / 2;
      const halfH = view.height / view.zoom / 2;
      view.camX = Math.max(halfW, Math.min(WORLD.size - halfW, game.player.x));
      view.camY = Math.max(halfH, Math.min(WORLD.size - halfH, game.player.y));
      if (screen === SCREEN_TITLE) {
        view.camX = 1800 + Math.sin(game.time * 0.05) * 300;
        view.camY = 1800;
      }
      const cam = { x: view.camX, y: view.camY, city: game.city };
      drawWorld(game, cam);
      if (screen === SCREEN_TITLE) {
        ctx.setTransform(view.ratio, 0, 0, view.ratio, 0, 0);
        ctx.fillStyle = 'rgba(8, 10, 16, 0.62)';
        ctx.fillRect(0, 0, view.width, view.height);
        text('SOLARA BAY', view.width / 2, view.height * 0.16, 84, '#f2c94c', 'center', 'bold ');
        text('an open-world crime story', view.width / 2, view.height * 0.16 + 96, 26, PALETTE.text, 'center');
        const lines = [
          'Rico rolls into Solara Bay with empty pockets and a fast right foot.',
          'Steal cars. Outrun the law. Run six jobs and take the city.',
          '',
          'WASD / arrows — walk & drive · Shift — run · E — steal car · Click — shoot',
          'Space — brake · P — pause · M — mute · Your progress saves automatically.',
        ];
        lines.forEach((line, i) => {
          text(line, view.width / 2, view.height * 0.42 + i * 30, 19, i < 2 ? PALETTE.text : PALETTE.muted, 'center');
        });
        const prompt = game.hasSave ? 'Press Enter or click — Continue your story' : 'Press Enter or click — New game';
        text(prompt, view.width / 2, view.height * 0.42 + lines.length * 30 + 26, 22, PALETTE.gold, 'center', 'bold ');
        text('A game of its own: no Rockstar names, art or map — just sun, asphalt and trouble.', view.width / 2, view.height - 40, 14, PALETTE.muted, 'center');
        return;
      }
      if (screen === SCREEN_PLAY) {
        // Back to screen space: the HUD reads in pixels, not world units.
        ctx.setTransform(view.ratio, 0, 0, view.ratio, 0, 0);
        hud.draw(ctx, game, view);
        return;
      }
      if (screen === SCREEN_PAUSED) {
        ctx.setTransform(view.ratio, 0, 0, view.ratio, 0, 0);
        hud.draw(ctx, game, view);
        drawPanel('Paused', ['The bay will wait for you.', `Cash $${Math.round(game.money).toLocaleString('en-US')} · Job ${Math.min(game.mission.index + 1, 6)} of 6`], 'Press P to keep playing');
        return;
      }
      if (screen === SCREEN_BUSTED) {
        drawPanel('BUSTED', ['The cops caught up with Rico at Bay General.', `They took $${Math.round(game.bustedFine).toLocaleString('en-US')} in fines. The story goes on.`], 'Press Enter to get back out there', '#2f6df6');
        return;
      }
      if (screen === SCREEN_WASTED) {
        drawPanel('WASTED', ['Rico woke up at Bay General, patched up and poorer.', `The hospital took $${Math.round(game.bustedFine).toLocaleString('en-US')}. The story goes on.`], 'Press Enter to get back out there', '#e5534b');
        return;
      }
      if (screen === SCREEN_DONE) {
        drawPanel('KING OF SOLARA', ['Every job done. Vince is finished. The bay is yours, Rico.', `Final cash: $${Math.round(game.money).toLocaleString('en-US')}`], 'Press Enter to keep roaming free', '#f2c94c');
      }
    },
    resize,
  };
}
