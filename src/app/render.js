export function createRenderer({ dom, state, core, config }) {
    const pxPerInX = config.SCAN_DRAW_WIDTH_PX / core.SCAN_WIDTH_IN;
    const pxPerInY = config.SCAN_DRAW_HEIGHT_PX / core.SCAN_HEIGHT_IN;
    const plantPxPerIn = Math.min(pxPerInX, pxPerInY);
    const coverageDrawPx = config.COVERAGE_DRAW_SIZE_PX;
    const coveragePadPx = config.SCAN_PADDING_PX;

    function inToPxX(inches) {
        return config.SCAN_PADDING_PX + inches * pxPerInX;
    }

    function inToPxY(inches) {
        return config.SCAN_PADDING_PX + inches * pxPerInY;
    }

    function createSvgElement(tagName) {
        return document.createElementNS(config.SVG_NS, tagName);
    }

    function renderGrid() {
        dom.gridLayer.innerHTML = '';

        for (let inch = 0; inch <= core.SCAN_WIDTH_IN; inch += 1) {
            const xPosition = inToPxX(inch);

            const vertical = createSvgElement('line');
            vertical.setAttribute('x1', String(xPosition));
            vertical.setAttribute('x2', String(xPosition));
            vertical.setAttribute('y1', String(config.SCAN_PADDING_PX));
            vertical.setAttribute('y2', String(config.SCAN_PADDING_PX + config.SCAN_DRAW_HEIGHT_PX));
            vertical.setAttribute('class', inch % 5 === 0 ? 'grid-line-major' : 'grid-line');
            dom.gridLayer.appendChild(vertical);
        }

        for (let inch = 0; inch <= core.SCAN_HEIGHT_IN; inch += 1) {
            const yPosition = inToPxY(inch);

            const horizontal = createSvgElement('line');
            horizontal.setAttribute('x1', String(config.SCAN_PADDING_PX));
            horizontal.setAttribute('x2', String(config.SCAN_PADDING_PX + config.SCAN_DRAW_WIDTH_PX));
            horizontal.setAttribute('y1', String(yPosition));
            horizontal.setAttribute('y2', String(yPosition));
            horizontal.setAttribute('class', inch % 5 === 0 ? 'grid-line-major' : 'grid-line');
            dom.gridLayer.appendChild(horizontal);
        }
    }

    function renderStaticLayers() {
        dom.bandLayer.innerHTML = '';
        dom.zoneLayer.innerHTML = '';

        const bandRect = createSvgElement('rect');
        bandRect.setAttribute('x', String(inToPxX(state.band.start)));
        bandRect.setAttribute('y', String(config.SCAN_PADDING_PX));
        bandRect.setAttribute('width', String(state.band.width * pxPerInX));
        bandRect.setAttribute('height', String(config.SCAN_DRAW_HEIGHT_PX));
        bandRect.setAttribute('class', 'band-fill');
        dom.bandLayer.appendChild(bandRect);

        const scannerARect = createSvgElement('rect');
        scannerARect.setAttribute('x', String(inToPxX(state.zones.scannerA.start)));
        scannerARect.setAttribute('y', String(config.SCAN_PADDING_PX));
        scannerARect.setAttribute('width', String((state.zones.scannerA.end - state.zones.scannerA.start) * pxPerInX));
        scannerARect.setAttribute('height', String(config.SCAN_DRAW_HEIGHT_PX));
        scannerARect.setAttribute('class', 'zone-a-fill');
        dom.zoneLayer.appendChild(scannerARect);

        const scannerBRect = createSvgElement('rect');
        scannerBRect.setAttribute('x', String(inToPxX(state.zones.scannerB.start)));
        scannerBRect.setAttribute('y', String(config.SCAN_PADDING_PX));
        scannerBRect.setAttribute('width', String((state.zones.scannerB.end - state.zones.scannerB.start) * pxPerInX));
        scannerBRect.setAttribute('height', String(config.SCAN_DRAW_HEIGHT_PX));
        scannerBRect.setAttribute('class', 'zone-b-fill');
        dom.zoneLayer.appendChild(scannerBRect);

        const scannerASeparator = createSvgElement('line');
        const scannerABarX = inToPxX(state.zones.scannerA.end);
        scannerASeparator.setAttribute('x1', String(scannerABarX));
        scannerASeparator.setAttribute('x2', String(scannerABarX));
        scannerASeparator.setAttribute('y1', String(config.SCAN_PADDING_PX));
        scannerASeparator.setAttribute('y2', String(config.SCAN_PADDING_PX + config.SCAN_DRAW_HEIGHT_PX));
        scannerASeparator.setAttribute('class', 'zone-separator-a');
        dom.zoneLayer.appendChild(scannerASeparator);

        const scannerBSeparator = createSvgElement('line');
        const scannerBBarX = inToPxX(state.zones.scannerB.start);
        scannerBSeparator.setAttribute('x1', String(scannerBBarX));
        scannerBSeparator.setAttribute('x2', String(scannerBBarX));
        scannerBSeparator.setAttribute('y1', String(config.SCAN_PADDING_PX));
        scannerBSeparator.setAttribute('y2', String(config.SCAN_PADDING_PX + config.SCAN_DRAW_HEIGHT_PX));
        scannerBSeparator.setAttribute('class', 'zone-separator-b');
        dom.zoneLayer.appendChild(scannerBSeparator);
    }

    function renderWeeds() {
        dom.weedLayer.innerHTML = '';

        const fragment = document.createDocumentFragment();
        const activeShotDurationMs = Math.max(0, Number(state.model.shootTimeMs));

        for (const weed of state.weeds) {
            if (weed.yIn < -0.5 || weed.yIn > core.SCAN_HEIGHT_IN + 0.5) {
                continue;
            }

            const visual = core.computeWeedVisualProfile(weed.size, weed.type);
            const leafLengthPx = visual.leafLengthIn * plantPxPerIn * config.PLANT_VISUAL_MAGNIFICATION;

            const group = createSvgElement('g');
            group.setAttribute(
                'transform',
                `translate(${inToPxX(weed.xIn)} ${inToPxY(weed.yIn)}) rotate(${weed.rotationDeg})`
            );

            let visualStateClass = 'weed-live';
            if (weed.shot) {
                visualStateClass = weed.shotAgeMs < activeShotDurationMs ? 'weed-shooting' : 'weed-dead';
            }

            for (let leafIndex = 0; leafIndex < visual.leafCount; leafIndex += 1) {
                const path = createSvgElement('path');
                const angle = (leafIndex / visual.leafCount) * 360;
                const rotation = weed.type === 'grass' ? angle - 10 : angle;

                path.setAttribute('d', weed.type === 'broadleaf' ? config.BROADLEAF_LEAF_PATH : config.GRASS_LEAF_PATH);
                path.setAttribute('transform', `rotate(${rotation}) scale(${leafLengthPx})`);
                path.setAttribute('class', `weed-leaf weed-${weed.type} ${visualStateClass}`);
                group.appendChild(path);
            }

            fragment.appendChild(group);
        }

        dom.weedLayer.appendChild(fragment);
    }

    function renderCoverageField() {
        dom.coverageFieldLayer.innerHTML = '';

        const plan = state.coverage;
        if (!plan || plan.fieldAreaSqFt <= 0 || plan.fieldWidthFt <= 0 || plan.fieldHeightFt <= 0) {
            return;
        }

        const fieldWidthFt = plan.fieldWidthFt;
        const fieldHeightFt = plan.fieldHeightFt;

        const toPxX = (xFt) => coveragePadPx + (xFt / fieldWidthFt) * coverageDrawPx;
        const toPxY = (yFt) => coveragePadPx + (yFt / fieldHeightFt) * coverageDrawPx;

        const drawGroup = createSvgElement('g');

        const fillGroup = createSvgElement('g');
        let overlayBoundary;

        if (plan.fieldShape === 'circle') {
            const defs = createSvgElement('defs');
            const clipPath = createSvgElement('clipPath');
            clipPath.setAttribute('id', 'coverage-field-clip');

            const circle = createSvgElement('circle');
            circle.setAttribute('cx', String(coveragePadPx + (coverageDrawPx / 2)));
            circle.setAttribute('cy', String(coveragePadPx + (coverageDrawPx / 2)));
            circle.setAttribute('r', String(coverageDrawPx / 2));
            clipPath.appendChild(circle);

            defs.appendChild(clipPath);
            drawGroup.appendChild(defs);
            fillGroup.setAttribute('clip-path', 'url(#coverage-field-clip)');

            overlayBoundary = createSvgElement('circle');
            overlayBoundary.setAttribute('cx', String(coveragePadPx + (coverageDrawPx / 2)));
            overlayBoundary.setAttribute('cy', String(coveragePadPx + (coverageDrawPx / 2)));
            overlayBoundary.setAttribute('r', String(coverageDrawPx / 2));
            overlayBoundary.setAttribute('class', 'coverage-field-boundary');
        } else {
            overlayBoundary = createSvgElement('rect');
            overlayBoundary.setAttribute('x', String(coveragePadPx));
            overlayBoundary.setAttribute('y', String(coveragePadPx));
            overlayBoundary.setAttribute('width', String(coverageDrawPx));
            overlayBoundary.setAttribute('height', String(coverageDrawPx));
            overlayBoundary.setAttribute('class', 'coverage-field-boundary');
        }

        const base = createSvgElement('rect');
        base.setAttribute('x', String(coveragePadPx));
        base.setAttribute('y', String(coveragePadPx));
        base.setAttribute('width', String(coverageDrawPx));
        base.setAttribute('height', String(coverageDrawPx));
        base.setAttribute('class', 'coverage-field-uncovered');
        fillGroup.appendChild(base);

        for (const pass of plan.passes) {
            const xStartPx = toPxX(pass.xStartFt);
            const passWidthPx = Math.max(0, toPxX(pass.xEndFt) - xStartPx);

            const separator = createSvgElement('line');
            separator.setAttribute('x1', String(xStartPx));
            separator.setAttribute('x2', String(xStartPx));
            separator.setAttribute('y1', String(coveragePadPx));
            separator.setAttribute('y2', String(coveragePadPx + coverageDrawPx));
            separator.setAttribute('class', 'coverage-pass-separator');
            fillGroup.appendChild(separator);

            if (pass.coverageFraction <= 0 || passWidthPx <= 0) {
                continue;
            }

            const filled = createSvgElement('rect');
            filled.setAttribute('x', String(xStartPx));
            filled.setAttribute('y', String(coveragePadPx));
            filled.setAttribute('width', String(passWidthPx * (pass.paintWidthFraction ?? pass.coverageFraction)));
            filled.setAttribute('height', String(coverageDrawPx));
            filled.setAttribute('class', 'coverage-field-covered');
            fillGroup.appendChild(filled);
        }

        const finalSeparator = createSvgElement('line');
        finalSeparator.setAttribute('x1', String(coveragePadPx + coverageDrawPx));
        finalSeparator.setAttribute('x2', String(coveragePadPx + coverageDrawPx));
        finalSeparator.setAttribute('y1', String(coveragePadPx));
        finalSeparator.setAttribute('y2', String(coveragePadPx + coverageDrawPx));
        finalSeparator.setAttribute('class', 'coverage-pass-separator');
        fillGroup.appendChild(finalSeparator);

        if (plan.activePassNumber) {
            const activePass = plan.passes[plan.activePassNumber - 1];
            if (activePass) {
                const activeBox = createSvgElement('rect');
                activeBox.setAttribute('x', String(toPxX(activePass.xStartFt)));
                activeBox.setAttribute('y', String(coveragePadPx));
                activeBox.setAttribute('width', String(toPxX(activePass.xEndFt) - toPxX(activePass.xStartFt)));
                activeBox.setAttribute('height', String(coverageDrawPx));
                activeBox.setAttribute('class', 'coverage-active-pass-box');
                fillGroup.appendChild(activeBox);
            }
        }

        if (plan.passes.length > 0) {
            let markerXFt = 0;
            let markerYFt = 0;

            if (plan.activePassNumber) {
                const activePass = plan.passes[plan.activePassNumber - 1];
                markerXFt = activePass.xStartFt + (activePass.widthFt * activePass.coverageFraction);
                markerYFt = activePass.index % 2 === 0 ? fieldHeightFt : 0;
            } else if (plan.completionPercent >= 100) {
                const lastPass = plan.passes[plan.passes.length - 1];
                markerXFt = lastPass.xEndFt;
                markerYFt = lastPass.index % 2 === 0 ? fieldHeightFt : 0;
            }

            const marker = createSvgElement('circle');
            marker.setAttribute('cx', String(toPxX(markerXFt)));
            marker.setAttribute('cy', String(toPxY(markerYFt)));
            marker.setAttribute('r', '4.5');
            marker.setAttribute('class', 'coverage-tractor-marker');
            fillGroup.appendChild(marker);
        }

        drawGroup.appendChild(fillGroup);
        drawGroup.appendChild(overlayBoundary);
        dom.coverageFieldLayer.appendChild(drawGroup);
    }

    return {
        inToPxX,
        inToPxY,
        pxPerInX,
        pxPerInY,
        renderGrid,
        renderStaticLayers,
        renderWeeds,
        renderCoverageField
    };
}
