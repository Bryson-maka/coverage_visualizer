export function createMetricsPresenter({ dom, state, core }) {
    function format(value, digits) {
        return Number(value).toFixed(digits);
    }

    function updateMetrics() {
        const activeTargets = state.weeds.filter((weed) => !weed.shot && weed.yIn >= 0 && weed.yIn <= core.SCAN_HEIGHT_IN).length;
        const queueDepth = activeTargets;
        const totalResolved = state.stats.shots + state.stats.missed;
        const hitRate = totalResolved > 0 ? (state.stats.shots / totalResolved) * 100 : 0;
        const density = Number(dom.densitySlider.value);
        const windowWeeds = core.weedsInWindow(density);

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

        const elapsedSeconds = state.stats.elapsedMs / 1000;
        const elapsedMinutes = elapsedSeconds / 60;
        const shotsPerSecond = elapsedSeconds > 0 ? state.stats.shots / elapsedSeconds : 0;
        const shotsPerMinute = shotsPerSecond * 60;

        dom.elapsedReadout.textContent = `${format(elapsedSeconds, 1)} s (${format(elapsedMinutes, 2)} min)`;
        dom.shotsPerSecondReadout.textContent = format(shotsPerSecond, 2);
        dom.shotsPerMinuteReadout.textContent = format(shotsPerMinute, 2);

        dom.rawSpeedReadout.textContent = format(state.model.rawSpeedMph, 2);
        dom.appliedSpeedReadout.textContent = format(state.model.appliedSpeedMph, 2);
        dom.shootTimeReadout.textContent = format(state.model.shootTimeMs, 2);
        dom.overheadReadout.textContent = format(Number(dom.overheadSlider.value), 2);
        dom.timePerTargetReadout.textContent = format(state.model.timePerTargetMs, 2);
        dom.scannerARangeReadout.textContent = `${format(state.zones.scannerA.start, 1)} - ${format(state.zones.scannerA.end, 1)}`;
        dom.scannerBRangeReadout.textContent = `${format(state.zones.scannerB.start, 1)} - ${format(state.zones.scannerB.end, 1)}`;
    }

    return {
        format,
        updateMetrics
    };
}
