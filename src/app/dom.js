function requireElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Missing required DOM element: #${id}`);
    }
    return element;
}

export function getDomRefs() {
    return {
        densitySlider: requireElement('density-slider'),
        sizeSlider: requireElement('size-slider'),
        bandWidthSlider: requireElement('band-width-slider'),
        scannerAEndSlider: requireElement('scanner-a-end-slider'),
        scannerBStartSlider: requireElement('scanner-b-start-slider'),
        overheadSlider: requireElement('overhead-slider'),
        machineWidthInput: requireElement('machine-width-input'),
        machineLengthInput: requireElement('machine-length-input'),
        fieldAreaInput: requireElement('field-area-input'),
        fieldShapeSelect: requireElement('field-shape-select'),
        coverageEfficiencySlider: requireElement('coverage-efficiency-slider'),
        coverageHoursSlider: requireElement('coverage-hours-slider'),

        densityValue: requireElement('density-value'),
        sizeValue: requireElement('size-value'),
        shootTimeValue: requireElement('shoot-time-value'),
        bandWidthValue: requireElement('band-width-value'),
        scannerAEndValue: requireElement('scanner-a-end-value'),
        scannerBStartValue: requireElement('scanner-b-start-value'),
        overheadValue: requireElement('overhead-value'),
        windowDensity: requireElement('window-density'),
        coverageEfficiencyValue: requireElement('coverage-efficiency-value'),
        coverageHoursValue: requireElement('coverage-hours-value'),

        runButton: requireElement('run-button'),
        pauseButton: requireElement('pause-button'),
        resetButton: requireElement('reset-button'),

        metricsTabSimulation: requireElement('metrics-tab-simulation'),
        metricsTabCoverage: requireElement('metrics-tab-coverage'),
        metricsPanelSimulation: requireElement('metrics-panel-simulation'),
        metricsPanelCoverage: requireElement('metrics-panel-coverage'),
        simulationVisualView: requireElement('simulation-visual-view'),
        coverageVisualView: requireElement('coverage-visual-view'),

        appliedSpeedMph: requireElement('applied-speed-mph'),
        speedCapNote: requireElement('speed-cap-note'),

        densityReadout: requireElement('density-readout'),
        bandedWeedsReadout: requireElement('banded-weeds-readout'),
        bandedShareReadout: requireElement('banded-share-readout'),
        bandedShareFill: requireElement('banded-share-fill'),
        windowWeedsReadout: requireElement('window-weeds-readout'),
        bandWidthReadout: requireElement('band-width-readout'),
        coverageReadout: requireElement('coverage-readout'),
        coverageGapReadout: requireElement('coverage-gap-readout'),
        coverageWarning: requireElement('coverage-warning'),
        inflowReadout: requireElement('inflow-readout'),
        capacityReadout: requireElement('capacity-readout'),
        activeTargetsReadout: requireElement('active-targets-readout'),
        queueDepthReadout: requireElement('queue-depth-readout'),
        shotsReadout: requireElement('shots-readout'),
        shotsPerSecondReadout: requireElement('shots-per-second-readout'),
        shotsPerMinuteReadout: requireElement('shots-per-minute-readout'),
        missedReadout: requireElement('missed-readout'),
        hitRateReadout: requireElement('hit-rate-readout'),
        elapsedReadout: requireElement('elapsed-readout'),

        rawSpeedReadout: requireElement('raw-speed-readout'),
        appliedSpeedReadout: requireElement('applied-speed-readout'),
        shootTimeReadout: requireElement('shoot-time-readout'),
        overheadReadout: requireElement('overhead-readout'),
        timePerTargetReadout: requireElement('time-per-target-readout'),
        scannerARangeReadout: requireElement('scanner-a-range-readout'),
        scannerBRangeReadout: requireElement('scanner-b-range-readout'),

        coverageSpeedReadout: requireElement('coverage-speed-readout'),
        coverageTravelFpsReadout: requireElement('coverage-travel-fps-readout'),
        coverageRateSqFtHourReadout: requireElement('coverage-rate-sqft-hour-readout'),
        coverageRateAcresHourReadout: requireElement('coverage-rate-acres-hour-readout'),
        coverageFieldAreaReadout: requireElement('coverage-field-area-readout'),
        coverageFieldWidthReadout: requireElement('coverage-field-width-readout'),
        coverageHoursToFinishReadout: requireElement('coverage-hours-to-finish-readout'),
        coverageCoveredAreaReadout: requireElement('coverage-covered-area-readout'),
        coveragePercentReadout: requireElement('coverage-percent-readout'),
        coveragePassesReadout: requireElement('coverage-passes-readout'),
        coverageActivePassReadout: requireElement('coverage-active-pass-readout'),

        visualMachineSizeReadout: requireElement('visual-machine-size-readout'),
        visualFieldReadout: requireElement('visual-field-readout'),
        visualRateReadout: requireElement('visual-rate-readout'),
        visualCompletionReadout: requireElement('visual-completion-readout'),

        gridLayer: requireElement('grid-layer'),
        bandLayer: requireElement('band-layer'),
        zoneLayer: requireElement('zone-layer'),
        weedLayer: requireElement('weed-layer'),
        coverageFieldLayer: requireElement('coverage-field-layer')
    };
}
