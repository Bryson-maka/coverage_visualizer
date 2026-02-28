function toNumber(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

export function createCategoryController({ core, dom, config, initialCategories }) {
    const shootTimeOptionsMs = core.getShootTimeInputOptionsMs();
    const maxShootTimeOptionIndex = Math.max(0, shootTimeOptionsMs.length - 1);
    const minDensity = config.WEED_CATEGORY_DENSITY_MIN_PER_SQFT;
    const maxDensity = config.WEED_CATEGORY_DENSITY_MAX_PER_SQFT;
    const nameMaxLength = 36;

    let nextCategoryId = 1;
    let onChangeHandler = () => {};
    let categories = [];

    function createCategoryId() {
        const id = `weed-category-${nextCategoryId}`;
        nextCategoryId += 1;
        return id;
    }

    function normalizeId(idValue) {
        const raw = String(idValue ?? '').trim();
        const safe = raw.replace(/[^a-zA-Z0-9_-]/g, '-');
        if (safe) {
            return safe;
        }
        return createCategoryId();
    }

    function normalizeName(name, fallbackIndex) {
        const trimmed = String(name ?? '').trim().slice(0, nameMaxLength);
        if (trimmed) {
            return trimmed;
        }
        return `Weed Category ${fallbackIndex + 1}`;
    }

    function normalizeType(visualType) {
        return visualType === 'grass' ? 'grass' : 'broadleaf';
    }

    function normalizeDensity(densityPerSqFt, fallbackDensity) {
        const rawDensity = toNumber(densityPerSqFt, fallbackDensity);
        const boundedDensity = core.clamp(rawDensity, minDensity, maxDensity);
        return Math.round(boundedDensity);
    }

    function normalizeShootTimeMs(shootTimeMs, fallbackShootTimeMs) {
        return core.normalizeShootTimeInputMs(toNumber(shootTimeMs, fallbackShootTimeMs));
    }

    function getDefaultCategoryTemplate(index) {
        const templates = Array.isArray(config.DEFAULT_WEED_CATEGORIES) ? config.DEFAULT_WEED_CATEGORIES : [];
        if (index < templates.length) {
            return templates[index];
        }

        return {
            name: `Weed Category ${index + 1}`,
            visualType: config.DEFAULT_WEED_CATEGORY_VISUAL_TYPE,
            densityPerSqFt: index === 0 ? config.DEFAULT_DENSITY_PER_SQFT : 0,
            shootTimeMs: config.DEFAULT_WEED_CATEGORY_SHOOT_TIME_MS
        };
    }

    function normalizeCategory(rawCategory, index) {
        const template = getDefaultCategoryTemplate(index);
        return {
            id: normalizeId(rawCategory?.id),
            name: normalizeName(rawCategory?.name, index),
            visualType: normalizeType(rawCategory?.visualType ?? template.visualType),
            densityPerSqFt: normalizeDensity(rawCategory?.densityPerSqFt, template.densityPerSqFt),
            shootTimeMs: normalizeShootTimeMs(rawCategory?.shootTimeMs, template.shootTimeMs)
        };
    }

    function normalizeCategoryList(rawCategories) {
        const input = Array.isArray(rawCategories) ? rawCategories : [];
        const normalized = input.map((category, index) => normalizeCategory(category, index));

        const usedIds = new Set();
        for (const category of normalized) {
            let candidateId = category.id;
            while (usedIds.has(candidateId)) {
                candidateId = createCategoryId();
            }
            category.id = candidateId;
            usedIds.add(candidateId);
        }

        if (normalized.length > 0) {
            return normalized;
        }

        return [normalizeCategory(null, 0)];
    }

    function totalDensityPerSqFt() {
        return categories.reduce((sum, category) => sum + category.densityPerSqFt, 0);
    }

    function sharePercent(categoryDensityPerSqFt, totalDensity) {
        if (totalDensity <= 0) {
            return 0;
        }
        return (categoryDensityPerSqFt / totalDensity) * 100;
    }

    function shootTimeToOptionIndex(shootTimeMs) {
        const normalizedShootTimeMs = core.normalizeShootTimeInputMs(shootTimeMs);
        const directIndex = shootTimeOptionsMs.indexOf(normalizedShootTimeMs);

        if (directIndex >= 0) {
            return directIndex;
        }

        let bestIndex = 0;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (let index = 0; index < shootTimeOptionsMs.length; index += 1) {
            const distance = Math.abs(shootTimeOptionsMs[index] - normalizedShootTimeMs);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestIndex = index;
            }
        }
        return bestIndex;
    }

    function optionIndexToShootTime(optionIndex) {
        const safeIndex = Math.round(core.clamp(toNumber(optionIndex, 0), 0, maxShootTimeOptionIndex));
        return shootTimeOptionsMs[safeIndex] ?? shootTimeOptionsMs[0];
    }

    function updateCategorySummaryLabels() {
        const totalDensity = totalDensityPerSqFt();
        dom.totalDensityValue.textContent = String(totalDensity);

        const cards = dom.weedCategoryList.querySelectorAll('.weed-category-card');
        cards.forEach((card) => {
            const categoryId = card.getAttribute('data-category-id');
            const category = categories.find((candidate) => candidate.id === categoryId);
            const shareValueLabel = card.querySelector('.weed-category-share-value');
            if (!category || !shareValueLabel) {
                return;
            }
            shareValueLabel.textContent = sharePercent(category.densityPerSqFt, totalDensity).toFixed(1);
        });
    }

    function renderCategories() {
        const totalDensity = totalDensityPerSqFt();
        const canRemove = categories.length > 1;

        const cardsMarkup = categories.map((category) => {
            const densityShare = sharePercent(category.densityPerSqFt, totalDensity);
            const shootTimeOptionIndex = shootTimeToOptionIndex(category.shootTimeMs);
            const safeName = escapeHtml(category.name);
            const isGrass = category.visualType === 'grass';

            return [
                `<article class="weed-category-card" data-category-id="${escapeHtml(category.id)}">`,
                '<div class="weed-category-card-header">',
                '<label class="control weed-category-name-control">',
                '<span>Weed Name</span>',
                `<input type="text" class="weed-category-name-input" value="${safeName}" maxlength="${nameMaxLength}" placeholder="Name this weed category">`,
                '</label>',
                `<button type="button" class="btn weed-category-remove-btn"${canRemove ? '' : ' disabled'}>Remove</button>`,
                '</div>',
                '<div class="weed-category-grid">',
                '<label class="control">',
                '<span>Visualizer Type</span>',
                '<select class="weed-category-type-select">',
                `<option value="broadleaf"${isGrass ? '' : ' selected'}>Broadleaf</option>`,
                `<option value="grass"${isGrass ? ' selected' : ''}>Grass</option>`,
                '</select>',
                '</label>',
                '<label class="control">',
                `<span class="control-header"><span>Density (<span class="weed-category-density-value">${category.densityPerSqFt}</span> weeds/sq ft)</span></span>`,
                `<input type="range" class="weed-category-density-slider" min="${minDensity}" max="${maxDensity}" step="1" value="${category.densityPerSqFt}">`,
                '</label>',
                '</div>',
                '<label class="control">',
                `<span class="control-header"><span>Shoot Time (<span class="weed-category-shoot-value">${category.shootTimeMs}</span> ms)</span></span>`,
                `<input type="range" class="weed-category-shoot-slider" min="0" max="${maxShootTimeOptionIndex}" step="1" value="${shootTimeOptionIndex}">`,
                '<small>10 ms steps to 500 ms, then 100 ms steps to 3000 ms.</small>',
                '</label>',
                `<p class="weed-category-share">Density Share: <strong class="weed-category-share-value">${densityShare.toFixed(1)}</strong>%</p>`,
                '</article>'
            ].join('');
        }).join('');

        dom.weedCategoryList.innerHTML = cardsMarkup;
        updateCategorySummaryLabels();
    }

    function emitChanged() {
        onChangeHandler();
    }

    function findCategoryFromEventTarget(target) {
        const card = target.closest('.weed-category-card[data-category-id]');
        if (!card || !dom.weedCategoryList.contains(card)) {
            return null;
        }

        const categoryId = card.getAttribute('data-category-id');
        const category = categories.find((candidate) => candidate.id === categoryId);
        if (!category) {
            return null;
        }

        return { card, category };
    }

    function handleCategoryInput(target) {
        const resolved = findCategoryFromEventTarget(target);
        if (!resolved) {
            return false;
        }

        const { card, category } = resolved;
        if (target.classList.contains('weed-category-name-input')) {
            category.name = normalizeName(target.value, categories.indexOf(category));
            return false;
        }

        if (target.classList.contains('weed-category-density-slider')) {
            category.densityPerSqFt = normalizeDensity(target.value, category.densityPerSqFt);
            const densityLabel = card.querySelector('.weed-category-density-value');
            if (densityLabel) {
                densityLabel.textContent = String(category.densityPerSqFt);
            }
            updateCategorySummaryLabels();
            return true;
        }

        if (target.classList.contains('weed-category-shoot-slider')) {
            category.shootTimeMs = optionIndexToShootTime(target.value);
            const shootTimeLabel = card.querySelector('.weed-category-shoot-value');
            if (shootTimeLabel) {
                shootTimeLabel.textContent = String(category.shootTimeMs);
            }
            return true;
        }

        return false;
    }

    function handleCategorySelect(target) {
        const resolved = findCategoryFromEventTarget(target);
        if (!resolved) {
            return false;
        }

        const { category } = resolved;
        if (target.classList.contains('weed-category-type-select')) {
            category.visualType = normalizeType(target.value);
            return true;
        }

        if (target.classList.contains('weed-category-name-input')) {
            category.name = normalizeName(target.value, categories.indexOf(category));
            target.value = category.name;
            return true;
        }

        return false;
    }

    function addCategory() {
        const template = getDefaultCategoryTemplate(categories.length);
        categories.push(normalizeCategory({
            id: createCategoryId(),
            name: template.name,
            visualType: template.visualType,
            densityPerSqFt: template.densityPerSqFt,
            shootTimeMs: template.shootTimeMs
        }, categories.length));
        renderCategories();
        emitChanged();
    }

    function removeCategory(target) {
        const resolved = findCategoryFromEventTarget(target);
        if (!resolved || categories.length <= 1) {
            return;
        }

        const { category } = resolved;
        categories = categories.filter((candidate) => candidate.id !== category.id);
        renderCategories();
        emitChanged();
    }

    function getCategories() {
        const totalDensity = totalDensityPerSqFt();
        return categories.map((category) => ({
            id: category.id,
            name: category.name,
            visualType: category.visualType,
            densityPerSqFt: category.densityPerSqFt,
            shootTimeMs: category.shootTimeMs,
            sharePercent: sharePercent(category.densityPerSqFt, totalDensity)
        }));
    }

    function getDefaultsPayload() {
        return categories.map((category) => ({
            name: category.name,
            visualType: category.visualType,
            densityPerSqFt: category.densityPerSqFt,
            shootTimeMs: category.shootTimeMs
        }));
    }

    function applyDefaults(categoriesDefaults) {
        categories = normalizeCategoryList(categoriesDefaults);
        renderCategories();
    }

    function setOnChange(handler) {
        onChangeHandler = typeof handler === 'function' ? handler : () => {};
    }

    dom.addWeedCategoryButton.addEventListener('click', () => {
        addCategory();
    });

    dom.weedCategoryList.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }

        if (target.classList.contains('weed-category-remove-btn')) {
            removeCategory(target);
        }
    });

    dom.weedCategoryList.addEventListener('input', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }

        const shouldRecompute = handleCategoryInput(target);
        if (shouldRecompute) {
            emitChanged();
        }
    });

    dom.weedCategoryList.addEventListener('change', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }

        const shouldRecompute = handleCategorySelect(target);
        if (shouldRecompute) {
            emitChanged();
        }
    });

    categories = normalizeCategoryList(initialCategories);
    renderCategories();

    return {
        setOnChange,
        getCategories,
        getDefaultsPayload,
        applyDefaults
    };
}
