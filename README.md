# Vice Cover Studio

[![make.fun](https://make.fun/badge/competition/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun](https://make.fun/badge/entries/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun](https://make.fun/badge/prize/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn your own photos into GTA-style poster cover art — right in your browser, fully offline.

## What it does

Vice Cover Studio takes photos from your machine and turns them into a
multi-panel poster cover: bold caption lettering, a Vice City sunset or neon
colour grade, and the multi-panel look of the GTA posters — in an original
design, with no Rockstar logo, artwork, character or font.

- **Any photo**: add your own photos, or load the three bundled samples
  (made with an image model). Click a panel, then a photo, to place it; one
  photo can fill every panel, each cropped differently.
- **Crop and position**: drag a photo inside its panel to reposition it, and
  use the zoom slider to crop it tighter.
- **Three layouts**: Vice Grid (one hero panel + two stacked), Neon Trio
  (three vertical panels), Sunset Split (two panels).
- **Four colour grades**: Sunset, Neon Night, Vice Pastel, Mono Noir.
- **Caption**: write and edit the big caption and the small line under it,
  pick its size and colour.
- **Fast**: a photo to an exported PNG in a few clicks, in 1080 × 1080,
  1080 × 1350 or 1920 × 1080.

## Try it

Serve `app/` with any static server and open `index.html` — no build step,
no network requests. Every script, font and sample image is a file under
`app/`, and your photos are read on your own machine, never uploaded.

```sh
node serve.ts   # serves app/ at http://localhost:8080
```

The Anton display face is licensed under the SIL Open Font License
(see `app/fonts/OFL.txt`).

## How it is built

- `app/index.html` — the editor page.
- `app/styles.css` — the editor theme.
- `app/src/cover.js` — the poster renderer: layouts, colour grades, caption.
- `app/src/editor.js` — the editor: photos, panels, drag-to-crop, export.
- `app/src/shots.js` — deterministic screenshot mode (`?shot=cover` or
  `?shot=editor` with `photo`, `caption`, `layout`, `grade`, `size`).
- `app/src/main2.js` — bootstrap.
- `main.ts` — the entry program: copies `app/` and `screenshots/` to
  `/output` and writes `/output/dossier.json`.

## Contents

- [Photos](#)
- [Layout](#)
- [Colour grade](#)
- [Caption](#)
- [Export](#)

---

New here? Join make.fun with my link: https://make.fun/r/2s4v23h1

My referral code is `2s4v23h1`.
