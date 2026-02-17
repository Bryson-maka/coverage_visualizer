'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../simulator-core');

function near(actual, expected, tolerance = 1e-6) {
    assert.ok(Math.abs(actual - expected) <= tolerance, `Expected ${actual} to be within ${tolerance} of ${expected}`);
}

test('weedsInWindow converts weeds per sq ft to 20x20 window count', () => {
    near(core.weedsInWindow(1), 400 / 144);
    near(core.weedsInWindow(250), 250 * (400 / 144));
});

test('banded weed load per sq ft matches 12-inch reference expectation', () => {
    const load = core.computeBandedWeedLoadPerSqFt(100, 6);

    assert.equal(load.weedsPerSqFt, 100);
    assert.equal(load.bandedWeedsPerSqFt, 50);
    assert.equal(load.bandPercent, 50);
});

test('banded weed load per sq ft clamps to full coverage above 12 inches', () => {
    const load = core.computeBandedWeedLoadPerSqFt(100, 20);

    assert.equal(load.bandedWeedsPerSqFt, 100);
    assert.equal(load.bandPercent, 100);
});

test('nonlinear shoot-time profile matches anchor points', () => {
    assert.equal(core.computeShootTimeMs(1), 25);
    assert.equal(core.computeShootTimeMs(2), 30);
    assert.equal(core.computeShootTimeMs(3), 40);
    assert.equal(core.computeShootTimeMs(20), 250);
});

test('shoot-time profile is monotonic across size range', () => {
    let previous = core.computeShootTimeMs(1);

    for (let size = 2; size <= 20; size += 1) {
        const current = core.computeShootTimeMs(size);
        assert.ok(current > previous, `Expected size ${size} time ${current} to exceed prior ${previous}`);
        previous = current;
    }
});

test('visual leaf length is anchored at 1/16 inch for size 1 and monotonic', () => {
    near(core.computeLeafLengthIn(1), 1 / 16, 1e-12);
    near(core.computeLeafLengthIn(20), core.WEED_VISUAL_PROFILE.maxLeafLengthIn, 1e-12);

    let previous = core.computeLeafLengthIn(1);
    for (let size = 2; size <= 20; size += 1) {
        const current = core.computeLeafLengthIn(size);
        assert.ok(current > previous, `Expected size ${size} leaf length ${current} to exceed prior ${previous}`);
        previous = current;
    }
});

test('visual profile leaf count follows weed-type rules', () => {
    assert.equal(core.computeLeafCount(1, 'broadleaf'), 1);
    assert.equal(core.computeLeafCount(20, 'broadleaf'), 5);
    assert.equal(core.computeLeafCount(1, 'grass'), 1);
    assert.equal(core.computeLeafCount(20, 'grass'), 3);
});

test('timing helpers produce expected values', () => {
    assert.equal(core.computeTimePerTargetMs(180, 60), 240);
    near(core.computeCapacityTargetsPerSecond(2, 240), 8.3333333333, 1e-9);
});

test('speed model returns consistent raw speed', () => {
    const rawMph = core.computeRawSpeedMph({
        densityPerSqFt: 10,
        bandWidthIn: 20,
        scannerCount: 2,
        timePerTargetMs: 100
    });

    near(rawMph, 0.8181818181, 1e-6);
});

test('applied speed enforces cap and exposes cap state', () => {
    const capped = core.computeAppliedSpeedMph(4.5, 3.0);
    assert.equal(capped.appliedSpeedMph, 3.0);
    assert.equal(capped.isCapped, true);

    const uncapped = core.computeAppliedSpeedMph(2.2, 3.0);
    assert.equal(uncapped.appliedSpeedMph, 2.2);
    assert.equal(uncapped.isCapped, false);
});

test('coverage rates are derived from speed and widths', () => {
    const coverage = core.computeCoverageRates(3, 20, 6);

    near(coverage.scanAreaSqFt, 400 / 144, 1e-9);
    near(coverage.travelFeetPerSecond, 4.4, 1e-9);
    near(coverage.machineWidthFt, 20 / 12, 1e-9);
    near(coverage.bandWidthFt, 0.5, 1e-9);
    near(coverage.machineCoverageSqFtPerHour, 26400, 1e-9);
    near(coverage.machineCoverageAcresPerHour, 26400 / 43560, 1e-9);
    near(coverage.machineHoursPerAcre, 1.65, 1e-9);
    near(coverage.bandCoverageSqFtPerHour, 7920, 1e-9);
    near(coverage.bandCoverageAcresPerHour, 7920 / 43560, 1e-9);
    near(coverage.bandHoursPerAcre, 5.5, 1e-9);
});

test('coverage rates handle zero speed without NaN', () => {
    const coverage = core.computeCoverageRates(0, 20, 6);

    assert.equal(coverage.travelFeetPerSecond, 0);
    assert.equal(coverage.machineCoverageSqFtPerHour, 0);
    assert.equal(coverage.bandCoverageSqFtPerHour, 0);
    assert.equal(coverage.machineHoursPerAcre, Number.POSITIVE_INFINITY);
    assert.equal(coverage.bandHoursPerAcre, Number.POSITIVE_INFINITY);
});

test('field coverage plan computes rate, duration, and pass progress', () => {
    const plan = core.computeFieldCoveragePlan({
        speedMph: 3,
        machineWidthFt: 20,
        machineLengthFt: 25,
        fieldAreaAcres: 40,
        fieldShape: 'square',
        efficiencyPercent: 80,
        selectedHours: 1
    });

    near(plan.coverageAcresPerHour, 5.8181818181, 1e-6);
    near(plan.timeToCoverHours, 6.875, 1e-9);
    near(plan.coveredAcres, 5.8181818181, 1e-6);
    near(plan.completionPercent, 14.5454545454, 1e-6);
    assert.equal(plan.totalPasses, 66);
    assert.equal(plan.completedPasses, 9);
    assert.equal(plan.activePassNumber, 10);
    near(plan.activePassCoveragePercent, 60, 1e-9);
});

test('field coverage plan supports circle shape and zero speed', () => {
    const plan = core.computeFieldCoveragePlan({
        speedMph: 0,
        machineWidthFt: 18,
        machineLengthFt: 24,
        fieldAreaAcres: 25,
        fieldShape: 'circle',
        efficiencyPercent: 80,
        selectedHours: 1
    });

    assert.equal(plan.fieldShape, 'circle');
    assert.equal(plan.coverageSqFtPerHour, 0);
    assert.equal(plan.coveredSqFt, 0);
    assert.equal(plan.timeToCoverHours, Number.POSITIVE_INFINITY);
    assert.equal(plan.completedPasses, 0);
    assert.equal(plan.activePassNumber, null);
    assert.ok(plan.totalPasses > 0);
});

test('field coverage plan tracks partial circle pass paint width', () => {
    const plan = core.computeFieldCoveragePlan({
        speedMph: 3,
        machineWidthFt: 20,
        machineLengthFt: 24,
        fieldAreaAcres: 25,
        fieldShape: 'circle',
        efficiencyPercent: 80,
        selectedHours: 0.25
    });

    assert.ok(plan.activePassNumber !== null);
    const activePass = plan.passes[plan.activePassNumber - 1];
    assert.ok(activePass.coverageFraction > 0 && activePass.coverageFraction < 1);
    assert.ok(activePass.paintWidthFraction > 0 && activePass.paintWidthFraction < 1);
});

test('scanner range normalization respects band bounds', () => {
    const zones = core.normalizeScannerRanges(4, 16, 30, -2);

    assert.equal(zones.scannerA.start, 4);
    assert.equal(zones.scannerA.end, 16);
    assert.equal(zones.scannerB.start, 4);
    assert.equal(zones.scannerB.end, 16);
});

test('coverage metrics report gap and ratio correctly', () => {
    const metrics = core.computeCoverageMetrics(0, 20, 7, 13);

    near(metrics.coverageRatio, 0.7, 1e-9);
    assert.equal(metrics.gapWidthIn, 6);
    assert.equal(metrics.hasGap, true);
});

test('bottom-up selection picks the lowest visible target in zone', () => {
    const weeds = [
        { xIn: 6, yIn: 4, shot: false },
        { xIn: 6, yIn: 11, shot: false },
        { xIn: 14, yIn: 17, shot: false },
        { xIn: 6, yIn: 13, shot: true }
    ];

    const selected = core.selectBottomMostTarget(weeds, 5, 10);
    assert.equal(selected.yIn, 11);
});

test('midline policy selects target nearest to reference when no urgent targets exist', () => {
    const weeds = [
        { xIn: 8, yIn: 6.5, shot: false },
        { xIn: 8, yIn: 9.8, shot: false },
        { xIn: 8, yIn: 12.7, shot: false }
    ];

    const selected = core.selectTargetByPolicy(weeds, 5, 10, 'midline', 10, 16);
    near(selected.yIn, 9.8, 1e-9);
});

test('midline policy falls back to bottom-most for urgent targets', () => {
    const weeds = [
        { xIn: 8, yIn: 9.9, shot: false },
        { xIn: 8, yIn: 16.2, shot: false },
        { xIn: 8, yIn: 17.1, shot: false }
    ];

    const selected = core.selectTargetByPolicy(weeds, 5, 10, 'midline', 10, 16);
    near(selected.yIn, 17.1, 1e-9);
});

test('bottom policy matches bottom-most behavior', () => {
    const weeds = [
        { xIn: 8, yIn: 6.5, shot: false },
        { xIn: 8, yIn: 12.2, shot: false },
        { xIn: 8, yIn: 10.1, shot: false }
    ];

    const selected = core.selectTargetByPolicy(weeds, 5, 10, 'bottom', 10, 16);
    near(selected.yIn, 12.2, 1e-9);
});
