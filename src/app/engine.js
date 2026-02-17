export function createSimulationEngine({ core, dom, state, renderer, metrics, config }) {
    function countActiveTargets() {
        return state.weeds.filter((weed) => !weed.shot && weed.yIn >= 0 && weed.yIn <= core.SCAN_HEIGHT_IN).length;
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

    function resetSimulationState() {
        state.spawnCarry = 0;
        state.nextWeedId = 1;
        state.weeds = [];
        state.stats.spawned = 0;
        state.stats.shots = 0;
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

        renderer.renderWeeds();
        metrics.updateMetrics();
    }

    function spawnWeeds(distanceIn) {
        if (distanceIn <= 0) {
            return;
        }

        const density = Number(dom.densitySlider.value);
        const enteringAreaSqFt = (state.band.width * distanceIn) / 144;
        const expectedCount = density * enteringAreaSqFt;

        state.spawnCarry += expectedCount;

        const spawnCount = Math.floor(state.spawnCarry);
        state.spawnCarry -= spawnCount;

        for (let i = 0; i < spawnCount; i += 1) {
            const useMidlineSpawnBand = state.model.targetingPolicy === 'midline';
            const midlineYIn = core.clamp(state.model.targetMidlineYIn, 0, core.SCAN_HEIGHT_IN);
            const spawnCeilingIn = Math.max(0.5, midlineYIn);
            const spawnTopJitterIn = 0.2;
            const spawnedYIn = useMidlineSpawnBand
                ? (Math.sqrt(Math.random()) * spawnCeilingIn) - (Math.random() * spawnTopJitterIn)
                : -Math.random() * 0.4;

            state.weeds.push({
                id: state.nextWeedId,
                xIn: state.band.start + Math.random() * state.band.width,
                yIn: spawnedYIn,
                size: Number(dom.sizeSlider.value),
                type: Math.random() < 0.5 ? 'broadleaf' : 'grass',
                rotationDeg: Math.random() * 360,
                shot: false,
                shotAgeMs: 0
            });

            state.nextWeedId += 1;
            state.stats.spawned += 1;
        }
    }

    function moveWeeds(distanceIn, deltaMs) {
        for (const weed of state.weeds) {
            weed.yIn += distanceIn;
            if (weed.shot) {
                weed.shotAgeMs += deltaMs;
            }
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
                state.model.targetUrgentYIn
            );

            if (!target) {
                scanner.cooldownMs = 0;
                break;
            }

            target.shot = true;
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
                if (!weed.shot) {
                    state.stats.missed += 1;
                }
                continue;
            }

            if (weed.shot && weed.shotAgeMs >= config.SHOT_FADE_MS) {
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
        resetSimulationState
    };
}
