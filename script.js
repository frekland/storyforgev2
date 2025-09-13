// Function to create a new playlist on Yoto
const createYotoPlaylist = async (storyText, imageBase64, audioBase64, token) => {
    // Trim the token to remove any leading/trailing whitespace
    const cleanedToken = token.trim();
    
    // Step 1: Upload custom icon or cover image if provided
    let coverImageUrl = null;
    if (imageBase64) {
        const mimeType = imageBase64.substring(imageBase64.indexOf(":") + 1, imageBase64.indexOf(";"));
        const imageFile = new Blob([new Uint8Array(atob(imageBase64.split(',')[1]).split('').map(char => char.charCodeAt(0)))], { type: mimeType });

        const uploadUrl = new URL("https://api.yotoplay.com/media/coverImage/user/me/upload");
        uploadUrl.searchParams.set("autoconvert", "true");

        const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            headers: {
                // Use the cleaned token here
                Authorization: `Bearer ${cleanedToken}`,
                "Content-Type": mimeType,
            },
            body: imageFile,
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Failed to upload cover image: ${errorText}`);
        }
        const uploadResult = await uploadResponse.json();
        coverImageUrl = uploadResult.coverImage.mediaUrl;
    }

    // Step 2: Upload the audio using our new proxy endpoint
    const audioUrl = await uploadAudioFile(audioBase64, cleanedToken); // Pass the cleaned token to the proxy function

    // Step 3: Create the playlist content body
    const chapters = [{
        key: "01",
        title: "Your Epic Tale",
        tracks: [{
            key: "01",
            title: "Chapter One",
            trackUrl: audioUrl,
            type: "stream",
            format: "mp3",
            display: { icon16x16: "yoto:#ZuVmuvnoFiI4el6pBPvq0ofcgQ18HjrCmdPEE7GCnP8" }
        }],
        display: { icon16x16: "yoto:#ZuVmuvnoFiI4el6pBPvq0ofcgQ18HjrCmdPEE7GCnP8" }
    }];

    const contentBody = {
        title: document.getElementById('heroName').value || 'New Storyforge Tale',
        content: { chapters },
        metadata: {
            description: storyText.substring(0, 100) + '...',
        },
    };

    if (coverImageUrl) {
        contentBody.metadata.cover = { imageL: coverImageUrl };
    }

    // Step 4: Send the final POST request to create the playlist
    const createResponse = await fetch("https://api.yotoplay.com/content", {
        method: "POST",
        headers: {
            // Use the cleaned token again
            Authorization: `Bearer ${cleanedToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(contentBody),
    });

    if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create playlist: ${errorText}`);
    }

    return await createResponse.json();
};