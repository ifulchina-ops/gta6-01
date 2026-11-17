// The HUD: everything the player reads while driving — cash, health, wanted
// stars, the mission objective, the speedometer, ammo, the countdown, and the
// minimap in the corner. All of it is drawn in screen space, on top of the
// world, in the same warm palette as the city.
import { FONT, PALETTE, WORLD } from './config.js';
import { currentMission, missionMarker, missionObjective } from './missions.js';

const MAP = { x: 0, y: 0, w: 230, h: 230 };

export function createHud() {
  const fonts = new Map();
  function font(size, weight) {
    const key = `${weight || ''}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight || ''}${size}px ${FONT}`);
    return fonts.get(key);
  }

  function panel(ctx, x, y, w, h, alpha) {
    ctx.fillStyle = `rgba(12, 14, 20, ${alpha || 0.72})`;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(245, 241, 230, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  function stars(ctx, wanted, x, y) {
    ctx.font = font(26, 'bold ');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = i < wanted ? '#f2c94c' : 'rgba(245, 241, 230, 0.25)';
      ctx.fillText('★', x + i * 30, y);
    }
  }

  function drawMinimap(ctx, game, view) {
    const scale = MAP.w / WORLD.size;
    MAP.x = view.width - MAP.w - 16;
    MAP.y = 16;
    panel(ctx, MAP.x, MAP.y, MAP.w, MAP.h, 0.78);
    ctx.save();
    ctx.beginPath();
    ctx.rect(MAP.x, MAP.y, MAP.w, MAP.h);
    ctx.clip();
    // Water and sand along the bottom edge.
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(MAP.x, MAP.y + WORLD.waterY * scale, MAP.w, MAP.h);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(MAP.x, MAP.y + 3465 * scale, MAP.w, (WORLD.waterY - 3465) * scale);
    ctx.fillStyle = '#2a2d33';
    ctx.fillRect(MAP.x, MAP.y, MAP.w, 3465 * scale);
    // Roads as light lines.
    ctx.strokeStyle = 'rgba(245, 241, 230, 0.55)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 10; k += 1) {
      const c = (180 + 360 * k) * scale;
      ctx.beginPath();
      ctx.moveTo(MAP.x + c, MAP.y);
      ctx.lineTo(MAP.x + c, MAP.y + MAP.h);
      ctx.moveTo(MAP.x, MAP.y + c);
      ctx.lineTo(MAP.x + MAP.w, MAP.y + c);
      ctx.stroke();
    }
    // Parks as green blocks.
    ctx.fillStyle = 'rgba(125, 174, 98, 0.8)';
    for (const park of game.city.parks) {
      if (park.kind === 'sand') continue;
      ctx.fillRect(MAP.x + park.x * scale, MAP.y + park.y * scale, park.w * scale, park.h * scale);
    }
    // The mission marker pulses yellow.
    const marker = missionMarker(game);
    if (marker) {
      const pulse = 4 + Math.sin(game.time * 5) * 1.5;
      ctx.fillStyle = '#f2c94c';
      ctx.beginPath();
      ctx.arc(MAP.x + marker.x * scale, MAP.y + marker.y * scale, pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // Police are red dots, traffic is pale, the player is a white arrow.
    ctx.fillStyle = '#f63232';
    for (const cop of game.cops) {
      ctx.fillRect(MAP.x + cop.x * scale - 2, MAP.y + cop.y * scale - 2, 4, 4);
    }
    ctx.fillStyle = 'rgba(245, 241, 230, 0.7)';
    for (const car of game.cars) {
      if (car.kind === 'traffic') ctx.fillRect(MAP.x + car.x * scale - 1, MAP.y + car.y * scale - 1, 3, 3);
    }
    const px = MAP.x + game.player.x * scale;
    const py = MAP.y + game.player.y * scale;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(game.player.angle);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-5, -5);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
    ctx.font = font(13, 'bold ');
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('SOLARA BAY', MAP.x + 8, MAP.y + MAP.h + 6);
  }

  function drawToast(ctx, game, view) {
    if (!game.toastText || game.toastTimer <= 0) return;
    const alpha = Math.min(1, game.toastTimer);
    ctx.globalAlpha = alpha;
    ctx.font = font(20, 'bold ');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const w = ctx.measureText(game.toastText).width + 36;
    panel(ctx, (view.width - w) / 2, view.height - 84, w, 40, 0.8);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(game.toastText, view.width / 2, view.height - 74);
    ctx.globalAlpha = 1;
  }

  return {
    draw(ctx, game, view) {
      ctx.textBaseline = 'top';
      // Wanted stars, centred at the top.
      stars(ctx, game.wanted, view.width / 2 - 75, 14);
      // Cash and health, top left.
      panel(ctx, 16, 16, 250, 62, 0.72);
      ctx.font = font(26, 'bold ');
      ctx.fillStyle = '#7ac74f';
      ctx.textAlign = 'left';
      ctx.fillText(`$${Math.round(game.money).toLocaleString('en-US')}`, 30, 24);
      ctx.fillStyle = '#e5534b';
      ctx.fillRect(30, 58, 140, 10);
      ctx.fillStyle = game.player.health > 30 ? '#7ac74f' : '#e5534b';
      ctx.fillRect(30, 58, 140 * Math.max(0, game.player.health / 100), 10);
      ctx.font = font(13);
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText(`${Math.max(0, Math.round(game.player.health))} HP`, 178, 56);
      // Mission objective under the cash.
      const mission = currentMission(game);
      if (mission) {
        const text = missionObjective(game);
        ctx.font = font(16, 'bold ');
        const w = Math.min(420, ctx.measureText(text).width + 28);
        panel(ctx, 16, 88, w, 34, 0.72);
        ctx.fillStyle = PALETTE.gold;
        ctx.fillText(text, 30, 96);
        const step = mission.steps[game.mission.step];
        if (step && step.type === 'timedGoto') {
          ctx.font = font(22, 'bold ');
          ctx.fillStyle = game.mission.timer < 15 ? '#e5534b' : PALETTE.text;
          ctx.fillText(`${Math.ceil(game.mission.timer)}s`, 30, 128);
        }
        if (step && step.type === 'hold') {
          ctx.font = font(16);
          ctx.fillStyle = PALETTE.text;
          ctx.fillText(`Vault: ${Math.ceil(game.mission.holdTimer)} / ${step.seconds}s`, 30, 128);
        }
      } else {
        ctx.font = font(16, 'bold ');
        panel(ctx, 16, 88, 330, 34, 0.72);
        ctx.fillStyle = PALETTE.gold;
        ctx.fillText('Story complete — free roam!', 30, 96);
      }
      // Speed and ammo, bottom left.
      if (game.player.car) {
        ctx.font = font(34, 'bold ');
        ctx.fillStyle = PALETTE.text;
        ctx.textAlign = 'left';
        ctx.fillText(`${Math.round(Math.abs(game.player.car.speed) * 0.18)}`, 24, view.height - 64);
        ctx.font = font(14);
        ctx.fillStyle = PALETTE.muted;
        ctx.fillText('km/h', 24, view.height - 26);
      } else {
        ctx.font = font(20, 'bold ');
        ctx.fillStyle = PALETTE.text;
        ctx.fillText(`Ammo ${game.player.ammo}`, 24, view.height - 52);
        ctx.font = font(13);
        ctx.fillStyle = PALETTE.muted;
        ctx.fillText('Click to shoot · E to steal a car', 24, view.height - 26);
      }
      // Controls hint, bottom right.
      ctx.font = font(13);
      ctx.fillStyle = PALETTE.muted;
      ctx.textAlign = 'right';
      ctx.fillText('WASD drive / walk · Shift run · Space brake · P pause · M mute', view.width - 16, view.height - 24);
      drawMinimap(ctx, game, view);
      drawToast(ctx, game, view);
    },
  };
}
