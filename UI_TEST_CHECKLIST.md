# UI Validation Checklist

Use this checklist to validate simulator behavior in a browser before adding more features.

## Startup

- [ ] App loads without console errors.
- [ ] Scan window, controls, and metrics all render.
- [ ] `Applied Machine Speed` displays a numeric value.
- [ ] Metrics tabs switch between `Simulation` and `Coverage Data`.
- [ ] `Model Details` dropdown can be opened/closed.

## Control Ranges

- [ ] Density slider min/max is `1..250`.
- [ ] Band width slider min/max is `1..20` inches.
- [ ] Scanner bar sliders keep user-set positions when band width changes.
- [ ] Effective scanner ranges in `Model Details` reflect clipping to active band where needed.
- [ ] Overhead slider updates value label.
- [ ] Size slider updates shoot-time readout (nonlinear).

## Shoot-Time Profile Checks

- [ ] Size `1` shows shoot time `25.00 ms`.
- [ ] Size `2` shows shoot time `30.00 ms`.
- [ ] Size `3` shows shoot time `40.00 ms`.
- [ ] Size `20` shows shoot time `250.00 ms`.

## Simulation Controls

- [ ] `Run` starts target motion.
- [ ] `Pause` stops motion.
- [ ] `Reset` clears shots/misses/elapsed time.
- [ ] Changing any input auto-resets and pauses simulation.

## Speed + Cap Behavior

- [ ] Applied speed never exceeds `3.00 mph`.
- [ ] Cap note appears when raw speed is above cap.
- [ ] Raw modeled speed is visible in `Model Details`.

## Coverage Behavior

- [ ] Coverage ratio and gap values update when scanner bars move.
- [ ] Gap warning appears when scanner bars create uncovered space.
- [ ] Gap warning hides when scanner zones fully cover the band.

## Target Flow + Visuals

- [ ] Targets move top-to-bottom while running.
- [ ] Targets render as weed glyphs (not dots).
- [ ] Larger sizes visibly increase weed glyph scale.
- [ ] Shot targets flash red before fading.
- [ ] Using the 1-inch grid, size `1` leaves appear very small but readable (physical size with 2x display magnification).

## Throughput Metrics

- [ ] Shots per second increases while shots are being fired.
- [ ] Shots per minute tracks shots/sec x 60.

## Coverage Data Tab

- [ ] `Machine Size` shows `20.0 x 20.0` in.
- [ ] `Applied Travel Speed` increases when applied mph increases.
- [ ] `Machine Coverage Rate` and `Active Band Coverage` rise with speed.
- [ ] `Machine Coverage Rate` is greater than `Active Band Coverage` when band width < 20 in.
- [ ] Time-per-acre fields show `N/A` when applied speed is zero.

## Density Conversion Sanity

- [ ] `Expected in 20" x 20"` increases with density.
- [ ] At `1 weeds/sq ft`, expected window weeds is about `2.78`.
- [ ] At `250 weeds/sq ft`, expected window weeds is about `694.44`.
- [ ] At density `100` and band `6 in`, `Banded Weeds per sq ft` is `50.00` and share is `50.00%`.

## Suggested QA Scenarios

1. `Low Load`
   - Density `10`, band `10`, size `6`, overhead `40`.
   - Expect high hit rate and often capped speed.

2. `High Load`
   - Density `250`, band `20`, size `20`, overhead `150`.
   - Expect lower speed, rising misses, lower hit rate.

3. `Zone Gap`
   - Band `20`, Scanner A right `7`, Scanner B left `13`.
   - Expect coverage warning and increased misses.

4. `Zone Overlap`
   - Band `20`, Scanner A right `14`, Scanner B left `6`.
   - Expect overlap (no gap warning), higher service continuity.
