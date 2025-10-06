// Authentication
const VALID_USERS = {
    'nicdford': 'redwed4',
    'apexidaho': 'keepcarsclean'
};

// Check if already logged in
window.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (isLoggedIn === 'true') {
        showAppScreen();
    }
});

// Login form handler
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.toLowerCase();
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('login-error');

    if (VALID_USERS[username] && VALID_USERS[username] === password) {
        sessionStorage.setItem('isLoggedIn', 'true');
        showAppScreen();
        errorElement.textContent = '';
    } else {
        errorElement.textContent = 'Invalid username or password';
    }
});

// Logout handler
document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('isLoggedIn');
    showLoginScreen();
});

function showLoginScreen() {
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('app-screen').classList.remove('active');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

function showAppScreen() {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('app-screen').classList.add('active');
}

// Track active preset for displaying notes
let activePreset = null;

// BMW 3-Series generations in chronological order
const BMW_3_SERIES_GENERATIONS = [
    { id: 'e36', name: 'E36', yearRange: { min: 1990, max: 2000 } },
    { id: 'e46', name: 'E46', yearRange: { min: 1999, max: 2005 } }
];

// Calculate overlap years between generations
function getOverlapYears(generation) {
    const currentIndex = BMW_3_SERIES_GENERATIONS.findIndex(g => g.id === generation.id);
    if (currentIndex === -1) return null;

    const overlaps = [];

    // Check overlap with predecessor
    if (currentIndex > 0) {
        const predecessor = BMW_3_SERIES_GENERATIONS[currentIndex - 1];
        const overlapMin = Math.max(predecessor.yearRange.min, generation.yearRange.min);
        const overlapMax = Math.min(predecessor.yearRange.max, generation.yearRange.max);

        if (overlapMin <= overlapMax) {
            overlaps.push({
                years: { min: overlapMin, max: overlapMax },
                otherGeneration: predecessor.name
            });
        }
    }

    // Check overlap with successor
    if (currentIndex < BMW_3_SERIES_GENERATIONS.length - 1) {
        const successor = BMW_3_SERIES_GENERATIONS[currentIndex + 1];
        const overlapMin = Math.max(generation.yearRange.min, successor.yearRange.min);
        const overlapMax = Math.min(generation.yearRange.max, successor.yearRange.max);

        if (overlapMin <= overlapMax) {
            overlaps.push({
                years: { min: overlapMin, max: overlapMax },
                otherGeneration: successor.name
            });
        }
    }

    return overlaps.length > 0 ? overlaps : null;
}

// Generate note for a generation based on its overlaps
function generateOverlapNote(generationId, vehicles) {
    const generation = BMW_3_SERIES_GENERATIONS.find(g => g.id === generationId);
    if (!generation) return null;

    const overlaps = getOverlapYears(generation);
    if (!overlaps) return null;

    // Check if any vehicles fall within overlap years
    const vehiclesInOverlap = vehicles.filter(v => {
        const year = parseInt(v.year);
        return overlaps.some(overlap =>
            year >= overlap.years.min && year <= overlap.years.max
        );
    });

    if (vehiclesInOverlap.length === 0) return null;

    // Build note text
    const overlapTexts = overlaps.map(overlap => {
        const yearText = overlap.years.min === overlap.years.max
            ? `${overlap.years.min}`
            : `${overlap.years.min}-${overlap.years.max}`;
        return `${yearText} could be ${generation.name} or ${overlap.otherGeneration}`;
    });

    return `${generation.name} generation. Note: ${overlapTexts.join('; ')}`;
}

// Preset configurations
const PRESETS = {
    'bmw_e36': {
        make: 'BMW',
        models: ['3 SERIES'],
        yearRange: { min: 1990, max: 2000 },
        generationId: 'e36'
    },
    'bmw_e46': {
        make: 'BMW',
        models: ['3 SERIES'],
        yearRange: { min: 1999, max: 2005 },
        generationId: 'e46'
    },
    'first_gen_super_duty': {
        make: 'FORD',
        models: ['F250', 'F-250', 'F350', 'F-350', 'EXCURSION'],
        yearRange: { min: 1999, max: 2007 },
        generationId: 'first_gen_super_duty'
    },
    'nissan_350z': {
        make: 'NISSAN',
        models: ['350Z']
    }
};

// Normalize model name for matching (removes spaces, dashes, special chars)
function normalizeModel(model) {
    return model.toUpperCase().replace(/[\s\-]/g, '');
}

// Filter vehicles by year range
function filterByYear(vehicles) {
    const minYear = parseInt(document.getElementById('year-min').value);
    const maxYear = parseInt(document.getElementById('year-max').value);

    if (!minYear && !maxYear) {
        return vehicles; // No filter applied
    }

    return vehicles.filter(v => {
        const year = parseInt(v.year);
        if (minYear && maxYear) {
            return year >= minYear && year <= maxYear;
        } else if (minYear) {
            return year >= minYear;
        } else if (maxYear) {
            return year <= maxYear;
        }
        return true;
    });
}

// Clear year filters
document.getElementById('clear-years').addEventListener('click', () => {
    document.getElementById('year-min').value = '';
    document.getElementById('year-max').value = '';
});

// Preset card click handlers
document.querySelectorAll('.preset-card').forEach(card => {
    card.addEventListener('click', async function() {
        const presetKey = this.getAttribute('data-preset');
        const preset = PRESETS[presetKey];

        // Highlight active card
        document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
        this.classList.add('active');

        // Store active preset for displaying notes
        activePreset = preset;

        // Populate advanced search fields
        document.getElementById('make').value = preset.make;

        // Load and select models for this preset
        const modelSelect = document.getElementById('model');
        modelSelect.innerHTML = '<option value="">Loading...</option>';
        modelSelect.disabled = true;

        try {
            // Get models from all yards
            const yardIds = ['1020', '1021', '1119', '1022', '1099'];
            let allModels = [];

            for (const yardId of yardIds) {
                try {
                    const models = await fetchModelsForMake(preset.make, yardId);
                    allModels = allModels.concat(models);
                } catch (error) {
                    console.error(`Error loading models from yard ${yardId}:`, error);
                    // Continue with other yards even if one fails
                }
            }

            modelSelect.innerHTML = '<option value="">Select Model</option>';
            const uniqueModels = [...new Set(allModels.map(m => m.model))].sort();
            uniqueModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                // Select models that are in the preset
                if (preset.models.some(pm => normalizeModel(pm) === normalizeModel(model))) {
                    option.selected = true;
                }
                modelSelect.appendChild(option);
            });
            modelSelect.disabled = false;
        } catch (error) {
            modelSelect.innerHTML = '<option value="">Error loading models</option>';
        }

        // Set year range if defined in preset
        if (preset.yearRange) {
            document.getElementById('year-min').value = preset.yearRange.min;
            document.getElementById('year-max').value = preset.yearRange.max;
        } else {
            document.getElementById('year-min').value = '';
            document.getElementById('year-max').value = '';
        }

        // Check all yards
        document.querySelectorAll('.yard-checkbox').forEach(cb => cb.checked = true);

        // Trigger search button click
        document.getElementById('search-btn').click();
    });
});

// Make dropdown change handler - load models for selected make
document.getElementById('make').addEventListener('change', async function() {
    const make = this.value;

    // Clear active preset card and note when user manually selects make
    document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
    activePreset = null;

    const modelSelect = document.getElementById('model');

    // Reset model dropdown
    modelSelect.innerHTML = '<option value="">Loading...</option>';
    modelSelect.disabled = true;

    if (!make) {
        modelSelect.innerHTML = '<option value="">Select a make first</option>';
        return;
    }

    try {
        // Get models from all yards
        const yardIds = ['1020', '1021', '1119', '1022', '1099'];
        let allModels = [];

        for (const yardId of yardIds) {
            try {
                const models = await fetchModelsForMake(make, yardId);
                allModels = allModels.concat(models);
            } catch (error) {
                console.error(`Error loading models from yard ${yardId}:`, error);
                // Continue with other yards even if one fails
            }
        }

        modelSelect.innerHTML = '<option value="">Select Model</option>';

        // Get unique models across all yards
        const uniqueModels = [...new Set(allModels.map(m => m.model))].sort();

        uniqueModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            modelSelect.appendChild(option);
        });

        modelSelect.disabled = false;
    } catch (error) {
        modelSelect.innerHTML = '<option value="">Error loading models</option>';
        console.error('Error loading models:', error);
    }
});

// Helper function to fetch models for a make
async function fetchModelsForMake(make, yardId) {
    const targetUrl = 'https://inventory.pickapartjalopyjungle.com/Home/GetModels';
    const formData = `makeName=${encodeURIComponent(make)}&yardId=${encodeURIComponent(yardId)}`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
    });

    if (!response.ok) {
        throw new Error('Failed to fetch models');
    }

    return await response.json();
}

// Search functionality
document.getElementById('search-btn').addEventListener('click', async () => {
    const make = document.getElementById('make').value.trim();
    const modelSelect = document.getElementById('model');
    const selectedModels = Array.from(modelSelect.selectedOptions)
        .map(option => option.value)
        .filter(val => val !== '');

    if (!make || selectedModels.length === 0) {
        alert('Please select both make and at least one model');
        return;
    }

    const selectedYards = Array.from(document.querySelectorAll('.yard-checkbox:checked'))
        .map(cb => cb.value);

    if (selectedYards.length === 0) {
        alert('Please select at least one yard');
        return;
    }

    // Show loading
    document.getElementById('loading').style.display = 'block';
    document.getElementById('results').innerHTML = '';

    // Scroll to results
    document.querySelector('.results-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });

    // If multiple models selected, use preset search logic
    if (selectedModels.length > 1) {
        await searchInventoryPreset(make, selectedModels, selectedYards);
    } else {
        await searchInventory(make, selectedModels[0], selectedYards);
    }

    // Hide loading
    document.getElementById('loading').style.display = 'none';
});

// Search inventory for preset (multiple models)
async function searchInventoryPreset(make, models, yardIds) {
    const resultsContainer = document.getElementById('results');
    const yardNames = {
        '1020': 'BOISE',
        '1021': 'CALDWELL',
        '1119': 'GARDEN CITY',
        '1022': 'NAMPA',
        '1099': 'TWIN FALLS'
    };

    for (const yardId of yardIds) {
        try {
            // Fetch vehicles for all models in the preset
            let allVehicles = [];
            for (const model of models) {
                const vehicles = await fetchVehicles(make, model, yardId);
                allVehicles = allVehicles.concat(vehicles);
            }

            // Remove duplicates based on year, make, model, and row
            let uniqueVehicles = allVehicles.filter((v, index, self) =>
                index === self.findIndex((t) => (
                    t.year === v.year && t.make === v.make && t.model === v.model && t.row === v.row
                ))
            );

            // Apply year filter
            uniqueVehicles = filterByYear(uniqueVehicles);

            const yardName = yardNames[yardId] || `Yard ${yardId}`;

            const resultDiv = document.createElement('div');
            resultDiv.className = `result-item ${uniqueVehicles.length > 0 ? 'available' : 'unavailable'}`;

            let tableHTML = '';
            if (uniqueVehicles.length > 0) {
                tableHTML = `
                    <table class="vehicle-table">
                        <thead>
                            <tr>
                                <th>Year</th>
                                <th>Make</th>
                                <th>Model</th>
                                <th>Row</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${uniqueVehicles.map(v => `
                                <tr>
                                    <td>${v.year}</td>
                                    <td>${v.make}</td>
                                    <td>${v.model}</td>
                                    <td>${v.row}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }

            // Generate note based on actual vehicle years in overlap range
            let noteHTML = '';
            if (activePreset && activePreset.generationId && uniqueVehicles.length > 0) {
                const note = generateOverlapNote(activePreset.generationId, uniqueVehicles);
                if (note) {
                    noteHTML = `<div class="preset-note"><strong>ℹ️ ${note}</strong></div>`;
                }
            }

            resultDiv.innerHTML = `
                <h3>${yardName}</h3>
                <span class="status ${uniqueVehicles.length > 0 ? 'available' : 'unavailable'}">
                    ${uniqueVehicles.length > 0 ? `✓ ${uniqueVehicles.length} vehicle(s) found` : '✗ Not Available'}
                </span>
                ${noteHTML}
                ${tableHTML}
            `;

            resultsContainer.appendChild(resultDiv);

        } catch (error) {
            const yardName = yardNames[yardId] || `Yard ${yardId}`;
            const resultDiv = document.createElement('div');
            resultDiv.className = 'result-item unavailable';
            resultDiv.innerHTML = `
                <h3>${yardName}</h3>
                <span class="status unavailable">Error</span>
                <div class="models-list">Error: ${error.message}</div>
            `;
            resultsContainer.appendChild(resultDiv);
        }
    }
}

async function searchInventory(make, model, yardIds) {
    const resultsContainer = document.getElementById('results');
    const yardNames = {
        '1020': 'BOISE',
        '1021': 'CALDWELL',
        '1119': 'GARDEN CITY',
        '1022': 'NAMPA',
        '1099': 'TWIN FALLS'
    };

    for (const yardId of yardIds) {
        try {
            let vehicles = await fetchVehicles(make, model, yardId);

            // Apply year filter
            vehicles = filterByYear(vehicles);

            const yardName = yardNames[yardId] || `Yard ${yardId}`;

            const resultDiv = document.createElement('div');
            resultDiv.className = `result-item ${vehicles.length > 0 ? 'available' : 'unavailable'}`;

            let tableHTML = '';
            if (vehicles.length > 0) {
                tableHTML = `
                    <table class="vehicle-table">
                        <thead>
                            <tr>
                                <th>Year</th>
                                <th>Make</th>
                                <th>Model</th>
                                <th>Row</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${vehicles.map(v => `
                                <tr>
                                    <td>${v.year}</td>
                                    <td>${v.make}</td>
                                    <td>${v.model}</td>
                                    <td>${v.row}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }

            // Generate note based on actual vehicle years in overlap range
            let noteHTML = '';
            if (activePreset && activePreset.generationId && vehicles.length > 0) {
                const note = generateOverlapNote(activePreset.generationId, vehicles);
                if (note) {
                    noteHTML = `<div class="preset-note"><strong>ℹ️ ${note}</strong></div>`;
                }
            }

            resultDiv.innerHTML = `
                <h3>${yardName}</h3>
                <span class="status ${vehicles.length > 0 ? 'available' : 'unavailable'}">
                    ${vehicles.length > 0 ? `✓ ${vehicles.length} vehicle(s) found` : '✗ Not Available'}
                </span>
                ${noteHTML}
                ${tableHTML}
            `;

            resultsContainer.appendChild(resultDiv);

        } catch (error) {
            const yardName = yardNames[yardId] || `Yard ${yardId}`;
            const resultDiv = document.createElement('div');
            resultDiv.className = 'result-item unavailable';
            resultDiv.innerHTML = `
                <h3>${yardName}</h3>
                <span class="status unavailable">Error</span>
                <div class="models-list">Error: ${error.message}</div>
            `;
            resultsContainer.appendChild(resultDiv);
        }
    }
}

async function fetchVehicles(make, model, yardId) {
    // First, get all available models for this make at this yard
    const targetUrl = 'https://inventory.pickapartjalopyjungle.com/Home/GetModels';
    const formData = `makeName=${encodeURIComponent(make)}&yardId=${encodeURIComponent(yardId)}`;

    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch models for yard ${yardId}`);
    }

    const models = await response.json();

    // Find matching models using normalized comparison
    const normalizedSearchModel = normalizeModel(model);
    const matchingModels = models.filter(m => {
        const normalizedModel = normalizeModel(m.model);
        return normalizedModel.includes(normalizedSearchModel) ||
               normalizedSearchModel.includes(normalizedModel);
    });

    if (matchingModels.length === 0) {
        return [];
    }

    // Fetch vehicles for each matching model variant
    const allVehicles = [];

    for (const matchedModel of matchingModels) {
        const inventoryUrl = 'https://inventory.pickapartjalopyjungle.com/';
        const inventoryFormData = `YardId=${encodeURIComponent(yardId)}&VehicleMake=${encodeURIComponent(make)}&VehicleModel=${encodeURIComponent(matchedModel.model)}`;

        const inventoryProxyUrl = `https://corsproxy.io/?${encodeURIComponent(inventoryUrl)}`;

        const inventoryResponse = await fetch(inventoryProxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: inventoryFormData
        });

        if (!inventoryResponse.ok) {
            continue;
        }

        const html = await inventoryResponse.text();

        // Parse the HTML to extract vehicle data from the table
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const table = doc.querySelector('table.table');

        if (!table) {
            continue;
        }

        const rows = table.querySelectorAll('tr');

        // Skip the header row (first row)
        for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td');
            if (cells.length === 4) {
                allVehicles.push({
                    year: cells[0].textContent.trim(),
                    make: cells[1].textContent.trim(),
                    model: cells[2].textContent.trim(),
                    row: cells[3].textContent.trim()
                });
            }
        }
    }

    return allVehicles;
}
