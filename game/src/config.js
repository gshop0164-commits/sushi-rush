// Every tuning number, colour and recipe in one place. The playfield is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** One shift lasts two and a half minutes. */
export const SHIFT_SECONDS = 150;

export const HEARTS = 3;

export const CHEF = {
  /** The chef's collision radius: small enough to slip around a counter's corner, so no
   * pocket of the kitchen is a trap he cannot walk out of. */
  radius: 16,
  speed: 310,
  /** How close the chef must be to a station's edge to use it. */
  reach: 46,
};

export const CARRY_MAX = 3;
export const PLATE_MAX = 4;

/** Seconds a serve still counts toward the combo after the previous one. */
export const COMBO_WINDOW = 25;

/** The six things on the ingredient wall. */
export const INGREDIENTS = ['nasi', 'nori', 'salmon', 'tuna', 'wasabi', 'jahe'];

export const INGREDIENT_LABEL = {
  nasi: 'Nasi',
  nori: 'Nori',
  salmon: 'Salmon',
  tuna: 'Tuna',
  wasabi: 'Wasabi',
  jahe: 'Jahe',
};

/** What a rolling job turns three carried items into, and what slicing turns a roll into. */
export const ROLL_TIME = 2.5;
export const SLICE_TIME = 1.5;
export const ROLL_OF = { salmon: 'roll-salmon', tuna: 'roll-tuna' };
export const PIECES_OF = { 'roll-salmon': 'maki-salmon', 'roll-tuna': 'maki-tuna' };

export const ITEM_LABEL = {
  nasi: 'Nasi',
  nori: 'Nori',
  salmon: 'Salmon',
  tuna: 'Tuna',
  wasabi: 'Wasabi',
  jahe: 'Jahe',
  'roll-salmon': 'Roll Salmon',
  'roll-tuna': 'Roll Tuna',
  'maki-salmon': 'Maki Salmon',
  'maki-tuna': 'Maki Tuna',
};

/**
 * The menu. A recipe is the exact multiset of items on the plate; order does not matter.
 * A dish made of a single kind of piece (two maki pieces) still needs the rolling and
 * slicing work first, so no order is free.
 */
export const RECIPES = [
  { id: 'salmon-nigiri', name: 'Salmon Nigiri', items: ['nasi', 'salmon'], coins: 14 },
  { id: 'tuna-nigiri', name: 'Tuna Nigiri', items: ['nasi', 'tuna'], coins: 14 },
  { id: 'salmon-maki', name: 'Salmon Maki', items: ['maki-salmon', 'maki-salmon'], coins: 18 },
  { id: 'tuna-maki', name: 'Tuna Maki', items: ['maki-tuna', 'maki-tuna'], coins: 18 },
  { id: 'maki-spesial', name: 'Maki Spesial', items: ['maki-salmon', 'maki-salmon', 'wasabi'], coins: 22 },
  {
    id: 'sushi-set',
    name: 'Set Sushi',
    items: ['maki-salmon', 'maki-tuna', 'wasabi', 'jahe'],
    coins: 26,
  },
];

/** Orders: at most this many tickets on the board at once. */
export const ORDER_MAX = 4;
/** Seconds between new orders at the start of a shift, and at the end. */
export const ORDER_INTERVAL = { start: 14, end: 7 };
/** Seconds an order waits before it walks out, at the start and at the end. */
export const ORDER_PATIENCE = { start: 52, end: 30 };

/** Speed bonus for serving an order with patience to spare, at most this many coins. */
export const SPEED_BONUS_MAX = 6;
/** Each combo step past the first adds this share of the dish price. */
export const COMBO_STEP = 0.25;

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'sushi-rush.best';

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const PALETTE = {
  backdrop: '#101820',
  wall: '#1d3a3a',
  wallDark: '#16302f',
  floor: '#8a6a45',
  floorDark: '#7d5f3d',
  floorLine: '#6b4f31',
  wood: '#5d3a22',
  woodLight: '#7a4e2e',
  counter: '#3a2a1a',
  counterTop: '#6b4a2b',
  board: '#241a10',
  boardEdge: '#4a3421',
  ticket: '#f7ead0',
  ticketEdge: '#c9a86a',
  text: '#f5efe2',
  muted: '#b8ab8d',
  red: '#d84a3a',
  redDark: '#a93226',
  green: '#7dc383',
  gold: '#f2c94c',
  cream: '#fff6e0',
  nori: '#1f2a1a',
  salmon: '#ff9a5c',
  salmonDeep: '#f27a35',
  tuna: '#d94f6a',
  tunaDeep: '#b23a52',
  rice: '#fffdf4',
  wasabi: '#7fae4c',
  ginger: '#f2b8c6',
  belt: '#2b2f36',
  beltLine: '#454b55',
  chefHat: '#ffffff',
  chefSkin: '#f2c297',
  chefCoat: '#f4f1e8',
  apron: '#2e6f8e',
};
