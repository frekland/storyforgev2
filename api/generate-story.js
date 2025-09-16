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

// Helper function to clean story text for OpenAI TTS
function processStoryForTTS(storyText) {
  // Clean text for natural speech - OpenAI TTS handles this well
  const cleanText = storyText
    // Remove asterisks and other formatting
    .replace(/\*/g, '')
    .replace(/[^a-zA-Z0-9\s.,!?;:'"-]/g, '')
    // Fix spacing and punctuation
    .replace(/\s+/g, ' ')
    .replace(/([.!?])([A-Z])/g, '$1 $2')
    .trim();

  return cleanText; // OpenAI TTS doesn't need SSML
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

  // Process story text for TTS
  const cleanStoryText = processStoryForTTS(storyText);
  
  // Get age-appropriate voice settings
  const voiceSettings = getVoiceSettings(age);
  
  console.log('🎵 Generating audio with OpenAI TTS:', {
    voice: voiceSettings.voice,
    speed: voiceSettings.speed,
    textLength: cleanStoryText.length
  });
  
  // Convert Story Text to Speech using OpenAI TTS (with Google TTS fallback)
  let audioContent;
  
  if (USE_OPENAI_TTS) {
    try {
      console.log('🎵 Attempting OpenAI TTS...');
      audioContent = await generateOpenAITTS(cleanStoryText, voiceSettings);
      console.log('✅ OpenAI TTS successful, using OpenAI audio');
    } catch (openaiError) {
      console.warn('⚠️ OpenAI TTS failed, falling back to Google TTS:', openaiError.message);
      try {
        audioContent = await generateGoogleTTS(cleanStoryText, age);
        console.log('✅ Google TTS fallback successful');
      } catch (googleError) {
        console.error('❌ Both TTS services failed:', googleError.message);
        throw new Error(`Both TTS services failed. OpenAI: ${openaiError.message.substring(0, 100)}... Google: ${googleError.message}`);
      }
    }
  } else {
    console.log('🎵 Using Google TTS (OpenAI disabled)');
    audioContent = await generateGoogleTTS(cleanStoryText, age);
  }
  
  return { 
    storyText: cleanStoryText, // Return clean text for UI
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
    audioContent = Buffer.from(await ttsResponse.arrayBuffer());
    
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

// Google TTS Fallback Function - Updated to match Yoto's official example
async function generateGoogleTTS(cleanStoryText, age) {
  console.log('🎵 Generating audio with Google TTS fallback (MP3 format for Yoto compatibility)');
  
  const voiceSettings = {
    languageCode: 'en-GB',
    name: age === '3' ? 'en-GB-Wavenet-A' : age === '6' ? 'en-GB-Wavenet-C' : 'en-GB-Wavenet-B',
    ssmlGender: age === '9' || age === '12' ? 'MALE' : 'FEMALE'
  };
  
  const request = {
    input: { text: cleanStoryText },
    voice: voiceSettings,
    audioConfig: {
      audioEncoding: 'MP3',           // Changed to MP3 to match Yoto's example
      sampleRateHertz: 22050,         // Same as Yoto's example (22kHz)
      speakingRate: age === '3' ? 0.85 : age === '6' ? 0.9 : 0.95,
      volumeGainDb: 2.0
    }
  };
  
  const [response] = await ttsClient.synthesizeSpeech(request);
  
  // Return MP3 data directly (no WAV header needed)
  const mp3Data = response.audioContent;
  
  console.log('✅ Google TTS generation successful:', {
    audioSize: mp3Data.length,
    format: 'mp3',
    sampleRate: '22050Hz',
    encoding: 'MP3'
  });
  
  return mp3Data;
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
      
      const { heroName, promptSetup, promptRising, promptClimax, heroImage, age, audioOnly } = req.query;

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
        heroName, promptSetup, promptRising, promptClimax, heroImage, age
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
