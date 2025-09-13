import 'dotenv/config';
import cloudinary from 'cloudinary';

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { audioBlob } = req.body;

    if (!audioBlob) {
      return res.status(400).json({ message: 'Missing audioBlob' });
    }

    // Explicitly check for configuration before attempting upload
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error("Cloudinary credentials are not set correctly.");
      return res.status(500).json({ message: 'Cloudinary credentials missing.' });
    }

    const result = await cloudinary.v2.uploader.upload(audioBlob, {
      resource_type: "video",
      folder: "yoto_storyforge",
      format: "mp3"
    });

    res.status(200).json({ mediaUrl: result.secure_url });

  } catch (error) {
    // Log the full error object for detailed debugging
    console.error("Error during Cloudinary upload:", error);
    res.status(500).json({ message: "An error occurred during audio upload to Cloudinary. Please check the Vercel logs for details." });
  }
}