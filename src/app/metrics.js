export function createMetricsPresenter({ dom, state, core }) {
    let lastSnapshotRenderKey = '';
    let activeSnapshotId = '';
    let lastActiveSnapshotDetailKey = '';

    function format(value, digits) {
        return Number(value).toFixed(digits);
    }

    function formatFinite(value, digits) {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric.toFixed(digits) : 'N/A';
    }

    function formatMaybeInfinite(value, digits) {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
            return numeric.toFixed(digits);
        }
        if (numeric === Number.POSITIVE_INFINITY) {
            return 'Infinity';
        }
        if (numeric === Number.NEGATIVE_INFINITY) {
            return '-Infinity';
        }
        return 'N/A';
    }

    function formatPolicy(policy) {
        if (policy === 'bottom-only') {
            return 'bottom-most';
        }
        if (policy === 'bottom') {
            return 'centerline';
        }
        return 'midline';
    }

    function formatSnapshotTime(timestampMs) {
        const date = new Date(timestampMs);
        return date.toLocaleTimeString();
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    function snapshotColor(result) {
        if (result === 'shot') {
            return '#16a34a';
        }
        if (result === 'partial') {
            return '#ea580c';
        }
        return '#b91c1c';
    }

    function getSnapshotById(snapshotId) {
        if (!snapshotId) {
            return null;
        }
        return state.passSnapshots.find((snapshot) => snapshot.id === snapshotId) || null;
    }

    function formatSnapshotCategorySummary(settings = {}) {
        const categories = Array.isArray(settings.categories) ? settings.categories : [];
        if (categories.length === 0) {
            return 'No categories';
        }

        const sorted = [...categories].sort((a, b) => (b.sharePercent ?? 0) - (a.sharePercent ?? 0));
        const preview = sorted.slice(0, 3).map((category) => {
            const name = String(category.name ?? 'Category');
            return `${name} ${format(category.sharePercent ?? 0, 0)}%`;
        });

        if (sorted.length > 3) {
            preview.push(`+${sorted.length - 3} more`);
        }

        return preview.join(', ');
    }

    function buildSnapshotSettingsText(settings = {}) {
        return `Density ${format(settings.densityPerSqFt ?? 0, 0)} | Shoot ${format(settings.weightedShootTimeMs ?? 0, 0)} ms | Band ${format(settings.bandWidthIn ?? 0, 1)} in | Util ${format(settings.speedUtilizationPercent ?? 0, 0)}% | Policy ${formatPolicy(settings.targetingPolicy)} | Speed ${format(settings.appliedSpeedMph ?? 0, 2)} mph | Mix ${formatSnapshotCategorySummary(settings)}`;
    }

    function buildSnapshotPlot(snapshot) {
        const plotWidth = 220;
        const plotHeight = 120;
        const pad = 8;
        const innerWidth = plotWidth - (pad * 2);
        const innerHeight = plotHeight - (pad * 2);
        const durationMs = Math.max(1, snapshot.durationMs);

        const points = snapshot.events.map((event) => {
            const x = pad + (core.clamp(event.xIn, 0, core.SCAN_WIDTH_IN) / core.SCAN_WIDTH_IN) * innerWidth;
            const y = pad + (core.clamp(event.timeMs, 0, durationMs) / durationMs) * innerHeight;
            const color = snapshotColor(event.result);
            return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="2.3" fill="${color}" />`;
        }).join('');

        return [
            `<svg class="snapshot-plot" viewBox="0 0 ${plotWidth} ${plotHeight}" aria-label="Pass snapshot event map">`,
            `<rect x="${pad}" y="${pad}" width="${innerWidth}" height="${innerHeight}" class="snapshot-plot-bg"></rect>`,
            `<line x1="${pad}" y1="${pad + innerHeight}" x2="${pad + innerWidth}" y2="${pad + innerHeight}" class="snapshot-plot-axis"></line>`,
            `<line x1="${pad}" y1="${pad}" x2="${pad}" y2="${pad + innerHeight}" class="snapshot-plot-axis"></line>`,
            points,
            '</svg>'
        ].join('');
    }

    function buildSnapshotDetailPlot(snapshot) {
        const plotWidth = 900;
        const padLeft = 56;
        const padRight = 18;
        const padTop = 14;
        const padBottom = 30;
        const durationMs = Math.max(1, snapshot.durationMs);
        const durationSec = durationMs / 1000;
        const innerWidth = plotWidth - padLeft - padRight;
        const innerHeight = Math.max(760, Math.round(durationSec * 30));
        const plotHeight = padTop + innerHeight + padBottom;
        const settings = snapshot.settings || {};
        const bandWidthIn = core.clamp(settings.bandWidthIn ?? 0, 0, core.SCAN_WIDTH_IN);
        const bandStartIn = (core.SCAN_WIDTH_IN - bandWidthIn) / 2;
        const bandEndIn = bandStartIn + bandWidthIn;

        const toPlotX = (xIn) => {
            const normalized = core.clamp(xIn, 0, core.SCAN_WIDTH_IN) / core.SCAN_WIDTH_IN;
            return padLeft + (normalized * innerWidth);
        };
        const toPlotY = (timeMs) => {
            const normalized = core.clamp(timeMs, 0, durationMs) / durationMs;
            return padTop + (normalized * innerHeight);
        };

        const xTicks = [];
        for (let xIn = 0; xIn <= core.SCAN_WIDTH_IN + 0.001; xIn += 4) {
            const x = toPlotX(xIn);
            xTicks.push(`<line x1="${x.toFixed(2)}" y1="${padTop}" x2="${x.toFixed(2)}" y2="${(padTop + innerHeight).toFixed(2)}" class="snapshot-detail-grid-x"></line>`);
            xTicks.push(`<text x="${x.toFixed(2)}" y="${(padTop + innerHeight + 16).toFixed(2)}" text-anchor="middle" class="snapshot-detail-axis-text">${format(xIn, 0)}</text>`);
        }

        const timeTickStepSec = durationSec > 45 ? 10 : 5;
        const yTicks = [];
        for (let sec = 0; sec <= durationSec + 0.001; sec += timeTickStepSec) {
            const y = toPlotY(sec * 1000);
            yTicks.push(`<line x1="${padLeft}" y1="${y.toFixed(2)}" x2="${(padLeft + innerWidth).toFixed(2)}" y2="${y.toFixed(2)}" class="snapshot-detail-grid-y"></line>`);
            yTicks.push(`<text x="${(padLeft - 8).toFixed(2)}" y="${(y + 4).toFixed(2)}" text-anchor="end" class="snapshot-detail-axis-text">${format(sec, 0)}s</text>`);
        }

        const points = snapshot.events.map((event) => {
            const x = toPlotX(event.xIn);
            const y = toPlotY(event.timeMs);
            const color = snapshotColor(event.result);
            return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3.2" fill="${color}" />`;
        }).join('');

        const centerLineX = toPlotX(core.SCAN_WIDTH_IN / 2);
        const bandStartX = toPlotX(bandStartIn);
        const bandWidthPx = Math.max(0, toPlotX(bandEndIn) - bandStartX);
        const emptyLabel = snapshot.events.length === 0
            ? `<text x="${(padLeft + (innerWidth / 2)).toFixed(2)}" y="${(padTop + (innerHeight / 2)).toFixed(2)}" text-anchor="middle" class="snapshot-detail-empty-text">No resolved targets in this pass window.</text>`
            : '';

        return [
            `<svg class="snapshot-detail-svg" viewBox="0 0 ${plotWidth} ${plotHeight}" aria-label="Detailed pass snapshot timeline">`,
            `<rect x="${padLeft}" y="${padTop}" width="${innerWidth}" height="${innerHeight}" class="snapshot-detail-bg"></rect>`,
            `<rect x="${bandStartX.toFixed(2)}" y="${padTop}" width="${bandWidthPx.toFixed(2)}" height="${innerHeight}" class="snapshot-detail-band"></rect>`,
            xTicks.join(''),
            yTicks.join(''),
            `<line x1="${centerLineX.toFixed(2)}" y1="${padTop}" x2="${centerLineX.toFixed(2)}" y2="${(padTop + innerHeight).toFixed(2)}" class="snapshot-detail-centerline"></line>`,
            `<line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${(padTop + innerHeight).toFixed(2)}" class="snapshot-detail-axis"></line>`,
            `<line x1="${padLeft}" y1="${(padTop + innerHeight).toFixed(2)}" x2="${(padLeft + innerWidth).toFixed(2)}" y2="${(padTop + innerHeight).toFixed(2)}" class="snapshot-detail-axis"></line>`,
            points,
            emptyLabel,
            '</svg>'
        ].join('');
    }

    function renderActiveSnapshotDetail(force = false) {
        if (!activeSnapshotId) {
            return;
        }

        const snapshot = getSnapshotById(activeSnapshotId);
        if (!snapshot) {
            closeSnapshotDetail();
            return;
        }

        const renderKey = `${snapshot.id}:${snapshot.events.length}:${snapshot.durationMs}:${snapshot.counts?.total ?? 0}`;
        if (!force && renderKey === lastActiveSnapshotDetailKey) {
            return;
        }
        lastActiveSnapshotDetailKey = renderKey;

        const settings = snapshot.settings || {};
        const counts = snapshot.counts || { shot: 0, partial: 0, missed: 0, total: 0 };

        dom.snapshotDetailTitle.textContent = `${formatSnapshotTime(snapshot.createdAtMs)} · ${format(snapshot.durationMs / 1000, 1)}s`;
        dom.snapshotDetailSettings.textContent = buildSnapshotSettingsText(settings);
        dom.snapshotDetailCounts.textContent = `Shot ${counts.shot} · Partial ${counts.partial} · Missed ${counts.missed} · Total ${counts.total}`;
        dom.snapshotDetailPlot.innerHTML = buildSnapshotDetailPlot(snapshot);
    }

    function openSnapshotDetail(snapshotId) {
        const snapshot = getSnapshotById(snapshotId);
        if (!snapshot) {
            return;
        }

        const changedSnapshot = activeSnapshotId !== snapshot.id;
        activeSnapshotId = snapshot.id;
        lastActiveSnapshotDetailKey = '';

        dom.snapshotDetailModal.classList.remove('hidden');
        dom.snapshotDetailModal.setAttribute('aria-hidden', 'false');
        renderActiveSnapshotDetail(true);
        if (changedSnapshot) {
            dom.snapshotDetailScroll.scrollTop = 0;
        }
        renderPassSnapshots();
    }

    function closeSnapshotDetail() {
        activeSnapshotId = '';
        lastActiveSnapshotDetailKey = '';
        dom.snapshotDetailModal.classList.add('hidden');
        dom.snapshotDetailModal.setAttribute('aria-hidden', 'true');
        dom.snapshotDetailScroll.scrollTop = 0;
        dom.snapshotDetailPlot.innerHTML = '';
        renderPassSnapshots();
    }

    function openSnapshotFromEventTarget(target) {
        if (!target) {
            return false;
        }

        const card = target.closest('.snapshot-card[data-snapshot-id]');
        if (!card || !dom.passSnapshotHistory.contains(card)) {
            return false;
        }

        openSnapshotDetail(card.dataset.snapshotId);
        return true;
    }

    function renderPassSnapshots() {
        const renderKey = `${state.passSnapshots.map((snapshot) => snapshot.id).join('|')}::${activeSnapshotId}`;
        if (renderKey === lastSnapshotRenderKey) {
            return;
        }
        lastSnapshotRenderKey = renderKey;

        if (state.passSnapshots.length === 0) {
            dom.passSnapshotHistory.innerHTML = '<p class="snapshot-empty">No pass snapshots yet.</p>';
            return;
        }

        const cards = state.passSnapshots.map((snapshot) => {
            const settings = snapshot.settings || {};
            const counts = snapshot.counts || { shot: 0, partial: 0, missed: 0, total: 0 };
            const selectedClass = snapshot.id === activeSnapshotId ? ' is-selected' : '';

            return [
                `<article class="snapshot-card${selectedClass}" data-snapshot-id="${snapshot.id}" role="button" tabindex="0" aria-label="Open pass snapshot detail">`,
                `<p class="snapshot-title">${formatSnapshotTime(snapshot.createdAtMs)} · ${format(snapshot.durationMs / 1000, 1)}s</p>`,
                `<p class="snapshot-settings">${buildSnapshotSettingsText(settings)}</p>`,
                `<p class="snapshot-counts">Shot ${counts.shot} · Partial ${counts.partial} · Missed ${counts.missed} · Total ${counts.total}</p>`,
                buildSnapshotPlot(snapshot),
                '<p class="snapshot-open-hint">Click to inspect pass</p>',
                '</article>'
            ].join('');
        }).join('');

        dom.passSnapshotHistory.innerHTML = cards;
    }

    function renderCategoryMetrics(activeTargetsByCategory) {
        const categories = Array.isArray(state.model.weedCategories) ? state.model.weedCategories : [];
        const categoryStats = state.stats.categories || {};

        if (categories.length === 0) {
            dom.categoryMetricsBody.innerHTML = '<tr><td colspan="8" class="category-metrics-empty">No categories configured.</td></tr>';
            return;
        }

        const rows = categories.map((category) => {
            const stats = categoryStats[category.id] || {
                shots: 0,
                fullyShot: 0,
                partial: 0,
                missed: 0
            };
            const activeTargets = activeTargetsByCategory.get(category.id) ?? 0;
            const resolved = stats.fullyShot + stats.partial + stats.missed;
            const hitRate = resolved > 0 ? (stats.fullyShot / resolved) * 100 : 0;
            const typeLabel = category.visualType === 'grass' ? 'Grass' : 'Broadleaf';

            return [
                '<tr>',
                `<td>${escapeHtml(category.name)}</td>`,
                `<td>${typeLabel}</td>`,
                `<td>${format(category.sharePercent ?? 0, 1)}%</td>`,
                `<td>${activeTargets}</td>`,
                `<td>${stats.fullyShot}</td>`,
                `<td>${stats.partial}</td>`,
                `<td>${stats.missed}</td>`,
                `<td>${format(hitRate, 1)}%</td>`,
                '</tr>'
            ].join('');
        }).join('');

        dom.categoryMetricsBody.innerHTML = rows;
    }

    function buildWorkedExample({ categories, bandWidthIn, overheadMs, utilizationPercent, speedCapMph = 3 }) {
        const mix = core.computeCategoryMix(categories, 150);
        const scannerCount = 2;
        const safeBandWidthIn = core.clamp(Number(bandWidthIn), 0, core.SCAN_WIDTH_IN);
        const safeOverheadMs = Math.max(0, Number(overheadMs));
        const safeUtilizationPercent = core.clamp(Number(utilizationPercent), 0, 200);

        const weightedShootTimeMs = mix.weightedShootTimeMs;
        const timePerTargetMs = core.computeTimePerTargetMs(weightedShootTimeMs, safeOverheadMs);
        const capacityTargetsPerSecond = core.computeCapacityTargetsPerSecond(scannerCount, timePerTargetMs);
        const targetsPerInch = (mix.totalDensityPerSqFt * safeBandWidthIn) / 144;
        const rawSpeedMph = core.computeRawSpeedMph({
            densityPerSqFt: mix.totalDensityPerSqFt,
            bandWidthIn: safeBandWidthIn,
            scannerCount,
            timePerTargetMs
        });
        const headroomMph = rawSpeedMph * (safeUtilizationPercent / 100);
        const appliedSpeed = core.computeAppliedSpeedMph(headroomMph, speedCapMph);
        const appliedInchesPerSecond = core.mphToInchesPerSecond(appliedSpeed.appliedSpeedMph);
        const inflowTargetsPerSecond = core.computeTargetFlowTargetsPerSecond(
            mix.totalDensityPerSqFt,
            safeBandWidthIn,
            appliedSpeed.appliedSpeedMph
        );
        const overloadRatio = capacityTargetsPerSecond > 0
            ? inflowTargetsPerSecond / capacityTargetsPerSecond
            : 0;

        return {
            mix,
            scannerCount,
            bandWidthIn: safeBandWidthIn,
            overheadMs: safeOverheadMs,
            utilizationPercent: safeUtilizationPercent,
            speedCapMph,
            weightedShootTimeMs,
            timePerTargetMs,
            capacityTargetsPerSecond,
            targetsPerInch,
            rawSpeedMph,
            headroomMph,
            appliedSpeedMph: appliedSpeed.appliedSpeedMph,
            isCapped: appliedSpeed.isCapped,
            appliedInchesPerSecond,
            inflowTargetsPerSecond,
            overloadRatio
        };
    }

    function buildMixNumeratorText(categories) {
        if (!Array.isArray(categories) || categories.length === 0) {
            return '0';
        }
        return categories.map((category) => (
            `${format(category.densityPerSqFt ?? 0, 1)}*${format(category.shootTimeMs ?? 0, 0)}`
        )).join(' + ');
    }

    function buildMathCategoryRows(example) {
        return example.mix.categories.map((category) => {
            const requiredExitMarginIn = example.appliedInchesPerSecond * (category.shootTimeMs / 1000);
            const typeLabel = category.visualType === 'grass' ? 'Grass' : 'Broadleaf';

            return [
                '<tr>',
                `<td>${escapeHtml(category.name)}</td>`,
                `<td>${typeLabel}</td>`,
                `<td>${format(category.densityPerSqFt, 1)}</td>`,
                `<td>${format(category.sharePercent, 1)}%</td>`,
                `<td>${format(category.shootTimeMs, 0)} ms</td>`,
                `<td>${format(requiredExitMarginIn, 2)} in</td>`,
                '</tr>'
            ].join('');
        }).join('');
    }

    function buildExampleSummaryRows(example) {
        return [
            ['Weighted Shoot Time', `${formatMaybeInfinite(example.weightedShootTimeMs, 2)} ms`],
            ['Time Per Target', `${formatMaybeInfinite(example.timePerTargetMs, 2)} ms`],
            ['Capacity', `${formatMaybeInfinite(example.capacityTargetsPerSecond, 2)} targets/sec`],
            ['Raw Speed', `${formatMaybeInfinite(example.rawSpeedMph, 4)} mph`],
            ['Headroom Speed', `${formatMaybeInfinite(example.headroomMph, 4)} mph`],
            ['Applied Speed', `${formatMaybeInfinite(example.appliedSpeedMph, 4)} mph`],
            ['Target Inflow', `${formatMaybeInfinite(example.inflowTargetsPerSecond, 2)} targets/sec`],
            ['Overload Ratio', `${formatMaybeInfinite(example.overloadRatio, 3)}x`]
        ].map(([label, value]) => (
            `<tr><th scope="row">${label}</th><td>${value}</td></tr>`
        )).join('');
    }

    function renderMathReference() {
        const categories = Array.isArray(state.model.weedCategories) ? state.model.weedCategories : [];
        const liveExample = buildWorkedExample({
            categories,
            bandWidthIn: state.band.width,
            overheadMs: Number(dom.overheadSlider.value),
            utilizationPercent: state.model.speedUtilizationPercent,
            speedCapMph: 3
        });
        const referenceExample = buildWorkedExample({
            categories: [
                {
                    id: 'example-broadleaf',
                    name: 'Example Broadleaf',
                    visualType: 'broadleaf',
                    densityPerSqFt: 60,
                    shootTimeMs: 400
                }
            ],
            bandWidthIn: 24,
            overheadMs: 60,
            utilizationPercent: 99,
            speedCapMph: 3
        });

        const mixNumeratorText = buildMixNumeratorText(liveExample.mix.categories);
        const liveConsistencyLine = liveExample.isCapped
            ? 'Consistency check: applied speed is capped, so inflow/capacity can be below utilization target.'
            : `Consistency check: inflow/capacity = ${formatMaybeInfinite(liveExample.overloadRatio, 3)}x (matches utilization ratio ${format(liveExample.utilizationPercent / 100, 3)}).`;
        const liveCategoryRows = buildMathCategoryRows(liveExample);

        dom.mathReferenceContent.innerHTML = [
            '<section class="math-card">',
            '<h3>Throughput Math (Live Inputs)</h3>',
            '<p class="math-note">Overhead includes scanner movement and control latency between targets.</p>',
            '<ol class="math-steps">',
            `<li><code>weighted_shoot_time_ms = (${mixNumeratorText}) / ${format(liveExample.mix.totalDensityPerSqFt, 1)}</code><span>= ${formatMaybeInfinite(liveExample.weightedShootTimeMs, 2)} ms</span></li>`,
            `<li><code>time_per_target_ms = weighted_shoot_time_ms + overhead_ms</code><span>= ${formatMaybeInfinite(liveExample.timePerTargetMs, 2)} ms</span></li>`,
            `<li><code>capacity_targets_per_sec = ${liveExample.scannerCount} * (1000 / time_per_target_ms)</code><span>= ${formatMaybeInfinite(liveExample.capacityTargetsPerSecond, 2)} /sec</span></li>`,
            `<li><code>targets_per_inch = total_density * band_width / 144</code><span>= ${formatMaybeInfinite(liveExample.targetsPerInch, 4)} targets/in</span></li>`,
            `<li><code>raw_speed_mph = (capacity / targets_per_inch) * 3600 / 63360</code><span>= ${formatMaybeInfinite(liveExample.rawSpeedMph, 4)} mph</span></li>`,
            `<li><code>headroom_speed_mph = raw_speed_mph * (utilization/100)</code><span>= ${formatMaybeInfinite(liveExample.headroomMph, 4)} mph</span></li>`,
            `<li><code>applied_speed_mph = min(headroom_speed_mph, ${format(liveExample.speedCapMph, 1)})</code><span>= ${formatMaybeInfinite(liveExample.appliedSpeedMph, 4)} mph</span></li>`,
            `<li><code>inflow_targets_per_sec = total_density * band_width * applied_ips / 144</code><span>= ${formatMaybeInfinite(liveExample.inflowTargetsPerSecond, 2)} /sec</span></li>`,
            `<li><code>overload_ratio = inflow / capacity</code><span>= ${formatMaybeInfinite(liveExample.overloadRatio, 3)}x</span></li>`,
            '</ol>',
            `<p class="math-note">${liveConsistencyLine}</p>`,
            '</section>',
            '<section class="math-card">',
            '<h3>Category Mix and Exit Margin</h3>',
            '<p class="math-note">A target is skipped when remaining vertical distance is less than required exit margin.</p>',
            '<div class="math-table-wrap">',
            '<table class="math-table">',
            '<thead><tr><th>Category</th><th>Type</th><th>Density</th><th>Share</th><th>Shoot Time</th><th>Required Exit Margin</th></tr></thead>',
            `<tbody>${liveCategoryRows}</tbody>`,
            '</table>',
            '</div>',
            `<p class="math-note"><code>required_exit_margin_in = applied_ips * (category_shoot_time_ms / 1000)</code></p>`,
            '</section>',
            '<section class="math-card">',
            '<h3>Reference Worked Example (Single Category)</h3>',
            '<p class="math-note">Example input: density 60 weeds/sq ft, shoot time 400 ms, overhead 60 ms, band 24 in, utilization 99%.</p>',
            '<div class="math-table-wrap">',
            '<table class="math-table math-summary-table">',
            `<tbody>${buildExampleSummaryRows(referenceExample)}</tbody>`,
            '</table>',
            '</div>',
            '</section>',
            '<section class="math-card">',
            '<h3>Assumptions and Non-Obvious Behavior</h3>',
            '<ul class="math-list">',
            '<li>Throughput uses weighted average shoot time across categories.</li>',
            '<li>Per-target viability uses each weed\'s own shoot time for exit-margin checks.</li>',
            '<li>Scanner cooldown currently uses average time-per-target (mean-field approximation).</li>',
            '<li>Visual size is educational: 20 ms is minimum glyph size and 3000 ms is legacy max glyph size.</li>',
            '<li>When total density is zero, raw speed can be mathematically unbounded, but applied speed is clamped by finite-input handling.</li>',
            '</ul>',
            '</section>'
        ].join('');
    }

    function updateMetrics() {
        let activeTargets = 0;
        const activeTargetsByCategory = new Map();
        for (const weed of state.weeds) {
            if (weed.shot) {
                continue;
            }
            if (weed.yIn < 0 || weed.yIn > core.SCAN_HEIGHT_IN) {
                continue;
            }
            if (weed.xIn < state.band.start || weed.xIn > state.band.end) {
                continue;
            }

            activeTargets += 1;
            const categoryId = String(weed.categoryId ?? '');
            activeTargetsByCategory.set(
                categoryId,
                (activeTargetsByCategory.get(categoryId) ?? 0) + 1
            );
        }

        const queueDepth = activeTargets;
        const totalResolved = state.stats.fullyShot + state.stats.partial + state.stats.missed;
        const hitRate = totalResolved > 0 ? (state.stats.fullyShot / totalResolved) * 100 : 0;
        const density = Number(state.model.totalDensityPerSqFt);
        const shotLineLabel = state.stats.shotSamples > 0
            ? format(state.stats.shotLineYMeanIn, 2)
            : 'N/A';
        const shotMarginLabel = state.stats.shotMarginSamples > 0
            ? format(state.stats.shotExitMarginMeanSec, 2)
            : 'N/A';

        dom.appliedSpeedMph.textContent = format(state.model.appliedSpeedMph, 2);
        dom.speedCapNote.classList.toggle('hidden', !state.model.isCapped);

        dom.densityReadout.textContent = format(density, 2);
        dom.bandedShareReadout.textContent = format(state.model.bandedSharePercent, 2);
        dom.bandedShareFill.style.width = `${format(state.model.bandedSharePercent, 2)}%`;
        dom.bandWidthReadout.textContent = format(state.band.width, 2);
        dom.coverageReadout.textContent = format(state.model.coverageRatio * 100, 2);
        dom.coverageGapReadout.textContent = format(state.model.coverageGapIn, 2);
        dom.coverageWarning.classList.toggle('hidden', !state.model.hasCoverageGap);
        dom.activeTargetsReadout.textContent = String(activeTargets);
        dom.queueDepthReadout.textContent = String(queueDepth);
        dom.shotsReadout.textContent = String(state.stats.shots);
        dom.missedReadout.textContent = String(state.stats.missed);
        dom.partialReadout.textContent = String(state.stats.partial);
        dom.hitRateReadout.textContent = format(hitRate, 2);
        dom.shotLineReadout.textContent = shotLineLabel;
        dom.shotMarginReadout.textContent = shotMarginLabel;
        dom.queueGrowthReadout.textContent = format(state.stats.queueGrowthEwmaPerSec, 2);
        renderCategoryMetrics(activeTargetsByCategory);

        const elapsedSeconds = state.stats.elapsedMs / 1000;
        const elapsedMinutes = elapsedSeconds / 60;
        const shotsPerSecond = elapsedSeconds > 0 ? state.stats.shots / elapsedSeconds : 0;
        const shotsPerMinute = shotsPerSecond * 60;
        const shotsPerHour = shotsPerMinute * 60;
        const scannerMaxShotsPerSecond = state.model.timePerTargetMs > 0
            ? 1000 / state.model.timePerTargetMs
            : 0;
        const scannerAShotsPerSecond = elapsedSeconds > 0
            ? state.scanners[0].shots / elapsedSeconds
            : 0;
        const scannerBShotsPerSecond = elapsedSeconds > 0
            ? state.scanners[1].shots / elapsedSeconds
            : 0;
        const scannerAUtilizationPercent = scannerMaxShotsPerSecond > 0
            ? (scannerAShotsPerSecond / scannerMaxShotsPerSecond) * 100
            : 0;
        const scannerBUtilizationPercent = scannerMaxShotsPerSecond > 0
            ? (scannerBShotsPerSecond / scannerMaxShotsPerSecond) * 100
            : 0;
        const scannerADutyCyclePercent = Math.min(
            100,
            scannerAShotsPerSecond * (state.model.shootTimeMs / 1000) * 100
        );
        const scannerBDutyCyclePercent = Math.min(
            100,
            scannerBShotsPerSecond * (state.model.shootTimeMs / 1000) * 100
        );

        dom.elapsedReadout.textContent = `${format(elapsedSeconds, 1)} s (${format(elapsedMinutes, 2)} min)`;
        dom.shotsPerSecondReadout.textContent = format(shotsPerSecond, 2);
        dom.shotsPerMinuteReadout.textContent = format(shotsPerMinute, 2);
        dom.shotsPerHourReadout.textContent = format(shotsPerHour, 2);
        dom.scannerAUtilReadout.textContent = format(scannerAUtilizationPercent, 2);
        dom.scannerBUtilReadout.textContent = format(scannerBUtilizationPercent, 2);
        dom.scannerADutyReadout.textContent = format(scannerADutyCyclePercent, 2);
        dom.scannerBDutyReadout.textContent = format(scannerBDutyCyclePercent, 2);
        dom.inflowReadout.textContent = format(state.model.inflowTargetsPerSecond, 2);
        dom.capacityReadout.textContent = format(state.model.capacityTargetsPerSecond, 2);

        dom.rawSpeedReadout.textContent = format(state.model.rawSpeedMph, 2);
        dom.utilizedSpeedReadout.textContent = format(state.model.utilizedRawSpeedMph, 2);
        dom.appliedSpeedReadout.textContent = format(state.model.appliedSpeedMph, 2);
        dom.utilizationTargetReadout.textContent = format(state.model.speedUtilizationPercent, 0);
        dom.shootTimeReadout.textContent = format(state.model.shootTimeMs, 2);
        dom.overheadReadout.textContent = format(Number(dom.overheadSlider.value), 2);
        dom.timePerTargetReadout.textContent = format(state.model.timePerTargetMs, 2);
        dom.targetingPolicyReadout.textContent = state.model.targetingPolicy;
        dom.overloadRatioReadout.textContent = format(state.model.overloadRatio, 2);
        dom.centerPriorityActiveReadout.textContent = state.model.centerPriorityActive ? 'Yes' : 'No';
        dom.centerPriorityWidthReadout.textContent = format(state.model.centerPriorityWidthIn, 1);
        dom.targetMidlineReadout.textContent = format(state.model.targetMidlineYIn, 1);
        dom.targetUrgentReadout.textContent = format(state.model.targetUrgentYIn, 1);
        dom.scannerARangeReadout.textContent = `${format(state.zones.scannerA.start, 1)} - ${format(state.zones.scannerA.end, 1)}`;
        dom.scannerBRangeReadout.textContent = `${format(state.zones.scannerB.start, 1)} - ${format(state.zones.scannerB.end, 1)}`;

        const coverage = state.coverage;
        const activePassLabel = coverage.activePassNumber
            ? `${coverage.activePassNumber} (${format(coverage.activePassCoveragePercent, 1)}%)`
            : (coverage.completionPercent >= 100 ? 'Complete' : 'N/A');

        dom.coverageSpeedReadout.textContent = format(state.model.appliedSpeedMph, 2);
        dom.coverageTravelFpsReadout.textContent = format(coverage.travelFeetPerSecond, 2);
        dom.coverageRateSqFtHourReadout.textContent = format(coverage.coverageSqFtPerHour, 2);
        dom.coverageRateAcresHourReadout.textContent = format(coverage.coverageAcresPerHour, 3);
        dom.coverageFieldAreaReadout.textContent = format(coverage.fieldAreaAcres, 2);
        dom.coverageFieldWidthReadout.textContent = format(coverage.fieldWidthFt, 2);
        dom.coverageHoursToFinishReadout.textContent = formatFinite(coverage.timeToCoverHours, 2);
        dom.coverageCoveredAreaReadout.textContent = format(coverage.coveredAcres, 2);
        dom.coveragePercentReadout.textContent = format(coverage.completionPercent, 2);
        dom.coveragePassesReadout.textContent = `${coverage.completedPasses} / ${coverage.totalPasses}`;
        dom.coverageActivePassReadout.textContent = activePassLabel;

        dom.visualMachineWidthReadout.textContent = `${format(coverage.machineWidthFt, 1)}`;
        dom.visualFieldReadout.textContent = `${format(coverage.fieldAreaAcres, 1)} ac ${coverage.fieldShapeLabel}`;
        dom.visualRateReadout.textContent = format(coverage.coverageAcresPerHour, 2);
        dom.visualCompletionReadout.textContent = format(coverage.completionPercent, 1);
        renderMathReference();

        if (state.recording.isActive) {
            const elapsedRecordingMs = Math.max(0, state.stats.elapsedMs - state.recording.startedElapsedMs);
            const remainingMs = Math.max(0, state.recording.limitMs - elapsedRecordingMs);
            dom.recordPassButton.textContent = 'Stop Recording';
            dom.recordPassStatus.textContent = `Recording · ${format(remainingMs / 1000, 1)}s left`;
        } else {
            dom.recordPassButton.textContent = 'Record 30s Pass';
            dom.recordPassStatus.textContent = 'Idle · captures next 30.0s';
        }

        renderPassSnapshots();
        renderActiveSnapshotDetail();
    }

    return {
        format,
        updateMetrics,
        openSnapshotDetail,
        closeSnapshotDetail,
        openSnapshotFromEventTarget
    };
}
