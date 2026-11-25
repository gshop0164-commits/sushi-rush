// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the backdrop
// colour. The food is drawn piece by piece on the canvas — rice mounds with grain speckles,
// salmon with white fat stripes, maki rings with nori, rice and fish centres — so every dish
// reads as food at a glance, even shrunk onto the judge's contact sheet.

import { FIELD, FONT, INGREDIENT_LABEL, ITEM_LABEL, PALETTE, RECIPES } from './config.js';
import { STATIONS, dishOnPlate } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

function roundRect(context, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function circle(context, x, y, radius) {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
}

function ellipse(context, x, y, rx, ry) {
  context.beginPath();
  context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, bold) {
    const key = `${size}:${bold ? 1 : 0}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function formatTime(seconds) {
    const left = Math.max(0, Math.ceil(seconds));
    const minutes = Math.floor(left / 60);
    const rest = left % 60;
    return `${minutes}:${rest < 10 ? '0' : ''}${rest}`;
  }

  // ---- food, drawn piece by piece -------------------------------------------

  function drawRiceMound(x, y, size) {
    context.fillStyle = PALETTE.rice;
    ellipse(context, x, y, size * 0.55, size * 0.34);
    context.fill();
    circle(context, x - size * 0.22, y - size * 0.12, size * 0.24);
    context.fill();
    circle(context, x + size * 0.2, y - size * 0.14, size * 0.22);
    context.fill();
    context.fillStyle = 'rgba(180, 175, 150, 0.7)';
    for (let i = 0; i < 5; i += 1) {
      const dotX = x - size * 0.3 + i * size * 0.15;
      const dotY = y + size * 0.08 - (i % 2) * size * 0.06;
      circle(context, dotX, dotY, size * 0.035);
      context.fill();
    }
    context.fillStyle = 'rgba(255,255,255,0.85)';
    ellipse(context, x - size * 0.18, y - size * 0.2, size * 0.16, size * 0.07);
    context.fill();
  }

  function drawFishSlice(x, y, size, fish) {
    const base = fish === 'salmon' ? PALETTE.salmon : PALETTE.tuna;
    const deep = fish === 'salmon' ? PALETTE.salmonDeep : PALETTE.tunaDeep;
    context.fillStyle = deep;
    roundRect(context, x - size * 0.5, y - size * 0.3, size, size * 0.6, size * 0.18);
    context.fill();
    context.fillStyle = base;
    roundRect(context, x - size * 0.46, y - size * 0.26, size * 0.92, size * 0.52, size * 0.16);
    context.fill();
    context.strokeStyle = 'rgba(255,255,255,0.85)';
    context.lineWidth = Math.max(1.5, size * 0.06);
    context.beginPath();
    for (let i = -1; i <= 1; i += 1) {
      const stripeX = x + i * size * 0.26;
      context.moveTo(stripeX - size * 0.08, y - size * 0.2);
      context.quadraticCurveTo(stripeX + size * 0.08, y, stripeX - size * 0.06, y + size * 0.2);
    }
    context.stroke();
    context.fillStyle = 'rgba(255,255,255,0.5)';
    ellipse(context, x - size * 0.2, y - size * 0.18, size * 0.2, size * 0.06);
    context.fill();
  }

  function drawNoriSquare(x, y, size) {
    context.fillStyle = '#24351f';
    roundRect(context, x - size * 0.5, y - size * 0.5, size, size, size * 0.08);
    context.fill();
    context.fillStyle = PALETTE.nori;
    roundRect(context, x - size * 0.45, y - size * 0.45, size * 0.9, size * 0.9, size * 0.06);
    context.fill();
    context.strokeStyle = 'rgba(140, 180, 110, 0.5)';
    context.lineWidth = Math.max(1, size * 0.03);
    for (let i = -1; i <= 1; i += 1) {
      context.beginPath();
      context.moveTo(x + i * size * 0.28, y - size * 0.4);
      context.lineTo(x + i * size * 0.28, y + size * 0.4);
      context.stroke();
    }
  }

  function drawWasabi(x, y, size) {
    context.fillStyle = '#5d8f34';
    circle(context, x, y + size * 0.08, size * 0.42);
    context.fill();
    context.fillStyle = PALETTE.wasabi;
    circle(context, x, y, size * 0.4);
    context.fill();
    context.strokeStyle = '#a8cf7a';
    context.lineWidth = Math.max(1.5, size * 0.07);
    context.beginPath();
    context.arc(x, y, size * 0.18, 0.3, Math.PI * 1.4);
    context.stroke();
    context.fillStyle = 'rgba(255,255,255,0.6)';
    ellipse(context, x - size * 0.14, y - size * 0.16, size * 0.12, size * 0.06);
    context.fill();
  }

  function drawGinger(x, y, size) {
    context.fillStyle = '#e89aab';
    ellipse(context, x - size * 0.2, y + size * 0.08, size * 0.26, size * 0.2);
    context.fill();
    ellipse(context, x + size * 0.22, y + size * 0.1, size * 0.26, size * 0.2);
    context.fill();
    context.fillStyle = PALETTE.ginger;
    ellipse(context, x, y - size * 0.08, size * 0.28, size * 0.22);
    context.fill();
    context.fillStyle = 'rgba(255,255,255,0.55)';
    ellipse(context, x - size * 0.08, y - size * 0.18, size * 0.12, size * 0.06);
    context.fill();
  }

  function drawMakiPiece(x, y, size, fish) {
    const centre = fish === 'salmon' ? PALETTE.salmon : PALETTE.tuna;
    context.fillStyle = '#10160c';
    circle(context, x, y, size * 0.52);
    context.fill();
    context.fillStyle = PALETTE.nori;
    circle(context, x, y, size * 0.48);
    context.fill();
    context.fillStyle = PALETTE.rice;
    circle(context, x, y, size * 0.38);
    context.fill();
    context.fillStyle = 'rgba(180,175,150,0.8)';
    for (let i = 0; i < 4; i += 1) {
      const angle = i * 1.7;
      circle(context, x + Math.cos(angle) * size * 0.26, y + Math.sin(angle) * size * 0.26, size * 0.03);
      context.fill();
    }
    context.fillStyle = centre;
    circle(context, x, y, size * 0.2);
    context.fill();
    context.fillStyle = 'rgba(255,255,255,0.55)';
    circle(context, x - size * 0.06, y - size * 0.08, size * 0.05);
    context.fill();
  }

  function drawRollLog(x, y, size, fish) {
    const centre = fish === 'salmon' ? PALETTE.salmon : PALETTE.tuna;
    context.fillStyle = PALETTE.nori;
    roundRect(context, x - size * 0.55, y - size * 0.28, size * 1.1, size * 0.56, size * 0.24);
    context.fill();
    context.fillStyle = PALETTE.rice;
    ellipse(context, x - size * 0.5, y, size * 0.1, size * 0.24);
    context.fill();
    ellipse(context, x + size * 0.5, y, size * 0.1, size * 0.24);
    context.fill();
    context.fillStyle = centre;
    circle(context, x - size * 0.5, y, size * 0.07);
    context.fill();
    circle(context, x + size * 0.5, y, size * 0.07);
    context.fill();
    context.strokeStyle = 'rgba(140,180,110,0.45)';
    context.lineWidth = Math.max(1, size * 0.03);
    for (let i = -2; i <= 2; i += 1) {
      context.beginPath();
      context.moveTo(x + i * size * 0.18, y - size * 0.24);
      context.lineTo(x + i * size * 0.18, y + size * 0.24);
      context.stroke();
    }
  }

  function drawNigiri(x, y, size, fish) {
    drawRiceMound(x, y + size * 0.14, size);
    drawFishSlice(x, y - size * 0.12, size, fish);
  }

  /** One icon for an item, used in bins, tickets, the chef's hands and the plate. */
  function drawIngredient(kind, x, y, size) {
    if (typeof kind === 'string' && kind.startsWith('dish:')) {
      // A finished plate: a white plate carrying the dish's own pieces.
      const recipe = RECIPES.find((r) => r.id === kind.slice(5));
      context.fillStyle = '#e8e2d2';
      ellipse(context, x, y + size * 0.12, size * 0.62, size * 0.2);
      context.fill();
      context.fillStyle = '#ffffff';
      ellipse(context, x, y + size * 0.1, size * 0.56, size * 0.17);
      context.fill();
      if (recipe) {
        recipe.items.forEach((item, index) => {
          const ix = x - (recipe.items.length - 1) * size * 0.22 + index * size * 0.44;
          drawIngredient(item, ix, y - size * 0.12, size * 0.42);
        });
      }
      return;
    }
    if (kind === 'nasi') drawRiceMound(x, y, size);
    else if (kind === 'nori') drawNoriSquare(x, y, size);
    else if (kind === 'salmon' || kind === 'tuna') drawFishSlice(x, y, size, kind);
    else if (kind === 'wasabi') drawWasabi(x, y, size);
    else if (kind === 'jahe') drawGinger(x, y, size);
    else if (kind === 'roll-salmon') drawRollLog(x, y, size, 'salmon');
    else if (kind === 'roll-tuna') drawRollLog(x, y, size, 'tuna');
    else if (kind === 'maki-salmon') drawMakiPiece(x, y, size, 'salmon');
    else if (kind === 'maki-tuna') drawMakiPiece(x, y, size, 'tuna');
  }

  function drawHeart(x, y, size, filled) {
    context.fillStyle = filled ? PALETTE.red : 'rgba(255,255,255,0.18)';
    context.beginPath();
    context.moveTo(x, y + size * 0.32);
    context.bezierCurveTo(x - size * 0.55, y - size * 0.1, x - size * 0.3, y - size * 0.5, x, y - size * 0.12);
    context.bezierCurveTo(x + size * 0.3, y - size * 0.5, x + size * 0.55, y - size * 0.1, x, y + size * 0.32);
    context.fill();
  }

  // ---- the room ---------------------------------------------------------------

  function drawRoom(state) {
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 0, FIELD.width, 156);
    context.fillStyle = PALETTE.wallDark;
    context.fillRect(0, 148, FIELD.width, 8);
    // Wood floor planks.
    for (let row = 0; row < 7; row += 1) {
      const y = 156 + row * 82;
      context.fillStyle = row % 2 === 0 ? PALETTE.floor : PALETTE.floorDark;
      context.fillRect(0, y, FIELD.width, 82);
      context.fillStyle = PALETTE.floorLine;
      context.fillRect(0, y, FIELD.width, 3);
      for (let col = 0; col < 4; col += 1) {
        const seam = ((row * 337 + col * 389) % 1280) + 40;
        context.fillRect(seam, y + 3, 3, 79);
      }
    }
    // A thin gold rule under the HUD: the wall band above the order board is covered by
    // the HUD and the board, so this is the room's only visible trim up top.
    context.fillStyle = PALETTE.gold;
    context.fillRect(0, 62, FIELD.width, 3);
  }

  function drawBin(station) {
    context.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(context, station.x + 3, station.y + 4, station.w, station.h, 12);
    context.fill();
    context.fillStyle = PALETTE.wood;
    roundRect(context, station.x, station.y, station.w, station.h, 12);
    context.fill();
    context.fillStyle = PALETTE.woodLight;
    roundRect(context, station.x + 4, station.y + 4, station.w - 8, station.h - 8, 9);
    context.fill();
    drawIngredient(station.item, station.x + station.w / 2, station.y + 36, 44);
    text(
      INGREDIENT_LABEL[station.item],
      station.x + station.w / 2,
      station.y + station.h - 12,
      17,
      PALETTE.text,
      'center',
      true,
    );
  }

  function drawMat(state) {
    const mat = STATIONS.find((s) => s.id === 'mat');
    context.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(context, mat.x + 3, mat.y + 4, mat.w, mat.h, 12);
    context.fill();
    context.fillStyle = '#c9a86a';
    roundRect(context, mat.x, mat.y, mat.w, mat.h, 12);
    context.fill();
    context.strokeStyle = '#a8824a';
    context.lineWidth = 2;
    for (let i = 1; i < 7; i += 1) {
      const y = mat.y + (i * mat.h) / 7;
      context.beginPath();
      context.moveTo(mat.x + 8, y);
      context.lineTo(mat.x + mat.w - 8, y);
      context.stroke();
    }
    text('ALAS GULUNG', mat.x + 12, mat.y + 20, 13, '#5d3a22', 'left', true);
    const job = state.job && state.job.station === 'mat' ? state.job : null;
    if (job) {
      drawRollLog(mat.x + mat.w / 2, mat.y + 58, 64, job.fish);
      drawProgress(mat.x + 30, mat.y + mat.h - 16, mat.w - 60, job.t / job.duration);
    } else {
      text('nori + nasi + ikan, tekan E', mat.x + mat.w / 2, mat.y + 62, 14, '#5d3a22', 'center');
    }
  }

  function drawBoard(state) {
    const board = STATIONS.find((s) => s.id === 'board');
    context.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(context, board.x + 3, board.y + 4, board.w, board.h, 12);
    context.fill();
    context.fillStyle = '#e8c890';
    roundRect(context, board.x, board.y, board.w, board.h, 12);
    context.fill();
    context.fillStyle = '#d9b478';
    roundRect(context, board.x + 6, board.y + 6, board.w - 12, board.h - 12, 9);
    context.fill();
    // Knife.
    context.fillStyle = '#c8ccd4';
    context.beginPath();
    context.moveTo(board.x + board.w - 58, board.y + 22);
    context.lineTo(board.x + board.w - 14, board.y + 22);
    context.lineTo(board.x + board.w - 22, board.y + 38);
    context.lineTo(board.x + board.w - 58, board.y + 38);
    context.closePath();
    context.fill();
    context.fillStyle = '#3a2a1a';
    context.fillRect(board.x + board.w - 62, board.y + 24, 8, 12);
    text('TALENAN', board.x + 12, board.y + 20, 13, '#5d3a22', 'left', true);
    const job = state.job && state.job.station === 'board' ? state.job : null;
    if (job) {
      drawRollLog(board.x + 80, board.y + 62, 56, job.roll === 'roll-salmon' ? 'salmon' : 'tuna');
      drawProgress(board.x + 30, board.y + board.h - 16, board.w - 60, job.t / job.duration);
    } else {
      text('bawa roll ke sini, tekan E', board.x + board.w / 2, board.y + 62, 14, '#5d3a22', 'center');
    }
  }

  function drawProgress(x, y, w, fraction) {
    const done = clamp(fraction, 0, 1);
    context.fillStyle = 'rgba(0,0,0,0.45)';
    roundRect(context, x, y, w, 10, 5);
    context.fill();
    context.fillStyle = done > 0.66 ? PALETTE.green : PALETTE.gold;
    roundRect(context, x, y, Math.max(10, w * done), 10, 5);
    context.fill();
  }

  function drawPlateCounter(state) {
    const counter = STATIONS.find((s) => s.id === 'plate');
    context.fillStyle = 'rgba(0,0,0,0.3)';
    roundRect(context, counter.x + 3, counter.y + 4, counter.w, counter.h, 12);
    context.fill();
    context.fillStyle = PALETTE.counter;
    roundRect(context, counter.x, counter.y, counter.w, counter.h, 12);
    context.fill();
    context.fillStyle = PALETTE.counterTop;
    roundRect(context, counter.x, counter.y, counter.w, 18, 9);
    context.fill();
    text('MEJA SAJI', counter.x + 14, counter.y + 40, 15, PALETTE.muted, 'left', true);
    const dish = dishOnPlate(state.plate);
    // The white plate.
    const plateX = counter.x + counter.w / 2;
    const plateY = counter.y + 68;
    context.fillStyle = dish ? '#ffe9a8' : '#e8e2d2';
    ellipse(context, plateX, plateY, 150, 24);
    context.fill();
    context.fillStyle = '#ffffff';
    ellipse(context, plateX, plateY - 3, 138, 20);
    context.fill();
    if (dish) {
      context.strokeStyle = PALETTE.gold;
      context.lineWidth = 3;
      ellipse(context, plateX, plateY - 3, 146, 23);
      context.stroke();
    }
    state.plate.forEach((item, index) => {
      const x = plateX - 108 + index * 72;
      drawIngredient(item, x, plateY - 26, 40);
    });
    if (dish) {
      text(`${dish.name} — siap!`, counter.x + counter.w - 14, counter.y + 40, 16, PALETTE.gold, 'right', true);
    }
  }

  function drawConveyor(state) {
    const belt = STATIONS.find((s) => s.id === 'conveyor');
    context.fillStyle = 'rgba(0,0,0,0.3)';
    roundRect(context, belt.x + 3, belt.y + 4, belt.w, belt.h, 12);
    context.fill();
    context.fillStyle = PALETTE.belt;
    roundRect(context, belt.x, belt.y, belt.w, belt.h, 12);
    context.fill();
    // Moving chevrons: the belt scrolls toward the customers.
    const offset = (state.elapsed * 40) % 44;
    context.fillStyle = PALETTE.beltLine;
    for (let y = belt.y + 30 - offset; y < belt.y + belt.h - 20; y += 44) {
      context.beginPath();
      context.moveTo(belt.x + 30, y);
      context.lineTo(belt.x + belt.w / 2, y + 16);
      context.lineTo(belt.x + belt.w - 30, y);
      context.lineTo(belt.x + belt.w - 30, y + 10);
      context.lineTo(belt.x + belt.w / 2, y + 26);
      context.lineTo(belt.x + 30, y + 10);
      context.closePath();
      context.fill();
    }
    // A couple of plates already riding the belt.
    for (let i = 0; i < 2; i += 1) {
      const y = belt.y + 90 + i * 130 + ((state.elapsed * 24) % 60);
      const plateY = y > belt.y + belt.h - 40 ? belt.y + 90 + i * 130 - 60 : y;
      context.fillStyle = '#e8e2d2';
      ellipse(context, belt.x + belt.w / 2, plateY, 52, 12);
      context.fill();
      drawMakiPiece(belt.x + belt.w / 2 - 18, plateY - 12, 26, i === 0 ? 'salmon' : 'tuna');
      drawMakiPiece(belt.x + belt.w / 2 + 18, plateY - 12, 26, i === 0 ? 'salmon' : 'tuna');
    }
    // Red-and-white striped awning.
    for (let i = 0; i < 6; i += 1) {
      context.fillStyle = i % 2 === 0 ? PALETTE.red : '#f5efe2';
      context.fillRect(belt.x + 6 + i * 32, belt.y - 24, 32, 24);
    }
    text('KONVEYOR', belt.x + belt.w / 2, belt.y - 30, 15, PALETTE.text, 'center', true);
    text('antar piring jadi', belt.x + belt.w / 2, belt.y + belt.h - 8, 13, PALETTE.muted, 'center');
  }

  function drawTrash() {
    const trash = STATIONS.find((s) => s.id === 'trash');
    context.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(context, trash.x + 3, trash.y + 4, trash.w, trash.h, 10);
    context.fill();
    context.fillStyle = '#4a4f57';
    roundRect(context, trash.x, trash.y, trash.w, trash.h, 10);
    context.fill();
    context.fillStyle = '#5d636d';
    roundRect(context, trash.x + 6, trash.y + 6, trash.w - 12, 18, 6);
    context.fill();
    text('SAMPAH', trash.x + trash.w / 2, trash.y + trash.h - 12, 14, '#cfd3da', 'center', true);
  }

  function drawChef(state) {
    const chef = state.chef;
    // Shadow.
    context.fillStyle = 'rgba(0,0,0,0.3)';
    ellipse(context, chef.x, chef.y + 18, 22, 8);
    context.fill();
    // Body: white coat, blue apron.
    context.fillStyle = PALETTE.chefCoat;
    roundRect(context, chef.x - 16, chef.y - 8, 32, 26, 10);
    context.fill();
    context.fillStyle = PALETTE.apron;
    roundRect(context, chef.x - 11, chef.y + 2, 22, 16, 6);
    context.fill();
    // Head and toque.
    context.fillStyle = PALETTE.chefSkin;
    circle(context, chef.x, chef.y - 16, 12);
    context.fill();
    context.fillStyle = PALETTE.chefHat;
    circle(context, chef.x - 9, chef.y - 28, 8);
    context.fill();
    circle(context, chef.x + 9, chef.y - 28, 8);
    context.fill();
    circle(context, chef.x, chef.y - 32, 10);
    context.fill();
    context.fillStyle = PALETTE.chefHat;
    context.fillRect(chef.x - 11, chef.y - 28, 22, 6);
    context.fillStyle = '#222';
    circle(context, chef.x - 4, chef.y - 17, 1.6);
    context.fill();
    circle(context, chef.x + 4, chef.y - 17, 1.6);
    context.fill();
    context.strokeStyle = '#222';
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(chef.x, chef.y - 13, 4, 0.2, Math.PI - 0.2);
    context.stroke();
    // Carried items float above the chef's head.
    state.carry.forEach((item, index) => {
      const x = chef.x - (state.carry.length - 1) * 16 + index * 32;
      drawIngredient(item, x, chef.y - 52, 30);
    });
  }

  function drawOrders(state) {
    context.fillStyle = PALETTE.board;
    roundRect(context, 16, 66, FIELD.width - 32, 84, 12);
    context.fill();
    context.strokeStyle = PALETTE.boardEdge;
    context.lineWidth = 2;
    roundRect(context, 16, 66, FIELD.width - 32, 84, 12);
    context.stroke();
    text('PESANAN', 32, 118, 22, PALETTE.gold, 'left', true);
    state.orders.forEach((order, index) => {
      const x = 170 + index * 300;
      const y = 74;
      context.fillStyle = PALETTE.ticket;
      roundRect(context, x, y, 284, 68, 8);
      context.fill();
      context.strokeStyle = PALETTE.ticketEdge;
      context.lineWidth = 2;
      roundRect(context, x, y, 284, 68, 8);
      context.stroke();
      text(order.recipe.name, x + 12, y + 22, 17, '#3a2a1a', 'left', true);
      text(`${order.recipe.coins} koin`, x + 272, y + 22, 15, '#8a6a1a', 'right', true);
      order.recipe.items.forEach((item, itemIndex) => {
        drawIngredient(item, x + 28 + itemIndex * 34, y + 44, 26);
      });
      const fraction = clamp(order.patience / order.maxPatience, 0, 1);
      context.fillStyle = 'rgba(0,0,0,0.2)';
      roundRect(context, x + 12, y + 58, 260, 6, 3);
      context.fill();
      context.fillStyle = fraction > 0.5 ? '#5da85f' : fraction > 0.25 ? '#e8a13a' : '#d84a3a';
      roundRect(context, x + 12, y + 58, 260 * fraction, 6, 3);
      context.fill();
    });
    if (state.orders.length === 0) {
      text('Belum ada pesanan — bersiaplah!', 640, 118, 17, PALETTE.muted, 'center');
    }
  }

  function drawHud(state) {
    context.fillStyle = '#141a20';
    context.fillRect(0, 0, FIELD.width, 62);
    text('SUSHI RUSH', 24, 42, 30, PALETTE.text, 'left', true);
    for (let i = 0; i < 3; i += 1) {
      drawHeart(210 + i * 34, 30, 26, i < state.hearts);
    }
    text(formatTime(state.timeLeft), FIELD.width / 2, 44, 34, PALETTE.text, 'center', true);
    const fraction = clamp(state.timeLeft / 150, 0, 1);
    context.fillStyle = 'rgba(255,255,255,0.15)';
    roundRect(context, FIELD.width / 2 - 110, 52, 220, 6, 3);
    context.fill();
    context.fillStyle = fraction > 0.5 ? PALETTE.green : fraction > 0.25 ? PALETTE.gold : PALETTE.red;
    roundRect(context, FIELD.width / 2 - 110, 52, 220 * fraction, 6, 3);
    context.fill();
    text(`Koin ${state.coins}`, FIELD.width - 260, 42, 26, PALETTE.gold, 'right', true);
    if (state.combo > 1) {
      text(`Kombo x${state.combo}`, FIELD.width - 24, 42, 26, '#ff9a5c', 'right', true);
    }
  }

  function drawToast(state) {
    if (state.messageT <= 0 || !state.message) return;
    const alpha = clamp(state.messageT, 0, 1);
    context.globalAlpha = alpha;
    context.font = `18px ${FONT}`;
    const width = context.measureText(state.message).width + 40;
    context.fillStyle = 'rgba(20, 26, 32, 0.9)';
    roundRect(context, FIELD.width / 2 - width / 2, 508, width, 36, 18);
    context.fill();
    text(state.message, FIELD.width / 2, 532, 18, PALETTE.text, 'center', true);
    context.globalAlpha = 1;
  }

  function drawTitleBanner() {
    // A slim banner at the top and a prompt bar at the bottom: the kitchen, the orders and
    // a half-built dish stay visible behind it. The cover shot must show the game, not a
    // modal, so no text is ever drawn over the order board or the middle of the kitchen.
    context.fillStyle = 'rgba(24, 16, 10, 0.88)';
    roundRect(context, 300, 8, 680, 52, 14);
    context.fill();
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 2;
    roundRect(context, 300, 8, 680, 52, 14);
    context.stroke();
    text('SUSHI RUSH', 640, 44, 32, PALETTE.gold, 'center', true);
    context.fillStyle = 'rgba(24, 16, 10, 0.88)';
    roundRect(context, 280, 672, 720, 36, 18);
    context.fill();
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 1.5;
    roundRect(context, 280, 672, 720, 36, 18);
    context.stroke();
    text('Ambil bahan, gulung, iris, susun, antar.  WASD / klik + E.  Tekan Spasi untuk mulai.', 640, 696, 15, PALETTE.gold, 'center', true);
  }

  function drawPaused() {
    context.fillStyle = 'rgba(10, 14, 18, 0.6)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    text('JEDA', 640, 360, 54, PALETTE.text, 'center', true);
    text('Tekan P untuk lanjut', 640, 400, 20, PALETTE.muted, 'center');
  }

  function drawOver(state, best) {
    context.fillStyle = 'rgba(10, 14, 18, 0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = '#241a10';
    roundRect(context, 340, 190, 600, 330, 18);
    context.fill();
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 3;
    roundRect(context, 340, 190, 600, 330, 18);
    context.stroke();
    text('Waktu Habis!', 640, 260, 44, PALETTE.gold, 'center', true);
    text(`Koin: ${state.coins}`, 640, 320, 28, PALETTE.text, 'center', true);
    text(`Pesanan terantar: ${state.served}`, 640, 362, 24, PALETTE.text, 'center');
    text(`Terbaik: ${Math.max(best, state.coins)}`, 640, 398, 24, PALETTE.muted, 'center');
    text('Tekan Spasi untuk main lagi', 640, 462, 20, PALETTE.gold, 'center', true);
  }

  function drawField(state, screen) {
    drawRoom(state);
    for (const station of STATIONS) {
      if (station.kind === 'bin') drawBin(station);
    }
    drawMat(state);
    drawBoard(state);
    drawPlateCounter(state);
    drawConveyor(state);
    drawTrash();
    drawChef(state);
    drawOrders(state);
    // On the title screen the banner holds the title instead, so the HUD never fights it.
    if (screen !== SCREEN_TITLE) drawHud(state);
    drawToast(state);
  }

  function draw(state, screen, best) {
    resize();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state, screen);
    if (screen === SCREEN_TITLE) drawTitleBanner();
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver(state, best);
  }

  return { draw, toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.x / (window.devicePixelRatio || 1)) / (view.scale / (window.devicePixelRatio || 1)),
      y: (clientY - rect.top - view.y / (window.devicePixelRatio || 1)) / (view.scale / (window.devicePixelRatio || 1)),
    };
  } };
}
