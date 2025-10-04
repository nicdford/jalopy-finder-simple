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

// Search functionality
document.getElementById('search-btn').addEventListener('click', async () => {
    const make = document.getElementById('make').value.trim().toUpperCase();
    const model = document.getElementById('model').value.trim().toUpperCase();

    if (!make || !model) {
        alert('Please enter both make and model');
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

async function searchInventory(make, model, yardIds) {
    const resultsContainer = document.getElementById('results');

    for (const yardId of yardIds) {
        try {
            const models = await fetchModels(make, yardId);
            const hasModel = models.some(m => m.model === model);

            const resultDiv = document.createElement('div');
            resultDiv.className = `result-item ${hasModel ? 'available' : 'unavailable'}`;

            resultDiv.innerHTML = `
                <h3>Yard ${yardId}</h3>
                <span class="status ${hasModel ? 'available' : 'unavailable'}">
                    ${hasModel ? '✓ Available' : '✗ Not Available'}
                </span>
                <div class="models-list">
                    <strong>${make} models at this yard:</strong><br>
                    ${models.length > 0 ? models.map(m => m.model).join(', ') : 'None'}
                </div>
            `;

            resultsContainer.appendChild(resultDiv);

        } catch (error) {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'result-item unavailable';
            resultDiv.innerHTML = `
                <h3>Yard ${yardId}</h3>
                <span class="status unavailable">Error</span>
                <div class="models-list">Error: ${error.message}</div>
            `;
            resultsContainer.appendChild(resultDiv);
        }
    }
}

async function fetchModels(makeName, yardId) {
    // Using CORS proxy for GitHub Pages
    const targetUrl = 'https://inventory.pickapartjalopyjungle.com/Home/GetModels';
    const formData = `makeName=${encodeURIComponent(makeName)}&yardId=${encodeURIComponent(yardId)}`;

    // Use corsproxy.io which supports POST requests
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch data for yard ${yardId}`);
    }

    return await response.json();
}
