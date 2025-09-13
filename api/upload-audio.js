import 'dotenv/config';
import cloudinary from 'cloudinary';

// Explicitly configure Cloudinary with environment variables
// This is the fix to ensure the SDK can find the credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { audioBlob } = req.body;

    // Use the Cloudinary uploader to upload the base64 audio string
    const result = await cloudinary.v2.uploader.upload(audioBlob, {
      resource_type: "video", // Cloudinary treats audio as a video resource type
      folder: "yoto_storyforge", // Optional: a folder to store the files
      format: "mp3"
    });

    res.status(200).json({ mediaUrl: result.secure_url });

  } catch (error) {
    console.error("Error during Cloudinary upload:", error);
    res.status(500).json({ message: "An error occurred during audio upload to Cloudinary." });
  }
}