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
    let sceneImageBase64 = null;
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
        
        // Hide Yoto connection status
        const yotoStatus = document.getElementById('yoto-status');
        if (yotoStatus) {
            yotoStatus.classList.add('hidden');
        }
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
        
        // Show Yoto connection status
        const yotoStatus = document.getElementById('yoto-status');
        if (yotoStatus) {
            yotoStatus.classList.remove('hidden');
        }
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
            
            // Step 3: Upload audio using Yoto's 4-step permanent upload workflow
            console.log('🎵 Starting Yoto permanent upload workflow...');
            let trackUrl = null;
            let mediaInfo = null;
            
            // Show progress to user
            const progressElement = document.querySelector('.upload-progress');
            if (progressElement) {
                progressElement.textContent = 'Preparing audio... (0%)';
            }
            
            try {
                // Use the existing perfect audio - no regeneration needed!
                console.log('🎼 Using existing perfect audio for Yoto upload...');
                
                if (!storyData.audio) {
                    throw new Error('No audio data available - generate story first');
                }
                
                console.log('✅ Using existing audio:', {
                    storyLength: storyData.story?.length || 0,
                    audioSize: storyData.fileSize || 0,
                    duration: storyData.duration || 0
                });
                
                // Convert existing base64 to blob for upload (MP3 format)
                const audioBlob = b64toBlob(storyData.audio, 'audio/mpeg');
                console.log('🔄 Converted existing audio to blob:', audioBlob.size, 'bytes');
                
                if (progressElement) {
                    progressElement.textContent = 'Getting upload URL... (10%)';
                }
                
                // STEP 1: Get upload URL from Yoto's transcoding service
                console.log('🔗 Step 1: Getting upload URL...');
                const uploadUrlResponse = await fetch('https://api.yotoplay.com/media/transcode/audio/uploadUrl', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json'
                    }
                });
                
                if (!uploadUrlResponse.ok) {
                    const errorText = await uploadUrlResponse.text();
                    throw new Error(`Failed to get upload URL: ${uploadUrlResponse.status} - ${errorText}`);
                }
                
                const { upload: { uploadUrl: audioUploadUrl, uploadId } } = await uploadUrlResponse.json();
                console.log('✅ Upload URL obtained:', { uploadId, hasUrl: !!audioUploadUrl });
                
                if (progressElement) {
                    progressElement.textContent = 'Uploading audio... (25%)';
                }
                
                // STEP 2: Upload the audio file to the secured URL
                console.log('⬆️ Step 2: Uploading audio file...');
                const uploadResponse = await fetch(audioUploadUrl, {
                    method: 'PUT',
                    body: new Blob([audioBlob], {
                        type: 'audio/mpeg'
                    }),
                    headers: {
                        'Content-Type': 'audio/mpeg'
                    }
                });
                
                if (!uploadResponse.ok) {
                    throw new Error(`Audio upload failed: ${uploadResponse.status}`);
                }
                
                console.log('✅ Audio uploaded successfully, waiting for transcoding...');
                
                if (progressElement) {
                    progressElement.textContent = 'Transcoding audio... (50%)';
                }
                
                // STEP 3: Wait for transcoding to complete
                console.log('⚙️ Step 3: Waiting for transcoding...');
                let transcodedAudio = null;
                let attempts = 0;
                const maxAttempts = 60; // 30 seconds timeout
                
                while (attempts < maxAttempts) {
                    const transcodeResponse = await fetch(
                        `https://api.yotoplay.com/media/upload/${uploadId}/transcoded?loudnorm=false`,
                        {
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Accept': 'application/json'
                            }
                        }
                    );
                    
                    if (transcodeResponse.ok) {
                        const data = await transcodeResponse.json();
                        
                        if (data.transcode && data.transcode.transcodedSha256) {
                            console.log('✅ Transcoding complete:', data.transcode);
                            transcodedAudio = data.transcode;
                            mediaInfo = transcodedAudio.transcodedInfo;
                            break;
                        }
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 500));
                    attempts++;
                    
                    const progress = 50 + (attempts / maxAttempts) * 25;
                    if (progressElement) {
                        progressElement.textContent = `Transcoding audio... (${Math.round(progress)}%)`;
                    }
                    console.log(`⏳ Transcoding progress: ${Math.round(progress)}%`);
                }
                
                if (!transcodedAudio) {
                    throw new Error('Transcoding timed out after 30 seconds');
                }
                
                // STEP 4: Create permanent trackUrl with yoto:#hash
                trackUrl = `yoto:#${transcodedAudio.transcodedSha256}`;
                console.log('✅ Permanent trackUrl created:', trackUrl);
                console.log('📊 Media info:', mediaInfo);
                
                // Store media info for playlist creation
                storyData.mediaInfo = mediaInfo;
                
                if (progressElement) {
                    progressElement.textContent = 'Creating playlist... (85%)';
                }
                
            } catch (uploadError) {
                console.error('❌ Error in permanent upload workflow:', uploadError);
                throw uploadError; // Don't use fallback - we want to fix upload issues, not hide them
            }
            
    // Store URL globally for debugging
    window.lastTrackUrl = trackUrl;
    
    // Debug function to examine working Yoto content
    window.debugYotoContent = async function(cardId) {
        try {
            const accessToken = await getAccessToken();
            const response = await fetch(`https://api.yotoplay.com/content/${cardId}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            
            if (!response.ok) {
                console.error('Failed to fetch content:', response.status);
                return;
            }
            
            const content = await response.json();
            console.log('🔍 Working Yoto content structure:', content);
            
            content.content?.chapters?.forEach((chapter, chapterIndex) => {
                console.log(`📚 Chapter ${chapterIndex + 1}:`, {
                    key: chapter.key,
                    title: chapter.title,
                    trackCount: chapter.tracks?.length || 0
                });
                
                chapter.tracks?.forEach((track, trackIndex) => {
                    console.log(`  🎵 Track ${trackIndex + 1}:`, {
                        key: track.key,
                        title: track.title,
                        trackUrl: track.trackUrl,
                        type: track.type,
                        format: track.format,
                        duration: track.duration,
                        fileSize: track.fileSize,
                        hasTrackUrl: !!track.trackUrl,
                        urlType: track.trackUrl ? 
                            (track.trackUrl.startsWith('yoto:#') ? 'permanent-hash' : 
                             (track.trackUrl.startsWith('https://api.yotoplay.com') ? 'yoto-audio' : 'external-stream')) : 'none'
                    });
                });
            });
            
            return content;
        } catch (error) {
            console.error('Error examining Yoto content:', error);
        }
    };
            
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
                
                const trackData = {
                    key: "01",
                    title: "Chapter One",
                    trackUrl: trackUrl,
                    type: (trackUrl.startsWith('yoto:#') || trackUrl.startsWith('https://api.yotoplay.com')) ? "audio" : "stream",
                    format: "mp3", // Always MP3 now, matching Yoto's official example
                    duration: storyData.duration || (mediaInfo?.duration) || 180,
                    fileSize: storyData.fileSize || (mediaInfo?.fileSize) || 1000000
                };
                
                console.log('🎵 Track data being added to existing playlist:', {
                    trackUrl: trackData.trackUrl,
                    type: trackData.type,
                    format: trackData.format,
                    duration: trackData.duration,
                    fileSize: trackData.fileSize,
                    isPermanentUrl: trackUrl.startsWith('yoto:#') || trackUrl.startsWith('https://api.yotoplay.com'),
                    urlType: trackUrl.startsWith('yoto:#') ? 'permanent-hash' : (trackUrl.startsWith('https://api.yotoplay.com') ? 'yoto-audio' : 'stream'),
                    urlLength: trackUrl.length
                });
                
                const newChapter = {
                    key: newChapterKey,
                    title: storyData.heroName || `Story ${nextChapterNumber}`,
                    tracks: [trackData],
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
                
                const trackData = {
                    key: "01",
                    title: "Chapter One",
                    trackUrl: trackUrl,
                    type: (trackUrl.startsWith('yoto:#') || trackUrl.startsWith('https://api.yotoplay.com')) ? "audio" : "stream",
                    format: "mp3", // Always MP3 now, matching Yoto's official example
                    duration: storyData.duration || (mediaInfo?.duration) || 180,
                    fileSize: storyData.fileSize || (mediaInfo?.fileSize) || 1000000
                };
                
                console.log('🎵 Track data being added to new playlist:', {
                    trackUrl: trackData.trackUrl,
                    type: trackData.type,
                    format: trackData.format,
                    duration: trackData.duration,
                    fileSize: trackData.fileSize,
                    isPermanentUrl: trackUrl.startsWith('yoto:#') || trackUrl.startsWith('https://api.yotoplay.com'),
                    urlType: trackUrl.startsWith('yoto:#') ? 'permanent-hash' : (trackUrl.startsWith('https://api.yotoplay.com') ? 'yoto-audio' : 'stream'),
                    urlLength: trackUrl.length
                });
                
                const newChapter = {
                    key: "01",
                    title: storyData.heroName || "Story 1",
                    tracks: [trackData],
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
            
            // Log the complete track details that will be sent to Yoto
            finalPlaylist.content.chapters.forEach((chapter, chapterIndex) => {
                console.log(`🎵 Chapter ${chapterIndex + 1} tracks:`);
                chapter.tracks?.forEach((track, trackIndex) => {
                    console.log(`  📀 Track ${trackIndex + 1}:`, {
                        title: track.title,
                        trackUrl: track.trackUrl?.substring(0, 80) + '...',
                        fullTrackUrl: track.trackUrl,
                        type: track.type,
                        format: track.format,
                        duration: track.duration,
                        fileSize: track.fileSize
                    });
                });
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
            
            // Update progress to completion
            if (progressElement) {
                progressElement.textContent = '✅ Story created successfully! (100%)';
            }
            
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
                    <div class="mode-header-compact">
                        <button class="back-to-modes-btn" onclick="backToModeSelection()">
                            ← Back to Modes
                        </button>
                        <div class="mode-info">
                            <h2 class="mode-title-compact">
                                <span class="mode-icon">📚</span>
                                <span>Classic Story</span>
                            </h2>
                            <div class="mode-actions">
                                <button class="help-btn" onclick="showModeHelp('classic')" title="How does Classic Story work?">
                                    <span>?</span>
                                </button>
                                <button class="print-btn" onclick="printStoryWorksheet()" title="Print story arc worksheet">
                                    <span>🖨️</span>
                                    <span>Print story arc worksheet</span>
                                </button>
                            </div>
                        </div>
                        
                        <!-- Age Selection moved up -->
                        <div class="age-selection-compact">
                            <label for="classic-story-age" class="compact-label">
                                <span>Story Length:</span>
                            </label>
                            <select id="classic-story-age" class="paper-select" required>
                                <option value="3">🧒 Little Listeners (3-6 years, ~150 words)</option>
                                <option value="6" selected>🧒 Young Explorers (6-8 years, ~500 words)</option>
                                <option value="9">🧒 Adventure Seekers (8-12 years, ~1000 words)</option>
                                <option value="12">🧑 Epic Readers (13+ years, ~2000 words)</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="story-form-container">
                        
                        <form id="classic-story-form" class="story-form">
                            <!-- Unified Story Creation Section -->
                            <div class="unified-story-group paper-scrap">
                                <h3 class="section-title">
                                    <span class="section-icon">✨</span>
                                    <span>Create Your Story</span>
                                </h3>
                                
                                <!-- Story Elements -->
                                <div class="story-elements">
                                    <div class="input-grid">
                                        <div class="input-group">
                                            <label for="classic-heroName" class="compact-label">
                                                <span>🦸 Hero's Name</span>
                                            </label>
                                            <input type="text" id="classic-heroName" class="paper-input" placeholder="e.g., Captain Comet, Princess Luna...">
                                        </div>
                                        <div class="input-group">
                                            <label for="classic-promptSetup" class="compact-label">
                                                <span>🌅 The Beginning</span>
                                            </label>
                                            <input type="text" id="classic-promptSetup" class="paper-input" placeholder="e.g., a magical forest made of ice cream...">
                                        </div>
                                        <div class="input-group">
                                            <label for="classic-promptRising" class="compact-label">
                                                <span>⚡ The Challenge</span>
                                            </label>
                                            <input type="text" id="classic-promptRising" class="paper-input" placeholder="e.g., a grumpy dragon stole the sprinkles...">
                                        </div>
                                        <div class="input-group">
                                            <label for="classic-promptClimax" class="compact-label">
                                                <span>🎆 The Resolution</span>
                                            </label>
                                            <input type="text" id="classic-promptClimax" class="paper-input" placeholder="e.g., the dragon became best friends with everyone...">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Character & Scene Images -->
                                <div class="images-section">
                                    <div class="image-uploads">
                                        <div class="image-upload-compact">
                                            <label for="classic-heroImage" class="compact-label">
                                                <span>🎨 Character Drawing (Optional)</span>
                                            </label>
                                            <div id="classic-image-upload-area" class="upload-area-compact">
                                                <input type="file" id="classic-heroImage" accept="image/*" class="hidden-input">
                                                <button type="button" class="upload-btn-compact" onclick="document.getElementById('classic-heroImage').click()">
                                                    <span>📎 Upload</span>
                                                </button>
                                                <div id="classic-image-preview" class="preview-container hidden"></div>
                                            </div>
                                        </div>
                                        
                                        <div class="image-upload-compact">
                                            <label for="classic-sceneImage" class="compact-label">
                                                <span>🏖️ Scene Drawing (Optional)</span>
                                            </label>
                                            <div id="classic-scene-upload-area" class="upload-area-compact">
                                                <input type="file" id="classic-sceneImage" accept="image/*" class="hidden-input">
                                                <button type="button" class="upload-btn-compact" onclick="document.getElementById('classic-sceneImage').click()">
                                                    <span>🏖️ Upload</span>
                                                </button>
                                                <div id="classic-scene-preview" class="preview-container hidden"></div>
                                            </div>
                                        </div>
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
        const classicSceneInput = document.getElementById('classic-sceneImage');
        const classicSceneUploadArea = document.getElementById('classic-scene-upload-area');
        const classicScenePreview = document.getElementById('classic-scene-preview');
        
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
        
        // Character image upload handling
        if (classicImageInput && classicImagePreview) {
            classicImageInput.addEventListener('change', (e) => {
                handleImageUpload(e, classicImagePreview, 'character');
            });
        }
        
        // Scene image upload handling
        if (classicSceneInput && classicScenePreview) {
            classicSceneInput.addEventListener('change', (e) => {
                handleImageUpload(e, classicScenePreview, 'scene');
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
                    handleImageUpload({ target: { files: files } }, classicImagePreview, 'character');
                }
            }, false);
        }
        
        // Drag and drop for scene image upload
        if (classicSceneUploadArea) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                classicSceneUploadArea.addEventListener(eventName, preventDefaults, false);
            });
            
            ['dragenter', 'dragover'].forEach(eventName => {
                classicSceneUploadArea.addEventListener(eventName, () => {
                    classicSceneUploadArea.classList.add('drag-over');
                }, false);
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                classicSceneUploadArea.addEventListener(eventName, () => {
                    classicSceneUploadArea.classList.remove('drag-over');
                }, false);
            });
            
            classicSceneUploadArea.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    classicSceneInput.files = files;
                    handleImageUpload({ target: { files: files } }, classicScenePreview, 'scene');
                }
            }, false);
        }
    };
    
    // Helper functions for image upload
    const preventDefaults = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };
    
    // Image compression function to reduce payload size for Vercel
    const compressImage = (file, maxWidth = 800, quality = 0.8) => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Calculate new dimensions while maintaining aspect ratio
                let { width, height } = img;
                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxWidth) {
                        width = (width * maxWidth) / height;
                        height = maxWidth;
                    }
                }
                
                // Set canvas size and draw compressed image
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to base64 with compression
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedBase64);
            };
            
            img.src = URL.createObjectURL(file);
        });
    };
    
    const handleImageUpload = async (e, previewElement, imageType = 'character') => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            try {
                // Show processing state
                const processingText = imageType === 'scene' ? 'Processing scene...' : 'Processing character...';
                previewElement.innerHTML = `
                    <div class="image-preview-content">
                        <div class="preview-loading">
                            <span class="loading-icon">⏳</span>
                            <span class="loading-text">${processingText}</span>
                        </div>
                    </div>
                `;
                previewElement.classList.remove('hidden');
                
                // Compress image to ensure it fits within Vercel limits
                const compressedBase64 = await compressImage(file, 600, 0.7); // More aggressive compression
                
                // Calculate compression stats
                const originalSize = file.size;
                const compressedSize = Math.round(compressedBase64.length * 0.75); // Rough base64 to bytes
                const reduction = Math.round((1 - compressedSize / originalSize) * 100);
                
                const altText = imageType === 'scene' ? 'Uploaded scene' : 'Uploaded character';
                const successText = imageType === 'scene' ? 'Scene ready!' : 'Character ready!';
                
                // Create success preview
                previewElement.innerHTML = `
                    <div class="image-preview-content">
                        <div class="preview-image">
                            <img src="${compressedBase64}" alt="${altText}" class="uploaded-image">
                        </div>
                        <div class="preview-success">
                            <span class="success-icon">✅</span>
                            <span class="success-text">${successText} (${reduction > 0 ? reduction + '% smaller' : 'optimized'})</span>
                        </div>
                        <div class="preview-filename">${file.name}</div>
                    </div>
                `;
                
                // Store compressed base64 data
                if (imageType === 'scene') {
                    sceneImageBase64 = compressedBase64;
                    console.log('🖼️ Scene image compressed and ready:', {
                        original: Math.round(originalSize / 1024) + 'KB',
                        compressed: Math.round(compressedSize / 1024) + 'KB',
                        reduction: reduction + '%'
                    });
                } else {
                    heroImageBase64 = compressedBase64;
                    console.log('🖼️ Character image compressed and ready:', {
                        original: Math.round(originalSize / 1024) + 'KB',
                        compressed: Math.round(compressedSize / 1024) + 'KB',
                        reduction: reduction + '%'
                    });
                }
            } catch (error) {
                console.error('❌ Image processing failed:', error);
                previewElement.innerHTML = `
                    <div class="image-preview-content">
                        <div class="preview-error">
                            <span class="error-icon">❌</span>
                            <span class="error-text">Failed to process image. Please try a smaller file.</span>
                        </div>
                    </div>
                `;
            }
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
            // First, analyze any uploaded images to get descriptions
            let characterDescription = null;
            let sceneDescription = null;
            
            if (heroImageBase64 || sceneImageBase64) {
                // Show image analysis progress
                const loadingText = document.querySelector('.loading-text span:nth-child(2)');
                if (loadingText) {
                    loadingText.textContent = 'Analyzing your artwork...';
                }
                
                console.log('🖼️ Starting image analysis...');
                
                try {
                    // Create payload and check size before sending
                    const payload = {
                        heroImage: heroImageBase64,
                        sceneImage: sceneImageBase64,
                        imageType: 'both'
                    };
                    
                    const payloadSize = JSON.stringify(payload).length;
                    const maxSize = 5 * 1024 * 1024; // 5MB conservative limit
                    
                    console.log('📄 Image analysis payload size:', Math.round(payloadSize / 1024) + 'KB');
                    
                    if (payloadSize > maxSize) {
                        throw new Error(`Images still too large after compression (${Math.round(payloadSize/1024/1024)}MB). Try smaller images.`);
                    }
                    
                    const imageAnalysisResponse = await fetch('/api/upload-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    
                    if (!imageAnalysisResponse.ok) {
                        console.warn('⚠️ Image analysis failed, proceeding without descriptions');
                    } else {
                        const analysisResult = await imageAnalysisResponse.json();
                        characterDescription = analysisResult.characterDescription;
                        sceneDescription = analysisResult.sceneDescription;
                        console.log('✅ Image analysis complete:', {
                            hasCharacterDescription: !!characterDescription,
                            hasSceneDescription: !!sceneDescription
                        });
                    }
                } catch (imageError) {
                    console.warn('⚠️ Image analysis error, proceeding without descriptions:', imageError);
                }
                
                // Update loading text for story generation
                if (loadingText) {
                    loadingText.textContent = isSurpriseMode ? 
                        'Creating a surprise adventure just for you...' : 
                        'Brewing your magical story...';
                }
            }
            
            // Get form data in the format expected by the API (without large image data)
            const formData = {
                heroName: document.getElementById('classic-heroName')?.value.trim() || '',
                promptSetup: document.getElementById('classic-promptSetup')?.value.trim() || '',
                promptRising: document.getElementById('classic-promptRising')?.value.trim() || '',
                promptClimax: document.getElementById('classic-promptClimax')?.value.trim() || '',
                age: document.getElementById('classic-story-age')?.value || '6',
                characterDescription: characterDescription,
                sceneDescription: sceneDescription,
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
            
            // Basic debug info for troubleshooting if needed
            if (data.debug && data.debug.punctuationAnalysis.storyContainsDot > 0) {
                console.log('⚠️ Story contains', data.debug.punctuationAnalysis.storyContainsDot, 'dot words - may need cleaning');
            }
            
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
            
            // Auto-upload to Yoto immediately if user is authenticated
            if (accessToken) {
                console.log('🚀 Auto-uploading to Yoto immediately...');
                try {
                    // Prepare complete story data with the perfect audio
                    const completeStoryData = {
                        ...formData,
                        story: data.story,
                        audio: data.audio, // The perfect base64 audio
                        duration: data.duration,
                        fileSize: data.fileSize
                    };
                    
                    // Start Yoto upload immediately
                    createOrUpdateStoryForgePlaylist(completeStoryData, accessToken)
                        .then(() => {
                            console.log('✅ Auto-uploaded to Yoto successfully!');
                            showAlert('Story created and automatically uploaded to Yoto! 🎧');
                        })
                        .catch((yotoError) => {
                            console.error('❌ Auto-upload to Yoto failed:', yotoError);
                            showAlert('Story created successfully! Yoto upload failed - you can retry manually.');
                        });
                } catch (autoUploadError) {
                    console.error('❌ Error in auto-upload setup:', autoUploadError);
                }
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
                        heroImage: storyData.heroImage,
                        surpriseMode: storyData.surpriseMode,
                        // CRITICAL: Include the image descriptions for perfect audio
                        characterDescription: storyData.characterDescription,
                        sceneDescription: storyData.sceneDescription
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
    
    // Simple Debug Functions
    let simpleLogCount = 0;
    const simpleLog = (message, type = 'info') => {
        simpleLogCount++;
        const timestamp = new Date().toLocaleTimeString();
        const logsDiv = document.getElementById('debug-logs-simple');
        const prefix = {
            'error': '❌',
            'success': '✅', 
            'warning': '⚠️',
            'info': 'ℹ️'
        }[type] || 'ℹ️';
        
        if (logsDiv) {
            logsDiv.textContent += `[${timestamp}] ${prefix} ${message}\n`;
            logsDiv.scrollTop = logsDiv.scrollHeight;
            
            if (simpleLogCount > 50) {
                const lines = logsDiv.textContent.split('\n');
                logsDiv.textContent = lines.slice(-25).join('\n');
                simpleLogCount = 25;
            }
        }
    };
    
    const getSimpleParams = () => {
        return {
            heroName: document.getElementById('debug-hero')?.value?.trim() || 'Test Hero',
            promptSetup: document.getElementById('debug-setup')?.value?.trim() || 'magical forest',
            promptRising: document.getElementById('debug-rising')?.value?.trim() || 'lost treasure',
            promptClimax: document.getElementById('debug-climax')?.value?.trim() || 'friendship saves day',
            age: '6',
            audioOnly: 'true'
        };
    };
    
    window.testStreamingGET = async () => {
        simpleLog('Testing GET streaming endpoint...');
        
        const params = getSimpleParams();
        const url = new URL(`${window.location.origin}/api/generate-story`);
        Object.entries(params).forEach(([key, value]) => {
            if (value) url.searchParams.set(key, value);
        });
        
        try {
            const startTime = Date.now();
            const response = await fetch(url.toString());
            const duration = Date.now() - startTime;
            
            simpleLog(`GET ${response.status} ${response.statusText} (${duration}ms)`);
            simpleLog(`Content-Type: ${response.headers.get('content-type')}`);
            simpleLog(`Content-Length: ${response.headers.get('content-length')}`);
            
            if (response.ok) {
                const blob = await response.blob();
                simpleLog(`Success: ${blob.size} bytes audio`, 'success');
                
                // Add audio player
                const playersDiv = document.getElementById('debug-players');
                if (playersDiv) {
                    const audioEl = document.createElement('audio');
                    audioEl.controls = true;
                    audioEl.src = URL.createObjectURL(blob);
                    
                    const label = document.createElement('div');
                    label.textContent = `GET Audio (${blob.size} bytes)`;
                    label.style.marginBottom = '5px';
                    label.style.fontWeight = 'bold';
                    
                    playersDiv.appendChild(label);
                    playersDiv.appendChild(audioEl);
                }
            } else {
                const errorText = await response.text();
                simpleLog(`GET failed: ${errorText}`, 'error');
            }
        } catch (error) {
            simpleLog(`GET error: ${error.message}`, 'error');
        }
    };
    
    window.testStreamingPOST = async () => {
        simpleLog('Testing POST endpoint...');
        
        const params = getSimpleParams();
        
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
            
            if (!response.ok) throw new Error(`POST ${response.status}`);
            
            const data = await response.json();
            simpleLog(`POST success: ${data.fileSize || 0} bytes`, 'success');
            
            // Add audio player from base64
            if (data.audio) {
                const playersDiv = document.getElementById('debug-players');
                if (playersDiv) {
                    const audioBlob = b64toBlob(data.audio, 'audio/mpeg');
                    const audioEl = document.createElement('audio');
                    audioEl.controls = true;
                    audioEl.src = URL.createObjectURL(audioBlob);
                    
                    const label = document.createElement('div');
                    label.textContent = `POST Audio (${audioBlob.size} bytes)`;
                    label.style.marginBottom = '5px';
                    label.style.fontWeight = 'bold';
                    
                    playersDiv.appendChild(label);
                    playersDiv.appendChild(audioEl);
                }
            }
        } catch (error) {
            simpleLog(`POST error: ${error.message}`, 'error');
        }
    };
    
    window.compareStreaming = async () => {
        simpleLog('=== COMPARING ENDPOINTS ===');
        await testStreamingPOST();
        await testStreamingGET();
        simpleLog('Comparison complete!', 'success');
    };
    
    window.testDummyAudio = async (format = '') => {
        const formatName = format || 'default';
        simpleLog(`Testing ${formatName} audio endpoint...`);
        
        try {
            const url = format ? `/api/test-audio?format=${format}` : '/api/test-audio';
            const startTime = Date.now();
            const response = await fetch(url);
            const duration = Date.now() - startTime;
            
            simpleLog(`${formatName.toUpperCase()} ${response.status} ${response.statusText} (${duration}ms)`);
            simpleLog(`Content-Type: ${response.headers.get('content-type')}`);
            simpleLog(`Content-Length: ${response.headers.get('content-length')}`);
            
            if (response.ok) {
                const blob = await response.blob();
                simpleLog(`${formatName} success: ${blob.size} bytes audio`, 'success');
                
                // Add audio player and direct link
                const playersDiv = document.getElementById('debug-players');
                if (playersDiv) {
                    const audioEl = document.createElement('audio');
                    audioEl.controls = true;
                    audioEl.src = URL.createObjectURL(blob);
                    
                    const label = document.createElement('div');
                    label.textContent = `${formatName} Audio (${blob.size} bytes) - 5sec 440Hz tone`;
                    label.style.marginBottom = '5px';
                    label.style.fontWeight = 'bold';
                    
                    // Add direct URL link for testing
                    const directUrl = format ? `/api/test-audio?format=${format}` : '/api/test-audio';
                    const linkEl = document.createElement('a');
                    linkEl.href = directUrl;
                    linkEl.textContent = 'Direct Link';
                    linkEl.target = '_blank';
                    linkEl.style.marginLeft = '10px';
                    linkEl.style.color = '#0066cc';
                    
                    const containerDiv = document.createElement('div');
                    containerDiv.appendChild(label);
                    label.appendChild(linkEl);
                    
                    playersDiv.appendChild(containerDiv);
                    playersDiv.appendChild(audioEl);
                }
            } else {
                const errorText = await response.text();
                simpleLog(`${formatName} failed: ${errorText}`, 'error');
            }
        } catch (error) {
            simpleLog(`${formatName} error: ${error.message}`, 'error');
        }
    };
    
    window.testYotoDummy = async (format = '') => {
        if (!accessToken) {
            simpleLog('Please log in to Yoto first!', 'error');
            return;
        }
        
        const formatName = format || 'default';
        simpleLog(`Creating Yoto playlist with ${formatName} audio...`);
        
        const audioUrl = format ? 
            `${window.location.origin}/api/test-audio?format=${format}` :
            `${window.location.origin}/api/test-audio`;
        
        try {
            const result = await createStreamingOnlyPlaylist({
                heroName: `Test ${formatName.toUpperCase()}`,
                audioStreamUrl: audioUrl
            }, accessToken);
            simpleLog(`Yoto ${formatName} test success!`, 'success');
            simpleLog(`Card ID: ${result.card?.cardId || 'unknown'}`);
        } catch (error) {
            simpleLog(`Yoto ${formatName} error: ${error.message}`, 'error');
        }
    };
    
    // Streaming-only playlist creation for testing (skips direct upload attempt)
    async function createStreamingOnlyPlaylist(testData, accessToken) {
        const PLAYLIST_TITLE = "StoryForge";
        
        try {
            console.log("🔍 Creating streaming-only test playlist...");
            
            // Step 1: Find existing StoryForge playlist
            const myoResponse = await fetch("https://api.yotoplay.com/content/mine", {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            
            if (!myoResponse.ok) {
                throw new Error(`Failed to fetch user content: ${myoResponse.status}`);
            }
            
            const myoData = await myoResponse.json();
            let contentArray = [];
            if (Array.isArray(myoData)) {
                contentArray = myoData;
            } else if (myoData.cards && Array.isArray(myoData.cards)) {
                contentArray = myoData.cards;
            } else if (myoData.content && Array.isArray(myoData.content)) {
                contentArray = myoData.content;
            }
            
            const existingStoryForge = contentArray.find(item => 
                item && item.title === PLAYLIST_TITLE
            );
            
            // Step 2: Create playlist using streaming URL (skip upload attempt)
            console.log('🔄 Using streaming URL (test mode):', testData.audioStreamUrl);
            
            const playlistPayload = {
                title: `${PLAYLIST_TITLE} - ${testData.heroName}`,
                content: {
                    chapters: [{
                        key: "01",
                        title: testData.heroName,
                        tracks: [{
                            key: "01",
                            title: "Test Audio",
                            trackUrl: testData.audioStreamUrl,
                            type: "stream",
                            format: "wav",
                            duration: 5,
                            fileSize: 100000
                        }],
                        display: {
                            icon16x16: "yoto:#ZuVmuvnoFiI4el6pBPvq0ofcgQ18HjrCmdPEE7GCnP8"
                        }
                    }]
                },
                metadata: {
                    description: "Audio format test from StoryForge",
                    media: {
                        duration: 5,
                        fileSize: 100000
                    }
                }
            };
            
            console.log('📝 Creating test playlist...');
            const createResponse = await fetch('https://api.yotoplay.com/content', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(playlistPayload)
            });
            
            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                throw new Error(`Playlist creation failed: ${createResponse.status} ${errorText}`);
            }
            
            const createResult = await createResponse.json();
            console.log('✅ Test playlist created:', {
                operation: 'CREATED',
                cardId: createResult.card?.cardId || 'unknown'
            });
            
            return { card: createResult.card };
            
        } catch (error) {
            console.error('❌ Streaming test error:', error);
            throw error;
        }
    };
    
    // Format-specific test functions
    window.testMinimal = () => testDummyAudio('minimal');
    window.testSimple = () => testDummyAudio('simple');
    window.testWAV22 = () => testDummyAudio('wav22');
    window.testWAV44 = () => testDummyAudio('wav44');
    window.testYotoMinimal = () => testYotoDummy('minimal');
    window.testYotoWAV22 = () => testYotoDummy('wav22');
    window.testYotoWAV44 = () => testYotoDummy('wav44');
    window.testYotoSimple = () => testYotoDummy('simple');
    
    window.clearDebugLogs = () => {
        const logsDiv = document.getElementById('debug-logs-simple');
        const playersDiv = document.getElementById('debug-players');
        if (logsDiv) logsDiv.textContent = '🧹 Logs cleared\n';
        if (playersDiv) playersDiv.innerHTML = '';
        simpleLogCount = 0;
    };
    
    // Show debug section if ?debug=true
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'true') {
        const debugSection = document.getElementById('debug-section');
        if (debugSection) {
            debugSection.classList.remove('hidden');
            simpleLog('Debug mode activated!', 'success');
        }
    }
    
    // Initialize mode selection after all functions are defined
    initializeModeSelection();
    
    // Initial check on page load
    checkAuthentication();
    
    // Add debug functionality directly in main script
    setupDebugSystem();
});

// Debug system setup
function setupDebugSystem() {
    console.log('🔧 Setting up debug system...');
    
    // Test Yoto upload workflow
    window.testYotoUploadWorkflow = async function() {
        try {
            console.log('🧪 Testing Yoto upload workflow manually...');
            
            // First run checkYotoAuth to discover and normalize the token
            const isAuthenticated = window.checkYotoAuth();
            if (!isAuthenticated) {
                console.error('❌ No access token found - please log in first');
                return null;
            }
            
            const accessToken = localStorage.getItem('yoto_access_token');
            if (!accessToken) {
                console.error('❌ Token normalization failed');
                return null;
            }
            
            // Test upload URL endpoint
            console.log('🔗 Testing upload URL endpoint...');
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
    
    // Check authentication status
    window.checkYotoAuth = function() {
        // Check multiple possible token storage locations
        const possibleKeys = [
            'yoto_access_token',
            'access_token', 
            'accessToken',
            'yoto_token',
            'auth_token'
        ];
        
        console.log('🔐 Checking localStorage for Yoto tokens...');
        
        // Log all localStorage keys for debugging
        const allKeys = Object.keys(localStorage);
        console.log('🗝 All localStorage keys:', allKeys);
        
        let foundToken = null;
        let foundKey = null;
        
        // Try each possible key
        for (const key of possibleKeys) {
            const token = localStorage.getItem(key);
            if (token) {
                foundToken = token;
                foundKey = key;
                console.log(`✅ Found token at key: ${key}`);
                break;
            }
        }
        
        // Also check for JSON-stored tokens like YOTO_STORYFORGE_TOKENS
        if (!foundToken) {
            const yotoTokensKey = 'YOTO_STORYFORGE_TOKENS';
            const yotoTokensStr = localStorage.getItem(yotoTokensKey);
            
            if (yotoTokensStr) {
                try {
                    const yotoTokens = JSON.parse(yotoTokensStr);
                    console.log('🔍 Parsed YOTO_STORYFORGE_TOKENS:', yotoTokens);
                    
                    if (yotoTokens.accessToken) {
                        foundToken = yotoTokens.accessToken;
                        foundKey = `${yotoTokensKey}.accessToken`;
                        console.log(`✅ Found token in JSON at: ${foundKey}`);
                    }
                } catch (e) {
                    console.warn('⚠️ Failed to parse YOTO_STORYFORGE_TOKENS:', e);
                }
            }
        }
        
        // Also check if there are any keys containing 'token' or 'yoto'
        const relevantKeys = allKeys.filter(key => 
            key.toLowerCase().includes('token') || 
            key.toLowerCase().includes('yoto') ||
            key.toLowerCase().includes('auth')
        );
        
        if (relevantKeys.length > 0) {
            console.log('🔍 Keys containing token/yoto/auth:', relevantKeys);
            relevantKeys.forEach(key => {
                const value = localStorage.getItem(key);
                console.log(`  ${key}: ${value ? value.substring(0, 20) + '...' : 'null'}`);
            });
        }
        
        if (foundToken) {
            // Store the found token in the expected location for other functions
            if (foundKey !== 'yoto_access_token') {
                localStorage.setItem('yoto_access_token', foundToken);
                console.log('🔄 Copied token to yoto_access_token for compatibility');
            }
        }
        
        console.log('🔐 Final authentication status:', {
            hasToken: !!foundToken,
            tokenLength: foundToken ? foundToken.length : 0,
            foundAt: foundKey || 'none'
        });
        
        return !!foundToken;
    };
    
    // Create visual debug panel
    window.showDebugPanel = function() {
        // Remove existing panel
        const existing = document.getElementById('debug-panel');
        if (existing) existing.remove();
        
        console.log('🔧 Creating debug panel...');
        
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
            <div id="debug-results">Ready to run diagnostics...</div>
            <button onclick="runDiagnostics()" style="margin-top: 10px; padding: 5px 10px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">Run Tests</button>
            <button onclick="document.getElementById('debug-panel').remove()" style="margin: 10px 0 0 5px; padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
        `;
        
        document.body.appendChild(debugPanel);
        console.log('✅ Debug panel created successfully');
    };
    
    // Run diagnostics function
    window.runDiagnostics = async function() {
        const resultsDiv = document.getElementById('debug-results');
        if (!resultsDiv) {
            console.error('❌ Debug results div not found');
            return;
        }
        
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
            
            // Test 3: Content API
            results.push(`🔄 Testing content API...`);
            resultsDiv.innerHTML = results.join('<br>');
            
            try {
                const accessToken = localStorage.getItem('yoto_access_token');
                const contentResponse = await fetch('https://api.yotoplay.com/content/mine', {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                
                if (contentResponse.ok) {
                    const contentData = await contentResponse.json();
                    results[results.length - 1] = `✅ Content API: SUCCESS`;
                    results.push(`📊 Total items: ${(contentData.cards || contentData || []).length}`);
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
    
    // Debug panel is now hidden by default
    // Use window.showDebugPanel() to show it when needed
    console.log('🔧 Debug system ready - call window.showDebugPanel() to show debug panel');
    
    console.log('✅ Debug system setup complete');
}
