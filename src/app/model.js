export function createModelController({ core, dom, state, renderer, metrics, config }) {
    function getInputConfig() {
        return {
            densityPerSqFt: Number(dom.densitySlider.value),
            size: Number(dom.sizeSlider.value),
            bandWidthIn: Number(dom.bandWidthSlider.value),
            scannerARightIn: Number(dom.scannerAEndSlider.value),
            scannerBLeftIn: Number(dom.scannerBStartSlider.value),
            overheadMs: Number(dom.overheadSlider.value),
            machineWidthFt: Number(dom.machineWidthInput.value),
            machineLengthFt: Number(dom.machineLengthInput.value),
            fieldAreaAcres: Number(dom.fieldAreaInput.value),
            fieldShape: dom.fieldShapeSelect.value,
            efficiencyPercent: Number(dom.coverageEfficiencySlider.value),
            selectedCoverageHours: Number(dom.coverageHoursSlider.value)
        };
    }

    function syncControlReadouts(input, shootTimeMs) {
        const weedsInWindow = core.weedsInWindow(input.densityPerSqFt);

        dom.densityValue.textContent = metrics.format(input.densityPerSqFt, 0);
        dom.sizeValue.textContent = metrics.format(input.size, 0);
        dom.shootTimeValue.textContent = metrics.format(shootTimeMs, 2);
        dom.bandWidthValue.textContent = metrics.format(input.bandWidthIn, 1);
        dom.scannerAEndValue.textContent = metrics.format(input.scannerARightIn, 1);
        dom.scannerBStartValue.textContent = metrics.format(input.scannerBLeftIn, 1);
        dom.overheadValue.textContent = metrics.format(input.overheadMs, 0);
        dom.windowDensity.textContent = metrics.format(weedsInWindow, 2);
        dom.coverageEfficiencyValue.textContent = metrics.format(input.efficiencyPercent, 0);
        dom.coverageHoursValue.textContent = metrics.format(input.selectedCoverageHours, 1);
    }

    function recomputeModel() {
        const input = getInputConfig();

        state.band = core.getBandRange(input.bandWidthIn);

        const coverageMetrics = core.computeCoverageMetrics(
            state.band.start,
            state.band.end,
            input.scannerARightIn,
            input.scannerBLeftIn
        );
        state.zones = coverageMetrics.ranges;

        const shootTimeMs = core.computeShootTimeMs(input.size);
        const timePerTargetMs = core.computeTimePerTargetMs(shootTimeMs, input.overheadMs);
        const capacityTargetsPerSecond = core.computeCapacityTargetsPerSecond(state.scanners.length, timePerTargetMs);

        const rawSpeedMph = core.computeRawSpeedMph({
            densityPerSqFt: input.densityPerSqFt,
            bandWidthIn: state.band.width,
            scannerCount: state.scanners.length,
            timePerTargetMs
        });

        const appliedSpeed = core.computeAppliedSpeedMph(rawSpeedMph, config.SPEED_CAP_MPH);
        const inflowTargetsPerSecond = core.computeTargetFlowTargetsPerSecond(
            input.densityPerSqFt,
            state.band.width,
            appliedSpeed.appliedSpeedMph
        );
        const bandedLoad = core.computeBandedWeedLoadPerSqFt(input.densityPerSqFt, state.band.width);
        const coveragePlan = core.computeFieldCoveragePlan({
            speedMph: appliedSpeed.appliedSpeedMph,
            machineWidthFt: input.machineWidthFt,
            machineLengthFt: input.machineLengthFt,
            fieldAreaAcres: input.fieldAreaAcres,
            fieldShape: input.fieldShape,
            efficiencyPercent: input.efficiencyPercent,
            selectedHours: input.selectedCoverageHours
        });

        state.model = {
            shootTimeMs,
            timePerTargetMs,
            capacityTargetsPerSecond,
            rawSpeedMph: appliedSpeed.rawSpeedMph,
            appliedSpeedMph: appliedSpeed.appliedSpeedMph,
            appliedInchesPerSecond: core.mphToInchesPerSecond(appliedSpeed.appliedSpeedMph),
            inflowTargetsPerSecond,
            isCapped: appliedSpeed.isCapped,
            bandedWeedsPerSqFt: bandedLoad.bandedWeedsPerSqFt,
            bandedSharePercent: bandedLoad.bandPercent,
            coverageRatio: coverageMetrics.coverageRatio,
            coverageGapIn: coverageMetrics.gapWidthIn,
            hasCoverageGap: coverageMetrics.hasGap
        };
        state.coverage = coveragePlan;

        syncControlReadouts(input, shootTimeMs);
        renderer.renderStaticLayers();
        renderer.renderCoverageField();
        metrics.updateMetrics();
    }

    return {
        recomputeModel
    };
}
