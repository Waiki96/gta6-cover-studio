// Hands the Vice City Panels entry to the make.fun scorer.
//
// The entry itself is the static web app in app/ (plain HTML, CSS and ES
// modules, no build step, no network calls): it runs offline from its own
// files in a desktop browser. This script only assembles the submission: it
// copies app/ and screenshots/ next to this file into the output directory
// and writes dossier.json there, the summary the judge reads, using the
// vendored make.fun library (vendor/makefun-app.ts).
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The scorer's own container instead uses /output as the destination.
//
// Serve the app to try it with:
//   node serve.ts
// then open http://localhost:8080

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps below mirror the scorer's gates: a submission is refused with
// more than 4 screenshots, any screenshot over 256 KiB, more than 993 files
// in app/, app/ over 48 MiB in total, or any app/ path over 1000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
