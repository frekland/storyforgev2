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

// Helper function to get age-appropriate voice settings
function getVoiceSettings(age) {
  switch (age) {
    case '3':
      return {
        languageCode: 'en-US',
        name: 'en-US-Casual-K', // Warm, friendly female voice
        ssmlGender: 'FEMALE'
      };
    case '6':
      return {
        languageCode: 'en-US',
        name: 'en-US-Journey-F', // Clear, engaging female voice
        ssmlGender: 'FEMALE'
      };
    case '9':
      return {
        languageCode: 'en-US',
        name: 'en-US-Journey-D', // Professional, engaging voice
        ssmlGender: 'MALE'
      };
    case '12':
      return {
        languageCode: 'en-US',
        name: 'en-US-Studio-O', // Mature, sophisticated voice
        ssmlGender: 'FEMALE'
      };
    default:
      return {
        languageCode: 'en-US',
        name: 'en-US-Journey-F',
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

  // Age-appropriate SSML processing
  let processedText = cleanText;
  
  // Add dramatic emphasis for exciting parts
  processedText = processedText
    .replace(/(!)/g, '<emphasis level="strong">$1</emphasis><break time="0.3s"/>')
    .replace(/(\?)/g, '<emphasis level="moderate">$1</emphasis><break time="0.2s"/>')
    .replace(/("[^"]*")/g, '<prosody pitch="+1st" rate="0.95">$1</prosody>') // Dialogue with slight pitch change
    .replace(/(suddenly|amazing|wonderful|magical|incredible)/gi, '<emphasis level="strong">$1</emphasis>')
    .replace(/(whispered|quietly)/gi, '<prosody volume="-3dB">$1</prosody>')
    .replace(/(shouted|yelled|roared)/gi, '<prosody volume="+3dB" pitch="+2st">$1</prosody>');

  // Age-specific SSML enhancements
  let baseRate, basePitch, pauseTime;
  
  switch (age) {
    case '3':
      baseRate = '0.8';
      basePitch = '+3st';
      pauseTime = '0.8s';
      break;
    case '6':
      baseRate = '0.9';
      basePitch = '+1st';
      pauseTime = '0.6s';
      break;
    case '9':
      baseRate = '0.95';
      basePitch = '+0.5st';
      pauseTime = '0.4s';
      break;
    case '12':
      baseRate = '1.0';
      basePitch = '0st';
      pauseTime = '0.3s';
      break;
    default:
      baseRate = '0.9';
      basePitch = '+1st';
      pauseTime = '0.5s';
  }

  // Create SSML with age-appropriate settings
  const ssmlText = `<speak>
    <prosody rate="${baseRate}" pitch="${basePitch}" volume="+2dB">
      <break time="${pauseTime}"/>
      ${processedText}
      <break time="1s"/>
    </prosody>
  </speak>`;

  return {
    displayText: cleanText, // Clean text for UI display
    ttsText: ssmlText      // SSML-enhanced text for TTS
  };
}

// Helper function to generate story and audio
async function generateStoryAndAudio({ heroName, promptSetup, promptRising, promptClimax, heroImage, age }) {
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

  // Process story text for TTS and UI display
  const processedStory = processStoryForTTS(storyText, age);
  
  // Get age-appropriate voice settings
  const voiceSettings = getVoiceSettings(age);
  
  // Convert Story Text to Speech with SSML and improved voice settings
  const ttsRequest = {
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
  const [ttsResponse] = await ttsClient.synthesizeSpeech(ttsRequest);
  const audioContent = ttsResponse.audioContent;
  
  return { 
    storyText: processedStory.displayText, // Return clean text for UI
    audioContent 
  };
}

// ✅ DUAL-MODE SERVERLESS FUNCTION - CRITICAL FOR STREAMING WORKFLOW
module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    // Mode 1: Client requests story generation
    try {
      const { heroName, promptSetup, promptRising, promptClimax, heroImage, age } = req.body;
      
      // Validate input
      if (!heroName || !promptSetup) {
        return res.status(400).json({ message: 'Missing required story parameters.' });
      }

      console.log("Generating story for client...");
      const { storyText, audioContent } = await generateStoryAndAudio({
        heroName, promptSetup, promptRising, promptClimax, heroImage, age
      });

      // Return story text and Base64 audio for the client to handle
      res.status(200).json({
        story: storyText,
        audio: audioContent.toString('base64'),
        // Calculate estimated duration (rough approximation: ~150 words per minute)
        duration: Math.ceil(storyText.split(' ').length / 2.5), // seconds
        fileSize: audioContent.length
      });

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
