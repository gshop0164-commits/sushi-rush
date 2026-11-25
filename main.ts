// Sushi Rush, a best-cooking-game-20261125-0137 entry (Node 22, standard library only).
// The game is the plain static files in game/ beside this file: a desktop browser opens
// game/index.html and plays it offline, no build step and no network request. This program
// hands the game in. It copies game/ and screenshots/ from beside this file to /output and
// writes /output/dossier.json, the summary the judge reads, with the vendored make.fun
// library. Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The hand-in refuses to run when the entry is not in shape, so a broken hand-in never
// reaches the grader: the game page must exist, and there must be 3 or 4 screenshots, each
// a whole PNG or JPEG no bigger than 256 KiB.
const page = join(here, 'game', 'index.html');
if (!existsSync(page)) {
  throw new Error('refusing to hand in: game/index.html is missing');
}
const shotsDir = join(here, 'screenshots');
const shots = existsSync(shotsDir) ? readdirSync(shotsDir).filter((name) => !name.startsWith('.')) : [];
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`refusing to hand in: ${shots.length} screenshot(s), need 3 or 4`);
}
for (const name of shots) {
  const size = statSync(join(shotsDir, name)).size;
  if (size > 262144) throw new Error(`refusing to hand in: screenshots/${name} is ${size} bytes, over 256 KiB`);
  if (!/\.(png|jpe?g)$/i.test(name)) throw new Error(`refusing to hand in: screenshots/${name} is not a PNG or JPEG`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the
// others refuse an entry the scorer would refuse (more than 4 screenshots or one over
// 256 KiB; more than 993 files in game/ or 48 MiB of game files, in all, or a path under
// game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`handed in Sushi Rush: ${shots.length} screenshot(s), dossier written to ${join(out, 'dossier.json')}`);
