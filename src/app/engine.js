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

    function createWeed(xIn, yIn) {
        const size = Number(dom.sizeSlider.value);
        const shotRequiredMs = core.computeShootTimeMs(size);

        return {
            id: state.nextWeedId,
            xIn,
            yIn,
            size,
            type: Math.random() < 0.5 ? 'broadleaf' : 'grass',
            rotationDeg: Math.random() * 360,
            shot: false,
            shotComplete: false,
            shotAgeMs: 0,
            shotRequiredMs,
            doseAppliedMs: 0,
            preResolved: false
        };
    }

    function addWeedToState(xIn, yIn, options = {}) {
        const weed = createWeed(xIn, yIn);
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
    }

    function seedWindowPopulation() {
        const density = Math.max(0, Number(dom.densitySlider.value));
        const expectedWindowCount = density * core.WINDOW_AREA_SQFT;
        const wholeCount = Math.floor(expectedWindowCount);
        const fractional = expectedWindowCount - wholeCount;
        const seedCount = wholeCount + (Math.random() < fractional ? 1 : 0);

        const shootLineYIn = core.clamp(
            Number(dom.targetMidlineSlider.value),
            0,
            core.SCAN_HEIGHT_IN
        );

        for (let i = 0; i < seedCount; i += 1) {
            const yIn = Math.random() * core.SCAN_HEIGHT_IN;
            const xIn = Math.random() * core.SCAN_WIDTH_IN;
            const shouldSeedAsShot = yIn > shootLineYIn && isInScannerCoverageX(xIn);

            addWeedToState(
                xIn,
                yIn,
                { shot: shouldSeedAsShot }
            );
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
            densityPerSqFt: Number(dom.densitySlider.value),
            weedSize: Number(dom.sizeSlider.value),
            bandWidthIn: Number(dom.bandWidthSlider.value),
            speedUtilizationPercent: Number(dom.speedUtilizationSlider.value),
            targetingPolicy: dom.targetingPolicySelect.value,
            appliedSpeedMph: Number(state.model.appliedSpeedMph)
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
            result
        });
    }

    function resetSimulationState() {
        if (state.recording.isActive) {
            cancelRecording();
        }

        state.spawnCarry = 0;
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

        const density = Number(dom.densitySlider.value);
        const enteringAreaSqFt = (core.SCAN_WIDTH_IN * distanceIn) / 144;
        const expectedCount = density * enteringAreaSqFt;

        state.spawnCarry += expectedCount;

        const spawnCount = Math.floor(state.spawnCarry);
        state.spawnCarry -= spawnCount;

        for (let i = 0; i < spawnCount; i += 1) {
            addWeedToState(
                Math.random() * core.SCAN_WIDTH_IN,
                -Math.random() * 0.5
            );
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
            const minimumExitMarginIn = state.model.appliedInchesPerSecond * (state.model.shootTimeMs / 1000);
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
                    minimumExitMarginIn
                }
            );

            if (!target) {
                scanner.cooldownMs = 0;
                break;
            }

            target.shot = true;
            target.shotComplete = false;
            target.doseAppliedMs = 0;
            target.shotRequiredMs = core.computeShootTimeMs(target.size);
            target.shotAgeMs = 0;

            state.stats.shots += 1;
            scanner.shots += 1;
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
                    if (!weed.shot) {
                        state.stats.missed += 1;
                        recordExitEvent(weed, 'missed');
                    } else if (weed.shotComplete) {
                        state.stats.fullyShot += 1;
                        recordExitEvent(weed, 'shot');
                    } else {
                        state.stats.partial += 1;
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
