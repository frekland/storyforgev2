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
                    const myoContent = await createSimpleYotoStory({
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
                    showAlert('Story successfully uploaded to Yoto!');
                    console.log('New Yoto Content:', myoContent);
                } catch (e) {
                    console.error("Failed to create Yoto content:", e);
                    showAlert("Error creating Yoto content. Please check the console.");
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
    
    // ✅ SIMPLE: Create individual Yoto story (no complex playlist management)
    async function createSimpleYotoStory(storyData, accessToken) {
        try {
            console.log("Creating new Yoto story...");
            
            // Step 1: Upload cover image if provided
            let coverImageUrl = null;
            if (storyData.heroImage) {
                console.log("Uploading cover image...");
                try {
                    const mimeType = storyData.heroImage.substring(storyData.heroImage.indexOf(":") + 1, storyData.heroImage.indexOf(";"));
                    const imageFile = new Blob([new Uint8Array(atob(storyData.heroImage.split(',')[1]).split('').map(char => char.charCodeAt(0)))], { type: mimeType });
                    
                    const uploadUrl = new URL("https://api.yotoplay.com/media/coverImage/user/me/upload");
                    uploadUrl.searchParams.set("autoconvert", "true");
                    
                    const uploadResponse = await fetch(uploadUrl, {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            "Content-Type": mimeType,
                        },
                        body: imageFile,
                    });
                    
                    if (uploadResponse.ok) {
                        const uploadResult = await uploadResponse.json();
                        coverImageUrl = uploadResult.coverImage.mediaUrl;
                        console.log("Cover image uploaded successfully:", coverImageUrl);
                    } else {
                        console.warn("Failed to upload cover image, continuing without it");
                    }
                } catch (imageError) {
                    console.warn("Error uploading cover image:", imageError);
                }
            }
            
            // Step 2: Create streaming URL for dynamic audio generation
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
            
            // Step 3: Create simple content structure
            const storyTitle = storyData.heroName ? `${storyData.heroName}'s Adventure` : 'Storyforge Tale';
            const contentBody = {
                title: storyTitle,
                content: {
                    chapters: [{
                        key: "01",
                        title: "Your Epic Tale",
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
                    }]
                },
                metadata: {
                    description: (storyData.storyText || 'AI-generated story').substring(0, 100) + '...',
                    media: {
                        duration: storyData.duration || 180,
                        fileSize: storyData.fileSize || 1000000
                    }
                }
            };
            
            // Add cover image if we have one
            if (coverImageUrl) {
                contentBody.metadata.cover = { imageL: coverImageUrl };
            }
            
            console.log('Creating Yoto content with payload:', JSON.stringify(contentBody, null, 2));
            
            // Step 4: Create the content
            const response = await fetch("https://api.yotoplay.com/content", {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(contentBody)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Yoto API Error:", {
                    status: response.status,
                    statusText: response.statusText,
                    errorBody: errorText
                });
                throw new Error(`Failed to create Yoto content: ${errorText}`);
            }
            
            const result = await response.json();
            console.log("Yoto content created successfully:", result);
            return result;
            
        } catch (error) {
            console.error("Error in createSimpleYotoStory:", error);
            throw error;
        }
    }

    // Initial check on page load
    checkAuthentication();
});