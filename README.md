# Vice City Panels: multi-panel GTA 6 cover maker

[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Waiki96/gta6-cover-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Waiki96/gta6-cover-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Entry for the [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty on [make.fun](https://make.fun/r/fnhc8f0t) (referral code `fnhc8f0t`).

## What it does

Vice City Panels turns your photo and your words into cover art in the style of a GTA 6 poster — a multi-panel cover with bold lettering and a Vice City sunset or neon colour grade — and exports it as a PNG. It runs entirely offline in a desktop browser from its own static files; photos never leave your machine.

- **Multi-panel layouts** — single hero, hero + side, hero + two sides, four panels, and a diagonal split. Use several photos, or one photo across every panel.
- **Crop and position per panel** — zoom and move each panel's photo with sliders, or click a panel in the preview to select it.
- **Caption editing** — main title and subline, top or bottom placement, with the big outlined poster lettering fitted to the cover.
- **Colour grades** — Sunset, Neon, Dusk, or none, washed over the whole cover with a vignette.
- **One-click PNG export** — 1080 x 1080 (square post), 1080 x 1350 (portrait post), and 1920 x 1080 (wide), each rendered in well under a second.

## How to run it

```sh
node serve.ts
```

Then open <http://localhost:8080>. Pick a photo for each panel (or use the Pier / Boulevard samples), choose a layout and a grade, type your title, and hit one of the export buttons.

## How it works

- `app/index.html` — the editor page: layout chips, photo slots, crop sliders, caption fields, grade chips, export buttons.
- `app/style.css` — the editor's neon-dusk theme.
- `app/src/cover.js` — the renderer: panel geometry (rectangles and the diagonal polygon), cover-fit photo drawing with zoom and offsets, the colour-grade wash, and the outlined title lettering. The live preview and the exported PNG share this one code path.
- `app/src/main.js` — wires the controls to the renderer and the export buttons.
- `app/src/shots.js` — fixed scenes for screenshots (`?shot=cover`, `?shot=editor`, `?shot=export`).
- `app/samples/` — two sample photos (Pier, Boulevard), made with an image model for make.fun and free to use.

No Rockstar Games logo, official artwork, or fonts are used anywhere — the lettering is bold system sans-serif, and the sample photos are model-made. No accounts, no uploads, no network requests: the app is plain static files.

## License

MIT — see [LICENSE](LICENSE).
