// Save and load through localStorage: cash, story progress, position and
// health. A save is only the numbers that matter; the city is rebuilt from
// its seed on load, so a save can never go stale.
import { SAVE_KEY } from './config.js';

export function saveGame(game) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: Math.round(game.money),
      missionIndex: game.missionIndex,
      x: Math.round(game.player.x),
      y: Math.round(game.player.y),
      health: Math.round(game.player.health),
      ammo: game.player.ammo,
      storyDone: game.storyDone,
    }));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.money !== 'number' || typeof data.missionIndex !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage can be off: nothing to clear.
  }
}
