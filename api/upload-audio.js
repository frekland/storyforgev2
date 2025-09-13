import 'dotenv/config';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { audioBlob, token } = req.body;

    if (!audioBlob || !token) {
        return res.status(400).json({ message: 'Missing audioBlob or token' });
    }

    const uploadUrl = new URL("https://api.yotoplay.com/media/audioFile/user/me/upload");
    uploadUrl.searchParams.set("autoconvert", "true");

    // Convert the base64 audio string to a buffer
    const base64Data = audioBlob.split(',')[1];
    const audioBuffer = Buffer.from(base64Data, 'base64');
    
    // Pass the buffer directly to the fetch body
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "audio/mp3",
      },
      body: audioBuffer,
    });

    if (!uploadResponse.ok) {
        // Attempt to parse the error response from Yoto API
        const errorText = await uploadResponse.text();
        console.error("Yoto API upload failed:", errorText);
        // This line is also corrected to return a more useful error message
        return res.status(uploadResponse.status).json({ message: `Failed to upload audio: ${errorText}` });
    }

    const uploadResult = await uploadResponse.json();
    res.status(200).json(uploadResult);

  } catch (error) {
    console.error("Error during audio upload proxy:", error);
    res.status(500).json({ message: "An error occurred during audio upload." });
  }
}