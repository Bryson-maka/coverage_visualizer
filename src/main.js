import core from './app/core.js';
import { APP_CONFIG } from './app/config.js';
import { getDomRefs } from './app/dom.js';
import { createInitialState } from './app/state.js';
import { createRenderer } from './app/render.js';
import { createMetricsPresenter } from './app/metrics.js';
import { createModelController } from './app/model.js';
import { createSimulationEngine } from './app/engine.js';

const dom = getDomRefs();
const state = createInitialState(core, APP_CONFIG);
const renderer = createRenderer({ dom, state, core, config: APP_CONFIG });
const metrics = createMetricsPresenter({ dom, state, core });
const model = createModelController({ core, dom, state, renderer, metrics, config: APP_CONFIG });
const engine = createSimulationEngine({ core, dom, state, renderer, metrics, config: APP_CONFIG });

function setMetricsTab(activeTab) {
    const showingCoverage = activeTab === 'coverage';

    dom.metricsTabSimulation.classList.toggle('is-active', !showingCoverage);
    dom.metricsTabCoverage.classList.toggle('is-active', showingCoverage);
    dom.metricsTabSimulation.setAttribute('aria-selected', String(!showingCoverage));
    dom.metricsTabCoverage.setAttribute('aria-selected', String(showingCoverage));

    dom.metricsPanelSimulation.classList.toggle('hidden', showingCoverage);
    dom.metricsPanelCoverage.classList.toggle('hidden', !showingCoverage);
}

function bindEvents() {
    const controls = [
        dom.densitySlider,
        dom.sizeSlider,
        dom.bandWidthSlider,
        dom.scannerAEndSlider,
        dom.scannerBStartSlider,
        dom.overheadSlider
    ];

    controls.forEach((control) => {
        control.addEventListener('input', () => {
            engine.setRunning(false);
            engine.resetSimulationState();
            model.recomputeModel();
        });
    });

    dom.runButton.addEventListener('click', () => {
        engine.setRunning(true);
    });

    dom.pauseButton.addEventListener('click', () => {
        engine.setRunning(false);
    });

    dom.resetButton.addEventListener('click', () => {
        engine.setRunning(false);
        engine.resetSimulationState();
        model.recomputeModel();
    });

    dom.metricsTabSimulation.addEventListener('click', () => {
        setMetricsTab('simulation');
    });

    dom.metricsTabCoverage.addEventListener('click', () => {
        setMetricsTab('coverage');
    });
}

function init() {
    bindEvents();
    setMetricsTab('simulation');
    engine.setRunning(false);
    renderer.renderGrid();
    model.recomputeModel();
    engine.resetSimulationState();
    engine.startLoop();
}

init();
