(function (globalScope) {
    'use strict';

    const SCAN_WIDTH_IN = 20;
    const SCAN_HEIGHT_IN = 20;
    const WINDOW_AREA_SQFT = (SCAN_WIDTH_IN * SCAN_HEIGHT_IN) / 144;
    const REFERENCE_SQFT_WIDTH_IN = 12;
    const INCHES_PER_FOOT = 12;
    const FEET_PER_MILE = 5280;
    const INCHES_PER_MILE = 63360;
    const SECONDS_PER_HOUR = 3600;
    const SQFT_PER_ACRE = 43560;

    const SHOOT_TIME_PROFILE = Object.freeze({
        minSize: 1,
        maxSize: 20,
        minTimeMs: 25,
        size2TimeMs: 30,
        size3TimeMs: 40,
        maxTimeMs: 250,
        // Tuned to keep early-mid sizes below linear while still hitting 250 ms at size 20.
        tailExponent: 1.2
    });

    const WEED_VISUAL_PROFILE = Object.freeze({
        minLeafLengthIn: 1 / 16,
        maxLeafLengthIn: 1.25
    });

    function toNumber(value, fallback) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
        return fallback;
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function lerp(start, end, t) {
        return start + (end - start) * t;
    }

    function weedsInWindow(densityPerSqFt) {
        const density = Math.max(0, toNumber(densityPerSqFt, 0));
        return density * WINDOW_AREA_SQFT;
    }

    function computeBandedWeedLoadPerSqFt(densityPerSqFt, bandWidthIn) {
        const weedsPerSqFt = Math.max(0, toNumber(densityPerSqFt, 0));
        const safeBandWidthIn = Math.max(0, toNumber(bandWidthIn, 0));
        const bandFraction = clamp(safeBandWidthIn / REFERENCE_SQFT_WIDTH_IN, 0, 1);

        return {
            weedsPerSqFt,
            bandedWeedsPerSqFt: weedsPerSqFt * bandFraction,
            bandFraction,
            bandPercent: bandFraction * 100
        };
    }

    function computeShootTimeMs(size, calibrationScale) {
        const safeSize = clamp(
            toNumber(size, SHOOT_TIME_PROFILE.minSize),
            SHOOT_TIME_PROFILE.minSize,
            SHOOT_TIME_PROFILE.maxSize
        );

        const safeCalibrationScale = Math.max(0, toNumber(calibrationScale, 1));

        let shootTimeMs;

        if (safeSize <= 2) {
            shootTimeMs = lerp(
                SHOOT_TIME_PROFILE.minTimeMs,
                SHOOT_TIME_PROFILE.size2TimeMs,
                safeSize - 1
            );
        } else if (safeSize <= 3) {
            shootTimeMs = lerp(
                SHOOT_TIME_PROFILE.size2TimeMs,
                SHOOT_TIME_PROFILE.size3TimeMs,
                safeSize - 2
            );
        } else {
            const normalizedTail = (safeSize - 3) / (SHOOT_TIME_PROFILE.maxSize - 3);
            shootTimeMs = SHOOT_TIME_PROFILE.size3TimeMs +
                (SHOOT_TIME_PROFILE.maxTimeMs - SHOOT_TIME_PROFILE.size3TimeMs) *
                Math.pow(normalizedTail, SHOOT_TIME_PROFILE.tailExponent);
        }

        return shootTimeMs * safeCalibrationScale;
    }

    function computeTimePerTargetMs(shootTimeMs, overheadMs) {
        const safeShootTimeMs = Math.max(0, toNumber(shootTimeMs, 0));
        const safeOverheadMs = Math.max(0, toNumber(overheadMs, 0));
        return safeShootTimeMs + safeOverheadMs;
    }

    function computeCapacityTargetsPerSecond(scannerCount, timePerTargetMs) {
        const safeScannerCount = Math.max(1, toNumber(scannerCount, 1));
        const safeTimePerTargetMs = Math.max(0.01, toNumber(timePerTargetMs, 0.01));
        return safeScannerCount * (1000 / safeTimePerTargetMs);
    }

    function inchesPerSecondToMph(inchesPerSecond) {
        const safeInchesPerSecond = Math.max(0, toNumber(inchesPerSecond, 0));
        return (safeInchesPerSecond * SECONDS_PER_HOUR) / INCHES_PER_MILE;
    }

    function mphToInchesPerSecond(mph) {
        const safeMph = Math.max(0, toNumber(mph, 0));
        return (safeMph * INCHES_PER_MILE) / SECONDS_PER_HOUR;
    }

    function computeRawSpeedMph(config) {
        const safeDensityPerSqFt = Math.max(0, toNumber(config.densityPerSqFt, 0));
        const safeBandWidthIn = Math.max(0, toNumber(config.bandWidthIn, 0));
        const safeTimePerTargetMs = Math.max(0.01, toNumber(config.timePerTargetMs, 0.01));
        const safeScannerCount = Math.max(1, toNumber(config.scannerCount, 2));

        if (safeDensityPerSqFt === 0 || safeBandWidthIn === 0) {
            return Number.POSITIVE_INFINITY;
        }

        const targetsPerSecondCapacity = computeCapacityTargetsPerSecond(safeScannerCount, safeTimePerTargetMs);
        const targetsPerInchTravel = (safeDensityPerSqFt * safeBandWidthIn) / 144;

        if (targetsPerInchTravel <= 0) {
            return Number.POSITIVE_INFINITY;
        }

        const inchesPerSecond = targetsPerSecondCapacity / targetsPerInchTravel;
        return inchesPerSecondToMph(inchesPerSecond);
    }

    function computeAppliedSpeedMph(rawSpeedMph, speedCapMph) {
        const safeRawSpeedMph = Math.max(0, toNumber(rawSpeedMph, 0));
        const safeCapMph = Math.max(0, toNumber(speedCapMph, 0));

        return {
            rawSpeedMph: safeRawSpeedMph,
            appliedSpeedMph: Math.min(safeRawSpeedMph, safeCapMph),
            isCapped: safeRawSpeedMph > safeCapMph
        };
    }

    function computeTargetFlowTargetsPerSecond(densityPerSqFt, bandWidthIn, speedMph) {
        const safeDensityPerSqFt = Math.max(0, toNumber(densityPerSqFt, 0));
        const safeBandWidthIn = Math.max(0, toNumber(bandWidthIn, 0));
        const inchesPerSecond = mphToInchesPerSecond(speedMph);
        return (safeDensityPerSqFt * safeBandWidthIn * inchesPerSecond) / 144;
    }

    function computeCoverageRates(speedMph, machineWidthIn, bandWidthIn) {
        const safeSpeedMph = Math.max(0, toNumber(speedMph, 0));
        const safeMachineWidthIn = Math.max(0, toNumber(machineWidthIn, SCAN_WIDTH_IN));
        const safeBandWidthIn = Math.max(0, toNumber(bandWidthIn, 0));

        const travelFeetPerHour = safeSpeedMph * FEET_PER_MILE;
        const travelFeetPerSecond = travelFeetPerHour / SECONDS_PER_HOUR;

        const machineWidthFt = safeMachineWidthIn / INCHES_PER_FOOT;
        const bandWidthFt = safeBandWidthIn / INCHES_PER_FOOT;

        const machineCoverageSqFtPerHour = travelFeetPerHour * machineWidthFt;
        const bandCoverageSqFtPerHour = travelFeetPerHour * bandWidthFt;

        const machineCoverageAcresPerHour = machineCoverageSqFtPerHour / SQFT_PER_ACRE;
        const bandCoverageAcresPerHour = bandCoverageSqFtPerHour / SQFT_PER_ACRE;

        return {
            scanAreaSqFt: (safeMachineWidthIn * SCAN_HEIGHT_IN) / 144,
            travelFeetPerSecond,
            travelFeetPerHour,
            machineWidthFt,
            bandWidthFt,
            machineCoverageSqFtPerHour,
            machineCoverageAcresPerHour,
            machineHoursPerAcre: machineCoverageAcresPerHour > 0 ? 1 / machineCoverageAcresPerHour : Number.POSITIVE_INFINITY,
            bandCoverageSqFtPerHour,
            bandCoverageAcresPerHour,
            bandHoursPerAcre: bandCoverageAcresPerHour > 0 ? 1 / bandCoverageAcresPerHour : Number.POSITIVE_INFINITY
        };
    }

    function getBandRange(bandWidthIn) {
        const safeBandWidthIn = clamp(toNumber(bandWidthIn, SCAN_WIDTH_IN), 0, SCAN_WIDTH_IN);
        const center = SCAN_WIDTH_IN / 2;
        const start = center - safeBandWidthIn / 2;
        const end = center + safeBandWidthIn / 2;

        return { start, end, width: safeBandWidthIn };
    }

    function normalizeScannerRanges(bandStartIn, bandEndIn, scannerARightIn, scannerBLeftIn) {
        const start = Math.min(bandStartIn, bandEndIn);
        const end = Math.max(bandStartIn, bandEndIn);
        const scannerARight = clamp(toNumber(scannerARightIn, end), start, end);
        const scannerBLeft = clamp(toNumber(scannerBLeftIn, start), start, end);

        return {
            scannerA: {
                start,
                end: scannerARight
            },
            scannerB: {
                start: scannerBLeft,
                end
            }
        };
    }

    function computeCoverageMetrics(bandStartIn, bandEndIn, scannerARightIn, scannerBLeftIn) {
        const start = Math.min(bandStartIn, bandEndIn);
        const end = Math.max(bandStartIn, bandEndIn);
        const ranges = normalizeScannerRanges(start, end, scannerARightIn, scannerBLeftIn);
        const bandWidthIn = end - start;

        const scannerAWidthIn = Math.max(0, ranges.scannerA.end - ranges.scannerA.start);
        const scannerBWidthIn = Math.max(0, ranges.scannerB.end - ranges.scannerB.start);

        const overlapWidthIn = Math.max(0, ranges.scannerA.end - ranges.scannerB.start);
        const gapWidthIn = Math.max(0, ranges.scannerB.start - ranges.scannerA.end);

        const coveredWidthIn = Math.max(0, scannerAWidthIn + scannerBWidthIn - overlapWidthIn);

        const coverageRatio = bandWidthIn > 0
            ? clamp(coveredWidthIn / bandWidthIn, 0, 1)
            : 1;

        return {
            bandWidthIn,
            coveredWidthIn,
            overlapWidthIn,
            gapWidthIn,
            coverageRatio,
            hasGap: gapWidthIn > 0,
            ranges
        };
    }

    function computeLeafLengthIn(size) {
        const shootTimeMs = computeShootTimeMs(size);
        const minTime = SHOOT_TIME_PROFILE.minTimeMs;
        const maxTime = SHOOT_TIME_PROFILE.maxTimeMs;
        const normalized = clamp((shootTimeMs - minTime) / (maxTime - minTime), 0, 1);

        return WEED_VISUAL_PROFILE.minLeafLengthIn +
            (WEED_VISUAL_PROFILE.maxLeafLengthIn - WEED_VISUAL_PROFILE.minLeafLengthIn) * normalized;
    }

    function computeLeafCount(size, weedType) {
        const safeSize = clamp(
            toNumber(size, SHOOT_TIME_PROFILE.minSize),
            SHOOT_TIME_PROFILE.minSize,
            SHOOT_TIME_PROFILE.maxSize
        );

        if (weedType === 'grass') {
            return Math.min(Math.floor(safeSize / 4) + 1, 3);
        }

        return Math.min(Math.floor(safeSize / 2) + 1, 5);
    }

    function computeWeedVisualProfile(size, weedType) {
        return {
            leafLengthIn: computeLeafLengthIn(size),
            leafCount: computeLeafCount(size, weedType)
        };
    }

    function selectBottomMostTarget(weeds, zoneStartIn, zoneEndIn) {
        const start = Math.min(zoneStartIn, zoneEndIn);
        const end = Math.max(zoneStartIn, zoneEndIn);

        let selected = null;

        for (const weed of weeds) {
            if (weed.shot) {
                continue;
            }

            if (weed.xIn < start || weed.xIn > end) {
                continue;
            }

            if (weed.yIn < 0 || weed.yIn > SCAN_HEIGHT_IN) {
                continue;
            }

            if (!selected || weed.yIn > selected.yIn) {
                selected = weed;
            }
        }

        return selected;
    }

    const api = {
        SCAN_WIDTH_IN,
        SCAN_HEIGHT_IN,
        WINDOW_AREA_SQFT,
        REFERENCE_SQFT_WIDTH_IN,
        SHOOT_TIME_PROFILE,
        WEED_VISUAL_PROFILE,
        clamp,
        weedsInWindow,
        computeBandedWeedLoadPerSqFt,
        computeShootTimeMs,
        computeTimePerTargetMs,
        computeCapacityTargetsPerSecond,
        mphToInchesPerSecond,
        inchesPerSecondToMph,
        computeRawSpeedMph,
        computeAppliedSpeedMph,
        computeTargetFlowTargetsPerSecond,
        computeCoverageRates,
        getBandRange,
        normalizeScannerRanges,
        computeCoverageMetrics,
        computeLeafLengthIn,
        computeLeafCount,
        computeWeedVisualProfile,
        selectBottomMostTarget
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    globalScope.SimulatorCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
