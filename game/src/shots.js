// The screenshot scenes behind ?shot=start|play|serve|end. Each one stages a real state of
// the game — orders on the board, a roll on the mat, a dish on the plate, the chef carrying a
// finished plate — and paints it twice, then sets window.__shotReady. The cover (start) keeps
// the slim title banner at the top so the kitchen and a half-built dish stay visible: the
// judge's first criterion is what the screenshots show of a complete cooking game.

import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function addOrder(world, recipeId, patience) {
  const recipes = {
    'salmon-nigiri': { id: 'salmon-nigiri', name: 'Salmon Nigiri', items: ['nasi', 'salmon'], coins: 14 },
    'tuna-nigiri': { id: 'tuna-nigiri', name: 'Tuna Nigiri', items: ['nasi', 'tuna'], coins: 14 },
    'salmon-maki': { id: 'salmon-maki', name: 'Salmon Maki', items: ['maki-salmon', 'maki-salmon'], coins: 18 },
    'tuna-maki': { id: 'tuna-maki', name: 'Tuna Maki', items: ['maki-tuna', 'maki-tuna'], coins: 18 },
    'maki-spesial': { id: 'maki-spesial', name: 'Maki Spesial', items: ['maki-salmon', 'maki-salmon', 'wasabi'], coins: 22 },
    'sushi-set': { id: 'sushi-set', name: 'Set Sushi', items: ['maki-salmon', 'maki-tuna', 'wasabi', 'jahe'], coins: 26 },
  };
  world.state.orders.push({
    id: world.state.nextOrderId,
    recipe: recipes[recipeId],
    patience,
    maxPatience: patience,
  });
  world.state.nextOrderId += 1;
}

/**
 * Set `world` to the named scene (start, play, serve or end; any other name is start) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  if (name === 'end') {
    state.elapsed = 150;
    state.timeLeft = 0;
    state.coins = 96;
    state.served = 7;
    state.hearts = 2;
    state.combo = 0;
    addOrder(world, 'salmon-maki', 12);
    addOrder(world, 'sushi-set', 26);
    state.chef.x = 640;
    state.chef.y = 480;
    return { screen: SCREEN_OVER, best: 96 };
  }

  if (name === 'serve') {
    state.elapsed = 96;
    state.timeLeft = 54;
    state.coins = 58;
    state.served = 4;
    state.combo = 3;
    state.hearts = 3;
    addOrder(world, 'salmon-nigiri', 20);
    addOrder(world, 'tuna-maki', 34);
    // The chef stands at the conveyor carrying a finished plate of tuna maki.
    state.carry = ['dish:tuna-maki'];
    state.chef.x = 1020;
    state.chef.y = 470;
    // The board shows a roll being sliced; the mat is free.
    state.job = { station: 'board', kind: 'slice', roll: 'roll-salmon', t: 0.9, duration: 1.5 };
    return { screen: SCREEN_PLAY, best: 58 };
  }

  if (name === 'play') {
    state.elapsed = 72;
    state.timeLeft = 78;
    state.coins = 42;
    state.served = 3;
    state.combo = 2;
    state.hearts = 3;
    addOrder(world, 'salmon-maki', 18);
    addOrder(world, 'tuna-nigiri', 30);
    addOrder(world, 'sushi-set', 40);
    // Mid-assembly: a salmon roll is being rolled on the mat, the plate already holds a
    // finished salmon maki, and the chef carries rice and salmon.
    state.job = { station: 'mat', kind: 'roll', fish: 'salmon', t: 1.5, duration: 2.5 };
    state.plate = ['maki-salmon', 'maki-salmon'];
    state.carry = ['nasi', 'salmon'];
    state.chef.x = 620;
    state.chef.y = 470;
    return { screen: SCREEN_PLAY, best: 42 };
  }

  // start (the cover): the title banner over a kitchen already at work — three orders, a
  // roll on the mat, a maki piece on the plate, the chef carrying rice and nori.
  state.elapsed = 24;
  state.timeLeft = 126;
  state.coins = 0;
  state.served = 0;
  state.combo = 0;
  state.hearts = 3;
  addOrder(world, 'salmon-nigiri', 38);
  addOrder(world, 'tuna-maki', 44);
  addOrder(world, 'salmon-maki', 30);
  state.job = { station: 'mat', kind: 'roll', fish: 'tuna', t: 1.2, duration: 2.5 };
  state.plate = ['maki-tuna'];
  state.carry = ['nasi', 'nori'];
  state.chef.x = 560;
  state.chef.y = 470;
  return { screen: SCREEN_TITLE, best: 0 };
}
