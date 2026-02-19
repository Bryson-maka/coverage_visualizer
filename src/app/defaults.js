import { APP_CONFIG } from './config.js';

const STORAGE_KEY = 'laserweeder.defaults.v1';

const FIELD_DEFAULTS = Object.freeze({
    densityPerSqFt: {
        domKey: 'densitySlider',
        kind: 'number',
        fallback: APP_CONFIG.DEFAULT_DENSITY_PER_SQFT
    },
    weedSize: {
        domKey: 'sizeSlider',
        kind: 'number',
        fallback: APP_CONFIG.DEFAULT_WEED_SIZE
    },
    bandWidthIn: {
        domKey: 'bandWidthSlider',
        kind: 'number',
        fallback: APP_CONFIG.INITIAL_BAND_WIDTH_IN
    },
    scannerARightIn: {
        domKey: 'scannerAEndSlider',
        kind: 'number',
        fallback: APP_CONFIG.INITIAL_SCANNER_A_RIGHT_IN
    },
    scannerBLeftIn: {
        domKey: 'scannerBStartSlider',
        kind: 'number',
        fallback: APP_CONFIG.INITIAL_SCANNER_B_LEFT_IN
    },
    overheadMs: {
        domKey: 'overheadSlider',
        kind: 'number',
        fallback: APP_CONFIG.DEFAULT_OVERHEAD_MS
    },
    speedUtilizationPercent: {
        domKey: 'speedUtilizationSlider',
        kind: 'number',
        fallback: APP_CONFIG.DEFAULT_SPEED_UTILIZATION_PERCENT
    },
    targetingPolicy: {
        domKey: 'targetingPolicySelect',
        kind: 'select',
        fallback: APP_CONFIG.DEFAULT_TARGETING_POLICY
    },
    targetMidlineYIn: {
        domKey: 'targetMidlineSlider',
        kind: 'number',
        fallback: APP_CONFIG.DEFAULT_TARGET_MIDLINE_Y_IN
    },
    targetUrgentYIn: {
        domKey: 'targetUrgentSlider',
        kind: 'number',
        fallback: APP_CONFIG.DEFAULT_TARGET_URGENT_Y_IN
    },
    machineWidthFt: {
        domKey: 'machineWidthInput',
        kind: 'number',
        fallback: APP_CONFIG.DEFAULT_MACHINE_WIDTH_FT
    },
    fieldAreaAcres: {
        domKey: 'fieldAreaInput',
        kind: 'number',
        fallback: APP_CONFIG.DEFAULT_FIELD_AREA_ACRES
    },
    fieldShape: {
        domKey: 'fieldShapeSelect',
        kind: 'select',
        fallback: APP_CONFIG.DEFAULT_FIELD_SHAPE
    },
    coverageEfficiencyPercent: {
        domKey: 'coverageEfficiencySlider',
        kind: 'number',
        fallback: APP_CONFIG.DEFAULT_FIELD_EFFICIENCY_PERCENT
    },
    coverageHours: {
        domKey: 'coverageHoursSlider',
        kind: 'number',
        fallback: APP_CONFIG.DEFAULT_COVERAGE_TIME_HOURS
    }
});

function safeParseStoredDefaults(rawValue) {
    if (!rawValue) {
        return {};
    }

    try {
        const parsed = JSON.parse(rawValue);
        if (parsed && typeof parsed === 'object') {
            return parsed;
        }
    } catch (error) {
        // Ignore malformed local storage payload and fall back to defaults.
    }

    return {};
}

function loadStoredDefaults() {
    return safeParseStoredDefaults(window.localStorage.getItem(STORAGE_KEY));
}

function saveStoredDefaults(payload) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function toNumber(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function sanitizeNumericValue(element, value, fallback) {
    let numeric = toNumber(value, fallback);

    const min = toNumber(element.min, Number.NEGATIVE_INFINITY);
    const max = toNumber(element.max, Number.POSITIVE_INFINITY);

    numeric = Math.max(min, Math.min(max, numeric));
    return numeric;
}

function sanitizeSelectValue(element, value, fallback) {
    const options = new Set(Array.from(element.options).map((option) => option.value));

    if (options.has(String(value))) {
        return String(value);
    }

    if (options.has(String(fallback))) {
        return String(fallback);
    }

    return element.options.length > 0 ? element.options[0].value : '';
}

function readInputValue(definition, element) {
    if (definition.kind === 'number') {
        return sanitizeNumericValue(element, element.value, definition.fallback);
    }

    return sanitizeSelectValue(element, element.value, definition.fallback);
}

function sanitizeValue(definition, element, rawValue) {
    if (definition.kind === 'number') {
        return sanitizeNumericValue(element, rawValue, definition.fallback);
    }

    return sanitizeSelectValue(element, rawValue, definition.fallback);
}

function applyValueToElement(element, value) {
    element.value = String(value);
}

function withSavedBadge(button, message) {
    const originalText = button.textContent;
    button.classList.add('is-saved');
    button.textContent = message;

    window.setTimeout(() => {
        button.classList.remove('is-saved');
        button.textContent = originalText;
    }, 1200);
}

export function applyDefaultsToDom(dom) {
    const storedDefaults = loadStoredDefaults();

    Object.entries(FIELD_DEFAULTS).forEach(([key, definition]) => {
        const element = dom[definition.domKey];
        if (!element) {
            return;
        }

        const nextValue = sanitizeValue(definition, element, storedDefaults[key]);
        applyValueToElement(element, nextValue);
    });
}

export function bindDefaultControls({ dom, onDefaultsChanged }) {
    const buttons = Array.from(document.querySelectorAll('[data-default-key]'));

    buttons.forEach((button) => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            const key = button.getAttribute('data-default-key');
            const definition = FIELD_DEFAULTS[key];

            if (!definition) {
                return;
            }

            const element = dom[definition.domKey];
            const storedDefaults = loadStoredDefaults();
            storedDefaults[key] = readInputValue(definition, element);
            saveStoredDefaults(storedDefaults);

            withSavedBadge(button, 'Saved');
        });
    });

    dom.resetDefaultsButton.addEventListener('click', () => {
        window.localStorage.removeItem(STORAGE_KEY);
        applyDefaultsToDom(dom);
        withSavedBadge(dom.resetDefaultsButton, 'Defaults Reset');
        onDefaultsChanged();
    });
}
