# Simulation Model Notes

This document defines the math and assumptions behind the laserweeder simulator.

## 1) Coordinate and unit model

- Scanner window size is fixed at `24 in x 20 in`.
- Window area in square feet:
  - `window_area_sqft = (24 * 20) / 144 = 3.333...`
- Density conversion:
  - `window_weeds = density_weeds_per_sqft * window_area_sqft`

Examples:

- `1 weeds/sq ft -> 3.33 weeds` expected in the window.
- `250 weeds/sq ft -> 833.33 weeds` expected in the window.

Square-foot banded-load reference metric:

- Uses a `12 in x 12 in` reference square foot.
- `banded_weeds_per_sqft = density * clamp(band_width / 12, 0, 1)`
- Example: `density=100`, `band=6 in` -> `50 banded weeds/sq ft` (`50%`).

## 2) Shoot-time model from weed size

Shoot time is not linear in size. The simulator uses anchored behavior:

- size `1 -> 25 ms`
- size `2 -> 30 ms`
- size `3 -> 40 ms`
- size `20 -> 250 ms`

Implementation:

1. Size `1..2`: linear interpolation from 25 to 30 ms.
2. Size `2..3`: linear interpolation from 30 to 40 ms.
3. Size `3..20`: nonlinear tail
   - `40 + (250 - 40) * ((size - 3) / 17)^1.2`

Why this design:

- It matches the stated anchor points exactly.
- It stays monotonic and stable.
- It avoids overfitting to unknown calibration data while preserving nonlinearity.

## 3) Time per target and scanner capacity

- `time_per_target_ms = shoot_time_ms + overhead_ms`
- Overhead is treated as average practical latency (including target-to-target travel and control overhead).

With two scanners:

- `capacity_targets_per_second = 2 * (1000 / time_per_target_ms)`

## 4) Raw speed and applied speed

Raw speed is the throughput-limited speed needed to keep up with target demand in the selected band.

- Demand per inch of travel:
  - `targets_per_inch = density * band_width / 144`
- Raw inches/sec:
  - `raw_ips = capacity_targets_per_second / targets_per_inch`
- Raw mph:
  - `raw_mph = raw_ips * 3600 / 63360`

Displayed/animated speed applies utilization scaling then cap:

- `headroom_mph = raw_mph * (utilization_percent / 100)`
- `applied_mph = min(headroom_mph, 3.0)`
- Cap note appears when `headroom_mph > 3.0`
- Utilization control range is `50%..120%` (default `99%`).

## 5) Inflow and simulation motion

- `applied_ips = applied_mph * 63360 / 3600`
- Target inflow:
  - `inflow_targets_per_second = density * band_width * applied_ips / 144`
- Weeds move top-to-bottom by:
  - `distance_in = applied_ips * delta_seconds`

## 6) Scanner zones and coverage math

Scanner bars partition/overlap the active band:

- Scanner A: band start to A-right bar.
- Scanner B: B-left bar to band end.
- UI slider values are preserved when band width changes; effective simulation ranges are clipped to band bounds.
- Default machine geometry uses two `20 in` scanners across a `24 in` combined width:
  - Scanner A default range `0..20 in`
  - Scanner B default range `4..24 in`
  - Default overlap `16 in`

Coverage metrics:

- `gap_in = max(0, B_left - A_right)`
- `overlap_in = max(0, A_right - B_left)`
- `covered_in = width_A + width_B - overlap_in`
- `coverage_ratio = covered_in / band_width`

Interpretation:

- Gap > 0 means there is unserviceable band area and unavoidable misses there.
- The simulator flags this in the UI.

## 7) Targeting behavior

Three targeting strategies are available:

- `bottom` (default): centerline + bottom fallback. Under overload, scanners prefer bottom-most targets near band center (crop line), then fall back to bottom-most across zone.
- `bottom-only`: pure bottom-most selection across zone.
- `midline`: scanner targets nearest to configured midline Y, but switches to bottom-most when targets exceed urgent threshold.

The `midline` strategy keeps the shot line centered while still protecting near-exit targets.

Overload-aware centerline protection for `bottom` policy:

- The center of the active band is treated as crop-line priority.
- When modeled load indicates overload (`inflow_targets_per_second > capacity_targets_per_second`), bottom policy first tries to service bottom-most targets inside a center window before falling back to the full zone.
- Center window width uses:
  - `center_priority_width_in = clamp(min_width + (overload_ratio - 1) * band_width * gain, min_width, band_width)`
  - defaults: `min_width=3 in`, `gain=0.5`, activation threshold `overload_ratio > 1.02`.
- This shifts expected misses outward (away from crop center) as overload increases.

Full-dose feasibility guard:

- Before target selection, candidates are filtered by required exit margin:
  - `minimum_exit_margin_in = applied_inches_per_second * (shoot_time_ms / 1000)`
  - candidate is targetable only when `(scan_height_in - y_in) >= minimum_exit_margin_in`
- This prevents selecting weeds that cannot receive a full dose before leaving the frame.

Partial-shot definition:

- `shot`: exits frame after receiving full required dose.
- `partial`: was targeted but exits frame before full dose was accumulated.
- `missed`: exits frame without being targeted.

## 8) Stability and limitations

What is stable in the current design:

- Deterministic math helpers are unit-tested.
- Speed is bounded by cap.
- Input changes reset runs for apples-to-apples UI validation.
- Coverage gaps are explicit, not hidden.

Current limitations (known and intentional):

- No per-scanner motion-path model.
- No target classification or confidence model.
- No deterministic random seed yet for replay.
- Run history/results are not persisted or exportable yet (only UI input defaults persist locally).

## 9) Visual scale mapping

Visual weed size uses physical-inch mapping inside the 24" x 20" window:

- `size 1` leaf length is anchored at `1/16"` (`0.0625 in`).
- `size 20` leaf length is anchored at `1.25"`.
- Intermediate values follow the normalized shoot-time curve, so visuals and timing move together.

Leaf-count relation:

- Broadleaf: `min(floor(size / 2) + 1, 5)`
- Grass: `min(floor(size / 4) + 1, 3)`

For UI readability, rendered plants are shown with a fixed `2x` visual magnification multiplier after physical sizing.
This keeps relative size semantics consistent while improving visibility.

## 10) Coverage data derived from speed

The Coverage Data tab is a planning view driven by the simulator's **applied speed**.

Planner inputs:

- Machine width (ft)
- Machine length (ft) for context display
- Field area (acres)
- Field shape (`square` or `circle`)
- Field efficiency (`80%` default, configurable)
- Selected paint time (`1.0 hr` default)

Coverage formulas:

- `travel_ft_per_hour = applied_mph * 5280`
- `raw_coverage_sqft_per_hour = travel_ft_per_hour * machine_width_ft`
- `effective_coverage_sqft_per_hour = raw_coverage_sqft_per_hour * (efficiency_percent / 100)`
- `effective_coverage_acres_per_hour = effective_coverage_sqft_per_hour / 43560`
- `time_to_cover_hours = field_area_sqft / effective_coverage_sqft_per_hour` (shown as `N/A` when speed is zero)
- `covered_sqft_at_selected_time = min(field_area_sqft, effective_coverage_sqft_per_hour * selected_hours)`

Pass painting model:

- The field is split into vertical passes with width equal to machine width.
- Square fields use constant pass area.
- Circle fields use true strip area from circle geometry.
- Coverage paint fills full passes first, then partially fills the active pass based on remaining covered area.

## 11) Throughput stability controls

The simulation applies a utilization target to raw speed before cap:

- `headroom_speed_mph = raw_speed_mph * (utilization_percent / 100)`
- `applied_speed_mph = min(headroom_speed_mph, speed_cap_mph)`

This reduces sustained operation at 100% service utilization, improving queue stability and hit-rate consistency.

Runtime observability metrics:

- Shot-line center (average shot Y)
- Average exit margin at shot time (seconds to frame exit when shot)
- Queue growth rate (`targets/sec`, EWMA)
- Per-scanner utilization (% of theoretical scanner service rate)

## 12) Pass Snapshot Recorder

- Recorder captures a 30-second simulation-time window (`30000 ms` limit).
- Stored per-event categories:
  - `shot` (full dose)
  - `partial` (dose incomplete at frame exit)
  - `missed` (never targeted)
- Each snapshot stores settings context:
  - density, weed size, band width, speed utilization, targeting policy, applied speed.
- History keeps recent snapshots in a scrollable list for side-by-side tuning review.
