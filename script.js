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
    const logoHome = document.getElementById("logo-home");
    const currentModeSpan = document.getElementById("current-mode");
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
    let monsterLocationImageBase64 = null;
    let accessToken = null;
    let refreshToken = null;
    
    // Audio player state management to prevent infinite loops
    let audioPlayerInitialized = false;

    const clientId = import.meta.env.VITE_CLIENT_ID;

    // --- Modal Functionality ---
    const showAlert = (message) => {
        if (alertMessage) alertMessage.textContent = message;
        if (alertModal) alertModal.classList.remove('hidden');
    };
    
    if (closeButton) {
        closeButton.onclick = () => {
            if (alertModal) alertModal.classList.add('hidden');
        };
    }
    
    window.onclick = (event) => {
        if (event.target === alertModal && alertModal) {
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
        if (themeToggle) {
            themeToggle.style.transform = 'scale(1.2) rotate(360deg)';
            setTimeout(() => {
                if (themeToggle) themeToggle.style.transform = '';
            }, 300);
        }
    };
    
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    initTheme();

    // --- Navigation Dropdown Functionality ---
    const initializeNavigation = () => {
        // Handle navigation dropdown clicks
        const navItems = document.querySelectorAll('.nav-item[data-mode]');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const mode = item.dataset.mode;
                showMode(mode);
                // Hide dropdown after selection (will auto-hide on next mouse move anyway)
            });
        });
        
        // Settings button (dummy for now)
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                showAlert('⚙️ Settings panel coming soon! \n\nPlanned features:\n• Voice selection\n• Story length preferences\n• Custom themes\n• Export options');
            });
        }
    };
    
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
        
        // Hide Yoto connection status
        const yotoStatus = document.getElementById('yoto-status');
        if (yotoStatus) {
            yotoStatus.classList.add('hidden');
        }
        
        // Clear current mode
        if (currentModeSpan) {
            currentModeSpan.textContent = '';
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
        appContent.classList.remove('hidden');
        
        // Show Yoto connection status
        const yotoStatus = document.getElementById('yoto-status');
        if (yotoStatus) {
            yotoStatus.classList.remove('hidden');
        }
    };

    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
    }
    
    // Make logo clickable to return to mode selection
    if (logoHome) {
        logoHome.addEventListener('click', () => {
            if (currentMode) {
                backToModeSelection();
            }
        });
        logoHome.style.cursor = 'pointer';
    }
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
        
        // Update current mode display in top bar
        const modeNames = {
            'classic': '📚 Classic Story',
            'adventure-me': '⚔️ Adventure Me',
            'homework-forge': '📝 Homework Forge',
            'sleep-forge': '🌙 Sleep Forge',
            'dream-job': '🔮 Dream Job Detective',
            'monster-maker': '👹 Monster Maker',
            'help': '💡 Help & Templates'
        };
        
        if (currentModeSpan) {
            currentModeSpan.textContent = ` → ${modeNames[mode] || mode}`;
        }
        
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
        
        // Clear current mode indicator
        if (currentModeSpan) {
            currentModeSpan.textContent = '';
        }
        
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
                                <button class="print-btn" onclick="printStoryWorksheet()" title="Download story arc worksheet">
                                    <span>🖨️</span>
                                    <span>Print worksheet</span>
                                </button>
                            </div>
                        </div>
                        
                        <!-- Instructions Section -->
                        <div class="instructions-section">
                            <div class="instructions-content">
                                <div class="instruction-point">
                                    <span class="instruction-icon">✨</span>
                                    <span><strong>Just one element needed!</strong> Fill in at least one story element below - hero name, beginning, challenge, or resolution.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">🌈</span>
                                    <span><strong>More details = more magic!</strong> The more you add, the more personalized and fun your story becomes.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">👨‍👩‍👧‍👦</span>
                                    <span><strong>Parents:</strong> Work with your children on their own story arc using our worksheet (🖨️ above) - it's a great way to plan together!</span>
                                </div>
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
                                
                                <!-- Character & Scene Images - Expanded Layout -->
                                <div class="images-section-expanded">
                                    <h4 class="images-title">
                                        <span class="section-icon">🎨</span>
                                        <span>Add Your Artwork (Optional)</span>
                                    </h4>
                                    
                                    <div class="image-uploads-expanded">
                                        <div class="image-upload-full">
                                            <label for="classic-heroImage" class="upload-label">
                                                <span class="label-text">Character Drawing</span>
                                                <span class="label-doodle">🎨</span>
                                            </label>
                                            <div id="classic-image-upload-area" class="paper-upload-full">
                                                <input type="file" id="classic-heroImage" accept="image/*" class="hidden-input">
                                                <div class="upload-content-full">
                                                    <button type="button" class="upload-btn-full" onclick="document.getElementById('classic-heroImage').click()">
                                                        <span>📎 Upload Character Drawing</span>
                                                    </button>
                                                    <p class="upload-hint">Draw or upload your hero character!</p>
                                                    <div id="classic-image-preview" class="preview-container hidden"></div>
                                                </div>
                                                <div class="upload-doodles">
                                                    <span class="doodle-arrow">→</span>
                                                    <span class="doodle-star">★</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="image-upload-full">
                                            <label for="classic-sceneImage" class="upload-label">
                                                <span class="label-text">Scene Drawing</span>
                                                <span class="label-doodle">🖼️</span>
                                            </label>
                                            <div id="classic-scene-upload-area" class="paper-upload-full">
                                                <input type="file" id="classic-sceneImage" accept="image/*" class="hidden-input">
                                                <div class="upload-content-full">
                                                    <button type="button" class="upload-btn-full" onclick="document.getElementById('classic-sceneImage').click()">
                                                        <span>🏖️ Upload Scene Drawing</span>
                                                    </button>
                                                    <p class="upload-hint">Draw or upload a magical place!</p>
                                                    <div id="classic-scene-preview" class="preview-container hidden"></div>
                                                </div>
                                                <div class="upload-doodles">
                                                    <span class="doodle-tree">🌳</span>
                                                    <span class="doodle-castle">🏰</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Centered Forge Button -->
                            <div class="forge-section">
                                <button type="submit" class="forge-btn-centered">
                                    <span class="btn-text">✨ Forge My Story! ✨</span>
                                    <div class="btn-sparkles">
                                        <span>✨</span>
                                        <span>★</span>
                                        <span>✨</span>
                                    </div>
                                </button>
                                
                                <div class="or-divider">
                                    <span>or</span>
                                </div>
                                
                                <button type="button" id="classic-surprise-me-btn" class="surprise-btn-compact">
                                    <span>🎲 Surprise Me! 🎲</span>
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
            
            case 'wanted-poster':
                return `
                    <div class="mode-header-compact">
                        <button class="back-to-modes-btn" onclick="backToModeSelection()">
                            ← Back to Modes
                        </button>
                        <div class="mode-info">
                            <h2 class="mode-title-compact">
                                <span class="mode-icon">🤠</span>
                                <span>Wanted Poster</span>
                            </h2>
                        </div>
                        
                        <div class="instructions-section">
                            <div class="instructions-content">
                                <div class="instruction-point">
                                    <span class="instruction-icon">📋</span>
                                    <span><strong>Fill in the details!</strong> Enter your character's name, what they're wanted for, their special skills, and the reward.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">🎨</span>
                                    <span><strong>Add artwork or generate!</strong> Draw your outlaw or let our AI create one for you.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">⭐</span>
                                    <span><strong>Download your poster!</strong> Get a printable wanted poster plus an exciting story.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="story-form-container">
                        <form id="wanted-poster-form" class="story-form">
                            <div class="unified-story-group paper-scrap">
                                <h3 class="section-title">
                                    <span class="section-icon">🤠</span>
                                    <span>Create Your Wanted Poster</span>
                                </h3>
                                
                                <div class="story-elements">
                                    <div class="input-grid">
                                        <div class="input-group">
                                            <label for="wanted-name" class="compact-label">
                                                <span>🤠 Outlaw's Name *</span>
                                            </label>
                                            <input type="text" id="wanted-name" class="paper-input" placeholder="e.g., Black Bart, Calamity Jane..." required>
                                        </div>
                                        <div class="input-group">
                                            <label for="wanted-for" class="compact-label">
                                                <span>⚖️ Wanted For *</span>
                                            </label>
                                            <input type="text" id="wanted-for" class="paper-input" placeholder="e.g., stealing all the town's cookies..." required>
                                        </div>
                                        <div class="input-group">
                                            <label for="wanted-skills" class="compact-label">
                                                <span>⚡ Special Skills</span>
                                            </label>
                                            <input type="text" id="wanted-skills" class="paper-input" placeholder="e.g., lightning-fast draw, expert horseback rider...">
                                        </div>
                                        <div class="input-group">
                                            <label for="wanted-reward" class="compact-label">
                                                <span>💰 Reward</span>
                                            </label>
                                            <input type="text" id="wanted-reward" class="paper-input" placeholder="e.g., $1000, A lifetime supply of beans...">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="images-section-expanded">
                                    <h4 class="images-title">
                                        <span class="section-icon">🎨</span>
                                        <span>Outlaw Portrait</span>
                                    </h4>
                                    
                                    <div class="image-choice-section">
                                        <div class="choice-toggles">
                                            <label class="choice-option">
                                                <input type="radio" name="image-choice" value="upload" id="upload-choice" checked>
                                                <span class="choice-label">
                                                    <span class="choice-icon">📎</span>
                                                    <span>Upload Drawing</span>
                                                </span>
                                            </label>
                                            <label class="choice-option">
                                                <input type="radio" name="image-choice" value="generate" id="generate-choice">
                                                <span class="choice-label">
                                                    <span class="choice-icon">🎭</span>
                                                    <span>AI Generate</span>
                                                </span>
                                            </label>
                                        </div>
                                        
                                        <div id="upload-section" class="image-upload-full">
                                            <div id="wanted-image-upload-area" class="paper-upload-full">
                                                <input type="file" id="wanted-image" accept="image/*" class="hidden-input">
                                                <div class="upload-content-full">
                                                    <button type="button" class="upload-btn-full" onclick="document.getElementById('wanted-image').click()">
                                                        <span>📎 Upload Outlaw Drawing</span>
                                                    </button>
                                                    <p class="upload-hint">Draw your wanted character!</p>
                                                    <div id="wanted-image-preview" class="preview-container hidden"></div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div id="generate-section" class="generate-options hidden">
                                            <p class="generate-hint">Our AI will create your outlaw based on the details above!</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="forge-section">
                                <button type="submit" class="forge-btn-centered">
                                    <span class="btn-text">🤠 Create Wanted Poster! 🤠</span>
                                    <div class="btn-sparkles">
                                        <span>⭐</span>
                                        <span>🌟</span>
                                        <span>⭐</span>
                                    </div>
                                </button>
                            </div>
                        </form>
                    </div>
                `;

            case 'homework-forge':
                return `
                    <div class="mode-header-compact">
                        <button class="back-to-modes-btn" onclick="backToModeSelection()">
                            ← Back to Modes
                        </button>
                        <div class="mode-info">
                            <h2 class="mode-title-compact">
                                <span class="mode-icon">📝</span>
                                <span>Homework Forge</span>
                            </h2>
                        </div>
                        
                        <div class="instructions-section">
                            <div class="instructions-content">
                                <div class="instruction-point">
                                    <span class="instruction-icon">📸</span>
                                    <span><strong>Upload your notes!</strong> Take photos of homework, worksheets, or textbook pages.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">🎭</span>
                                    <span><strong>Or choose a topic!</strong> Tell us what you want to learn about and we'll create a summary.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">🎧</span>
                                    <span><strong>Learn while listening!</strong> Get a fun, age-appropriate audio summary.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="story-form-container">
                        <form id="homework-forge-form" class="story-form">
                            <div class="unified-story-group paper-scrap">
                                <h3 class="section-title">
                                    <span class="section-icon">📚</span>
                                    <span>Create Your Learning Summary</span>
                                </h3>
                                
                                <div class="homework-choice-section">
                                    <div class="choice-toggles">
                                        <label class="choice-option">
                                            <input type="radio" name="homework-choice" value="upload" id="homework-upload-choice" checked>
                                            <span class="choice-label">
                                                <span class="choice-icon">📸</span>
                                                <span>Upload Notes/Work</span>
                                            </span>
                                        </label>
                                        <label class="choice-option">
                                            <input type="radio" name="homework-choice" value="topic" id="homework-topic-choice">
                                            <span class="choice-label">
                                                <span class="choice-icon">💡</span>
                                                <span>Choose Topic</span>
                                            </span>
                                        </label>
                                    </div>
                                    
                                    <div id="homework-upload-section" class="homework-upload-area">
                                        <div class="multiple-uploads">
                                            <div class="upload-instruction">
                                                <span class="instruction-icon">📝</span>
                                                <span>Upload multiple pages or documents (up to 5 files)</span>
                                            </div>
                                            <input type="file" id="homework-files" accept="image/*,application/pdf" multiple class="hidden-input">
                                            <button type="button" class="upload-btn-full" onclick="document.getElementById('homework-files').click()">
                                                <span>📎 Upload Notes & Documents</span>
                                            </button>
                                            <div id="homework-files-preview" class="files-preview-container"></div>
                                        </div>
                                    </div>
                                    
                                    <div id="homework-topic-section" class="topic-selection-area hidden">
                                        <div class="input-group">
                                            <label for="homework-subject" class="compact-label">
                                                <span>📖 Subject</span>
                                            </label>
                                            <select id="homework-subject" class="paper-select">
                                                <option value="">Choose a subject...</option>
                                                <option value="math">🧮 Mathematics</option>
                                                <option value="science">🔬 Science</option>
                                                <option value="history">🏛️ History</option>
                                                <option value="english">📝 English/Language Arts</option>
                                                <option value="geography">🌍 Geography</option>
                                                <option value="art">🎨 Art</option>
                                                <option value="music">🎵 Music</option>
                                                <option value="other">🌟 Other</option>
                                            </select>
                                        </div>
                                        <div class="input-group">
                                            <label for="homework-topic" class="compact-label">
                                                <span>💡 What to Learn About</span>
                                            </label>
                                            <input type="text" id="homework-topic" class="paper-input" placeholder="e.g., How volcanoes work, The water cycle, Ancient Egypt...">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="age-selection-compact">
                                    <label for="homework-age" class="compact-label">
                                        <span>Learning Level:</span>
                                    </label>
                                    <select id="homework-age" class="paper-select">
                                        <option value="6" selected>🧒 Elementary (6-8 years)</option>
                                        <option value="9">🧒 Middle School (9-12 years)</option>
                                        <option value="12">🧑 High School (13+ years)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="forge-section">
                                <button type="submit" class="forge-btn-centered">
                                    <span class="btn-text">📚 Create Learning Summary! 📚</span>
                                    <div class="btn-sparkles">
                                        <span>💡</span>
                                        <span>⚡</span>
                                        <span>💡</span>
                                    </div>
                                </button>
                            </div>
                        </form>
                    </div>
                `;

            case 'sleep-forge':
                return `
                    <div class="mode-header-compact">
                        <button class="back-to-modes-btn" onclick="backToModeSelection()">
                            ← Back to Modes
                        </button>
                        <div class="mode-info">
                            <h2 class="mode-title-compact">
                                <span class="mode-icon">🌙</span>
                                <span>Sleep Forge</span>
                            </h2>
                        </div>
                        
                        <div class="instructions-section">
                            <div class="instructions-content">
                                <div class="instruction-point">
                                    <span class="instruction-icon">🌙</span>
                                    <span><strong>Gentle bedtime stories!</strong> Like classic stories but with soothing, calm narration.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">💤</span>
                                    <span><strong>Sleep meditation style!</strong> Longer pauses and peaceful pacing to help you drift off.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">⭐</span>
                                    <span><strong>Sweet dreams guaranteed!</strong> Perfect for winding down at bedtime.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="story-form-container">
                        <form id="sleep-forge-form" class="story-form">
                            <div class="unified-story-group paper-scrap">
                                <h3 class="section-title">
                                    <span class="section-icon">🌙</span>
                                    <span>Create Your Bedtime Story</span>
                                </h3>
                                
                                <div class="story-elements">
                                    <div class="input-grid">
                                        <div class="input-group">
                                            <label for="sleep-heroName" class="compact-label">
                                                <span>✨ Hero's Name</span>
                                            </label>
                                            <input type="text" id="sleep-heroName" class="paper-input" placeholder="e.g., Sleepy Sam, Luna the Dreamer...">
                                        </div>
                                        <div class="input-group">
                                            <label for="sleep-promptSetup" class="compact-label">
                                                <span>🌅 The Peaceful Beginning</span>
                                            </label>
                                            <input type="text" id="sleep-promptSetup" class="paper-input" placeholder="e.g., a cozy cloud kingdom, a gentle meadow...">
                                        </div>
                                        <div class="input-group">
                                            <label for="sleep-promptRising" class="compact-label">
                                                <span>🌸 The Gentle Adventure</span>
                                            </label>
                                            <input type="text" id="sleep-promptRising" class="paper-input" placeholder="e.g., helping sleepy animals find their beds...">
                                        </div>
                                        <div class="input-group">
                                            <label for="sleep-promptClimax" class="compact-label">
                                                <span>😴 The Peaceful Ending</span>
                                            </label>
                                            <input type="text" id="sleep-promptClimax" class="paper-input" placeholder="e.g., everyone falls asleep under the stars...">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="images-section-expanded">
                                    <h4 class="images-title">
                                        <span class="section-icon">🎨</span>
                                        <span>Add Your Dreamy Artwork (Optional)</span>
                                    </h4>
                                    
                                    <div class="image-uploads-expanded">
                                        <div class="image-upload-full">
                                            <div id="sleep-image-upload-area" class="paper-upload-full">
                                                <input type="file" id="sleep-heroImage" accept="image/*" class="hidden-input">
                                                <div class="upload-content-full">
                                                    <button type="button" class="upload-btn-full" onclick="document.getElementById('sleep-heroImage').click()">
                                                        <span>🌙 Upload Dreamy Character</span>
                                                    </button>
                                                    <p class="upload-hint">Draw your sleepy hero!</p>
                                                    <div id="sleep-image-preview" class="preview-container hidden"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="age-selection-compact">
                                    <label for="sleep-story-age" class="compact-label">
                                        <span>Story Length:</span>
                                    </label>
                                    <select id="sleep-story-age" class="paper-select">
                                        <option value="3" selected>🧒 Little Dreamers (3-6 years, ~150 words)</option>
                                        <option value="6">🧒 Young Sleepyheads (6-8 years, ~300 words)</option>
                                        <option value="9">🧒 Peaceful Explorers (8-12 years, ~500 words)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="forge-section">
                                <button type="submit" class="forge-btn-centered">
                                    <span class="btn-text">🌙 Create Bedtime Story! 🌙</span>
                                    <div class="btn-sparkles">
                                        <span>⭐</span>
                                        <span>💤</span>
                                        <span>⭐</span>
                                    </div>
                                </button>
                                
                                <div class="or-divider">
                                    <span>or</span>
                                </div>
                                
                                <button type="button" id="sleep-surprise-me-btn" class="surprise-btn-compact">
                                    <span>🌙 Surprise Bedtime Story! 🌙</span>
                                </button>
                            </div>
                        </form>
                    </div>
                `;

            case 'monster-maker':
                return `
                    <div class="mode-header-compact">
                        <button class="back-to-modes-btn" onclick="backToModeSelection()">
                            ← Back to Modes
                        </button>
                        <div class="mode-info">
                            <h2 class="mode-title-compact">
                                <span class="mode-icon">👹</span>
                                <span>Monster Maker</span>
                            </h2>
                        </div>
                        
                        <div class="instructions-section">
                            <div class="instructions-content">
                                <div class="instruction-point">
                                    <span class="instruction-icon">👹</span>
                                    <span><strong>Describe your monster!</strong> Tell us about your creature's appearance, personality, and powers.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">📸</span>
                                    <span><strong>Where does it live?</strong> Upload a photo of where you want to see your monster (bedroom, garden, etc.).</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">🎨</span>
                                    <span><strong>AI brings it to life!</strong> We'll create an image and an exciting story about your monster.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="story-form-container">
                        <form id="monster-maker-form" class="story-form">
                            <div class="unified-story-group paper-scrap">
                                <h3 class="section-title">
                                    <span class="section-icon">👹</span>
                                    <span>Design Your Monster</span>
                                </h3>
                                
                                <div class="story-elements">
                                    <div class="input-grid">
                                        <div class="input-group">
                                            <label for="monster-description1" class="compact-label">
                                                <span>👹 Describe Your Monster *</span>
                                            </label>
                                            <input type="text" id="monster-description1" class="paper-input" placeholder="e.g., A fluffy purple monster with three eyes..." required>
                                        </div>
                                        <div class="input-group">
                                            <label for="monster-description2" class="compact-label">
                                                <span>⚡ Special Powers or Traits</span>
                                            </label>
                                            <input type="text" id="monster-description2" class="paper-input" placeholder="e.g., Can turn invisible when scared, loves to dance...">
                                        </div>
                                        <div class="input-group">
                                            <label for="monster-description3" class="compact-label">
                                                <span>💫 Personality</span>
                                            </label>
                                            <input type="text" id="monster-description3" class="paper-input" placeholder="e.g., Friendly but shy, mischievous but kind...">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="images-section-expanded">
                                    <h4 class="images-title">
                                        <span class="section-icon">🏡</span>
                                        <span>Where Does Your Monster Live?</span>
                                    </h4>
                                    
                                    <div class="image-uploads-expanded">
                                        <div class="image-upload-full">
                                            <div id="monster-location-upload-area" class="paper-upload-full">
                                                <input type="file" id="monster-location" accept="image/*" class="hidden-input">
                                                <div class="upload-content-full">
                                                    <button type="button" class="upload-btn-full" onclick="document.getElementById('monster-location').click()">
                                                        <span>📸 Upload Location Photo</span>
                                                    </button>
                                                    <p class="upload-hint">Take a photo of your bedroom, garden, or anywhere you want to see your monster!</p>
                                                    <div id="monster-location-preview" class="preview-container hidden"></div>
                                                </div>
                                                <div class="upload-doodles">
                                                    <span class="doodle-house">🏠</span>
                                                    <span class="doodle-tree">🌳</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="age-selection-compact">
                                    <label for="monster-story-age" class="compact-label">
                                        <span>Story Length:</span>
                                    </label>
                                    <select id="monster-story-age" class="paper-select">
                                        <option value="3">🧒 Little Monster Fans (3-6 years, ~150 words)</option>
                                        <option value="6" selected>🧒 Young Adventurers (6-8 years, ~500 words)</option>
                                        <option value="9">🧒 Monster Experts (8-12 years, ~1000 words)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="forge-section">
                                <button type="submit" class="forge-btn-centered">
                                    <span class="btn-text">👹 Create My Monster! 👹</span>
                                    <div class="btn-sparkles">
                                        <span>🎨</span>
                                        <span>⚡</span>
                                        <span>🎨</span>
                                    </div>
                                </button>
                            </div>
                        </form>
                    </div>
                `;

            case 'adventure-me':
                return `
                    <div class="mode-header-compact">
                        <button class="back-to-modes-btn" onclick="backToModeSelection()">
                            ← Back to Modes
                        </button>
                        <div class="mode-info">
                            <h2 class="mode-title-compact">
                                <span class="mode-icon">⚔️</span>
                                <span>Adventure Me</span>
                            </h2>
                        </div>
                        
                        <div class="instructions-section">
                            <div class="instructions-content">
                                <div class="instruction-point">
                                    <span class="instruction-icon">🌟</span>
                                    <span><strong>You're the hero!</strong> Put yourself in the center of an epic adventure story.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">🗺️</span>
                                    <span><strong>Choose your adventure:</strong> Wild West, underwater kingdom, sky cities, or jungle exploration.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">⚡</span>
                                    <span><strong>Add your skills:</strong> Tell us your special abilities to make the story uniquely yours!</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="story-form-container">
                        <form id="adventure-me-form" class="story-form">
                            <div class="unified-story-group paper-scrap">
                                <h3 class="section-title">
                                    <span class="section-icon">⚔️</span>
                                    <span>Design Your Adventure</span>
                                </h3>
                                
                                <div class="story-elements">
                                    <div class="input-grid">
                                        <div class="input-group">
                                            <label for="adventure-child-name" class="compact-label">
                                                <span>🌟 Your Name *</span>
                                            </label>
                                            <input type="text" id="adventure-child-name" class="paper-input" placeholder="Enter your name..." required>
                                        </div>
                                        <div class="input-group">
                                            <label for="adventure-theme" class="compact-label">
                                                <span>🗺️ Adventure Theme *</span>
                                            </label>
                                            <select id="adventure-theme" class="paper-select" required>
                                                <option value="">Choose your adventure...</option>
                                                <option value="wild-west">🤠 Wild West Frontier</option>
                                                <option value="underwater">🌊 Underwater Kingdom</option>
                                                <option value="sky">☁️ Sky Cities</option>
                                                <option value="jungle">🌴 Jungle Exploration</option>
                                            </select>
                                        </div>
                                        <div class="input-group">
                                            <label for="adventure-special-skill" class="compact-label">
                                                <span>⚡ Your Special Skill</span>
                                            </label>
                                            <input type="text" id="adventure-special-skill" class="paper-input" placeholder="e.g., super speed, talking to animals, magic spells...">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="age-selection-compact">
                                    <label for="adventure-story-age" class="compact-label">
                                        <span>Story Length:</span>
                                    </label>
                                    <select id="adventure-story-age" class="paper-select">
                                        <option value="6" selected>🧒 Young Adventurers (6-8 years, ~500 words)</option>
                                        <option value="9">🧒 Brave Explorers (8-12 years, ~1000 words)</option>
                                        <option value="12">🧑 Epic Heroes (12+ years, ~2000 words)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="forge-section">
                                <button type="submit" class="forge-btn-centered">
                                    <span class="btn-text">⚔️ Start My Adventure! ⚔️</span>
                                    <div class="btn-sparkles">
                                        <span>🌟</span>
                                        <span>⚡</span>
                                        <span>🌟</span>
                                    </div>
                                </button>
                            </div>
                        </form>
                    </div>
                `;

            case 'dream-job':
                return `
                    <div class="mode-header-compact">
                        <button class="back-to-modes-btn" onclick="backToModeSelection()">
                            ← Back to Modes
                        </button>
                        <div class="mode-info">
                            <h2 class="mode-title-compact">
                                <span class="mode-icon">🔮</span>
                                <span>Dream Job Detective</span>
                            </h2>
                        </div>
                        
                        <div class="instructions-section">
                            <div class="instructions-content">
                                <div class="instruction-point">
                                    <span class="instruction-icon">🔮</span>
                                    <span><strong>Interactive Quiz!</strong> Answer fun questions to discover your perfect future career.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">✨</span>
                                    <span><strong>Quick & Fun:</strong> Just click through our personality questions - no typing required!</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">📖</span>
                                    <span><strong>Get Your Story:</strong> Hear an inspiring story about your future career adventure!</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Quiz Start Screen -->
                    <div id="quiz-start-screen" class="quiz-screen active">
                        <div class="quiz-container paper-scrap">
                            <div class="quiz-intro">
                                <div class="quiz-icon-large">🔮</div>
                                <h3 class="quiz-title">Ready to Discover Your Dream Job?</h3>
                                <p class="quiz-description">
                                    We'll ask you some fun questions about what you like and don't like. 
                                    Then our AI will match you with exciting careers and create a personalized story about your future!
                                </p>
                                <div class="quiz-stats">
                                    <div class="stat-item">
                                        <span class="stat-number">8</span>
                                        <span class="stat-label">Quick Questions</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-number">2</span>
                                        <span class="stat-label">Minutes</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-number">1</span>
                                        <span class="stat-label">Dream Job</span>
                                    </div>
                                </div>
                            </div>
                            <button id="start-quiz-btn" class="start-quiz-btn">
                                <span class="btn-text">🚀 Find My Future Job!</span>
                                <div class="btn-sparkles">
                                    <span>✨</span>
                                    <span>🎯</span>
                                    <span>✨</span>
                                </div>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Quiz Questions Screen -->
                    <div id="quiz-questions-screen" class="quiz-screen hidden">
                        <div class="quiz-container paper-scrap">
                            <div class="quiz-progress">
                                <div class="progress-bar">
                                    <div id="quiz-progress-fill" class="progress-fill"></div>
                                </div>
                                <span id="quiz-progress-text" class="progress-text">Question 1 of 8</span>
                            </div>
                            
                            <div id="quiz-question-content" class="question-content">
                                <!-- Questions will be dynamically loaded here -->
                            </div>
                        </div>
                    </div>
                    
                    <!-- Quiz Results Screen -->
                    <div id="quiz-results-screen" class="quiz-screen hidden">
                        <div class="quiz-container paper-scrap">
                            <div class="results-header">
                                <div class="results-icon">🎆</div>
                                <h3 class="results-title">Your Perfect Career Match!</h3>
                            </div>
                            
                            <div id="quiz-results-content" class="results-content">
                                <!-- Results will be dynamically loaded here -->
                            </div>
                            
                            <div class="results-actions">
                                <button id="generate-career-story-btn" class="career-story-btn">
                                    <span class="btn-text">📚 Create My Career Story!</span>
                                    <div class="btn-sparkles">
                                        <span>✨</span>
                                        <span>🌟</span>
                                        <span>✨</span>
                                    </div>
                                </button>
                                <button id="retake-quiz-btn" class="retake-btn">
                                    <span>🔄 Take Quiz Again</span>
                                </button>
                            </div>
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
            case 'wanted-poster':
                setupWantedPosterModeListeners();
                break;
            case 'homework-forge':
                setupHomeworkForgeModeListeners();
                break;
            case 'sleep-forge':
                setupSleepForgeModeListeners();
                break;
            case 'monster-maker':
                setupMonsterMakerModeListeners();
                break;
            case 'adventure-me':
                setupAdventureMeModeListeners();
                break;
            case 'dream-job':
                setupDreamJobModeListeners();
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
    
    // Setup functions for new modes
    const setupWantedPosterModeListeners = () => {
        const wantedForm = document.getElementById('wanted-poster-form');
        const wantedImageInput = document.getElementById('wanted-image');
        const wantedImagePreview = document.getElementById('wanted-image-preview');
        const uploadChoice = document.getElementById('upload-choice');
        const generateChoice = document.getElementById('generate-choice');
        const uploadSection = document.getElementById('upload-section');
        const generateSection = document.getElementById('generate-section');
        
        // Form submission
        if (wantedForm) {
            wantedForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await generateWantedPoster();
            });
        }
        
        // Image choice toggle
        if (uploadChoice && generateChoice) {
            uploadChoice.addEventListener('change', () => {
                if (uploadChoice.checked) {
                    uploadSection?.classList.remove('hidden');
                    generateSection?.classList.add('hidden');
                }
            });
            
            generateChoice.addEventListener('change', () => {
                if (generateChoice.checked) {
                    uploadSection?.classList.add('hidden');
                    generateSection?.classList.remove('hidden');
                }
            });
        }
        
        // Image upload handling
        if (wantedImageInput && wantedImagePreview) {
            wantedImageInput.addEventListener('change', (e) => {
                handleImageUpload(e, wantedImagePreview, 'wanted');
            });
        }
    };
    
    const setupHomeworkForgeModeListeners = () => {
        const homeworkForm = document.getElementById('homework-forge-form');
        const homeworkFilesInput = document.getElementById('homework-files');
        const homeworkFilesPreview = document.getElementById('homework-files-preview');
        const uploadChoice = document.getElementById('homework-upload-choice');
        const topicChoice = document.getElementById('homework-topic-choice');
        const uploadSection = document.getElementById('homework-upload-section');
        const topicSection = document.getElementById('homework-topic-section');
        
        // Form submission
        if (homeworkForm) {
            homeworkForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await generateHomeworkForge();
            });
        }
        
        // Choice toggle
        if (uploadChoice && topicChoice) {
            uploadChoice.addEventListener('change', () => {
                if (uploadChoice.checked) {
                    uploadSection?.classList.remove('hidden');
                    topicSection?.classList.add('hidden');
                }
            });
            
            topicChoice.addEventListener('change', () => {
                if (topicChoice.checked) {
                    uploadSection?.classList.add('hidden');
                    topicSection?.classList.remove('hidden');
                }
            });
        }
        
        // File upload handling (multiple files)
        if (homeworkFilesInput && homeworkFilesPreview) {
            homeworkFilesInput.addEventListener('change', (e) => {
                handleMultipleFileUpload(e, homeworkFilesPreview);
            });
        }
    };
    
    const setupSleepForgeModeListeners = () => {
        const sleepForm = document.getElementById('sleep-forge-form');
        const sleepSurpriseBtn = document.getElementById('sleep-surprise-me-btn');
        const sleepImageInput = document.getElementById('sleep-heroImage');
        const sleepImagePreview = document.getElementById('sleep-image-preview');
        
        // Form submission
        if (sleepForm) {
            sleepForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await generateSleepForge(false);
            });
        }
        
        // Surprise Me button
        if (sleepSurpriseBtn) {
            sleepSurpriseBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await generateSleepForge(true);
            });
        }
        
        // Image upload handling
        if (sleepImageInput && sleepImagePreview) {
            sleepImageInput.addEventListener('change', (e) => {
                handleImageUpload(e, sleepImagePreview, 'sleep');
            });
        }
    };
    
    const setupMonsterMakerModeListeners = () => {
        const monsterForm = document.getElementById('monster-maker-form');
        const monsterLocationInput = document.getElementById('monster-location');
        const monsterLocationPreview = document.getElementById('monster-location-preview');
        
        // Form submission
        if (monsterForm) {
            monsterForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await generateMonsterMaker();
            });
        }
        
        // Location image upload handling
        if (monsterLocationInput && monsterLocationPreview) {
            monsterLocationInput.addEventListener('change', (e) => {
                handleImageUpload(e, monsterLocationPreview, 'location');
            });
        }
    };
    
    const setupAdventureMeModeListeners = () => {
        const adventureForm = document.getElementById('adventure-me-form');
        
        console.log('⚔️ Setting up Adventure Me mode listeners...');
        
        // Form submission
        if (adventureForm) {
            adventureForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await generateAdventureMe();
            });
        }
    };
    
    const setupDreamJobModeListeners = () => {
        console.log('🔮 Setting up Dream Job Detective quiz...');
        initializeDreamJobQuiz();
    };
    
    // Dream Job Quiz Data and Logic
    const dreamJobQuizQuestions = [
        {
            id: 1,
            type: 'binary',
            question: 'Do you prefer working indoors or outdoors?',
            icon: '🌲',
            options: [
                { value: 'indoors', text: 'Indoors & Cozy', emoji: '🏢' },
                { value: 'outdoors', text: 'Outdoors & Nature', emoji: '🌲' }
            ]
        },
        {
            id: 2,
            type: 'binary',
            question: 'Would you rather solve puzzles or create art?',
            icon: '🧩',
            options: [
                { value: 'puzzles', text: 'Solve Puzzles', emoji: '🧩' },
                { value: 'create', text: 'Create Art', emoji: '🎨' }
            ]
        },
        {
            id: 3,
            type: 'binary',
            question: 'Do you like working with your hands or your brain more?',
            icon: '🧠',
            options: [
                { value: 'hands', text: 'My Hands', emoji: '🔨' },
                { value: 'brain', text: 'My Brain', emoji: '🧠' }
            ]
        },
        {
            id: 4,
            type: 'multiple',
            question: 'Which of these sounds most exciting to you?',
            icon: '✨',
            options: [
                { value: 'explore', text: 'Explore New Places', emoji: '🗺️' },
                { value: 'perform', text: 'Perform on Stage', emoji: '🎭' },
                { value: 'help', text: 'Help People', emoji: '👩‍⚕️' },
                { value: 'build', text: 'Build Cool Things', emoji: '🔧' }
            ]
        },
        {
            id: 5,
            type: 'binary',
            question: 'Do you prefer working alone or with a team?',
            icon: '👥',
            options: [
                { value: 'alone', text: 'Work Alone', emoji: '🥱' },
                { value: 'team', text: 'Work with Teams', emoji: '👥' }
            ]
        },
        {
            id: 6,
            type: 'text',
            question: 'What\'s your name?',
            icon: '🌟',
            placeholder: 'Enter your first name...'
        },
        {
            id: 7,
            type: 'select',
            question: 'What\'s your favorite school subject?',
            icon: '📚',
            options: [
                { value: 'science', text: 'Science 🔬' },
                { value: 'art', text: 'Art 🎨' },
                { value: 'technology', text: 'Technology 💻' },
                { value: 'nature', text: 'Nature 🌿' },
                { value: 'music', text: 'Music 🎵' },
                { value: 'storytelling', text: 'Reading & Writing 📖' },
                { value: 'math', text: 'Math 🧮' },
                { value: 'cooking', text: 'Cooking 👨‍🍳' },
                { value: 'geography', text: 'Geography 🗺️' }
            ]
        },
        {
            id: 8,
            type: 'select',
            question: 'How do you like to help others?',
            icon: '💝',
            options: [
                { value: 'inspiring', text: 'Inspiring & Motivating ✨' },
                { value: 'protecting', text: 'Protecting & Saving 🛡️' },
                { value: 'teaching', text: 'Teaching & Educating 📖' },
                { value: 'creating', text: 'Creating Beautiful Things 🎨' },
                { value: 'solving', text: 'Solving Problems 🔧' },
                { value: 'entertaining', text: 'Entertaining & Fun 🎪' }
            ]
        }
    ];
    
    let currentQuestionIndex = 0;
    let quizAnswers = {};
    
    const initializeDreamJobQuiz = () => {
        const startBtn = document.getElementById('start-quiz-btn');
        const retakeBtn = document.getElementById('retake-quiz-btn');
        const generateStoryBtn = document.getElementById('generate-career-story-btn');
        
        if (startBtn) {
            startBtn.addEventListener('click', startQuiz);
        }
        
        if (retakeBtn) {
            retakeBtn.addEventListener('click', resetQuiz);
        }
        
        if (generateStoryBtn) {
            generateStoryBtn.addEventListener('click', generateCareerStory);
        }
    };
    
    const startQuiz = () => {
        currentQuestionIndex = 0;
        quizAnswers = {};
        
        // Hide start screen, show questions screen
        document.getElementById('quiz-start-screen').classList.remove('active');
        document.getElementById('quiz-start-screen').classList.add('hidden');
        document.getElementById('quiz-questions-screen').classList.remove('hidden');
        
        displayQuestion(0);
    };
    
    const displayQuestion = (index) => {
        const question = dreamJobQuizQuestions[index];
        const questionContent = document.getElementById('quiz-question-content');
        const progressFill = document.getElementById('quiz-progress-fill');
        const progressText = document.getElementById('quiz-progress-text');
        
        // Update progress
        const progress = ((index + 1) / dreamJobQuizQuestions.length) * 100;
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `Question ${index + 1} of ${dreamJobQuizQuestions.length}`;
        
        // Generate question HTML based on type
        let questionHTML = `
            <div class="question-header">
                <div class="question-icon">${question.icon}</div>
                <h3 class="question-title">${question.question}</h3>
            </div>
            <div class="question-options">
        `;
        
        if (question.type === 'binary') {
            question.options.forEach(option => {
                questionHTML += `
                    <button class="quiz-option" data-value="${option.value}">
                        <span class="option-emoji">${option.emoji}</span>
                        <span class="option-text">${option.text}</span>
                    </button>
                `;
            });
        } else if (question.type === 'multiple') {
            question.options.forEach(option => {
                questionHTML += `
                    <button class="quiz-option" data-value="${option.value}">
                        <span class="option-emoji">${option.emoji}</span>
                        <span class="option-text">${option.text}</span>
                    </button>
                `;
            });
        } else if (question.type === 'text') {
            questionHTML += `
                <div class="text-input-container">
                    <input type="text" id="quiz-text-input" class="quiz-text-input" placeholder="${question.placeholder}" required>
                    <button id="quiz-text-submit" class="quiz-text-submit">Continue →</button>
                </div>
            `;
        } else if (question.type === 'select') {
            question.options.forEach(option => {
                questionHTML += `
                    <button class="quiz-option select-option" data-value="${option.value}">
                        <span class="option-text">${option.text}</span>
                    </button>
                `;
            });
        }
        
        questionHTML += '</div>';
        
        questionContent.innerHTML = questionHTML;
        
        // Add event listeners based on question type
        if (question.type === 'text') {
            const textInput = document.getElementById('quiz-text-input');
            const textSubmit = document.getElementById('quiz-text-submit');
            
            const handleTextSubmit = () => {
                const value = textInput.value.trim();
                if (value) {
                    answerQuestion(question.id, value);
                }
            };
            
            textSubmit.addEventListener('click', handleTextSubmit);
            textInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleTextSubmit();
                }
            });
            
            // Focus on input
            setTimeout(() => textInput.focus(), 100);
        } else {
            // Add click listeners to option buttons
            const optionButtons = questionContent.querySelectorAll('.quiz-option');
            optionButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const value = e.currentTarget.getAttribute('data-value');
                    answerQuestion(question.id, value);
                });
            });
        }
    };
    
    const answerQuestion = (questionId, answer) => {
        quizAnswers[questionId] = answer;
        
        // Move to next question or show results
        currentQuestionIndex++;
        if (currentQuestionIndex < dreamJobQuizQuestions.length) {
            setTimeout(() => displayQuestion(currentQuestionIndex), 300);
        } else {
            setTimeout(() => showQuizResults(), 500);
        }
    };
    
    const showQuizResults = () => {
        // Hide questions screen, show results screen
        document.getElementById('quiz-questions-screen').classList.add('hidden');
        document.getElementById('quiz-results-screen').classList.remove('hidden');
        
        // Calculate career match based on answers
        const careerMatch = calculateCareerMatch(quizAnswers);
        
        // Display results
        const resultsContent = document.getElementById('quiz-results-content');
        resultsContent.innerHTML = `
            <div class="career-match">
                <div class="career-icon">${careerMatch.icon}</div>
                <h4 class="career-title">${careerMatch.title}</h4>
                <p class="career-description">${careerMatch.description}</p>
                
                <div class="career-traits">
                    <h5>Perfect for you because you:</h5>
                    <ul class="traits-list">
                        ${careerMatch.traits.map(trait => `<li>✨ ${trait}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="career-examples">
                    <h5>Example careers:</h5>
                    <div class="examples-grid">
                        ${careerMatch.examples.map(example => `
                            <div class="example-card">
                                <span class="example-emoji">${example.emoji}</span>
                                <span class="example-text">${example.text}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    };
    
    const calculateCareerMatch = (answers) => {
        // Career matching logic based on quiz responses
        const careers = {
            scientist: {
                icon: '🔬',
                title: 'Amazing Scientist',
                description: 'You love exploring, solving puzzles, and discovering how the world works!',
                traits: [
                    'Love solving complex problems',
                    'Curious about how things work',
                    'Enjoy working with your brain',
                    'Like discovering new things'
                ],
                examples: [
                    { emoji: '🧠', text: 'Neuroscientist' },
                    { emoji: '🌌', text: 'Marine Biologist' },
                    { emoji: '⚙️', text: 'Engineer' },
                    { emoji: '🔭', text: 'Researcher' }
                ]
            },
            artist: {
                icon: '🎨',
                title: 'Creative Artist',
                description: 'You have an amazing imagination and love creating beautiful things for the world to enjoy!',
                traits: [
                    'Express yourself through creativity',
                    'Love making beautiful things',
                    'Have a vivid imagination',
                    'Enjoy inspiring others'
                ],
                examples: [
                    { emoji: '🎨', text: 'Painter' },
                    { emoji: '🎬', text: 'Movie Director' },
                    { emoji: '🎤', text: 'Musician' },
                    { emoji: '📝', text: 'Writer' }
                ]
            },
            helper: {
                icon: '👩‍⚕️',
                title: 'Super Helper',
                description: 'You have a big heart and love making other people happy and healthy!',
                traits: [
                    'Care deeply about others',
                    'Want to make a difference',
                    'Good at understanding people',
                    'Love helping and teaching'
                ],
                examples: [
                    { emoji: '👩‍⚕️', text: 'Doctor' },
                    { emoji: '👩‍🏫', text: 'Teacher' },
                    { emoji: '👮', text: 'Police Officer' },
                    { emoji: '🚑', text: 'Firefighter' }
                ]
            },
            builder: {
                icon: '🔨',
                title: 'Master Builder',
                description: 'You love working with your hands and building amazing things that last forever!',
                traits: [
                    'Great with your hands',
                    'Love building and creating',
                    'Practical problem solver',
                    'See projects through to completion'
                ],
                examples: [
                    { emoji: '🏗️', text: 'Architect' },
                    { emoji: '🔨', text: 'Carpenter' },
                    { emoji: '⚙️', text: 'Mechanical Engineer' },
                    { emoji: '🚀', text: 'Rocket Designer' }
                ]
            },
            explorer: {
                icon: '🌍',
                title: 'World Explorer',
                description: 'You love adventure, discovering new places, and learning about different cultures!',
                traits: [
                    'Love adventure and travel',
                    'Curious about the world',
                    'Enjoy being outdoors',
                    'Like meeting new people'
                ],
                examples: [
                    { emoji: '🌍', text: 'Travel Guide' },
                    { emoji: '📰', text: 'Journalist' },
                    { emoji: '🕰', text: 'Archaeologist' },
                    { emoji: '✈️', text: 'Pilot' }
                ]
            },
            performer: {
                icon: '🎭',
                title: 'Amazing Performer',
                description: 'You light up every room and love entertaining people with your incredible talents!',
                traits: [
                    'Love being on stage',
                    'Enjoy making people laugh',
                    'Have natural charisma',
                    'Great at expressing emotions'
                ],
                examples: [
                    { emoji: '🎭', text: 'Actor' },
                    { emoji: '🎵', text: 'Singer' },
                    { emoji: '🤹', text: 'Comedian' },
                    { emoji: '🎪', text: 'Circus Performer' }
                ]
            }
        };
        
        // Simple scoring system
        let scores = {
            scientist: 0,
            artist: 0,
            helper: 0,
            builder: 0,
            explorer: 0,
            performer: 0
        };
        
        // Score based on specific answers
        if (answers[1] === 'indoors') scores.scientist += 2;
        if (answers[1] === 'outdoors') { scores.explorer += 2; scores.builder += 1; }
        
        if (answers[2] === 'puzzles') { scores.scientist += 2; scores.builder += 1; }
        if (answers[2] === 'create') { scores.artist += 2; scores.performer += 1; }
        
        if (answers[3] === 'brain') { scores.scientist += 2; scores.helper += 1; }
        if (answers[3] === 'hands') { scores.builder += 2; scores.artist += 1; }
        
        if (answers[4] === 'explore') scores.explorer += 3;
        if (answers[4] === 'perform') scores.performer += 3;
        if (answers[4] === 'help') scores.helper += 3;
        if (answers[4] === 'build') scores.builder += 3;
        
        if (answers[5] === 'team') { scores.helper += 1; scores.performer += 1; }
        if (answers[5] === 'alone') { scores.scientist += 1; scores.artist += 1; }
        
        // Score based on favorite subject
        const subject = answers[7];
        if (subject === 'science') scores.scientist += 2;
        if (subject === 'art') scores.artist += 2;
        if (subject === 'technology') { scores.scientist += 1; scores.builder += 1; }
        if (subject === 'nature') { scores.explorer += 1; scores.scientist += 1; }
        if (subject === 'music') { scores.performer += 2; scores.artist += 1; }
        if (subject === 'storytelling') { scores.artist += 1; scores.performer += 1; }
        if (subject === 'math') { scores.scientist += 1; scores.builder += 1; }
        if (subject === 'cooking') { scores.helper += 1; scores.artist += 1; }
        if (subject === 'geography') scores.explorer += 2;
        
        // Score based on helping style
        const helpStyle = answers[8];
        if (helpStyle === 'inspiring') scores.performer += 1;
        if (helpStyle === 'protecting') scores.helper += 2;
        if (helpStyle === 'teaching') scores.helper += 2;
        if (helpStyle === 'creating') scores.artist += 2;
        if (helpStyle === 'solving') { scores.scientist += 1; scores.builder += 1; }
        if (helpStyle === 'entertaining') scores.performer += 2;
        
        // Find the highest scoring career
        const topCareer = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
        
        return careers[topCareer];
    };
    
    const resetQuiz = () => {
        currentQuestionIndex = 0;
        quizAnswers = {};
        
        // Hide results screen, show start screen
        document.getElementById('quiz-results-screen').classList.add('hidden');
        document.getElementById('quiz-start-screen').classList.remove('hidden');
        document.getElementById('quiz-start-screen').classList.add('active');
    };
    
    const generateCareerStory = async () => {
        const userName = quizAnswers[6] || 'Young Explorer';
        const careerMatch = calculateCareerMatch(quizAnswers);
        
        // Create story data from quiz answers
        const storyData = {
            childName: userName,
            favoriteSubject: quizAnswers[7] || 'science',
            dreamActivity: quizAnswers[4] || 'exploring',
            workEnvironment: quizAnswers[1] === 'outdoors' ? 'outdoors' : 'indoors',
            helpingStyle: quizAnswers[8] || 'inspiring',
            careerType: careerMatch.title,
            age: 12 // Default to longer story
        };
        
        // Generate the story using existing Dream Job logic
        await generateDreamJobStory(storyData);
    };
    
    const generateDreamJobStory = async (storyData) => {
        try {
            console.log('🔮 Generating dream job story with:', storyData);
            
            showLoadingWithProgress('Discovering your future career story...');
            
            const { childName, favoriteSubject, dreamActivity, workEnvironment, helpingStyle, careerType, age } = storyData;
            const targetWords = age >= 12 ? 1200 : 800;
            
            const prompt = `Create an inspiring and educational career story for ${childName} (age ${age}) about becoming a ${careerType}. 
            
            Based on these interests:
            - Favorite Subject: ${favoriteSubject}
            - Dream Activity: ${dreamActivity} 
            - Work Environment: ${workEnvironment}
            - Helping Style: ${helpingStyle}
            
            The story should:
            - Be exactly ${targetWords} words
            - Show ${childName} discovering this career path
            - Include realistic day-in-the-life examples
            - Mention specific skills they'll develop
            - Include 2-3 real career examples in this field
            - End with encouragement about their future
            - Be age-appropriate and inspiring
            - Include educational elements about this career
            
            Make it engaging, realistic, and motivating for a young person interested in this field.`;
            
            const response = await makeOpenAIRequest(prompt);
            
            if (response.success) {
                displayStoryResult(response.story, {
                    icon: '🔮',
                    title: `${childName}'s Future Career Adventure`,
                    subtitle: `Discovering the path to becoming a ${careerType}`,
                    description: `An inspiring story about ${childName}'s journey into their dream career based on their personality and interests.`
                });
            } else {
                throw new Error(response.error || 'Story generation failed');
            }
            
        } catch (error) {
            console.error('❌ Dream job story generation error:', error);
            hideLoading();
            alert('😢 Oops! Something went wrong creating your career story. Please try again!');
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
    
    // Helper function for multiple file upload (Homework Forge)
    const handleMultipleFileUpload = async (e, previewElement) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        console.log('📁 Processing', files.length, 'homework files...');
        
        // Clear previous preview
        previewElement.innerHTML = '';
        
        try {
            for (let i = 0; i < Math.min(files.length, 5); i++) { // Limit to 5 files
                const file = files[i];
                if (!file.type.startsWith('image/') && !file.type.includes('pdf')) {
                    continue;
                }
                
                const filePreview = document.createElement('div');
                filePreview.className = 'file-preview-item';
                
                if (file.type.startsWith('image/')) {
                    const compressedBase64 = await compressImage(file, 400, 0.6);
                    filePreview.innerHTML = `
                        <div class="file-thumbnail">
                            <img src="${compressedBase64}" alt="${file.name}" class="homework-file-thumb">
                        </div>
                        <div class="file-info">
                            <div class="file-name">${file.name}</div>
                            <div class="file-size">${Math.round(file.size / 1024)}KB</div>
                        </div>
                    `;
                } else {
                    filePreview.innerHTML = `
                        <div class="file-thumbnail">
                            <span class="file-icon">📄</span>
                        </div>
                        <div class="file-info">
                            <div class="file-name">${file.name}</div>
                            <div class="file-size">${Math.round(file.size / 1024)}KB</div>
                        </div>
                    `;
                }
                
                previewElement.appendChild(filePreview);
            }
            
            if (files.length > 5) {
                const warning = document.createElement('div');
                warning.className = 'upload-warning';
                warning.textContent = `⚠️ Only first 5 files will be processed`;
                previewElement.appendChild(warning);
            }
        } catch (error) {
            console.error('❌ Multiple file processing failed:', error);
            previewElement.innerHTML = `
                <div class="upload-error">
                    <span class="error-icon">❌</span>
                    <span class="error-text">Failed to process files. Please try smaller files.</span>
                </div>
            `;
        }
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
                } else if (imageType === 'location') {
                    monsterLocationImageBase64 = compressedBase64;
                    console.log('🖼️ Monster location image compressed and ready:', {
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
    
    // Story generation functions for new modes
    const generateWantedPoster = async () => {
        console.log('Generating wanted poster story...');
        
        // Get form data
        const name = document.getElementById('wanted-name')?.value?.trim() || '';
        const wantedFor = document.getElementById('wanted-for')?.value?.trim() || '';
        const skills = document.getElementById('wanted-skills')?.value?.trim() || '';
        const reward = document.getElementById('wanted-reward')?.value?.trim() || '';
        const useAI = document.getElementById('generate-choice')?.checked || false;
        
        // Validate required fields
        if (!name || !wantedFor) {
            showAlert('Please fill in the outlaw\'s name and what they\'re wanted for!');
            return;
        }
        
        // Show progress modal
        showProgressModal();
        updateProgressStage(1, 'active', 'Gathering sheriff\'s reports...');
        
        try {
            const formData = {
                mode: 'wanted-poster',
                name: name,
                wantedFor: wantedFor,
                skills: skills,
                reward: reward,
                useAI: useAI,
                heroImage: heroImageBase64,
                age: '6' // Default age for wanted poster stories
            };
            
            updateProgressStage(1, 'completed');
            updateProgressStage(2, 'active', useAI ? 'Generating outlaw portrait with AI...' : 'Creating wanted poster...');
            
            // Call the API
            const response = await fetch('/api/generate-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Handle successful response with detailed progress
            updateProgressStage(2, 'completed');
            updateProgressStage(3, 'active', 'Writing Wild West adventure story...');
            setTimeout(() => {
                updateProgressStage(3, 'completed');
                updateProgressStage(4, 'active', 'Recording cowboy narration...');
                setTimeout(() => {
                    updateProgressStage(4, 'completed');
                    updateProgressStage(5, 'active', 'Sending to Yoto device...');
                    setTimeout(() => {
                        updateProgressStage(5, 'completed');
                        displayStoryResults(data, 'wanted-poster');
                        hideProgressModal();
                    }, 500);
                }, 500);
            }, 500);
            
        } catch (error) {
            console.error('Error generating wanted poster:', error);
            hideProgressModal();
            showAlert('Failed to create wanted poster: ' + error.message);
        }
    };
    
    const generateHomeworkForge = async () => {
        console.log('Generating homework summary...');
        
        const isUploadMode = document.getElementById('homework-upload-choice')?.checked;
        let formData;
        
        if (isUploadMode) {
            const filesInput = document.getElementById('homework-files');
            if (!filesInput?.files || filesInput.files.length === 0) {
                showAlert('Please upload at least one homework file or document!');
                return;
            }
            
            // Process uploaded files
            const files = Array.from(filesInput.files).slice(0, 5);
            const fileData = [];
            
            for (const file of files) {
                if (file.type.startsWith('image/')) {
                    const compressedBase64 = await compressImage(file, 800, 0.7);
                    fileData.push({
                        type: 'image',
                        data: compressedBase64,
                        name: file.name
                    });
                }
            }
            
            formData = {
                mode: 'homework-forge',
                type: 'upload',
                files: fileData,
                age: document.getElementById('homework-age')?.value || '6'
            };
        } else {
            const subject = document.getElementById('homework-subject')?.value?.trim() || '';
            const topic = document.getElementById('homework-topic')?.value?.trim() || '';
            
            if (!topic) {
                showAlert('Please enter a topic to learn about!');
                return;
            }
            
            formData = {
                mode: 'homework-forge',
                type: 'topic',
                subject: subject,
                topic: topic,
                age: document.getElementById('homework-age')?.value || '6'
            };
        }
        
        // Show progress modal
        showProgressModal();
        updateProgressStage(1, 'active', 'Analyzing your homework...');
        
        try {
            updateProgressStage(2, 'active', 'Creating fun summary...');
            
            // Call the API
            const response = await fetch('/api/generate-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Handle successful response
            updateProgressStage(5, 'completed');
            displayStoryResults(data, 'homework-forge');
            hideProgressModal();
            
        } catch (error) {
            console.error('Error generating homework summary:', error);
            hideProgressModal();
            showAlert('Failed to create learning summary: ' + error.message);
        }
    };
    
    const generateSleepForge = async (isSurpriseMode) => {
        console.log('Generating bedtime story, surprise mode:', isSurpriseMode);
        
        // Show progress modal
        showProgressModal();
        updateProgressStage(1, 'active', 'Gathering sleepy magic...');
        
        try {
            const formData = {
                mode: 'sleep-forge',
                heroName: document.getElementById('sleep-heroName')?.value?.trim() || '',
                promptSetup: document.getElementById('sleep-promptSetup')?.value?.trim() || '',
                promptRising: document.getElementById('sleep-promptRising')?.value?.trim() || '',
                promptClimax: document.getElementById('sleep-promptClimax')?.value?.trim() || '',
                age: document.getElementById('sleep-story-age')?.value || '3',
                surpriseMode: isSurpriseMode,
                heroImage: heroImageBase64
            };
            
            // Validate required fields for non-surprise mode
            if (!isSurpriseMode) {
                const hasAtLeastOneElement = 
                    formData.heroName || formData.promptSetup || 
                    formData.promptRising || formData.promptClimax;
                
                if (!hasAtLeastOneElement) {
                    showAlert('Please fill in at least one story element for your bedtime tale! 🌙');
                    return;
                }
            }
            
            updateProgressStage(2, 'active', 'Weaving peaceful dreams...');
            
            // Call the API
            const response = await fetch('/api/generate-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Handle successful response
            updateProgressStage(5, 'completed');
            displayStoryResults(data, 'sleep-forge');
            hideProgressModal();
            
        } catch (error) {
            console.error('Error generating sleep story:', error);
            hideProgressModal();
            showAlert('Failed to create bedtime story: ' + error.message);
        }
    };
    
    const generateMonsterMaker = async () => {
        console.log('Generating monster story...');
        
        const description1 = document.getElementById('monster-description1')?.value?.trim() || '';
        const description2 = document.getElementById('monster-description2')?.value?.trim() || '';
        const description3 = document.getElementById('monster-description3')?.value?.trim() || '';
        
        if (!description1) {
            showAlert('Please describe your monster!');
            return;
        }
        
        // Show progress modal
        showProgressModal();
        updateProgressStage(1, 'active', 'Summoning your monster...');
        
        try {
            const formData = {
                mode: 'monster-maker',
                description1: description1,
                description2: description2,
                description3: description3,
                locationImage: monsterLocationImageBase64, // Use monsterLocationImageBase64 for location
                age: document.getElementById('monster-story-age')?.value || '6'
            };
            
            updateProgressStage(2, 'active', 'Creating monster image...');
            
            // Call the API
            const response = await fetch('/api/generate-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Handle successful response
            updateProgressStage(5, 'completed');
            displayStoryResults(data, 'monster-maker');
            hideProgressModal();
            
        } catch (error) {
            console.error('Error generating monster:', error);
            hideProgressModal();
            showAlert('Failed to create monster: ' + error.message);
        }
    };
    
    // Generate Adventure Me story
    const generateAdventureMe = async () => {
        console.log('⚔️ Generating Adventure Me story...');
        
        const childName = document.getElementById('adventure-child-name')?.value?.trim() || '';
        const theme = document.getElementById('adventure-theme')?.value || '';
        const specialSkill = document.getElementById('adventure-special-skill')?.value?.trim() || '';
        const age = document.getElementById('adventure-story-age')?.value || '6';
        
        if (!childName || !theme) {
            showAlert('Please enter your name and choose an adventure theme!');
            return;
        }
        
        // Show progress modal
        showProgressModal();
        updateProgressStage(1, 'active', 'Preparing your epic adventure...');
        
        try {
            const formData = {
                mode: 'adventure-me',
                childName: childName,
                theme: theme,
                specialSkill: specialSkill,
                age: age
            };
            
            updateProgressStage(3, 'active', 'Crafting your personalized adventure story...');
            
            // Call the API
            const response = await fetch('/api/generate-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Handle successful response
            updateProgressStage(5, 'completed');
            displayStoryResults(data, 'adventure-me');
            hideProgressModal();
            
            console.log('✨ Adventure Me story generated successfully!');
            
        } catch (error) {
            console.error('Error generating Adventure Me story:', error);
            hideProgressModal();
            showAlert('Failed to create your adventure: ' + error.message);
        }
    };
    
    // Generate Dream Job Detective story
    const generateDreamJob = async () => {
        console.log('🔮 Generating Dream Job Detective story...');
        
        const childName = document.getElementById('dream-child-name')?.value?.trim() || '';
        const favoriteSubject = document.getElementById('dream-favorite-subject')?.value || '';
        const dreamActivity = document.getElementById('dream-activity')?.value || '';
        const workEnvironment = document.getElementById('dream-work-environment')?.value || '';
        const helpingStyle = document.getElementById('dream-helping-style')?.value || '';
        const age = document.getElementById('dream-story-age')?.value || '9';
        
        if (!childName || !favoriteSubject || !dreamActivity) {
            showAlert('Please enter your name and answer at least the first two quiz questions!');
            return;
        }
        
        // Show progress modal
        showProgressModal();
        updateProgressStage(1, 'active', 'Analyzing your personality and interests...');
        
        try {
            const formData = {
                mode: 'dream-job',
                childName: childName,
                favoriteSubject: favoriteSubject,
                dreamActivity: dreamActivity,
                workEnvironment: workEnvironment,
                helpingStyle: helpingStyle,
                age: age
            };
            
            updateProgressStage(2, 'active', 'Matching you with the perfect career...');
            updateProgressStage(3, 'active', 'Creating your inspirational career story...');
            
            // Call the API
            const response = await fetch('/api/generate-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Handle successful response
            updateProgressStage(5, 'completed');
            displayStoryResults(data, 'dream-job');
            
            // Show job match results
            if (data.dreamJob) {
                showJobMatchResults(data.dreamJob, data.allMatches);
            }
            
            hideProgressModal();
            
            console.log('🎆 Dream Job Detective story generated successfully!');
            
        } catch (error) {
            console.error('Error generating Dream Job story:', error);
            hideProgressModal();
            showAlert('Failed to discover your dream job: ' + error.message);
        }
    };
    
    // Helper function to show job match results
    const showJobMatchResults = (topJob, allMatches) => {
        const storyOutput = document.getElementById('story-output');
        if (storyOutput && topJob) {
            const jobResults = document.createElement('div');
            jobResults.className = 'job-results paper-scrap';
            jobResults.innerHTML = `
                <div class="job-header">
                    <span class="job-icon">🎯</span>
                    <span class="job-text">Your Perfect Career Match!</span>
                    <span class="job-icon">✨</span>
                </div>
                <div class="top-job">
                    <h3 class="job-title">🎆 ${topJob.title}</h3>
                    <p class="job-description">${topJob.description}</p>
                </div>
                <div class="other-matches">
                    <h4>Other Great Matches:</h4>
                    <div class="match-list">
                        ${allMatches.slice(1, 3).map(job => `
                            <div class="match-item">
                                <span class="match-title">🎼 ${job.title}</span>
                                <span class="match-desc">${job.description}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            storyOutput.appendChild(jobResults);
        }
    };
    
    // Helper function to display story results
    const displayStoryResults = (data, mode) => {
        const storyOutput = document.getElementById('story-output');
        const storyText = document.getElementById('story-text');
        
        if (storyOutput) storyOutput.classList.remove('hidden');
        
        if (data.story && storyText) {
            storyText.textContent = data.story;
        }
        
        // Handle audio if available
        const audioPlayer = document.getElementById('story-audio-player');
        if (data.audio && audioPlayer) {
            try {
                const audioBlob = b64toBlob(data.audio, 'audio/mpeg');
                const audioBlobUrl = URL.createObjectURL(audioBlob);
                audioPlayer.src = audioBlobUrl;
                audioPlayer.classList.remove('hidden');
                audioPlayer.style.display = 'block';
                console.log('🎵 Audio player setup for', mode, 'mode');
            } catch (audioError) {
                console.error('❌ Error setting up audio player:', audioError);
            }
        }
        
        // Handle mode-specific results
        if (mode === 'wanted-poster') {
            if (data.posterImage) {
                // Show wanted poster download button
                showDownloadButton(data.posterImage, 'wanted-poster.png');
            } else {
                // Show message that poster generation failed but story succeeded
                const storyOutput = document.getElementById('story-output');
                if (storyOutput) {
                    const posterNote = document.createElement('div');
                    posterNote.className = 'poster-note paper-scrap';
                    posterNote.innerHTML = `
                        <div class="note-header">
                            <span class="note-icon">🤠</span>
                            <span class="note-text">Poster Generation Update</span>
                        </div>
                        <p>Your Wild West story was created successfully! The wanted poster image is being worked on - this feature is still in development. You can still enjoy your cowboy adventure audio story!</p>
                    `;
                    storyOutput.appendChild(posterNote);
                }
            }
        } else if (mode === 'monster-maker') {
            if (data.monsterImage) {
                // Show monster image download button
                showDownloadButton(data.monsterImage, 'my-monster.png');
            } else {
                // Show message that monster generation failed but story succeeded
                const storyOutput = document.getElementById('story-output');
                if (storyOutput) {
                    const monsterNote = document.createElement('div');
                    monsterNote.className = 'monster-note paper-scrap';
                    monsterNote.innerHTML = `
                        <div class="note-header">
                            <span class="note-icon">👹</span>
                            <span class="note-text">Monster Image Update</span>
                        </div>
                        <p>Your monster story was created successfully! The monster image generation is being worked on - this feature is still in development. You can still enjoy your creature adventure audio story!</p>
                    `;
                    storyOutput.appendChild(monsterNote);
                }
            }
        }
        
        // Auto-upload to Yoto if authenticated
        if (accessToken) {
            console.log('🚀 Auto-uploading', mode, 'to Yoto...');
            createOrUpdateStoryForgePlaylist({
                ...data,
                mode: mode
            }, accessToken)
                .then(() => {
                    console.log('✅ Auto-uploaded to Yoto successfully!');
                    let successMessage;
                    switch(mode) {
                        case 'wanted-poster':
                            successMessage = 'Your Wild Wild West Adventure has been sent to your Yoto device! See your poster below! 🤠';
                            break;
                        case 'homework-forge':
                            successMessage = 'Your learning summary has been sent to your Yoto device! 📚';
                            break;
                        case 'sleep-forge':
                            successMessage = 'Your bedtime story has been sent to your Yoto device! Sweet dreams! 🌙';
                            break;
                        case 'monster-maker':
                            successMessage = 'Your monster adventure has been sent to your Yoto device! See your creature below! 👹';
                            break;
                        default:
                            successMessage = `${getModeDisplayName(mode)} created and uploaded to Yoto! 🎧`;
                    }
                    showAlert(successMessage);
                })
                .catch((yotoError) => {
                    console.error('❌ Auto-upload to Yoto failed:', yotoError);
                    showAlert(`${getModeDisplayName(mode)} created successfully! Yoto upload failed - you can retry manually.`);
                });
        }
    };
    
    // Helper function to get display name for mode
    const getModeDisplayName = (mode) => {
        const names = {
            'wanted-poster': 'Wanted Poster',
            'homework-forge': 'Learning Summary',
            'sleep-forge': 'Bedtime Story',
            'monster-maker': 'Monster Story',
            'adventure-me': 'Adventure Story',
            'dream-job': 'Career Story'
        };
        return names[mode] || 'Story';
    };
    
    // Helper function to show download button
    const showDownloadButton = (imageBase64, filename) => {
        // Create download button in the story output area
        const storyOutput = document.getElementById('story-output');
        if (storyOutput && imageBase64) {
            // Remove any existing download section first
            const existingDownload = storyOutput.querySelector('.download-section');
            if (existingDownload) {
                existingDownload.remove();
            }
            
            const downloadSection = document.createElement('div');
            downloadSection.className = 'download-section paper-scrap';
            
            const buttonId = `download-image-btn-${Date.now()}`;
            downloadSection.innerHTML = `
                <div class="download-header">
                    <span class="download-icon">📎</span>
                    <span class="download-text">Download Your Creation</span>
                    <span class="download-icon">⭐</span>
                </div>
                <button id="${buttonId}" class="download-btn">
                    <span class="btn-icon">📄</span>
                    <span class="btn-text">Download ${filename}</span>
                </button>
                <div class="download-preview">
                    <img src="${imageBase64}" alt="Generated image preview" style="max-width: 200px; max-height: 200px; border-radius: 8px; margin-top: 10px;">
                </div>
            `;
            
            storyOutput.appendChild(downloadSection);
            
            // Add download functionality with unique ID
            const downloadBtn = document.getElementById(buttonId);
            if (downloadBtn) {
                downloadBtn.onclick = () => {
                    try {
                        const link = document.createElement('a');
                        link.href = imageBase64;
                        link.download = filename;
                        link.style.display = 'none';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        // Show success feedback
                        downloadBtn.innerHTML = '<span class="btn-icon">✅</span><span class="btn-text">Downloaded!</span>';
                        setTimeout(() => {
                            downloadBtn.innerHTML = `<span class="btn-icon">📄</span><span class="btn-text">Download ${filename}</span>`;
                        }, 2000);
                    } catch (error) {
                        console.error('Download failed:', error);
                        showAlert('Download failed. Please try again.');
                    }
                };
            }
        }
    };
    
    // Progress modal management functions
    let progressModalState = {
        isMinimized: false,
        currentStage: 1,
        currentStageText: 'Preparing...',
        progress: 0
    };
    
    const showProgressModal = () => {
        const progressModal = document.getElementById('story-progress-modal');
        const progressFooter = document.getElementById('progress-footer');
        
        if (progressModal) {
            progressModal.classList.remove('hidden');
            progressModal.classList.remove('minimizing');
            
            // Reset state
            progressModalState.isMinimized = false;
            progressModalState.currentStage = 1;
            progressModalState.currentStageText = 'Preparing...';
            progressModalState.progress = 0;
            
            // Reset all stages
            for (let i = 1; i <= 5; i++) {
                const stage = document.getElementById(`stage-${i}`);
                if (stage) {
                    stage.classList.remove('active', 'completed');
                    stage.querySelector('.stage-spinner')?.classList.add('hidden');
                    stage.querySelector('.stage-check')?.classList.add('hidden');
                }
            }
            updateProgressBar(0);
            updateFooterProgress();
        }
        
        // Hide footer if visible
        if (progressFooter) {
            progressFooter.classList.remove('show');
        }
    };
    
    const hideProgressModal = () => {
        const progressModal = document.getElementById('story-progress-modal');
        const progressFooter = document.getElementById('progress-footer');
        
        if (progressModal) {
            setTimeout(() => {
                progressModal.classList.add('hidden');
                progressModalState.isMinimized = false;
            }, 2000); // Give time to see completion
        }
        
        // Also hide footer
        if (progressFooter) {
            progressFooter.classList.remove('show');
        }
    };
    
    const minimizeProgressModal = () => {
        const progressModal = document.getElementById('story-progress-modal');
        const progressFooter = document.getElementById('progress-footer');
        const modalContent = progressModal.querySelector('.modal-content');
        
        if (progressModal && progressFooter && modalContent) {
            console.log('🔽 Minimizing progress modal to footer...');
            
            // Update state
            progressModalState.isMinimized = true;
            
            // Add animation class and trigger animation
            modalContent.classList.add('minimizing');
            
            // Show footer with slide-up animation
            setTimeout(() => {
                progressFooter.classList.add('show');
                updateFooterProgress();
            }, 200);
            
            // Hide modal after animation
            setTimeout(() => {
                progressModal.classList.add('hidden');
                modalContent.classList.remove('minimizing');
            }, 400);
        }
    };
    
    const expandProgressModal = () => {
        const progressModal = document.getElementById('story-progress-modal');
        const progressFooter = document.getElementById('progress-footer');
        const modalContent = progressModal.querySelector('.modal-content');
        
        if (progressModal && progressFooter && modalContent) {
            console.log('🔼 Expanding progress modal from footer...');
            
            // Hide footer with slide-down animation
            progressFooter.classList.remove('show');
            
            // Show modal and trigger expand animation
            setTimeout(() => {
                progressModal.classList.remove('hidden');
                modalContent.classList.add('expanding');
                progressModalState.isMinimized = false;
            }, 100);
            
            // Clean up animation class
            setTimeout(() => {
                modalContent.classList.remove('expanding');
            }, 500);
        }
    };
    
    const updateFooterProgress = () => {
        const footerStage = document.getElementById('footer-current-stage');
        const footerProgressFill = document.getElementById('footer-progress-fill');
        
        if (footerStage) {
            footerStage.textContent = progressModalState.currentStageText;
        }
        
        if (footerProgressFill) {
            footerProgressFill.style.width = `${progressModalState.progress}%`;
        }
    };
    
    const updateProgressStage = (stageNum, status, text = '') => {
        const stage = document.getElementById(`stage-${stageNum}`);
        if (!stage) return;
        
        const spinner = stage.querySelector('.stage-spinner');
        const check = stage.querySelector('.stage-check');
        const progressText = document.getElementById('progress-text');
        
        // Update state for footer sync
        progressModalState.currentStage = stageNum;
        if (text) progressModalState.currentStageText = text;
        
        // Reset stage classes
        stage.classList.remove('active', 'completed');
        spinner?.classList.add('hidden');
        check?.classList.add('hidden');
        
        if (status === 'active') {
            stage.classList.add('active');
            spinner?.classList.remove('hidden');
            if (progressText && text) progressText.textContent = text;
        } else if (status === 'completed') {
            stage.classList.add('completed');
            check?.classList.remove('hidden');
        }
        
        // Update progress bar and footer
        const progress = (stageNum / 5) * 100;
        progressModalState.progress = progress;
        updateProgressBar(progress);
        
        // Update footer if minimized
        if (progressModalState.isMinimized) {
            updateFooterProgress();
        }
    };
    
    const updateProgressBar = (percentage) => {
        const progressBar = document.getElementById('overall-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
    };
    
    // Main story generation function for Classic mode
    const generateClassicStory = async (isSurpriseMode) => {
        console.log(`Generating classic story, surprise mode: ${isSurpriseMode}`);
        
        // Show progress modal instead of old loading spinner
        showProgressModal();
        updateProgressStage(1, 'active', 'Gathering magical ingredients...');
        
        // Hide story output initially
        const storyOutput = document.getElementById('story-output');
        const storyText = document.getElementById('story-text');
        const uploadToYotoButton = document.getElementById('upload-to-yoto-button');
        
        if (storyOutput) storyOutput.classList.add('hidden');
        if (storyText) storyText.textContent = '';
        if (uploadToYotoButton) uploadToYotoButton.classList.add('hidden');
        
        try {
            // First, analyze any uploaded images to get descriptions
            let characterDescription = null;
            let sceneDescription = null;
            
            // Complete stage 1
            updateProgressStage(1, 'completed');
            
            if (heroImageBase64 || sceneImageBase64) {
                // Move to image analysis stage
                updateProgressStage(2, 'active', 'Teaching our dragons to see your artwork...');
                
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
                
                // Complete image analysis stage
                updateProgressStage(2, 'completed');
            } else {
                // Skip image analysis if no images
                updateProgressStage(2, 'completed');
            }
            
            // Move to story creation stage
            updateProgressStage(3, 'active', 'Our storytelling wizards are weaving your tale...');
            
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
    
    // Initialize navigation dropdown
    initializeNavigation();
    
    // Initialize progress modal controls
    const minimizeBtn = document.getElementById('minimize-progress-btn');
    const expandBtn = document.getElementById('expand-progress-btn');
    
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', minimizeProgressModal);
    }
    
    if (expandBtn) {
        expandBtn.addEventListener('click', expandProgressModal);
    }
    
    // Initialize expandable text inputs
    initializeExpandableTextInputs();
    
    // --- Expandable Text Input System ---
    let currentExpandableInput = null;
    
    function initializeExpandableTextInputs() {
        console.log('🎨 Initializing expandable text inputs...');
        
        // Set up event listeners for existing inputs
        setupExpandableInputListeners();
        
        // Setup modal event listeners
        setupTextInputModalListeners();
    }
    
    function setupExpandableInputListeners() {
        // Use event delegation to handle dynamically loaded content
        document.addEventListener('click', (e) => {
            const input = e.target;
            
            // Check if clicked element is a story prompt input (not character name)
            if (input.matches('input[type="text"]') || input.matches('textarea')) {
                const inputId = input.id;
                
                // Skip character name inputs
                if (inputId && (
                    inputId.includes('heroName') || 
                    inputId.includes('child-name') ||
                    (inputId.includes('name') && !inputId.includes('description'))
                )) {
                    return; // Don't expand character name inputs
                }
                
                // Skip if it's already the expandable textarea
                if (inputId === 'expandable-textarea') return;
                
                // Only expand story prompt inputs
                if (inputId && (
                    inputId.includes('promptSetup') ||
                    inputId.includes('promptRising') ||
                    inputId.includes('promptClimax') ||
                    inputId.includes('special-skill') ||
                    inputId.includes('description')
                )) {
                    e.preventDefault();
                    openExpandableTextInput(input);
                }
            }
        });
    }
    
    function setupTextInputModalListeners() {
        const modal = document.getElementById('text-input-modal');
        const closeBtn = document.getElementById('close-text-input');
        const cancelBtn = document.getElementById('cancel-text-input');
        const saveBtn = document.getElementById('save-text-input');
        const textarea = document.getElementById('expandable-textarea');
        
        // Close modal handlers
        [closeBtn, cancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', closeExpandableTextInput);
            }
        });
        
        // Save handler
        if (saveBtn) {
            saveBtn.addEventListener('click', saveExpandableTextInput);
        }
        
        // Close on background click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeExpandableTextInput();
                }
            });
        }
        
        // Auto-resize textarea
        if (textarea) {
            textarea.addEventListener('input', autoResizeTextarea);
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (modal && !modal.classList.contains('hidden')) {
                if (e.key === 'Escape') {
                    closeExpandableTextInput();
                } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    saveExpandableTextInput();
                }
            }
        });
    }
    
    function openExpandableTextInput(originalInput) {
        console.log('🎨 Opening expandable text input for:', originalInput.id);
        
        currentExpandableInput = originalInput;
        const modal = document.getElementById('text-input-modal');
        const title = document.getElementById('text-input-modal-title');
        const label = document.getElementById('text-input-label');
        const textarea = document.getElementById('expandable-textarea');
        
        if (!modal || !title || !label || !textarea) return;
        
        // Set modal content based on input type
        const inputConfig = getInputConfig(originalInput.id);
        title.textContent = inputConfig.title;
        label.textContent = inputConfig.label;
        textarea.placeholder = inputConfig.placeholder;
        
        // Pre-populate with existing value
        textarea.value = originalInput.value || '';
        
        // Show modal
        modal.classList.remove('hidden');
        
        // Focus and auto-resize
        setTimeout(() => {
            textarea.focus();
            autoResizeTextarea({ target: textarea });
        }, 100);
    }
    
    function closeExpandableTextInput() {
        const modal = document.getElementById('text-input-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        currentExpandableInput = null;
    }
    
    function saveExpandableTextInput() {
        if (!currentExpandableInput) return;
        
        const textarea = document.getElementById('expandable-textarea');
        if (!textarea) return;
        
        const value = textarea.value.trim();
        
        // Save to original input
        currentExpandableInput.value = value;
        
        // Add visual feedback for completion
        if (value) {
            markInputAsCompleted(currentExpandableInput);
        } else {
            markInputAsIncomplete(currentExpandableInput);
        }
        
        // Close modal
        closeExpandableTextInput();
        
        // Show brief success feedback
        if (value) {
            showBriefFeedback('✅ Story element saved!');
        }
    }
    
    function markInputAsCompleted(input) {
        input.classList.add('input-completed');
        const inputGroup = input.closest('.input-group');
        if (inputGroup) {
            inputGroup.classList.add('completed');
        }
    }
    
    function markInputAsIncomplete(input) {
        input.classList.remove('input-completed');
        const inputGroup = input.closest('.input-group');
        if (inputGroup) {
            inputGroup.classList.remove('completed');
        }
    }
    
    function autoResizeTextarea(e) {
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 400) + 'px';
    }
    
    function getInputConfig(inputId) {
        const configs = {
            'classic-promptSetup': {
                title: 'The Beginning 🌅',
                label: 'Where does your story begin?',
                placeholder: 'Set the scene for your magical adventure! Describe the world, the setting, or the situation where our hero finds themselves. Is it a mysterious forest? A bustling marketplace? A cozy cottage? Paint the picture! ✨'
            },
            'classic-promptRising': {
                title: 'The Challenge ⚡',
                label: 'What exciting challenge appears?',
                placeholder: 'What obstacle, mystery, or adventure challenges our hero? Maybe a dragon appears, a puzzle needs solving, or friends need rescuing! The more creative and exciting, the better! 🎆'
            },
            'classic-promptClimax': {
                title: 'The Resolution 🎆',
                label: 'How does the story end?',
                placeholder: 'How does our hero triumph? Do they outsmart the challenge, make new friends, discover something amazing, or save the day? Give your story a satisfying and magical conclusion! ✨'
            },
            'adventure-special-skill': {
                title: 'Your Special Skill ✨',
                label: 'What makes you special in this adventure?',
                placeholder: 'Describe your amazing abilities! Can you talk to animals? Do you have super speed? Are you incredibly clever? Can you fly? The more unique and fun, the better your adventure will be! 🚀'
            },
            'sleep-promptSetup': {
                title: 'Peaceful Beginning 🌙',
                label: 'Where does your calm story begin?',
                placeholder: 'Describe a gentle, peaceful setting for bedtime. Maybe a quiet meadow under starlight, a cozy bedroom with soft moonbeams, or a calm lake reflecting the evening sky... 🌌'
            },
            'sleep-promptRising': {
                title: 'Gentle Adventure 🌸',
                label: 'What peaceful journey unfolds?',
                placeholder: 'Describe a soft, calming adventure. Perhaps helping sleepy forest animals find their beds, floating on gentle clouds, or taking a quiet walk through a magical garden... 😴'
            },
            'sleep-promptClimax': {
                title: 'Peaceful Ending 😴',
                label: 'How does everyone rest peacefully?',
                placeholder: 'Describe how everyone settles down for the night. Maybe they all snuggle up under warm blankets, fall asleep to gentle lullabies, or drift off watching shooting stars... 💫'
            },
            'monster-description1': {
                title: 'Your Monster 👹',
                label: 'What does your monster look like?',
                placeholder: 'Describe your friendly monster! What color is it? How big? Does it have stripes, spots, or sparkles? Fuzzy fur or smooth skin? Big eyes or tiny ones? The more detailed, the more amazing your monster will be! 🎨'
            },
            'monster-description2': {
                title: 'Monster Powers ⚡',
                label: 'What special abilities does your monster have?',
                placeholder: 'What makes your monster special? Can it fly, turn invisible, glow in the dark, or make beautiful music? Does it have magical powers, super strength, or the ability to grant wishes? ✨'
            },
            'monster-description3': {
                title: 'Monster Personality 💖',
                label: 'What is your monster\'s personality like?',
                placeholder: 'Is your monster shy or outgoing? Playful or wise? Does it love to dance, tell jokes, help others, or collect shiny things? What makes your monster a great friend? 🤗'
            }
        };
        
        return configs[inputId] || {
            title: 'Story Element 🎨',
            label: 'Describe your story element...',
            placeholder: 'Let your imagination run wild! The more creative details you add, the more magical your story will become! ✨'
        };
    }
    
    function showBriefFeedback(message) {
        // Create temporary feedback element
        const feedback = document.createElement('div');
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-family: var(--font-body);
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(feedback);
        
        // Animate in
        setTimeout(() => {
            feedback.style.transform = 'translateX(0)';
        }, 10);
        
        // Animate out and remove
        setTimeout(() => {
            feedback.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, 2000);
    }
    
    // Initial check on page load
    checkAuthentication();
    
    // Helper functions for new UI elements
    window.showModeHelp = (mode) => {
        const helpMessages = {
            classic: 'Classic Story mode creates traditional tales with heroes, adventures, and magical endings. Fill in at least one story element - the more details you provide, the richer your story will be!'
        };
        showAlert(helpMessages[mode] || 'Help information coming soon!');
    };
    
    window.printStoryWorksheet = () => {
        // This will be implemented when the worksheet file is ready
        showAlert('Story arc worksheet coming soon! 📝 This will help you plan amazing stories.');
    };
    
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
