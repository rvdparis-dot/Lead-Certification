// FILE: api/test.js
// This is optional - save as api/test.js to test your setup
// Visit: https://lead-certification.vercel.app/api/test

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const testResults = {
        success: true,
        message: 'API is working!',
        timestamp: new Date().toISOString(),
        environment: {
            nodeVersion: process.version,
            platform: process.platform,
            vercelRegion: process.env.VERCEL_REGION || 'unknown',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        request: {
            method: req.method,
            url: req.url,
            headers: req.headers,
            userAgent: req.headers['user-agent']
        },
        tests: {}
    };
    
    // Test 1: Basic functionality
    testResults.tests.basicFunction = 'PASS';
    
    // Test 2: Network connectivity
    try {
        const testResponse = await fetch('https://httpbin.org/get', { 
            method: 'GET',
            timeout: 5000 
        });
        testResults.tests.networkConnectivity = testResponse.ok ? 'PASS' : 'FAIL';
    } catch (error) {
        testResults.tests.networkConnectivity = 'FAIL - ' + error.message;
    }
    
    // Test 3: ArcGIS API connectivity
    try {
        const arcgisUrl = 'https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services/lhhp_lead_certifications/FeatureServer/0/query?where=1=1&returnCountOnly=true&f=json';
        const arcgisResponse = await fetch(arcgisUrl, {
            method: 'GET',
            timeout: 10000
        });
        
        if (arcgisResponse.ok) {
            const arcgisData = await arcgisResponse.json();
            testResults.tests.arcgisConnectivity = 'PASS - Record count: ' + (arcgisData.count || 'unknown');
        } else {
            testResults.tests.arcgisConnectivity = 'FAIL - Status: ' + arcgisResponse.status;
        }
    } catch (error) {
        testResults.tests.arcgisConnectivity = 'FAIL - ' + error.message;
    }
    
    return res.status(200).json(testResults);
}