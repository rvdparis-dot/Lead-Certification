// FILE: api/openphilly-proxy.js
// This file should be saved as: api/openphilly-proxy.js in your Vercel project

export default async function handler(req, res) {
    // Enable CORS for all origins
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed. Use GET.'
        });
    }
    
    try {
        const { query } = req.query;
        
        // Validate query parameter
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Query parameter is required. Example: ?query=opa_account=\'123456789\''
            });
        }
        
        // Log the incoming request
        console.log('=== PROXY REQUEST ===');
        console.log('Query:', query);
        console.log('User Agent:', req.headers['user-agent']);
        console.log('Origin:', req.headers.origin);
        
        // ArcGIS API configuration
        const ARCGIS_API_URL = 'https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services/lhhp_lead_certifications/FeatureServer/0/query';
        
        // Build the URL parameters
        const params = new URLSearchParams({
            where: query,
            outFields: '*',
            f: 'json',
            returnGeometry: 'false',
            maxRecordCount: '100'
        });
        
        const fullUrl = `${ARCGIS_API_URL}?${params.toString()}`;
        
        console.log('=== MAKING REQUEST TO ARCGIS ===');
        console.log('Full URL:', fullUrl);
        
        // Make the request to ArcGIS API
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout
        
        const response = await fetch(fullUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'PhiladelphiaLeadTracker/1.0 (Vercel Proxy)'
            }
        });
        
        clearTimeout(timeoutId);
        
        console.log('=== ARCGIS RESPONSE ===');
        console.log('Status:', response.status);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));
        
        // Check if response is OK
        if (!response.ok) {
            const errorText = await response.text();
            console.error('ArcGIS API Error:', errorText);
            throw new Error(`ArcGIS API returned ${response.status}: ${response.statusText}`);
        }
        
        // Parse the JSON response
        const data = await response.json();
        
        console.log('=== ARCGIS DATA RECEIVED ===');
        console.log('Features count:', data.features ? data.features.length : 0);
        
        // Check for API errors in the response
        if (data.error) {
            console.error('ArcGIS API Error in response:', data.error);
            throw new Error(`ArcGIS API Error: ${data.error.message || 'Unknown error'}`);
        }
        
        // Return successful response
        return res.status(200).json({
            success: true,
            data: data.features || [],
            metadata: {
                count: data.features ? data.features.length : 0,
                timestamp: new Date().toISOString(),
                query: query,
                source: 'OpenPhilly ArcGIS API'
            }
        });
        
    } catch (error) {
        console.error('=== PROXY ERROR ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        let errorMessage = 'Internal server error';
        let statusCode = 500;
        
        if (error.name === 'AbortError') {
            errorMessage = 'Request timed out while connecting to Philadelphia database';
            statusCode = 504;
        } else if (error.message.includes('fetch')) {
            errorMessage = 'Failed to connect to Philadelphia database';
            statusCode = 502;
        } else if (error.message.includes('ArcGIS')) {
            errorMessage = error.message;
            statusCode = 502;
        }
        
        return res.status(statusCode).json({
            success: false,
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString()
        });
    }
}
