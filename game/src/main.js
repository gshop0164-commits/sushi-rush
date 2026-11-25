// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between four screens: title, play, paused and game over. A click walks the chef to the
// clicked spot — clicking a station walks there and uses it on arrival — so the game plays
// with mouse alone as well as with keys.
//
// ?seed=N fixes the order pattern. ?shot=start|play|serve|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, CHEF, FIELD, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_EXPIRED, EVENT_OVER, EVENT_SERVED, STATIONS, stationAt } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_USE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, (clientX, clientY) => renderer.toLogical(clientX, clientY));
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let walkTargets = [];
  let walkStation = null;
  let walkLastDistance = Infinity;
  let walkStuckTime = 0;

  // A read-only peek at the live state, only when the page is opened with ?debug=1.
  if (params.has('debug')) {
    window.__sushiDebug = () => ({
      chef: { x: Math.round(world.state.chef.x), y: Math.round(world.state.chef.y) },
      carry: world.state.carry.slice(),
      walkTargets: walkTargets.slice(),
      screen,
    });
  }

  /** The open aisle across the kitchen, clear of every station: the walk router's lane. */
  const AISLE_Y = 510;

  /** The four sides of a station a chef could stand on, kept inside the playfield. */
  function approachCandidates(station) {
    const margin = CHEF.radius + 14;
    const cx = station.x + station.w / 2;
    const cy = station.y + station.h / 2;
    const points = [
      { x: cx, y: station.y - margin },
      { x: cx, y: station.y + station.h + margin },
      { x: station.x - margin, y: cy },
      { x: station.x + station.w + margin, y: cy },
    ];
    return points.map((p) => ({
      x: Math.max(CHEF.radius, Math.min(FIELD.width - CHEF.radius, p.x)),
      y: Math.max(156 + CHEF.radius, Math.min(FIELD.height - CHEF.radius, p.y)),
    }));
  }

  /** Whether a point is inside a station, the chef's own radius included. */
  function pointBlocked(x, y) {
    const pad = CHEF.radius + 2;
    for (const station of STATIONS) {
      if (
        x >= station.x - pad &&
        x <= station.x + station.w + pad &&
        y >= station.y - pad &&
        y <= station.y + station.h + pad
      ) {
        return true;
      }
    }
    return false;
  }

  /** Whether the straight segment between two points crosses a station. */
  function segmentBlocked(from, to) {
    for (let i = 0; i <= 24; i += 1) {
      const t = i / 24;
      if (pointBlocked(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t)) return true;
    }
    return false;
  }

  /**
   * The waypoints to a station: the clearest side to stand on, reached directly when the
   * way is open, otherwise down the aisle first. A straight walk can strand the chef
   * against a counter's corner, so the aisle leg keeps every station reachable.
   */
  function planRoute(from, station) {
    const candidates = approachCandidates(station).filter((p) => !pointBlocked(p.x, p.y));
    if (candidates.length === 0) return [];
    let best = null;
    let bestScore = Infinity;
    for (const candidate of candidates) {
      const distance = Math.hypot(candidate.x - from.x, candidate.y - from.y);
      const score = distance + (segmentBlocked(from, candidate) ? 150 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    if (!segmentBlocked(from, best)) return [best];
    const aisle = { x: Math.max(CHEF.radius, Math.min(1044, best.x)), y: AISLE_Y };
    return [aisle, best];
  }

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    walkTargets = [];
    walkStation = null;
    screen = SCREEN_PLAY;
    announce('Playing. Three hearts. Serve the orders before they walk out.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.coins > best) {
      best = world.state.coins;
      saveBest(best);
    }
    announce(`Time up. ${world.state.coins} coins, ${world.state.served} orders served. Best ${best}.`);
  }

  /**
   * Steer the chef toward the first waypoint; use the station once the last one is
   * reached. A waypoint the chef makes no progress toward for a second is dropped, so a
   * walk that cannot finish never strands him.
   */
  function walkSteering(dt) {
    if (walkTargets.length === 0) return { x: 0, y: 0, use: false };
    const chef = world.state.chef;
    const target = walkTargets[0];
    const dx = target.x - chef.x;
    const dy = target.y - chef.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 10) {
      walkTargets.shift();
      walkLastDistance = Infinity;
      walkStuckTime = 0;
      if (walkTargets.length === 0 && walkStation) {
        walkStation = null;
        return { x: 0, y: 0, use: true };
      }
      return { x: 0, y: 0, use: false };
    }
    if (distance > walkLastDistance - 0.5) {
      walkStuckTime += dt;
      if (walkStuckTime > 1.0) {
        walkTargets.shift();
        walkLastDistance = Infinity;
        walkStuckTime = 0;
        if (walkTargets.length === 0) walkStation = null;
        return { x: 0, y: 0, use: false };
      }
    } else {
      walkStuckTime = 0;
    }
    walkLastDistance = distance;
    return { x: dx / distance, y: dy / distance, use: false };
  }

  function handleInput(actions) {
    const click = input.takeClick();
    if (click && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
      return;
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
      return;
    }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    if (click) {
      const station = stationAt(click.x, click.y);
      if (station) {
        walkTargets = planRoute(world.state.chef, station);
        walkStation = walkTargets.length > 0 ? station : null;
      } else {
        walkTargets = [{ x: click.x, y: click.y }];
        walkStation = null;
      }
    }
    const held = input.heldDirection();
    if (held.x !== 0 || held.y !== 0) {
      walkTargets = [];
      walkStation = null;
    }
  }

  function step(usePressed) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, 0, 0, false, true);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const held = input.heldDirection();
    let moveX = held.x;
    let moveY = held.y;
    if (moveX === 0 && moveY === 0) {
      const walk = walkSteering(STEP);
      moveX = walk.x;
      moveY = walk.y;
      if (walk.use) usePressed = true;
    }
    const events = world.step(STEP, moveX, moveY, usePressed, false);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_SERVED) {
      announce(`Served! ${world.state.coins} coins.`);
    } else if (events & EVENT_EXPIRED) {
      announce(world.state.hearts === 1 ? 'Order walked out. 1 heart left.' : `Order walked out. ${world.state.hearts} hearts left.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // One-shot presses are taken once per frame: handleInput spends the screen changes,
    // and the use key is spent by the first simulation substep only, so one press of E
    // is never lost and never fires twice.
    const actions = input.takeActions();
    handleInput(actions);
    let useLeft = (actions & ACTION_USE) !== 0;
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(useLeft);
        useLeft = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting orders expire unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sushi Rush. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
