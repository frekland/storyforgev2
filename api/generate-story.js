import { GoogleGenerativeAI } from "@google/generative-ai";
import textToSpeech from '@google-cloud/text-to-speech';
import 'dotenv/config';

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

// Helper function to generate story and audio
async function generateStoryAndAudio({ heroName, promptSetup, promptRising, promptClimax, heroImage, age }) {
  // Determine the story length and reading level based on the age
  let storyLength = 150;
  let readingLevel = "a simple, conversational style for young children";
  switch (age) {
    case '6':
      storyLength = 500;
      readingLevel = "a slightly more detailed, engaging style for emerging readers";
      break;
    case '9':
      storyLength = 1000;
      readingLevel = "a captivating narrative with more complex vocabulary and sentence structures for confident readers";
      break;
    case '12':
      storyLength = 2000;
      readingLevel = "a rich, descriptive, and mature style suitable for young adult readers";
      break;
  }

  // Generate Story with Gemini
  const textPrompt = `
    You are a master storyteller for children. Write a short, exciting, and fun story (around ${storyLength} words) based on the following prompts. Write in ${readingLevel}. If a prompt is empty, invent that part of the story yourself.

    - Hero's Name: ${heroName || 'a mysterious hero'}
    - The Beginning: ${promptSetup || 'a surprising place'}
    - The Challenge: ${promptRising || 'an unexpected problem'}
    - The Climax: ${promptClimax || 'a clever solution'}
    ${heroImage ? '- The Hero/Monster in the Story: Incorporate the creature or character from the accompanying image into the story.' : ''}
  `;
  
  const promptParts = [{ text: textPrompt }];

  if (heroImage) {
    const mimeType = heroImage.substring(heroImage.indexOf(":") + 1, heroImage.indexOf(";"));
    const imagePart = fileToGenerativePart(heroImage, mimeType);
    promptParts.push(imagePart);
  }
  
  const result = await model.generateContent({ contents: [{ role: "user", parts: promptParts }] });
  const storyText = (await result.response).text();

  // Convert Story Text to Speech
  const ttsRequest = {
    input: { text: storyText },
    voice: { languageCode: 'en-GB', name: 'en-GB-Chirp3-HD-Gacrux', ssmlGender: 'FEMALE' },
    audioConfig: { audioEncoding: 'MP3' },
  };
  const [ttsResponse] = await ttsClient.synthesizeSpeech(ttsRequest);
  const audioContent = ttsResponse.audioContent;
  
  return { storyText, audioContent };
}

// ✅ DUAL-MODE SERVERLESS FUNCTION - CRITICAL FOR STREAMING WORKFLOW
export default async function handler(req, res) {
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
}
    } else {
        res.status(200).json({ 
          story: storyText,
          audio: audioContent 
        });
    }

  } catch (error) {
    console.error("Error during API call:", error);
    res.status(500).json({ message: "Error generating story or audio" });
  }
}