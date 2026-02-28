export function createSimulationEngine({ core, dom, state, renderer, metrics, config }) {
    const MAX_PASS_SNAPSHOTS = 20;

    function isInTargetBand(weed) {
        return weed.xIn >= state.band.start && weed.xIn <= state.band.end;
    }

    function isInScannerCoverageX(xIn) {
        const inScannerA = xIn >= state.zones.scannerA.start && xIn <= state.zones.scannerA.end;
        const inScannerB = xIn >= state.zones.scannerB.start && xIn <= state.zones.scannerB.end;
        return inScannerA || inScannerB;
    }

    function getActiveCategories() {
        const categories = Array.isArray(state.model.weedCategories) ? state.model.weedCategories : [];
        if (categories.length > 0) {
            return categories;
        }

        return [
            {
                id: 'weed-category-1',
                name: 'Weed Category 1',
                visualType: 'broadleaf',
                densityPerSqFt: 0,
                shootTimeMs: 20,
                sharePercent: 0
            }
        ];
    }

    function ensureCategoryStatsEntry(category) {
        const categoryId = String(category?.id ?? 'uncategorized');
        if (!state.stats.categories[categoryId]) {
            state.stats.categories[categoryId] = {
                id: categoryId,
                name: String(category?.name ?? 'Uncategorized'),
                visualType: category?.visualType === 'grass' ? 'grass' : 'broadleaf',
                spawned: 0,
                shots: 0,
                fullyShot: 0,
                partial: 0,
                missed: 0
            };
        }

        return state.stats.categories[categoryId];
    }

    function resetCategoryStats() {
        state.stats.categories = {};
        for (const category of getActiveCategories()) {
            ensureCategoryStatsEntry(category);
        }
    }

    function createWeed(xIn, yIn, category) {
        const safeCategory = category || {
            id: 'weed-category-1',
            name: 'Weed Category 1',
            visualType: 'broadleaf',
            shootTimeMs: 20
        };
        const shotRequiredMs = core.normalizeShootTimeInputMs(safeCategory.shootTimeMs);

        return {
            id: state.nextWeedId,
            xIn,
            yIn,
            type: safeCategory.visualType === 'grass' ? 'grass' : 'broadleaf',
            categoryId: String(safeCategory.id),
            categoryName: String(safeCategory.name),
            rotationDeg: Math.random() * 360,
            shot: false,
            shotComplete: false,
            shotAgeMs: 0,
            shotRequiredMs,
            doseAppliedMs: 0,
            preResolved: false
        };
    }

    function addWeedToState(xIn, yIn, category, options = {}) {
        const weed = createWeed(xIn, yIn, category);
        if (options.shot === true) {
            weed.shot = true;
            weed.shotComplete = true;
            weed.doseAppliedMs = weed.shotRequiredMs;
            weed.shotAgeMs = weed.shotRequiredMs;
            weed.preResolved = true;
        }

        state.weeds.push(weed);
        state.nextWeedId += 1;
        state.stats.spawned += 1;
        ensureCategoryStatsEntry({
            id: weed.categoryId,
            name: weed.categoryName,
            visualType: weed.type
        }).spawned += 1;
    }

    function seedWindowPopulation() {
        const shootLineYIn = core.clamp(
            Number(dom.targetMidlineSlider.value),
            0,
            core.SCAN_HEIGHT_IN
        );

        for (const category of getActiveCategories()) {
            const expectedWindowCount = Math.max(0, Number(category.densityPerSqFt)) * core.WINDOW_AREA_SQFT;
            const wholeCount = Math.floor(expectedWindowCount);
            const fractional = expectedWindowCount - wholeCount;
            const seedCount = wholeCount + (Math.random() < fractional ? 1 : 0);

            for (let index = 0; index < seedCount; index += 1) {
                const yIn = Math.random() * core.SCAN_HEIGHT_IN;
                const xIn = Math.random() * core.SCAN_WIDTH_IN;
                const shouldSeedAsShot = yIn > shootLineYIn && isInScannerCoverageX(xIn);

                addWeedToState(
                    xIn,
                    yIn,
                    category,
                    { shot: shouldSeedAsShot }
                );
            }
        }
    }

    function countActiveTargets() {
        return state.weeds.filter(
            (weed) => !weed.shot &&
                weed.yIn >= 0 &&
                weed.yIn <= core.SCAN_HEIGHT_IN &&
                isInTargetBand(weed)
        ).length;
    }

    function trackShotObservability(targetYIn) {
        state.stats.shotSamples += 1;
        state.stats.shotLineYMeanIn += (targetYIn - state.stats.shotLineYMeanIn) / state.stats.shotSamples;

        if (state.model.appliedInchesPerSecond > 0) {
            const exitMarginSec = Math.max(0, (core.SCAN_HEIGHT_IN - targetYIn) / state.model.appliedInchesPerSecond);
            state.stats.shotMarginSamples += 1;
            state.stats.shotExitMarginMeanSec += (
                exitMarginSec - state.stats.shotExitMarginMeanSec
            ) / state.stats.shotMarginSamples;
        }
    }

    function trackQueueGrowth(deltaSeconds) {
        if (deltaSeconds <= 0) {
            return;
        }

        const activeTargets = countActiveTargets();
        const deltaActive = activeTargets - state.stats.lastActiveTargets;
        const growthPerSecond = deltaActive / deltaSeconds;
        const alpha = 0.2;

        state.stats.queueGrowthEwmaPerSec = state.stats.elapsedMs <= deltaSeconds * 1000
            ? growthPerSecond
            : ((1 - alpha) * state.stats.queueGrowthEwmaPerSec) + (alpha * growthPerSecond);

        state.stats.lastActiveTargets = activeTargets;
    }

    function getCurrentSettingsSnapshot() {
        return {
            densityPerSqFt: Number(state.model.totalDensityPerSqFt),
            weightedShootTimeMs: Number(state.model.shootTimeMs),
            bandWidthIn: Number(dom.bandWidthSlider.value),
            speedUtilizationPercent: Number(dom.speedUtilizationSlider.value),
            targetingPolicy: dom.targetingPolicySelect.value,
            appliedSpeedMph: Number(state.model.appliedSpeedMph),
            categoryCount: state.model.weedCategories?.length ?? 0,
            categories: (state.model.weedCategories || []).map((category) => ({
                id: category.id,
                name: category.name,
                visualType: category.visualType,
                densityPerSqFt: category.densityPerSqFt,
                sharePercent: category.sharePercent,
                shootTimeMs: category.shootTimeMs
            }))
        };
    }

    function stopRecording(reason = 'manual') {
        if (!state.recording.isActive) {
            return;
        }

        const durationMs = Math.max(0, state.stats.elapsedMs - state.recording.startedElapsedMs);
        const counts = {
            shot: 0,
            partial: 0,
            missed: 0
        };

        for (const event of state.recording.events) {
            if (event.result === 'shot') {
                counts.shot += 1;
            } else if (event.result === 'partial') {
                counts.partial += 1;
            } else {
                counts.missed += 1;
            }
        }

        const snapshot = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            createdAtMs: Date.now(),
            reason,
            durationMs: Math.min(durationMs, state.recording.limitMs),
            settings: state.recording.settingsSnapshot || getCurrentSettingsSnapshot(),
            counts: {
                ...counts,
                total: counts.shot + counts.partial + counts.missed
            },
            events: [...state.recording.events]
        };

        state.passSnapshots.unshift(snapshot);
        if (state.passSnapshots.length > MAX_PASS_SNAPSHOTS) {
            state.passSnapshots.length = MAX_PASS_SNAPSHOTS;
        }

        state.recording.isActive = false;
        state.recording.startedElapsedMs = 0;
        state.recording.events = [];
        state.recording.settingsSnapshot = null;
    }

    function cancelRecording() {
        if (!state.recording.isActive) {
            return;
        }

        state.recording.isActive = false;
        state.recording.startedElapsedMs = 0;
        state.recording.events = [];
        state.recording.settingsSnapshot = null;
    }

    function startRecording() {
        if (state.recording.isActive) {
            return;
        }

        state.recording.isActive = true;
        state.recording.startedElapsedMs = state.stats.elapsedMs;
        state.recording.events = [];
        state.recording.settingsSnapshot = getCurrentSettingsSnapshot();
    }

    function toggleRecording() {
        if (state.recording.isActive) {
            stopRecording('manual');
        } else {
            startRecording();
        }

        metrics.updateMetrics();
    }

    function maybeFinalizeRecordingByLimit() {
        if (!state.recording.isActive) {
            return;
        }

        const elapsedMs = state.stats.elapsedMs - state.recording.startedElapsedMs;
        if (elapsedMs >= state.recording.limitMs) {
            stopRecording('limit');
        }
    }

    function recordExitEvent(weed, result) {
        if (!state.recording.isActive) {
            return;
        }

        state.recording.events.push({
            xIn: core.clamp(weed.xIn, 0, core.SCAN_WIDTH_IN),
            timeMs: Math.max(0, state.stats.elapsedMs - state.recording.startedElapsedMs),
            result,
            categoryId: weed.categoryId,
            categoryName: weed.categoryName
        });
    }

    function resetSimulationState() {
        if (state.recording.isActive) {
            cancelRecording();
        }

        state.spawnCarry = {};
        state.nextWeedId = 1;
        state.weeds = [];
        state.stats.spawned = 0;
        state.stats.shots = 0;
        state.stats.fullyShot = 0;
        state.stats.partial = 0;
        state.stats.missed = 0;
        state.stats.elapsedMs = 0;
        state.stats.shotSamples = 0;
        state.stats.shotLineYMeanIn = 0;
        state.stats.shotMarginSamples = 0;
        state.stats.shotExitMarginMeanSec = 0;
        state.stats.queueGrowthEwmaPerSec = 0;
        state.stats.lastActiveTargets = 0;
        resetCategoryStats();

        state.scanners.forEach((scanner) => {
            scanner.cooldownMs = 0;
            scanner.shots = 0;
        });

        seedWindowPopulation();
        state.stats.lastActiveTargets = countActiveTargets();

        renderer.renderWeeds();
        metrics.updateMetrics();
    }

    function spawnWeeds(distanceIn) {
        if (distanceIn <= 0) {
            return;
        }

        const enteringAreaSqFt = (core.SCAN_WIDTH_IN * distanceIn) / 144;

        for (const category of getActiveCategories()) {
            const categoryId = String(category.id);
            const expectedCount = Math.max(0, Number(category.densityPerSqFt)) * enteringAreaSqFt;
            const carry = state.spawnCarry[categoryId] ?? 0;
            const totalForStep = carry + expectedCount;
            const spawnCount = Math.floor(totalForStep);

            state.spawnCarry[categoryId] = totalForStep - spawnCount;

            for (let index = 0; index < spawnCount; index += 1) {
                addWeedToState(
                    Math.random() * core.SCAN_WIDTH_IN,
                    -Math.random() * 0.5,
                    category
                );
            }
        }
    }

    function moveWeeds(distanceIn, deltaMs) {
        for (const weed of state.weeds) {
            const previousYIn = weed.yIn;
            const nextYIn = previousYIn + distanceIn;

            if (weed.shot) {
                weed.shotAgeMs += deltaMs;

                if (!weed.shotComplete) {
                    let inFrameTimeMs = 0;

                    if (distanceIn <= 0) {
                        inFrameTimeMs = previousYIn < core.SCAN_HEIGHT_IN ? deltaMs : 0;
                    } else if (previousYIn < core.SCAN_HEIGHT_IN) {
                        if (nextYIn <= core.SCAN_HEIGHT_IN) {
                            inFrameTimeMs = deltaMs;
                        } else {
                            const fractionInFrame = core.clamp((core.SCAN_HEIGHT_IN - previousYIn) / distanceIn, 0, 1);
                            inFrameTimeMs = deltaMs * fractionInFrame;
                        }
                    }

                    weed.doseAppliedMs = Math.min(
                        weed.shotRequiredMs,
                        weed.doseAppliedMs + Math.max(0, inFrameTimeMs)
                    );

                    if (weed.doseAppliedMs >= weed.shotRequiredMs) {
                        weed.shotComplete = true;
                    }
                }
            }

            weed.yIn = nextYIn;
        }
    }

    function processScanner(scanner, deltaMs, zoneStartIn, zoneEndIn) {
        scanner.cooldownMs -= deltaMs;

        let shotsThisStep = 0;
        while (
            scanner.cooldownMs <= 0 &&
            shotsThisStep < config.MAX_SHOTS_PER_STEP_PER_SCANNER
        ) {
            const target = core.selectTargetByPolicy(
                state.weeds,
                zoneStartIn,
                zoneEndIn,
                state.model.targetingPolicy,
                state.model.targetMidlineYIn,
                state.model.targetUrgentYIn,
                {
                    centerPriorityActive: state.model.centerPriorityActive,
                    centerPriorityWidthIn: state.model.centerPriorityWidthIn,
                    centerLineXIn: state.model.bandCenterXIn,
                    minimumExitMarginInForWeed: (weed) => {
                        const shootTimeMs = core.normalizeShootTimeInputMs(
                            Number(weed?.shotRequiredMs ?? state.model.shootTimeMs)
                        );
                        return state.model.appliedInchesPerSecond * (shootTimeMs / 1000);
                    }
                }
            );

            if (!target) {
                scanner.cooldownMs = 0;
                break;
            }

            target.shot = true;
            target.shotComplete = false;
            target.doseAppliedMs = 0;
            target.shotRequiredMs = core.normalizeShootTimeInputMs(
                Number(target.shotRequiredMs ?? state.model.shootTimeMs)
            );
            target.shotAgeMs = 0;

            state.stats.shots += 1;
            scanner.shots += 1;
            ensureCategoryStatsEntry({
                id: target.categoryId,
                name: target.categoryName,
                visualType: target.type
            }).shots += 1;
            trackShotObservability(target.yIn);

            scanner.cooldownMs += state.model.timePerTargetMs;
            shotsThisStep += 1;
        }

        scanner.cooldownMs = Math.max(0, scanner.cooldownMs);
    }

    function processScanners(deltaMs) {
        processScanner(
            state.scanners[0],
            deltaMs,
            state.zones.scannerA.start,
            state.zones.scannerA.end
        );

        processScanner(
            state.scanners[1],
            deltaMs,
            state.zones.scannerB.start,
            state.zones.scannerB.end
        );
    }

    function removeExpiredWeeds() {
        const kept = [];

        for (const weed of state.weeds) {
            if (weed.yIn > core.SCAN_HEIGHT_IN) {
                if (isInTargetBand(weed) && !weed.preResolved) {
                    const categoryStats = ensureCategoryStatsEntry({
                        id: weed.categoryId,
                        name: weed.categoryName,
                        visualType: weed.type
                    });
                    if (!weed.shot) {
                        state.stats.missed += 1;
                        categoryStats.missed += 1;
                        recordExitEvent(weed, 'missed');
                    } else if (weed.shotComplete) {
                        state.stats.fullyShot += 1;
                        categoryStats.fullyShot += 1;
                        recordExitEvent(weed, 'shot');
                    } else {
                        state.stats.partial += 1;
                        categoryStats.partial += 1;
                        recordExitEvent(weed, 'partial');
                    }
                }
                continue;
            }

            kept.push(weed);
        }

        state.weeds = kept;
    }

    function stepSimulation(deltaSeconds, deltaMs) {
        const distanceIn = state.model.appliedInchesPerSecond * deltaSeconds;

        state.stats.elapsedMs += deltaMs;
        spawnWeeds(distanceIn);
        moveWeeds(distanceIn, deltaMs);
        processScanners(deltaMs);
        removeExpiredWeeds();
        maybeFinalizeRecordingByLimit();
        trackQueueGrowth(deltaSeconds);
        renderer.renderWeeds();
        metrics.updateMetrics();
    }

    function animationFrame(timestampMs) {
        if (state.running) {
            if (!state.lastTimestampMs) {
                state.lastTimestampMs = timestampMs;
            }

            const elapsedMs = Math.min(100, timestampMs - state.lastTimestampMs);
            const elapsedSeconds = elapsedMs / 1000;

            stepSimulation(elapsedSeconds, elapsedMs);
            state.lastTimestampMs = timestampMs;
        }

        window.requestAnimationFrame(animationFrame);
    }

    function setRunning(nextRunning) {
        state.running = nextRunning;

        if (nextRunning) {
            state.lastTimestampMs = 0;
            dom.runButton.disabled = true;
            dom.pauseButton.disabled = false;
        } else {
            dom.runButton.disabled = false;
            dom.pauseButton.disabled = true;
        }
    }

    function startLoop() {
        window.requestAnimationFrame(animationFrame);
    }

    return {
        setRunning,
        startLoop,
        resetSimulationState,
        toggleRecording
    };
}
