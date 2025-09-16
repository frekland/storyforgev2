Here's a fun, child-friendly UI concept for StoryForge, along with the HTML, CSS, and client-side JavaScript to integrate with the previously provided backend logic.

\#\#\# StoryForge UI Concept: "The Enchanted Storybook"

Imagine an interface that feels like opening a magical storybook. The design focuses on large, clear elements, friendly shapes, and a warm, inviting color palette.

\*\*Color Palette:\*\*  
\*   \*\*Primary Background:\*\* Soft parchment/cream (\#FDF3E6) or a light, whimsical gradient (e.g., pale sky blue to soft green).  
\*   \*\*Accents:\*\* Enchanted forest green (\#4CAF50), magical purple (\#9C27B0), sunny yellow (\#FFEB3B), sky blue (\#2196F3).  
\*   \*\*Text:\*\* Dark brown/grey for readability (\#333333).

\*\*Typography:\*\*  
\*   \*\*Headings:\*\* A playful, rounded, sans-serif font (e.g., "Bubblegum Sans" or "Coming Soon" from Google Fonts).  
\*   \*\*Body Text:\*\* A clean, easy-to-read sans-serif (e.g., "Open Sans" or "Nunito").

\*\*Key Elements & Their Visuals:\*\*

1\.  \*\*Header & Logo:\*\*  
    \*   \*\*Visual:\*\* At the top, a "StoryForge" title in a whimsical font. Beside it, an icon of an open, glowing storybook with a magic quill hovering over it. The background of the header could be a starry night sky gradient.  
    \*   \*\*Placement:\*\* Centered at the top.

2\.  \*\*Yoto Login Button (if not already logged in):\*\*  
    \*   \*\*Visual:\*\* A prominent, rounded button with the Yoto logo and "Login with Yoto" text. It glows gently, inviting interaction.  
    \*   \*\*Placement:\*\* In the header or a dedicated small section when the user is not authenticated.

3\.  \*\*Story Input Form:\*\*  
    \*   \*\*Visual:\*\* This section is presented as an open page of the magical storybook. Each input field is a large, rounded text area with a clear, friendly label.  
        \*   \*\*Hero Name:\*\* A small knight's helmet icon next to the label.  
        \*   \*\*Story Setup:\*\* A whimsical castle icon.  
        \*   \*\*Rising Action:\*\* A winding path or a small dragon icon.  
        \*   \*\*Climax:\*\* A sparkling star or a treasure chest icon.  
        \*   \*\*Age:\*\* A small wizard's hat or a happy child icon.  
    \*   \*\*"Forge Story\!" Button:\*\* A large, brightly colored, pill-shaped button at the bottom of the form. When hovered, it might sparkle or emit a soft glow.  
    \*   \*\*Placement:\*\* Main content area.

4\.  \*\*Loading State:\*\*  
    \*   \*\*Visual:\*\* While the story is generating, a friendly animation: a little wizard character busily writing in a large, magical book, with glowing particles floating around. A message like "Magic in the making... Forging your tale\!"  
    \*   \*\*Placement:\*\* Overlays the input form once "Forge Story\!" is clicked.

5\.  \*\*Story Output Section:\*\*  
    \*   \*\*Visual:\*\* Once generated, this section reveals the full story text in an elegant, readable font, as if printed in the storybook. Below the text:  
        \*   \*\*Custom Audio Player:\*\* A simple, large, child-friendly audio player. The play/pause button is a big, rounded circle, perhaps shaped like a star. A chunky progress bar shows the story's progression.  
        \*   \*\*"Add to Yoto Card" Button:\*\* A prominent button, maybe shaped like a stylized Yoto card or a magic wand, with a gentle animation on hover.  
    \*   \*\*Placement:\*\* Replaces or appears below the input form after generation.

6\.  \*\*Footer:\*\*  
    \*   \*\*Visual:\*\* Simple, with "Made with magic for StoryForge" and perhaps tiny icons of storybook elements (stars, moons, trees).  
    \*   \*\*Placement:\*\* Bottom of the page.

\---

\#\#\# Code Implementation

Here's the HTML, CSS, and client-side JavaScript for the UI.

\*\*1. \`index.html\` (The Main Page)\*\*

\`\`\`html  
\<\!DOCTYPE html\>  
\<html lang="en"\>  
\<head\>  
    \<meta charset="UTF-8"\>  
    \<meta name="viewport" content="width=device-width, initial-scale=1.0"\>  
    \<title\>StoryForge: Craft Your Own Adventures\!\</title\>  
    \<link rel="stylesheet" href="style.css"\>  
    \<link href="https://fonts.googleapis.com/css2?family=Bubblegum+Sans\&family=Nunito:wght@400;700\&display=swap" rel="stylesheet"\>  
    \<\!-- Using Font Awesome for icons \--\>  
    \<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"\>  
\</head\>  
\<body\>  
    \<div class="container"\>  
        \<header class="header"\>  
            \<div class="logo"\>  
                \<i class="fas fa-book-open icon-glow"\>\</i\>  
                \<h1\>StoryForge\</h1\>  
                \<i class="fas fa-feather-alt icon-glow"\>\</i\>  
            \</div\>  
            \<button id="yotoLoginBtn" class="yoto-login-btn"\>  
                \<i class="fas fa-user-circle"\>\</i\> Login with Yoto  
            \</button\>  
        \</header\>

        \<main class="main-content"\>  
            \<section id="storyInputSection" class="story-input-section"\>  
                \<h2\>Ready for an Adventure?\</h2\>  
                \<form id="storyForm" class="story-form"\>  
                    \<div class="form-group"\>  
                        \<label for="heroName"\>\<i class="fas fa-shield-alt"\>\</i\> Your Hero's Name:\</label\>  
                        \<input type="text" id="heroName" placeholder="Captain Sparkle..." required\>  
                    \</div\>  
                    \<div class="form-group"\>  
                        \<label for="promptSetup"\>\<i class="fas fa-castle"\>\</i\> Story Begins (Setup):\</label\>  
                        \<textarea id="promptSetup" rows="3" placeholder="In a land of gummy bears and rainbows..."\>\</textarea\>  
                    \</div\>  
                    \<div class="form-group"\>  
                        \<label for="promptRising"\>\<i class="fas fa-dragon"\>\</i\> A Challenge Appears (Rising Action):\</label\>  
                        \<textarea id="promptRising" rows="3" placeholder="A mischievous cloud stole all the giggles..."\>\</textarea\>  
                    \</div\>  
                    \<div class="form-group"\>  
                        \<label for="promptClimax"\>\<i class="fas fa-star"\>\</i\> The Grand Finale (Climax):\</label\>  
                        \<textarea id="promptClimax" rows="3" placeholder="Our hero soared on a bubblegum breeze..."\>\</textarea\>  
                    \</div\>  
                    \<div class="form-group"\>  
                        \<label for="age"\>\<i class="fas fa-child"\>\</i\> Hero's Age (for story tone):\</label\>  
                        \<input type="number" id="age" min="1" max="99" value="6"\>  
                    \</div\>  
                    \<button type="submit" class="forge-story-btn"\>\<i class="fas fa-magic"\>\</i\> Forge Story\!\</button\>  
                \</form\>  
            \</section\>

            \<section id="loadingSection" class="loading-section hidden"\>  
                \<div class="spinner"\>  
                    \<i class="fas fa-hat-wizard fa-spin"\>\</i\>  
                \</div\>  
                \<p\>Magic in the making... Forging your tale\!\</p\>  
            \</section\>

            \<section id="storyOutputSection" class="story-output-section hidden"\>  
                \<h2\>Your Enchanting Story\!\</h2\>  
                \<div id="generatedStoryText" class="story-text"\>\</div\>  
                  
                \<div class="audio-player"\>  
                    \<audio id="storyAudioPlayer" controls\>\</audio\>  
                \</div\>  
                  
                \<button id="addStoryToYotoBtn" class="add-to-yoto-btn"\>\<i class="fas fa-plus-circle"\>\</i\> Add to Yoto Card\!\</button\>  
                \<div id="yotoStatus" class="yoto-status"\>\</div\>  
                \<button id="createAnotherStoryBtn" class="forge-story-btn"\>\<i class="fas fa-book-medical"\>\</i\> Create Another Story\</button\>  
            \</section\>  
        \</main\>

        \<footer class="footer"\>  
            \<p\>\&copy; 2025 StoryForge. Made with magic for little adventurers\!\</p\>  
        \</footer\>  
    \</div\>

    \<script src="app.js"\>\</script\>  
\</body\>  
\</html\>  
\`\`\`

\*\*2. \`style.css\` (The Enchanted Storybook Theme)\*\*

\`\`\`css  
/\* Basic Reset & Base Styles \*/  
\* {  
    margin: 0;  
    padding: 0;  
    box-sizing: border-box;  
}

body {  
    font-family: 'Nunito', sans-serif;  
    background: linear-gradient(135deg, \#FDF3E6 0%, \#D8EBF3 100%); /\* Soft, whimsical gradient \*/  
    color: \#333333;  
    min-height: 100vh;  
    display: flex;  
    justify-content: center;  
    align-items: flex-start; /\* Align content to the top \*/  
    padding: 20px;  
}

.container {  
    background-color: \#ffffff; /\* White "page" for the storybook \*/  
    border-radius: 20px;  
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);  
    max-width: 900px;  
    width: 100%;  
    overflow: hidden;  
    display: flex;  
    flex-direction: column;  
    min-height: calc(100vh \- 40px); /\* Adjust to viewport height \*/  
}

/\* Header \*/  
.header {  
    background: linear-gradient(to right, \#9C27B0, \#4CAF50); /\* Magical gradient \*/  
    color: \#ffffff;  
    padding: 20px 30px;  
    text-align: center;  
    border-bottom: 5px solid \#FFEB3B; /\* Sunny yellow accent \*/  
    display: flex;  
    justify-content: space-between;  
    align-items: center;  
    position: relative;  
    z-index: 10;  
    border-radius: 20px 20px 0 0;  
}

.header .logo {  
    display: flex;  
    align-items: center;  
    gap: 10px;  
}

.header h1 {  
    font-family: 'Bubblegum Sans', cursive;  
    font-size: 2.8em;  
    margin: 0;  
    text-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);  
}

.header .fas {  
    font-size: 2em;  
}

.icon-glow {  
    text-shadow: 0 0 8px rgba(255, 255, 255, 0.8);  
}

.yoto-login-btn {  
    background-color: \#2196F3; /\* Sky blue \*/  
    color: \#ffffff;  
    border: none;  
    border-radius: 50px;  
    padding: 12px 25px;  
    font-size: 1em;  
    font-weight: bold;  
    cursor: pointer;  
    transition: background-color 0.3s ease, transform 0.2s ease, box-shadow 0.3s ease;  
    display: flex;  
    align-items: center;  
    gap: 8px;  
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);  
}

.yoto-login-btn:hover {  
    background-color: \#1976D2; /\* Darker blue \*/  
    transform: translateY(-2px);  
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.3);  
}

/\* Main Content \*/  
.main-content {  
    padding: 30px;  
    flex-grow: 1;  
    display: flex;  
    flex-direction: column;  
    align-items: center;  
    text-align: center;  
}

.main-content h2 {  
    font-family: 'Bubblegum Sans', cursive;  
    font-size: 2.2em;  
    color: \#4CAF50; /\* Enchanted forest green \*/  
    margin-bottom: 25px;  
    text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.1);  
}

/\* Story Input Section \*/  
.story-input-section {  
    width: 100%;  
    max-width: 600px;  
}

.story-form {  
    background-color: \#FDF3E6; /\* Light parchment for form background \*/  
    border-radius: 15px;  
    padding: 30px;  
    box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.05); /\* Soft inner shadow \*/  
    text-align: left;  
}

.form-group {  
    margin-bottom: 20px;  
}

.form-group label {  
    display: block;  
    font-weight: bold;  
    margin-bottom: 8px;  
    color: \#6a4f41; /\* Darker brown for labels \*/  
    font-size: 1.1em;  
    display: flex;  
    align-items: center;  
    gap: 8px;  
}

.form-group label .fas {  
    color: \#9C27B0; /\* Magical purple for icons \*/  
    font-size: 1.2em;  
}

.form-group input\[type="text"\],  
.form-group input\[type="number"\],  
.form-group textarea {  
    width: 100%;  
    padding: 12px 15px;  
    border: 2px solid \#D8EBF3; /\* Soft blue border \*/  
    border-radius: 10px;  
    font-family: 'Nunito', sans-serif;  
    font-size: 1em;  
    color: \#555555;  
    transition: border-color 0.3s ease, box-shadow 0.3s ease;  
}

.form-group input:focus,  
.form-group textarea:focus {  
    border-color: \#2196F3; /\* Sky blue on focus \*/  
    box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.3);  
    outline: none;  
}

.form-group textarea {  
    resize: vertical;  
}

.forge-story-btn {  
    background: linear-gradient(to right, \#FFEB3B, \#FFC107); /\* Sunny yellow gradient \*/  
    color: \#6a4f41; /\* Dark brown text \*/  
    border: none;  
    border-radius: 50px;  
    padding: 15px 35px;  
    font-size: 1.3em;  
    font-weight: bold;  
    cursor: pointer;  
    transition: transform 0.2s ease, box-shadow 0.3s ease;  
    display: inline-flex;  
    align-items: center;  
    gap: 10px;  
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);  
}

.forge-story-btn:hover {  
    transform: translateY(-3px);  
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);  
}

.forge-story-btn .fas {  
    font-size: 1.2em;  
    color: \#9C27B0; /\* Magical purple icon \*/  
}

/\* Loading Section \*/  
.loading-section {  
    text-align: center;  
    padding: 50px 20px;  
}

.loading-section .spinner {  
    font-size: 5em;  
    color: \#9C27B0; /\* Magical purple \*/  
    margin-bottom: 20px;  
}

.loading-section .spinner .fa-spin {  
    animation: fa-spin 2s linear infinite; /\* Font Awesome spin animation \*/  
}

.loading-section p {  
    font-size: 1.5em;  
    font-family: 'Bubblegum Sans', cursive;  
    color: \#4CAF50;  
}

/\* Story Output Section \*/  
.story-output-section {  
    width: 100%;  
    max-width: 700px;  
    background-color: \#FDF3E6;  
    border-radius: 15px;  
    padding: 30px;  
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);  
}

.story-text {  
    background-color: \#ffffff;  
    border: 1px dashed \#D8EBF3; /\* Dashed border for story page look \*/  
    border-radius: 10px;  
    padding: 20px;  
    margin-bottom: 25px;  
    font-size: 1.1em;  
    line-height: 1.6;  
    text-align: left;  
    max-height: 400px;  
    overflow-y: auto;  
}

.audio-player {  
    margin-bottom: 25px;  
}

.audio-player audio {  
    width: 100%;  
    border-radius: 50px; /\* Rounded audio player \*/  
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);  
    background-color: \#E0F2F7; /\* Light blue background \*/  
    padding: 8px 15px;  
}

.add-to-yoto-btn {  
    background-color: \#4CAF50; /\* Enchanted forest green \*/  
    color: \#ffffff;  
    border: none;  
    border-radius: 50px;  
    padding: 15px 30px;  
    font-size: 1.2em;  
    font-weight: bold;  
    cursor: pointer;  
    transition: background-color 0.3s ease, transform 0.2s ease, box-shadow 0.3s ease;  
    display: inline-flex;  
    align-items: center;  
    gap: 10px;  
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);  
    margin-bottom: 15px;  
}

.add-to-yoto-btn:hover {  
    background-color: \#388E3C; /\* Darker green \*/  
    transform: translateY(-2px);  
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.3);  
}

.yoto-status {  
    margin-top: 10px;  
    font-size: 1em;  
    color: \#555;  
    min-height: 20px; /\* To prevent layout shift \*/  
}

/\* Utility Class \*/  
.hidden {  
    display: none \!important;  
}

/\* Footer \*/  
.footer {  
    background-color: \#6a4f41; /\* Dark brown \*/  
    color: \#FDF3E6;  
    padding: 15px 30px;  
    text-align: center;  
    font-size: 0.9em;  
    border-radius: 0 0 20px 20px;  
}

/\* Responsive Design \*/  
@media (max-width: 768px) {  
    .header {  
        flex-direction: column;  
        gap: 15px;  
    }  
    .header h1 {  
        font-size: 2em;  
    }  
    .yoto-login-btn {  
        width: 100%;  
        justify-content: center;  
    }  
    .main-content {  
        padding: 20px;  
    }  
    .story-form {  
        padding: 20px;  
    }  
    .forge-story-btn, .add-to-yoto-btn {  
        width: 100%;  
        font-size: 1.1em;  
        padding: 12px 20px;  
    }  
    .story-output-section {  
        padding: 20px;  
    }  
    .loading-section .spinner {  
        font-size: 4em;  
    }  
    .loading-section p {  
        font-size: 1.2em;  
    }  
}  
\`\`\`

\*\*3. \`app.js\` (Client-Side Logic and Integration)\*\*

This script will handle UI interactions, communicate with your \`/api/generate-story\` serverless function, and integrate with the \`createOrUpdateStoryForgePlaylist\` function you previously implemented.

\`\`\`javascript  
// Ensure createOrUpdateStoryForgePlaylist function is available globally or imported  
// For simplicity in this example, assume it's in the same scope or globally accessible.  
// If you have it in a module, you would import it:  
// import { createOrUpdateStoryForgePlaylist } from './api-client.js';

// Placeholder for the actual createOrUpdateStoryForgePlaylist function (from previous response)  
// In a real app, this would be properly defined or imported.  
/\*  
async function createOrUpdateStoryForgePlaylist(storyData, accessToken) {  
    // ... (Your previously provided implementation) ...  
}  
\*/

// \--- UI Elements \---  
const yotoLoginBtn \= document.getElementById('yotoLoginBtn');  
const storyForm \= document.getElementById('storyForm');  
const storyInputSection \= document.getElementById('storyInputSection');  
const loadingSection \= document.getElementById('loadingSection');  
const storyOutputSection \= document.getElementById('storyOutputSection');  
const generatedStoryText \= document.getElementById('generatedStoryText');  
const storyAudioPlayer \= document.getElementById('storyAudioPlayer');  
const addStoryToYotoBtn \= document.getElementById('addStoryToYotoBtn');  
const yotoStatus \= document.getElementById('yotoStatus');  
const createAnotherStoryBtn \= document.getElementById('createAnotherStoryBtn');

// \--- Global State Variables \---  
let currentStoryData \= null; // To hold the generated story data (text, audio URL, duration, fileSize)  
let accessToken \= null; // This would be managed by your OAuth flow

// \--- Constants for Yoto OAuth \---  
// IMPORTANT: Replace with your actual Yoto Developer Dashboard details  
const YOTO\_CLIENT\_ID \= 'YOUR\_YOTO\_CLIENT\_ID';  
const YOTO\_REDIRECT\_URI \= window.location.origin \+ '/yoto-callback.html'; // Or your designated callback page  
const YOTO\_AUTH\_DOMAIN \= 'https://login.yotoplay.com'; // Rule 1: Authentication Domain \[1\]

// \--- Helper Functions \---

// Function to generate a random string for PKCE code\_verifier  
function generateRandomString(length) {  
    const possible \= 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';  
    let text \= '';  
    for (let i \= 0; i \< length; i++) {  
        text \+= possible.charAt(Math.floor(Math.random() \* possible.length));  
    }  
    return text;  
}

// Function to generate SHA256 hash (for PKCE code\_challenge)  
async function sha256(plain) {  
    const encoder \= new TextEncoder();  
    const data \= encoder.encode(plain);  
    const hashBuffer \= await crypto.subtle.digest('SHA-256', data);  
    const hashArray \= Array.from(new Uint8Array(hashBuffer));  
    return hashArray.map(b \=\> b.toString(16).padStart(2, '0')).join('');  
}

// Function to base64url encode (for PKCE code\_challenge)  
function base64urlencode(str) {  
    return btoa(str)  
        .replace(/\\+/g, '-')  
        .replace(/\\//g, '\_')  
        .replace(/=+$/, '');  
}

// Function to generate PKCE challenge  
async function generatePkceChallenge() {  
    const code\_verifier \= generateRandomString(128);  
    sessionStorage.setItem('yoto\_code\_verifier', code\_verifier); // Store securely \[1\]

    const hashed \= await sha256(code\_verifier);  
    const code\_challenge \= base64urlencode(String.fromCharCode(...new Uint8Array(hashed.match(/.{1,2}/g).map(byte \=\> parseInt(byte, 16))))  
    );  
    return code\_challenge;  
}

function showLoadingState() {  
    storyInputSection.classList.add('hidden');  
    storyOutputSection.classList.add('hidden');  
    loadingSection.classList.remove('hidden');  
}

function hideLoadingState() {  
    loadingSection.classList.add('hidden');  
}

function showStoryInputForm() {  
    storyInputSection.classList.remove('hidden');  
    storyOutputSection.classList.add('hidden');  
    loadingSection.classList.add('hidden');  
    // Clear form after creating another story  
    storyForm.reset();  
    yotoStatus.textContent \= ''; // Clear Yoto status  
    storyAudioPlayer.removeAttribute('src'); // Clear audio player  
    currentStoryData \= null; // Clear current story data  
}

function showStoryOutput(storyText, audioUrl) {  
    hideLoadingState();  
    storyInputSection.classList.add('hidden');  
    storyOutputSection.classList.remove('hidden');

    generatedStoryText.innerHTML \= \`\<p\>${storyText.replace(/\\n/g, '\<br\>')}\</p\>\`;  
    storyAudioPlayer.src \= audioUrl;  
    storyAudioPlayer.load(); // Load the new audio source  
}

// \--- Event Listeners \---

yotoLoginBtn.addEventListener('click', async () \=\> {  
    // Rule 2: OAuth 2.0 Authorization Code Flow with PKCE \[1\]  
    const code\_challenge \= await generatePkceChallenge();  
    const scopes \= 'offline\_access write:myo'; // Essential scopes \[1\]  
    const authUrl \= \`${YOTO\_AUTH\_DOMAIN}/authorize?\` \+  
        \`response\_type=code&\` \+  
        \`client\_id=${YOTO\_CLIENT\_ID}&\` \+  
        \`redirect\_uri=${encodeURIComponent(YOTO\_REDIRECT\_URI)}&\` \+  
        \`scope=${encodeURIComponent(scopes)}&\` \+  
        \`code\_challenge=${code\_challenge}&\` \+  
        \`code\_challenge\_method=S256\`;

    window.location.href \= authUrl; // Redirect user for authorization  
});

storyForm.addEventListener('submit', async (event) \=\> {  
    event.preventDefault(); // Prevent default form submission

    showLoadingState();

    const heroName \= document.getElementById('heroName').value;  
    const promptSetup \= document.getElementById('promptSetup').value;  
    const promptRising \= document.getElementById('promptRising').value;  
    const promptClimax \= document.getElementById('promptClimax').value;  
    const age \= document.getElementById('age').value;

    try {  
        // Call your serverless function to generate story and audio  
        const response \= await fetch('/api/generate-story', {  
            method: 'POST',  
            headers: {  
                'Content-Type': 'application/json',  
            },  
            body: JSON.stringify({ heroName, promptSetup, promptRising, promptClimax, age }),  
        });

        if (\!response.ok) {  
            const errorData \= await response.json();  
            throw new Error(errorData.message || 'Failed to generate story.');  
        }

        const data \= await response.json();  
        const audioBlob \= b64toBlob(data.audio, 'audio/mpeg'); // Convert Base64 to Blob  
        const audioObjectUrl \= URL.createObjectURL(audioBlob); // Create object URL for local playback

        // Prepare storyData for Yoto API and local playback  
        currentStoryData \= {  
            heroName: heroName,  
            storyText: data.story,  
            duration: data.duration, // From serverless function  
            fileSize: data.fileSize, // From serverless function  
            // The URL Yoto will call for streaming: your serverless function with params  
            audioStreamUrl: \`${window.location.origin}/api/generate-story?\` \+  
                            \`heroName=${encodeURIComponent(heroName)}&\` \+  
                            \`promptSetup=${encodeURIComponent(promptSetup)}&\` \+  
                            \`promptRising=${encodeURIComponent(promptRising || '')}&\` \+  
                            \`promptClimax=${encodeURIComponent(promptClimax || '')}&\` \+  
                            \`age=${encodeURIComponent(age)}&\` \+  
                            \`audioOnly=true\` // Indicator for streaming mode \[1\]  
        };  
          
        showStoryOutput(currentStoryData.storyText, audioObjectUrl);

    } catch (error) {  
        console.error('Story generation error:', error);  
        alert(\`Error generating story: ${error.message}\`);  
        hideLoadingState();  
        storyInputSection.classList.remove('hidden'); // Show form again on error  
    }  
});

addStoryToYotoBtn.addEventListener('click', async () \=\> {  
    if (\!accessToken) {  
        yotoStatus.textContent \= 'Please log in with Yoto first\!';  
        return;  
    }  
    if (\!currentStoryData) {  
        yotoStatus.textContent \= 'No story generated yet\!';  
        return;  
    }

    yotoStatus.textContent \= 'Adding story to Yoto...';  
    addStoryToYotoBtn.disabled \= true; // Prevent multiple clicks

    try {  
        // Use the previously defined createOrUpdateStoryForgePlaylist function \[1\]  
        const result \= await createOrUpdateStoryForgePlaylist(currentStoryData, accessToken);  
        console.log('Yoto playlist update/create successful:', result);  
        yotoStatus.textContent \= \`Story "${currentStoryData.heroName}" added to Yoto\!\`;  
    } catch (error) {  
        console.error('Error adding story to Yoto:', error);  
        yotoStatus.textContent \= \`Failed to add story to Yoto: ${error.message}\`;  
    } finally {  
        addStoryToYotoBtn.disabled \= false;  
    }  
});

createAnotherStoryBtn.addEventListener('click', () \=\> {  
    showStoryInputForm();  
});

// \--- Initialization / Check for existing token \---  
document.addEventListener('DOMContentLoaded', () \=\> {  
    // Check for access token in localStorage (or your preferred secure storage)  
    // In a real application, this would involve refreshing tokens, etc.  
    const storedAccessToken \= localStorage.getItem('yoto\_access\_token');  
    if (storedAccessToken) {  
        accessToken \= storedAccessToken;  
        yotoLoginBtn.textContent \= 'Logged in to Yoto';  
        yotoLoginBtn.disabled \= true;  
        yotoLoginBtn.classList.add('logged-in'); // Optional: change style for logged-in state  
    }

    // Handle OAuth callback (if this page is also the redirect\_uri)  
    // This is a simplified check. A dedicated yoto-callback.html would be better.  
    const urlParams \= new URLSearchParams(window.location.search);  
    const code \= urlParams.get('code');  
    const state \= urlParams.get('state'); // If you implement state for CSRF protection

    if (code) {  
        // Exchange authorization code for tokens  
        exchangeCodeForTokens(code);  
    }  
});

async function exchangeCodeForTokens(authCode) {  
    const code\_verifier \= sessionStorage.getItem('yoto\_code\_verifier');  
    if (\!code\_verifier) {  
        console.error('PKCE code\_verifier not found in session storage.');  
        alert('Authentication error: Missing security key. Please try logging in again.');  
        return;  
    }

    try {  
        const tokenResponse \= await fetch(\`${YOTO\_AUTH\_DOMAIN}/oauth/token\`, {  
            method: 'POST',  
            headers: {  
                'Content-Type': 'application/x-www-form-urlencoded',  
            },  
            body: new URLSearchParams({  
                grant\_type: 'authorization\_code', // Rule 2: authorization\_code grant type \[1\]  
                client\_id: YOTO\_CLIENT\_ID,  
                redirect\_uri: YOTO\_REDIRECT\_URI,  
                code: authCode,  
                code\_verifier: code\_verifier,  
            }),  
        });

        if (\!tokenResponse.ok) {  
            const errorData \= await tokenResponse.json();  
            throw new Error(errorData.error\_description || errorData.error || 'Failed to exchange code for tokens.');  
        }

        const tokens \= await tokenResponse.json();  
        accessToken \= tokens.access\_token;  
        // Store tokens securely (e.g., localStorage for access\_token, http-only cookie for refresh\_token in a server-side flow) \[1\]  
        localStorage.setItem('yoto\_access\_token', accessToken);  
        // Also store refresh\_token if offline\_access scope was granted  
        if (tokens.refresh\_token) {  
             localStorage.setItem('yoto\_refresh\_token', tokens.refresh\_token);  
        }

        yotoLoginBtn.textContent \= 'Logged in to Yoto';  
        yotoLoginBtn.disabled \= true;  
        yotoLoginBtn.classList.add('logged-in');

        // Clear code from URL (optional, but good practice)  
        window.history.replaceState({}, document.title, window.location.pathname);

        alert('Successfully logged in to Yoto\!');

    } catch (error) {  
        console.error('Token exchange error:', error);  
        alert(\`Yoto login failed: ${error.message}\`);  
    } finally {  
        sessionStorage.removeItem('yoto\_code\_verifier'); // Clean up verifier \[1\]  
    }  
}

// Utility function to convert Base64 to Blob (for local audio playback)  
function b64toBlob(b64Data, contentType \= '', sliceSize \= 512\) {  
    const byteCharacters \= atob(b64Data);  
    const byteArrays \= \[\];

    for (let offset \= 0; offset \< byteCharacters.length; offset \+= sliceSize) {  
        const slice \= byteCharacters.slice(offset, offset \+ sliceSize);  
        const byteNumbers \= new Array(slice.length);  
        for (let i \= 0; i \< slice.length; i++) {  
            byteNumbers\[i\] \= slice.charCodeAt(i);  
        }  
        const byteArray \= new Uint8Array(byteNumbers);  
        byteArrays.push(byteArray);  
    }

    const blob \= new Blob(byteArrays, { type: contentType });  
    return blob;  
}

\`\`\`

\#\#\# How to Use This Code:

1\.  \*\*File Structure:\*\*  
    \`\`\`  
    your-project-root/  
    ├── public/  
    │   ├── index.html  
    │   ├── style.css  
    │   └── app.js  
    └── api/  
        └── generate-story.js (Your serverless function from previous step)  
        └── \_lib/  
            └── ai-handler.js (Your AI integration helper for Gemini/TTS)  
    \`\`\`  
    \*   Place \`index.html\`, \`style.css\`, and \`app.js\` in your \`public\` directory (or wherever your frontend assets are served).  
    \*   Ensure your \`api/generate-story.js\` and \`\_lib/ai-handler.js\` are correctly set up for your Vercel serverless functions.

2\.  \*\*Yoto Developer Dashboard:\*\*  
    \*   Go to your Yoto Developer Dashboard.  
    \*   \*\*Client ID:\*\* Update \`YOTO\_CLIENT\_ID\` in \`app.js\` with your actual Client ID.  
    \*   \*\*Redirect URI:\*\* Register \`YOUR\_VERCEL\_APP\_URL/yoto-callback.html\` (or \`YOUR\_VERCEL\_APP\_URL\` if you handle the callback on \`index.html\` directly, but a dedicated page is cleaner) as an allowed callback URL. Ensure this exactly matches \`YOTO\_REDIRECT\_URI\` in \`app.js\`. If you use \`index.html\` as the callback, ensure \`window.location.origin\` correctly resolves to your deployed app URL.

3\.  \*\*\`ai-handler.js\`:\*\* Ensure your \`\_lib/ai-handler.js\` (referenced by \`generate-story.js\`) is implemented to interact with Google Gemini and Cloud Text-to-Speech APIs, returning \`storyText\` and \`audioContent\` (as a Node.js \`Buffer\`).

4\.  \*\*Deployment:\*\* Deploy your project to Vercel. The \`api\` directory will automatically be treated as serverless functions.

This setup provides a complete frontend UI with basic OAuth integration (requiring a callback handler), story generation, local audio playback, and the crucial integration with the Yoto API for creating/updating playlists, all adhering to the architectural principles from the handover.  
