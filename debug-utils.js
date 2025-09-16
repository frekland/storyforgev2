// Simple debug utilities for Yoto API testing
// This version is designed to not interfere with Vite bundling

console.log('🔧 Loading Yoto debug utilities...');

// Manual test function for Yoto upload workflow
window.testYotoUploadWorkflow = async function() {
    try {
        console.log('🧪 Testing Yoto upload workflow manually...');
        
        const accessToken = localStorage.getItem('yoto_access_token');
        if (!accessToken) {
            console.error('❌ No access token found - please log in first');
            return;
        }
        
        // Step 1: Test upload URL endpoint
        console.log('🔗 Step 1: Testing upload URL endpoint...');
        const uploadUrlResponse = await fetch('https://api.yotoplay.com/media/transcode/audio/uploadUrl', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });
        
        console.log('🔍 Upload URL Response:', {
            status: uploadUrlResponse.status,
            statusText: uploadUrlResponse.statusText,
            headers: Object.fromEntries(uploadUrlResponse.headers.entries())
        });
        
        if (uploadUrlResponse.ok) {
            const uploadUrlData = await uploadUrlResponse.json();
            console.log('📊 Upload URL Data:', uploadUrlData);
            return uploadUrlData;
        } else {
            const errorText = await uploadUrlResponse.text();
            console.error('❌ Upload URL failed:', errorText);
            return null;
        }
    } catch (error) {
        console.error('❌ Test failed:', error);
        return null;
    }
};

// Quick check if user is authenticated
window.checkYotoAuth = function() {
    const token = localStorage.getItem('yoto_access_token');
    console.log('🔐 Yoto authentication status:', {
        hasToken: !!token,
        tokenLength: token ? token.length : 0
    });
    return !!token;
};

console.log('✅ Debug functions loaded: testYotoUploadWorkflow(), checkYotoAuth()');

// Auto-run diagnostics when page loads
window.addEventListener('load', async function() {
    // Wait a bit for everything to initialize
    setTimeout(async () => {
        console.log('🔄 Auto-running Yoto API diagnostics...');
        
        // Check if we're logged in
        const authStatus = window.checkYotoAuth();
        
        if (authStatus) {
            console.log('✅ User is authenticated, testing upload workflow...');
            await window.testYotoUploadWorkflow();
        } else {
            console.log('❌ User not authenticated - skipping API tests');
        }
        
        // Create a visual debug panel
        createDebugPanel();
    }, 2000);
});

// Create visual debug panel in the UI
function createDebugPanel() {
    // Only create if user is logged in and panel doesn't exist
    if (!window.checkYotoAuth() || document.getElementById('debug-panel')) {
        return;
    }
    
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0.9);
        color: white;
        padding: 15px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    debugPanel.innerHTML = `
        <div style="margin-bottom: 10px; font-weight: bold; color: #4CAF50;">🔧 Yoto API Debug Panel</div>
        <div id="debug-results">Running diagnostics...</div>
        <button onclick="runDiagnostics()" style="margin-top: 10px; padding: 5px 10px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">Rerun Tests</button>
        <button onclick="document.getElementById('debug-panel').remove()" style="margin: 10px 0 0 5px; padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
    `;
    
    document.body.appendChild(debugPanel);
    
    // Run the actual diagnostics
    runDiagnostics();
}

// Run diagnostics and update the panel
window.runDiagnostics = async function() {
    const resultsDiv = document.getElementById('debug-results');
    if (!resultsDiv) return;
    
    resultsDiv.innerHTML = 'Running diagnostics...';
    
    try {
        let results = [];
        
        // Test 1: Authentication
        const authStatus = window.checkYotoAuth();
        results.push(`✅ Auth Status: ${authStatus ? 'Authenticated' : 'Not logged in'}`);
        
        if (!authStatus) {
            results.push(`❌ Please log in to Yoto to run API tests`);
            resultsDiv.innerHTML = results.join('<br>');
            return;
        }
        
        // Test 2: Upload URL endpoint
        results.push(`🔄 Testing upload URL endpoint...`);
        resultsDiv.innerHTML = results.join('<br>');
        
        const uploadTest = await window.testYotoUploadWorkflow();
        
        if (uploadTest) {
            results[results.length - 1] = `✅ Upload URL: SUCCESS`;
            results.push(`📄 Upload ID: ${uploadTest.upload?.uploadId || 'N/A'}`);
            results.push(`🔗 Upload URL: ${uploadTest.upload?.uploadUrl ? 'Provided' : 'Missing'}`);
        } else {
            results[results.length - 1] = `❌ Upload URL: FAILED`;
        }
        
        // Test 3: Current playlist structure
        results.push(`🔄 Checking current playlist...`);
        resultsDiv.innerHTML = results.join('<br>');
        
        try {
            const accessToken = localStorage.getItem('yoto_access_token');
            const contentResponse = await fetch('https://api.yotoplay.com/content/mine', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            
            if (contentResponse.ok) {
                const contentData = await contentResponse.json();
                const storyForgeContent = (contentData.cards || contentData || []).find(item => 
                    item && item.title && item.title.includes('StoryForge')
                );
                
                results[results.length - 1] = `✅ Content API: SUCCESS`;
                results.push(`📚 StoryForge playlist: ${storyForgeContent ? 'Found' : 'Not found'}`);
                results.push(`📊 Total content items: ${(contentData.cards || contentData || []).length}`);
            } else {
                results[results.length - 1] = `❌ Content API: FAILED (${contentResponse.status})`;
            }
        } catch (e) {
            results[results.length - 1] = `❌ Content API: ERROR`;
        }
        
        resultsDiv.innerHTML = results.join('<br>');
        
    } catch (error) {
        resultsDiv.innerHTML = `❌ Diagnostics failed: ${error.message}`;
    }
};
