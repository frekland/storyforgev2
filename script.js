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
    
    // 🎲 Surprise Me Button Functionality
    const surpriseMeButton = document.getElementById('surprise-me-btn');
    surpriseMeButton.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Show loading state
        storyOutput.classList.remove('hidden');
        loadingSpinner.classList.remove('hidden');
        storyText.textContent = '';
        uploadToYotoButton.classList.add('hidden');
        
        // Update loading text for surprise mode
        const loadingText = document.querySelector('.loading-text span:nth-child(2)');
        loadingText.textContent = 'Creating a surprise adventure just for you...';
        
        // Get selected age
        const storyAge = document.getElementById('story-age').value;
        
        try {
            const response = await fetch('/api/generate-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    age: storyAge,
                    surpriseMode: true 
                }),
            });
            
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.message || `HTTP Error! Status: ${response.status}`);
            }

            const result = await response.json();
            
            loadingSpinner.classList.add('hidden');
            loadingText.textContent = 'Brewing your magical story...';
            storyText.textContent = result.story;

            // Handle generated image if present
            if (result.generatedImage) {
                console.log('🎨 Received generated image for surprise story');
                
                // Update the image preview with the generated image
                const imagePreview = document.getElementById('image-preview');
                imagePreview.style.backgroundImage = `url(${result.generatedImage})`;
                imagePreview.classList.remove('hidden');
                
                // Store the generated image as the heroImage for playlist creation
                heroImageBase64 = result.generatedImage;
                
                // Show a note about the generated image
                const imageNote = document.createElement('div');
                imageNote.className = 'generated-image-note';
                imageNote.innerHTML = '🎨 <span>AI-generated illustration based on your story!</span>';
                imageNote.style.cssText = `
                    background: var(--accent-color);
                    color: white;
                    padding: 8px 15px;
                    border-radius: 15px;
                    font-size: 0.9em;
                    margin-top: 10px;
                    text-align: center;
                    opacity: 0.9;
                `;
                
                const imageUploadArea = document.getElementById('image-upload-area');
                const existingNote = imageUploadArea.querySelector('.generated-image-note');
                if (existingNote) existingNote.remove();
                imageUploadArea.appendChild(imageNote);
            }

            // Handle audio
            const audioSrc = `data:audio/mp3;base64,${result.audio}`;
            const base64toBlob = (base64) => {
                const byteString = atob(base64.split(',')[1]);
                const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) { ia[i] = byteString.charCodeAt(i); }
                return new Blob([ab], { type: mimeString });
            };
            const audioBlob = base64toBlob(audioSrc);
            const audioBlobUrl = URL.createObjectURL(audioBlob);
            audioPlayer.src = audioBlobUrl;
            audioPlayer.classList.remove('hidden');

            // Setup Yoto upload functionality
            uploadToYotoButton.onclick = async () => {
                uploadToYotoButton.disabled = true;
                uploadToYotoButton.textContent = 'Forging Yoto Card...';
                try {
                    if (isTokenExpired(accessToken)) {
                        const newTokens = await refreshTokens(refreshToken);
                        accessToken = newTokens.accessToken;
                        refreshToken = newTokens.refreshToken;
                    }
                    
                    // Extract story elements from the generated story for playlist creation
                    const words = result.story.split(' ');
                    const heroName = words.find((word, index) => {
                        const prevWords = words.slice(Math.max(0, index - 3), index).join(' ').toLowerCase();
                        return (prevWords.includes('hero') || prevWords.includes('character') || index < 10) && 
                               word.charAt(0) === word.charAt(0).toUpperCase() && word.length > 2;
                    }) || 'Surprise Hero';
                    
                    const myoContent = await createOrUpdateStoryForgePlaylist({
                        heroName: heroName,
                        storyText: result.story,
                        duration: result.duration,
                        fileSize: result.fileSize,
                        promptSetup: 'surprise adventure',
                        promptRising: 'unexpected challenge',
                        promptClimax: 'clever solution',
                        age: storyAge,
                        heroImage: heroImageBase64
                    }, accessToken);
                    showAlert('Surprise story successfully added to StoryForge playlist!');
                    console.log('StoryForge Playlist Updated:', myoContent);
                } catch (e) {
                    console.error("Failed to create/update StoryForge playlist:", e);
                    showAlert("Error updating StoryForge playlist. Please check the console.");
                } finally {
                    uploadToYotoButton.disabled = false;
                    uploadToYotoButton.textContent = 'Add to StoryForge Playlist';
                }
            };
            uploadToYotoButton.classList.remove('hidden');

        } catch (error) {
            console.error('Surprise story error:', error);
            loadingSpinner.classList.add('hidden');
            loadingText.textContent = 'Brewing your magical story...';
            storyText.textContent = `Oh no! The surprise magic didn't work this time. Error: ${error.message}`;
            showAlert(error.message);
        }
    });

    // --- Part 2: Form & Drag-and-Drop Image Logic ---
    const handleFile = (file) => {
        if (file && file.type.startsWith('image/')) {
            imagePreview.classList.remove('hidden');
            const reader = new FileReader();
            reader.onloadend = () => {
                heroImageBase64 = reader.result;
                imagePreview.style.backgroundImage = `url(${heroImageBase64})`;
            };
            reader.readAsDataURL(file);
        } else {
            imagePreview.classList.add('hidden');
            heroImageBase64 = null;
        }
    };

    heroImageInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
    imageUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); imageUploadArea.classList.add('drag-over'); });
    imageUploadArea.addEventListener('dragleave', () => imageUploadArea.classList.remove('drag-over'));
    imageUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        imageUploadArea.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        handleFile(file);
        heroImageInput.files = e.dataTransfer.files;
    });

    // --- Part 3: Story Generation and Yoto API Integration ---
    questForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        storyOutput.classList.remove('hidden');
        loadingSpinner.classList.remove('hidden');
        storyText.textContent = '';
        uploadToYotoButton.classList.add('hidden');

        const heroName = document.getElementById('heroName').value;
        const promptSetup = document.getElementById('promptSetup').value;
        const promptRising = document.getElementById('promptRising').value;
        const promptClimax = document.getElementById('promptClimax').value;
        const storyAge = document.getElementById('story-age').value;

        const storyData = { heroName, promptSetup, promptRising, promptClimax, heroImage: heroImageBase64, age: storyAge };

        try {
            const response = await fetch('/api/generate-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(storyData),
            });
            
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.message || `HTTP Error! Status: ${response.status}`);
            }

            const result = await response.json();
            
            loadingSpinner.classList.add('hidden');
            storyText.textContent = result.story;

            const audioSrc = `data:audio/mp3;base64,${result.audio}`;
            const base64toBlob = (base64) => {
                const byteString = atob(base64.split(',')[1]);
                const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) { ia[i] = byteString.charCodeAt(i); }
                return new Blob([ab], { type: mimeString });
            };
            const audioBlob = base64toBlob(audioSrc);
            const audioBlobUrl = URL.createObjectURL(audioBlob);
            audioPlayer.src = audioBlobUrl;
            audioPlayer.classList.remove('hidden');

            uploadToYotoButton.onclick = async () => {
                uploadToYotoButton.disabled = true;
                uploadToYotoButton.textContent = 'Forging Yoto Card...';
                try {
                    if (isTokenExpired(accessToken)) {
                        const newTokens = await refreshTokens(refreshToken);
                        accessToken = newTokens.accessToken;
                        refreshToken = newTokens.refreshToken;
                    }
                    const myoContent = await createOrUpdateStoryForgePlaylist({
                        heroName: document.getElementById('heroName').value,
                        storyText: result.story,
                        duration: result.duration,
                        fileSize: result.fileSize,
                        promptSetup,
                        promptRising,
                        promptClimax,
                        age: storyAge,
                        heroImage: heroImageBase64
                    }, accessToken);
                    showAlert('Story successfully added to StoryForge playlist!');
                    console.log('StoryForge Playlist Updated:', myoContent);
                } catch (e) {
                    console.error("Failed to create/update StoryForge playlist:", e);
                    showAlert("Error updating StoryForge playlist. Please check the console.");
                } finally {
                    uploadToYotoButton.disabled = false;
                    uploadToYotoButton.textContent = 'Upload to Yoto';
                }
            };
            uploadToYotoButton.classList.remove('hidden');

        } catch (error) {
            console.error('Error:', error);
            loadingSpinner.classList.add('hidden');
            storyText.textContent = `Oh no! The storyforge has run out of magic. Error: ${error.message}`;
            showAlert(error.message);
        }
    });
    
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
                } catch (imageError) {
                    console.warn("⚠️ Cover image upload error:", imageError);
                }
            }
            
            // Step 3: Create streaming URL for new story
            const streamingUrl = new URL(`${window.location.origin}/api/generate-story`);
            streamingUrl.searchParams.set('heroName', storyData.heroName || 'Hero');
            streamingUrl.searchParams.set('promptSetup', storyData.promptSetup || '');
            streamingUrl.searchParams.set('promptRising', storyData.promptRising || '');
            streamingUrl.searchParams.set('promptClimax', storyData.promptClimax || '');
            streamingUrl.searchParams.set('age', storyData.age || '6');
            streamingUrl.searchParams.set('audioOnly', 'true');
            if (storyData.heroImage) {
                streamingUrl.searchParams.set('heroImage', storyData.heroImage);
            }
            
            console.log('🎵 Created streaming URL:', streamingUrl.toString());
            
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
            let apiResponse;
            if (cardId) {
                console.log(`🔄 Updating existing playlist (PUT /content/${cardId})...`);
                apiResponse = await fetch(`https://api.yotoplay.com/content/${cardId}`, {
                    method: "PUT",
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(finalPlaylist)
                });
            } else {
                console.log('🆕 Creating new playlist (POST /content)...');
                apiResponse = await fetch('https://api.yotoplay.com/content', {
                    method: "POST",
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(finalPlaylist)
                });
            }
            
            if (!apiResponse.ok) {
                const errorText = await apiResponse.text();
                console.error('❌ Yoto API Error:', {
                    operation: cardId ? 'UPDATE' : 'CREATE',
                    endpoint: cardId ? `/content/${cardId}` : '/content',
                    method: cardId ? 'PUT' : 'POST',
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
                
                throw new Error(`Yoto API ${cardId ? 'update' : 'creation'} failed: ${errorText}`);
            }
            
            const result = await apiResponse.json();
            console.log('✅ Success! StoryForge playlist updated:', {
                operation: cardId ? 'UPDATED' : 'CREATED',
                cardId: result.cardId || cardId,
                title: result.title,
                chapters: result.content?.chapters?.length || 'unknown'
            });
            
            return result;
            
        } catch (error) {
            console.error('💥 Error in createOrUpdateStoryForgePlaylist:', error);
            throw error;
        }
    }

    // Initial check on page load
    checkAuthentication();
});