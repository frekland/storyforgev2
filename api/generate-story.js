const { GoogleGenerativeAI } = require("@google/generative-ai");
const textToSpeech = require('@google-cloud/text-to-speech');
require('dotenv/config');

// --- Set up Google AI (Gemini) Client ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- Google Cloud TTS Client (Fallback) ---
const ttsClient = new textToSpeech.TextToSpeechClient({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
});

// --- OpenAI TTS Configuration ---
// Using ttsopenai.com API for better audio compatibility with Yoto
const OPENAI_TTS_API_URL = 'https://ttsopenai.com/api/tts';
const OPENAI_API_KEY = 'tts-c12443d1d4e2e42d385fe3d040ce401e';
const USE_OPENAI_TTS = false; // Set to false to use Google TTS fallback - temporarily disabled due to API issues

// Helper function for Gemini image processing
function fileToGenerativePart(base64Data, mimeType) {
  return { inlineData: { data: base64Data.split(',')[1], mimeType } };
}

// Enhanced image analysis function for character descriptions
async function analyzeCharacterImage(heroImage) {
  if (!heroImage) return null;
  
  console.log('🎨 Analyzing character artwork for rich description...');
  
  const analysisPrompt = `
    Look at this children's artwork and create a fun, detailed description of the character.
    
    Focus on:
    - Physical appearance (colors, shapes, features)
    - What kind of creature or person it is
    - Any special details that make it unique
    - Fun characteristics that would make it memorable in a story
    
    Write it as a vivid, child-friendly description that could be used to create an engaging story character.
    Keep it concise but rich in visual details that bring the character to life.
    
    Example format: "A friendly orange tabby cat with bright green stripes running down its back, wearing a tiny blue hat with a feather, and has the biggest smile you've ever seen on a cat!"
  `;
  
  try {
    const mimeType = heroImage.substring(heroImage.indexOf(":") + 1, heroImage.indexOf(";"));
    const imagePart = fileToGenerativePart(heroImage, mimeType);
    
    const result = await model.generateContent({
      contents: [{ 
        role: "user", 
        parts: [{ text: analysisPrompt }, imagePart] 
      }]
    });
    
    const description = (await result.response).text().trim();
    console.log('✅ Character description generated:', description);
    return description;
  } catch (error) {
    console.warn('⚠️ Character image analysis failed:', error.message);
    return null;
  }
}

// Enhanced image analysis function for scene descriptions
async function analyzeSceneImage(sceneImage) {
  if (!sceneImage) return null;
  
  console.log('🏞️ Analyzing scene artwork for rich description...');
  
  const analysisPrompt = `
    Look at this children's artwork of a scene and create a fun, detailed description of the setting.
    
    Focus on:
    - The location or environment (forest, castle, underwater, etc.)
    - Colors, atmosphere, and mood
    - Important objects, buildings, or landscape features
    - Any magical or special elements
    - Details that would make it an exciting story setting
    
    Write it as a vivid, child-friendly description that could be used as a story setting.
    Make it engaging and full of possibilities for adventure!
    
    Example format: "A magical forest where the trees have silver bark and purple leaves, with glowing mushrooms dotting the ground and a crystal-clear stream that sparkles like diamonds flowing through the middle!"
  `;
  
  try {
    const mimeType = sceneImage.substring(sceneImage.indexOf(":") + 1, sceneImage.indexOf(";"));
    const imagePart = fileToGenerativePart(sceneImage, mimeType);
    
    const result = await model.generateContent({
      contents: [{ 
        role: "user", 
        parts: [{ text: analysisPrompt }, imagePart] 
      }]
    });
    
    const description = (await result.response).text().trim();
    console.log('✅ Scene description generated:', description);
    return description;
  } catch (error) {
    console.warn('⚠️ Scene image analysis failed:', error.message);
    return null;
  }
}

// Helper function to create a placeholder image for surprise stories
async function createStoryPlaceholderImage(heroName, setting, age) {
  // This creates a simple SVG-based placeholder image
  // In production, replace this with actual AI image generation
  
  const colors = {
    '3': { bg: '#FFE5E5', accent: '#FF6B9D', text: '#8B4A6B' },
    '6': { bg: '#E5F3FF', accent: '#4A9EFF', text: '#2C5BAA' },
    '9': { bg: '#F0E5FF', accent: '#8B5CF6', text: '#5B2C87' },
    '12': { bg: '#E5FFE5', accent: '#10B981', text: '#065F46' }
  };
  
  const colorScheme = colors[age] || colors['6'];
  
  const svgImage = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${colorScheme.bg};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${colorScheme.accent};stop-opacity:0.3" />
      </linearGradient>
    </defs>
    <rect width="400" height="400" fill="url(#bg)" rx="20"/>
    <circle cx="200" cy="150" r="80" fill="${colorScheme.accent}" opacity="0.7"/>
    <rect x="120" y="220" width="160" height="100" fill="${colorScheme.accent}" opacity="0.5" rx="15"/>
    <text x="200" y="50" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="${colorScheme.text}">${heroName}</text>
    <text x="200" y="360" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="${colorScheme.text}" opacity="0.8">in ${setting}</text>
    <text x="200" y="380" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="${colorScheme.text}" opacity="0.6">Generated Story Illustration</text>
  </svg>`;
  
  // Convert SVG to base64
  const base64Svg = Buffer.from(svgImage).toString('base64');
  return `data:image/svg+xml;base64,${base64Svg}`;
}

// Helper function to get age-appropriate OpenAI TTS voice settings
function getVoiceSettings(age) {
  switch (age) {
    case '3':
      return {
        voice: 'nova', // Warm, friendly female voice - good for young children
        speed: 0.85    // Slower for young children
      };
    case '6':
      return {
        voice: 'nova', // Clear, engaging female voice
        speed: 0.9
      };
    case '9':
      return {
        voice: 'onyx', // Professional, engaging male voice
        speed: 0.95
      };
    case '12':
      return {
        voice: 'echo', // Mature, sophisticated male voice
        speed: 1.0
      };
    default:
      return {
        voice: 'nova', // Default to clear female voice
        speed: 0.9
      };
  }
}

// Helper function to process story text with pause control
function processStoryWithPauses(rawStoryText, heroName = '') {
  // Context-aware cleaning that preserves character names like 'Dot'
  let cleanedRawText = rawStoryText;
  
  // If hero name contains punctuation words, be extra careful
  const heroNameLower = heroName.toLowerCase();
  const isProtectedName = heroNameLower.includes('dot') || heroNameLower.includes('period') || 
                         heroNameLower.includes('comma') || heroNameLower.includes('question') ||
                         heroNameLower.includes('exclamation');
  
  // ALWAYS use ultra-conservative cleaning to preserve legitimate word usage
  console.log('🧠 Using ultra-conservative early processing for hero:', heroName);
  
  // SMART punctuation fixing - aggressive on errors, protective of legitimate usage
  
  // First, protect legitimate "dot" usage by temporarily replacing it
  cleanedRawText = rawStoryText
    // Protect "polka dots", "connect the dots", etc.
    .replace(/\b(polka|connect the|tiny)\s+dots?\b/gi, '$1 PROTECTED_DOTS')
    // Protect "dot" as verb: "fireflies dot the trees"
    .replace(/\b(\w+)\s+dots?\s+(the|a|an|these|those)\s/gi, '$1 PROTECTED_DOT_VERB $2 ')
    
    // Now aggressively fix punctuation errors
    .replace(/([a-zA-Z])\s+(dot|period)\s*$/gim, '$1.')
    .replace(/([a-zA-Z])\s+(dot|period)\s*\n/gim, '$1.\n')
    .replace(/([a-zA-Z])\s+(dot|period)\s+([A-Z][a-zA-Z]+)/g, '$1. $3')
    .replace(/([a-zA-Z])\s+(dot|period)\s*([,;!?])/gim, '$1.$3')
    .replace(/([a-zA-Z])\s+(dot|period)\s*(\[pause)/gim, '$1. $3')
    .replace(/([a-zA-Z])\s+(dot|period)\s*(["\'\"\'])/gim, '$1.$3')
    .replace(/([a-zA-Z])\s+(exclamation mark|exclamation point)\s*$/gim, '$1!')
    .replace(/([a-zA-Z])\s+(question mark)\s*$/gim, '$1?')
    
    // Restore protected legitimate usage
    .replace(/PROTECTED_DOTS/g, 'dots')
    .replace(/PROTECTED_DOT_VERB/g, 'dot');
    
  console.log('🧠 Early processing preserved all legitimate word usage');
  
  // Common spacing cleanup
  cleanedRawText = cleanedRawText
    .replace(/\s+([.!?])/g, '$1')
    .replace(/([.!?])([A-Z])/g, '$1 $2');
  
  // For Chirp3-HD, both display and TTS use the same clean text (no pause markers needed)
  const finalText = cleanedRawText
    .replace(/\*/g, '') // Remove any asterisks
    .replace(/\s+/g, ' ') // Clean up spacing
    .replace(/([.!?])([A-Z])/g, '$1 $2') // Ensure space after punctuation
    .trim();
    
  return { displayText: finalText, ttsText: finalText };
}

// Helper function to clean story text for OpenAI TTS (fallback)
function processStoryForTTS(storyText) {
  // For OpenAI TTS, remove pause markers and clean text
  const cleanText = storyText
    // Remove Chirp3-HD pause markers (not supported by OpenAI)
    .replace(/\[pause short\]/g, '')
    .replace(/\[pause long\]/g, '')
    .replace(/\[pause\]/g, '')
    // Remove asterisks and other formatting
    .replace(/\*/g, '')
    .replace(/[^a-zA-Z0-9\s.,!?;:'"-]/g, '')
    // Fix spacing and punctuation
    .replace(/\s+/g, ' ')
    .replace(/([.!?])([A-Z])/g, '$1 $2')
    .trim();

  return cleanText; // OpenAI TTS doesn't support SSML or pause markers
}

// Helper function to generate random story elements for surprise mode
function generateRandomStoryElements(age) {
  const heroes = {
    '3': ['Benny the Bear', 'Luna the Cat', 'Pip the Penguin', 'Ruby the Rabbit', 'Max the Mouse'],
    '6': ['Captain Sparkles', 'Princess Adventure', 'Zara the Explorer', 'Leo the Brave', 'Maya the Inventor'],
    '9': ['Alexander the Bold', 'Nira the Stormcaller', 'Quinn the Timekeeper', 'Sage the Spellbinder', 'Jax the Shadowdancer'],
    '12': ['Aria Nightwhisper', 'Kael Ironheart', 'Zephyr Starweaver', 'Lyra Frostborn', 'Darian Voidwalker']
  };
  
  const settings = {
    '3': ['a magical garden', 'a cozy treehouse', 'a friendly farm', 'a colorful playground', 'a warm bakery'],
    '6': ['an enchanted forest', 'a floating castle', 'a secret cave', 'an underwater palace', 'a sky pirate ship'],
    '9': ['the Crystal Mountains', 'the Whispering Desert', 'the Floating Isles', 'the Shadowlands', 'the Time Academy'],
    '12': ['the Realm of Forgotten Dreams', 'the Nexus of Parallel Worlds', 'the Citadel of Eternal Storms', 'the Labyrinth of Echoing Souls', 'the Observatory of Cosmic Secrets']
  };
  
  const challenges = {
    '3': ['a lost teddy bear', 'a sad little bird', 'missing cookies', 'a broken toy', 'a scared puppy'],
    '6': ['a sleeping dragon', 'a locked treasure chest', 'a missing magic wand', 'a cranky troll', 'a puzzle door'],
    '9': ['an ancient curse', 'a dimensional rift', 'a rogue magical storm', 'a tournament of champions', 'a betrayal by a trusted friend'],
    '12': ['the collapse of reality itself', 'a war between gods', 'the awakening of an eldritch horror', 'a paradox threatening time', 'the final prophecy coming true']
  };
  
  const solutions = {
    '3': ['sharing and kindness', 'a warm hug', 'asking for help', 'being brave', 'making a new friend'],
    '6': ['clever thinking', 'teamwork with magical creatures', 'discovering hidden powers', 'solving an ancient riddle', 'making a brave sacrifice'],
    '9': ['mastering forbidden magic', 'forging unlikely alliances', 'uncovering buried secrets', 'making an impossible choice', 'transcending mortal limitations'],
    '12': ['rewriting the laws of existence', 'sacrificing everything for the greater good', 'becoming one with cosmic forces', 'breaking free from destiny itself', 'embracing the paradox of creation and destruction']
  };
  
  const ageGroup = heroes[age] ? age : '6'; // fallback
  
  return {
    heroName: heroes[ageGroup][Math.floor(Math.random() * heroes[ageGroup].length)],
    promptSetup: settings[ageGroup][Math.floor(Math.random() * settings[ageGroup].length)],
    promptRising: challenges[ageGroup][Math.floor(Math.random() * challenges[ageGroup].length)],
    promptClimax: solutions[ageGroup][Math.floor(Math.random() * solutions[ageGroup].length)]
  };
}

// Helper function to generate story and audio
async function generateStoryAndAudio({ heroName, promptSetup, promptRising, promptClimax, heroImage, sceneImage, characterDescription, sceneDescription, age, surpriseMode = false }) {
  const startTime = Date.now();
  
  // Initialize debug tracking
  const debugSteps = [];
  debugSteps.push({ step: 'generation_start', heroName, age, timestamp: Date.now() });
  
  console.log('⏱️ Story generation started:', { surpriseMode, hasCharacterDesc: !!characterDescription, hasSceneDesc: !!sceneDescription });
  // Handle surprise mode by generating random story elements
  if (surpriseMode) {
    const randomElements = generateRandomStoryElements(age);
    heroName = randomElements.heroName;
    promptSetup = randomElements.promptSetup;
    promptRising = randomElements.promptRising;
    promptClimax = randomElements.promptClimax;
    console.log('🎲 Generated random story elements:', randomElements);
  }
  
  // Determine the story length and reading level based on the age
  let storyLength = 150;
  let readingLevel = "a simple, conversational style for young children";
  let ttsInstructions = "Use very simple sentences with gentle commas for natural pauses. Include fun dialogue and gentle excitement! Keep it warm and engaging for little ears.";
  
  switch (age) {
    case '6':
      storyLength = 500;
      readingLevel = "a slightly more detailed, engaging style for emerging readers";
      ttsInstructions = "Use simple, clear sentences with commas for natural rhythm. Include exciting dialogue and questions! Use ellipses for suspense... and hyphens for fun asides.";
      break;
    case '9':
      storyLength = 1000;
      readingLevel = "a captivating narrative with more complex vocabulary and sentence structures for confident readers";
      ttsInstructions = "Create dramatic audio flow with ellipses for suspense..., hyphens for character thoughts - like this - and varied comma placement for perfect speech rhythm.";
      break;
    case '12':
      storyLength = 2000;
      readingLevel = "a rich, descriptive, and mature style suitable for young adult readers";
      ttsInstructions = "Master sophisticated audio pacing: ellipses for dramatic pauses..., strategic hyphens for emphasis - building tension, and complex comma-rich sentences that create beautiful, flowing narration when spoken aloud.";
      break;
  }
  
  // ENHANCED: Use pre-generated descriptions or analyze images for magical personalization
  let finalCharacterDescription = characterDescription;
  let finalSceneDescription = sceneDescription;
  
  // Run image analysis in parallel for better performance
  const imageAnalysisPromises = [];
  
  if (!finalCharacterDescription && heroImage) {
    console.log('🎨 Starting character image analysis...');
    imageAnalysisPromises.push(
      analyzeCharacterImage(heroImage).then(desc => ({ type: 'character', description: desc }))
    );
  }
  
  if (!finalSceneDescription && sceneImage) {
    console.log('🏞️ Starting scene image analysis...');
    imageAnalysisPromises.push(
      analyzeSceneImage(sceneImage).then(desc => ({ type: 'scene', description: desc }))
    );
  }
  
  // Wait for all image analysis to complete in parallel
  if (imageAnalysisPromises.length > 0) {
    console.log(`🚀 Running ${imageAnalysisPromises.length} image analysis tasks in parallel...`);
    const results = await Promise.all(imageAnalysisPromises);
    
    // Apply results
    results.forEach(result => {
      if (result.type === 'character') {
        finalCharacterDescription = result.description;
      } else if (result.type === 'scene') {
        finalSceneDescription = result.description;
      }
    });
    
    console.log('✅ Parallel image analysis complete:', {
      characterDesc: !!finalCharacterDescription,
      sceneDesc: !!finalSceneDescription
    });
  }
  
  // Generate Story with Gemini - TTS-optimized prompts with enhanced image descriptions
  const textPrompt = `
    You are a master storyteller for children who specializes in creating stories that sound AMAZING when read aloud. 
    
    CRITICAL REQUIREMENTS:
    - Write ONLY in plain text - NO asterisks (*), NO special characters, NO formatting symbols
    - Use natural, flowing sentences that sound great when spoken
    - Include exciting dialogue with "said" instead of unusual speech tags
    - Write exactly around ${storyLength} words in ${readingLevel}
    - ${ttsInstructions}
    
    PUNCTUATION RULES (EXTREMELY IMPORTANT - AUDIO WILL SOUND BROKEN IF YOU VIOLATE THESE):
    - NEVER EVER write punctuation names like: "dot", "period", "comma", "exclamation mark", "exclamation point", "question mark"
    - ALWAYS use the actual punctuation symbols: . ! ? , : ;
    - When ending sentences, use a period (.) NOT the word "dot" or "period"
    - For excitement, use an exclamation mark (!) NOT "exclamation mark" or "exclamation point"
    - For questions, use a question mark (?) NOT "question mark"
    - Example: "Hello world! How are you?" NOT "Hello world exclamation mark How are you question mark"
    - This is CRITICAL for audio quality - punctuation names will be read aloud and sound terrible
    
    OPTIMIZE FOR BEAUTIFUL TTS AUDIO - Use these native Chirp3-HD punctuation features:
    
    🎵 PAUSE CONTROL through Natural Punctuation:
    - Periods (.): Full stop with standard sentence-ending pause - perfect for story beats
    - Commas (,): Short, natural intra-sentence pauses - use generously for rhythm
    - Ellipses (...): Prolonged, deliberate pauses for suspense, trailing thoughts, dramatic effect
    - Hyphens (-): Brief breaks in thought - great for asides, emphasis, or character quirks
    - Paragraph breaks: Longer natural pauses between story sections
    
    🎭 STORYTELLING TECHNIQUES for Audio:
    - Use ellipses for suspense: "The door slowly opened... and inside was..."
    - Use hyphens for character thoughts: "Maybe - just maybe - this could work!"
    - Use commas to build rhythm: "Slowly, carefully, quietly, she tiptoed forward."
    - Vary sentence lengths: Short punchy sentences. Then longer, flowing descriptive passages.
    
    Example with perfect TTS optimization:
    "Once upon a time, in a magical forest filled with secrets, there lived a brave little mouse named Pip.
    
    One sunny morning - the kind that makes everything sparkle - Pip discovered something extraordinary... something that would change everything."
    
    Create an exciting story based on these elements:
    - Hero's Name: ${heroName || 'a mysterious hero'}
    - The Beginning: ${promptSetup || 'a surprising place'}
    - The Challenge: ${promptRising || 'an unexpected problem'}
    - The Climax: ${promptClimax || 'a clever solution'}
    
    ${finalCharacterDescription && finalSceneDescription ? 
      `CRITICAL STORYTELLING RULES:
      1. CHARACTER INTEGRATION: Don't say "${finalCharacterDescription}" as a separate description. Instead, naturally weave these details into the action: "As ${heroName} [action], her [specific detail from description] [action]."
      2. SETTING INTEGRATION: Don't describe the setting separately. Instead, reveal it through ${heroName}'s experience: "${heroName} stepped into [setting detail], noticing [another detail]."
      3. SEAMLESS FLOW: Merge descriptions with plot - no information dumps or separate paragraphs.
      
      Character details to weave in: ${finalCharacterDescription}
      Setting details to weave in: ${finalSceneDescription}` : 
      finalCharacterDescription ? 
        `CRITICAL: Don't describe ${heroName} in a separate paragraph. Weave these details naturally into actions: "As ${heroName} [action], [character detail from: ${finalCharacterDescription}]"` :
        finalSceneDescription ?
          `CRITICAL: Don't describe the setting separately. Reveal it through ${heroName}'s actions: "${heroName} [action] in [detail from: ${finalSceneDescription}]"` :
          ''
    }
    
    Make it magical and engaging for children, with natural speech that flows beautifully when narrated! Remember to integrate all descriptions seamlessly into the narrative flow.
  `;
  
  const promptParts = [{ text: textPrompt }];
  
  // Note: We now use dedicated image analysis functions above to create rich descriptions
  // The character and scene descriptions are embedded directly in the text prompt
  
  const storyGenStart = Date.now();
  console.log('📝 Starting Gemini story generation...');
  
  const result = await model.generateContent({ contents: [{ role: "user", parts: promptParts }] });
  const rawStoryText = (await result.response).text();
  
  console.log('✅ Gemini story generation complete:', {
    timeMs: Date.now() - storyGenStart,
    storyLength: rawStoryText.length
  });
  
  // IMMEDIATE CHECK: Did the AI ignore our instructions and include punctuation words?
  const immediateCheck = {
    dots: (rawStoryText.match(/\bdot\b/gi) || []).length,
    periods: (rawStoryText.match(/\bperiod\b/gi) || []).length,
    exclamationMarks: (rawStoryText.match(/\bexclamation\s*mark\b/gi) || []).length,
    questionMarks: (rawStoryText.match(/\bquestion\s*mark\b/gi) || []).length
  };
  
  // Track AI output for debugging
  try {
    debugSteps.push({ 
      step: 'ai_generation_complete', 
      rawTextLength: rawStoryText.length,
      punctuationCheck: immediateCheck
    });
  } catch (e) {
    console.log('Debug tracking error (non-critical):', e.message);
  }
  
  if (immediateCheck.dots > 0 || immediateCheck.periods > 0 || immediateCheck.exclamationMarks > 0 || immediateCheck.questionMarks > 0) {
    console.log('🚨 AI IGNORED INSTRUCTIONS - Generated punctuation words:', immediateCheck);
    console.log('🚨 Raw AI output sample:', JSON.stringify(rawStoryText.substring(0, 300)));
    
    // Show all punctuation word instances with context
    const allPunctuationMatches = rawStoryText.match(/.{0,20}\b(dot|period|exclamation\s*mark|question\s*mark)\b.{0,20}/gi) || [];
    console.log('🚨 All AI punctuation violations:', allPunctuationMatches);
    
    debugSteps.push({ 
      step: 'ai_violations_found', 
      violations: allPunctuationMatches
    });
  } else {
    console.log('✅ AI FOLLOWED INSTRUCTIONS - No punctuation words in raw output');
    debugSteps.push({ step: 'ai_followed_instructions' });
  }
  
  // Process story to separate display text from TTS text with pauses
  const { displayText, ttsText } = processStoryWithPauses(rawStoryText, heroName);
  
  // Quick check for any remaining issues
  const ttsDots = (ttsText.match(/\bdot\b/gi) || []).length;
  if (ttsDots > 0) {
    console.log('⚠️ Found', ttsDots, 'dot words in TTS text');
  }
  
  const processingResults = {
    rawLength: rawStoryText.length,
    displayLength: displayText.length,
    ttsLength: ttsText.length,
    pauseMarkers: (ttsText.match(/\[pause[^\]]*\]/g) || []).length,
    punctuationWordsInRaw: {
      dots: (rawStoryText.match(/\b(dot|period)\b/gi) || []).length,
      exclamations: (rawStoryText.match(/\b(exclamation mark|exclamation point)\b/gi) || []).length,
      questions: (rawStoryText.match(/\b(question mark)\b/gi) || []).length,
      commas: (rawStoryText.match(/\b(comma)\b/gi) || []).length
    },
    punctuationWordsInTTS: {
      dots: (ttsText.match(/\b(dot|period)\b/gi) || []).length,
      exclamations: (ttsText.match(/\b(exclamation mark|exclamation point)\b/gi) || []).length,
      questions: (ttsText.match(/\b(question mark)\b/gi) || []).length,
      commas: (ttsText.match(/\b(comma)\b/gi) || []).length
    },
    displayTextSample: displayText.substring(0, 200),
    ttsTextSample: ttsText.substring(0, 200)
  };
  
  console.log('📝 Story processing complete:', processingResults);
  
  debugSteps.push({ 
    step: 'story_processing_complete', 
    results: processingResults
  });
  
  // Debug: Log sample of raw text to check for punctuation words
  const allPunctuationWords = [
    ...(rawStoryText.match(/\b(dot|period)\b/gi) || []),
    ...(rawStoryText.match(/\b(exclamation mark|exclamation point)\b/gi) || []),
    ...(rawStoryText.match(/\b(question mark)\b/gi) || []),
    ...(rawStoryText.match(/\b(comma)\b/gi) || [])
  ];
  
  if (allPunctuationWords.length > 0) {
    console.log('⚠️ RAW TEXT CONTAINS PUNCTUATION WORDS:', allPunctuationWords);
    console.log('📝 Sample:', JSON.stringify(rawStoryText.substring(0, 300)));
    
    // Log all instances with context
    const punctuationMatches = rawStoryText.match(/.{0,20}\b(dot|period|exclamation mark|exclamation point|question mark|comma)\b.{0,20}/gi) || [];
    console.log('🔎 All punctuation word instances with context:', punctuationMatches);
  }
  
  // Generate image for surprise mode using Gemini 2.5 Flash
  let generatedImageBase64 = null;
  if (surpriseMode) {
    try {
      console.log('🎨 Generating illustration for surprise story...');
      
      const imagePrompt = `Create a beautiful, child-friendly illustration for this story:
      
      Story: ${displayText.substring(0, 500)}...
      
      Style requirements:
      - Colorful and vibrant
      - Child-friendly and safe
      - Storybook illustration style
      - Focus on the main character: ${heroName}
      - Setting: ${promptSetup}
      - Magical and whimsical atmosphere
      - No text or words in the image
      - High quality digital art`;
      
      const imageModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
      
      const imageResult = await imageModel.generateContent({
        contents: [{
          role: "user",
          parts: [{
            text: imagePrompt
          }]
        }]
      });
      
      // For now, create a descriptive placeholder since we can't generate actual images
      // In a real implementation, this would call an image generation API like DALL-E, Midjourney, etc.
      const imageDescription = `A beautiful storybook illustration of ${heroName} in ${promptSetup}, facing ${promptRising} and ultimately ${promptClimax}. Colorful, child-friendly, magical atmosphere.`;
      console.log('🎨 Generated image description:', imageDescription);
      
      // For demonstration, we'll create a simple colored rectangle with the story info
      // In production, this would be replaced with actual AI image generation
      generatedImageBase64 = await createStoryPlaceholderImage(heroName, promptSetup, age);
      
    } catch (imageError) {
      console.warn('⚠️ Failed to generate image for surprise story:', imageError.message);
      // Continue without generated image
    }
  }

  // Process story text appropriately for each TTS engine
  const cleanStoryText = processStoryForTTS(ttsText); // For OpenAI TTS (removes pause markers)
  const markupStoryText = ttsText; // For Google Chirp3-HD (keeps pause markers)
  
  // Get age-appropriate voice settings
  const voiceSettings = getVoiceSettings(age);
  
  console.log('🎵 Generating audio:', {
    voice: voiceSettings.voice,
    speed: voiceSettings.speed,
    cleanTextLength: cleanStoryText.length,
    markupTextLength: markupStoryText.length,
    pauseMarkers: (markupStoryText.match(/\[pause[^\]]*\]/g) || []).length,
    engine: USE_OPENAI_TTS ? 'OpenAI (no pause control)' : 'Google Chirp3-HD (with pause control)'
  });
  
  // Convert Story Text to Speech using appropriate engine and text format
  const ttsStart = Date.now();
  console.log('🎵 Starting TTS generation...');
  
  let audioContent;
  
  if (USE_OPENAI_TTS) {
    try {
      console.log('🎵 Attempting OpenAI TTS (using clean text)...');
      audioContent = await generateOpenAITTS(cleanStoryText, voiceSettings);
      console.log('✅ OpenAI TTS successful, using OpenAI audio');
    } catch (openaiError) {
      console.warn('⚠️ OpenAI TTS failed, falling back to Google TTS with pause control:', openaiError.message);
      try {
        audioContent = await generateGoogleTTS(markupStoryText, age, heroName);
        console.log('✅ Google TTS fallback successful with pause markers');
      } catch (googleError) {
        console.error('❌ Both TTS services failed:', googleError.message);
        throw new Error(`Both TTS services failed. OpenAI: ${openaiError.message.substring(0, 100)}... Google: ${googleError.message}`);
      }
    }
  } else {
    console.log('🎥 Using Google Chirp3-HD with pause control (using markup text)...');
    audioContent = await generateGoogleTTS(markupStoryText, age, heroName);
  }
  
  console.log('✅ TTS generation complete:', {
    timeMs: Date.now() - ttsStart,
    audioSizeKB: Math.round(audioContent.length / 1024)
  });
  
  const totalTime = Date.now() - startTime;
  console.log('✅ Story generation complete - Performance Summary:', {
    totalTimeMs: totalTime,
    totalTimeSec: Math.round(totalTime / 1000),
    storyLength: displayText.length,
    audioSizeKB: Math.round(audioContent.length / 1024),
    hasCharacterDesc: !!finalCharacterDescription,
    hasSceneDesc: !!finalSceneDescription
  });
  
  return { 
    storyText: displayText, // Return display text without pause markers for UI
    audioContent,
    generatedImage: generatedImageBase64 // Include generated image for surprise mode
  };
}

// OpenAI TTS Generation Function
async function generateOpenAITTS(cleanStoryText, voiceSettings) {
  try {
    const requestBody = {
      model: 'tts-1',
      input: cleanStoryText.substring(0, 4096), // Limit text length to prevent issues
      voice: voiceSettings.voice,
      speed: voiceSettings.speed,
      response_format: 'mp3'
    };
    
    console.log('🚀 Making OpenAI TTS request:', {
      url: OPENAI_TTS_API_URL,
      model: requestBody.model,
      voice: requestBody.voice,
      speed: requestBody.speed,
      inputLength: requestBody.input.length
    });
    
    const ttsResponse = await fetch(OPENAI_TTS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'StoryForge/1.0'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('📊 TTS Response status:', ttsResponse.status, ttsResponse.statusText);
    console.log('📊 Response headers:', Object.fromEntries(ttsResponse.headers.entries()));
    
    if (!ttsResponse.ok) {
      const errorData = await ttsResponse.text();
      console.error('❌ OpenAI TTS API error response:', errorData);
      throw new Error(`OpenAI TTS API error: ${ttsResponse.status} - ${errorData}`);
    }
    
    // Check content type
    const contentType = ttsResponse.headers.get('content-type');
    console.log('🔊 Response content-type:', contentType);
    
    // Get the audio buffer
    const audioContent = Buffer.from(await ttsResponse.arrayBuffer());
    
    console.log('✅ OpenAI TTS generation successful:', {
      audioSize: audioContent.length,
      contentType: contentType,
      format: 'mp3'
    });
    
    if (audioContent.length === 0) {
      throw new Error('Received empty audio buffer');
    }
    
    return audioContent;
    
  } catch (error) {
    console.error('❌ OpenAI TTS generation failed:', {
      message: error.message,
      stack: error.stack
    });
    
    // Fallback error message
    throw new Error(`Audio generation failed: ${error.message}. Please try again.`);
  }
}

// Google TTS Function - Enhanced with Chirp3-HD pause control using proper markup syntax
async function generateGoogleTTS(storyTextWithPauses, age, heroName = '') {
  console.log('🎵 Generating audio with Google Chirp3-HD (MP3 format with pause control)');
  
  const voiceSettings = {
    languageCode: 'en-GB',
    name: 'en-GB-Chirp3-HD-Vindemiatrix', // High-quality Chirp3-HD voice with pause support
    ssmlGender: 'FEMALE'
  };
  
  console.log('⏸️ Pause markers in text:', {
    pauseShort: (storyTextWithPauses.match(/\[pause short\]/g) || []).length,
    pause: (storyTextWithPauses.match(/\[pause\](?![^\]]*\])/g) || []).length,
    pauseLong: (storyTextWithPauses.match(/\[pause long\]/g) || []).length,
    totalMarkers: (storyTextWithPauses.match(/\[pause[^\]]*\]/g) || []).length
  });
  
  // Quick punctuation check for TTS
  const punctuationWords = (storyTextWithPauses.match(/\b(dot|period|exclamation mark|question mark)\b/gi) || []).length;
  if (punctuationWords > 0) {
    console.log('⚠️ TTS input contains', punctuationWords, 'punctuation words - applying cleaning');
  }
  
  // Ultra-aggressive dot cleaning with character inspection
  let cleanedMarkupText = storyTextWithPauses;
  
  // Log character codes around any 'dot' instances for debugging
  const dotInstances = cleanedMarkupText.match(/.{0,10}dot.{0,10}/gi) || [];
  if (dotInstances.length > 0) {
    console.log('🔍 DOT INSTANCES FOUND:', dotInstances);
    dotInstances.forEach((instance, i) => {
      const charCodes = instance.split('').map(c => `${c}(${c.charCodeAt(0)})`).join(' ');
      console.log(`🔢 Instance ${i + 1} char codes:`, charCodes);
    });
  }
  
  // ULTRA-CONSERVATIVE cleaning - only fix obvious TTS pronunciation errors
  // Preserve ALL legitimate uses of words like "dot", "period", etc.
  cleanedMarkupText = storyTextWithPauses;
  
  console.log('🧠 Using ultra-conservative cleaning to preserve legitimate word usage');
  
  // Only replace in VERY specific contexts where it's clearly a TTS pronunciation error:
  // 1. At the very end of sentences where it's clearly meant to be punctuation
  // 2. In patterns like "word dot word" where "dot" is clearly punctuation
  
  cleanedMarkupText = cleanedMarkupText
    // AGGRESSIVELY fix sentence-ending errors where AI wrote "dot" instead of "."
    .replace(/([a-zA-Z])\s+(dot|period)\s*$/gim, '$1.')
    .replace(/([a-zA-Z])\s+(dot|period)\s*\n/gim, '$1.\n')
    .replace(/([a-zA-Z])\s+(dot|period)\s+([A-Z][a-zA-Z]+)/g, '$1. $3') // "word dot Word" -> "word. Word"
    // Fix "word dot" at end of clauses (before punctuation or pause markers)
    .replace(/([a-zA-Z])\s+(dot|period)\s*([,;!?])/gim, '$1.$3')
    .replace(/([a-zA-Z])\s+(dot|period)\s*(\[pause)/gim, '$1. $3')
    // Fix "word dot" followed by quotes or other punctuation
    .replace(/([a-zA-Z])\s+(dot|period)\s*(["\'\"\'])/gim, '$1.$3')
    
    // HELP TTS understand "dot" as a verb by using synonyms
    // Pattern: "noun dot the" (like "fireflies dot the trees") -> "fireflies speckle the trees"
    .replace(/\b(\w+)\s+dot\s+(the|a|an)\b/gi, '$1 speckle $2')
    // Pattern: "dots" as plural verb -> "speckles"
    .replace(/\b(\w+)\s+dots\s+(the|a|an)\b/gi, '$1 speckles $2')
    
    // ONLY fix clear exclamation/question errors at sentence end
    .replace(/([a-zA-Z])\s+(exclamation mark|exclamation point)\s*$/gim, '$1!')
    .replace(/([a-zA-Z])\s+(question mark)\s*$/gim, '$1?')
    
    // Clean up spacing issues ONLY (don't change words)
    .replace(/\s+([.!?])/g, '$1')
    .replace(/([.!?])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
    
  console.log('🧠 Conservative cleaning complete - preserved legitimate word usage');
  
  // Verify cleaning worked for all punctuation names
  const remainingDots = (cleanedMarkupText.match(/\b(dot|period)\b/gi) || []).length;
  const remainingExclamations = (cleanedMarkupText.match(/\b(exclamation mark|exclamation point)\b/gi) || []).length;
  const remainingQuestions = (cleanedMarkupText.match(/\b(question mark)\b/gi) || []).length;
  const remainingCommas = (cleanedMarkupText.match(/\b(comma)\b/gi) || []).length;
  const totalPunctuationWords = remainingDots + remainingExclamations + remainingQuestions + remainingCommas;
  
  if (totalPunctuationWords > 0) {
    console.log('❌ PUNCTUATION CLEANING FAILED:', {
      dots: remainingDots,
      exclamations: remainingExclamations, 
      questions: remainingQuestions,
      commas: remainingCommas,
      total: totalPunctuationWords
    });
    console.log('🔍 Problem sample:', JSON.stringify(cleanedMarkupText.substring(0, 300)));
    console.log('⚠️ Continuing with best-effort cleaning - some punctuation words may remain');
  } else {
    console.log('✅ PUNCTUATION CLEANING SUCCESSFUL - No punctuation words remaining');
  }
  
  console.log('✨ Final cleaned markup text sample:', JSON.stringify(cleanedMarkupText.substring(0, 200)));
  
  // EMERGENCY DEBUGGING - Log the exact text being sent to TTS
  console.log('🚨 EMERGENCY DEBUG - EXACT TTS INPUT TEXT:');
  console.log('🚨 Full length:', cleanedMarkupText.length);
  console.log('🚨 First 500 chars:', JSON.stringify(cleanedMarkupText.substring(0, 500)));
  console.log('🚨 Last 500 chars:', JSON.stringify(cleanedMarkupText.substring(-500)));
  
  // Check if TTS input contains dot words that display text doesn't
  const ttsHasDot = (cleanedMarkupText.match(/\bdot\b/gi) || []).length;
  const ttsHasPeriod = (cleanedMarkupText.match(/\bperiod\b/gi) || []).length;
  console.log('🚨 TTS TEXT DOT CHECK:', { ttsHasDot, ttsHasPeriod });
  
  if (ttsHasDot > 0 || ttsHasPeriod > 0) {
    console.log('🚨 FOUND THE PROBLEM! TTS text contains dot/period words that display text does not!');
    const dotMatches = cleanedMarkupText.match(/.{0,30}\b(dot|period)\b.{0,30}/gi) || [];
    console.log('🚨 TTS dot contexts:', dotMatches);
  }
  
  // Check for any remaining punctuation words in final text
  const finalDotCheck = (cleanedMarkupText.match(/\bdot\b/gi) || []);
  const finalPeriodCheck = (cleanedMarkupText.match(/\bperiod\b/gi) || []);
  const finalExclamationCheck = (cleanedMarkupText.match(/\bexclamation\s*mark\b/gi) || []);
  
  const finalTTSDebug = {
    finalDots: finalDotCheck,
    finalPeriods: finalPeriodCheck, 
    finalExclamations: finalExclamationCheck,
    finalTextSample: cleanedMarkupText.substring(0, 300),
    textLength: cleanedMarkupText.length
  };
  
  // Debug info will be tracked in the main function
  
  if (finalDotCheck.length > 0 || finalPeriodCheck.length > 0 || finalExclamationCheck.length > 0) {
    console.log('🚨 CRITICAL: PUNCTUATION WORDS STILL IN FINAL TTS TEXT!');
    console.log('🚨 Found dots:', finalDotCheck);
    console.log('🚨 Found periods:', finalPeriodCheck);
    console.log('🚨 Found exclamations:', finalExclamationCheck);
    
    // Show exact context around each problem
    finalDotCheck.forEach((match, i) => {
      const index = cleanedMarkupText.toLowerCase().indexOf(match.toLowerCase());
      const context = cleanedMarkupText.substring(Math.max(0, index - 30), index + 30);
      console.log(`🚨 DOT CONTEXT ${i + 1}:`, JSON.stringify(context));
    });
  } else {
    console.log('✅ FINAL CHECK PASSED - No punctuation words in TTS input');
  }
  
  // CRITICAL FIX: Chirp3-HD only supports plain text, not markup!
  // Remove all pause markers and send as plain text for natural speech
  const plainTextForChirp = cleanedMarkupText
    .replace(/\[pause short\]/g, '')
    .replace(/\[pause long\]/g, '')
    .replace(/\[pause\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  console.log('🎯 CHIRP3-HD FIX: Using plain text format (no markup)');
  console.log('🎯 Plain text sample:', JSON.stringify(plainTextForChirp.substring(0, 200)));
  
  const request = {
    input: { text: plainTextForChirp }, // Use plain 'text' format for Chirp3-HD
    voice: voiceSettings,
    audioConfig: {
      audioEncoding: 'MP3',
      sampleRateHertz: 22050,
      speakingRate: age === '3' ? 0.85 : age === '6' ? 0.9 : 0.95,
      volumeGainDb: 2.0
    }
  };
  
  const [response] = await ttsClient.synthesizeSpeech(request);
  
  // Return MP3 data directly (no WAV header needed)
  const mp3Data = response.audioContent;
  
  console.log('✅ Google Chirp3-HD generation successful:', {
    audioSize: mp3Data.length,
    format: 'mp3',
    sampleRate: '22050Hz',
    encoding: 'MP3',
    pauseControlEnabled: true
  });
  
  return mp3Data;
}

// ✅ DUAL-MODE SERVERLESS FUNCTION - CRITICAL FOR STREAMING WORKFLOW
module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    // Mode 1: Client requests story generation
    try {
      const { heroName, promptSetup, promptRising, promptClimax, heroImage, sceneImage, characterDescription, sceneDescription, age, surpriseMode } = req.body;
      
      // Validate input (skip validation for surprise mode)
      // For regular mode, require at least one story element
      if (!surpriseMode) {
        const hasAtLeastOneElement = 
          (heroName && heroName.trim()) || 
          (promptSetup && promptSetup.trim()) || 
          (promptRising && promptRising.trim()) || 
          (promptClimax && promptClimax.trim());
        
        if (!hasAtLeastOneElement) {
          return res.status(400).json({ message: 'Please provide at least one story element (hero name, setup, rising action, or climax).' });
        }
      }

      console.log(surpriseMode ? "Generating surprise story for client..." : "Generating custom story for client...");
      
      // Add timeout protection (110 seconds - just under Vercel's 120s limit)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Story generation timeout - please try again')), 110000)
      );
      
      const storyPromise = generateStoryAndAudio({
        heroName, promptSetup, promptRising, promptClimax, heroImage, sceneImage, characterDescription, sceneDescription, age, surpriseMode
      });
      
      const { storyText, audioContent, generatedImage } = await Promise.race([
        storyPromise,
        timeoutPromise
      ]);

      // Return story text, Base64 audio, and generated image (if any) for the client to handle
      const response = {
        story: storyText,
        audio: audioContent.toString('base64'),
        // Calculate estimated duration (rough approximation: ~150 words per minute)
        duration: Math.ceil(storyText.split(' ').length / 2.5), // seconds
        fileSize: audioContent.length,
        // Add basic debugging information for client-side troubleshooting
        debug: {
          storyLength: storyText.length,
          audioSize: audioContent.length,
          heroName: heroName || '',
          punctuationAnalysis: {
            storyContainsDot: (storyText.match(/\bdot\b/gi) || []).length,
            storyContainsPeriod: (storyText.match(/\bperiod\b/gi) || []).length,
            actualPeriods: (storyText.match(/\./g) || []).length
          }
        }
      };
      
      // Include generated image for surprise mode
      if (generatedImage) {
        response.generatedImage = generatedImage;
      }
      
      console.log('🎵 POST response summary:', {
        storyLength: storyText.length,
        audioBase64Length: response.audio.length,
        audioBytesLength: audioContent.length,
        duration: response.duration,
        fileSize: response.fileSize,
        hasGeneratedImage: !!generatedImage
      });
      
      res.status(200).json(response);

    } catch (error) {
      console.error('Error in story generation:', error);
      res.status(500).json({ message: 'Failed to generate story and audio.' });
    }

  } else if (req.method === 'GET' || req.method === 'HEAD') {
    // Mode 2: Yoto servers request audio stream
    try {
      const timestamp = new Date().toISOString();
      console.log(`🎵 [${timestamp}] *** STREAMING REQUEST RECEIVED ***`);
      console.log('📋 Query parameters:', req.query);
      console.log('🌐 Request headers (full):', req.headers);
      
      // Special detection for Yoto requests
      const userAgent = req.headers['user-agent'] || '';
      // Yoto uses Android Dalvik user-agent based on the logs
      const isYotoRequest = userAgent.toLowerCase().includes('yoto') || 
                           req.headers['origin'] === 'https://yotoplay.com' ||
                           req.headers['referer']?.includes('yoto') ||
                           (userAgent.includes('Dalvik') && req.headers['icy-metadata']); // Android with streaming metadata
      
      console.log('🔍 Request analysis:', {
        'user-agent': userAgent,
        'is-yoto-request': isYotoRequest,
        'accept': req.headers['accept'],
        'origin': req.headers['origin'],
        'referer': req.headers['referer'],
        'range': req.headers['range'],
        'connection': req.headers['connection'],
        'accept-encoding': req.headers['accept-encoding'],
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'cf-connecting-ip': req.headers['cf-connecting-ip']
      });
      
      if (isYotoRequest) {
        console.log('🎉 *** CONFIRMED YOTO REQUEST DETECTED ***');
      } else {
        console.log('🤔 Non-Yoto request (browser/debug tool)');
      }
      
      // Set CORS headers immediately
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Accept, User-Agent');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Accept-Ranges');
      
      const { heroName, promptSetup, promptRising, promptClimax, heroImage, sceneImage, characterDescription, sceneDescription, age, audioOnly } = req.query;

      if (!audioOnly || audioOnly !== 'true') {
        console.error('❌ Missing audioOnly=true parameter');
        return res.status(400).json({ message: 'This endpoint is for audio streaming only. Set audioOnly=true.' });
      }
      
      // Validate that we have at least one story element
      const hasAtLeastOneElement = 
        (heroName && heroName.trim()) || 
        (promptSetup && promptSetup.trim()) || 
        (promptRising && promptRising.trim()) || 
        (promptClimax && promptClimax.trim());
      
      if (!hasAtLeastOneElement) {
        console.error('❌ No story elements provided for streaming');
        return res.status(400).json({ message: 'At least one story element is required for streaming.' });
      }

      console.log('✅ Streaming audio for Yoto servers with story:', {
        heroName: heroName || 'N/A',
        hasSetup: !!(promptSetup && promptSetup.trim()),
        hasRising: !!(promptRising && promptRising.trim()),
        hasClimax: !!(promptClimax && promptClimax.trim()),
        age: age || '6'
      });
      // Re-generate the audio on-demand using the same parameters
      const { storyText, audioContent } = await generateStoryAndAudio({
        heroName, promptSetup, promptRising, promptClimax, heroImage, sceneImage, characterDescription, sceneDescription, age
      });
      
      console.log('✅ Audio generation complete for streaming:', {
        storyLength: storyText.length,
        audioSize: audioContent.length,
        format: 'wav',
        sampleRate: '22050Hz',
        isForYoto: isYotoRequest
      });

      // ❗ CRITICAL: Set the correct headers for audio streaming (MP3 FORMAT like Yoto's example!)
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioContent.length);
      res.setHeader('Accept-Ranges', 'bytes'); // Enable range requests for streaming
      res.setHeader('Content-Disposition', 'inline'); // Ensure inline playback
      // Reduce caching for debugging Yoto streaming issues
      res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes only
      
      // Additional headers for better compatibility
      if (isYotoRequest) {
        console.log('🎵 Adding Yoto-specific headers for better compatibility');
        const estimatedDuration = Math.ceil(storyText.split(' ').length / 2.5);
        res.setHeader('X-Content-Duration', estimatedDuration); // Estimated duration
        res.setHeader('icy-name', 'StoryForge Audio Story');
        res.setHeader('icy-genre', 'Children Story');
        res.setHeader('icy-description', 'AI-generated story for children');
        
        console.log('🎵 Yoto-specific headers added:', {
          'X-Content-Duration': estimatedDuration,
          'icy-name': 'StoryForge Audio Story',
          'icy-genre': 'Children Story'
        });
      }
      
      console.log('📤 Response headers set:', {
        'Content-Type': 'audio/wav',
        'Content-Length': audioContent.length,
        'Accept-Ranges': 'bytes',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      });

      if (req.method === 'HEAD') {
        // For HEAD requests, just return headers without body
        console.log('🔍 HEAD request - returning headers only');
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioContent.length.toString(),
            'Accept-Ranges': 'bytes',
            'Content-Disposition': 'inline',
            'Cache-Control': 'public, max-age=300',
            'Access-Control-Allow-Origin': '*'
          }
        };
      } else {
        // Send the audio buffer as the response (Yoto's official format)
        console.log('✅ *** SUCCESSFULLY STREAMING AUDIO (YOTO FORMAT) ***');
        console.log('📤 Audio details:', {
          contentLength: audioContent.length,
          contentType: 'audio/mpeg',
          isYotoRequest: isYotoRequest,
          userAgent: userAgent.substring(0, 100), // First 100 chars
          responseFormat: 'base64-encoded MP3'
        });
        
        if (isYotoRequest) {
          console.log('🎉 *** YOTO SUCCESSFULLY RECEIVED AUDIO ***');
        }
        
        // Return in Yoto's expected format (matching their official example)
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioContent.length.toString(),
            'Accept-Ranges': 'bytes',
            'Content-Disposition': 'inline',
            'Cache-Control': 'public, max-age=300',
            'Access-Control-Allow-Origin': '*'
          },
          body: audioContent.toString('base64'),
          isBase64Encoded: true
        };
      }

    } catch (error) {
      console.error('❌ Error in audio streaming:', {
        message: error.message,
        stack: error.stack,
        query: req.query
      });
      res.status(500).json({ message: 'Failed to stream audio.', error: error.message });
    }
  } else if (req.method === 'OPTIONS') {
    // Handle CORS preflight requests
    console.log('🔍 OPTIONS request received - CORS preflight');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Accept, User-Agent, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 1 day
    res.status(200).end();
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'HEAD', 'OPTIONS']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

// WAV header function removed - now using MP3 format to match Yoto's official example
