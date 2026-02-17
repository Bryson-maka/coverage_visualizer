const core = globalThis.SimulatorCore;

if (!core) {
    throw new Error('SimulatorCore is not available. Ensure simulator-core.js loads before src/main.js.');
}

export default core;
