export function createModelController({ core, dom, state, renderer, metrics, config }) {
    function getInputConfig() {
        return {
            densityPerSqFt: Number(dom.densitySlider.value),
            size: Number(dom.sizeSlider.value),
            bandWidthIn: Number(dom.bandWidthSlider.value),
            scannerARightIn: Number(dom.scannerAEndSlider.value),
            scannerBLeftIn: Number(dom.scannerBStartSlider.value),
            overheadMs: Number(dom.overheadSlider.value),
            speedUtilizationPercent: Number(dom.speedUtilizationSlider.value),
            targetingPolicy: dom.targetingPolicySelect.value,
            targetMidlineYIn: Number(dom.targetMidlineSlider.value),
            targetUrgentYIn: Number(dom.targetUrgentSlider.value),
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
        dom.speedUtilizationValue.textContent = metrics.format(input.speedUtilizationPercent, 0);
        dom.targetMidlineValue.textContent = metrics.format(input.targetMidlineYIn, 1);
        dom.targetUrgentValue.textContent = metrics.format(input.targetUrgentYIn, 1);
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

        const safeSpeedUtilizationPercent = core.clamp(input.speedUtilizationPercent, 50, 120);
        const speedUtilizationRatio = safeSpeedUtilizationPercent / 100;
        const safeTargetingPolicy = input.targetingPolicy === 'bottom' || input.targetingPolicy === 'bottom-only'
            ? input.targetingPolicy
            : 'midline';
        const safeTargetMidlineYIn = core.clamp(input.targetMidlineYIn, 0, core.SCAN_HEIGHT_IN);
        const safeTargetUrgentYIn = core.clamp(
            Math.max(input.targetUrgentYIn, safeTargetMidlineYIn + 0.1),
            0,
            core.SCAN_HEIGHT_IN
        );
        const normalizedInput = {
            ...input,
            speedUtilizationPercent: safeSpeedUtilizationPercent,
            targetingPolicy: safeTargetingPolicy,
            targetMidlineYIn: safeTargetMidlineYIn,
            targetUrgentYIn: safeTargetUrgentYIn
        };

        const utilizedRawSpeedMph = rawSpeedMph * speedUtilizationRatio;
        const appliedSpeed = core.computeAppliedSpeedMph(utilizedRawSpeedMph, config.SPEED_CAP_MPH);
        const inflowTargetsPerSecond = core.computeTargetFlowTargetsPerSecond(
            input.densityPerSqFt,
            state.band.width,
            appliedSpeed.appliedSpeedMph
        );
        const overloadRatio = capacityTargetsPerSecond > 0
            ? inflowTargetsPerSecond / capacityTargetsPerSecond
            : 0;
        const centerPriorityWidthIn = core.computeCenterPriorityWidthIn(
            state.band.width,
            overloadRatio,
            config.CENTER_PRIORITY_MIN_WIDTH_IN,
            config.CENTER_PRIORITY_OVERLOAD_GAIN
        );
        const centerPriorityActive = safeTargetingPolicy === 'bottom' &&
            overloadRatio > config.CENTER_PRIORITY_ACTIVATION_RATIO;
        const bandCenterXIn = (state.band.start + state.band.end) / 2;
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
            rawSpeedMph,
            utilizedRawSpeedMph,
            appliedSpeedMph: appliedSpeed.appliedSpeedMph,
            appliedInchesPerSecond: core.mphToInchesPerSecond(appliedSpeed.appliedSpeedMph),
            inflowTargetsPerSecond,
            isCapped: appliedSpeed.isCapped,
            bandedWeedsPerSqFt: bandedLoad.bandedWeedsPerSqFt,
            bandedSharePercent: bandedLoad.bandPercent,
            coverageRatio: coverageMetrics.coverageRatio,
            coverageGapIn: coverageMetrics.gapWidthIn,
            hasCoverageGap: coverageMetrics.hasGap,
            overloadRatio,
            centerPriorityActive,
            centerPriorityWidthIn,
            bandCenterXIn,
            speedUtilizationPercent: safeSpeedUtilizationPercent,
            targetingPolicy: safeTargetingPolicy,
            targetMidlineYIn: safeTargetMidlineYIn,
            targetUrgentYIn: safeTargetUrgentYIn
        };
        state.coverage = coveragePlan;

        dom.speedUtilizationSlider.value = String(safeSpeedUtilizationPercent);
        dom.targetMidlineSlider.value = safeTargetMidlineYIn.toFixed(1);
        dom.targetUrgentSlider.value = safeTargetUrgentYIn.toFixed(1);

        syncControlReadouts(normalizedInput, shootTimeMs);
        renderer.renderStaticLayers();
        renderer.renderCoverageField();
        metrics.updateMetrics();
    }

    return {
        recomputeModel
    };
}
