import core from './app/core.js';
import { APP_CONFIG } from './app/config.js';
import { getDomRefs } from './app/dom.js';
import { createInitialState } from './app/state.js';
import { createRenderer } from './app/render.js';
import { createMetricsPresenter } from './app/metrics.js';
import { createModelController } from './app/model.js';
import { createSimulationEngine } from './app/engine.js';
import { applyDefaultsToDom, bindDefaultControls } from './app/defaults.js';

const dom = getDomRefs();
applyDefaultsToDom(dom);
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
    dom.simulationVisualView.classList.toggle('hidden', showingCoverage);
    dom.coverageVisualView.classList.toggle('hidden', !showingCoverage);
}

function bindEvents() {
    const resetAndRecomputeSimulation = () => {
        engine.setRunning(false);
        engine.resetSimulationState();
        model.recomputeModel();
    };

    const simulationControls = [
        dom.densitySlider,
        dom.sizeSlider,
        dom.bandWidthSlider,
        dom.scannerAEndSlider,
        dom.scannerBStartSlider,
        dom.overheadSlider,
        dom.speedUtilizationSlider,
        dom.targetingPolicySelect,
        dom.targetMidlineSlider,
        dom.targetUrgentSlider
    ];

    simulationControls.forEach((control) => {
        if (control.tagName === 'SELECT') {
            control.addEventListener('change', resetAndRecomputeSimulation);
        } else {
            control.addEventListener('input', resetAndRecomputeSimulation);
        }
    });

    const coverageControls = [
        dom.machineWidthInput,
        dom.machineLengthInput,
        dom.fieldAreaInput,
        dom.fieldShapeSelect,
        dom.coverageEfficiencySlider,
        dom.coverageHoursSlider
    ];

    coverageControls.forEach((control) => {
        const updateCoverage = () => {
            model.recomputeModel();
        };

        if (control.tagName === 'SELECT') {
            control.addEventListener('change', updateCoverage);
        } else {
            control.addEventListener('input', updateCoverage);
        }
    });

    dom.runButton.addEventListener('click', () => {
        engine.setRunning(true);
    });

    dom.pauseButton.addEventListener('click', () => {
        engine.setRunning(false);
    });

    dom.resetButton.addEventListener('click', () => {
        resetAndRecomputeSimulation();
    });

    dom.metricsTabSimulation.addEventListener('click', () => {
        setMetricsTab('simulation');
    });

    dom.metricsTabCoverage.addEventListener('click', () => {
        setMetricsTab('coverage');
    });

    bindDefaultControls({
        dom,
        onDefaultsChanged: resetAndRecomputeSimulation
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
