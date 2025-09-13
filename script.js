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
                    const myoContent = await createYotoPlaylist(result.story, heroImageBase64, audioBlob, accessToken);
                    showAlert('Story successfully added to a new Yoto playlist!');
                    console.log('New Yoto Playlist:', myoContent);
                } catch (e) {
                    console.error("Failed to create Yoto playlist:", e);
                    showAlert("Error creating Yoto playlist. Please check the console.");
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
    
    // We will now use an S3 pre-signed URL to upload audio
    const uploadAudioFileToS3 = async (audioBlob) => {
        // Step 1: Request a signed URL from our backend
        const fileName = `storyforge-audio-${Date.now()}.mp3`;
        const fileType = 'audio/mp3';
        
        const signedUrlResponse = await fetch('/api/upload-audio', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileName, fileType }),
        });

        if (!signedUrlResponse.ok) {
            const errorResult = await signedUrlResponse.json();
            throw new Error(errorResult.message);
        }

        const { signedUrl, key } = await signedUrlResponse.json();

        // Step 2: Upload the audio file directly to S3 using the signed URL
        const s3UploadResponse = await fetch(signedUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': fileType,
            },
            body: audioBlob,
        });
        
        if (!s3UploadResponse.ok) {
            throw new Error("Failed to upload file to S3.");
        }

        // Step 3: Return the public S3 URL
        const s3BucketUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
        return s3BucketUrl;
    };
    
    // Function to create a new playlist on Yoto
    const createYotoPlaylist = async (storyText, imageBase64, audioBlob, token) => {
        // Step 1: Upload custom icon or cover image if provided
        let coverImageUrl = null;
        if (imageBase64) {
            const mimeType = imageBase64.substring(imageBase64.indexOf(":") + 1, imageBase64.indexOf(";"));
            const imageFile = new Blob([new Uint8Array(atob(imageBase64.split(',')[1]).split('').map(char => char.charCodeAt(0)))], { type: mimeType });

            const uploadUrl = new URL("https://api.yotoplay.com/media/coverImage/user/me/upload");
            uploadUrl.searchParams.set("autoconvert", "true");

            const uploadResponse = await fetch(uploadUrl, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": mimeType,
                },
                body: imageFile,
            });

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                throw new Error(`Failed to upload cover image: ${errorText}`);
            }
            const uploadResult = await uploadResponse.json();
            coverImageUrl = uploadResult.coverImage.mediaUrl;
        }

        // Step 2: Upload the audio using our new S3 upload function
        const audioUrl = await uploadAudioFileToS3(audioBlob);

        // Step 3: Create the playlist content body
        const chapters = [{
            key: "01",
            title: "Your Epic Tale",
            tracks: [{
                key: "01",
                title: "Chapter One",
                trackUrl: audioUrl,
                type: "stream",
                format: "mp3",
                display: { icon16x16: "yoto:#ZuVmuvnoFiI4el6pBPvq0ofcgQ18HjrCmdPEE7GCnP8" }
            }],
            display: { icon16x16: "yoto:#ZuVmuvnoFiI4el6pBPvq0ofcgQ18HjrCmdPEE7GCnP8" }
        }];

        const contentBody = {
            title: document.getElementById('heroName').value || 'New Storyforge Tale',
            content: { chapters },
            metadata: {
                description: storyText.substring(0, 100) + '...',
            },
        };

        if (coverImageUrl) {
            contentBody.metadata.cover = { imageL: coverImageUrl };
        }

        // Step 4: Send the final POST request to create the playlist
        const createResponse = await fetch("https://api.yotoplay.com/content", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(contentBody),
        });

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            throw new Error(`Failed to create playlist: ${errorText}`);
        }

        return await createResponse.json();
    };

    // Initial check on page load
    checkAuthentication();
});