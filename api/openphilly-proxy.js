// FILE: api/openphilly-proxy.js
// Deploy this to Vercel to create a mobile-friendly proxy

export default async function handler(req, res) {
    // Enable CORS for all origins
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Query parameter is required'
            });
        }
        
        // ArcGIS API configuration
        const ARCGIS_API_URL = 'https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services/lhhp_lead_certifications/FeatureServer/0/query';
        
        const params = new URLSearchParams({
            where: query,
            outFields: '*',
            f: 'json',
            returnGeometry: 'false'
        });
        
        const url = `${ARCGIS_API_URL}?${params.toString()}`;
        
        console.log('Proxy API call:', url);
        
        // Make the request from server-side (no CORS issues)
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'PhiladelphiaLeadTracker/1.0'
            },
            timeout: 30000
        });
        
        if (!response.ok) {
            throw new Error(`ArcGIS API returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(`ArcGIS API Error: ${data.error.message}`);
        }
        
        return res.status(200).json({
            success: true,
            data: data.features || [],
            metadata: {
                count: data.features ? data.features.length : 0,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Proxy error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
}

// ================================
// UPDATE YOUR HTML FILE:
// Replace the executeArcGISQuery function with this version:
// ================================

const executeArcGISQuery = async (query) => {
    try {
        // Use your deployed proxy instead of direct API call
        const PROXY_URL = 'https://your-app.vercel.app/api/openphilly-proxy'; // Update this URL
        
        const url = `${PROXY_URL}?query=${encodeURIComponent(query)}`;
        
        console.log('=== PROXY API CALL ===');
        console.log('Query:', query);
        console.log('Proxy URL:', url);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Accept': 'application/json'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Proxy API Error Response:', errorText);
            throw new Error(`Proxy returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('=== PROXY API RESPONSE ===');
        console.log('Success:', result.success);
        console.log('Data count:', result.metadata?.count || 0);
        
        if (!result.success) {
            throw new Error(result.error || 'Unknown proxy error');
        }
        
        // Convert back to ArcGIS format for compatibility
        return {
            features: result.data
        };
        
    } catch (error) {
        console.error('=== PROXY API ERROR ===');
        console.error('Error details:', error);
        
        if (error.name === 'AbortError') {
            throw new Error('Search timed out - please try again.');
        }
        throw error;
    }
};
