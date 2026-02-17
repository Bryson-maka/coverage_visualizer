export function createMetricsPresenter({ dom, state, core }) {
    function format(value, digits) {
        return Number(value).toFixed(digits);
    }

    function formatFinite(value, digits) {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric.toFixed(digits) : 'N/A';
    }

    function updateMetrics() {
        const activeTargets = state.weeds.filter(
            (weed) => !weed.shot &&
                weed.yIn >= 0 &&
                weed.yIn <= core.SCAN_HEIGHT_IN &&
                weed.xIn >= state.band.start &&
                weed.xIn <= state.band.end
        ).length;
        const queueDepth = activeTargets;
        const totalResolved = state.stats.shots + state.stats.missed;
        const hitRate = totalResolved > 0 ? (state.stats.shots / totalResolved) * 100 : 0;
        const density = Number(dom.densitySlider.value);
        const windowWeeds = core.weedsInWindow(density);
        const shotLineLabel = state.stats.shotSamples > 0
            ? format(state.stats.shotLineYMeanIn, 2)
            : 'N/A';
        const shotMarginLabel = state.stats.shotMarginSamples > 0
            ? format(state.stats.shotExitMarginMeanSec, 2)
            : 'N/A';

        dom.appliedSpeedMph.textContent = format(state.model.appliedSpeedMph, 2);
        dom.speedCapNote.classList.toggle('hidden', !state.model.isCapped);

        dom.densityReadout.textContent = format(density, 2);
        dom.bandedWeedsReadout.textContent = format(state.model.bandedWeedsPerSqFt, 2);
        dom.bandedShareReadout.textContent = format(state.model.bandedSharePercent, 2);
        dom.bandedShareFill.style.width = `${format(state.model.bandedSharePercent, 2)}%`;
        dom.windowWeedsReadout.textContent = format(windowWeeds, 2);
        dom.bandWidthReadout.textContent = format(state.band.width, 2);
        dom.coverageReadout.textContent = format(state.model.coverageRatio * 100, 2);
        dom.coverageGapReadout.textContent = format(state.model.coverageGapIn, 2);
        dom.coverageWarning.classList.toggle('hidden', !state.model.hasCoverageGap);

        dom.inflowReadout.textContent = format(state.model.inflowTargetsPerSecond, 2);
        dom.capacityReadout.textContent = format(state.model.capacityTargetsPerSecond, 2);
        dom.activeTargetsReadout.textContent = String(activeTargets);
        dom.queueDepthReadout.textContent = String(queueDepth);
        dom.shotsReadout.textContent = String(state.stats.shots);
        dom.missedReadout.textContent = String(state.stats.missed);
        dom.hitRateReadout.textContent = format(hitRate, 2);
        dom.shotLineReadout.textContent = shotLineLabel;
        dom.shotMarginReadout.textContent = shotMarginLabel;
        dom.queueGrowthReadout.textContent = format(state.stats.queueGrowthEwmaPerSec, 2);

        const elapsedSeconds = state.stats.elapsedMs / 1000;
        const elapsedMinutes = elapsedSeconds / 60;
        const shotsPerSecond = elapsedSeconds > 0 ? state.stats.shots / elapsedSeconds : 0;
        const shotsPerMinute = shotsPerSecond * 60;
        const scannerMaxShotsPerSecond = state.model.timePerTargetMs > 0
            ? 1000 / state.model.timePerTargetMs
            : 0;
        const scannerAShotsPerSecond = elapsedSeconds > 0
            ? state.scanners[0].shots / elapsedSeconds
            : 0;
        const scannerBShotsPerSecond = elapsedSeconds > 0
            ? state.scanners[1].shots / elapsedSeconds
            : 0;
        const scannerAUtilizationPercent = scannerMaxShotsPerSecond > 0
            ? (scannerAShotsPerSecond / scannerMaxShotsPerSecond) * 100
            : 0;
        const scannerBUtilizationPercent = scannerMaxShotsPerSecond > 0
            ? (scannerBShotsPerSecond / scannerMaxShotsPerSecond) * 100
            : 0;

        dom.elapsedReadout.textContent = `${format(elapsedSeconds, 1)} s (${format(elapsedMinutes, 2)} min)`;
        dom.shotsPerSecondReadout.textContent = format(shotsPerSecond, 2);
        dom.shotsPerMinuteReadout.textContent = format(shotsPerMinute, 2);
        dom.scannerAUtilReadout.textContent = format(scannerAUtilizationPercent, 2);
        dom.scannerBUtilReadout.textContent = format(scannerBUtilizationPercent, 2);

        dom.rawSpeedReadout.textContent = format(state.model.rawSpeedMph, 2);
        dom.utilizedSpeedReadout.textContent = format(state.model.utilizedRawSpeedMph, 2);
        dom.appliedSpeedReadout.textContent = format(state.model.appliedSpeedMph, 2);
        dom.utilizationTargetReadout.textContent = format(state.model.speedUtilizationPercent, 0);
        dom.shootTimeReadout.textContent = format(state.model.shootTimeMs, 2);
        dom.overheadReadout.textContent = format(Number(dom.overheadSlider.value), 2);
        dom.timePerTargetReadout.textContent = format(state.model.timePerTargetMs, 2);
        dom.targetingPolicyReadout.textContent = state.model.targetingPolicy;
        dom.targetMidlineReadout.textContent = format(state.model.targetMidlineYIn, 1);
        dom.targetUrgentReadout.textContent = format(state.model.targetUrgentYIn, 1);
        dom.scannerARangeReadout.textContent = `${format(state.zones.scannerA.start, 1)} - ${format(state.zones.scannerA.end, 1)}`;
        dom.scannerBRangeReadout.textContent = `${format(state.zones.scannerB.start, 1)} - ${format(state.zones.scannerB.end, 1)}`;

        const coverage = state.coverage;
        const activePassLabel = coverage.activePassNumber
            ? `${coverage.activePassNumber} (${format(coverage.activePassCoveragePercent, 1)}%)`
            : (coverage.completionPercent >= 100 ? 'Complete' : 'N/A');

        dom.coverageSpeedReadout.textContent = format(state.model.appliedSpeedMph, 2);
        dom.coverageTravelFpsReadout.textContent = format(coverage.travelFeetPerSecond, 2);
        dom.coverageRateSqFtHourReadout.textContent = format(coverage.coverageSqFtPerHour, 2);
        dom.coverageRateAcresHourReadout.textContent = format(coverage.coverageAcresPerHour, 3);
        dom.coverageFieldAreaReadout.textContent = format(coverage.fieldAreaAcres, 2);
        dom.coverageFieldWidthReadout.textContent = format(coverage.fieldWidthFt, 2);
        dom.coverageHoursToFinishReadout.textContent = formatFinite(coverage.timeToCoverHours, 2);
        dom.coverageCoveredAreaReadout.textContent = format(coverage.coveredAcres, 2);
        dom.coveragePercentReadout.textContent = format(coverage.completionPercent, 2);
        dom.coveragePassesReadout.textContent = `${coverage.completedPasses} / ${coverage.totalPasses}`;
        dom.coverageActivePassReadout.textContent = activePassLabel;

        dom.visualMachineSizeReadout.textContent = `${format(coverage.machineWidthFt, 1)} x ${format(coverage.machineLengthFt, 1)}`;
        dom.visualFieldReadout.textContent = `${format(coverage.fieldAreaAcres, 1)} ac ${coverage.fieldShapeLabel}`;
        dom.visualRateReadout.textContent = format(coverage.coverageAcresPerHour, 2);
        dom.visualCompletionReadout.textContent = format(coverage.completionPercent, 1);
    }

    return {
        format,
        updateMetrics
    };
}
