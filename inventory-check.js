const https = require('https');

const yardIds = [1020, 1021, 1119, 1022, 1099];
const makeName = 'BMW';
const modelName = '3 SERIES';

function makeRequest(url, data) {
    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams(data).toString();

        const options = {
            hostname: 'inventory.pickapartjalopyjungle.com',
            path: url,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length
            }
        };

        const req = https.request(options, (res) => {
            let body = '';

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(postData);
        req.end();
    });
}

async function checkInventory() {
    console.log(`Checking all yards for ${makeName} ${modelName}\n`);

    for (const yardId of yardIds) {
        try {
            console.log(`Yard ${yardId}:`);

            // Get models for BMW at this yard
            const models = await makeRequest('/Home/GetModels', {
                makeName: makeName,
                yardId: yardId
            });

            // Check if 3 SERIES is available
            const hasModel = models.some(m => m.model === modelName);

            if (hasModel) {
                console.log(`  ✓ ${modelName} available`);
                console.log(`  All models: ${models.map(m => m.model).join(', ')}`);
            } else {
                console.log(`  ✗ ${modelName} not available`);
                console.log(`  Available models: ${models.map(m => m.model).join(', ')}`);
            }
            console.log('');

        } catch (error) {
            console.log(`  Error: ${error.message}\n`);
        }
    }
}

checkInventory();
