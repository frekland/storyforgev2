import { GoogleGenerativeAI } from "@google/generative-ai";
import textToSpeech from '@google-cloud/text-to-speech';
import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';

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

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Determine if this is a GET request for audio only
    const audioOnly = req.method === 'GET' && req.query.audioOnly === 'true';

    // Get input from request body for POST, or query params for GET
    const { heroName, promptSetup, promptRising, promptClimax, heroImage, age } = req.method === 'POST' ? req.body : req.query;

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

    // --- Part 1: Generate Story with Gemini (for POST requests) ---
    let storyText;
    if (!audioOnly) {
        const textPrompt = `
        You are a master storyteller for children. Write a short, exciting, and fun story (around ${storyLength} words) based on the following prompts. Write in ${readingLevel}. If a prompt is empty, invent that part of the story yourself.

        - Hero's Name: ${heroName || 'a mysterious hero'}
        - The Beginning: ${promptSetup || 'a surprising place'}
        - The Challenge: ${promptRising || 'an unexpected problem'}
        - The Climax: ${promptClimax || 'a clever solution'}
        - The Hero/Monster in the Story: Incorporate the creature or character from the accompanying image into the story. Describe it concisely. The description of the creature should be woven naturally into the narrative and should not be a long, separate paragraph. Let the image drive a key character or element.
        `;
        
        const promptParts = [
            { text: textPrompt },
        ];

        if (heroImage) {
            console.log("Analyzing user's drawing...");
            const mimeType = heroImage.substring(heroImage.indexOf(":") + 1, heroImage.indexOf(";"));
            const imagePart = fileToGenerativePart(heroImage, mimeType);
            promptParts.push(imagePart);
        }
        
        console.log("Generating story with Gemini...");
        const result = await model.generateContent({ contents: [{ role: "user", parts: promptParts }] });
        storyText = (await result.response).text();
        console.log("Story generated successfully.");
    }

    // --- Part 2: Convert Story Text to Speech ---
    console.log("Converting story text to audio...");
    const ttsRequest = {
      input: { text: storyText || req.query.storyText || "A brave hero went on an adventure." }, // Use storyText if available, otherwise a placeholder
      voice: { languageCode: 'en-GB', name: 'en-GB-Chirp3-HD-Gacrux', ssmlGender: 'FEMALE' },
      audioConfig: { audioEncoding: 'MP3' },
    };
    const [ttsResponse] = await ttsClient.synthesizeSpeech(ttsRequest);
    const audioContent = ttsResponse.audioContent.toString('base64');
    console.log("Audio created successfully.");
    
    // --- Part 3: Send Both Text and Audio to the Front-End or just audio for streaming ---
    if (audioOnly) {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.status(200).send(Buffer.from(audioContent, 'base64'));
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