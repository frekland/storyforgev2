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
    
    // Mode Templates - Using createElement to avoid template literal build issues
    const createModeContent = (mode) => {
        const container = document.createElement('div');
        
        switch(mode) {
            case 'classic':
                container.innerHTML = `
                <div class="story-form-container">
                    <div class="form-header paper-scrap">
                        <h2 class="form-title">StoryForge Classic ✨</h2>
                        <p class="form-subtitle">Use the S-curve story structure to craft your adventure</p>
                    </div>
                    <form id="quest-form" class="story-form">
                        <div class="input-group paper-scrap">
                            <label for="heroName" class="playful-label">
                                <span class="label-text">Hero's Name</span>
                                <span class="label-doodle">🦸</span>
                            </label>
                            <input type="text" id="heroName" class="paper-input" placeholder="e.g., Captain Comet, Princess Luna...">
                        </div>
                        <div class="input-group paper-scrap">
                            <label for="promptSetup" class="playful-label">
                                <span class="label-text">The Beginning (Setup)</span>
                                <span class="label-doodle">🌅</span>
                            </label>
                            <input type="text" id="promptSetup" class="paper-input" placeholder="e.g., a magical forest made of ice cream...">
                        </div>
                        <div class="input-group paper-scrap">
                            <label for="promptRising" class="playful-label">
                                <span class="label-text">The Challenge (Rising Action)</span>
                                <span class="label-doodle">⚡</span>
                            </label>
                            <input type="text" id="promptRising" class="paper-input" placeholder="e.g., a grumpy dragon stole the sprinkles...">
                        </div>
                        <div class="input-group paper-scrap">
                            <label for="promptClimax" class="playful-label">
                                <span class="label-text">The Resolution (Climax)</span>
                                <span class="label-doodle">🎆</span>
                            </label>
                            <input type="text" id="promptClimax" class="paper-input" placeholder="e.g., the dragon was tickled until it laughed...">
                        </div>
                        <div class="input-group paper-scrap">
                            <label for="story-age" class="playful-label">
                                <span class="label-text">Story Length</span>
                                <span class="label-doodle">📆</span>
                            </label>
                            <select id="story-age" class="paper-select" required>
                                <option value="3">🧒 Little Listeners (~500 words)</option>
                                <option value="6" selected>🧒 Young Explorers (~1000 words)</option>
                                <option value="9">🧒 Adventure Seekers (~2000 words)</option>
                                <option value="12">🧑 Epic Readers (~3000 words)</option>
                            </select>
                        </div>
                        <div class="submit-section paper-scrap">
                            <button type="submit" class="forge-btn">
                                <span class="btn-text">✨ Forge My Story! ✨</span>
                            </button>
                            <button type="button" id="surprise-me-btn" class="surprise-btn">
                                <span class="btn-text">🎲 Surprise Me! 🎲</span>
                            </button>
                        </div>
                    </form>
                </div>`;
                break;
                
            case 'help':
                container.innerHTML = `
                <div class="help-container">
                    <div class="help-header paper-scrap">
                        <h2 class="help-title">Help & Guides 📚</h2>
                        <p class="help-subtitle">Learn how to create amazing stories</p>
                    </div>
                    <div class="help-sections">
                        <div class="help-section paper-scrap">
                            <h3>The S-Curve Story Structure</h3>
                            <p>Every great story follows the S-curve: Setup, Rising Action, and Climax!</p>
                        </div>
                    </div>
                </div>`;
                break;
                
            default:
                container.innerHTML = `
                <div class="story-form-container">
                    <div class="form-header paper-scrap">
                        <h2 class="form-title">🚧 Mode Coming Soon!</h2>
                        <p class="form-subtitle">This storytelling mode is being crafted with love...</p>
                    </div>
                </div>`;
        }
        
        return container.innerHTML;
    };

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
        homepage.classList.add('hidden');
        loginButton.classList.add('hidden');
        logoutButton.classList.remove('hidden');
        appContent.classList.remove('hidden');
    };
    
    // Mode System Functions
    const switchToMode = (mode) => {
        currentMode = mode;
        
        // Hide mode selection and show selected mode content
        document.querySelector('.mode-selection-section').classList.add('hidden');
        dynamicContent.innerHTML = createModeContent(mode);
        dynamicContent.classList.remove('hidden');
        
        if (mode === 'help') {
            // Add download functionality for help mode
            setupHelpDownloads();
        } else {
            // Setup form handlers for story modes
            setupModeSpecificHandlers(mode);
        }
    };
    
    const backToModes = () => {
        // Show mode selection, hide dynamic content and story output
        document.querySelector('.mode-selection-section').classList.remove('hidden');
        dynamicContent.classList.add('hidden');
        storyOutput.classList.add('hidden');
        dynamicContent.innerHTML = '';
        currentMode = null;
    };
    
    const setupHelpDownloads = () => {
        const sCurveBtn = document.getElementById('download-s-curve');
        const characterBtn = document.getElementById('download-character-sheet');
        const plannerBtn = document.getElementById('download-story-planner');
        
        if (sCurveBtn) {
            sCurveBtn.addEventListener('click', () => downloadTemplate('s-curve'));
        }
        if (characterBtn) {
            characterBtn.addEventListener('click', () => downloadTemplate('character'));
        }
        if (plannerBtn) {
            plannerBtn.addEventListener('click', () => downloadTemplate('planner'));
        }
    };
    
    const downloadTemplate = (type) => {
        const templates = {
            's-curve': {
                name: 'StoryForge S-Curve Template.pdf',
                content: createSCurveTemplate()
            },
            'character': {
                name: 'Character Creation Sheet.pdf', 
                content: createCharacterTemplate()
            },
            'planner': {
                name: 'Story Planning Worksheet.pdf',
                content: createPlannerTemplate()
            }
        };
        
        const template = templates[type];
        if (template) {
            // Create downloadable content
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(template.content));
            element.setAttribute('download', template.name);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        }
    };
    
    const createSCurveTemplate = () => {
        return `STORYFORGE S-CURVE TEMPLATE

🏁 THE SETUP (Beginning)
Who is your hero?
Name: ________________________________
Age: _________________________________
Special trait: ________________________

Where does your story take place?
Setting: ______________________________
Time: ________________________________
Magical elements: ____________________

⚡ THE CHALLENGE (Rising Action) 
What problem does your hero face?
Challenge: ____________________________
Who/what causes the problem: __________
Why is this important: ________________

🎆 THE RESOLUTION (Climax)
How does your hero solve the problem?
Solution: _____________________________
What skills do they use: ______________
What do they learn: ___________________

✨ BONUS DETAILS
Funny moment: __________________________
Surprising twist: ____________________
Emotional moment: ______________________

Remember: The best stories have heroes who grow and change!
`;
    };
    
    const createCharacterTemplate = () => {
        return `CHARACTER CREATION SHEET

👤 BASIC INFO
Name: ________________________________
Age: _________________________________
Appearance: ___________________________

🌟 PERSONALITY
3 Good qualities:
1. ________________________________
2. ________________________________
3. ________________________________

3 Flaws or fears:
1. ________________________________
2. ________________________________
3. ________________________________

⚡ SPECIAL ABILITIES
Power/skill: __________________________
Weakness: _____________________________
Special item: ________________________

❤️ RELATIONSHIPS
Best friend: __________________________
Family: _______________________________
Enemy/rival: __________________________

🎯 GOALS & DREAMS
What they want most: ___________________
Secret wish: __________________________
Biggest fear: ________________________

📚 BACKSTORY
Where they come from: ___________________
Important past event: __________________
Why they're special: __________________
`;
    };
    
    const createPlannerTemplate = () => {
        return `STORY PLANNING WORKSHEET

📖 STORY BASICS
Title idea: ___________________________
Genre: ________________________________
Target age: ___________________________

🎭 MAIN CHARACTERS
Hero: _________________________________
Helper/friend: _______________________
Villain/obstacle: ___________________

🗺️ SETTING
Where: ________________________________
When: _________________________________
Mood/atmosphere: ______________________

📈 PLOT STRUCTURE
Setup (What's normal?): ________________
Inciting incident (What goes wrong?): __
Rising action (What happens next?): ____
Climax (Big moment): ___________________
Resolution (How does it end?): _________

✨ THEMES & MESSAGES
What lesson does the hero learn?
_____________________________________

What do you want readers to feel?
_____________________________________

🎨 SPECIAL ELEMENTS
Magical items: ________________________
Funny moments: ________________________
Surprising twists: __________________

Notes:
_____________________________________
_____________________________________
`;
    };
    
    const setupModeSpecificHandlers = (mode) => {
        switch(mode) {
            case 'classic':
                setupClassicMode();
                break;
            case 'wanted':
                setupWantedMode();
                break;
            case 'homework':
                setupHomeworkMode();
                break;
            case 'sleep':
                setupSleepMode();
                break;
            case 'monster':
                setupMonsterMode();
                break;
        }
    };
    
    const setupClassicMode = () => {
        const questForm = document.getElementById('quest-form');
        const surpriseMeBtn = document.getElementById('surprise-me-btn');
        const heroImageInput = document.getElementById('heroImage');
        const imageUploadArea = document.getElementById('image-upload-area');
        const imagePreview = document.getElementById('image-preview');
        
        // Set up image upload functionality
        if (heroImageInput && imageUploadArea && imagePreview) {
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
        }
        
        // Classic form submission
        if (questForm) {
            questForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleStoryGeneration({
                    mode: 'classic',
                    heroName: document.getElementById('heroName').value,
                    promptSetup: document.getElementById('promptSetup').value,
                    promptRising: document.getElementById('promptRising').value,
                    promptClimax: document.getElementById('promptClimax').value,
                    heroImage: heroImageBase64,
                    age: document.getElementById('story-age').value
                });
            });
        }
        
        // Surprise Me functionality
        if (surpriseMeBtn) {
            surpriseMeBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await handleStoryGeneration({
                    mode: 'classic',
                    age: document.getElementById('story-age').value,
                    surpriseMode: true
                });
            });
        }
    };
    
    const setupWantedMode = () => {
        const wantedForm = document.getElementById('wanted-form');
        if (wantedForm) {
            wantedForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleStoryGeneration({
                    mode: 'wanted',
                    criminalName: document.getElementById('criminalName').value,
                    wantedFor: document.getElementById('wantedFor').value,
                    specialSkills: document.getElementById('specialSkills').value,
                    reward: document.getElementById('reward').value,
                    age: document.getElementById('story-age').value
                });
            });
        }
    };
    
    const setupHomeworkMode = () => {
        const homeworkForm = document.getElementById('homework-form');
        if (homeworkForm) {
            homeworkForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleStoryGeneration({
                    mode: 'homework',
                    subject: document.getElementById('subject').value,
                    age: document.getElementById('story-age').value
                });
            });
        }
    };
    
    const setupSleepMode = () => {
        const sleepForm = document.getElementById('sleep-form');
        if (sleepForm) {
            sleepForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleStoryGeneration({
                    mode: 'sleep',
                    sleepHero: document.getElementById('sleepHero').value,
                    sleepSetting: document.getElementById('sleepSetting').value,
                    sleepTheme: document.getElementById('sleepTheme').value,
                    age: document.getElementById('story-age').value
                });
            });
        }
    };
    
    const setupMonsterMode = () => {
        const monsterForm = document.getElementById('monster-form');
        if (monsterForm) {
            monsterForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleStoryGeneration({
                    mode: 'monster',
                    monsterDescription: document.getElementById('monsterDescription').value,
                    monsterLocation: document.getElementById('monsterLocation').value,
                    monsterPersonality: document.getElementById('monsterPersonality').value,
                    age: document.getElementById('story-age').value
                });
            });
        }
    };
    
    // Unified Story Generation Handler
    const handleStoryGeneration = async (params) => {
        // Show story output and loading state
        document.querySelector('.mode-selection-section').classList.add('hidden');
        dynamicContent.classList.add('hidden');
        storyOutput.classList.remove('hidden');
        loadingSpinner.classList.remove('hidden');
        storyText.textContent = '';
        uploadToYotoButton.classList.add('hidden');
        
        // Update story title based on mode
        const storyTitleText = document.getElementById('story-title-text');
        const modeNames = {
            'classic': '📚 Your Epic Tale! 📚',
            'wanted': '🤠 Your Wanted Poster Story! 🤠',
            'homework': '📖 Your Study Summary! 📖',
            'sleep': '🌙 Your Sleep Story! 🌙',
            'monster': '👹 Your Monster Tale! 👹'
        };
        storyTitleText.textContent = modeNames[params.mode] || '📚 Your Story! 📚';
        
        // Update loading text based on mode
        const loadingText = document.querySelector('.loading-text span:nth-child(2)');
        const loadingMessages = {
            'classic': params.surpriseMode ? 'Creating a surprise adventure just for you...' : 'Brewing your magical story...',
            'wanted': 'Creating your wanted poster adventure...',
            'homework': 'Transforming your notes into audio magic...',
            'sleep': 'Crafting peaceful dreams...',
            'monster': 'Bringing your monster to life...'
        };
        loadingText.textContent = loadingMessages[params.mode] || 'Brewing your magical story...';
        
        try {
            // Prepare API payload based on mode
            let apiPayload = {
                age: params.age,
                mode: params.mode
            };
            
            switch (params.mode) {
                case 'classic':
                    apiPayload = {
                        ...apiPayload,
                        heroName: params.heroName,
                        promptSetup: params.promptSetup,
                        promptRising: params.promptRising,
                        promptClimax: params.promptClimax,
                        heroImage: params.heroImage,
                        surpriseMode: params.surpriseMode
                    };
                    break;
                case 'wanted':
                    apiPayload = {
                        ...apiPayload,
                        heroName: params.criminalName,
                        promptSetup: `A wanted poster for ${params.criminalName}`,
                        promptRising: `Wanted for ${params.wantedFor}`,
                        promptClimax: `With special skills: ${params.specialSkills} and reward: ${params.reward}`
                    };
                    break;
                case 'homework':
                    apiPayload = {
                        ...apiPayload,
                        heroName: 'Student',
                        promptSetup: `Learning about ${params.subject}`,
                        promptRising: 'Understanding complex concepts',
                        promptClimax: 'Mastering the subject through fun and memorable explanations'
                    };
                    break;
                case 'sleep':
                    apiPayload = {
                        ...apiPayload,
                        heroName: params.sleepHero || 'Peaceful Friend',
                        promptSetup: `In ${params.sleepSetting}`,
                        promptRising: 'Finding tranquility and peace',
                        promptClimax: `Through ${params.sleepTheme} bringing gentle rest`,
                        sleepMode: true
                    };
                    break;
                case 'monster':
                    apiPayload = {
                        ...apiPayload,
                        heroName: 'Friendly Monster',
                        promptSetup: `${params.monsterDescription} appears ${params.monsterLocation}`,
                        promptRising: 'A surprising encounter with a misunderstood creature',
                        promptClimax: `Discovering the monster is ${params.monsterPersonality} and becomes a friend`
                    };
                    break;
            }
            
            const response = await fetch('/api/generate-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(apiPayload),
            });
            
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.message || `HTTP Error! Status: ${response.status}`);
            }
            
            const result = await response.json();
            
            loadingSpinner.classList.add('hidden');
            loadingText.textContent = 'Brewing your magical story...';
            
            // Display story with proper formatting
            displayFormattedStory(result.story, params.mode);
            
            // Handle generated image if present
            if (result.generatedImage) {
                console.log('🎨 Received generated image for story');
                heroImageBase64 = result.generatedImage;
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
            
            // Setup sharing functionality
            setupSharingButtons(result.story, audioBlobUrl);
            
            // Setup Yoto upload functionality
            setupYotoUpload(result, params);
            
        } catch (error) {
            console.error('Story generation error:', error);
            loadingSpinner.classList.add('hidden');
            loadingText.textContent = 'Brewing your magical story...';
            storyText.textContent = `Oh no! The storyforge encountered an issue. Error: ${error.message}`;
            showAlert(error.message);
        }
    };
    
    const displayFormattedStory = (story, mode) => {
        const storyBook = document.getElementById('story-book');
        const bookTitle = document.getElementById('book-title');
        const storyTextEl = document.getElementById('story-text');
        
        // Set book title based on mode
        const bookTitles = {
            'classic': 'Your Adventure',
            'wanted': 'Wanted!',
            'homework': 'Study Guide',
            'sleep': 'Dream Story', 
            'monster': 'Monster Tale'
        };
        bookTitle.textContent = bookTitles[mode] || 'Your Story';
        
        // Format story text with paragraphs
        const paragraphs = story.split(/\n\n|\. (?=[A-Z])/).filter(p => p.trim().length > 0);
        const formattedStory = paragraphs.map(p => `<p class="story-paragraph">${p.trim()}</p>`).join('');
        storyTextEl.innerHTML = formattedStory;
        
        // Show the story book
        document.getElementById('story-content-wrapper').classList.remove('hidden');
    };
    
    const setupSharingButtons = (storyText, audioUrl) => {
        const copyBtn = document.getElementById('copy-story-btn');
        const downloadBtn = document.getElementById('download-audio-btn');
        const emailBtn = document.getElementById('share-email-btn');
        
        if (copyBtn) {
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(storyText).then(() => {
                    showAlert('Story copied to clipboard!');
                });
            };
        }
        
        if (downloadBtn) {
            downloadBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = audioUrl;
                a.download = 'my-storyforge-story.mp3';
                a.click();
            };
        }
        
        if (emailBtn) {
            emailBtn.onclick = () => {
                const subject = encodeURIComponent('Check out my StoryForge creation!');
                const body = encodeURIComponent(`I created this amazing story with StoryForge:\n\n${storyText}`);
                window.open(`mailto:?subject=${subject}&body=${body}`);
            };
        }
        
        document.getElementById('share-section').classList.remove('hidden');
    };
    
    const setupYotoUpload = (result, params) => {
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
                    heroName: params.heroName || params.criminalName || params.sleepHero || 'Story Hero',
                    storyText: result.story,
                    duration: result.duration,
                    fileSize: result.fileSize,
                    promptSetup: params.promptSetup || '',
                    promptRising: params.promptRising || '',
                    promptClimax: params.promptClimax || '',
                    age: params.age,
                    heroImage: heroImageBase64,
                    mode: params.mode
                }, accessToken);
                showAlert('Story successfully uploaded as individual Yoto card!');
                console.log('StoryForge Card Created:', myoContent);
            } catch (e) {
                console.error("Failed to create StoryForge card:", e);
                showAlert("Error creating Yoto card. Please check the console.");
            } finally {
                uploadToYotoButton.disabled = false;
                uploadToYotoButton.textContent = 'Upload to Yoto';
            }
        };
        uploadToYotoButton.classList.remove('hidden');
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
            
            // Step 3: Upload audio file to Yoto media endpoint
            console.log('🎵 Uploading audio to Yoto media endpoint...');
            let audioUrl = null;
            
            try {
                // Generate audio content for upload
                const audioResponse = await fetch('/api/generate-story', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        heroName: storyData.heroName,
                        promptSetup: storyData.promptSetup,
                        promptRising: storyData.promptRising,
                        promptClimax: storyData.promptClimax,
                        heroImage: storyData.heroImage,
                        age: storyData.age,
                        audioOnly: true
                    })
                });
                
                if (!audioResponse.ok) {
                    throw new Error(`Failed to generate audio: ${audioResponse.status}`);
                }
                
                const audioData = await audioResponse.json();
                const audioBuffer = Uint8Array.from(atob(audioData.audio), c => c.charCodeAt(0));
                const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
                
                // Upload to Yoto media endpoint
                const mediaUploadUrl = 'https://api.yotoplay.com/media/audio/user/me/upload';
                const mediaResponse = await fetch(mediaUploadUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'audio/mpeg'
                    },
                    body: audioBlob
                });
                
                if (mediaResponse.ok) {
                    const mediaResult = await mediaResponse.json();
                    audioUrl = mediaResult.mediaUrl || mediaResult.url;
                    console.log('✅ Audio uploaded successfully:', audioUrl);
                } else {
                    const mediaError = await mediaResponse.text();
                    console.warn('⚠️ Audio upload failed, falling back to streaming:', {
                        status: mediaResponse.status,
                        error: mediaError
                    });
                    
                    // Fallback to streaming URL
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
                    audioUrl = streamingUrl.toString();
                }
                
            } catch (audioError) {
                console.error('❌ Audio upload error:', audioError);
                // Fallback to streaming URL
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
                audioUrl = streamingUrl.toString();
            }
            
            console.log('🎵 Audio URL ready:', audioUrl);
            
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
                        trackUrl: audioUrl,
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
                        trackUrl: audioUrl,
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

    // Initial check on page load
    checkAuthentication();
});