# UI Validation Checklist

Use this checklist to validate simulator behavior in a browser before adding more features.

## Startup

- [ ] App loads without console errors.
- [ ] Scan window, controls, and metrics all render.
- [ ] `Run`, `Pause`, and `Reset` buttons are visible in the `Applied Machine Speed` card.
- [ ] `Record 30s Pass` button and recorder status are visible.
- [ ] `Applied Machine Speed` displays a numeric value.
- [ ] Metrics tabs switch between `Simulation` and `Coverage Data`.
- [ ] Left-panel control groups can be opened/closed.
- [ ] Metrics dropdown groups can be opened/closed.

## Control Ranges

- [ ] Density slider min/max is `1..250`.
- [ ] Band width slider min/max is `1..24` inches.
- [ ] Speed Utilization slider min/max is `50..120%`.
- [ ] Scanner bar sliders keep user-set positions when band width changes.
- [ ] Effective scanner ranges in `Model Details` reflect clipping to active band where needed.
- [ ] Overhead slider updates value label.
- [ ] Size slider updates shoot-time readout (nonlinear).
- [ ] Targeting policy switch updates `Model Details` policy readout.
- [ ] Targeting policies include `Centerline + Bottom Fallback`, `Midline + Urgent Fallback`, and `Bottom-Most Only`.
- [ ] Midline/Urgent sliders update labels and details readouts.

## Shoot-Time Profile Checks

- [ ] Size `1` shows shoot time `20.00 ms`.
- [ ] Size `2` shows shoot time `25.00 ms`.
- [ ] Size `3` shows shoot time `30.00 ms`.
- [ ] Size `4` shows shoot time `40.00 ms`.
- [ ] Size `5` shows shoot time `50.00 ms`.
- [ ] Size `20` shows shoot time `250.00 ms`.

## Simulation Controls

- [ ] `Run` starts target motion.
- [ ] `Pause` stops motion.
- [ ] `Reset` clears shots/misses/elapsed time.
- [ ] Changing any input auto-resets and pauses simulation.

## Saved Defaults

- [ ] Clicking any `Set Default` button shows a temporary saved state on that button.
- [ ] Reloading the page restores previously saved defaults.
- [ ] `Reset Saved Defaults` clears saved defaults and restores built-in defaults.

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
- [ ] Partially shot targets increases only when targeted weeds exit before full dose.
- [ ] Shot-line center remains near configured midline under moderate load.
- [ ] Queue growth rate trends toward zero or negative when utilization target is reduced.
- [ ] Scanner utilization values remain below `100%` with headroom enabled.
- [ ] Under overloaded bottom-policy operation (`Speed Utilization > 100%` where load exceeds capacity), misses appear farther from band center than centerline targets.

## Pass Snapshot Recorder

- [ ] Clicking `Record 30s Pass` toggles to `Stop Recording`.
- [ ] Recorder status shows remaining time while active.
- [ ] Recorder auto-stops after 30 seconds of simulation runtime.
- [ ] Snapshot cards appear in the scrollable history list.
- [ ] Snapshot card counts include `Shot`, `Partial`, and `Missed`.
- [ ] Snapshot cards include settings context (density, size, band, utilization, policy, speed).

## Coverage Data Tab

- [ ] Coverage tab displays machine width, field size, field shape, efficiency, and selected paint time controls.
- [ ] Default efficiency is `80%` and changing it updates coverage KPIs.
- [ ] Coverage rate (`sq ft/hr`, `acres/hr`) rises when applied speed or machine width increases.
- [ ] Time-to-full-coverage shows `N/A` when applied speed is zero.
- [ ] Switching field shape between square/circle updates the field boundary drawing.
- [ ] Selected paint time updates both completion KPI and pass-painted field map.
- [ ] Pass progress readout (`completed / total`, active pass) matches field painting state.

## Density Conversion Sanity

- [ ] `Expected in 24" x 20"` increases with density.
- [ ] At `1 weeds/sq ft`, expected window weeds is about `3.33`.
- [ ] At `250 weeds/sq ft`, expected window weeds is about `833.33`.
- [ ] At density `100` and band `6 in`, `Banded Share of weeds/sq ft` is `50.00%`.

## Suggested QA Scenarios

1. `Low Load`
   - Density `10`, band `10`, size `6`, overhead `40`.
   - Expect high hit rate and often capped speed.

2. `High Load`
   - Density `250`, band `20`, size `20`, overhead `150`.
   - Expect lower speed, rising misses, lower hit rate.

3. `Zone Gap`
   - Band `24`, Scanner A right `9`, Scanner B left `15`.
   - Expect coverage warning and increased misses.

4. `Zone Overlap`
   - Band `20`, Scanner A right `14`, Scanner B left `6`.
   - Expect overlap (no gap warning), higher service continuity.

5. `Centerline Priority Under Overload`
   - Targeting policy `Centerline + Bottom Fallback`, Band `24`, Speed Utilization `120%`.
   - Use a dense/high-load setup (e.g. density `250`, size `20`, overhead `150`).
   - Expect misses to concentrate near outer band edges while centerline targets are preferentially serviced.

6. `Bottom-Only Reference`
   - Switch targeting policy to `Bottom-Most Only` under the same load.
   - Expect more centerline misses than centerline-priority mode.
