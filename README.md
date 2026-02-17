# Laserweeder Module Simulator

Browser-based simulator for dual-scanner laserweeder throughput in a 20" x 20" scan window.

## Requirements

- Node.js `20+`
- npm
- Python `3` (for a local static server)

## Quick Start

```bash
cd coverage_visualizer
npm run ci
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## What It Simulates

- Field density input: `1..250 weeds/sq ft`
- 20" x 20" scan window flow (targets move top-to-bottom)
- Configurable band width and dual scanner ranges
- Scanner sliders preserve configured values; effective ranges are clipped to active band for simulation math
- Bottom-up targeting policy per scanner zone
- Shoot-time model tied to weed size (nonlinear anchors)
- Speed model with applied cap at `3.0 mph`
- Coverage-gap detection and runtime performance metrics
- Coverage planner tab with machine size, field shape/area, configurable efficiency, and time-based pass painting

## Default Startup Settings

- Band width: `6.0 in`
- Scanner A right bar: `11.0 in`
- Scanner B left bar: `9.0 in`

## Project Structure

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
│       ├── dom.js
│       ├── engine.js
│       ├── metrics.js
│       ├── model.js
│       ├── render.js
│       └── state.js
├── test/
│   └── simulator-core.test.js
├── MODEL.md
├── UI_TEST_CHECKLIST.md
└── REFACTOR.md
```

## Architecture Notes

- `simulator-core.js`: deterministic domain math (unit-tested, no DOM)
- `src/app/model.js`: derives simulation model from UI inputs
- `src/app/engine.js`: timestep loop, spawning, targeting, lifecycle
- `src/app/render.js`: SVG grid, zones, and weed rendering
- `src/app/metrics.js`: metrics projection to UI
- `src/main.js`: composition and event wiring

## Commands

```bash
npm run ci      # check + tests
npm run check   # syntax checks (core + src modules)
npm test        # unit tests for core math/model behavior
```

## GitHub Pages Deployment

This repo now includes a Pages deployment workflow at `.github/workflows/deploy-pages.yml`.

1. Push commits to `main`.
2. In GitHub repo settings, set **Pages -> Source** to **GitHub Actions**.
3. Wait for the `Deploy GitHub Pages` workflow to finish.

Published URL:

- `https://bryson-maka.github.io/coverage_visualizer/`

## Reference Docs

- `MODEL.md`: formulas, units, and assumptions
- `UI_TEST_CHECKLIST.md`: browser validation checklist
- `REFACTOR.md`: implementation tracker and next backlog
