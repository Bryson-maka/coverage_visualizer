# Laserweeder Simulator Refactor Plan

This document tracks the refactor from a static visualizer into a stable, testable simulator aligned with the intended laserweeder concept.

## Objectives

- Convert the app to a 20" x 20" scan-window simulator with animated plant flow.
- Support field input from 1 to 250 weeds/sq ft and convert to expected weeds in the 20" x 20" window.
- Model dual-scanner targeting with configurable scanner range bars.
- Keep the model understandable with explicit shoot time and overhead settings.
- Cap displayed speed at 3.0 mph while exposing raw modeled speed in a clean details panel.
- Improve repository stability with deterministic core functions and automated checks.

## Execution Tracker

### Phase 1: Foundation and Scope Lock

- [x] Capture refined scope and constraints.
- [x] Define model assumptions: bottom-up targeting, two scanners, 20" x 20" window, configurable band width.
- [x] Define speed policy: raw modeled speed and applied capped speed.

### Phase 2: UI and UX Refactor

- [x] Replace field-centric UI with simulator-centric controls and 20" x 20" scan window.
- [x] Add controls for density (1..250), weed size, band width, scanner bars, and overhead.
- [x] Add Run/Pause/Reset controls.
- [x] Add clean model-details dropdown for raw speed and secondary metrics.

### Phase 3: Simulation Engine

- [x] Implement timestep loop with weeds moving top to bottom.
- [x] Spawn weeds based on density, band width, and traveled distance.
- [x] Implement bottom-up target selection policy per scanner zone.
- [x] Implement per-scanner cooldown using shoot time plus overhead.
- [x] Track outcomes (shots, misses, queue depth, active targets).

### Phase 4: Speed and Performance Modeling

- [x] Compute raw speed from scanner capacity and field load.
- [x] Apply 3.0 mph cap for displayed and animated speed.
- [x] Show cap indicator when raw speed exceeds cap.
- [x] Display raw speed in hidden details panel.

### Phase 5: Stabilization Improvements

- [x] Extract pure core-model helpers into `simulator-core.js`.
- [x] Add automated tests for conversions, speed model, cap logic, and targeting selection.
- [x] Add npm scripts for tests and syntax checks.
- [x] Add CI workflow for checks and tests on push/pull request.
- [x] Update README to reflect simulator behavior and new controls.
- [x] Add repo hygiene artifacts (`LICENSE`, `.editorconfig`, expanded `.gitignore`).
- [x] Add UI validation checklist and deterministic input-change reset behavior for stable QA runs.

## Remaining Backlog for Next Iteration

- [ ] Add calibration presets matching real module timing profiles.
- [ ] Add additional targeting strategies for comparison (for example nearest-first).
- [ ] Add replayable deterministic seeds for scenario comparison.
- [ ] Add export of run summary metrics (CSV/JSON).
- [ ] Add in-app scenario save/load.
- [ ] Add calibration mode for replacing estimated shoot-time anchors with measured field data.

## Acceptance Criteria for This Cut

- [x] Simulator animates targets from top to bottom in a 20" x 20" scan window.
- [x] Density supports 1..250 weeds/sq ft.
- [x] UI displays expected weeds in 20" x 20" from selected density.
- [x] Dual scanner coverage bars are user configurable and affect targeting.
- [x] Targeting order is bottom-up.
- [x] Speed display is capped at 3.0 mph and cap state is visible.
- [x] Raw speed is exposed in a collapsed details panel.
- [x] Core model has local automated tests.
- [x] Shoot time is tied to nonlinear size anchors (1=25, 2=30, 3=40, 20=250).
- [x] Weeds render as sized glyphs instead of dots for clearer visual interpretation.
- [x] Coverage gap/completeness is explicitly surfaced in UI metrics.
- [x] Visual size is physically anchored to scanner scale (size 1 leaf length = 1/16").
- [x] Added banded weeds/sq ft and band-share metrics for fast density-to-band validation.
