import 'dotenv/config';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { audioBlob, token } = req.body;

    const uploadUrl = new URL("https://api.yotoplay.com/media/audioFile/user/me/upload");
    uploadUrl.searchParams.set("autoconvert", "true");

    // Convert base64 audio to a buffer
    const audioBuffer = Buffer.from(audioBlob.split(',')[1], 'base64');

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "audio/mp3",
      },
      body: audioBuffer,
    });

    if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("Yoto API upload failed:", errorText);
        return res.status(uploadResponse.status).json({ message: `Failed to upload audio: ${errorText}` });
    }

    const uploadResult = await uploadResponse.json();
    res.status(200).json(uploadResult);

  } catch (error) {
    console.error("Error during audio upload proxy:", error);
    res.status(500).json({ message: "An error occurred during audio upload." });
  }
}