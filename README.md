# Laserweeder Module Simulator

Browser-based simulator for dual-scanner laserweeder throughput in a fixed `24 in x 20 in` scan window, plus field coverage planning from modeled speed.

Live URL: `https://bryson-maka.github.io/coverage_visualizer/`

## Core Features

- Simulation controls for weed density, weed size, band width, scanner bar ranges, overhead, and speed utilization.
- Targeting strategies:
  - `Midline + Urgent Fallback`
  - `Bottom-Most First`
- Runtime flow model:
  - Weeds move top-to-bottom in a 24" x 20" frame.
  - Dual scanners service targets within configured zones.
  - Shot/hit/miss and queue metrics update live.
- Speed modeling:
  - Raw modeled speed from load and scanner capacity.
  - Utilization headroom.
  - Applied speed cap at `3.0 mph`.
- Coverage planner tab:
  - Machine width/length, field size, field shape, efficiency, selected time.
  - Coverage rate, time-to-complete, pass progress, and painted field view.
- Persistent control defaults:
  - Each configurable field includes `Set Default`.
  - `Reset Saved Defaults` clears saved defaults and restores built-ins.

## Local Development

Requirements:

- Node.js `20+`
- npm
- Python `3` (or any static server)

Run:

```bash
cd coverage_visualizer
npm run ci
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Scripts

```bash
npm run ci      # syntax checks + unit tests
npm run check   # syntax checks (simulator-core + src modules)
npm test        # unit tests for deterministic core math
```

## Deployment (GitHub Pages)

This repo uses GitHub Actions Pages deployment via `.github/workflows/deploy-pages.yml`.

1. Push to `main`.
2. In repo settings, set **Pages -> Source** to **GitHub Actions**.
3. Wait for workflow `Deploy GitHub Pages` to complete.

## Project Layout

```text
.
├── index.html
├── styles.css
├── simulator-core.js
├── src/
│   ├── main.js
│   └── app/
│       ├── config.js
│       ├── core.js
│       ├── defaults.js
│       ├── dom.js
│       ├── engine.js
│       ├── metrics.js
│       ├── model.js
│       ├── render.js
│       └── state.js
├── test/
│   └── simulator-core.test.js
├── MODEL.md
└── UI_TEST_CHECKLIST.md
```

## Architecture Notes

- `simulator-core.js`: pure deterministic domain math (no DOM, unit-tested).
- `src/app/model.js`: derives simulation and coverage state from UI inputs.
- `src/app/engine.js`: simulation loop (spawn, move, target, shot lifecycle).
- `src/app/render.js`: scan window + coverage field SVG rendering.
- `src/app/metrics.js`: UI projection of runtime/model metrics.
- `src/app/defaults.js`: per-input default persistence and restore.
- `src/main.js`: composition + event wiring.

## Additional Docs

- `MODEL.md`: formulas, units, and modeling assumptions.
- `UI_TEST_CHECKLIST.md`: browser validation checklist.
