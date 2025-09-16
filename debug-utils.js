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