export function createInitialState(core, config) {
    const initialBand = core.getBandRange(config.INITIAL_BAND_WIDTH_IN);
    const initialCoverage = core.computeFieldCoveragePlan({
        speedMph: 0,
        machineWidthFt: config.DEFAULT_MACHINE_WIDTH_FT,
        fieldAreaAcres: config.DEFAULT_FIELD_AREA_ACRES,
        fieldShape: config.DEFAULT_FIELD_SHAPE,
        efficiencyPercent: config.DEFAULT_FIELD_EFFICIENCY_PERCENT,
        selectedHours: config.DEFAULT_COVERAGE_TIME_HOURS
    });

    return {
        running: false,
        lastTimestampMs: 0,
        spawnCarry: 0,
        nextWeedId: 1,
        weeds: [],
        scanners: [
            { id: 'A', cooldownMs: 0, shots: 0 },
            { id: 'B', cooldownMs: 0, shots: 0 }
        ],
        stats: {
            spawned: 0,
            shots: 0,
            fullyShot: 0,
            partial: 0,
            missed: 0,
            elapsedMs: 0,
            shotSamples: 0,
            shotLineYMeanIn: 0,
            shotMarginSamples: 0,
            shotExitMarginMeanSec: 0,
            queueGrowthEwmaPerSec: 0,
            lastActiveTargets: 0
        },
        recording: {
            isActive: false,
            limitMs: 30000,
            startedElapsedMs: 0,
            events: [],
            settingsSnapshot: null
        },
        passSnapshots: [],
        model: {
            shootTimeMs: 0,
            timePerTargetMs: 0,
            capacityTargetsPerSecond: 0,
            rawSpeedMph: 0,
            utilizedRawSpeedMph: 0,
            appliedSpeedMph: 0,
            appliedInchesPerSecond: 0,
            inflowTargetsPerSecond: 0,
            isCapped: false,
            bandedWeedsPerSqFt: 0,
            bandedSharePercent: 0,
            coverageRatio: 1,
            coverageGapIn: 0,
            hasCoverageGap: false,
            overloadRatio: 0,
            centerPriorityActive: false,
            centerPriorityWidthIn: config.CENTER_PRIORITY_MIN_WIDTH_IN,
            bandCenterXIn: (initialBand.start + initialBand.end) / 2,
            speedUtilizationPercent: config.DEFAULT_SPEED_UTILIZATION_PERCENT,
            targetingPolicy: config.DEFAULT_TARGETING_POLICY,
            targetMidlineYIn: config.DEFAULT_TARGET_MIDLINE_Y_IN,
            targetUrgentYIn: config.DEFAULT_TARGET_URGENT_Y_IN
        },
        coverage: initialCoverage,
        band: initialBand,
        zones: core.normalizeScannerRanges(
            initialBand.start,
            initialBand.end,
            config.INITIAL_SCANNER_A_RIGHT_IN,
            config.INITIAL_SCANNER_B_LEFT_IN
        )
    };
}
