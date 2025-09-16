import { getStoredTokens, storeTokens, clearTokens, isTokenExpired, refreshTokens } from "./tokens.js";
import pkceChallenge from "pkce-challenge";
import { jwtDecode } from "jwt-decode";

document.addEventListener('DOMContentLoaded', () => {
    // Core elements
    const loginButton = document.getElementById("login-button");
    const logoutButton = document.getElementById("logout-button");
    const appContent = document.getElementById("app-content");
    const homepage = document.getElementById("homepage");
    const alertModal = document.getElementById('alert-modal');
    const alertMessage = document.getElementById('alert-message');
    const closeButton = document.querySelector('.close-button');
    const themeToggle = document.getElementById('theme-toggle');
    
    // Mode system elements
    const modeCards = document.querySelectorAll('.mode-card');
    const dynamicContent = document.getElementById('dynamic-content');
    const storyOutput = document.getElementById('story-output');
    const backToModesBtn = document.getElementById('back-to-modes');
    
    // Story elements
    const loadingSpinner = document.getElementById('loading-spinner');
    const storyText = document.getElementById('story-text');
    const audioPlayer = document.getElementById('story-audio-player');
    const uploadToYotoButton = document.getElementById('upload-to-yoto-button');
    
    let heroImageBase64 = null;
    let accessToken = null;
    let refreshToken = null;
    let currentMode = null;

    const clientId = import.meta.env.VITE_CLIENT_ID;
    
    // Simple mode content creation
    const createModeContent = (mode) => {
        if (mode === 'classic') {
            return `
                <div class="story-form-container">
                    <div class="form-header paper-scrap">
                        <h2 class="form-title">StoryForge Classic</h2>
                        <p class="form-subtitle">Use the S-curve story structure to craft your adventure</p>
                    </div>
                    <form id="quest-form" class="story-form">
                        <div class="input-group paper-scrap">
                            <label for="heroName" class="playful-label">
                                <span class="label-text">Hero Name</span>
                            </label>
                            <input type="text" id="heroName" class="paper-input" placeholder="e.g., Captain Comet, Princess Luna...">
                        </div>
                        <div class="input-group paper-scrap">
                            <label for="story-age" class="playful-label">
                                <span class="label-text">Story Length</span>
                            </label>
                            <select id="story-age" class="paper-select" required>
                                <option value="3">Little Listeners (~500 words)</option>
                                <option value="6" selected>Young Explorers (~1000 words)</option>
                                <option value="9">Adventure Seekers (~2000 words)</option>
                                <option value="12">Epic Readers (~3000 words)</option>
                            </select>
                        </div>
                        <div class="submit-section paper-scrap">
                            <button type="submit" class="forge-btn">
                                <span class="btn-text">Forge My Story!</span>
                            </button>
                        </div>
                    </form>
                </div>`;
        } else if (mode === 'help') {
            return `
                <div class="help-container">
                    <div class="help-header paper-scrap">
                        <h2 class="help-title">Help & Guides</h2>
                        <p class="help-subtitle">Learn how to create amazing stories</p>
                    </div>
                    <div class="help-sections">
                        <div class="help-section paper-scrap">
                            <h3>The S-Curve Story Structure</h3>
                            <p>Every great story follows the S-curve: Setup, Rising Action, and Climax!</p>
                        </div>
                    </div>
                </div>`;
        } else {
            return `
                <div class="story-form-container">
                    <div class="form-header paper-scrap">
                        <h2 class="form-title">Mode Coming Soon!</h2>
                        <p class="form-subtitle">This storytelling mode is being crafted with love...</p>
                    </div>
                </div>`;
        }
    };

    // Modal Functionality
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
    
    // Theme Toggle Functionality
    const initTheme = () => {
        const savedTheme = localStorage.getItem('storyforge-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    };
    
    const toggleTheme = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('storyforge-theme', newTheme);
        
        themeToggle.style.transform = 'scale(1.2) rotate(360deg)';
        setTimeout(() => {
            themeToggle.style.transform = '';
        }, 300);
    };
    
    themeToggle.addEventListener('click', toggleTheme);
    initTheme();

    // Authentication Logic
    const handleLogin = async () => {
        try {
            const { code_verifier, code_challenge } = await pkceChallenge();
            sessionStorage.setItem('pkce_code_verifier', code_verifier);
            const authUrl = new URL("https://login.yotoplay.com/authorize");
            authUrl.search = new URLSearchParams({
                audience: "https://api.yotoplay.com",
                scope: "offline_access write:myo",
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
        homepage.classList.add('hidden');
        loginButton.classList.add('hidden');
        logoutButton.classList.remove('hidden');
        appContent.classList.remove('hidden');
    };
    
    // Mode System Functions
    const switchToMode = (mode) => {
        currentMode = mode;
        
        document.querySelector('.mode-selection-section').classList.add('hidden');
        dynamicContent.innerHTML = createModeContent(mode);
        dynamicContent.classList.remove('hidden');
        
        if (mode === 'classic') {
            setupClassicMode();
        }
    };
    
    const backToModes = () => {
        document.querySelector('.mode-selection-section').classList.remove('hidden');
        dynamicContent.classList.add('hidden');
        storyOutput.classList.add('hidden');
        dynamicContent.innerHTML = '';
        currentMode = null;
    };

    const setupClassicMode = () => {
        const questForm = document.getElementById('quest-form');
        if (questForm) {
            questForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                showAlert('Story generation coming soon!');
            });
        }
    };

    loginButton.addEventListener('click', handleLogin);
    logoutButton.addEventListener('click', handleLogout);
    
    // Mode card click handlers
    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            const mode = card.dataset.mode;
            if (mode) {
                switchToMode(mode);
            }
        });
    });
    
    // Back to modes button
    if (backToModesBtn) {
        backToModesBtn.addEventListener('click', backToModes);
    }

    // Initial check on page load
    checkAuthentication();
});