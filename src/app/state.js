export function createInitialState(core, config) {
    const initialBand = core.getBandRange(config.INITIAL_BAND_WIDTH_IN);

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
            missed: 0,
            elapsedMs: 0
        },
        model: {
            shootTimeMs: 0,
            timePerTargetMs: 0,
            capacityTargetsPerSecond: 0,
            rawSpeedMph: 0,
            appliedSpeedMph: 0,
            appliedInchesPerSecond: 0,
            inflowTargetsPerSecond: 0,
            isCapped: false,
            bandedWeedsPerSqFt: 0,
            bandedSharePercent: 0,
            coverageRatio: 1,
            coverageGapIn: 0,
            hasCoverageGap: false,
            scanAreaSqFt: 0,
            travelFeetPerSecond: 0,
            machineWidthFt: 0,
            bandWidthFt: 0,
            machineCoverageSqFtPerHour: 0,
            machineCoverageAcresPerHour: 0,
            machineHoursPerAcre: 0,
            bandCoverageSqFtPerHour: 0,
            bandCoverageAcresPerHour: 0,
            bandHoursPerAcre: 0
        },
        band: initialBand,
        zones: core.normalizeScannerRanges(
            initialBand.start,
            initialBand.end,
            config.INITIAL_SCANNER_A_RIGHT_IN,
            config.INITIAL_SCANNER_B_LEFT_IN
        )
    };
}
