// Constants
const SVG_NS = "http://www.w3.org/2000/svg";
const FIELD_WIDTH = 400;
const FIELD_HEIGHT = 400;
const MIN_WEEDS = 2;
const MAX_WEEDS = 50;
const AREA_INCHES = 12 * 12; // 12" x 12" area
let SERVO_OVERHEAD = 60; // ms, can be modified programmatically
const INCH_TO_SVG = 350 / 12; // Conversion factor from inches to SVG units
const BAND_CENTER = 6 * INCH_TO_SVG + 25; // Center of the band (6 inch mark)

// New variables for machine size selection
let currentMachineSize = 40; // Default machine size
const machineSizes = [6.6, 13.3, 20, 40, 60];

// Get DOM elements
const fieldView = document.getElementById('field-view');
const densitySlider = document.getElementById('density-slider');
const sizeSlider = document.getElementById('size-slider');
const bandWidthSlider = document.getElementById('band-width-slider');
const densityValue = document.getElementById('density-value');
const sizeValue = document.getElementById('size-value');
const bandWidthValue = document.getElementById('band-width-value');
const speedOutput = document.getElementById('speed-output');

// Initialize weed array and current size
let weeds = [];
let currentSize = 1;
let currentBandWidth = 12;

// Create background
createBackground();

// Create inch marks
createInchMarks();

// Create initial weeds
createWeeds();

// Add event listeners to sliders
densitySlider.addEventListener('input', updateVisualization);
sizeSlider.addEventListener('input', updateVisualization);
bandWidthSlider.addEventListener('input', updateBandWidth);

// Add event listener for machine size selection
document.querySelectorAll('input[name="machine-size"]').forEach(radio => {
    radio.addEventListener('change', updateMachineSize);
});

// Function to calculate acres per hour
function calculateAcresPerHour(speedMph, machineWidth) {
    const milesPerAcre = 43560 / (machineWidth * 5280);
    return speedMph / milesPerAcre;
}

function createBackground() {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', '25');
    rect.setAttribute('y', '25');
    rect.setAttribute('width', '350');
    rect.setAttribute('height', '350');
    rect.setAttribute('fill', 'url(#soilTexture)');
    fieldView.insertBefore(rect, fieldView.firstChild);
}

function createInchMarks() {
    const inchMarks = document.getElementById('inch-marks');
    for (let i = 0; i <= 12; i++) {
        // Vertical marks
        const yPos = 25 + i * (350/12);
        inchMarks.innerHTML += `<line x1="20" y1="${yPos}" x2="25" y2="${yPos}" stroke="black" />`;
        if (i % 2 === 0) {
            inchMarks.innerHTML += `<text x="15" y="${yPos}" text-anchor="end" dominant-baseline="middle" font-size="10">${12-i}"</text>`;
        }
        
        // Horizontal marks
        const xPos = 25 + i * (350/12);
        inchMarks.innerHTML += `<line x1="${xPos}" y1="375" x2="${xPos}" y2="380" stroke="black" />`;
        if (i % 2 === 0) {
            inchMarks.innerHTML += `<text x="${xPos}" y="390" text-anchor="middle" font-size="10">${i}"</text>`;
        }
    }
}

function createWeeds() {
    for (let i = 0; i < MAX_WEEDS; i++) {
        const weed = document.createElementNS(SVG_NS, 'g');
        weed.setAttribute('class', 'weed');
        weed.style.display = 'none';

        const x = 25 + Math.random() * 350;
        const y = 25 + Math.random() * 350;
        const rotation = Math.random() * 360; // Random rotation
        weed.setAttribute('transform', `translate(${x},${y}) rotate(${rotation})`);

        fieldView.appendChild(weed);
        weeds.push({ 
            element: weed, 
            rotation: rotation,
            x: x,
            y: y,
            type: Math.random() < 0.5 ? 'broadleaf' : 'grass' // Randomize type
        });
    }
}

function updateVisualization() {
    updateDensity();
    updateSize();
    updateBandVisualization();
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
    const weedsInBand = weeds.filter(weed => weed.element.style.display !== 'none' && isWeedInBand(weed)).length;
    
    const timePerWeed = shootTime + SERVO_OVERHEAD;

    // Determine the number of lasers per band
    let lasersPerBand = 1; // Default to 1 laser per band
    if (currentMachineSize === 40 || currentMachineSize === 60) {
        lasersPerBand = 2; // For 40' and 60' machines
    }

    // Adjust total time based on lasers per band
    const totalTime = (weedsInBand * timePerWeed) / lasersPerBand;
    const secondsPerFoot = totalTime / 1000; // Convert ms to seconds
    const feetPerMinute = 60 / secondsPerFoot;
    const milesPerHour = feetPerMinute * 60 / 5280;
    
    const acresPerHour = calculateAcresPerHour(milesPerHour, currentMachineSize);

    speedOutput.innerHTML = `
        <p>Shoot Time: ${shootTime.toFixed(2)} ms</p>
        <p>Servo Overhead: ${SERVO_OVERHEAD} ms</p>
        <p>Time per Weed: ${timePerWeed.toFixed(2)} ms</p>
        <p>Weeds in Band: ${weedsInBand}</p>
        <p>Lasers per Band: ${lasersPerBand}</p>
        <p>Total Time for 1 sq ft: ${totalTime.toFixed(2)} ms</p>
        <p>Speed: ${feetPerMinute.toFixed(2)} ft/min</p>
        <p>Speed: ${milesPerHour.toFixed(2)} mph</p>
        <p>Machine Width: ${currentMachineSize} ft</p>
        <p>Acres per Hour: ${acresPerHour.toFixed(2)}</p>
    `;

    updateAcresVisualization(acresPerHour);
}

function updateBandWidth() {
    currentBandWidth = parseInt(bandWidthSlider.value);
    bandWidthValue.textContent = `${currentBandWidth}"`;
    updateBandVisualization();
    updateVisualization();
}

function updateBandVisualization() {
    const bandWidth = currentBandWidth * INCH_TO_SVG;
    const bandStart = BAND_CENTER - bandWidth / 2;
    
    // Remove existing band visualization if it exists
    const existingBand = document.getElementById('band-visualization');
    if (existingBand) {
        existingBand.remove();
    }
    
    // Create new band visualization
    const band = document.createElementNS(SVG_NS, 'rect');
    band.setAttribute('id', 'band-visualization');
    band.setAttribute('x', bandStart);
    band.setAttribute('y', '25');
    band.setAttribute('width', bandWidth);
    band.setAttribute('height', '350');
    band.setAttribute('fill', 'rgba(255, 0, 0, 0.2)');
    fieldView.appendChild(band);
}

function isWeedInBand(weed) {
    const bandWidth = currentBandWidth * INCH_TO_SVG;
    const bandStart = BAND_CENTER - bandWidth / 2;
    const bandEnd = BAND_CENTER + bandWidth / 2;
    return weed.x >= bandStart && weed.x <= bandEnd;
}

function updateMachineSize(event) {
    currentMachineSize = parseFloat(event.target.value);
    updateVisualization();
}

// Create the 10x10 grid for the acres visualization
function createAcresVisualization() {
    const acresView = document.getElementById('acres-view');
    acresView.innerHTML = ''; // Clear existing content

    // Create 10x10 grid representing 10 acres
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            const rect = document.createElementNS(SVG_NS, 'rect');
            rect.setAttribute('x', j * 20);
            rect.setAttribute('y', i * 20);
            rect.setAttribute('width', 20);
            rect.setAttribute('height', 20);
            rect.setAttribute('fill', 'green');
            rect.setAttribute('stroke', 'white');
            rect.setAttribute('stroke-width', '1');
            acresView.appendChild(rect);
        }
    }
    document.getElementById('acres-per-hour-display').textContent = 'Acres per Hour: 0.00';
}

// Update the acres visualization based on acres per hour
function updateAcresVisualization(acresPerHour) {
    const acresView = document.getElementById('acres-view');
    const totalCells = 100;
    const coveredCells = Math.min(Math.round(acresPerHour * 10), totalCells);

    const cells = acresView.getElementsByTagName('rect');
    for (let i = 0; i < totalCells; i++) {
        const row = Math.floor(i / 10);
        const col = i % 10;
        const snakeIndex = row % 2 === 0 ? col + row * 10 : (9 - col) + row * 10;
        cells[snakeIndex].setAttribute('fill', i < coveredCells ? 'red' : 'green');
    }

    // Update acres per hour display
    const acresDisplay = document.getElementById('acres-per-hour-display');
    acresDisplay.textContent = `Acres per Hour: ${acresPerHour.toFixed(2)}`;
}

// Initial update
createAcresVisualization();
updateBandVisualization();
updateVisualization();
document.querySelector('input[name="machine-size"]:checked').dispatchEvent(new Event('change'));
