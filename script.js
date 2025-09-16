// Build test - 2025-09-16
import { getStoredTokens, storeTokens, clearTokens, isTokenExpired, refreshTokens } from "./tokens.js";
import pkceChallenge from "pkce-challenge";
import { jwtDecode } from "jwt-decode";

document.addEventListener('DOMContentLoaded', () => {
    const questForm = document.getElementById('quest-form');
    const storyOutput = document.getElementById('story-output');
    const loadingSpinner = document.getElementById('loading-spinner');
    const storyText = document.getElementById('story-text');
    const heroImageInput = document.getElementById('heroImage');
    const imagePreview = document.getElementById('image-preview');
    const imageUploadArea = document.getElementById('image-upload-area');
    const loginButton = document.getElementById("login-button");
    const logoutButton = document.getElementById("logout-button");
    const appContent = document.getElementById("app-content");
    const audioPlayer = document.getElementById('story-audio-player');
    const playButton = document.getElementById('play-story-button');
    const uploadToYotoButton = document.getElementById('upload-to-yoto-button');
    const alertModal = document.getElementById('alert-modal');
    const alertMessage = document.getElementById('alert-message');
    const closeButton = document.querySelector('.close-button');
    const themeToggle = document.getElementById('theme-toggle');
    
    let heroImageBase64 = null;
    let accessToken = null;
    let refreshToken = null;
    
    // Audio player state management to prevent infinite loops
    let audioPlayerInitialized = false;

    const clientId = import.meta.env.VITE_CLIENT_ID;

    // --- Modal Functionality ---
    const showAlert = (message) => {
        alertMessage.textContent = message;
        alertModal.classList.remove('hidden');
    };
    closeButton.onclick = () => alertModal.classList.add('hidden');
    window.onclick = (event) => {
        if (event.target === alertModal) {
            alertModal.classList.add('hidden');
        }
    };
    
    // --- Theme Toggle Functionality ---
    const initTheme = () => {
        const savedTheme = localStorage.getItem('storyforge-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    };
    
    const toggleTheme = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('storyforge-theme', newTheme);
        
        // Add a little celebration animation
        themeToggle.style.transform = 'scale(1.2) rotate(360deg)';
        setTimeout(() => {
            themeToggle.style.transform = '';
        }, 300);
    };
    
    themeToggle.addEventListener('click', toggleTheme);
    initTheme();

    // --- Part 1: Authentication Logic ---
    const handleLogin = async () => {
        try {
            const { code_verifier, code_challenge } = await pkceChallenge();
            sessionStorage.setItem('pkce_code_verifier', code_verifier);
            const authUrl = new URL("https://login.yotoplay.com/authorize");
            authUrl.search = new URLSearchParams({
                audience: "https://api.yotoplay.com",
                scope: "offline_access write:myo", // 'write:myo' scope is crucial for creating content
                response_type: "code",
                client_id: clientId,
                code_challenge: code_challenge,
                code_challenge_method: "S256",
                redirect_uri: window.location.origin,
            }).toString();
            window.location.href = authUrl.toString();
        } catch (error) {
            console.error("Error generating PKCE:", error);
            showAlert("An error occurred during login setup.");
        }
    };

    const handleLogout = () => {
        clearTokens();
        appContent.classList.add('hidden');
        loginButton.classList.remove('hidden');
        logoutButton.classList.add('hidden');
    };

    const checkAuthentication = async () => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const error = params.get("error");
        
        if (error) {
            console.error("Authentication error:", error);
            showAlert("Authentication failed. Please try logging in again.");
            loginButton.classList.remove('hidden');
            return;
        }

        if (code) {
            try {
                const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
                if (!codeVerifier) throw new Error("No PKCE code verifier found");

                const res = await fetch("https://login.yotoplay.com/oauth/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        grant_type: "authorization_code",
                        client_id: clientId,
                        code_verifier: codeVerifier,
                        code,
                        redirect_uri: window.location.origin,
                    }).toString(),
                });

                if (!res.ok) {
                    const errorResult = await res.json();
                    throw new Error(`Token exchange failed: ${errorResult.error_description || res.statusText}`);
                }

                const json = await res.json();
                accessToken = json.access_token;
                refreshToken = json.refresh_token;
                storeTokens(accessToken, refreshToken);
                
                sessionStorage.removeItem('pkce_code_verifier');
                window.history.replaceState({}, document.title, window.location.pathname);
                showAppUI();
            } catch (e) {
                console.error(e);
                showAlert(e.message);
                loginButton.classList.remove('hidden');
            }
        } else {
            const stored = getStoredTokens();
            if (stored?.accessToken && !isTokenExpired(stored.accessToken)) {
                accessToken = stored.accessToken;
                refreshToken = stored.refreshToken;
                showAppUI();
            } else if (stored?.refreshToken) {
                 try {
                    const newTokens = await refreshTokens(stored.refreshToken);
                    accessToken = newTokens.accessToken;
                    refreshToken = newTokens.refreshToken;
                    showAppUI();
                 } catch (e) {
                     console.error("Failed to refresh token:", e);
                     showAlert("Session expired. Please log in again.");
                     clearTokens();
                     loginButton.classList.remove('hidden');
                 }
            } else {
                loginButton.classList.remove('hidden');
            }
        }
    };

    const showAppUI = () => {
        loginButton.classList.add('hidden');
        logoutButton.classList.remove('hidden');
        appContent.classList.remove('hidden');
    };

    loginButton.addEventListener('click', handleLogin);
    logoutButton.addEventListener('click', handleLogout);
    // 🎯 PROPER: Create or update StoryForge playlist with new stories as chapters
    async function createOrUpdateStoryForgePlaylist(storyData, accessToken) {
        const PLAYLIST_TITLE = "StoryForge";
        
        try {
            console.log("🔍 Starting StoryForge playlist creation/update...");
            
            // Step 1: Search for existing StoryForge playlist
            console.log("📋 Fetching existing user content...");
            const myoResponse = await fetch("https://api.yotoplay.com/content/mine", {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            
            if (!myoResponse.ok) {
                const errorText = await myoResponse.text();
                console.error('❌ Failed to fetch user content:', {
                    status: myoResponse.status,
                    statusText: myoResponse.statusText,
                    error: errorText
                });
                throw new Error(`Failed to fetch user content: ${myoResponse.status} ${errorText}`);
            }
            
            const myoData = await myoResponse.json();
            console.log('📊 User content response structure:', {
                isArray: Array.isArray(myoData),
                hasCards: !!myoData.cards,
                hasContent: !!myoData.content,
                keys: Object.keys(myoData || {}),
                totalItems: Array.isArray(myoData) ? myoData.length : 
                           (myoData.cards ? myoData.cards.length :
                           (myoData.content ? myoData.content.length : 'unknown'))
            });
            
            // Handle different API response formats
            let contentArray = [];
            if (Array.isArray(myoData)) {
                contentArray = myoData;
            } else if (myoData.cards && Array.isArray(myoData.cards)) {
                contentArray = myoData.cards;
            } else if (myoData.content && Array.isArray(myoData.content)) {
                contentArray = myoData.content;
            }
            
            console.log(`📚 Found ${contentArray.length} existing content items`);
            
            // Look for existing StoryForge playlist
            const existingStoryForge = contentArray.find(item => 
                item && item.title === PLAYLIST_TITLE
            );
            
            let playlistData = null;
            let cardId = null;
            
            if (existingStoryForge) {
                cardId = existingStoryForge.cardId;
                console.log(`🎯 Found existing StoryForge playlist (cardId: ${cardId})`);
                
                // Fetch full playlist data
                console.log(`📥 Fetching full playlist data...`);
                const fullResponse = await fetch(`https://api.yotoplay.com/content/${cardId}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                
                if (!fullResponse.ok) {
                    const errorText = await fullResponse.text();
                    console.error(`❌ Failed to fetch full playlist data:`, {
                        cardId,
                        status: fullResponse.status,
                        statusText: fullResponse.statusText,
                        error: errorText
                    });
                    throw new Error(`Failed to fetch playlist data: ${fullResponse.status}`);
                }
                
                playlistData = await fullResponse.json();
                console.log('📋 Existing playlist structure:', {
                    title: playlistData.title,
                    hasContent: !!playlistData.content,
                    hasChapters: !!(playlistData.content && playlistData.content.chapters),
                    chaptersCount: playlistData.content?.chapters?.length || 0,
                    hasMetadata: !!playlistData.metadata,
                    topLevelKeys: Object.keys(playlistData)
                });
                
            } else {
                console.log("🆕 No existing StoryForge playlist found - will create new one");
            }
            
            // Step 2: Upload cover image (will become the playlist cover)
            let coverImageUrl = null;
            if (storyData.heroImage) {
                console.log("🖼️ Uploading new cover image...");
                try {
                    // Skip SVG images as they're not supported by Yoto API
                    if (storyData.heroImage.includes('image/svg+xml')) {
                        console.log('📝 Skipping SVG image upload (not supported by Yoto API)');
                    } else {
                        const mimeType = storyData.heroImage.substring(
                            storyData.heroImage.indexOf(":") + 1, 
                            storyData.heroImage.indexOf(";")
                        );
                        const imageBytes = atob(storyData.heroImage.split(',')[1]);
                        const imageArray = new Uint8Array(imageBytes.length);
                        for (let i = 0; i < imageBytes.length; i++) {
                            imageArray[i] = imageBytes.charCodeAt(i);
                        }
                        const imageFile = new Blob([imageArray], { type: mimeType });
                    
                        const uploadUrl = new URL("https://api.yotoplay.com/media/coverImage/user/me/upload");
                        uploadUrl.searchParams.set("autoconvert", "true");
                        
                        const uploadResponse = await fetch(uploadUrl, {
                            method: "POST",
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': mimeType,
                            },
                            body: imageFile,
                        });
                        
                        if (uploadResponse.ok) {
                            const uploadResult = await uploadResponse.json();
                            coverImageUrl = uploadResult.coverImage.mediaUrl;
                            console.log("✅ Cover image uploaded:", coverImageUrl);
                        } else {
                            const uploadError = await uploadResponse.text();
                            console.warn("⚠️ Cover image upload failed:", {
                                status: uploadResponse.status,
                                error: uploadError
                            });
                        }
                    }
                } catch (imageError) {
                    console.warn("⚠️ Cover image upload error:", imageError);
                }
            }
            
            // Step 3: Create streaming URL for new story
            // NOTE: Excluding heroImage from URL params to avoid 400 errors from overly long URLs
            // The Yoto streaming endpoint will generate stories without the image if needed
            const streamingUrl = new URL(`${window.location.origin}/api/generate-story`);
            
            // Ensure all parameters are properly encoded and not empty
            const heroName = (storyData.heroName || 'Hero').trim();
            const promptSetup = (storyData.promptSetup || '').trim();
            const promptRising = (storyData.promptRising || '').trim();
            const promptClimax = (storyData.promptClimax || '').trim();
            const age = (storyData.age || '6').trim();
            
            streamingUrl.searchParams.set('heroName', heroName);
            streamingUrl.searchParams.set('promptSetup', promptSetup);
            streamingUrl.searchParams.set('promptRising', promptRising);
            streamingUrl.searchParams.set('promptClimax', promptClimax);
            streamingUrl.searchParams.set('age', age);
            streamingUrl.searchParams.set('audioOnly', 'true');
            
            // Intentionally omitting heroImage to avoid URL length limits
            // Note: This means Yoto streaming will not include the uploaded image
            
            console.log('🎵 Created streaming URL:', streamingUrl.toString());
            console.log('📏 Streaming URL length:', streamingUrl.toString().length);
            
            // Test the streaming URL to make sure it works before sending to Yoto
            // Store streaming URL globally for debugging
            window.lastStreamingUrl = streamingUrl.toString();
            
            console.log('🧪 Testing streaming URL...');
            try {
                const testResponse = await fetch(streamingUrl.toString(), {
                    method: 'HEAD', // Just check if the endpoint responds
                    timeout: 5000
                });
                console.log('✅ Streaming URL test response:', testResponse.status, testResponse.statusText);
                if (!testResponse.ok) {
                    console.warn('⚠️ Streaming URL test failed, but continuing...');
                }
            } catch (testError) {
                console.warn('⚠️ Streaming URL test error (might be CORS, continuing anyway):', testError.message);
            }
            
            console.log('🗺️ To manually test streaming URL, run: window.testStreamingUrl()');
            
            // Step 4: Build playlist structure
            let finalPlaylist;
            
            if (playlistData) {
                // Update existing playlist
                console.log("📝 Updating existing playlist...");
                
                // Ensure proper structure
                if (!playlistData.content) playlistData.content = {};
                if (!playlistData.content.chapters) playlistData.content.chapters = [];
                if (!playlistData.metadata) {
                    playlistData.metadata = {
                        description: "AI-generated stories from The Storyforge",
                        media: { duration: 0, fileSize: 0 }
                    };
                }
                
                // Add new chapter
                const nextChapterNumber = playlistData.content.chapters.length + 1;
                const newChapterKey = String(nextChapterNumber).padStart(2, '0');
                
                const newChapter = {
                    key: newChapterKey,
                    title: storyData.heroName || `Story ${nextChapterNumber}`,
                    tracks: [{
                        key: "01",
                        title: "Chapter One",
                        trackUrl: streamingUrl.toString(),
                        type: "stream",
                        format: "mp3",
                        duration: storyData.duration || 180,
                        fileSize: storyData.fileSize || 1000000
                    }],
                    display: {
                        icon16x16: "yoto:#ZuVmuvnoFiI4el6pBPvq0ofcgQ18HjrCmdPEE7GCnP8"
                    }
                };
                
                playlistData.content.chapters.push(newChapter);
                console.log(`📚 Added chapter ${nextChapterNumber}: "${newChapter.title}"`);
                
                // Recalculate metadata
                const totalDuration = playlistData.content.chapters.reduce((sum, chapter) => {
                    if (chapter?.tracks && Array.isArray(chapter.tracks)) {
                        return sum + chapter.tracks.reduce((trackSum, track) => 
                            trackSum + (track?.duration || 0), 0);
                    }
                    return sum;
                }, 0);
                
                const totalFileSize = playlistData.content.chapters.reduce((sum, chapter) => {
                    if (chapter?.tracks && Array.isArray(chapter.tracks)) {
                        return sum + chapter.tracks.reduce((trackSum, track) => 
                            trackSum + (track?.fileSize || 0), 0);
                    }
                    return sum;
                }, 0);
                
                playlistData.metadata.media = {
                    duration: totalDuration,
                    fileSize: totalFileSize
                };
                
                // Update cover image
                if (coverImageUrl) {
                    playlistData.metadata.cover = { imageL: coverImageUrl };
                }
                
                finalPlaylist = {
                    title: playlistData.title,
                    content: playlistData.content,
                    metadata: playlistData.metadata
                };
                
            } else {
                // Create new playlist
                console.log("🆕 Creating new playlist...");
                
                const newChapter = {
                    key: "01",
                    title: storyData.heroName || "Story 1",
                    tracks: [{
                        key: "01",
                        title: "Chapter One",
                        trackUrl: streamingUrl.toString(),
                        type: "stream",
                        format: "mp3",
                        duration: storyData.duration || 180,
                        fileSize: storyData.fileSize || 1000000
                    }],
                    display: {
                        icon16x16: "yoto:#ZuVmuvnoFiI4el6pBPvq0ofcgQ18HjrCmdPEE7GCnP8"
                    }
                };
                
                finalPlaylist = {
                    title: PLAYLIST_TITLE,
                    content: {
                        chapters: [newChapter]
                    },
                    metadata: {
                        description: "AI-generated stories from The Storyforge",
                        media: {
                            duration: storyData.duration || 180,
                            fileSize: storyData.fileSize || 1000000
                        }
                    }
                };
                
                if (coverImageUrl) {
                    finalPlaylist.metadata.cover = { imageL: coverImageUrl };
                }
            }
            
            console.log('📦 Final payload structure:', {
                title: finalPlaylist.title,
                chaptersCount: finalPlaylist.content.chapters.length,
                hasCover: !!(finalPlaylist.metadata.cover),
                totalDuration: finalPlaylist.metadata.media.duration
            });
            
            // Step 5: Submit to Yoto API
            // Note: Due to CORS restrictions, we'll always create new content instead of updating
            // This means each story becomes a separate card rather than chapters in one playlist
            
            // Create a unique title for each story to avoid conflicts
            const uniqueTitle = cardId ? 
                `${PLAYLIST_TITLE} - ${storyData.heroName || 'Story'}` : 
                PLAYLIST_TITLE;
                
            finalPlaylist.title = uniqueTitle;
            
            console.log(`🆕 Creating new content: "${uniqueTitle}" (CORS workaround)...`);
            const apiResponse = await fetch('https://api.yotoplay.com/content', {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(finalPlaylist)
            });
            
            if (!apiResponse.ok) {
                const errorText = await apiResponse.text();
                console.error('❌ Yoto API Error:', {
                    operation: 'CREATE',
                    endpoint: '/content',
                    method: 'POST',
                    status: apiResponse.status,
                    statusText: apiResponse.statusText,
                    errorBody: errorText,
                    payloadSent: JSON.stringify(finalPlaylist, null, 2)
                });
                
                let parsedError = null;
                try {
                    parsedError = JSON.parse(errorText);
                } catch (e) {
                    // Error is not JSON
                }
                
                throw new Error(`Yoto API content creation failed: ${errorText}`);
            }
            
            const result = await apiResponse.json();
            console.log('✅ Success! StoryForge content created:', {
                operation: 'CREATED',
                cardId: result.cardId,
                title: result.title,
                chapters: result.content?.chapters?.length || 'unknown'
            });
            
            return result;
            
        } catch (error) {
            console.error('💥 Error in createOrUpdateStoryForgePlaylist:', error);
            throw error;
        }
    }

    // --- Mode Switching Logic ---
    let currentMode = null;
    
    // Mode switching functionality
    const initializeModeSelection = () => {
        const modeButtons = document.querySelectorAll('.mode-btn');
        const modeContentContainer = document.getElementById('mode-content');
        const modeSelectionGrid = document.querySelector('.mode-selection-grid');
        const welcomeSection = document.querySelector('.welcome-section');
        
        modeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const selectedMode = button.dataset.mode;
                showMode(selectedMode);
            });
        });
    };
    
    const showMode = (mode) => {
        currentMode = mode;
        console.log(`Switching to ${mode} mode`);
        
        const modeContentContainer = document.getElementById('mode-content');
        const modeSelectionGrid = document.querySelector('.mode-selection-grid');
        const welcomeSection = document.querySelector('.welcome-section');
        
        // Hide welcome section and mode grid
        if (welcomeSection) welcomeSection.classList.add('hidden');
        if (modeSelectionGrid) modeSelectionGrid.classList.add('hidden');
        
        // Show mode content container
        if (modeContentContainer) {
            modeContentContainer.classList.remove('hidden');
            modeContentContainer.innerHTML = getModeContent(mode);
            
            // Set up mode-specific event listeners
            setupModeEventListeners(mode);
        }
    };
    
    const backToModeSelection = () => {
        console.log('Returning to mode selection');
        
        const modeContentContainer = document.getElementById('mode-content');
        const modeSelectionGrid = document.querySelector('.mode-selection-grid');
        const welcomeSection = document.querySelector('.welcome-section');
        
        // Hide mode content
        if (modeContentContainer) {
            modeContentContainer.classList.add('hidden');
            modeContentContainer.innerHTML = '';
        }
        
        // Show welcome section and mode grid
        if (welcomeSection) welcomeSection.classList.remove('hidden');
        if (modeSelectionGrid) modeSelectionGrid.classList.remove('hidden');
        
        currentMode = null;
    };
    
    const getModeContent = (mode) => {
        switch (mode) {
            case 'classic':
                return `
                    <div class="mode-header paper-scrap">
                        <button class="back-to-modes-btn" onclick="backToModeSelection()">
                            ← Back to Modes
                        </button>
                        <h2 class="mode-title-header">
                            <span class="mode-icon">📚</span>
                            <span>Classic Story</span>
                        </h2>
                    </div>
                    
                    <div class="story-form-container">
                        <div class="form-header paper-scrap">
                            <h2 class="form-title">Story Ingredients 🌲</h2>
                            <div class="form-doodles">
                                <span class="doodle">★</span>
                                <span class="doodle">♡</span>
                                <span class="doodle">✨</span>
                            </div>
                        </div>
                        
                        <div class="form-instructions paper-scrap">
                            <p class="instructions-text">
                                <span class="instructions-icon">💡</span>
                                <strong>How it works:</strong> Fill in at least one story element below, and I'll create a magical tale for you! The more details you give me, the better your story will be.
                                <span class="instructions-sparkles">✨</span>
                            </p>
                        </div>
                        
                        <form id="classic-story-form" class="story-form">
                            <!-- Story Elements Section - combines all story inputs -->
                            <div class="story-elements-group paper-scrap">
                                <h3 class="section-title">
                                    <span class="section-icon">📚</span>
                                    <span>Story Elements</span>
                                </h3>
                                
                                <div class="input-row">
                                    <div class="input-group">
                                        <label for="classic-heroName" class="playful-label">
                                            <span class="label-text">Hero's Name</span>
                                            <span class="label-doodle">🦸</span>
                                        </label>
                                        <input type="text" id="classic-heroName" class="paper-input" placeholder="e.g., Captain Comet, Princess Luna...">
                                    </div>

                                    <div class="input-group">
                                        <label for="classic-promptSetup" class="playful-label">
                                            <span class="label-text">The Beginning</span>
                                            <span class="label-doodle">🌅</span>
                                        </label>
                                        <input type="text" id="classic-promptSetup" class="paper-input" placeholder="e.g., a magical forest made of ice cream...">
                                    </div>
                                </div>
                                
                                <div class="input-row">
                                    <div class="input-group">
                                        <label for="classic-promptRising" class="playful-label">
                                            <span class="label-text">The Challenge</span>
                                            <span class="label-doodle">⚡</span>
                                        </label>
                                        <input type="text" id="classic-promptRising" class="paper-input" placeholder="e.g., a grumpy dragon stole the sprinkles...">
                                    </div>

                                    <div class="input-group">
                                        <label for="classic-promptClimax" class="playful-label">
                                            <span class="label-text">The Resolution</span>
                                            <span class="label-doodle">🎆</span>
                                        </label>
                                        <input type="text" id="classic-promptClimax" class="paper-input" placeholder="e.g., the dragon became best friends with everyone...">
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Character & Settings Section - combines image upload and age settings -->
                            <div class="character-settings-group paper-scrap">
                                <h3 class="section-title">
                                    <span class="section-icon">🎨</span>
                                    <span>Character & Settings</span>
                                </h3>
                                
                                <div class="settings-row">
                                    <div class="image-upload-section">
                                        <label for="classic-heroImage" class="playful-label">
                                            <span class="label-text">Draw Your Character</span>
                                            <span class="label-doodle">🎨</span>
                                        </label>
                                        <div id="classic-image-upload-area" class="paper-upload">
                                            <input type="file" id="classic-heroImage" accept="image/*" class="hidden-input">
                                            <div class="upload-content">
                                                <button type="button" class="upload-btn" onclick="document.getElementById('classic-heroImage').click()">
                                                    <span>📎 Upload Drawing</span>
                                                </button>
                                                <p class="upload-hint">or drag and drop your masterpiece here!</p>
                                                <div id="classic-image-preview" class="preview-container hidden"></div>
                                            </div>
                                            <div class="upload-doodles">
                                                <span class="doodle-arrow">→</span>
                                                <span class="doodle-star">★</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="age-selection">
                                        <label for="classic-story-age" class="playful-label">
                                            <span class="label-text">Story Length</span>
                                            <span class="label-doodle">📆</span>
                                        </label>
                                        <select id="classic-story-age" class="paper-select" required>
                                            <option value="3">🧒 Little Listeners (3-6 years, ~150 words)</option>
                                            <option value="6" selected>🧒 Young Explorers (6-8 years, ~500 words)</option>
                                            <option value="9">🧒 Adventure Seekers (8-12 years, ~1000 words)</option>
                                            <option value="12">🧑 Epic Readers (13+ years, ~2000 words)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div class="submit-section paper-scrap">
                                <button type="submit" class="forge-btn">
                                    <span class="btn-text">✨ Forge My Story! ✨</span>
                                    <div class="btn-sparkles">
                                        <span>✨</span>
                                        <span>★</span>
                                        <span>✨</span>
                                    </div>
                                </button>
                                
                                <div class="button-divider">
                                    <span class="divider-text">or</span>
                                    <div class="divider-line"></div>
                                </div>
                                
                                <button type="button" id="classic-surprise-me-btn" class="surprise-btn">
                                    <span class="btn-text">🎲 Surprise Me! 🎲</span>
                                    <div class="btn-sparkles">
                                        <span>🎊</span>
                                        <span>🎉</span>
                                        <span>🎊</span>
                                    </div>
                                </button>
                            </div>
                        </form>
                    </div>
                `;
                
            case 'help':
                return `
                    <div class="mode-header paper-scrap">
                        <button class="back-to-modes-btn" onclick="backToModeSelection()">
                            ← Back to Modes
                        </button>
                        <h2 class="mode-title-header">
                            <span class="mode-icon">💡</span>
                            <span>Help & Templates</span>
                        </h2>
                    </div>
                    
                    <div class="help-content paper-scrap">
                        <div class="help-section">
                            <h3>📚 How to Use StoryForge</h3>
                            <ol>
                                <li><strong>Choose Your Mode:</strong> Select from Classic stories, Wild West adventures, educational tales, bedtime stories, or monster adventures</li>
                                <li><strong>Fill in Details:</strong> Each mode has different inputs to customize your story</li>
                                <li><strong>Generate:</strong> Click the generate button to create your personalized story</li>
                                <li><strong>Listen & Share:</strong> Enjoy the audio narration and share with friends</li>
                                <li><strong>Upload to Yoto:</strong> Connect your Yoto account to add stories to your player</li>
                            </ol>
                        </div>
                        
                        <div class="help-section">
                            <h3>🎭 Story Modes Guide</h3>
                            <div class="mode-guide-grid">
                                <div class="mode-guide">
                                    <h4>📚 Classic Story</h4>
                                    <p>Traditional storytelling with heroes, challenges, and magical endings. Perfect for timeless adventures.</p>
                                </div>
                                <div class="mode-guide">
                                    <h4>🤠 Wanted Poster</h4>
                                    <p>Wild West tales with outlaws, sheriffs, and frontier justice. Great for action-packed adventures.</p>
                                </div>
                                <div class="mode-guide">
                                    <h4>📝 Homework Forge</h4>
                                    <p>Educational stories that make learning fun. Turn any subject into an engaging adventure.</p>
                                </div>
                                <div class="mode-guide">
                                    <h4>🌙 Sleep Forge</h4>
                                    <p>Gentle bedtime stories with calming narration. Perfect for winding down at night.</p>
                                </div>
                                <div class="mode-guide">
                                    <h4>👹 Monster Maker</h4>
                                    <p>Design custom creatures and hear their adventures. Great for creative storytelling.</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="help-section">
                            <h3>💡 Tips for Better Stories</h3>
                            <ul>
                                <li>Be specific with your descriptions - details make stories come alive</li>
                                <li>Think about your audience age when setting story complexity</li>
                                <li>Upload character drawings to personalize your tales</li>
                                <li>Try the Surprise Me feature for unexpected adventures</li>
                                <li>Use Sleep Forge for gentle bedtime stories</li>
                            </ul>
                        </div>
                    </div>
                `;
            
            default:
                return `
                    <div class="mode-header paper-scrap">
                        <button class="back-to-modes-btn" onclick="backToModeSelection()">
                            ← Back to Modes
                        </button>
                        <h2 class="mode-title-header">
                            <span class="mode-icon">🚧</span>
                            <span>${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode</span>
                        </h2>
                    </div>
                    
                    <div class="coming-soon paper-scrap">
                        <h3>Coming Soon!</h3>
                        <p>This story mode is currently under development. Please check back soon for exciting new features!</p>
                        <div class="coming-soon-doodles">
                            <span>🚀</span>
                            <span>⚡</span>
                            <span>✨</span>
                        </div>
                    </div>
                `;
        }
    };
    
    const setupModeEventListeners = (mode) => {
        // Mode-specific event listener setup
        console.log(`Setting up event listeners for ${mode} mode`);
        
        // Make backToModeSelection globally available
        window.backToModeSelection = backToModeSelection;
        
        switch (mode) {
            case 'classic':
                setupClassicModeListeners();
                break;
            // Additional modes will be added here
        }
    };
    
    const setupClassicModeListeners = () => {
        const classicForm = document.getElementById('classic-story-form');
        const classicSurpriseBtn = document.getElementById('classic-surprise-me-btn');
        const classicImageInput = document.getElementById('classic-heroImage');
        const classicImageUploadArea = document.getElementById('classic-image-upload-area');
        const classicImagePreview = document.getElementById('classic-image-preview');
        
        // Form submission
        if (classicForm) {
            classicForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await generateClassicStory(false); // false = not surprise mode
            });
        }
        
        // Surprise Me button
        if (classicSurpriseBtn) {
            classicSurpriseBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await generateClassicStory(true); // true = surprise mode
            });
        }
        
        // Image upload handling
        if (classicImageInput && classicImagePreview) {
            classicImageInput.addEventListener('change', (e) => {
                handleImageUpload(e, classicImagePreview);
            });
        }
        
        // Drag and drop for image upload
        if (classicImageUploadArea) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                classicImageUploadArea.addEventListener(eventName, preventDefaults, false);
            });
            
            ['dragenter', 'dragover'].forEach(eventName => {
                classicImageUploadArea.addEventListener(eventName, () => {
                    classicImageUploadArea.classList.add('drag-over');
                }, false);
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                classicImageUploadArea.addEventListener(eventName, () => {
                    classicImageUploadArea.classList.remove('drag-over');
                }, false);
            });
            
            classicImageUploadArea.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    classicImageInput.files = files;
                    handleImageUpload({ target: { files: files } }, classicImagePreview);
                }
            }, false);
        }
    };
    
    // Helper functions for image upload
    const preventDefaults = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };
    
    const handleImageUpload = (e, previewElement) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                // Create a nice preview with image and success message
                previewElement.innerHTML = `
                    <div class="image-preview-content">
                        <div class="preview-image">
                            <img src="${e.target.result}" alt="Uploaded character" class="uploaded-image">
                        </div>
                        <div class="preview-success">
                            <span class="success-icon">✅</span>
                            <span class="success-text">Image uploaded successfully!</span>
                        </div>
                        <div class="preview-filename">${file.name}</div>
                    </div>
                `;
                previewElement.classList.remove('hidden');
                // Store the base64 data for later use
                heroImageBase64 = e.target.result;
                
                console.log('🖼️ Image uploaded and preview updated');
            };
            reader.readAsDataURL(file);
        } else {
            console.warn('⚠️ Invalid file type. Please upload an image.');
        }
    };
    
    // Main story generation function for Classic mode
    const generateClassicStory = async (isSurpriseMode) => {
        console.log(`Generating classic story, surprise mode: ${isSurpriseMode}`);
        
        // Show story output section
        const storyOutput = document.getElementById('story-output');
        const loadingSpinner = document.getElementById('loading-spinner');
        const storyText = document.getElementById('story-text');
        const uploadToYotoButton = document.getElementById('upload-to-yoto-button');
        
        if (storyOutput) {
            storyOutput.classList.remove('hidden');
            storyOutput.scrollIntoView({ behavior: 'smooth' });
        }
        if (loadingSpinner) loadingSpinner.classList.remove('hidden');
        if (storyText) storyText.textContent = '';
        if (uploadToYotoButton) uploadToYotoButton.classList.add('hidden');
        
        // Update loading text
        const loadingText = document.querySelector('.loading-text span:nth-child(2)');
        if (loadingText) {
            loadingText.textContent = isSurpriseMode ? 
                'Creating a surprise adventure just for you...' : 
                'Brewing your magical story...';
        }
        
        try {
            // Get form data in the format expected by the API
            const formData = {
                heroName: document.getElementById('classic-heroName')?.value.trim() || '',
                promptSetup: document.getElementById('classic-promptSetup')?.value.trim() || '',
                promptRising: document.getElementById('classic-promptRising')?.value.trim() || '',
                promptClimax: document.getElementById('classic-promptClimax')?.value.trim() || '',
                age: document.getElementById('classic-story-age')?.value || '6',
                heroImage: heroImageBase64,
                surpriseMode: isSurpriseMode
            };
            
            // Validate required fields for non-surprise mode
            // User needs at least one story element to generate a story
            if (!isSurpriseMode) {
                const hasAtLeastOneElement = 
                    formData.heroName.trim() || 
                    formData.promptSetup.trim() || 
                    formData.promptRising.trim() || 
                    formData.promptClimax.trim();
                
                if (!hasAtLeastOneElement) {
                    showAlert('Please fill in at least one story element to create your tale! \u2728');
                    return;
                }
            }
            
            console.log('Sending story generation request:', formData);
            
            // Call the existing story generation API
            const response = await fetch('/api/generate-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Handle the response
            if (loadingSpinner) loadingSpinner.classList.add('hidden');
            
            if (data.story && storyText) {
                storyText.textContent = data.story;
            }
            
            // Handle audio if available
            const audioPlayer = document.getElementById('story-audio-player');
            if (data.audio && audioPlayer) {
                try {
                    console.log('🎵 Processing audio data...');
                    console.log('Audio data length:', data.audio.length);
                    console.log('File size from API:', data.fileSize);
                    
                    // Use improved base64 to blob conversion (from experimental code)
                    const audioBlob = b64toBlob(data.audio, 'audio/mpeg');
                    const audioBlobUrl = URL.createObjectURL(audioBlob);
                    
                    console.log('Created audio blob:', audioBlob.size, 'bytes');
                    console.log('Created blob URL:', audioBlobUrl);
                    
                    audioPlayer.src = audioBlobUrl;
                    
                    // Make sure audio player is visible
                    audioPlayer.classList.remove('hidden');
                    audioPlayer.style.display = 'block';
                    audioPlayer.style.width = '100%';
                    
                    console.log('🎮 Audio player visibility set:', !audioPlayer.classList.contains('hidden'));
                    console.log('🎮 Audio player display style:', audioPlayer.style.display);
                    
                    // NO EVENT LISTENERS TO PREVENT INFINITE LOOPS
                    // Just set up the audio source and let the user interact with it
                    
                    console.log('🎵 Audio player setup complete - ready for user interaction');
                } catch (audioError) {
                    console.error('❌ Error setting up audio player:', audioError);
                }
            }
            
            // Show Yoto upload button if user is authenticated
            if (uploadToYotoButton && accessToken) {
                uploadToYotoButton.classList.remove('hidden');
                // Update the existing Yoto upload handler to work with new form data
                setupYotoUploadHandler(formData);
            }
            
        } catch (error) {
            console.error('Error generating story:', error);
            if (loadingSpinner) loadingSpinner.classList.add('hidden');
            if (storyText) {
                storyText.textContent = `Oh no! The storyforge has run out of magic. Error: ${error.message}`;
            }
            showAlert(error.message);
        }
    };
    
    // Helper function to set up Yoto upload handler
    const setupYotoUploadHandler = (storyData) => {
        const uploadButton = document.getElementById('upload-to-yoto-button');
        if (uploadButton) {
            // Remove existing listeners
            uploadButton.replaceWith(uploadButton.cloneNode(true));
            const newUploadButton = document.getElementById('upload-to-yoto-button');
            
            newUploadButton.onclick = async () => {
                newUploadButton.disabled = true;
                newUploadButton.textContent = 'Uploading...';
                
                try {
                    const myoContent = await createOrUpdateStoryForgePlaylist({
                        heroName: storyData.heroName,
                        promptSetup: storyData.promptSetup,
                        promptRising: storyData.promptRising,
                        promptClimax: storyData.promptClimax,
                        age: storyData.age,
                        heroImage: storyData.heroImage
                    }, accessToken);
                    showAlert('Story successfully uploaded as individual Yoto card!');
                    console.log('StoryForge Playlist Updated:', myoContent);
                } catch (e) {
                    console.error("Failed to create/update StoryForge playlist:", e);
                    showAlert("Error updating StoryForge playlist. Please check the console.");
                } finally {
                    newUploadButton.disabled = false;
                    newUploadButton.textContent = 'Upload to Yoto';
                }
            };
        }
    };
    
    // Global debugging function for streaming URL testing
    window.testStreamingUrl = async () => {
        if (!window.lastStreamingUrl) {
            console.error('❌ No streaming URL available. Generate a story first.');
            return;
        }
        
        console.log('🧪 Manual streaming URL test:', window.lastStreamingUrl);
        try {
            const response = await fetch(window.lastStreamingUrl);
            console.log('✅ Test response status:', response.status, response.statusText);
            console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (response.ok) {
                const blob = await response.blob();
                console.log('🎵 Audio blob size:', blob.size, 'bytes');
                console.log('🎵 Audio blob type:', blob.type);
                
                // Create a temporary audio element to test playback
                const testAudio = new Audio(URL.createObjectURL(blob));
                testAudio.addEventListener('loadedmetadata', () => {
                    console.log('✅ Test audio duration:', testAudio.duration, 'seconds');
                });
                testAudio.load();
            } else {
                const errorText = await response.text();
                console.error('❌ Test failed with error:', errorText);
            }
        } catch (error) {
            console.error('❌ Streaming URL test error:', error);
        }
    };
    
    // Utility function to convert Base64 to Blob (improved version from experimental code)
    const b64toBlob = (b64Data, contentType = '', sliceSize = 512) => {
        const byteCharacters = atob(b64Data);
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }

        const blob = new Blob(byteArrays, { type: contentType });
        return blob;
    };
    
    // Debug Panel Functions (Global scope for inline onclick handlers)
    window.toggleDebugPanel = () => {
        const panel = document.getElementById('debug-panel');
        panel.classList.toggle('show');
    };
    
    let debugLogCount = 0;
    const debugLog = (message, type = 'info') => {
        debugLogCount++;
        const timestamp = new Date().toLocaleTimeString();
        const logsDiv = document.getElementById('debug-logs');
        const prefix = {
            'error': '❌',
            'success': '✅', 
            'warning': '⚠️',
            'info': 'ℹ️',
            'debug': '🔧'
        }[type] || 'ℹ️';
        
        if (logsDiv) {
            logsDiv.textContent += `[${timestamp}] ${prefix} ${message}\n`;
            logsDiv.scrollTop = logsDiv.scrollHeight;
            
            if (debugLogCount > 100) {
                const lines = logsDiv.textContent.split('\n');
                logsDiv.textContent = lines.slice(-50).join('\n');
                debugLogCount = 50;
            }
        }
    };
    
    const debugUpdateStatus = (message, type = 'info') => {
        const statusDiv = document.getElementById('debug-status');
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.className = `debug-status ${type}`;
        }
    };
    
    const getDebugParams = () => {
        return {
            heroName: document.getElementById('debug-heroName')?.value?.trim() || 'Test Hero',
            promptSetup: document.getElementById('debug-promptSetup')?.value?.trim() || 'a magical forest',
            promptRising: document.getElementById('debug-promptRising')?.value?.trim() || 'a lost treasure',
            promptClimax: document.getElementById('debug-promptClimax')?.value?.trim() || 'friendship saves the day',
            age: document.getElementById('debug-age')?.value?.trim() || '6',
            audioOnly: 'true'
        };
    };
    
    const buildDebugStreamingUrl = () => {
        const params = getDebugParams();
        const url = new URL(`${window.location.origin}/api/generate-story`);
        
        Object.entries(params).forEach(([key, value]) => {
            if (value) url.searchParams.set(key, value);
        });
        
        const urlString = url.toString();
        const urlDiv = document.getElementById('debug-url');
        if (urlDiv) urlDiv.textContent = urlString;
        debugLog(`Generated URL: ${urlString}`, 'debug');
        
        return urlString;
    };
    
    window.debugTestGET = async () => {
        debugLog('=== TESTING GET REQUEST ===');
        debugUpdateStatus('Testing GET request...', 'info');
        
        const url = buildDebugStreamingUrl();
        
        try {
            const startTime = Date.now();
            const response = await fetch(url, {
                method: 'GET',
                cache: 'no-cache'
            });
            const endTime = Date.now();
            
            debugLog(`Response: ${response.status} ${response.statusText} (${endTime - startTime}ms)`);
            debugLog(`Content-Type: ${response.headers.get('content-type')}`);
            debugLog(`Content-Length: ${response.headers.get('content-length')}`);
            debugLog(`CORS: ${response.headers.get('access-control-allow-origin')}`);
            
            if (response.ok) {
                const blob = await response.blob();
                debugLog(`Success: ${blob.size} bytes, type: ${blob.type}`, 'success');
                
                // Create audio player
                const audioContainer = document.getElementById('debug-audio-container');
                if (audioContainer) {
                    const audioId = `debug-audio-${Date.now()}`;
                    const audioDiv = document.createElement('div');
                    audioDiv.innerHTML = `
                        <div style="background: #f8f9fa; padding: 8px; border-radius: 4px; margin: 5px 0;">
                            <strong>GET Audio (${blob.size} bytes)</strong>
                            <audio id="${audioId}" controls style="width: 100%; margin-top: 5px;">
                                Your browser does not support audio.
                            </audio>
                        </div>
                    `;
                    audioContainer.appendChild(audioDiv);
                    
                    const audioElement = document.getElementById(audioId);
                    audioElement.src = URL.createObjectURL(blob);
                }
                
                debugUpdateStatus('GET request successful', 'success');
            } else {
                const errorText = await response.text();
                debugLog(`Failed: ${errorText}`, 'error');
                debugUpdateStatus(`GET failed: ${response.status}`, 'error');
            }
        } catch (error) {
            debugLog(`Error: ${error.message}`, 'error');
            debugUpdateStatus(`Error: ${error.message}`, 'error');
        }
    };
    
    window.debugTestHEAD = async () => {
        debugLog('=== TESTING HEAD REQUEST ===');
        debugUpdateStatus('Testing HEAD request...', 'info');
        
        const url = buildDebugStreamingUrl();
        
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                cache: 'no-cache'
            });
            
            debugLog(`HEAD Response: ${response.status} ${response.statusText}`);
            for (const [key, value] of response.headers.entries()) {
                debugLog(`${key}: ${value}`, 'debug');
            }
            
            if (response.ok) {
                debugLog('HEAD request successful', 'success');
                debugUpdateStatus('HEAD request successful', 'success');
            } else {
                debugLog(`HEAD failed: ${response.status}`, 'error');
                debugUpdateStatus(`HEAD failed: ${response.status}`, 'error');
            }
        } catch (error) {
            debugLog(`HEAD Error: ${error.message}`, 'error');
            debugUpdateStatus(`HEAD Error: ${error.message}`, 'error');
        }
    };
    
    window.debugTestPOST = async () => {
        debugLog('=== TESTING POST REQUEST ===');
        debugUpdateStatus('Testing POST request...', 'info');
        
        const params = getDebugParams();
        
        try {
            const response = await fetch('/api/generate-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    heroName: params.heroName,
                    promptSetup: params.promptSetup,
                    promptRising: params.promptRising,
                    promptClimax: params.promptClimax,
                    age: params.age
                })
            });
            
            if (!response.ok) throw new Error(`POST failed: ${response.status}`);
            
            const data = await response.json();
            debugLog(`POST Success: ${data.story?.length || 0} chars, ${data.fileSize || 0} bytes`);
            debugUpdateStatus('POST request successful', 'success');
        } catch (error) {
            debugLog(`POST Error: ${error.message}`, 'error');
            debugUpdateStatus(`POST Error: ${error.message}`, 'error');
        }
    };
    
    window.debugCompareEndpoints = async () => {
        debugLog('=== COMPARING POST vs GET ===');
        debugUpdateStatus('Comparing endpoints...', 'info');
        
        try {
            await debugTestPOST();
            await debugTestGET();
            debugUpdateStatus('Comparison complete - check logs', 'success');
        } catch (error) {
            debugLog(`Comparison Error: ${error.message}`, 'error');
            debugUpdateStatus(`Comparison Error: ${error.message}`, 'error');
        }
    };
    
    window.debugClearLogs = () => {
        const logsDiv = document.getElementById('debug-logs');
        if (logsDiv) logsDiv.textContent = '🧹 Logs cleared\n';
        debugLogCount = 0;
        debugUpdateStatus('Logs cleared', 'info');
    };
    
    // Initialize debug panel
    const initDebugPanel = () => {
        // Show debug panel if ?debug=true in URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('debug') === 'true') {
            const panel = document.getElementById('debug-panel');
            if (panel) {
                panel.classList.add('show');
                debugLog('Debug panel auto-opened from URL parameter', 'info');
            }
        }
        
        // Keyboard shortcut: Ctrl+Shift+D
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                window.toggleDebugPanel();
                debugLog('Debug panel toggled via keyboard shortcut', 'info');
            }
        });
        
        debugLog('Debug panel initialized. Use Ctrl+Shift+D or ?debug=true to open', 'info');
    };
    
    // Initialize debug panel
    initDebugPanel();
    
    // Initialize mode selection after all functions are defined
    initializeModeSelection();
    
    // Initial check on page load
    checkAuthentication();
});
