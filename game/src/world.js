// The game's rules and state, with no drawing and no browser in it: the chef, the stations,
// the orders, the rolling and slicing jobs, the plate, the coins and the hearts. step()
// advances one fixed step and returns what happened as bit flags, so the caller can react
// without the world knowing about screens. Nothing here allocates after createWorld returns.

import {
  CARRY_MAX,
  CHEF,
  COMBO_WINDOW,
  COMBO_STEP,
  FIELD,
  HEARTS,
  INGREDIENTS,
  ORDER_INTERVAL,
  ORDER_MAX,
  ORDER_PATIENCE,
  PIECES_OF,
  PLATE_MAX,
  RECIPES,
  ROLL_OF,
  ROLL_TIME,
  SHIFT_SECONDS,
  SLICE_TIME,
  SPEED_BONUS_MAX,
} from './config.js';

export const EVENT_SERVED = 1;
export const EVENT_EXPIRED = 2;
export const EVENT_OVER = 4;
export const EVENT_REFUSED = 8;

/**
 * Every place the chef can use. Bins hand out one ingredient; the mat rolls a maki roll out
 * of nori, rice and fish; the board slices a roll into two pieces; the plate is where a dish
 * is assembled; the conveyor takes finished plates to the customers; the trash throws things
 * away. Rectangles are solid: the chef walks around them, never through them.
 */
export const STATIONS = [
  // The bin wall stands 40 px off the left edge: that leaves a corridor the chef can
  // walk down to slip around the wall's bottom corner, so no pocket is a trap.
  { id: 'bin-nasi', kind: 'bin', item: 'nasi', label: 'Nasi', x: 40, y: 168, w: 100, h: 92 },
  { id: 'bin-nori', kind: 'bin', item: 'nori', label: 'Nori', x: 148, y: 168, w: 100, h: 92 },
  { id: 'bin-salmon', kind: 'bin', item: 'salmon', label: 'Salmon', x: 40, y: 272, w: 100, h: 92 },
  { id: 'bin-tuna', kind: 'bin', item: 'tuna', label: 'Tuna', x: 148, y: 272, w: 100, h: 92 },
  { id: 'bin-wasabi', kind: 'bin', item: 'wasabi', label: 'Wasabi', x: 40, y: 376, w: 100, h: 92 },
  { id: 'bin-jahe', kind: 'bin', item: 'jahe', label: 'Jahe', x: 148, y: 376, w: 100, h: 92 },
  { id: 'mat', kind: 'mat', label: 'Alas Gulung', x: 400, y: 300, w: 240, h: 100 },
  { id: 'board', kind: 'board', label: 'Talenan', x: 700, y: 300, w: 220, h: 100 },
  { id: 'plate', kind: 'plate', label: 'Meja Saji', x: 400, y: 560, w: 520, h: 100 },
  { id: 'conveyor', kind: 'conveyor', label: 'Konveyor', x: 1060, y: 280, w: 196, h: 380 },
  { id: 'trash', kind: 'trash', label: 'Sampah', x: 40, y: 590, w: 150, h: 78 },
];

function rectDistance(px, py, rect) {
  const dx = Math.max(rect.x - px, 0, px - (rect.x + rect.w));
  const dy = Math.max(rect.y - py, 0, py - (rect.y + rect.h));
  return Math.hypot(dx, dy);
}

/** The station the chef can reach from here, or null when none is in reach. */
export function nearestStation(x, y) {
  let best = null;
  let bestDistance = Infinity;
  for (const station of STATIONS) {
    const distance = rectDistance(x, y, station);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = station;
    }
  }
  return bestDistance <= CHEF.reach ? best : null;
}

/** The station whose rectangle holds this point, or null. */
export function stationAt(x, y) {
  for (const station of STATIONS) {
    if (x >= station.x && x <= station.x + station.w && y >= station.y && y <= station.y + station.h) {
      return station;
    }
  }
  return null;
}

/** The recipe these plate items make, or null when they make nothing yet. */
export function dishOnPlate(items) {
  for (const recipe of RECIPES) {
    if (recipe.items.length !== items.length) continue;
    const rest = items.slice();
    let matches = true;
    for (const wanted of recipe.items) {
      const at = rest.indexOf(wanted);
      if (at === -1) {
        matches = false;
        break;
      }
      rest.splice(at, 1);
    }
    if (matches) return recipe;
  }
  return null;
}

function removeOne(list, item) {
  const at = list.indexOf(item);
  if (at !== -1) list.splice(at, 1);
}

function hasAll(list, wanted) {
  const rest = list.slice();
  for (const item of wanted) {
    const at = rest.indexOf(item);
    if (at === -1) return false;
    rest.splice(at, 1);
  }
  return true;
}

export function createWorld(random) {
  const chef = { x: FIELD.width / 2, y: 480, radius: CHEF.radius };
  const state = {
    chef,
    carry: [],
    plate: [],
    orders: [],
    coins: 0,
    served: 0,
    combo: 0,
    hearts: HEARTS,
    elapsed: 0,
    timeLeft: SHIFT_SECONDS,
    orderTimer: ORDER_INTERVAL.start,
    nextOrderId: 1,
    lastServeAt: -1000,
    job: null,
    message: '',
    messageT: 0,
  };

  function reset() {
    chef.x = FIELD.width / 2;
    chef.y = 480;
    state.carry.length = 0;
    state.plate.length = 0;
    state.orders.length = 0;
    state.coins = 0;
    state.served = 0;
    state.combo = 0;
    state.hearts = HEARTS;
    state.elapsed = 0;
    state.timeLeft = SHIFT_SECONDS;
    state.orderTimer = ORDER_INTERVAL.start;
    state.nextOrderId = 1;
    state.lastServeAt = -1000;
    state.job = null;
    state.message = '';
    state.messageT = 0;
  }

  function say(text) {
    state.message = text;
    state.messageT = 2;
  }

  function orderInterval() {
    const progress = Math.min(1, state.elapsed / SHIFT_SECONDS);
    return ORDER_INTERVAL.start + (ORDER_INTERVAL.end - ORDER_INTERVAL.start) * progress;
  }

  function orderPatience() {
    const progress = Math.min(1, state.elapsed / SHIFT_SECONDS);
    return ORDER_PATIENCE.start + (ORDER_PATIENCE.end - ORDER_PATIENCE.start) * progress;
  }

  function spawnOrder() {
    if (state.orders.length >= ORDER_MAX) return;
    const recipe = RECIPES[Math.floor(random() * RECIPES.length)];
    const patience = orderPatience();
    state.orders.push({
      id: state.nextOrderId,
      recipe,
      patience,
      maxPatience: patience,
    });
    state.nextOrderId += 1;
  }

  /**
   * Push the chef out of a station along one axis only. Moving one axis at a time is what
   * lets the chef slide along a counter instead of sticking to it: walking up-left past a
   * bin slides around its corner, and a click-to-walk target behind a bin stays reachable.
   */
  function pushOutAxis(axis) {
    for (const station of STATIONS) {
      const nearestX = Math.max(station.x, Math.min(chef.x, station.x + station.w));
      const nearestY = Math.max(station.y, Math.min(chef.y, station.y + station.h));
      const dx = chef.x - nearestX;
      const dy = chef.y - nearestY;
      if (Math.hypot(dx, dy) >= chef.radius) continue;
      if (axis === 'x') {
        chef.x =
          chef.x < station.x + station.w / 2
            ? station.x - chef.radius
            : station.x + station.w + chef.radius;
      } else {
        chef.y =
          chef.y < station.y + station.h / 2
            ? station.y - chef.radius
            : station.y + station.h + chef.radius;
      }
    }
  }

  function clampToField() {
    chef.x = Math.max(chef.radius, Math.min(FIELD.width - chef.radius, chef.x));
    chef.y = Math.max(156 + chef.radius, Math.min(FIELD.height - chef.radius, chef.y));
  }

  function startRollJob(fish) {
    for (const item of ['nori', 'nasi', fish]) removeOne(state.carry, item);
    state.job = { station: 'mat', kind: 'roll', fish, t: 0, duration: ROLL_TIME };
  }

  function startSliceJob(roll) {
    removeOne(state.carry, roll);
    state.job = { station: 'board', kind: 'slice', roll, t: 0, duration: SLICE_TIME };
  }

  function finishJob() {
    const job = state.job;
    state.job = null;
    if (job.kind === 'roll') {
      state.carry.push(ROLL_OF[job.fish]);
      say('Roll selesai! Potong di talenan.');
    } else {
      state.carry.push(PIECES_OF[job.roll], PIECES_OF[job.roll]);
      say('Maki terpotong rapi!');
    }
  }

  function useBin(station) {
    if (state.carry.length >= CARRY_MAX) {
      say('Tangan penuh!');
      return EVENT_REFUSED;
    }
    state.carry.push(station.item);
    return 0;
  }

  function useMat() {
    if (state.job) return 0;
    for (const fish of ['salmon', 'tuna']) {
      if (hasAll(state.carry, ['nori', 'nasi', fish])) {
        startRollJob(fish);
        return 0;
      }
    }
    say('Butuh nori + nasi + ikan untuk menggulung.');
    return EVENT_REFUSED;
  }

  function useBoard() {
    if (state.job) return 0;
    for (const roll of ['roll-salmon', 'roll-tuna']) {
      if (state.carry.includes(roll)) {
        if (state.carry.length > CARRY_MAX - 1) {
          say('Tangan penuh untuk memotong!');
          return EVENT_REFUSED;
        }
        startSliceJob(roll);
        return 0;
      }
    }
    say('Bawa roll ke sini untuk dipotong.');
    return EVENT_REFUSED;
  }

  function usePlate() {
    const dish = dishOnPlate(state.plate);
    if (state.carry.length === 0) {
      if (dish) {
        state.carry.push(`dish:${dish.id}`);
        state.plate.length = 0;
        say(`${dish.name} siap diantar!`);
        return 0;
      }
      if (state.plate.length > 0) {
        state.carry.push(state.plate.pop());
        return 0;
      }
      return 0;
    }
    if (state.plate.length >= PLATE_MAX) {
      say('Piring sudah penuh!');
      return EVENT_REFUSED;
    }
    state.plate.push(state.carry.pop());
    return 0;
  }

  function useConveyor() {
    if (state.carry.length !== 1 || !state.carry[0].startsWith('dish:')) {
      say('Bawa piring jadi ke konveyor.');
      return EVENT_REFUSED;
    }
    const dishId = state.carry[0].slice(5);
    let target = null;
    for (const order of state.orders) {
      if (order.recipe.id === dishId && (target === null || order.patience < target.patience)) {
        target = order;
      }
    }
    if (target === null) {
      say('Tidak ada pesanan itu sekarang.');
      return EVENT_REFUSED;
    }
    const recipe = target.recipe;
    const speedBonus = Math.round(SPEED_BONUS_MAX * (target.patience / target.maxPatience));
    state.combo = state.elapsed - state.lastServeAt <= COMBO_WINDOW ? state.combo + 1 : 1;
    const earned = Math.round((recipe.coins + speedBonus) * (1 + COMBO_STEP * (state.combo - 1)));
    state.coins += earned;
    state.served += 1;
    state.lastServeAt = state.elapsed;
    state.carry.length = 0;
    state.orders.splice(state.orders.indexOf(target), 1);
    say(`+${earned} koin! ${recipe.name} terantar.`);
    return EVENT_SERVED;
  }

  function useTrash() {
    if (state.carry.length > 0) {
      state.carry.pop();
      return 0;
    }
    if (state.plate.length > 0) {
      state.plate.length = 0;
      say('Piring dikosongkan.');
      return 0;
    }
    return 0;
  }

  function useStation(station) {
    if (station.kind === 'bin') return useBin(station);
    if (station.kind === 'mat') return useMat();
    if (station.kind === 'board') return useBoard();
    if (station.kind === 'plate') return usePlate();
    if (station.kind === 'conveyor') return useConveyor();
    if (station.kind === 'trash') return useTrash();
    return 0;
  }

  /**
   * One fixed step. `moveX`/`moveY` steer the chef (already normalised). With `harmless`
   * set (the title screen's backdrop) orders drift in but nothing expires and the clock
   * never runs down.
   */
  function step(dt, moveX, moveY, usePressed, harmless) {
    let events = 0;
    state.elapsed += dt;
    if (state.messageT > 0) state.messageT -= dt;

    if (!harmless) {
      state.timeLeft = Math.max(0, SHIFT_SECONDS - state.elapsed);
    }

    if (state.job) {
      state.job.t += dt;
      if (state.job.t >= state.job.duration) finishJob();
    } else if (moveX !== 0 || moveY !== 0) {
      const length = Math.hypot(moveX, moveY) || 1;
      chef.x += (moveX / length) * CHEF.speed * dt;
      pushOutAxis('x');
      chef.y += (moveY / length) * CHEF.speed * dt;
      pushOutAxis('y');
      clampToField();
    }

    if (usePressed && !state.job) {
      const station = nearestStation(chef.x, chef.y);
      if (station) events |= useStation(station);
    }

    state.orderTimer -= dt;
    if (state.orderTimer <= 0) {
      spawnOrder();
      state.orderTimer = orderInterval();
    }

    if (!harmless) {
      for (let index = state.orders.length - 1; index >= 0; index -= 1) {
        const order = state.orders[index];
        order.patience -= dt;
        if (order.patience <= 0) {
          state.orders.splice(index, 1);
          state.hearts -= 1;
          say('Pesanan hangus! -1 hati.');
          events |= EVENT_EXPIRED;
          if (state.hearts <= 0) events |= EVENT_OVER;
        }
      }
      if (state.timeLeft <= 0) events |= EVENT_OVER;
    }

    return events;
  }

  reset();

  return { state, reset, step, useStation, nearestStation, spawnOrder };
}
