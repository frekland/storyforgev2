const { GoogleGenerativeAI } = require("@google/generative-ai");
const textToSpeech = require('@google-cloud/text-to-speech');
require('dotenv/config');

// --- Set up Google AI (Gemini) Client ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- Set up Google Cloud (TTS) Client using environment variables ---
const ttsClient = new textToSpeech.TextToSpeechClient({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
});

// Helper function for Gemini image processing
function fileToGenerativePart(base64Data, mimeType) {
  return { inlineData: { data: base64Data.split(',')[1], mimeType } };
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

// Helper function to get age-appropriate voice settings (British English only)
function getVoiceSettings(age) {
  switch (age) {
    case '3':
      return {
        languageCode: 'en-GB',
        name: 'en-GB-Wavenet-A', // Warm, friendly British female voice
        ssmlGender: 'FEMALE'
      };
    case '6':
      return {
        languageCode: 'en-GB',
        name: 'en-GB-Wavenet-C', // Clear, engaging British female voice
        ssmlGender: 'FEMALE'
      };
    case '9':
      return {
        languageCode: 'en-GB',
        name: 'en-GB-Wavenet-B', // Professional, engaging British male voice
        ssmlGender: 'MALE'
      };
    case '12':
      return {
        languageCode: 'en-GB',
        name: 'en-GB-Wavenet-D', // Mature, sophisticated British male voice
        ssmlGender: 'MALE'
      };
    default:
      return {
        languageCode: 'en-GB',
        name: 'en-GB-Wavenet-C',
        ssmlGender: 'FEMALE'
      };
  }
}

// Helper function to clean story text and add SSML prosody
function processStoryForTTS(storyText, age) {
  // Remove non-pronounceable characters and format for TTS
  let cleanText = storyText
    // Remove asterisks and other special characters
    .replace(/\*/g, '')
    .replace(/[^a-zA-Z0-9\s.,!?;:'"-]/g, '')
    // Fix common TTS issues
    .replace(/\s+/g, ' ')
    .replace(/([.!?])([A-Z])/g, '$1 $2')
    .trim();

  // Check if text is too long for SSML (conservative 4000 byte limit to account for SSML markup)
  const textByteLength = Buffer.byteLength(cleanText, 'utf8');
  const useSimpleSSML = textByteLength > 3000; // Conservative limit
  
  if (useSimpleSSML) {
    // For longer text, use minimal SSML to avoid 5000 byte limit
    // Age-specific speaking rate only
    let baseRate;
    switch (age) {
      case '3': baseRate = '0.8'; break;
      case '6': baseRate = '0.9'; break;
      case '9': baseRate = '0.95'; break;
      case '12': baseRate = '1.0'; break;
      default: baseRate = '0.9';
    }
    
    const simpleSSML = `<speak><prosody rate="${baseRate}">${cleanText}</prosody></speak>`;
    
    return {
      displayText: cleanText,
      ttsText: simpleSSML
    };
  }

  // For shorter text, use enhanced SSML with dramatic effects
  let processedText = cleanText;
  
  // Add selective dramatic emphasis (only key words to keep SSML compact)
  processedText = processedText
    .replace(/(suddenly|amazing|wonderful|magical|incredible)/gi, '<emphasis level="strong">$1</emphasis>')
    .replace(/(whispered|quietly)/gi, '<prosody volume="-2dB">$1</prosody>')
    .replace(/(shouted|yelled)/gi, '<prosody volume="+2dB">$1</prosody>');

  // Age-specific minimal SSML
  let baseRate, basePitch;
  switch (age) {
    case '3':
      baseRate = '0.8';
      basePitch = '+2st';
      break;
    case '6':
      baseRate = '0.9';
      basePitch = '+1st';
      break;
    case '9':
      baseRate = '0.95';
      basePitch = '+0.5st';
      break;
    case '12':
      baseRate = '1.0';
      basePitch = '0st';
      break;
    default:
      baseRate = '0.9';
      basePitch = '+1st';
  }

  // Create compact SSML
  const ssmlText = `<speak><prosody rate="${baseRate}" pitch="${basePitch}">${processedText}</prosody></speak>`;

  return {
    displayText: cleanText,
    ttsText: ssmlText
  };
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
async function generateStoryAndAudio({ heroName, promptSetup, promptRising, promptClimax, heroImage, age, surpriseMode = false }) {
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
  let ttsInstructions = "Write naturally flowing sentences that sound great when read aloud. Use simple, clear language without special characters or symbols.";
  
  switch (age) {
    case '6':
      storyLength = 500;
      readingLevel = "a slightly more detailed, engaging style for emerging readers";
      ttsInstructions = "Write with natural speech patterns, including exciting exclamations and questions that will sound engaging when spoken.";
      break;
    case '9':
      storyLength = 1000;
      readingLevel = "a captivating narrative with more complex vocabulary and sentence structures for confident readers";
      ttsInstructions = "Write with varied sentence lengths and natural dialogue. Include descriptive passages that flow beautifully when narrated.";
      break;
    case '12':
      storyLength = 2000;
      readingLevel = "a rich, descriptive, and mature style suitable for young adult readers";
      ttsInstructions = "Write with sophisticated narrative flow, natural dialogue, and descriptive language that creates vivid mental images when heard.";
      break;
  }

  // Generate Story with Gemini - TTS-optimized prompts
  const textPrompt = `
    You are a master storyteller for children who specializes in creating stories that sound AMAZING when read aloud. 
    
    CRITICAL REQUIREMENTS:
    - Write ONLY in plain text - NO asterisks (*), NO special characters, NO formatting symbols
    - Use natural, flowing sentences that sound great when spoken
    - Include exciting dialogue with "said" instead of unusual speech tags
    - Write exactly around ${storyLength} words in ${readingLevel}
    - ${ttsInstructions}
    
    Create an exciting story based on these elements:
    - Hero's Name: ${heroName || 'a mysterious hero'}
    - The Beginning: ${promptSetup || 'a surprising place'}
    - The Challenge: ${promptRising || 'an unexpected problem'}
    - The Climax: ${promptClimax || 'a clever solution'}
    ${heroImage ? '- Character from Image: Incorporate the creature or character from the image naturally into the story.' : ''}
    
    Make it magical and engaging for children, with natural speech that flows beautifully when narrated!
  `;
  
  const promptParts = [{ text: textPrompt }];

  if (heroImage) {
    const mimeType = heroImage.substring(heroImage.indexOf(":") + 1, heroImage.indexOf(";"));
    const imagePart = fileToGenerativePart(heroImage, mimeType);
    promptParts.push(imagePart);
  }
  
  const result = await model.generateContent({ contents: [{ role: "user", parts: promptParts }] });
  const storyText = (await result.response).text();
  
  // Generate image for surprise mode using Gemini 2.5 Flash
  let generatedImageBase64 = null;
  if (surpriseMode) {
    try {
      console.log('🎨 Generating illustration for surprise story...');
      
      const imagePrompt = `Create a beautiful, child-friendly illustration for this story:
      
      Story: ${storyText.substring(0, 500)}...
      
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

  // Process story text for TTS and UI display
  const processedStory = processStoryForTTS(storyText, age);
  
  // Get age-appropriate voice settings
  const voiceSettings = getVoiceSettings(age);
  
  // Convert Story Text to Speech with SSML and improved voice settings
  let audioContent;
  
  try {
    // Try SSML first
    const ssmlRequest = {
      input: { ssml: processedStory.ttsText },
      voice: {
        languageCode: voiceSettings.languageCode,
        name: voiceSettings.name,
        ssmlGender: voiceSettings.ssmlGender,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: age === '3' ? 0.85 : age === '6' ? 0.9 : 0.95, // Slower for younger children
        pitch: age === '3' ? 2.0 : age === '6' ? 1.0 : 0.0, // Higher pitch for younger children
        volumeGainDb: 2.0, // Slightly louder for clarity
      },
    };
    const [ssmlResponse] = await ttsClient.synthesizeSpeech(ssmlRequest);
    audioContent = ssmlResponse.audioContent;
    
  } catch (error) {
    console.warn('SSML TTS failed, falling back to plain text:', error.message);
    
    // Fallback to plain text TTS
    const textRequest = {
      input: { text: processedStory.displayText },
      voice: {
        languageCode: voiceSettings.languageCode,
        name: voiceSettings.name,
        ssmlGender: voiceSettings.ssmlGender,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: age === '3' ? 0.85 : age === '6' ? 0.9 : 0.95,
        pitch: age === '3' ? 2.0 : age === '6' ? 1.0 : 0.0,
        volumeGainDb: 2.0,
      },
    };
    const [textResponse] = await ttsClient.synthesizeSpeech(textRequest);
    audioContent = textResponse.audioContent;
  }
  
  return { 
    storyText: processedStory.displayText, // Return clean text for UI
    audioContent,
    generatedImage: generatedImageBase64 // Include generated image for surprise mode
  };
}

// ✅ DUAL-MODE SERVERLESS FUNCTION - CRITICAL FOR STREAMING WORKFLOW
module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    // Mode 1: Client requests story generation
    try {
      const { heroName, promptSetup, promptRising, promptClimax, heroImage, age, surpriseMode } = req.body;
      
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
      const { storyText, audioContent, generatedImage } = await generateStoryAndAudio({
        heroName, promptSetup, promptRising, promptClimax, heroImage, age, surpriseMode
      });

      // Return story text, Base64 audio, and generated image (if any) for the client to handle
      const response = {
        story: storyText,
        audio: audioContent.toString('base64'),
        // Calculate estimated duration (rough approximation: ~150 words per minute)
        duration: Math.ceil(storyText.split(' ').length / 2.5), // seconds
        fileSize: audioContent.length
      };
      
      // Include generated image for surprise mode
      if (generatedImage) {
        response.generatedImage = generatedImage;
      }
      
      res.status(200).json(response);

    } catch (error) {
      console.error('Error in story generation:', error);
      res.status(500).json({ message: 'Failed to generate story and audio.' });
    }

  } else if (req.method === 'GET') {
    // Mode 2: Yoto servers request audio stream
    try {
      const { heroName, promptSetup, promptRising, promptClimax, heroImage, age, audioOnly } = req.query;

      if (!audioOnly || audioOnly !== 'true') {
        return res.status(400).json({ message: 'This endpoint is for audio streaming only.' });
      }

      console.log("Streaming audio for Yoto servers...");
      // Re-generate the audio on-demand using the same parameters
      const { audioContent } = await generateStoryAndAudio({
        heroName, promptSetup, promptRising, promptClimax, heroImage, age
      });

      // ❗ CRITICAL: Set the correct headers for audio streaming
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioContent.length);
      // Cache the response to reduce load and improve performance
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

      // Send the audio buffer as the response
      res.status(200).send(audioContent);

    } catch (error) {
      console.error('Error in audio streaming:', error);
      res.status(500).json({ message: 'Failed to stream audio.' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};
