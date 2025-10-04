// Authentication
const HARDCODED_USERNAME = 'nicdford';
const HARDCODED_PASSWORD = 'redwed4';

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

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('login-error');

    if (username === HARDCODED_USERNAME && password === HARDCODED_PASSWORD) {
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

// Preset configurations
const PRESETS = {
    'bmw_3series': {
        make: 'BMW',
        models: ['3 SERIES']
    },
    'super_duty': {
        make: 'FORD',
        models: ['F250', 'F-250', 'F350', 'F-350', 'EXCURSION']
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

// Preset card click handlers
document.querySelectorAll('.preset-card').forEach(card => {
    card.addEventListener('click', async function() {
        const presetKey = this.getAttribute('data-preset');
        const preset = PRESETS[presetKey];

        // Highlight active card
        document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
        this.classList.add('active');

        // Quick search always checks all yards
        const allYards = ['1020', '1021', '1119', '1022', '1099'];

        // Show loading
        document.getElementById('loading').style.display = 'block';
        document.getElementById('results').innerHTML = '';

        await searchInventoryPreset(preset.make, preset.models, allYards);

        // Hide loading
        document.getElementById('loading').style.display = 'none';
    });
});

// Make dropdown change handler - load models for selected make
document.getElementById('make').addEventListener('change', async function() {
    const make = this.value;

    // Clear active preset card when user manually selects make
    document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));

    const modelSelect = document.getElementById('model');

    // Reset model dropdown
    modelSelect.innerHTML = '<option value="">Loading...</option>';
    modelSelect.disabled = true;

    if (!make) {
        modelSelect.innerHTML = '<option value="">Select a make first</option>';
        return;
    }

    try {
        // Get models from any yard (using first available yard)
        const yardId = '1022'; // Default to NAMPA
        const models = await fetchModelsForMake(make, yardId);

        modelSelect.innerHTML = '<option value="">Select Model</option>';

        // Get unique models across all yards
        const uniqueModels = [...new Set(models.map(m => m.model))].sort();

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
    const model = document.getElementById('model').value.trim();

    if (!make || !model) {
        alert('Please select both make and model');
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

    await searchInventory(make, model, selectedYards);

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
            const uniqueVehicles = allVehicles.filter((v, index, self) =>
                index === self.findIndex((t) => (
                    t.year === v.year && t.make === v.make && t.model === v.model && t.row === v.row
                ))
            );

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

            resultDiv.innerHTML = `
                <h3>${yardName}</h3>
                <span class="status ${uniqueVehicles.length > 0 ? 'available' : 'unavailable'}">
                    ${uniqueVehicles.length > 0 ? `✓ ${uniqueVehicles.length} vehicle(s) found` : '✗ Not Available'}
                </span>
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
            const vehicles = await fetchVehicles(make, model, yardId);
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

            resultDiv.innerHTML = `
                <h3>${yardName}</h3>
                <span class="status ${vehicles.length > 0 ? 'available' : 'unavailable'}">
                    ${vehicles.length > 0 ? `✓ ${vehicles.length} vehicle(s) found` : '✗ Not Available'}
                </span>
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
