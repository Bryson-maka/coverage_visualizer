export function createRenderer({ dom, state, core, config }) {
    const pxPerIn = config.SCAN_DRAW_SIZE_PX / core.SCAN_WIDTH_IN;

    function inToPx(inches) {
        return config.SCAN_PADDING_PX + inches * pxPerIn;
    }

    function createSvgElement(tagName) {
        return document.createElementNS(config.SVG_NS, tagName);
    }

    function renderGrid() {
        dom.gridLayer.innerHTML = '';

        for (let inch = 0; inch <= core.SCAN_WIDTH_IN; inch += 1) {
            const position = inToPx(inch);

            const vertical = createSvgElement('line');
            vertical.setAttribute('x1', String(position));
            vertical.setAttribute('x2', String(position));
            vertical.setAttribute('y1', String(config.SCAN_PADDING_PX));
            vertical.setAttribute('y2', String(config.SCAN_PADDING_PX + config.SCAN_DRAW_SIZE_PX));
            vertical.setAttribute('class', inch % 5 === 0 ? 'grid-line-major' : 'grid-line');
            dom.gridLayer.appendChild(vertical);

            const horizontal = createSvgElement('line');
            horizontal.setAttribute('x1', String(config.SCAN_PADDING_PX));
            horizontal.setAttribute('x2', String(config.SCAN_PADDING_PX + config.SCAN_DRAW_SIZE_PX));
            horizontal.setAttribute('y1', String(position));
            horizontal.setAttribute('y2', String(position));
            horizontal.setAttribute('class', inch % 5 === 0 ? 'grid-line-major' : 'grid-line');
            dom.gridLayer.appendChild(horizontal);
        }
    }

    function renderStaticLayers() {
        dom.bandLayer.innerHTML = '';
        dom.zoneLayer.innerHTML = '';

        const bandRect = createSvgElement('rect');
        bandRect.setAttribute('x', String(inToPx(state.band.start)));
        bandRect.setAttribute('y', String(config.SCAN_PADDING_PX));
        bandRect.setAttribute('width', String(state.band.width * pxPerIn));
        bandRect.setAttribute('height', String(config.SCAN_DRAW_SIZE_PX));
        bandRect.setAttribute('class', 'band-fill');
        dom.bandLayer.appendChild(bandRect);

        const scannerARect = createSvgElement('rect');
        scannerARect.setAttribute('x', String(inToPx(state.zones.scannerA.start)));
        scannerARect.setAttribute('y', String(config.SCAN_PADDING_PX));
        scannerARect.setAttribute('width', String((state.zones.scannerA.end - state.zones.scannerA.start) * pxPerIn));
        scannerARect.setAttribute('height', String(config.SCAN_DRAW_SIZE_PX));
        scannerARect.setAttribute('class', 'zone-a-fill');
        dom.zoneLayer.appendChild(scannerARect);

        const scannerBRect = createSvgElement('rect');
        scannerBRect.setAttribute('x', String(inToPx(state.zones.scannerB.start)));
        scannerBRect.setAttribute('y', String(config.SCAN_PADDING_PX));
        scannerBRect.setAttribute('width', String((state.zones.scannerB.end - state.zones.scannerB.start) * pxPerIn));
        scannerBRect.setAttribute('height', String(config.SCAN_DRAW_SIZE_PX));
        scannerBRect.setAttribute('class', 'zone-b-fill');
        dom.zoneLayer.appendChild(scannerBRect);

        const scannerASeparator = createSvgElement('line');
        const scannerABarX = inToPx(state.zones.scannerA.end);
        scannerASeparator.setAttribute('x1', String(scannerABarX));
        scannerASeparator.setAttribute('x2', String(scannerABarX));
        scannerASeparator.setAttribute('y1', String(config.SCAN_PADDING_PX));
        scannerASeparator.setAttribute('y2', String(config.SCAN_PADDING_PX + config.SCAN_DRAW_SIZE_PX));
        scannerASeparator.setAttribute('class', 'zone-separator-a');
        dom.zoneLayer.appendChild(scannerASeparator);

        const scannerBSeparator = createSvgElement('line');
        const scannerBBarX = inToPx(state.zones.scannerB.start);
        scannerBSeparator.setAttribute('x1', String(scannerBBarX));
        scannerBSeparator.setAttribute('x2', String(scannerBBarX));
        scannerBSeparator.setAttribute('y1', String(config.SCAN_PADDING_PX));
        scannerBSeparator.setAttribute('y2', String(config.SCAN_PADDING_PX + config.SCAN_DRAW_SIZE_PX));
        scannerBSeparator.setAttribute('class', 'zone-separator-b');
        dom.zoneLayer.appendChild(scannerBSeparator);
    }

    function renderWeeds() {
        dom.weedLayer.innerHTML = '';

        const fragment = document.createDocumentFragment();

        for (const weed of state.weeds) {
            if (weed.yIn < -0.5 || weed.yIn > core.SCAN_HEIGHT_IN + 0.5) {
                continue;
            }

            const visual = core.computeWeedVisualProfile(weed.size, weed.type);
            const leafLengthPx = visual.leafLengthIn * pxPerIn * config.PLANT_VISUAL_MAGNIFICATION;

            const group = createSvgElement('g');
            group.setAttribute(
                'transform',
                `translate(${inToPx(weed.xIn)} ${inToPx(weed.yIn)}) rotate(${weed.rotationDeg})`
            );

            for (let leafIndex = 0; leafIndex < visual.leafCount; leafIndex += 1) {
                const path = createSvgElement('path');
                const angle = (leafIndex / visual.leafCount) * 360;
                const rotation = weed.type === 'grass' ? angle - 10 : angle;

                path.setAttribute('d', weed.type === 'broadleaf' ? config.BROADLEAF_LEAF_PATH : config.GRASS_LEAF_PATH);
                path.setAttribute('transform', `rotate(${rotation}) scale(${leafLengthPx})`);
                path.setAttribute('class', `weed-leaf weed-${weed.type} ${weed.shot ? 'weed-shot' : 'weed-live'}`);
                group.appendChild(path);
            }

            fragment.appendChild(group);
        }

        dom.weedLayer.appendChild(fragment);
    }

    return {
        inToPx,
        pxPerIn,
        renderGrid,
        renderStaticLayers,
        renderWeeds
    };
}
