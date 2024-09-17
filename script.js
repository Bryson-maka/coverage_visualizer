// Constants
const SVG_NS = "http://www.w3.org/2000/svg";
const FIELD_WIDTH = 400;
const FIELD_HEIGHT = 400;
const MIN_WEEDS = 2;
const MAX_WEEDS = 30;
const AREA_INCHES = 12 * 12; // 12" x 12" area
let SERVO_OVERHEAD = 60; // ms, can be modified programmatically

// Get DOM elements
const fieldView = document.getElementById('field-view');
const densitySlider = document.getElementById('density-slider');
const sizeSlider = document.getElementById('size-slider');
const densityValue = document.getElementById('density-value');
const sizeValue = document.getElementById('size-value');
const speedOutput = document.getElementById('speed-output');

// Initialize weed array and current size
let weeds = [];
let currentSize = 1;

// Create background
createBackground();

// Create initial weeds
createWeeds();

// Add event listeners to sliders
densitySlider.addEventListener('input', updateVisualization);
sizeSlider.addEventListener('input', updateVisualization);

function createBackground() {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('width', FIELD_WIDTH);
    rect.setAttribute('height', FIELD_HEIGHT);
    rect.setAttribute('fill', 'url(#soilTexture)');
    fieldView.appendChild(rect);
}

function createWeeds() {
    for (let i = 0; i < MAX_WEEDS; i++) {
        const weed = document.createElementNS(SVG_NS, 'g');
        weed.setAttribute('class', 'weed');
        weed.style.display = 'none';

        const x = Math.random() * (FIELD_WIDTH - 50);
        const y = Math.random() * (FIELD_HEIGHT - 50);
        const rotation = Math.random() * 360; // Random rotation
        weed.setAttribute('transform', `translate(${x},${y}) rotate(${rotation})`);

        fieldView.appendChild(weed);
        weeds.push({ 
            element: weed, 
            rotation: rotation, 
            type: Math.random() < 0.5 ? 'broadleaf' : 'grass' // Randomize type
        });
    }
}

function updateVisualization() {
    updateDensity();
    updateSize();
    updateLaserweederCalculations();
}

function updateDensity() {
    const density = densitySlider.value;
    const visibleWeeds = Math.floor(((density - 1) / 19) * (MAX_WEEDS - MIN_WEEDS) + MIN_WEEDS);
    const weedsPerSqFt = (visibleWeeds / AREA_INCHES) * 144; // Convert to weeds per sq ft
    densityValue.textContent = weedsPerSqFt.toFixed(2);

    let broadleafCount = 0;
    let grassCount = 0;

    weeds.forEach((weed, index) => {
        if (index < visibleWeeds) {
            weed.element.style.display = 'block';
            if (weed.type === 'broadleaf') {
                broadleafCount++;
            } else {
                grassCount++;
            }
            updateWeedSize(weed, currentSize);
        } else {
            weed.element.style.display = 'none';
        }
    });

    // Adjust types if the distribution is off
    const halfVisible = Math.floor(visibleWeeds / 2);
    let index = 0;
    while (broadleafCount > halfVisible && grassCount < halfVisible) {
        if (weeds[index].type === 'broadleaf') {
            weeds[index].type = 'grass';
            broadleafCount--;
            grassCount++;
        }
        index++;
    }
    while (grassCount > halfVisible && broadleafCount < halfVisible) {
        if (weeds[index].type === 'grass') {
            weeds[index].type = 'broadleaf';
            grassCount--;
            broadleafCount++;
        }
        index++;
    }

    // Update weed appearances after type adjustments
    weeds.forEach((weed, index) => {
        if (index < visibleWeeds) {
            updateWeedSize(weed, currentSize);
        }
    });
}

function updateSize() {
    const size = sizeSlider.value;
    sizeValue.textContent = size;
    currentSize = size;

    weeds.forEach((weed) => {
        if (weed.element.style.display !== 'none') {
            updateWeedSize(weed, currentSize);
        }
    });
}

function updateWeedSize(weed, size) {
    const scaleFactor = size / 10;
    const leafCount = weed.type === 'broadleaf' 
        ? Math.min(Math.floor(size / 2) + 1, 5)
        : Math.min(Math.floor(size / 4) + 1, 3); // Fewer leaves for grass

    // Clear existing leaves
    weed.element.innerHTML = '';

    // Create new leaves
    for (let i = 0; i < leafCount; i++) {
        const leaf = weed.type === 'broadleaf' 
            ? createBroadleaf(i, leafCount)
            : createGrassLeaf(i, leafCount);
        weed.element.appendChild(leaf);
    }

    // Apply scaling while maintaining position and rotation
    const currentTransform = weed.element.getAttribute('transform');
    const [translateX, translateY] = currentTransform.match(/translate\(([^,]+),([^)]+)\)/).slice(1);
    weed.element.setAttribute('transform', `translate(${translateX},${translateY}) rotate(${weed.rotation}) scale(${scaleFactor})`);
}

function createBroadleaf(index, total) {
    const leaf = document.createElementNS(SVG_NS, 'path');
    const angle = (index / total) * 360;
    const leafPath = "M0,0 Q-10,-20 0,-40 Q10,-20 0,0";
    leaf.setAttribute('d', leafPath);
    leaf.setAttribute('fill', 'url(#leaf-gradient)');
    leaf.setAttribute('transform', `rotate(${angle})`);
    return leaf;
}

function createGrassLeaf(index, total) {
    const leaf = document.createElementNS(SVG_NS, 'path');
    const angle = (index / total) * 360;
    const leafPath = "M0,0 L-4,0 L0,-40 L4,0 Z"; // Tapered blade shape
    leaf.setAttribute('d', leafPath);
    leaf.setAttribute('fill', '#1a6600'); // Darker green for grass
    leaf.setAttribute('transform', `rotate(${angle})`);
    return leaf;
}

function updateLaserweederCalculations() {
    const size = parseInt(sizeSlider.value);
    const shootTime = 25 + (size - 1) * (500 - 25) / 9; // Linear interpolation
    const visibleWeeds = weeds.filter(weed => weed.element.style.display !== 'none').length;
    
    const timePerWeed = shootTime + SERVO_OVERHEAD;
    const totalTime = visibleWeeds * timePerWeed;
    const secondsPerFoot = totalTime / 1000; // Convert ms to seconds
    const feetPerMinute = 60 / secondsPerFoot;
    const milesPerHour = feetPerMinute * 60 / 5280;

    speedOutput.innerHTML = `
        <p>Shoot Time: ${shootTime.toFixed(2)} ms</p>
        <p>Servo Overhead: ${SERVO_OVERHEAD} ms</p>
        <p>Time per weed: ${timePerWeed.toFixed(2)} ms</p>
        <p>Total Time for 1 sq ft: ${totalTime.toFixed(2)} ms</p>
        <p>Speed: ${feetPerMinute.toFixed(2)} ft/min</p>
        <p>Speed: ${milesPerHour.toFixed(2)} mph</p>
    `;
}

// Initial update
updateVisualization();