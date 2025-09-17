// Separate API endpoint for handling large image uploads
// This helps break down the payload size by uploading images separately

const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv/config');

// Set up Google AI (Gemini) Client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { heroImage, sceneImage, imageType } = req.body;
    
    let result = {
      characterDescription: null,
      sceneDescription: null
    };

    // Analyze images separately to get descriptions
    if (heroImage && (imageType === 'character' || imageType === 'both')) {
      result.characterDescription = await analyzeCharacterImage(heroImage);
    }
    
    if (sceneImage && (imageType === 'scene' || imageType === 'both')) {
      result.sceneDescription = await analyzeSceneImage(sceneImage);
    }

    console.log('🖼️ Image analysis complete:', {
      hasCharacterDescription: !!result.characterDescription,
      hasSceneDescription: !!result.sceneDescription
    });

    res.status(200).json(result);

  } catch (error) {
    console.error('Error in image analysis:', error);
    res.status(500).json({ 
      message: 'Failed to analyze images',
      error: error.message 
    });
  }
};