This file is a merged representation of the entire codebase, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
.gitignore
api/generate-story.js
api/test-audio.js
api/upload-image.js
debug-audio.html
Handover.md
index.html
package.json
public/debug-audio.html
public/test-streaming.html
RELEASE_NOTES_v2.1.0.md
script.js
styles.css
test-audio-fix.html
test-streaming.html
tokens.js
vercel.json
vite.config.js
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="Handover.md">
# **The Storyforge Project: An Architectural Analysis and Recovery Guide for Yoto API Integration**

## **Section 1: The Yoto API Demystified: A Strategic Integration Guide**

Successful integration with any third-party API requires a precise understanding of its architecture, conventions, and undocumented behaviors. The Yoto API, while powerful, presents several unique characteristics that have consistently proven to be pitfalls for developers.1 This section serves as a definitive strategic guide, synthesizing official documentation, working code examples, and community-sourced intelligence to establish a robust mental model for interacting with the Yoto platform. Mastering these foundational principles is the first and most critical step toward resolving integration failures and building a resilient application.

### **The Two-Domain Architecture: A Core Point of Confusion**

The single most common source of 403 Forbidden errors stems from a fundamental misunderstanding of Yoto's core network architecture. Unlike many modern REST APIs that use a single base URL for all operations, the Yoto platform is bifurcated into two distinct, non-interchangeable domains.2 This separation increases the cognitive load on the developer and makes simple configuration errors a frequent cause of failure. The official API documentation has, at times, contributed to this confusion by incorrectly listing the resource domain as the server URL for authentication endpoints, a mistake noted by the developer community.1

* Authentication & Authorization Domain: https://login.yotoplay.com  
  This domain is exclusively responsible for all user-facing authentication and programmatic token exchanges. It hosts the /authorize endpoint, to which the user is redirected to grant application permissions, and the /oauth/token endpoint, which the application calls to exchange authorization codes or refresh tokens. All authentication-related network requests must be directed to this URL.2 Any attempt to call a data resource endpoint (like  
  /content) on this domain will fail.  
* API Resource Domain: https://api.yotoplay.com  
  This domain is used for all data and content operations after a valid OAuth 2.0 Bearer token has been successfully acquired. It hosts the endpoints for managing content (/content), querying devices (/device-v2/devices/mine), and handling media uploads (/media/\*).4 Attempting to perform an authentication step, such as exchanging a code for a token, at this domain will result in an error.

Treating this two-domain architecture as a non-negotiable principle is paramount. The primary troubleshooting step for any 403 Forbidden error should always be to verify that the request is being sent to the correct domain for its specific purpose.

### **Authentication Masterclass: The Authorization Code Flow with PKCE**

All content creation and management within the Yoto ecosystem is performed on behalf of a user, meaning every API request must be tied to a user's context. Community logs confirm that the only supported OAuth 2.0 grant type for this purpose is authorization\_code.1 Attempts to use the

client\_credentials grant, which is intended for machine-to-machine communication, are explicitly rejected with an "unauthorized\_client" error message.1

For public clients, such as browser-based single-page applications like Storyforge, the Authorization Code Flow must be secured with Proof Key for Code Exchange (PKCE). This security extension prevents authorization code interception attacks. The complete, correct flow is as follows 2:

1. **Generate PKCE Challenge:** The client application generates a cryptographically random code\_verifier and a corresponding code\_challenge. The code\_verifier must be temporarily stored where it can be retrieved after the user is redirected back to the application, with sessionStorage being the appropriate mechanism.  
2. **Redirect User for Authorization:** The user is redirected to https://login.yotoplay.com/authorize. The request must include the client\_id, the redirect\_uri (which must exactly match a URL registered in the Yoto Developer Dashboard), the code\_challenge, and code\_challenge\_method=S256.  
3. **Request Essential Scopes:** The scope parameter is critical for defining the application's permissions. To ensure a seamless user experience, two scopes are essential:  
   * offline\_access: This scope is required to receive a long-lived refresh\_token. Without it, the API will only issue a short-lived access\_token, forcing the user to log in again after it expires.2  
   * write:myo: This scope grants the application permission to create and update "Make Your Own" (MYO) content via the /content endpoint.2  
4. **Exchange Code for Tokens:** Upon successful authorization, the user is redirected back to the redirect\_uri with an authorization\_code in the query parameters. The application then makes a POST request to https://login.yotoplay.com/oauth/token, sending the authorization\_code along with the stored code\_verifier.  
5. **Store Tokens Securely:** The API responds with an access\_token, a refresh\_token, and an expires\_in value. These tokens should be stored securely, for example in localStorage, to maintain the user's session.

A final but crucial configuration detail, highlighted by the Storyforge deployment history, is the management of "Allowed Callback URLs" in the Yoto Developer Dashboard. Because platforms like Vercel can generate unique URLs for each deployment, a mismatch between the redirect\_uri sent in the authorization request and the registered URLs is a common post-deployment failure. The successful resolution involved adding both the primary project URL (e.g., storyforgev2.vercel.app) and the specific deployment URL (e.g., storyforgev2-freklands-projects.vercel.app) to the allowed list, separated by a comma.5

### **The POST /content Endpoint: The Singular Workhorse for Playlist Management**

A significant source of developer confusion, likely exacerbated by the tendency of AI coding assistants to invent plausible-sounding API routes, is the identification of the correct endpoint for managing playlists. Community discussions are filled with examples of developers attempting to use non-existent endpoints such as /v1/playlists or /v1/myo/streaming-tracks.1

The official documentation and validated technical guides confirm that POST /content is the single, versatile endpoint used for both **creating** a new playlist and **updating** an existing one.2 The API distinguishes between these two operations based on the presence of a

cardId in the request body.

* **To Create a Playlist:** Send a POST request to https://api.yotoplay.com/content with a request body that *omits* the cardId field.  
* **To Update a Playlist:** Send a POST request to https://api.yotoplay.com/content with a request body that *includes* the cardId of the playlist to be modified.

This dual-purpose design is efficient but requires a precise understanding of a critical, non-obvious behavior: updates are not partial patches but complete replacements. When an update request is sent with a cardId, the entire content and metadata of the existing card are overwritten with the contents of the request body. This "Full Replacement" mandate has profound implications for application architecture. Any attempt to add a new chapter by sending only the new chapter's data will result in the deletion of all existing chapters.1 This behavior is the root cause of many

500 Internal Server Error responses, which can occur if the submitted partial data creates an inconsistent state (e.g., the top-level metadata.media.duration no longer matches the sum of the durations of the single chapter provided).1

Therefore, the only correct pattern for updating a playlist is a three-step "Get, Modify, Post" sequence:

1. **GET:** Fetch the complete, current playlist object using GET /content/{cardId}.  
2. **Modify:** Modify the fetched object in the application's memory (e.g., add a new chapter to the chapters array).  
3. **Post:** Recalculate any dependent top-level metadata (such as total duration and fileSize) and then POST the entire, modified object back to the /content endpoint, including the original cardId.

### **Critical Distinction: Streaming vs. Transcoded Audio Workflows**

The Yoto API provides two fundamentally different workflows for handling audio content. Choosing the incorrect workflow is the primary architectural flaw in the Storyforge project's current implementation and a common point of confusion for developers creating dynamic content applications.1

* **Streaming Workflow:** This method is designed for dynamic, on-the-fly audio generation where the audio content is hosted on an external server and does not need to be permanently stored by Yoto. This is the correct model for applications like Storyforge, which generate unique audio for each user request. In this workflow, a track object within the POST /content request body must have its type field set to "stream". The trackUrl must be a publicly accessible HTTPS URL that, when called by Yoto's servers, immediately returns an audio stream (e.g., an MP3 file) with the appropriate Content-Type: audio/mpeg header.2  
* **Transcoding Workflow:** This method is designed for uploading static, pre-existing audio files (e.g., MP3s from a user's computer) to be ingested, processed, and hosted by Yoto's infrastructure. This is a more complex, multi-step asynchronous process that involves requesting a temporary upload URL, uploading the file, and then polling an endpoint until Yoto's servers have finished transcoding the audio into a compatible format.2 The final  
  trackUrl in this workflow is not an HTTPS link but a Yoto-specific identifier prefixed with yoto:\#, and the track type must be set to "audio".

The following tables provide a clear diagnostic guide for common API errors and a side-by-side comparison of the two audio workflows.

**Table 1: Yoto API Error Resolution Matrix**

| HTTP Code | Error Message / Context | Most Likely Cause (in Yoto context) | First Troubleshooting Step |
| :---- | :---- | :---- | :---- |
| 403 Forbidden | Received when trying to access any resource or authentication endpoint. | **Incorrect Domain or Endpoint.** Using api.yotoplay.com for auth, login.yotoplay.com for resources, or a non-existent endpoint like /v1/playlists.1 | Verify the request URL against the correct domain (login.yotoplay.com for auth, api.yotoplay.com for data) and ensure the endpoint path is valid according to official documentation.2 |
| 401 Unauthorized | Received on any resource endpoint call. | **Expired, Invalid, or Missing Access Token.** The Authorization: Bearer {token} header is incorrect or the token has expired.2 | Trigger the token refresh logic. If it fails or the error persists, the user must re-authenticate through the full OAuth flow. |
| 500 Internal Server Error | Often received during a POST /content update request. | **Inconsistent Metadata.** The request body represents an invalid state, e.g., adding a new chapter but failing to update the top-level metadata.media.duration to the new total.1 | Ensure the update follows the "Get, Modify, Post" pattern. Fetch the full card object, modify it, recalculate all metadata, and post the complete object back.2 |
| unauthorized\_client | Received from the /oauth/token endpoint. | **Unsupported Grant Type.** The application is attempting to use the client\_credentials grant type for a user-centric action.1 | Ensure the application is using the authorization\_code grant type with PKCE for all user-authenticated flows.2 |

**Table 2: Audio Workflow Comparison: Streaming vs. Transcoding**

| Attribute | Streaming Workflow | Transcoding Workflow |
| :---- | :---- | :---- |
| **Use Case** | Dynamic, on-the-fly audio generation (e.g., AI TTS, live radio).2 | Uploading and storing static, pre-existing audio files (e.g., user's MP3s).8 |
| **Track type value** | "stream" | "audio" |
| **trackUrl format** | A public HTTPS URL (e.g., https://myapp.com/api/getAudio?id=123).2 | A Yoto-specific identifier (e.g., yoto:\#{transcodedSha256}).8 |
| **Key API Endpoints** | POST /content | 1\. GET /media/transcode/audio/uploadUrl 2\. PUT to the temporary URL 3\. GET /media/upload/{uploadId}/transcoded (polling) 4\. POST /content |
| **Yoto Server Action** | Yoto's servers fetch and stream the audio from the trackUrl at playback time. | Yoto's servers download, transcode, and permanently store the audio file. |
| **Pros** | No storage limits on Yoto's side; content can be generated in real-time. | Audio is hosted by Yoto for high availability; enables offline playback once downloaded to a Player. |
| **Cons** | Requires a highly available, public-facing server to serve the audio; no offline playback on the Player. | Involves a complex, asynchronous multi-step API process; subject to Yoto's file size and duration limits.9 |

## **Section 2: Architectural Diagnosis of the 'StoryForge' Project**

A forensic analysis of the Storyforge project's current state, guided by the principles established in the preceding section, reveals that its failures are not the result of minor bugs but of fundamental architectural flaws. The observed symptoms of audio corruption and playlist duplication are direct consequences of a mismatch between the application's intent and its implementation of the Yoto API's core workflows.

### **Diagnosing the Audio Failure: A Mismatch of Intent and Implementation**

The primary goal of Storyforge is to serve dynamic, AI-generated audio from a Vercel serverless function.6 As defined in Section 1.4, the only correct API pattern for this use case is the

**Streaming Workflow**. However, the available evidence, particularly the error log indicating that a transcodedAudio object was null, proves that the current implementation is incorrectly attempting to follow the **Transcoding Workflow**.6 This architectural mismatch is the direct root cause of the audio failure.

The chain of events leading to the corrupted, two-second audio track can be reconstructed as follows:

1. The client-side application correctly calls the /api/generate-story serverless function to create the story.  
2. This serverless function, instead of simply generating and returning an audio stream, incorrectly acts as a client to the Yoto API itself. It attempts to initiate the multi-step transcoding process designed for static files.  
3. This process is destined to fail. The transcoding flow requires uploading a finite file and then polling for a completion status. It is not designed to handle a real-time, on-demand audio stream. The polling step (GET /media/upload/{uploadId}/transcoded) inevitably times out or returns an error because the "upload" never completes in the way the API expects.  
4. Consequently, the serverless function's attempt to get a transcodedAudio object fails, resulting in a null or undefined value.  
5. This null value is then passed back to the client-side application.  
6. The client-side code, expecting a valid transcoded object, attempts to construct the POST /content request payload. It likely generates a malformed trackUrl (e.g., yoto:\#null) or omits required metadata fields like duration and fileSize.  
7. The Yoto API receives this invalid or incomplete request. In a lenient error-handling scenario, it may create a blank or minimal placeholder track, which manifests as the observed two-second unplayable clip.

This analysis demonstrates that the entire audio pipeline is architecturally flawed. A complete refactoring is required to properly separate concerns. The serverless function's sole responsibility should be to generate and serve an audio stream. The client application's responsibility is to take the public URL of that stream and use it within a correctly formatted type: "stream" request to the Yoto API.

### **Solving the Playlist Update Loop: The "Full Replacement" Mandate**

The second critical failure is that each new story creates an entirely new "StoryForge" playlist, contrary to the goal of adding new stories as chapters to a single, persistent playlist.6 This behavior is a direct symptom of failing to adhere to the "Full Replacement" mandate and the "Get, Modify, Post" pattern for updates, as detailed in Section 1.3.

The current implementation is clearly not performing the required sequence. It is almost certainly executing one of two incorrect operations:

1. It is always calling POST /content *without* a cardId in the request body. This is the explicit instruction to the API to *create a new playlist* every time.  
2. Alternatively, it may be finding the correct cardId but then sending a request body containing only the *new* chapter in the content.chapters array. As per the "Full Replacement" rule, this would overwrite all previous chapters, leaving a playlist that always contains only the most recent story. While the user-reported symptom is "a new playlist is created," this alternative failure mode is a common pitfall that leads to a similar user experience of lost content.1

This flaw highlights a need to implement a stateful update process on the client side. The application must first query the user's library to determine if a "StoryForge" playlist already exists. If it does, the application must fetch its full content, append the new chapter, recalculate all necessary metadata, and then post the complete, updated object back to the API.

### **Review of Client-Side Logic and Deployment Environment**

The project's Vercel deployment history provides crucial context.5 The developer has already navigated and solved a series of complex build and configuration issues, including Vite's

ERR\_MODULE\_NOT\_FOUND, client-side module resolution errors ("bare specifier"), and OAuth callback URL mismatches. These past struggles, particularly the incorrect attempt to import a serverless function directly into index.html via a \<script\> tag, suggest a potential for lingering confusion in the separation of client-side and server-side responsibilities.

The proposed solution must therefore be exceptionally clear about this separation. The provided code examples must explicitly delineate what logic belongs in the browser (handling user interaction, managing tokens, and making API calls to Yoto) and what logic belongs in the serverless function (responding to requests from the browser and from Yoto's servers). The communication between these two parts of the application must be a clean, well-defined fetch request, where the serverless function acts as a pure API endpoint. Furthermore, the new architecture must be fully compatible with the established Vercel deployment configuration, which includes a specific Node.js version (20.x), a custom build command (npx vite build), and a vite.config.js file to handle Node.js module externalization.5

## **Section 3: A Resilient Architecture for 'StoryForge': The Complete Solution**

This section presents the complete, robust, and evidence-based architectural solution to resolve the critical failures in the Storyforge project. The proposed design directly addresses the diagnostic findings from Section 2 by adhering strictly to the Yoto API best practices outlined in Section 1\. It includes a corrected architectural flow, detailed logic for refactoring the serverless function, and a full implementation of the stateful "Get, Modify, Post" pattern for playlist updates. The provided code examples are intended to be production-ready and serve as a definitive replacement for the faulty components.

### **The Corrected Architectural Flow**

The resilient architecture separates concerns cleanly between the client (browser) and the serverless function. This ensures that each component has a single, well-defined responsibility, eliminating the architectural flaws that led to the audio and playlist failures.

1. **User Interaction (Client):** The user fills out the story form on the web front-end and clicks "Forge Story\!".  
2. **Story Generation Request (Client to Serverless):** The client-side JavaScript sends a POST request to its own /api/generate-story endpoint. The body of this request contains the user's prompts (hero name, story arcs, image data, etc.).  
3. **Content Generation (Serverless):** The /api/generate-story function receives the prompts. It calls the Google Gemini API to generate the story text and the Google Cloud Text-to-Speech API to generate the corresponding audio. It then returns a JSON object to the client containing the story text and the raw audio data, typically as a Base64-encoded string.  
4. **Playlist Update Logic (Client):** Upon receiving the successful response from the serverless function, the client-side JavaScript executes the new createOrUpdateStoryForgePlaylist function. This function encapsulates the entire "Get, Modify, Post" logic.  
5. **Find Existing Playlist (Client to Yoto API):** The function first makes a GET request to https://api.yotoplay.com/content/mine to retrieve all of the user's MYO cards. It iterates through the results to find a playlist with the title "StoryForge". If found, it stores its cardId; otherwise, it proceeds with the creation flow.  
6. **Fetch Full Content (Client to Yoto API):** If a cardId was found, the function makes a GET request to https://api.yotoplay.com/content/{cardId} to fetch the complete, current playlist object.  
7. **Construct New Chapter (Client):** The client constructs the new chapter object for the newly generated story. Critically, the trackUrl is set to the public URL of the Vercel serverless function itself, with the story prompts encoded as query parameters (e.g., https://storyforgev2.vercel.app/api/generate-story?heroName=...\&audioOnly=true). The track's type is correctly set to "stream".  
8. **Merge and Recalculate (Client):** The new chapter is appended to the chapters array of the fetched playlist object (or a new playlist object if one didn't exist). The client then iterates through all tracks in all chapters to sum the total duration and fileSize, updating the top-level metadata.media object to maintain data consistency.  
9. **Create/Update Playlist (Client to Yoto API):** Finally, the client makes a POST request to https://api.yotoplay.com/content. The body of this request contains the entire, updated playlist object. If an existing cardId was found, it is included in the body to trigger an update; otherwise, it is omitted to trigger a creation.  
10. **Audio Stream Request (Yoto API to Serverless):** At a later time, when a user plays the new track, Yoto's servers will make a GET request to the trackUrl specified in Step 7\. The /api/generate-story function will detect this GET request, parse the story prompts from the query parameters, re-generate the audio on-the-fly, and stream it back with a Content-Type: audio/mpeg header.

### **Refactoring the /api/generate-story Endpoint**

The serverless function must be refactored to handle two distinct request types: a POST request from the application's front-end to generate content, and a GET request from Yoto's servers to stream audio. This dual-mode functionality is the key to resolving the audio corruption issue.

JavaScript

// /api/generate-story.js

// Assume 'generateStoryAndAudio' is a helper function that interacts  
// with Google Gemini and TTS APIs. It should return an object like:  
// { storyText: "...", audioContent: \<Buffer\> }

import { generateStoryAndAudio } from './\_lib/ai-handler';

export default async function handler(req, res) {  
    if (req.method \=== 'POST') {  
        // Mode 1: Handle content generation request from the client app.  
        try {  
            const { heroName, promptSetup, promptRising, promptClimax, age } \= req.body;  
              
            // Validate input  
            if (\!heroName ||\!promptSetup) {  
                return res.status(400).json({ message: 'Missing required story parameters.' });  
            }

            const { storyText, audioContent } \= await generateStoryAndAudio({  
                heroName,  
                promptSetup,  
                promptRising,  
                promptClimax,  
                age  
            });

            // Return story text and Base64 audio for the client to handle.  
            res.status(200).json({  
                story: storyText,  
                audio: audioContent.toString('base64'),  
                // We also return a pre-calculated duration for the client.  
                // This is an approximation; a more accurate method would be to use a library  
                // to parse the audio header, but this is sufficient for many cases.  
                // Assuming TTS API provides duration or we can estimate it.  
                duration: 180, // Placeholder: calculate or get from TTS API  
                fileSize: audioContent.length  
            });

        } catch (error) {  
            console.error('Error in story generation:', error);  
            res.status(500).json({ message: 'Failed to generate story and audio.' });  
        }

    } else if (req.method \=== 'GET') {  
        // Mode 2: Handle audio stream request from Yoto's servers.  
        try {  
            const { heroName, promptSetup, promptRising, promptClimax, age, audioOnly } \= req.query;

            if (\!audioOnly |

| audioOnly\!== 'true') {  
                 return res.status(400).json({ message: 'This endpoint is for audio streaming only.' });  
            }

            // Re-generate the audio on-the-fly using the same parameters.  
            // Note: This assumes the AI generation is deterministic or that slight  
            // variations are acceptable. For perfect consistency, the audio could be  
            // cached in a temporary store (e.g., Vercel Blob, S3) in the POST step.  
            const { audioContent } \= await generateStoryAndAudio({  
                heroName,  
                promptSetup,  
                promptRising,  
                promptClimax,  
                age  
            });

            // Set the correct headers for an audio stream.  
            res.setHeader('Content-Type', 'audio/mpeg');  
            res.setHeader('Content-Length', audioContent.length);  
            // Cache the response to reduce load and improve performance for repeated plays.  
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

            // Send the audio buffer as the response.  
            res.status(200).send(audioContent);

        } catch (error) {  
            console.error('Error in audio streaming:', error);  
            res.status(500).json({ message: 'Failed to stream audio.' });  
        }  
    } else {  
        res.setHeader('Allow',);  
        res.status(405).end(\`Method ${req.method} Not Allowed\`);  
    }  
}

### **Implementing createOrUpdateStoryForgePlaylist()**

This new, comprehensive function will live in the client-side JavaScript. It encapsulates the entire "Get, Modify, Post" workflow, ensuring that new stories are correctly added as chapters to a single, persistent "StoryForge" playlist.

JavaScript

// In your client-side script.js or a dedicated api-client.js module

/\*\*  
 \* Creates a new "StoryForge" playlist or adds a new story as a chapter to an existing one.  
 \* @param {object} storyData \- The data for the new story.  
 \* @param {string} storyData.heroName \- The name of the hero.  
 \* @param {string} storyData.storyText \- The full text of the story.  
 \* @param {number} storyData.duration \- The duration of the audio in seconds.  
 \* @param {number} storyData.fileSize \- The size of the audio in bytes.  
 \* @param {string} storyData.audioStreamUrl \- The public URL to the streaming audio endpoint.  
 \* @param {string} accessToken \- The user's valid Yoto access token.  
 \* @returns {Promise\<object\>} The JSON response from the Yoto API for the created/updated playlist.  
 \*/  
async function createOrUpdateStoryForgePlaylist(storyData, accessToken) {  
    const STORYFORGE\_PLAYLIST\_TITLE \= "StoryForge";

    // \--- Step 1: Find the existing "StoryForge" playlist \---  
    console.log("Searching for existing StoryForge playlist...");  
    const getMyoResponse \= await fetch("https://api.yotoplay.com/content/mine", {  
        headers: { 'Authorization': \`Bearer ${accessToken}\` }  
    });

    if (\!getMyoResponse.ok) {  
        throw new Error("Failed to fetch user's MYO cards.");  
    }

    const myoCards \= await getMyoResponse.json();  
    const existingPlaylistSummary \= myoCards.find(card \=\> card.title \=== STORYFORGE\_PLAYLIST\_TITLE);

    let playlistToUpdate \= null;  
    let cardId \= null;

    if (existingPlaylistSummary) {  
        // \--- Step 2: If found, fetch the full content of the existing playlist \---  
        cardId \= existingPlaylistSummary.cardId;  
        console.log(\`Found existing playlist with cardId: ${cardId}. Fetching full content...\`);  
          
        const getFullContentResponse \= await fetch(\`https://api.yotoplay.com/content/${cardId}\`, {  
            headers: { 'Authorization': \`Bearer ${accessToken}\` }  
        });

        if (\!getFullContentResponse.ok) {  
            throw new Error(\`Failed to fetch full content for cardId ${cardId}.\`);  
        }  
        playlistToUpdate \= await getFullContentResponse.json();  
    } else {  
        console.log("No existing StoryForge playlist found. Creating a new one.");  
        // \--- If not found, create the structure for a new playlist \---  
        playlistToUpdate \= {  
            title: STORYFORGE\_PLAYLIST\_TITLE,  
            content: {  
                chapters:  
            },  
            metadata: {  
                description: "A collection of epic tales from The Storyforge.",  
                media: {  
                    duration: 0,  
                    fileSize: 0  
                }  
            }  
        };  
    }

    // \--- Step 3: Construct the new chapter object \---  
    const newChapterKey \= (playlistToUpdate.content.chapters.length \+ 1).toString().padStart(2, '0');  
      
    const newChapter \= {  
        key: newChapterKey,  
        title: storyData.heroName,  
        overlayLabel: newChapterKey,  
        tracks:,  
        display: {  
            icon16x16: "yoto:\#ZuVmuvnoFiI4el6pBPvq0ofcgQ18HjrCmdPEE7GCnP8"  
        }  
    };

    // \--- Step 4: Merge the new chapter and recalculate metadata \---  
    playlistToUpdate.content.chapters.push(newChapter);

    const newTotalDuration \= playlistToUpdate.content.chapters.reduce((total, chapter) \=\> {  
        return total \+ chapter.tracks.reduce((subTotal, track) \=\> subTotal \+ (track.duration |

| 0), 0);  
    }, 0);

    const newTotalFileSize \= playlistToUpdate.content.chapters.reduce((total, chapter) \=\> {  
        return total \+ chapter.tracks.reduce((subTotal, track) \=\> subTotal \+ (track.fileSize |

| 0), 0);  
    }, 0);

    playlistToUpdate.metadata.media \= {  
        duration: newTotalDuration,  
        fileSize: newTotalFileSize,  
        readableFileSize: (newTotalFileSize / (1024 \* 1024)).toFixed(1)  
    };  
      
    // If updating, we must include the cardId at the root of the object.  
    if (cardId) {  
        playlistToUpdate.cardId \= cardId;  
    }  
      
    // \--- Step 5: POST the complete object back to the Yoto API \---  
    console.log(cardId? "Updating playlist..." : "Creating new playlist...");  
      
    const createOrUpdateResponse \= await fetch("https://api.yotoplay.com/content", {  
        method: "POST",  
        headers: {  
            'Authorization': \`Bearer ${accessToken}\`,  
            'Content-Type': 'application/json'  
        },  
        body: JSON.stringify(playlistToUpdate),  
    });

    if (\!createOrUpdateResponse.ok) {  
        const errorText \= await createOrUpdateResponse.text();  
        console.error("Yoto API Error:", errorText);  
        throw new Error(\`Failed to create or update playlist: ${errorText}\`);  
    }

    console.log("Playlist successfully created/updated\!");  
    return await createOrUpdateResponse.json();  
}

## **Section 4: Handover Protocol for Collaborative AI Development**

This document serves as a formal handover protocol and directive for a Large Language Model (LLM) assistant tasked with collaborating on the "Storyforge" project. Its purpose is to provide the necessary context, architectural constraints, and grounding resources to ensure the LLM can contribute safely, effectively, and without reintroducing the architectural flaws that have previously been resolved. Adherence to this protocol is mandatory for all code generation and architectural suggestions related to this project.

### **Project Mandate and Core Objective**

* **Project Name:** The Storyforge  
* **Primary Goal:** To assist in the development and enhancement of "The Storyforge," a full-stack web application that allows users to generate personalized, AI-narrated audio stories and add them to a "Make Your Own" (MYO) card via the Yoto API.6  
* **Core Functionality:** The application consists of a Vercel-hosted Vite front-end and a Node.js serverless function located in the /api directory. The application's primary loop involves:  
  1. Authenticating the user with their Yoto account.  
  2. Accepting story prompts and an optional image from the user.  
  3. Calling a serverless function (/api/generate-story) to generate story text (via Google Gemini) and audio (via Google Cloud TTS).  
  4. Creating or updating a single, persistent "StoryForge" playlist in the user's Yoto library, adding each new story as a new chapter.6

### **Immutable Architectural Principles (Constitution)**

The following principles are non-negotiable and must be strictly adhered to in all generated code and architectural recommendations. They are derived from a rigorous analysis of the Yoto API's behavior and documented best practices.

* **Rule 1 (Domains):** Authentication operations, specifically requests to the /authorize and /oauth/token endpoints, **MUST** use the base URL https://login.yotoplay.com. All other API resource operations (e.g., /content, /content/mine, /media/\*) **MUST** use the base URL https://api.yotoplay.com. These domains are not interchangeable.2  
* **Rule 2 (Authentication):** All API calls that access or modify user data **MUST** be authenticated with a Bearer token in the Authorization header. This token **MUST** be obtained via the OAuth 2.0 Authorization Code Flow with PKCE. The client\_credentials grant type is **NOT SUPPORTED** for this application's purpose and must not be used.1  
* **Rule 3 (Audio Handling):** All dynamically generated audio for this project **MUST** use the **Streaming Workflow**. This requires that any track object sent to the POST /content endpoint has its type field set to "stream" and its trackUrl field set to a publicly accessible HTTPS URL that serves raw audio data with a Content-Type: audio/mpeg header when called via a GET request. The multi-step Transcoding Workflow is **NOT TO BE USED** for the primary functionality of this project.2  
* **Rule 4 (Playlist Updates):** Updates to existing playlists **MUST** follow the "Get, Modify, Post" pattern. A POST /content request that includes a cardId in its body performs a **complete replacement** of the existing card's content and metadata. To add a chapter, the application must first fetch the full playlist object, append the new chapter in memory, recalculate all top-level metadata (duration, fileSize), and then post the entire, modified object back to the API. Suggesting a partial update or a "patch" is a violation of this principle.1

### **Canonical Data Schemas and Function Signatures**

To ensure consistency, all generated code must conform to the following structures.

* Playlist Object Schema (for POST /content)  
  This represents the structure of the object sent to create or update a playlist.  
  JSON  
  {  
    "cardId": "string (optional, for updates only)",  
    "title": "string",  
    "content": {  
      "chapters":,  
          "display": {  
            "icon16x16": "string (yoto:\#hash)"  
          }  
        }  
      \]  
    },  
    "metadata": {  
      "description": "string",  
      "media": {  
        "duration": "number (total seconds of all tracks)",  
        "fileSize": "number (total bytes of all tracks)",  
        "readableFileSize": "number"  
      }  
    }  
  }

* **Key Function Signatures:**  
  * Client-side: createOrUpdateStoryForgePlaylist(storyData: object, accessToken: string): Promise\<object\>  
  * Serverless: handler(req: VercelRequest, res: VercelResponse): Promise\<void\> (Must handle GET and POST methods as detailed in Section 3.2).

### **Known Anti-Patterns and Prohibited Actions**

To prevent regression and the reintroduction of known issues, the LLM assistant is explicitly prohibited from the following actions:

* **Endpoint Hallucination:** You are **PROHIBITED** from using, suggesting, or referencing any of the following non-existent Yoto API endpoints: /v1/playlists, /v1/myo/streaming-tracks, /v1/devices/mine, or any other plausible but undocumented variation. The only endpoint for creating and updating playlists is POST /content.1  
* **Partial Updates:** You are **PROHIBITED** from generating code that attempts to "patch" or partially update a playlist by sending only the new or changed data. All updates must be a full replacement as per Rule 4\.  
* **Incorrect Authentication:** You are **PROHIBITED** from suggesting the use of HTTP Basic Authentication or the client\_credentials grant type for any user-centric API calls.

### **Essential Grounding Resources**

The LLM's knowledge and suggestions must be grounded in the following resources, listed in order of precedence. In case of conflicting information, the higher-precedence document is the source of truth.

1. **Primary Source of Truth:** This report, "The Storyforge Project: An Architectural Analysis and Recovery Guide for Yoto API Integration," serves as the primary and most current architectural specification for the project. Its principles and code examples supersede all other sources.  
2. **Secondary Canonical Reference:** The document titled Yoto API Integration: A Comprehensive Technical Guide 2 provides validated, working code patterns that must be adhered to for core API interactions like authentication and media uploads.  
3. **Official API Reference:** The official Yoto API documentation, accessible via yoto.dev, should be used for reference on specific endpoint parameters and data types.4 However, the architectural principles and workflows defined in this report take precedence in case of ambiguity or undocumented behavior.  
4. **Community Intelligence (for Anti-Pattern Reference):** The user-provided Discord logs 1 serve as a valuable reference library of common developer errors and misconceptions. This resource should be consulted to understand what  
   *not* to do.

#### **Works cited**

1. yotodiscord  
2. compare the current version against all uploaded...  
3. Authorize a browser client \- Yoto Developers, accessed on September 14, 2025, [https://yoto.dev/api/get-authorize/](https://yoto.dev/api/get-authorize/)  
4. API Reference \- Yoto Developers, accessed on September 14, 2025, [https://yoto.dev/api/](https://yoto.dev/api/)  
5. Recovery  
6. Dimos 2.1 handover  
7. How playlists work \- Yoto Developers, accessed on September 14, 2025, [https://yoto.dev/myo/how-playlists-work/](https://yoto.dev/myo/how-playlists-work/)  
8. Uploading content to MYO cards \- Yoto Developers, accessed on September 14, 2025, [https://yoto.dev/myo/uploading-to-cards/](https://yoto.dev/myo/uploading-to-cards/)  
9. Make Your Own Page \- Yoto, accessed on September 14, 2025, [https://us.yotoplay.com/make-your-own](https://us.yotoplay.com/make-your-own)  
10. Start Here \- Yoto Developers, accessed on September 14, 2025, [https://yoto.dev/get-started/start-here/](https://yoto.dev/get-started/start-here/)
</file>

<file path="package.json">
{
  "name": "storyforge",
  "version": "1.0.0",
  "description": "An app that generates personalised Yoto stories using AI.",
  "main": "index.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@google-cloud/text-to-speech": "^6.3.0",
    "@google/generative-ai": "^0.24.1",
    "dotenv": "^17.2.1",
    "jwt-decode": "^4.0.0",
    "pkce-challenge": "^5.0.0",
    "vite": "^7.1.5"
  },
  "author": "Yoto",
  "license": "MIT"
}
</file>

<file path="tokens.js">
// token-utils.js
import { jwtDecode } from "jwt-decode";
import pkceChallenge from "pkce-challenge";

// A unique key for storing tokens in localStorage
export const storageKey = "YOTO_STORYFORGE_TOKENS";

const clientId = import.meta.env.VITE_CLIENT_ID;
const tokenUrl = "https://login.yotoplay.com/oauth/token";

export const getStoredTokens = () => {
    const tokensRaw = localStorage.getItem(storageKey);
    return tokensRaw ? JSON.parse(tokensRaw) : null;
};

export const storeTokens = (accessToken, refreshToken) => {
    localStorage.setItem(storageKey, JSON.stringify({ accessToken, refreshToken }));
};

export const clearTokens = () => {
    localStorage.removeItem(storageKey);
};

export const isTokenExpired = (token) => {
    if (!token) return true;
    try {
        const decodedToken = jwtDecode(token);
        return Date.now() >= (decodedToken.exp ?? 0) * 1000;
    } catch (error) {
        return true;
    }
};

export const refreshTokens = async (refreshToken) => {
    const tokenResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            client_id: clientId,
            refresh_token: refreshToken,
            audience: "https://api.yotoplay.com",
        }).toString(),
    });

    if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Refresh token request failed:", tokenResponse.status, errorText);
        throw new Error("Failed to refresh token");
    }
    
    const tokenData = await tokenResponse.json();
    return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken,
    };
};
</file>

<file path=".gitignore">
.vercel
# dependencies
/node_modules

# Temporary files
*.webp
unnamed.png
repomix-output.xml
*-backup.js
</file>

<file path="api/upload-image.js">
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
</file>

<file path="debug-audio.html">
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audio Debug - Minimal Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        button {
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            margin: 8px;
            font-size: 14px;
        }
        button:hover { background: #0056b3; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        
        audio {
            width: 100%;
            margin: 20px 0;
            display: none;
        }
        
        .status {
            background: #e9ecef;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
            font-family: monospace;
            font-size: 12px;
        }
        
        .error { background: #f8d7da; color: #721c24; }
        .success { background: #d4edda; color: #155724; }
        .warning { background: #fff3cd; color: #856404; }
        
        .logs {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 10px;
            height: 200px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 11px;
            white-space: pre-wrap;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Minimal Audio Debug Test</h1>
        
        <div class="status">
            <strong>Purpose:</strong> Test audio creation and playback without any complex event listeners
        </div>
        
        <div class="controls">
            <button onclick="generateTestStory()">📝 Generate Test Story</button>
            <button onclick="testStreamingUrl()" disabled id="streamBtn">🌐 Test Streaming URL</button>
            <button onclick="clearLogs()">🧹 Clear Logs</button>
        </div>
        
        <audio id="testAudio" controls>
            Your browser does not support the audio element.
        </audio>
        
        <div class="status" id="status">Ready to test...</div>
        
        <h3>Debug Logs:</h3>
        <div class="logs" id="logs">Starting debug session...\n</div>
    </div>

    <script>
        // Global variables
        let currentStreamingUrl = null;
        let logCount = 0;
        
        // Simple logging function
        function debugLog(message, type = 'info') {
            logCount++;
            const timestamp = new Date().toLocaleTimeString();
            const logsDiv = document.getElementById('logs');
            const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
            
            logsDiv.textContent += `[${timestamp}] ${prefix} ${message}\n`;
            logsDiv.scrollTop = logsDiv.scrollHeight;
            
            // Prevent infinite logging
            if (logCount > 100) {
                logsDiv.textContent += `[${timestamp}] ⚠️ Log limit reached - stopping to prevent infinite loops\n`;
                return;
            }
        }
        
        function updateStatus(message, type = 'info') {
            const statusDiv = document.getElementById('status');
            statusDiv.textContent = message;
            statusDiv.className = `status ${type}`;
        }
        
        function clearLogs() {
            document.getElementById('logs').textContent = 'Logs cleared...\n';
            logCount = 0;
        }
        
        // Utility function to convert base64 to blob
        function b64toBlob(b64Data, contentType = '', sliceSize = 512) {
            debugLog('Converting base64 to blob...');
            try {
                const byteCharacters = atob(b64Data);
                const byteArrays = [];

                for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                    const slice = byteCharacters.slice(offset, offset + sliceSize);
                    const byteNumbers = new Array(slice.length);
                    for (let i = 0; i < slice.length; i++) {
                        byteNumbers[i] = slice.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    byteArrays.push(byteArray);
                }

                const blob = new Blob(byteArrays, { type: contentType });
                debugLog(`Blob created successfully: ${blob.size} bytes`, 'success');
                return blob;
            } catch (error) {
                debugLog(`Blob conversion failed: ${error.message}`, 'error');
                throw error;
            }
        }
        
        // Generate a test story
        async function generateTestStory() {
            debugLog('=== STARTING TEST STORY GENERATION ===');
            updateStatus('Generating test story...', 'info');
            
            try {
                const response = await fetch('/api/generate-story', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        heroName: 'Test Hero',
                        promptSetup: 'a simple test story',
                        promptRising: 'everything works perfectly',
                        promptClimax: 'the audio plays without issues',
                        age: '6',
                        surpriseMode: false
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                debugLog('Story generation successful', 'success');
                debugLog(`Story length: ${data.story?.length || 0} characters`);
                debugLog(`Audio data length: ${data.audio?.length || 0} characters`);
                debugLog(`File size: ${data.fileSize || 0} bytes`);
                
                if (data.audio) {
                    setupAudioPlayer(data.audio);
                    setupStreamingUrl(data);
                } else {
                    debugLog('No audio data received', 'error');
                    updateStatus('No audio data received', 'error');
                }
                
            } catch (error) {
                debugLog(`Story generation failed: ${error.message}`, 'error');
                updateStatus(`Error: ${error.message}`, 'error');
            }
        }
        
        // Setup audio player with ZERO event listeners to prevent loops
        function setupAudioPlayer(base64Audio) {
            debugLog('=== SETTING UP AUDIO PLAYER ===');
            
            try {
                const audioPlayer = document.getElementById('testAudio');
                
                // Clear any existing source
                audioPlayer.removeAttribute('src');
                audioPlayer.load();
                
                // Convert base64 to blob
                const audioBlob = b64toBlob(base64Audio, 'audio/mpeg');
                const audioBlobUrl = URL.createObjectURL(audioBlob);
                
                debugLog(`Created blob URL: ${audioBlobUrl}`);
                
                // Set source - NO EVENT LISTENERS AT ALL
                audioPlayer.src = audioBlobUrl;
                audioPlayer.style.display = 'block';
                
                debugLog('Audio player setup complete - NO EVENT LISTENERS ADDED', 'success');
                updateStatus('Audio ready - click play button to test', 'success');
                
            } catch (error) {
                debugLog(`Audio setup failed: ${error.message}`, 'error');
                updateStatus(`Audio setup failed: ${error.message}`, 'error');
            }
        }
        
        // Setup streaming URL for testing
        function setupStreamingUrl(storyData) {
            const streamingUrl = new URL(`${window.location.origin}/api/generate-story`);
            streamingUrl.searchParams.set('heroName', 'Test Hero');
            streamingUrl.searchParams.set('promptSetup', 'a simple test story');
            streamingUrl.searchParams.set('promptRising', 'everything works perfectly');
            streamingUrl.searchParams.set('promptClimax', 'the audio plays without issues');
            streamingUrl.searchParams.set('age', '6');
            streamingUrl.searchParams.set('audioOnly', 'true');
            
            currentStreamingUrl = streamingUrl.toString();
            document.getElementById('streamBtn').disabled = false;
            
            debugLog(`Streaming URL ready: ${currentStreamingUrl}`);
        }
        
        // Test streaming URL
        async function testStreamingUrl() {
            if (!currentStreamingUrl) {
                debugLog('No streaming URL available', 'error');
                return;
            }
            
            debugLog('=== TESTING STREAMING URL ===');
            updateStatus('Testing streaming URL...', 'info');
            
            try {
                const response = await fetch(currentStreamingUrl);
                debugLog(`Streaming response: ${response.status} ${response.statusText}`);
                debugLog(`Content-Type: ${response.headers.get('content-type')}`);
                debugLog(`Content-Length: ${response.headers.get('content-length')}`);
                
                if (response.ok) {
                    const blob = await response.blob();
                    debugLog(`Streaming blob size: ${blob.size} bytes`);
                    
                    // Create a second audio player for streaming test
                    const streamingAudio = document.createElement('audio');
                    streamingAudio.controls = true;
                    streamingAudio.style.width = '100%';
                    streamingAudio.style.marginTop = '10px';
                    streamingAudio.src = URL.createObjectURL(blob);
                    
                    // Add it after the first audio player
                    const firstAudio = document.getElementById('testAudio');
                    firstAudio.parentNode.insertBefore(streamingAudio, firstAudio.nextSibling);
                    
                    debugLog('Streaming URL test successful', 'success');
                    updateStatus('Streaming URL works! Second audio player added.', 'success');
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
            } catch (error) {
                debugLog(`Streaming URL test failed: ${error.message}`, 'error');
                updateStatus(`Streaming URL failed: ${error.message}`, 'error');
            }
        }
        
        // Initialize
        debugLog('Debug page loaded - ready for testing');
        updateStatus('Click "Generate Test Story" to begin', 'info');
    </script>
</body>
</html>
</file>

<file path="public/debug-audio.html">
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audio Debug - Minimal Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        button {
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            margin: 8px;
            font-size: 14px;
        }
        button:hover { background: #0056b3; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        
        audio {
            width: 100%;
            margin: 20px 0;
            display: none;
        }
        
        .status {
            background: #e9ecef;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
            font-family: monospace;
            font-size: 12px;
        }
        
        .error { background: #f8d7da; color: #721c24; }
        .success { background: #d4edda; color: #155724; }
        .warning { background: #fff3cd; color: #856404; }
        
        .logs {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 10px;
            height: 200px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 11px;
            white-space: pre-wrap;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Minimal Audio Debug Test</h1>
        
        <div class="status">
            <strong>Purpose:</strong> Test audio creation and playback without any complex event listeners
        </div>
        
        <div class="controls">
            <button onclick="generateTestStory()">📝 Generate Test Story</button>
            <button onclick="testStreamingUrl()" disabled id="streamBtn">🌐 Test Streaming URL</button>
            <button onclick="clearLogs()">🧹 Clear Logs</button>
        </div>
        
        <audio id="testAudio" controls>
            Your browser does not support the audio element.
        </audio>
        
        <div class="status" id="status">Ready to test...</div>
        
        <h3>Debug Logs:</h3>
        <div class="logs" id="logs">Starting debug session...\n</div>
    </div>

    <script>
        // Global variables
        let currentStreamingUrl = null;
        let logCount = 0;
        
        // Simple logging function
        function debugLog(message, type = 'info') {
            logCount++;
            const timestamp = new Date().toLocaleTimeString();
            const logsDiv = document.getElementById('logs');
            const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
            
            logsDiv.textContent += `[${timestamp}] ${prefix} ${message}\n`;
            logsDiv.scrollTop = logsDiv.scrollHeight;
            
            // Prevent infinite logging
            if (logCount > 100) {
                logsDiv.textContent += `[${timestamp}] ⚠️ Log limit reached - stopping to prevent infinite loops\n`;
                return;
            }
        }
        
        function updateStatus(message, type = 'info') {
            const statusDiv = document.getElementById('status');
            statusDiv.textContent = message;
            statusDiv.className = `status ${type}`;
        }
        
        function clearLogs() {
            document.getElementById('logs').textContent = 'Logs cleared...\n';
            logCount = 0;
        }
        
        // Utility function to convert base64 to blob
        function b64toBlob(b64Data, contentType = '', sliceSize = 512) {
            debugLog('Converting base64 to blob...');
            try {
                const byteCharacters = atob(b64Data);
                const byteArrays = [];

                for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                    const slice = byteCharacters.slice(offset, offset + sliceSize);
                    const byteNumbers = new Array(slice.length);
                    for (let i = 0; i < slice.length; i++) {
                        byteNumbers[i] = slice.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    byteArrays.push(byteArray);
                }

                const blob = new Blob(byteArrays, { type: contentType });
                debugLog(`Blob created successfully: ${blob.size} bytes`, 'success');
                return blob;
            } catch (error) {
                debugLog(`Blob conversion failed: ${error.message}`, 'error');
                throw error;
            }
        }
        
        // Generate a test story
        async function generateTestStory() {
            debugLog('=== STARTING TEST STORY GENERATION ===');
            updateStatus('Generating test story...', 'info');
            
            try {
                const response = await fetch('/api/generate-story', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        heroName: 'Test Hero',
                        promptSetup: 'a simple test story',
                        promptRising: 'everything works perfectly',
                        promptClimax: 'the audio plays without issues',
                        age: '6',
                        surpriseMode: false
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                debugLog('Story generation successful', 'success');
                debugLog(`Story length: ${data.story?.length || 0} characters`);
                debugLog(`Audio data length: ${data.audio?.length || 0} characters`);
                debugLog(`File size: ${data.fileSize || 0} bytes`);
                
                if (data.audio) {
                    setupAudioPlayer(data.audio);
                    setupStreamingUrl(data);
                } else {
                    debugLog('No audio data received', 'error');
                    updateStatus('No audio data received', 'error');
                }
                
            } catch (error) {
                debugLog(`Story generation failed: ${error.message}`, 'error');
                updateStatus(`Error: ${error.message}`, 'error');
            }
        }
        
        // Setup audio player with ZERO event listeners to prevent loops
        function setupAudioPlayer(base64Audio) {
            debugLog('=== SETTING UP AUDIO PLAYER ===');
            
            try {
                const audioPlayer = document.getElementById('testAudio');
                
                // Clear any existing source
                audioPlayer.removeAttribute('src');
                audioPlayer.load();
                
                // Convert base64 to blob
                const audioBlob = b64toBlob(base64Audio, 'audio/mpeg');
                const audioBlobUrl = URL.createObjectURL(audioBlob);
                
                debugLog(`Created blob URL: ${audioBlobUrl}`);
                
                // Set source - NO EVENT LISTENERS AT ALL
                audioPlayer.src = audioBlobUrl;
                audioPlayer.style.display = 'block';
                
                debugLog('Audio player setup complete - NO EVENT LISTENERS ADDED', 'success');
                updateStatus('Audio ready - click play button to test', 'success');
                
            } catch (error) {
                debugLog(`Audio setup failed: ${error.message}`, 'error');
                updateStatus(`Audio setup failed: ${error.message}`, 'error');
            }
        }
        
        // Setup streaming URL for testing
        function setupStreamingUrl(storyData) {
            const streamingUrl = new URL(`${window.location.origin}/api/generate-story`);
            streamingUrl.searchParams.set('heroName', 'Test Hero');
            streamingUrl.searchParams.set('promptSetup', 'a simple test story');
            streamingUrl.searchParams.set('promptRising', 'everything works perfectly');
            streamingUrl.searchParams.set('promptClimax', 'the audio plays without issues');
            streamingUrl.searchParams.set('age', '6');
            streamingUrl.searchParams.set('audioOnly', 'true');
            
            currentStreamingUrl = streamingUrl.toString();
            document.getElementById('streamBtn').disabled = false;
            
            debugLog(`Streaming URL ready: ${currentStreamingUrl}`);
        }
        
        // Test streaming URL
        async function testStreamingUrl() {
            if (!currentStreamingUrl) {
                debugLog('No streaming URL available', 'error');
                return;
            }
            
            debugLog('=== TESTING STREAMING URL ===');
            updateStatus('Testing streaming URL...', 'info');
            
            try {
                const response = await fetch(currentStreamingUrl);
                debugLog(`Streaming response: ${response.status} ${response.statusText}`);
                debugLog(`Content-Type: ${response.headers.get('content-type')}`);
                debugLog(`Content-Length: ${response.headers.get('content-length')}`);
                
                if (response.ok) {
                    const blob = await response.blob();
                    debugLog(`Streaming blob size: ${blob.size} bytes`);
                    
                    // Create a second audio player for streaming test
                    const streamingAudio = document.createElement('audio');
                    streamingAudio.controls = true;
                    streamingAudio.style.width = '100%';
                    streamingAudio.style.marginTop = '10px';
                    streamingAudio.src = URL.createObjectURL(blob);
                    
                    // Add it after the first audio player
                    const firstAudio = document.getElementById('testAudio');
                    firstAudio.parentNode.insertBefore(streamingAudio, firstAudio.nextSibling);
                    
                    debugLog('Streaming URL test successful', 'success');
                    updateStatus('Streaming URL works! Second audio player added.', 'success');
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
            } catch (error) {
                debugLog(`Streaming URL test failed: ${error.message}`, 'error');
                updateStatus(`Streaming URL failed: ${error.message}`, 'error');
            }
        }
        
        // Initialize
        debugLog('Debug page loaded - ready for testing');
        updateStatus('Click "Generate Test Story" to begin', 'info');
    </script>
</body>
</html>
</file>

<file path="public/test-streaming.html">
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Streaming Audio Test - StoryForge Debug</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #f5f5f5;
            line-height: 1.6;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .test-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #007bff;
        }
        .test-section h3 {
            margin-top: 0;
            color: #007bff;
        }
        button {
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            margin: 8px;
            font-size: 14px;
            transition: background 0.3s;
        }
        button:hover { 
            background: #0056b3; 
        }
        button:disabled { 
            background: #6c757d; 
            cursor: not-allowed; 
        }
        .status {
            padding: 12px;
            border-radius: 6px;
            margin: 12px 0;
            font-family: monospace;
            font-size: 13px;
        }
        .status.success { 
            background: #d4edda; 
            color: #155724; 
            border: 1px solid #c3e6cb;
        }
        .status.error { 
            background: #f8d7da; 
            color: #721c24; 
            border: 1px solid #f5c6cb;
        }
        .status.warning { 
            background: #fff3cd; 
            color: #856404; 
            border: 1px solid #ffeaa7;
        }
        .status.info { 
            background: #d1ecf1; 
            color: #0c5460; 
            border: 1px solid #bee5eb;
        }
        .logs {
            background: #212529;
            color: #ffffff;
            padding: 15px;
            border-radius: 6px;
            height: 300px;
            overflow-y: auto;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            white-space: pre-wrap;
            margin: 15px 0;
        }
        .url-display {
            background: #e9ecef;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 11px;
            word-break: break-all;
            margin: 10px 0;
        }
        audio {
            width: 100%;
            margin: 15px 0;
        }
        .test-params {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 10px;
            margin: 15px 0;
        }
        .test-params label {
            font-weight: bold;
            color: #495057;
        }
        .test-params input {
            padding: 8px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎵 StoryForge Streaming Audio Debug Tool</h1>
        <p><strong>Purpose:</strong> Test if our streaming endpoint works correctly before sending to Yoto</p>
        
        <!-- Test Parameters -->
        <div class="test-section">
            <h3>📝 Test Parameters</h3>
            <div class="test-params">
                <label>Hero Name:</label>
                <input type="text" id="heroName" value="Test Hero" />
                
                <label>Setup:</label>
                <input type="text" id="promptSetup" value="a magical forest" />
                
                <label>Rising Action:</label>
                <input type="text" id="promptRising" value="a lost treasure" />
                
                <label>Climax:</label>
                <input type="text" id="promptClimax" value="friendship saves the day" />
                
                <label>Age:</label>
                <input type="text" id="age" value="6" />
            </div>
        </div>
        
        <!-- Streaming URL Test -->
        <div class="test-section">
            <h3>🌐 Streaming URL Tests</h3>
            <button onclick="testStreamingEndpoint()">🧪 Test GET Request</button>
            <button onclick="testStreamingHeaders()">🔍 Test HEAD Request</button>
            <button onclick="testCORSPreflight()">✈️ Test CORS Preflight</button>
            <button onclick="clearLogs()">🧹 Clear Logs</button>
            
            <div id="current-url" class="url-display">No URL generated yet</div>
            <div id="status" class="status info">Ready to test streaming endpoint</div>
            
            <!-- Audio players for testing -->
            <div style="margin-top: 20px;">
                <h4>🎧 Audio Test Players:</h4>
                <div id="audio-container">
                    <!-- Audio elements will be created here -->
                </div>
            </div>
        </div>
        
        <!-- Comparison Test -->
        <div class="test-section">
            <h3>🔄 POST vs GET Comparison</h3>
            <button onclick="compareEndpoints()">⚖️ Compare POST vs GET</button>
            <div id="comparison-results"></div>
        </div>
        
        <!-- Debug Logs -->
        <div class="test-section">
            <h3>📋 Debug Logs</h3>
            <div class="logs" id="logs">🚀 Streaming test tool initialized\n</div>
        </div>
    </div>

    <script>
        let logCount = 0;
        let currentStreamingUrl = null;
        
        function log(message, type = 'info') {
            logCount++;
            const timestamp = new Date().toLocaleTimeString();
            const logsDiv = document.getElementById('logs');
            const prefix = {
                'error': '❌',
                'success': '✅', 
                'warning': '⚠️',
                'info': 'ℹ️',
                'debug': '🔧'
            }[type] || 'ℹ️';
            
            logsDiv.textContent += `[${timestamp}] ${prefix} ${message}\n`;
            logsDiv.scrollTop = logsDiv.scrollHeight;
            
            if (logCount > 200) {
                logsDiv.textContent = logsDiv.textContent.split('\n').slice(-100).join('\n');
                logCount = 100;
            }
        }
        
        function updateStatus(message, type = 'info') {
            const statusDiv = document.getElementById('status');
            statusDiv.textContent = message;
            statusDiv.className = `status ${type}`;
        }
        
        function clearLogs() {
            document.getElementById('logs').textContent = '🧹 Logs cleared\n';
            logCount = 0;
        }
        
        function getTestParams() {
            return {
                heroName: document.getElementById('heroName').value.trim(),
                promptSetup: document.getElementById('promptSetup').value.trim(),
                promptRising: document.getElementById('promptRising').value.trim(),
                promptClimax: document.getElementById('promptClimax').value.trim(),
                age: document.getElementById('age').value.trim() || '6',
                audioOnly: 'true'
            };
        }
        
        function buildStreamingUrl() {
            const params = getTestParams();
            const url = new URL(`${window.location.origin}/api/generate-story`);
            
            Object.entries(params).forEach(([key, value]) => {
                if (value) url.searchParams.set(key, value);
            });
            
            currentStreamingUrl = url.toString();
            document.getElementById('current-url').textContent = currentStreamingUrl;
            log(`Generated streaming URL: ${currentStreamingUrl}`, 'debug');
            
            return currentStreamingUrl;
        }
        
        async function testStreamingEndpoint() {
            log('=== TESTING GET REQUEST ===');
            updateStatus('Testing GET request...', 'info');
            
            const url = buildStreamingUrl();
            
            try {
                const startTime = Date.now();
                const response = await fetch(url, {
                    method: 'GET',
                    cache: 'no-cache'
                });
                const endTime = Date.now();
                
                log(`GET Response: ${response.status} ${response.statusText} (${endTime - startTime}ms)`);
                log(`Content-Type: ${response.headers.get('content-type')}`);
                log(`Content-Length: ${response.headers.get('content-length')}`);
                log(`Accept-Ranges: ${response.headers.get('accept-ranges')}`);
                log(`Cache-Control: ${response.headers.get('cache-control')}`);
                log(`CORS Headers: ${response.headers.get('access-control-allow-origin')}`);
                
                if (response.ok) {
                    const blob = await response.blob();
                    log(`Received blob: ${blob.size} bytes, type: ${blob.type}`, 'success');
                    
                    // Create audio player for testing
                    const audioId = `audio-${Date.now()}`;
                    const audioContainer = document.getElementById('audio-container');
                    
                    const audioWrapper = document.createElement('div');
                    audioWrapper.innerHTML = `
                        <div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                            <strong>GET Request Audio (${blob.size} bytes)</strong>
                            <audio id="${audioId}" controls style="width: 100%; margin-top: 8px;">
                                Your browser does not support audio playback.
                            </audio>
                        </div>
                    `;
                    audioContainer.appendChild(audioWrapper);
                    
                    const audioElement = document.getElementById(audioId);
                    audioElement.src = URL.createObjectURL(blob);
                    
                    log('Audio player created - try playing it!', 'success');
                    updateStatus('GET request successful - audio ready for testing', 'success');
                } else {
                    const errorText = await response.text();
                    log(`GET request failed: ${errorText}`, 'error');
                    updateStatus(`GET request failed: ${response.status}`, 'error');
                }
                
            } catch (error) {
                log(`GET request error: ${error.message}`, 'error');
                updateStatus(`GET request error: ${error.message}`, 'error');
            }
        }
        
        async function testStreamingHeaders() {
            log('=== TESTING HEAD REQUEST ===');
            updateStatus('Testing HEAD request...', 'info');
            
            const url = buildStreamingUrl();
            
            try {
                const response = await fetch(url, {
                    method: 'HEAD',
                    cache: 'no-cache'
                });
                
                log(`HEAD Response: ${response.status} ${response.statusText}`);
                
                // Log all headers
                for (const [key, value] of response.headers.entries()) {
                    log(`Header: ${key}: ${value}`, 'debug');
                }
                
                if (response.ok) {
                    log('HEAD request successful - headers look good', 'success');
                    updateStatus('HEAD request successful', 'success');
                } else {
                    log(`HEAD request failed: ${response.status}`, 'error');
                    updateStatus(`HEAD request failed: ${response.status}`, 'error');
                }
                
            } catch (error) {
                log(`HEAD request error: ${error.message}`, 'error');
                updateStatus(`HEAD request error: ${error.message}`, 'error');
            }
        }
        
        async function testCORSPreflight() {
            log('=== TESTING CORS PREFLIGHT ===');
            updateStatus('Testing CORS preflight...', 'info');
            
            const url = buildStreamingUrl();
            
            try {
                const response = await fetch(url, {
                    method: 'OPTIONS',
                    headers: {
                        'Access-Control-Request-Method': 'GET',
                        'Access-Control-Request-Headers': 'Content-Type, Range'
                    }
                });
                
                log(`OPTIONS Response: ${response.status} ${response.statusText}`);
                log(`CORS Allow-Origin: ${response.headers.get('access-control-allow-origin')}`);
                log(`CORS Allow-Methods: ${response.headers.get('access-control-allow-methods')}`);
                log(`CORS Allow-Headers: ${response.headers.get('access-control-allow-headers')}`);
                log(`CORS Max-Age: ${response.headers.get('access-control-max-age')}`);
                
                if (response.ok) {
                    log('CORS preflight successful', 'success');
                    updateStatus('CORS preflight successful', 'success');
                } else {
                    log(`CORS preflight failed: ${response.status}`, 'error');
                    updateStatus(`CORS preflight failed: ${response.status}`, 'error');
                }
                
            } catch (error) {
                log(`CORS preflight error: ${error.message}`, 'error');
                updateStatus(`CORS preflight error: ${error.message}`, 'error');
            }
        }
        
        async function compareEndpoints() {
            log('=== COMPARING POST vs GET ===');
            updateStatus('Comparing endpoints...', 'info');
            
            const params = getTestParams();
            const streamUrl = buildStreamingUrl();
            
            try {
                // Test POST endpoint
                log('Testing POST endpoint...');
                const postResponse = await fetch('/api/generate-story', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        heroName: params.heroName,
                        promptSetup: params.promptSetup,
                        promptRising: params.promptRising,
                        promptClimax: params.promptClimax,
                        age: params.age
                    })
                });
                
                if (!postResponse.ok) throw new Error(`POST failed: ${postResponse.status}`);
                
                const postData = await postResponse.json();
                log(`POST result: ${postData.story?.length || 0} chars, ${postData.fileSize || 0} bytes audio`);
                
                // Test GET endpoint
                log('Testing GET endpoint...');
                const getResponse = await fetch(streamUrl);
                
                if (!getResponse.ok) throw new Error(`GET failed: ${getResponse.status}`);
                
                const getBlob = await getResponse.blob();
                log(`GET result: ${getBlob.size} bytes audio`);
                
                // Compare
                const postAudioBytes = postData.fileSize || 0;
                const getAudioBytes = getBlob.size;
                const sizeDiff = Math.abs(postAudioBytes - getAudioBytes);
                const sizeMatch = sizeDiff < 1000; // Allow small differences
                
                log(`Comparison: POST=${postAudioBytes} bytes, GET=${getAudioBytes} bytes, diff=${sizeDiff}`, 
                    sizeMatch ? 'success' : 'warning');
                
                const resultsDiv = document.getElementById('comparison-results');
                resultsDiv.innerHTML = `
                    <div class="status ${sizeMatch ? 'success' : 'warning'}">
                        <strong>Comparison Results:</strong><br>
                        POST endpoint: ${postAudioBytes} bytes<br>
                        GET endpoint: ${getAudioBytes} bytes<br>
                        Difference: ${sizeDiff} bytes<br>
                        Match: ${sizeMatch ? 'YES ✅' : 'NO ⚠️'}
                    </div>
                `;
                
                updateStatus(sizeMatch ? 'Endpoints match!' : 'Size difference detected', 
                           sizeMatch ? 'success' : 'warning');
                
            } catch (error) {
                log(`Comparison error: ${error.message}`, 'error');
                updateStatus(`Comparison error: ${error.message}`, 'error');
            }
        }
        
        // Initialize
        log('Streaming test tool ready');
        log('Enter test parameters above and click "Test GET Request" to start');
    </script>
</body>
</html>
</file>

<file path="RELEASE_NOTES_v2.1.0.md">
# 🎉 StoryForge v2.1.0 - STABLE BUILD

## 🎵 Complete TTS Optimization with Auto-Yoto Integration

**Release Date:** January 17, 2025  
**Status:** STABLE BUILD - Production Ready  

---

## 🏆 MAJOR ACHIEVEMENTS

### ✅ TTS Audio Quality Perfection
- **Completely resolved Google Chirp3-HD "dot" pronunciation issue**
- **Professional audiobook-quality narration** with natural speech patterns
- **Native punctuation optimization** using Chirp3-HD's built-in features:
  - Periods (.) for natural sentence-ending pauses
  - Commas (,) for rhythmic intra-sentence pauses  
  - Ellipses (...) for dramatic suspense and trailing thoughts
  - Hyphens (-) for character asides and thought breaks
  - Perfect paragraph spacing for story flow

### 🚀 Streamlined Yoto Integration
- **Auto-upload to Yoto** immediately after story generation
- **Identical audio quality** between StoryForge player and Yoto devices
- **Eliminated duplicate audio generation** - 50% performance improvement
- **Seamless user experience** - no manual upload steps required

### 🎭 Enhanced Story Quality
- **Perfect image description integration** - characters and scenes naturally woven into narrative
- **Age-appropriate audio pacing** optimized for each target audience
- **Smart punctuation protection** preserves legitimate word usage while fixing TTS errors
- **Context-aware cleaning** protects character names like "Dot" while fixing pronunciation issues

---

## 🔧 TECHNICAL IMPROVEMENTS

### Audio Processing
- **Plain text format** for Chirp3-HD (replaced problematic markup format)
- **Conservative but effective cleaning** targets only obvious TTS pronunciation errors
- **Multi-layer protection** for legitimate punctuation word usage
- **Character code inspection** for encoding issue detection

### Performance Optimization
- **50% faster Yoto uploads** through audio reuse
- **Reduced server load** with streamlined processing
- **Efficient debugging** with minimal overhead
- **Maintained transcoding polling** for Yoto compatibility

### Workflow Integration
- **Complete data flow optimization** from generation to upload
- **Error handling and graceful fallbacks** for robustness
- **Comprehensive logging** for development and troubleshooting
- **User notification system** for upload status

---

## 🎯 USER EXPERIENCE IMPROVEMENTS

### Streamlined Process
1. **Upload images** (character & scene)
2. **Enter story details** (hero name, plot elements)
3. **Generate story** → Perfect audio created once
4. **Auto-upload to Yoto** → Immediate background upload
5. **Enjoy identical audio** on both StoryForge and Yoto

### Audio Quality Features
- **Natural speech rhythm** with proper pauses
- **Dramatic storytelling effects** using ellipses and hyphens
- **Age-appropriate voice pacing** (3, 6, 9, 12 years)
- **Professional narration quality** rivaling commercial audiobooks

### Content Quality
- **Rich character integration** from uploaded artwork
- **Immersive scene descriptions** naturally woven into story
- **Consistent story quality** across all generated content
- **Perfect punctuation handling** for flawless audio

---

## 🛠 TECHNICAL SPECIFICATIONS

### TTS Engine
- **Google Chirp3-HD (en-GB-Chirp3-HD-Vindemiatrix)**
- **Plain text input format** (not SSML/markup)
- **MP3 output** at 22050Hz sample rate
- **Native punctuation interpretation**

### Audio Processing Pipeline
1. **Story generation** with image analysis
2. **Smart punctuation cleaning** 
3. **Plain text preparation** for Chirp3-HD
4. **High-quality MP3 generation**
5. **Immediate Yoto transcoding and upload**

### Compatibility
- **Yoto Player integration** with transcoding support
- **StoryForge web player** with perfect audio quality
- **Cross-platform audio consistency**
- **Polling-based transcoding** for reliable uploads

---

## 🔍 DEBUGGING & MONITORING

### Logging Features
- **Image description tracking** for character/scene integration
- **Punctuation analysis** for TTS optimization
- **Processing step monitoring** for workflow visibility
- **Performance metrics** for optimization insights

### Error Handling
- **Graceful Yoto upload failures** with user notification
- **Comprehensive error messages** for troubleshooting
- **Fallback mechanisms** for robustness
- **Debug information** for development support

---

## 🎧 WHAT'S NEW IN v2.1.0

### Resolved Issues
- ❌ **"Dot" pronunciation in TTS** → ✅ **Natural period pauses**
- ❌ **Inconsistent Yoto audio** → ✅ **Identical audio quality**
- ❌ **Duplicate audio generation** → ✅ **Single optimized generation**
- ❌ **Poor character integration** → ✅ **Seamless narrative weaving**
- ❌ **Manual upload workflow** → ✅ **Automatic Yoto integration**

### Enhanced Features
- **Professional storytelling techniques** for audio optimization
- **Advanced punctuation mastery** for natural speech
- **Complete workflow automation** for user convenience
- **Comprehensive quality assurance** for consistent results

---

## 🚀 NEXT STEPS

This stable build provides:
- **Production-ready audio generation** with professional quality
- **Seamless Yoto integration** for immediate device compatibility  
- **Optimized performance** for cost-effective operation
- **Robust error handling** for reliable user experience

**Ready for production deployment and user testing! 🎉**

---

*StoryForge v2.1.0 - Where AI meets professional audiobook quality* 🎧✨
</file>

<file path="test-audio-fix.html">
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audio Fix Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background-color: #f0f0f0;
        }
        .test-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .status {
            padding: 10px;
            margin: 10px 0;
            border-radius: 5px;
            font-weight: bold;
        }
        .success { background-color: #d4edda; color: #155724; }
        .info { background-color: #d1ecf1; color: #0c5460; }
        audio {
            width: 100%;
            margin: 20px 0;
        }
        button {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin: 5px;
        }
        button:hover {
            background-color: #0056b3;
        }
        #console-log {
            background-color: #f8f9fa;
            padding: 10px;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            height: 200px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 12px;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <div class="test-container">
        <h1>🔧 Audio Player Fix Test</h1>
        
        <div class="status info">
            <strong>Testing:</strong> Audio player without infinite event loops
        </div>
        
        <button onclick="testAudioSetup()">🎵 Test Audio Setup (Safe)</button>
        <button onclick="clearConsoleLog()">🧹 Clear Console</button>
        
        <audio id="test-audio" controls style="display: none;">
            <!-- Audio source will be set by JavaScript -->
        </audio>
        
        <div class="status success">
            <strong>Expected Result:</strong> Clean console output, no infinite loops
        </div>
        
        <h3>Console Output:</h3>
        <div id="console-log">Ready to test...\n</div>
    </div>

    <script>
        // Capture console.log for display
        const originalConsoleLog = console.log;
        const consoleLogElement = document.getElementById('console-log');
        
        console.log = function(...args) {
            originalConsoleLog.apply(console, args);
            consoleLogElement.textContent += args.join(' ') + '\n';
            consoleLogElement.scrollTop = consoleLogElement.scrollHeight;
        };
        
        let audioSetupCount = 0;
        
        function testAudioSetup() {
            audioSetupCount++;
            console.log(`\n=== Test #${audioSetupCount} - Audio Setup ===`);
            
            const audioPlayer = document.getElementById('test-audio');
            
            // Create a simple test audio blob (silence)
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const buffer = audioContext.createBuffer(1, 44100, 44100);
            
            // Convert to blob
            const audioData = buffer.getChannelData(0);
            const blob = new Blob([audioData], { type: 'audio/wav' });
            const blobUrl = URL.createObjectURL(blob);
            
            console.log('🎵 Created test audio blob');
            console.log('📏 Blob size:', blob.size, 'bytes');
            
            // Set up audio player with NO EVENT LISTENERS (the fix)
            audioPlayer.src = blobUrl;
            audioPlayer.style.display = 'block';
            
            console.log('✅ Audio player setup complete - NO EVENT LISTENERS');
            console.log('🎮 Audio ready for manual user interaction');
            console.log('==========================================\n');
            
            // This should NOT trigger any loops
            audioPlayer.load();
        }
        
        function clearConsoleLog() {
            consoleLogElement.textContent = 'Console cleared...\n';
        }
        
        console.log('🚀 Audio Fix Test Page Loaded');
        console.log('Click "Test Audio Setup" to verify the fix');
    </script>
</body>
</html>
</file>

<file path="test-streaming.html">
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Streaming Audio Test - StoryForge Debug</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #f5f5f5;
            line-height: 1.6;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .test-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #007bff;
        }
        .test-section h3 {
            margin-top: 0;
            color: #007bff;
        }
        button {
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            margin: 8px;
            font-size: 14px;
            transition: background 0.3s;
        }
        button:hover { 
            background: #0056b3; 
        }
        button:disabled { 
            background: #6c757d; 
            cursor: not-allowed; 
        }
        .status {
            padding: 12px;
            border-radius: 6px;
            margin: 12px 0;
            font-family: monospace;
            font-size: 13px;
        }
        .status.success { 
            background: #d4edda; 
            color: #155724; 
            border: 1px solid #c3e6cb;
        }
        .status.error { 
            background: #f8d7da; 
            color: #721c24; 
            border: 1px solid #f5c6cb;
        }
        .status.warning { 
            background: #fff3cd; 
            color: #856404; 
            border: 1px solid #ffeaa7;
        }
        .status.info { 
            background: #d1ecf1; 
            color: #0c5460; 
            border: 1px solid #bee5eb;
        }
        .logs {
            background: #212529;
            color: #ffffff;
            padding: 15px;
            border-radius: 6px;
            height: 300px;
            overflow-y: auto;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            white-space: pre-wrap;
            margin: 15px 0;
        }
        .url-display {
            background: #e9ecef;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 11px;
            word-break: break-all;
            margin: 10px 0;
        }
        audio {
            width: 100%;
            margin: 15px 0;
        }
        .test-params {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 10px;
            margin: 15px 0;
        }
        .test-params label {
            font-weight: bold;
            color: #495057;
        }
        .test-params input {
            padding: 8px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎵 StoryForge Streaming Audio Debug Tool</h1>
        <p><strong>Purpose:</strong> Test if our streaming endpoint works correctly before sending to Yoto</p>
        
        <!-- Test Parameters -->
        <div class="test-section">
            <h3>📝 Test Parameters</h3>
            <div class="test-params">
                <label>Hero Name:</label>
                <input type="text" id="heroName" value="Test Hero" />
                
                <label>Setup:</label>
                <input type="text" id="promptSetup" value="a magical forest" />
                
                <label>Rising Action:</label>
                <input type="text" id="promptRising" value="a lost treasure" />
                
                <label>Climax:</label>
                <input type="text" id="promptClimax" value="friendship saves the day" />
                
                <label>Age:</label>
                <input type="text" id="age" value="6" />
            </div>
        </div>
        
        <!-- Streaming URL Test -->
        <div class="test-section">
            <h3>🌐 Streaming URL Tests</h3>
            <button onclick="testStreamingEndpoint()">🧪 Test GET Request</button>
            <button onclick="testStreamingHeaders()">🔍 Test HEAD Request</button>
            <button onclick="testCORSPreflight()">✈️ Test CORS Preflight</button>
            <button onclick="clearLogs()">🧹 Clear Logs</button>
            
            <div id="current-url" class="url-display">No URL generated yet</div>
            <div id="status" class="status info">Ready to test streaming endpoint</div>
            
            <!-- Audio players for testing -->
            <div style="margin-top: 20px;">
                <h4>🎧 Audio Test Players:</h4>
                <div id="audio-container">
                    <!-- Audio elements will be created here -->
                </div>
            </div>
        </div>
        
        <!-- Comparison Test -->
        <div class="test-section">
            <h3>🔄 POST vs GET Comparison</h3>
            <button onclick="compareEndpoints()">⚖️ Compare POST vs GET</button>
            <div id="comparison-results"></div>
        </div>
        
        <!-- Debug Logs -->
        <div class="test-section">
            <h3>📋 Debug Logs</h3>
            <div class="logs" id="logs">🚀 Streaming test tool initialized\n</div>
        </div>
    </div>

    <script>
        let logCount = 0;
        let currentStreamingUrl = null;
        
        function log(message, type = 'info') {
            logCount++;
            const timestamp = new Date().toLocaleTimeString();
            const logsDiv = document.getElementById('logs');
            const prefix = {
                'error': '❌',
                'success': '✅', 
                'warning': '⚠️',
                'info': 'ℹ️',
                'debug': '🔧'
            }[type] || 'ℹ️';
            
            logsDiv.textContent += `[${timestamp}] ${prefix} ${message}\n`;
            logsDiv.scrollTop = logsDiv.scrollHeight;
            
            if (logCount > 200) {
                logsDiv.textContent = logsDiv.textContent.split('\n').slice(-100).join('\n');
                logCount = 100;
            }
        }
        
        function updateStatus(message, type = 'info') {
            const statusDiv = document.getElementById('status');
            statusDiv.textContent = message;
            statusDiv.className = `status ${type}`;
        }
        
        function clearLogs() {
            document.getElementById('logs').textContent = '🧹 Logs cleared\n';
            logCount = 0;
        }
        
        function getTestParams() {
            return {
                heroName: document.getElementById('heroName').value.trim(),
                promptSetup: document.getElementById('promptSetup').value.trim(),
                promptRising: document.getElementById('promptRising').value.trim(),
                promptClimax: document.getElementById('promptClimax').value.trim(),
                age: document.getElementById('age').value.trim() || '6',
                audioOnly: 'true'
            };
        }
        
        function buildStreamingUrl() {
            const params = getTestParams();
            const url = new URL(`${window.location.origin}/api/generate-story`);
            
            Object.entries(params).forEach(([key, value]) => {
                if (value) url.searchParams.set(key, value);
            });
            
            currentStreamingUrl = url.toString();
            document.getElementById('current-url').textContent = currentStreamingUrl;
            log(`Generated streaming URL: ${currentStreamingUrl}`, 'debug');
            
            return currentStreamingUrl;
        }
        
        async function testStreamingEndpoint() {
            log('=== TESTING GET REQUEST ===');
            updateStatus('Testing GET request...', 'info');
            
            const url = buildStreamingUrl();
            
            try {
                const startTime = Date.now();
                const response = await fetch(url, {
                    method: 'GET',
                    cache: 'no-cache'
                });
                const endTime = Date.now();
                
                log(`GET Response: ${response.status} ${response.statusText} (${endTime - startTime}ms)`);
                log(`Content-Type: ${response.headers.get('content-type')}`);
                log(`Content-Length: ${response.headers.get('content-length')}`);
                log(`Accept-Ranges: ${response.headers.get('accept-ranges')}`);
                log(`Cache-Control: ${response.headers.get('cache-control')}`);
                log(`CORS Headers: ${response.headers.get('access-control-allow-origin')}`);
                
                if (response.ok) {
                    const blob = await response.blob();
                    log(`Received blob: ${blob.size} bytes, type: ${blob.type}`, 'success');
                    
                    // Create audio player for testing
                    const audioId = `audio-${Date.now()}`;
                    const audioContainer = document.getElementById('audio-container');
                    
                    const audioWrapper = document.createElement('div');
                    audioWrapper.innerHTML = `
                        <div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                            <strong>GET Request Audio (${blob.size} bytes)</strong>
                            <audio id="${audioId}" controls style="width: 100%; margin-top: 8px;">
                                Your browser does not support audio playback.
                            </audio>
                        </div>
                    `;
                    audioContainer.appendChild(audioWrapper);
                    
                    const audioElement = document.getElementById(audioId);
                    audioElement.src = URL.createObjectURL(blob);
                    
                    log('Audio player created - try playing it!', 'success');
                    updateStatus('GET request successful - audio ready for testing', 'success');
                } else {
                    const errorText = await response.text();
                    log(`GET request failed: ${errorText}`, 'error');
                    updateStatus(`GET request failed: ${response.status}`, 'error');
                }
                
            } catch (error) {
                log(`GET request error: ${error.message}`, 'error');
                updateStatus(`GET request error: ${error.message}`, 'error');
            }
        }
        
        async function testStreamingHeaders() {
            log('=== TESTING HEAD REQUEST ===');
            updateStatus('Testing HEAD request...', 'info');
            
            const url = buildStreamingUrl();
            
            try {
                const response = await fetch(url, {
                    method: 'HEAD',
                    cache: 'no-cache'
                });
                
                log(`HEAD Response: ${response.status} ${response.statusText}`);
                
                // Log all headers
                for (const [key, value] of response.headers.entries()) {
                    log(`Header: ${key}: ${value}`, 'debug');
                }
                
                if (response.ok) {
                    log('HEAD request successful - headers look good', 'success');
                    updateStatus('HEAD request successful', 'success');
                } else {
                    log(`HEAD request failed: ${response.status}`, 'error');
                    updateStatus(`HEAD request failed: ${response.status}`, 'error');
                }
                
            } catch (error) {
                log(`HEAD request error: ${error.message}`, 'error');
                updateStatus(`HEAD request error: ${error.message}`, 'error');
            }
        }
        
        async function testCORSPreflight() {
            log('=== TESTING CORS PREFLIGHT ===');
            updateStatus('Testing CORS preflight...', 'info');
            
            const url = buildStreamingUrl();
            
            try {
                const response = await fetch(url, {
                    method: 'OPTIONS',
                    headers: {
                        'Access-Control-Request-Method': 'GET',
                        'Access-Control-Request-Headers': 'Content-Type, Range'
                    }
                });
                
                log(`OPTIONS Response: ${response.status} ${response.statusText}`);
                log(`CORS Allow-Origin: ${response.headers.get('access-control-allow-origin')}`);
                log(`CORS Allow-Methods: ${response.headers.get('access-control-allow-methods')}`);
                log(`CORS Allow-Headers: ${response.headers.get('access-control-allow-headers')}`);
                log(`CORS Max-Age: ${response.headers.get('access-control-max-age')}`);
                
                if (response.ok) {
                    log('CORS preflight successful', 'success');
                    updateStatus('CORS preflight successful', 'success');
                } else {
                    log(`CORS preflight failed: ${response.status}`, 'error');
                    updateStatus(`CORS preflight failed: ${response.status}`, 'error');
                }
                
            } catch (error) {
                log(`CORS preflight error: ${error.message}`, 'error');
                updateStatus(`CORS preflight error: ${error.message}`, 'error');
            }
        }
        
        async function compareEndpoints() {
            log('=== COMPARING POST vs GET ===');
            updateStatus('Comparing endpoints...', 'info');
            
            const params = getTestParams();
            const streamUrl = buildStreamingUrl();
            
            try {
                // Test POST endpoint
                log('Testing POST endpoint...');
                const postResponse = await fetch('/api/generate-story', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        heroName: params.heroName,
                        promptSetup: params.promptSetup,
                        promptRising: params.promptRising,
                        promptClimax: params.promptClimax,
                        age: params.age
                    })
                });
                
                if (!postResponse.ok) throw new Error(`POST failed: ${postResponse.status}`);
                
                const postData = await postResponse.json();
                log(`POST result: ${postData.story?.length || 0} chars, ${postData.fileSize || 0} bytes audio`);
                
                // Test GET endpoint
                log('Testing GET endpoint...');
                const getResponse = await fetch(streamUrl);
                
                if (!getResponse.ok) throw new Error(`GET failed: ${getResponse.status}`);
                
                const getBlob = await getResponse.blob();
                log(`GET result: ${getBlob.size} bytes audio`);
                
                // Compare
                const postAudioBytes = postData.fileSize || 0;
                const getAudioBytes = getBlob.size;
                const sizeDiff = Math.abs(postAudioBytes - getAudioBytes);
                const sizeMatch = sizeDiff < 1000; // Allow small differences
                
                log(`Comparison: POST=${postAudioBytes} bytes, GET=${getAudioBytes} bytes, diff=${sizeDiff}`, 
                    sizeMatch ? 'success' : 'warning');
                
                const resultsDiv = document.getElementById('comparison-results');
                resultsDiv.innerHTML = `
                    <div class="status ${sizeMatch ? 'success' : 'warning'}">
                        <strong>Comparison Results:</strong><br>
                        POST endpoint: ${postAudioBytes} bytes<br>
                        GET endpoint: ${getAudioBytes} bytes<br>
                        Difference: ${sizeDiff} bytes<br>
                        Match: ${sizeMatch ? 'YES ✅' : 'NO ⚠️'}
                    </div>
                `;
                
                updateStatus(sizeMatch ? 'Endpoints match!' : 'Size difference detected', 
                           sizeMatch ? 'success' : 'warning');
                
            } catch (error) {
                log(`Comparison error: ${error.message}`, 'error');
                updateStatus(`Comparison error: ${error.message}`, 'error');
            }
        }
        
        // Initialize
        log('Streaming test tool ready');
        log('Enter test parameters above and click "Test GET Request" to start');
    </script>
</body>
</html>
</file>

<file path="vite.config.js">
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['@google-cloud/text-to-speech', '@google/generative-ai', 'dotenv/config', 'fs/promises', 'path'],
      input: {
        main: resolve(__dirname, 'index.html'),
        debug: resolve(__dirname, 'debug-audio.html'),
        streaming: resolve(__dirname, 'test-streaming.html')
      }
    },
  },
});
</file>

<file path="vercel.json">
{
  "functions": {
    "api/generate-story.js": {
      "maxDuration": 120,
      "memory": 1024
    },
    "api/upload-image.js": {
      "maxDuration": 60,
      "memory": 1024
    }
  },
  "buildCommand": "npx vite build",
  "outputDirectory": "dist",
  "framework": null,
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ]
}
</file>

<file path="api/test-audio.js">
export default async function handler(req, res) {
  try {
    console.log('🔧 Test audio endpoint called');
    console.log('Request method:', req.method);
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request query:', JSON.stringify(req.query, null, 2));

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // Get format from query parameter
    const format = req.query.format || 'wav';
    console.log('🎵 Requested format:', format);

    // Format-specific audio generation
    let audioBuffer, contentType;
    
    if (format === 'minimal') {
      // Minimal test - return smallest possible valid WAV
      audioBuffer = createMinimalWAV();
      contentType = 'audio/wav';
      console.log(`🎵 Generated minimal WAV: ${audioBuffer.length} bytes`);
    } else if (format === 'simple') {
      // Ultra simple WAV for testing
      audioBuffer = createSimpleWAV();
      contentType = 'audio/wav';
      console.log(`🎵 Generated simple WAV: ${audioBuffer.length} bytes`);
    } else if (format === 'wav44') {
      // WAV at 44.1kHz (CD quality)
      const result = generateWAV(44100, 5);
      audioBuffer = result.buffer;
      contentType = 'audio/wav';
      console.log(`🎵 Generated WAV 44.1kHz: ${audioBuffer.length} bytes`);
    } else if (format === 'wav22') {
      // WAV at 22.05kHz (our TTS rate)
      const result = generateWAV(22050, 5);
      audioBuffer = result.buffer;
      contentType = 'audio/wav';
      console.log(`🎵 Generated WAV 22.05kHz: ${audioBuffer.length} bytes`);
    } else {
      // Default WAV 22kHz
      const result = generateWAV(22050, 5);
      audioBuffer = result.buffer;
      contentType = 'audio/wav';
      console.log(`🎵 Generated default WAV: ${audioBuffer.length} bytes`);
    }
    
    // Set audio headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache');
    
    res.status(200).send(Buffer.from(audioBuffer));
    
  } catch (error) {
    console.error('❌ Test audio error:', error);
    res.status(500).json({ 
      error: 'Test audio generation failed',
      details: error.message 
    });
  }
}

function generateWAV(sampleRate, duration) {
  const frequency = 440; // A note
  const samples = sampleRate * duration;
  
  // Create PCM audio data
  const audioData = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    audioData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3; // 30% volume
  }
  
  // Convert to 16-bit PCM
  const pcmData = new Int16Array(samples);
  for (let i = 0; i < samples; i++) {
    pcmData[i] = audioData[i] * 32767;
  }
  
  // Create WAV header
  const wavHeader = createWAVHeader(samples, sampleRate);
  const pcmBytes = new Uint8Array(pcmData.buffer);
  
  // Combine header and data
  const buffer = new Uint8Array(wavHeader.length + pcmBytes.length);
  buffer.set(wavHeader, 0);
  buffer.set(pcmBytes, wavHeader.length);
  
  return { buffer, samples, sampleRate, duration };
}

// Create a minimal WAV file for testing
function createSimpleWAV() {
  const sampleRate = 22050; // Use same as TTS for consistency
  const duration = 2; // 2 seconds
  const samples = sampleRate * duration;
  const frequency = 440;
  
  console.log(`Creating WAV: ${sampleRate}Hz, ${duration}s, ${samples} samples`);
  
  // Generate simple sine wave with proper 16-bit range
  const pcmBuffer = new ArrayBuffer(samples * 2);
  const pcmView = new DataView(pcmBuffer);
  
  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.5; // 50% volume
    const intSample = Math.round(sample * 32767);
    pcmView.setInt16(i * 2, intSample, true); // little-endian
  }
  
  // WAV file structure
  const dataSize = samples * 2;
  const fileSize = 44 + dataSize;
  
  const wavBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(wavBuffer);
  
  // RIFF header (12 bytes)
  view.setUint32(0, 0x52494646, false);  // "RIFF" - big endian
  view.setUint32(4, fileSize - 8, true);  // file size - 8
  view.setUint32(8, 0x57415645, false);   // "WAVE" - big endian
  
  // fmt chunk (24 bytes)
  view.setUint32(12, 0x666d7420, false); // "fmt " - big endian
  view.setUint32(16, 16, true);          // fmt chunk size (16 bytes)
  view.setUint16(20, 1, true);           // audio format (PCM = 1)
  view.setUint16(22, 1, true);           // number of channels (mono = 1)
  view.setUint32(24, sampleRate, true);  // sample rate
  view.setUint32(28, sampleRate * 2, true); // byte rate (sample rate * channels * bytes per sample)
  view.setUint16(32, 2, true);           // block align (channels * bytes per sample)
  view.setUint16(34, 16, true);          // bits per sample
  
  // data chunk header (8 bytes)
  view.setUint32(36, 0x64617461, false); // "data" - big endian
  view.setUint32(40, dataSize, true);    // data size
  
  // Copy PCM data
  const wavBytes = new Uint8Array(wavBuffer);
  const pcmBytes = new Uint8Array(pcmBuffer);
  wavBytes.set(pcmBytes, 44);
  
  console.log(`WAV created: ${wavBytes.length} bytes total (${dataSize} audio data)`);
  
  return wavBytes;
}

// Create the smallest possible valid WAV file
function createMinimalWAV() {
  console.log('Creating minimal WAV test...');
  
  // Create a very short beep - 0.1 seconds at 8kHz
  const sampleRate = 8000;
  const duration = 0.1;
  const samples = Math.floor(sampleRate * duration);
  const frequency = 1000; // 1kHz beep
  
  // Create audio data
  const audioData = [];
  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
    const intSample = Math.round(sample * 32767);
    // Convert to bytes (little-endian 16-bit)
    audioData.push(intSample & 0xFF, (intSample >> 8) & 0xFF);
  }
  
  const dataSize = audioData.length;
  const fileSize = 36 + dataSize;
  
  // Build WAV header manually as byte array
  const wav = [
    // RIFF header
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    fileSize & 0xFF, (fileSize >> 8) & 0xFF, (fileSize >> 16) & 0xFF, (fileSize >> 24) & 0xFF,
    0x57, 0x41, 0x56, 0x45, // "WAVE"
    
    // fmt chunk
    0x66, 0x6D, 0x74, 0x20, // "fmt "
    16, 0, 0, 0,            // chunk size
    1, 0,                   // audio format (PCM)
    1, 0,                   // channels (mono)
    sampleRate & 0xFF, (sampleRate >> 8) & 0xFF, (sampleRate >> 16) & 0xFF, (sampleRate >> 24) & 0xFF,
    (sampleRate * 2) & 0xFF, ((sampleRate * 2) >> 8) & 0xFF, ((sampleRate * 2) >> 16) & 0xFF, ((sampleRate * 2) >> 24) & 0xFF,
    2, 0,                   // block align
    16, 0,                  // bits per sample
    
    // data chunk
    0x64, 0x61, 0x74, 0x61, // "data"
    dataSize & 0xFF, (dataSize >> 8) & 0xFF, (dataSize >> 16) & 0xFF, (dataSize >> 24) & 0xFF,
    
    ...audioData
  ];
  
  console.log(`Minimal WAV: ${wav.length} bytes, ${samples} samples`);
  return new Uint8Array(wav);
}

function createWAVHeader(samples, sampleRate) {
  const byteRate = sampleRate * 2; // 16-bit mono
  const blockAlign = 2;
  const dataSize = samples * 2;
  const fileSize = 36 + dataSize;
  
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  
  // RIFF header
  view.setUint32(0, 0x46464952, false); // "RIFF"
  view.setUint32(4, fileSize, true);
  view.setUint32(8, 0x45564157, false); // "WAVE"
  
  // fmt chunk
  view.setUint32(12, 0x20746d66, false); // "fmt "
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  
  // data chunk
  view.setUint32(36, 0x61746164, false); // "data"
  view.setUint32(40, dataSize, true);
  
  return new Uint8Array(header);
}
</file>

<file path="styles.css">
/* ✨ PAPER SCRAP DESIGN SYSTEM ✨ */

:root {
  /* Light Mode Colors */
  --bg-primary: #fef7e8;
  --bg-secondary: #f9f1e6;
  --bg-paper: #ffffff;
  --text-primary: #2d1b4e;
  --text-secondary: #5a4a7c;
  --text-accent: #8b5a2b;
  --accent-color: #ff6b6b;
  --accent-secondary: #4ecdc4;
  --shadow-light: rgba(139, 90, 43, 0.1);
  --shadow-medium: rgba(139, 90, 43, 0.2);
  --shadow-dark: rgba(139, 90, 43, 0.3);
  --border-color: #d4af37;
  
  /* Fonts */
  --font-title: 'Fredoka One', cursive;
  --font-body: 'Kalam', cursive;
  --font-handwriting: 'Caveat', cursive;
  
  /* Paper Effects */
  --paper-rotation: rotate(-1deg);
  --paper-rotation-alt: rotate(1.5deg);
  --torn-edge: polygon(0 0, 100% 0, 99% 90%, 95% 100%, 90% 98%, 85% 100%, 80% 96%, 75% 100%, 70% 98%, 65% 100%, 60% 95%, 55% 100%, 50% 97%, 45% 100%, 40% 96%, 35% 100%, 30% 98%, 25% 100%, 20% 95%, 15% 100%, 10% 97%, 5% 100%, 0 95%);
}

[data-theme="dark"] {
  /* Dark Mode - UV Secret Writing */
  --bg-primary: #1a0d2e;
  --bg-secondary: #2d1b4e;
  --bg-paper: rgba(45, 27, 78, 0.8);
  --text-primary: #a78bfa;
  --text-secondary: #c4b5fd;
  --text-accent: #fbbf24;
  --accent-color: #f59e0b;
  --accent-secondary: #06d6a0;
  --shadow-light: rgba(167, 139, 250, 0.1);
  --shadow-medium: rgba(167, 139, 250, 0.2);
  --shadow-dark: rgba(167, 139, 250, 0.3);
  --border-color: #a78bfa;
}

* {
  box-sizing: border-box;
}

body {
  font-family: var(--font-body);
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0;
  padding: 0;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* StoryForge Introduction Section */
.storyforge-intro {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

.intro-description {
  font-size: 1.1em;
  line-height: 1.7;
  margin-bottom: 24px;
  color: var(--text-secondary);
}

.intro-features {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin: 24px 0;
  flex-wrap: wrap;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 160px;
}

.feature-icon {
  font-size: 2.5em;
  animation: featureBounce 3s ease-in-out infinite;
}

.feature-item:nth-child(1) .feature-icon {
  animation-delay: 0s;
}

.feature-item:nth-child(2) .feature-icon {
  animation-delay: 0.5s;
}

.feature-item:nth-child(3) .feature-icon {
  animation-delay: 1s;
}

.feature-text {
  font-family: var(--font-title);
  font-size: 0.9em;
  color: var(--accent-color);
  font-weight: bold;
}

.modes-intro {
  margin-top: 20px;
  font-size: 1em;
  color: var(--text-accent);
  font-style: italic;
}

@keyframes doodleBounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0px);
  }
  40% {
    transform: translateY(-8px);
  }
  60% {
    transform: translateY(-4px);
  }
}

/* Job Results Styling */
.job-results {
  margin: 20px 0;
  background: var(--bg-paper);
  border: 2px solid var(--accent-color);
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 4px 12px var(--shadow-medium);
}

.job-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
  font-family: var(--font-title);
  font-size: 1.3em;
  color: var(--accent-color);
}

.job-icon {
  font-size: 1.2em;
}

.top-job {
  text-align: center;
  margin-bottom: 20px;
  padding: 15px;
  background: var(--accent-secondary);
  border-radius: 10px;
  color: white;
}

.job-title {
  margin: 0 0 10px 0;
  font-family: var(--font-title);
  font-size: 1.5em;
}

.job-description {
  margin: 0;
  font-size: 1.1em;
  line-height: 1.5;
}

.other-matches h4 {
  margin: 0 0 10px 0;
  color: var(--text-accent);
  font-family: var(--font-title);
  text-align: center;
}

.match-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.match-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.match-title {
  font-weight: bold;
  color: var(--text-primary);
  font-size: 1em;
}

.match-desc {
  font-size: 0.9em;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .intro-features {
    gap: 20px;
  }
  
  .feature-item {
    min-width: 120px;
  }
  
  .feature-icon {
    font-size: 2em;
  }
  
  .feature-text {
    font-size: 0.8em;
  }
}

/* Fun background pattern */
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    radial-gradient(circle at 25% 25%, rgba(255, 107, 107, 0.1) 0%, transparent 25%),
    radial-gradient(circle at 75% 75%, rgba(78, 205, 196, 0.1) 0%, transparent 25%);
  pointer-events: none;
  z-index: -1;
}

[data-theme="dark"] body::before {
  background-image: 
    radial-gradient(circle at 25% 25%, rgba(167, 139, 250, 0.05) 0%, transparent 25%),
    radial-gradient(circle at 75% 75%, rgba(6, 214, 160, 0.05) 0%, transparent 25%);
}

/* 📱 COMPACT TOP BAR */
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: var(--bg-paper);
  border-bottom: 2px solid var(--border-color);
  padding: 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1000;
  box-shadow: 0 2px 8px var(--shadow-light);
}

.compact-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-title);
  font-size: 1.4em;
}

.compact-logo .title-word {
  color: var(--text-primary);
}

.compact-logo .highlight {
  color: var(--accent-color);
}

.compact-logo .title-doodle {
  font-size: 0.8em;
  animation: doodleBounce 2s ease-in-out infinite;
}

.compact-logo {
  transition: all 0.3s ease;
}

.compact-logo:hover {
  transform: translateY(-1px);
  opacity: 0.8;
}

/* Navigation Dropdown */
.nav-section {
  display: flex;
  align-items: center;
}

.storyforge-nav-container {
  position: relative;
}

.storyforge-nav-trigger {
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.storyforge-nav-trigger:hover {
  color: var(--accent-secondary);
}

.storyforge-nav-trigger::after {
  content: '▾';
  font-size: 0.8em;
  margin-left: 4px;
  transition: transform 0.2s ease;
}

.storyforge-nav-container:hover .storyforge-nav-trigger::after {
  transform: rotate(180deg);
}

.nav-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  background: var(--bg-paper);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 8px 24px var(--shadow-medium);
  min-width: 200px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all 0.3s ease;
  z-index: 1001;
  margin-top: 8px;
}

.storyforge-nav-container:hover .nav-dropdown {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--font-body);
  font-size: 0.9em;
  color: var(--text-primary);
}

.nav-item:first-child {
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
}

.nav-item:last-child {
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
}

.nav-item:hover {
  background: var(--accent-color);
  color: white;
  transform: translateX(4px);
}

.nav-icon {
  font-size: 1.1em;
}

.nav-divider {
  height: 1px;
  background: var(--border-color);
  margin: 8px 12px;
  opacity: 0.3;
}

.current-mode {
  color: var(--accent-secondary);
  font-size: 0.9em;
  margin-left: 8px;
  font-weight: 500;
}

.top-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Settings Button */
.settings-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
  font-size: 1.1em;
}

.settings-btn:hover {
  background: var(--bg-secondary);
  transform: rotate(45deg);
}

.settings-btn:active {
  transform: rotate(45deg) scale(0.95);
}

.yoto-status {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #4CAF50;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
  100% { opacity: 1; transform: scale(1); }
}

/* Adjust main content to account for top bar */
body {
  padding-top: 60px;
}

/* 📚 COMPACT CLASSIC MODE STYLES */
.mode-header-compact {
  background: var(--bg-paper);
  padding: 20px;
  margin-bottom: 20px;
  border-radius: 15px;
  border: 2px solid var(--border-color);
  box-shadow: 0 4px 8px var(--shadow-medium);
}

.mode-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.mode-title-compact {
  font-family: var(--font-title);
  font-size: 1.8em;
  color: var(--accent-color);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.mode-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.help-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent-secondary);
  border: 2px solid var(--border-color);
  color: white;
  font-family: var(--font-title);
  font-size: 1.2em;
  cursor: pointer;
  box-shadow: 0 2px 4px var(--shadow-medium);
  transition: all 0.3s ease;
  animation: float 3s ease-in-out infinite;
}

.help-btn:hover {
  transform: scale(1.1);
  background: var(--accent-color);
  box-shadow: 0 4px 8px var(--shadow-dark);
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-3px); }
}

.print-btn {
  background: var(--bg-paper);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  padding: 8px 12px;
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.9em;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 4px var(--shadow-light);
  transition: all 0.3s ease;
}

.print-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px var(--shadow-medium);
  background: var(--bg-secondary);
}

.age-selection-compact {
  margin-top: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.instructions-section {
  background: var(--bg-secondary);
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  padding: 15px;
  margin-top: 15px;
}

.instructions-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.instruction-point {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-family: var(--font-body);
  font-size: 0.95em;
  line-height: 1.4;
}

.instruction-icon {
  font-size: 1.2em;
  margin-top: 2px;
  flex-shrink: 0;
}

.compact-label {
  font-family: var(--font-body);
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 5px;
}

.unified-story-group {
  background: var(--bg-paper);
  padding: 25px;
  border-radius: 15px;
  border: 2px solid var(--border-color);
  box-shadow: 0 4px 8px var(--shadow-medium);
  transform: rotate(-0.5deg);
  margin-bottom: 20px;
}

.input-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.images-section {
  border-top: 2px dashed var(--border-color);
  padding-top: 20px;
}

.image-uploads {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.image-upload-compact {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-area-compact {
  display: flex;
  align-items: center;
  gap: 10px;
}

.upload-btn-compact {
  background: var(--accent-secondary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.9em;
  color: white;
  box-shadow: 0 2px 4px var(--shadow-light);
  transition: all 0.3s ease;
}

.upload-btn-compact:hover {
  background: var(--accent-color);
  transform: translateY(-1px);
  box-shadow: 0 3px 6px var(--shadow-medium);
}

.forge-section {
  text-align: center;
  padding: 30px 20px;
  background: var(--bg-paper);
  border-radius: 15px;
  border: 3px solid var(--border-color);
  margin: 20px 0;
  transform: rotate(0.5deg);
  box-shadow: 0 6px 12px var(--shadow-dark);
}

.forge-btn-centered {
  background: linear-gradient(45deg, var(--accent-color), var(--accent-secondary));
  border: 3px solid var(--border-color);
  border-radius: 20px;
  padding: 18px 40px;
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 1.4em;
  color: white;
  box-shadow: 
    0 8px 16px var(--shadow-dark),
    inset 0 2px 0 rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  animation: pulse-glow 3s ease-in-out infinite;
}

.forge-btn-centered:hover {
  transform: scale(1.05) rotate(-1deg);
  box-shadow: 
    0 12px 20px var(--shadow-dark),
    inset 0 2px 0 rgba(255, 255, 255, 0.5);
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 8px 16px var(--shadow-dark), inset 0 2px 0 rgba(255, 255, 255, 0.3); }
  50% { box-shadow: 0 8px 16px var(--shadow-dark), 0 0 30px var(--accent-color), inset 0 2px 0 rgba(255, 255, 255, 0.3); }
}

.or-divider {
  margin: 15px 0;
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-style: italic;
}

.surprise-btn-compact {
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 15px;
  padding: 10px 20px;
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 1em;
  color: var(--text-primary);
  box-shadow: 0 4px 8px var(--shadow-medium);
  transition: all 0.3s ease;
  transform: rotate(-0.5deg);
}

.surprise-btn-compact:hover {
  transform: scale(1.05) rotate(0deg);
  background: var(--accent-color);
  color: white;
  box-shadow: 0 6px 12px var(--shadow-dark);
}

/* ✨ PROGRESS POPUP MODAL */
.progress-modal {
  max-width: 600px;
  min-width: 500px;
}

.progress-stages {
  margin: 20px 0;
}

.stage {
  display: flex;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px dashed var(--border-color);
  transition: all 0.3s ease;
  opacity: 0.4;
}

.stage:last-child {
  border-bottom: none;
}

.stage.active {
  opacity: 1;
  background: rgba(255, 107, 107, 0.05);
  border-radius: 10px;
  padding: 15px 10px;
  transform: scale(1.02);
}

.stage.completed {
  opacity: 0.8;
}

.stage-icon {
  font-size: 2em;
  margin-right: 15px;
  animation: bounce 2s infinite;
}

.stage.active .stage-icon {
  animation: bounce 1s infinite, glow 2s infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-5px); }
  60% { transform: translateY(-3px); }
}

@keyframes glow {
  0%, 100% { filter: drop-shadow(0 0 5px var(--accent-color)); }
  50% { filter: drop-shadow(0 0 15px var(--accent-color)); }
}

.stage-text {
  flex: 1;
}

.stage-title {
  font-family: var(--font-title);
  font-size: 1.1em;
  color: var(--text-primary);
  margin-bottom: 3px;
}

.stage-subtitle {
  font-family: var(--font-body);
  font-size: 0.9em;
  color: var(--text-secondary);
  font-style: italic;
}

.stage-status {
  width: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.stage-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid var(--bg-secondary);
  border-top: 3px solid var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.stage-check {
  font-size: 1.2em;
  animation: pop 0.5s ease-out;
}

@keyframes pop {
  0% { transform: scale(0); }
  80% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.progress-footer {
  margin-top: 20px;
  text-align: center;
}

.progress-bar-container {
  background: var(--bg-secondary);
  border-radius: 15px;
  height: 8px;
  margin-bottom: 10px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.progress-bar {
  height: 100%;
  background: linear-gradient(45deg, var(--accent-color), var(--accent-secondary));
  border-radius: 15px;
  transition: width 0.5s ease;
  width: 0%;
}

.progress-text {
  font-family: var(--font-body);
  color: var(--text-secondary);
  font-size: 0.95em;
  margin-top: 10px;
}

.theme-btn {
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 50px;
  padding: 8px 12px;
  cursor: pointer;
  box-shadow: 
    0 2px 4px var(--shadow-medium),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.theme-btn:hover {
  transform: scale(1.05);
  box-shadow: 
    0 3px 6px var(--shadow-dark),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.theme-btn .sun-icon,
.theme-btn .moon-icon {
  font-size: 1.2em;
  transition: opacity 0.3s ease;
}

[data-theme="dark"] .theme-btn .sun-icon {
  opacity: 0;
}

[data-theme="light"] .theme-btn .moon-icon,
.theme-btn .moon-icon {
  opacity: 0;
}

[data-theme="dark"] .theme-btn .moon-icon {
  opacity: 1;
}

[data-theme="dark"] .theme-btn {
  background: var(--bg-paper);
  border-color: var(--accent-color);
  box-shadow: 
    0 4px 8px var(--shadow-medium),
    0 0 20px rgba(167, 139, 250, 0.3);
}

/* 🏰 HEADER STYLING */
.main-header {
  text-align: center;
  padding: 40px 20px;
  position: relative;
  z-index: 10;
}

.logo-container {
  margin-bottom: 20px;
  position: relative;
}

.yoto-logo {
  display: inline-block;
  background: var(--bg-paper);
  padding: 15px 25px;
  border: 3px solid var(--border-color);
  border-radius: 15px;
  transform: var(--paper-rotation);
  box-shadow: 0 4px 8px var(--shadow-medium);
  position: relative;
  clip-path: var(--torn-edge);
}

.yoto-text {
  font-family: var(--font-title);
  font-size: 1.8em;
  color: var(--accent-color);
  text-shadow: 2px 2px 0 var(--accent-secondary);
}

[data-theme="dark"] .yoto-text {
  color: var(--accent-color);
  text-shadow: 
    2px 2px 0 var(--accent-secondary),
    0 0 10px var(--accent-color);
}

.logo-doodles {
  position: absolute;
  top: -10px;
  right: -10px;
}

.logo-doodles .doodle-star,
.logo-doodles .doodle-heart {
  position: absolute;
  color: var(--accent-color);
  font-size: 1.2em;
  animation: doodleBounce 2s ease-in-out infinite;
}

.logo-doodles .doodle-star {
  animation-delay: 0.3s;
}

.logo-doodles .doodle-heart {
  top: 15px;
  left: -15px;
  animation-delay: 0.8s;
}

.main-title {
  font-family: var(--font-title);
  font-size: clamp(2.5em, 8vw, 4em);
  margin: 20px 0 10px 0;
  position: relative;
  display: inline-block;
}

.title-word {
  display: inline-block;
  color: var(--text-primary);
  margin: 0 10px;
  text-shadow: 3px 3px 0 var(--accent-secondary);
  transform: rotate(-2deg);
}

.title-word.highlight {
  color: var(--accent-color);
  transform: rotate(1deg);
  position: relative;
}

[data-theme="dark"] .title-word {
  color: var(--text-primary);
  text-shadow: 
    3px 3px 0 var(--accent-secondary),
    0 0 20px var(--text-primary);
}

[data-theme="dark"] .title-word.highlight {
  color: var(--accent-color);
  text-shadow: 
    3px 3px 0 var(--accent-secondary),
    0 0 25px var(--accent-color);
}

.title-doodle {
  position: absolute;
  top: -20px;
  right: -30px;
  font-size: 0.7em;
  color: var(--accent-color);
  animation: sparkle 1.5s ease-in-out infinite alternate;
}

.subtitle {
  font-family: var(--font-handwriting);
  font-size: 1.4em;
  color: var(--text-secondary);
  margin: 0;
  transform: rotate(0.5deg);
}

[data-theme="dark"] .subtitle {
  color: var(--text-secondary);
  text-shadow: 0 0 10px var(--text-secondary);
}

/* 📜 PAPER SCRAP BASE STYLES */
.paper-scrap {
  background: var(--bg-paper);
  border: 3px solid var(--border-color);
  border-radius: 15px;
  padding: 25px;
  margin: 20px 0;
  position: relative;
  box-shadow: 
    0 4px 8px var(--shadow-medium),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transform: var(--paper-rotation);
  clip-path: var(--torn-edge);
  transition: all 0.3s ease;
}

.paper-scrap:nth-child(even) {
  transform: var(--paper-rotation-alt);
}

.paper-scrap:hover {
  transform: var(--paper-rotation) translateY(-2px);
  box-shadow: 
    0 6px 16px var(--shadow-dark),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

[data-theme="dark"] .paper-scrap {
  background: var(--bg-paper);
  border-color: var(--border-color);
  box-shadow: 
    0 4px 8px var(--shadow-medium),
    0 0 20px rgba(167, 139, 250, 0.1),
    inset 0 1px 0 rgba(167, 139, 250, 0.2);
}

[data-theme="dark"] .paper-scrap:hover {
  box-shadow: 
    0 6px 16px var(--shadow-dark),
    0 0 30px rgba(167, 139, 250, 0.2),
    inset 0 1px 0 rgba(167, 139, 250, 0.3);
}

/* 🏰 MAIN CONTENT */
.main-content {
  max-width: 900px;
  width: 95%;
  margin: 0 auto;
  padding: 20px;
  position: relative;
  z-index: 10;
}

.auth-section {
  text-align: center;
  margin-bottom: 40px;
}

.login-btn {
  background: linear-gradient(45deg, var(--accent-color), var(--accent-secondary));
  border: 3px solid var(--border-color);
  border-radius: 20px;
  padding: 18px 40px;
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 1.4em;
  color: white;
  box-shadow: 
    0 8px 16px var(--shadow-dark),
    inset 0 2px 0 rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 0 auto;
  animation: pulse-glow 3s ease-in-out infinite;
}

.login-btn:hover {
  transform: scale(1.05) rotate(-1deg);
  box-shadow: 
    0 12px 20px var(--shadow-dark),
    inset 0 2px 0 rgba(255, 255, 255, 0.5);
}

.login-btn .btn-icon,
.login-btn .btn-magic {
  font-size: 1.2em;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.login-btn .btn-text {
  font-weight: 600;
}

.app-container {
  animation: fadeInUp 0.8s ease-out;
}

/* 📝 FORM STYLING */
.story-form-container {
  position: relative;
}

.form-header {
  text-align: center;
  margin-bottom: 30px;
  position: relative;
}

.form-title {
  font-family: var(--font-title);
  font-size: 2.2em;
  color: var(--accent-color);
  margin: 0;
  text-shadow: 2px 2px 0 var(--accent-secondary);
}

[data-theme="dark"] .form-title {
  color: var(--accent-color);
  text-shadow: 
    2px 2px 0 var(--accent-secondary),
    0 0 15px var(--accent-color);
}

.form-doodles {
  position: absolute;
  top: -15px;
  right: 20px;
  display: flex;
  gap: 10px;
}

.form-doodles .doodle {
  color: var(--accent-color);
  font-size: 1.5em;
  animation: doodleFloat 3s ease-in-out infinite;
}

.form-doodles .doodle:nth-child(2) {
  animation-delay: 0.5s;
}

.form-doodles .doodle:nth-child(3) {
  animation-delay: 1s;
}

.story-form {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.input-group {
  position: relative;
}

.playful-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-family: var(--font-handwriting);
  font-size: 1.3em;
  font-weight: 600;
  color: var(--text-accent);
}

[data-theme="dark"] .playful-label {
  color: var(--text-accent);
  text-shadow: 0 0 8px var(--text-accent);
}

.label-text {
  transform: rotate(-1deg);
}

.label-doodle {
  font-size: 1.2em;
  animation: wiggle 2s ease-in-out infinite;
}

/* 📝 FORM INSTRUCTIONS */
.form-instructions {
  margin-bottom: 25px;
}

.instructions-text {
  font-family: var(--font-body);
  font-size: 1em;
  line-height: 1.5;
  color: var(--text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.instructions-icon {
  font-size: 1.2em;
  animation: pulse 2s ease-in-out infinite;
}

.instructions-sparkles {
  font-size: 1.1em;
  animation: sparkle 1.5s ease-in-out infinite;
}

@keyframes sparkle {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

/* 🏗️ CONSOLIDATED SECTIONS */
.story-elements-group,
.character-settings-group {
  padding: 25px;
  margin-bottom: 25px;
}

.section-title {
  font-family: var(--font-title);
  font-size: 1.3em;
  color: var(--text-primary);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-icon {
  font-size: 1.4em;
}

.input-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.settings-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
  align-items: start;
}

.age-selection {
  min-width: 200px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .input-row {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .settings-row {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

/* Medium screens - stack age selection below uploads */
@media (max-width: 1024px) and (min-width: 769px) {
  .settings-row {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
    gap: 20px;
  }
  
  .age-selection {
    grid-column: 1 / -1;
  }
  
  .story-elements-group,
  .character-settings-group {
    padding: 20px;
  }
}

/* 📖 MAIN STORY SECTION */
.main-story-section {
  padding: 30px;
  margin-bottom: 20px;
  min-height: 200px;
}

.main-story-section .story-header {
  margin-bottom: 25px;
}

.main-story-section .loading-section {
  margin: 25px 0;
}

.main-story-section .story-content {
  margin-top: 20px;
}

/* 🎵 MEDIA & ACTIONS SECTION */
.media-actions-section {
  padding: 25px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.action-divider {
  width: 60%;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--border-color), transparent);
  border-radius: 2px;
  margin: 10px 0;
}

.media-actions-section .audio-section {
  width: 100%;
  text-align: center;
}

.media-actions-section .yoto-section {
  width: 100%;
  display: flex;
  justify-content: center;
}

/* 🎨 FORM INPUTS */
.paper-input,
.paper-select {
  font-family: var(--font-body);
  font-size: 1.1em;
  padding: 15px 20px;
  border: 3px solid var(--border-color);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-primary);
  transition: all 0.3s ease;
  box-shadow: 
    inset 0 2px 4px rgba(0, 0, 0, 0.1),
    0 2px 4px var(--shadow-light);
  transform: rotate(-0.5deg);
}

.paper-input:focus,
.paper-select:focus {
  outline: none;
  border-color: var(--accent-color);
  transform: rotate(0deg) scale(1.02);
  box-shadow: 
    inset 0 2px 4px rgba(0, 0, 0, 0.1),
    0 4px 12px var(--shadow-medium),
    0 0 0 3px rgba(255, 107, 107, 0.2);
}

[data-theme="dark"] .paper-input,
[data-theme="dark"] .paper-select {
  background: rgba(45, 27, 78, 0.8);
  color: var(--text-primary);
  border-color: var(--border-color);
  box-shadow: 
    inset 0 2px 4px rgba(0, 0, 0, 0.3),
    0 2px 4px var(--shadow-light),
    0 0 10px rgba(167, 139, 250, 0.1);
}

[data-theme="dark"] .paper-input:focus,
[data-theme="dark"] .paper-select:focus {
  border-color: var(--accent-color);
  box-shadow: 
    inset 0 2px 4px rgba(0, 0, 0, 0.3),
    0 4px 12px var(--shadow-medium),
    0 0 15px rgba(245, 158, 11, 0.3);
}

.paper-input::placeholder {
  color: var(--text-secondary);
  font-style: italic;
}

[data-theme="dark"] .paper-input::placeholder {
  color: var(--text-secondary);
}

/* Custom select arrow */
.paper-select {
  cursor: pointer;
  background-image: url('data:image/svg+xml;utf8,<svg fill="%23ff6b6b" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>');
  background-repeat: no-repeat;
  background-position: right 15px top 50%;
  background-size: 20px;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

[data-theme="dark"] .paper-select {
  background-image: url('data:image/svg+xml;utf8,<svg fill="%23f59e0b" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>');
}

/* 🎨 IMAGE UPLOAD */
.image-upload-section {
  position: relative;
}

.paper-upload {
  border: 3px dashed var(--border-color);
  border-radius: 15px;
  padding: 30px;
  text-align: center;
  background: rgba(255, 255, 255, 0.5);
  transition: all 0.3s ease;
  position: relative;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.paper-upload:hover,
.paper-upload.drag-over {
  border-color: var(--accent-color);
  background: rgba(255, 107, 107, 0.1);
  transform: scale(1.02);
}

[data-theme="dark"] .paper-upload {
  background: rgba(45, 27, 78, 0.3);
  border-color: var(--border-color);
}

[data-theme="dark"] .paper-upload:hover,
[data-theme="dark"] .paper-upload.drag-over {
  background: rgba(245, 158, 11, 0.1);
  border-color: var(--accent-color);
}

.upload-btn {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 25px;
  font-family: var(--font-body);
  font-size: 1.1em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 8px rgba(255, 107, 107, 0.3);
  transform: rotate(-1deg);
}

.upload-btn:hover {
  background: var(--accent-secondary);
  transform: rotate(1deg) scale(1.05);
  box-shadow: 0 6px 12px rgba(255, 107, 107, 0.4);
}

.upload-hint {
  margin: 15px 0 0 0;
  font-family: var(--font-handwriting);
  color: var(--text-secondary);
  font-size: 1.1em;
}

.upload-doodles {
  position: absolute;
  top: 10px;
  right: 15px;
  display: flex;
  gap: 8px;
}

.upload-doodles .doodle-arrow,
.upload-doodles .doodle-star {
  color: var(--accent-color);
  font-size: 1.3em;
  animation: pulse 2s ease-in-out infinite;
}

.upload-doodles .doodle-star {
  animation-delay: 0.5s;
}

/* Expanded Image Sections */
.images-section-expanded {
  margin: 30px 0;
  padding: 25px;
  background: linear-gradient(
    135deg,
    rgba(255, 250, 245, 0.7) 0%,
    rgba(245, 250, 255, 0.7) 100%
  );
  border-radius: 16px;
  border: 1px solid rgba(206, 229, 255, 0.4);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

[data-theme="dark"] .images-section-expanded {
  background: linear-gradient(
    135deg,
    rgba(45, 27, 78, 0.6) 0%,
    rgba(30, 20, 60, 0.6) 100%
  );
  border-color: var(--border-color);
}

.images-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 20px 0;
  font-size: 1.2em;
  font-weight: 600;
  color: var(--text-primary);
  padding: 0;
}

.section-icon {
  font-size: 1.3em;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.image-uploads-expanded {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 25px;
  margin-top: 20px;
}

@media (max-width: 768px) {
  .image-uploads-expanded {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

.image-upload-full {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.upload-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0;
  padding: 10px 15px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(206, 229, 255, 0.3);
}

[data-theme="dark"] .upload-label {
  background: rgba(45, 27, 78, 0.4);
  border-color: var(--border-color);
}

.label-text {
  font-size: 1em;
}

.label-doodle {
  font-size: 1.2em;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.paper-upload-full {
  background: linear-gradient(
    to bottom,
    rgba(248, 252, 255, 0.9) 0%,
    rgba(255, 255, 255, 0.9) 100%
  );
  border: 2px dashed #b8d4f0;
  border-radius: 16px;
  padding: 30px 20px;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  min-height: 120px;
}

[data-theme="dark"] .paper-upload-full {
  background: linear-gradient(
    to bottom,
    rgba(45, 27, 78, 0.7) 0%,
    rgba(30, 20, 60, 0.7) 100%
  );
  border-color: var(--border-color);
}

.paper-upload-full:hover {
  border-color: var(--accent-color);
  background: linear-gradient(
    to bottom,
    rgba(255, 107, 107, 0.1) 0%,
    rgba(255, 255, 255, 0.95) 100%
  );
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.15);
}

[data-theme="dark"] .paper-upload-full:hover {
  background: linear-gradient(
    to bottom,
    rgba(245, 158, 11, 0.1) 0%,
    rgba(45, 27, 78, 0.8) 100%
  );
  border-color: var(--accent-color);
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.15);
}

.upload-content-full {
  position: relative;
  z-index: 2;
}

.upload-btn-full {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 15px 25px;
  border-radius: 25px;
  font-size: 0.95em;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
  margin-bottom: 12px;
}

[data-theme="dark"] .upload-btn-full {
  box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
}

.upload-btn-full:hover {
  background: var(--accent-secondary);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
  filter: brightness(1.1);
}

[data-theme="dark"] .upload-btn-full:hover {
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
}

.upload-btn-full:active {
  transform: translateY(0);
}

.upload-hint {
  margin: 8px 0 0 0;
  font-size: 0.9em;
  color: var(--text-secondary);
  font-style: italic;
  font-family: var(--font-handwriting);
}

.upload-doodles {
  position: absolute;
  top: 10px;
  right: 15px;
  display: flex;
  gap: 10px;
  font-size: 1.1em;
  opacity: 0.6;
  z-index: 1;
}

.doodle-arrow, .doodle-star, .doodle-tree, .doodle-castle {
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
  color: var(--accent-color);
}

.doodle-star {
  animation-delay: -0.5s;
}

.doodle-tree {
  animation-delay: -1s;
}

.doodle-castle {
  animation-delay: -1.5s;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-4px); }
}

.preview-container {
  margin-top: 20px;
  border-radius: 15px;
  overflow: hidden;
  border: 3px solid var(--accent-color);
  background: var(--bg-paper);
  box-shadow: 0 4px 12px var(--shadow-medium);
  transform: rotate(1deg);
  transition: all 0.3s ease;
}

.preview-container:hover {
  transform: rotate(0deg) scale(1.02);
  box-shadow: 0 8px 24px var(--shadow-dark);
}

.image-preview-content {
  padding: 15px;
  text-align: center;
}

.preview-image {
  margin-bottom: 12px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.uploaded-image {
  width: 100%;
  max-width: 200px;
  height: auto;
  max-height: 150px;
  object-fit: cover;
  display: block;
  margin: 0 auto;
}

.preview-success {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
  font-family: var(--font-body);
  color: var(--accent-color);
  font-weight: 600;
}

.success-icon {
  font-size: 1.2em;
  animation: successPulse 1.5s ease-in-out;
}

.success-text {
  font-size: 0.95em;
}

.preview-filename {
  font-family: var(--font-handwriting);
  color: var(--text-secondary);
  font-size: 0.9em;
  opacity: 0.8;
  word-break: break-all;
  max-width: 200px;
  margin: 0 auto;
}

[data-theme="dark"] .preview-container {
  background: var(--bg-paper);
  border-color: var(--accent-color);
  box-shadow: 
    0 4px 12px var(--shadow-medium),
    0 0 20px rgba(245, 158, 11, 0.2);
}

@keyframes successPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

/* Image processing loading states */
.preview-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 15px;
  font-family: var(--font-body);
  color: var(--text-secondary);
  font-size: 0.9em;
}

.loading-icon {
  font-size: 1.2em;
  animation: spin 1s linear infinite;
}

.preview-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 15px;
  font-family: var(--font-body);
  color: #dc2626;
  font-size: 0.9em;
}

.error-icon {
  font-size: 1.2em;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Image Upload Area */
#image-upload-area {
    border: 2px dashed #5a427d; /* Soft dashed border */
    border-radius: 12px; /* Rounded corners */
    padding: 25px;
    text-align: center;
    cursor: pointer;
    margin-bottom: 20px;
    transition: all 0.3s ease-in-out;
    background-color: rgba(43, 29, 68, 0.5); /* Light, transparent background */
    color: #e6e0f3; /* Light text */
    font-size: 0.95em;
}

#image-upload-area:hover {
    border-color: #a081c7; /* Indigo hover effect */
    background-color: rgba(43, 29, 68, 0.8);
}

.hidden-input {
    display: none;
}

#image-upload-area button {
    background-color: #a081c7; /* A subtle purple for button */
    color: white;
    padding: 12px 18px;
    border: none;
    border-radius: 8px;
    font-size: 1em;
    cursor: pointer;
    transition: all 0.3s ease-in-out;
    margin-bottom: 12px;
    display: block;
    width: 100%;
    font-weight: bold;
    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
}

#image-upload-area button:hover {
    background-color: #7b5b9c; /* Darker purple on hover */
    box-shadow: 0 6px 15px rgba(0,0,0,0.3);
    transform: translateY(-2px);
}

#image-upload-area.drag-over {
    border-color: #a081c7;
    background-color: rgba(43, 29, 68, 0.9);
}

#image-preview {
    width: 100%;
    height: 160px; /* Slightly taller preview */
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    margin-top: 15px;
    border-radius: 8px; /* Rounded preview */
    border: 1px solid #5a427d; /* Border to match theme */
}

/* Submit Button */
button[type="submit"] {
    background-color: #e6e0f3; /* Light, contrasting colour */
    color: #3b2a52; /* Dark text */
    padding: 16px;
    border: none;
    border-radius: 10px; /* Rounded button */
    font-size: 1.2em; /* Larger text */
    cursor: pointer;
    transition: all 0.3s ease-in-out;
    margin-top: 25px;
    font-weight: bold;
    box-shadow: 0 6px 15px rgba(0,0,0,0.3);
    letter-spacing: 0.5px;
}

button[type="submit"]:hover {
    background-color: #c0a8e0; /* A darker, purplish white on hover */
    box-shadow: 0 8px 20px rgba(0,0,0,0.4);
    transform: translateY(-3px);
}

/* Story Output Area */
#story-output {
    margin-top: 40px;
    border-top: 1px solid #5a427d; /* Soft separator */
    padding-top: 30px;
    text-align: center;
}

.hidden {
    display: none;
}

.spinner {
    border: 5px solid rgba(160, 129, 199, 0.2); /* Soft indigo spinner */
    width: 40px; /* Larger spinner */
    height: 40px;
    border-radius: 50%;
    border-left-color: #a081c7; /* Glowing part of spinner */
    animation: spin 1s infinite linear;
    margin: 25px auto;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

#story-text {
    text-align: left;
    white-space: pre-wrap;
    max-height: 450px; /* Taller story text area */
    overflow-y: auto;
    padding: 25px;
    border: 1px solid var(--border-color); /* Use theme border color */
    border-radius: 15px; /* Rounded story text area */
    background-color: var(--bg-paper); /* Use theme background */
    color: var(--text-primary); /* Use theme text color */
    box-shadow: inset 0 2px 10px var(--shadow-medium);
    line-height: 1.8; /* Increased line spacing */
    font-size: 1.1em;
    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}

#story-text h2 {
    text-align: center;
    color: var(--text-primary); /* Use theme text color */
    margin-bottom: 20px;
    font-family: 'Playfair Display', serif;
    font-size: 1.8em;
}

/* Audio Player and Play Button */
#story-audio-player {
    width: 100%;
    margin-top: 20px;
    border-radius: 10px;
}

#upload-to-yoto-button {
    background-color: #a081c7; /* Matching purple button */
    color: #fff;
    margin-top: 15px;
    font-weight: bold;
    border-radius: 10px;
    box-shadow: 0 5px 12px rgba(0,0,0,0.3);
    padding: 14px 25px;
    font-size: 1.1em;
}

#upload-to-yoto-button:hover {
    background-color: #7b5b9c;
    box-shadow: 0 7px 18px rgba(0,0,0,0.4);
    transform: translateY(-2px);
}

.login-btn, .logout-btn {
    background-color: #e6e0f3;
    color: #3b2a52;
    padding: 16px 24px;
    border: none;
    border-radius: 10px;
    font-size: 1.2em;
    cursor: pointer;
    font-weight: bold;
    box-shadow: 0 6px 15px rgba(0,0,0,0.3);
    letter-spacing: 0.5px;
    transition: all 0.3s ease-in-out;
}

.login-btn:hover, .logout-btn:hover {
    background-color: #c0a8e0;
    box-shadow: 0 8px 20px rgba(0,0,0,0.4);
    transform: translateY(-3px);
}

/* ✨ ANIMATIONS & KEYFRAMES */
@keyframes doodleBounce {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(5deg); }
}

@keyframes sparkle {
  0% { transform: scale(1) rotate(0deg); opacity: 1; }
  50% { transform: scale(1.2) rotate(180deg); opacity: 0.8; }
  100% { transform: scale(1) rotate(360deg); opacity: 1; }
}

@keyframes doodleFloat {
  0%, 100% { transform: translateY(0) rotate(-5deg); }
  33% { transform: translateY(-8px) rotate(5deg); }
  66% { transform: translateY(-4px) rotate(-2deg); }
}

@keyframes wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(2deg); }
  75% { transform: rotate(-2deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}

@keyframes fadeInUp {
  from { 
    opacity: 0; 
    transform: translateY(30px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}

@keyframes magicalSpin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}

/* 🗺 BACKGROUND DOODLES */
.background-doodles {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.doodle-element {
  position: absolute;
  font-size: 2em;
  color: var(--accent-color);
  opacity: 0.3;
  animation: float 6s ease-in-out infinite;
}

.doodle-element:nth-child(even) {
  animation-delay: 1s;
  animation-duration: 8s;
}

.doodle-element:nth-child(3n) {
  animation-delay: 2s;
  animation-duration: 7s;
}

[data-theme="dark"] .doodle-element {
  color: var(--accent-color);
  text-shadow: 0 0 10px currentColor;
  opacity: 0.2;
}

/* 🎨 BUTTON STYLES */
.paper-btn {
  font-family: var(--font-title);
  font-size: 1.2em;
  padding: 15px 30px;
  border: 3px solid var(--border-color);
  border-radius: 20px;
  background: var(--accent-color);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 
    0 4px 8px rgba(255, 107, 107, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transform: var(--paper-rotation);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  position: relative;
  overflow: hidden;
}

.paper-btn:hover {
  background: var(--accent-secondary);
  transform: var(--paper-rotation) scale(1.05);
  box-shadow: 
    0 6px 16px rgba(255, 107, 107, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.paper-btn:active {
  transform: var(--paper-rotation) scale(0.95);
}

[data-theme="dark"] .paper-btn {
  background: var(--accent-color);
  border-color: var(--border-color);
  box-shadow: 
    0 4px 8px rgba(245, 158, 11, 0.3),
    0 0 20px rgba(245, 158, 11, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

[data-theme="dark"] .paper-btn:hover {
  background: var(--accent-secondary);
  box-shadow: 
    0 6px 16px rgba(245, 158, 11, 0.4),
    0 0 30px rgba(245, 158, 11, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.btn-text {
  font-weight: 600;
}

.btn-doodle {
  font-size: 1.1em;
  animation: wiggle 3s ease-in-out infinite;
}

/* ✨ FORGE BUTTON */
.forge-btn {
  font-family: var(--font-title);
  font-size: 1.4em;
  padding: 20px 40px;
  border: none;
  border-radius: 30px;
  background: linear-gradient(45deg, var(--accent-color), var(--accent-secondary));
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 
    0 6px 20px rgba(255, 107, 107, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transform: rotate(-1deg);
  position: relative;
  overflow: hidden;
  text-align: center;
}

.forge-btn:hover {
  transform: rotate(1deg) scale(1.05);
  box-shadow: 
    0 8px 25px rgba(255, 107, 107, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.forge-btn:active {
  transform: rotate(-0.5deg) scale(0.98);
}

[data-theme="dark"] .forge-btn {
  background: linear-gradient(45deg, var(--accent-color), var(--accent-secondary));
  box-shadow: 
    0 6px 20px rgba(245, 158, 11, 0.4),
    0 0 30px rgba(245, 158, 11, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.btn-sparkles {
  position: absolute;
  top: -5px;
  right: -5px;
  display: flex;
  gap: 5px;
}

.btn-sparkles span {
  animation: sparkle 1.5s ease-in-out infinite;
}

.btn-sparkles span:nth-child(2) {
  animation-delay: 0.3s;
}

.btn-sparkles span:nth-child(3) {
  animation-delay: 0.6s;
}

/* 🎲 SURPRISE BUTTON */
.button-divider {
  display: flex;
  align-items: center;
  margin: 20px 0;
  position: relative;
}

.divider-text {
  background: var(--paper-bg);
  padding: 0 15px;
  font-family: var(--font-title);
  color: var(--text-secondary);
  font-size: 1em;
  z-index: 2;
  position: relative;
}

.divider-line {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--border-color);
  opacity: 0.5;
}

.surprise-btn {
  font-family: var(--font-title);
  font-size: 1.3em;
  padding: 18px 35px;
  border: none;
  border-radius: 25px;
  background: linear-gradient(45deg, #ff6b9d, #c44569);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 
    0 5px 18px rgba(255, 107, 157, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transform: rotate(0.5deg);
  position: relative;
  overflow: hidden;
  text-align: center;
}

.surprise-btn:hover {
  transform: rotate(-0.5deg) scale(1.05);
  background: linear-gradient(45deg, #c44569, #ff6b9d);
  box-shadow: 
    0 7px 22px rgba(255, 107, 157, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.surprise-btn:active {
  transform: rotate(0.2deg) scale(0.98);
}

[data-theme="dark"] .surprise-btn {
  background: linear-gradient(45deg, #e056fd, #8b5cf6);
  box-shadow: 
    0 5px 18px rgba(224, 86, 253, 0.4),
    0 0 25px rgba(224, 86, 253, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

[data-theme="dark"] .surprise-btn:hover {
  background: linear-gradient(45deg, #8b5cf6, #e056fd);
  box-shadow: 
    0 7px 22px rgba(224, 86, 253, 0.5),
    0 0 35px rgba(224, 86, 253, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

/* 📦 MODAL STYLING */
.modal {
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(5px);
}

.modal-content {
  max-width: 500px;
  width: 90%;
  position: relative;
  animation: fadeInUp 0.4s ease-out;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.modal-icon {
  font-size: 2em;
  color: var(--accent-color);
}

.modal-doodles {
  display: flex;
  gap: 10px;
}

.modal-doodles span {
  color: var(--accent-color);
  font-size: 1.5em;
  animation: doodleBounce 2s ease-in-out infinite;
}

.modal-doodles span:nth-child(2) {
  animation-delay: 0.3s;
}

.alert-text {
  font-family: var(--font-body);
  font-size: 1.2em;
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0;
}

.close-button {
  position: absolute;
  top: 15px;
  right: 20px;
  font-size: 30px;
  font-weight: bold;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
  background: none;
  border: none;
  padding: 5px;
  line-height: 1;
}

.close-button:hover {
  color: var(--accent-color);
  transform: scale(1.1);
}

/* 🔧 SIMPLE DEBUG SECTION */
.debug-simple {
  margin: 20px 0;
}

.debug-simple h3 {
  margin: 0 0 15px 0;
  color: var(--text-primary);
  font-family: var(--font-title);
}

.debug-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 15px;
}

.debug-controls input {
  padding: 8px 12px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 0.9em;
}

.debug-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.debug-buttons button {
  background: var(--accent-secondary);
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 8px;
  font-family: var(--font-body);
  font-size: 0.9em;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px var(--shadow-light);
}

.debug-buttons button:hover {
  background: var(--accent-color);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px var(--shadow-medium);
}

.debug-output {
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  padding: 15px;
  margin: 15px 0;
}

#debug-logs-simple {
  background: #1a1a1a;
  color: #00ff00;
  padding: 10px;
  border-radius: 6px;
  min-height: 100px;
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.8em;
  line-height: 1.4;
  white-space: pre-wrap;
}

#debug-players {
  margin-top: 15px;
}

#debug-players audio {
  width: 100%;
  margin: 10px 0;
  border-radius: 6px;
}

@media (max-width: 768px) {
  .debug-controls {
    grid-template-columns: 1fr;
  }
  
  .debug-buttons {
    justify-content: center;
  }
}

/* 📱 RESPONSIVE DESIGN */
@media (max-width: 768px) {
  .main-content {
    padding: 10px;
  }
  
  .main-title {
    font-size: 2.5em;
  }
  
  .paper-scrap {
    padding: 20px;
    margin: 15px 0;
  }
  
  .story-form {
    gap: 20px;
  }
  
  .playful-label {
    font-size: 1.2em;
  }
  
  .paper-input,
  .paper-select {
    padding: 12px 15px;
    font-size: 1em;
  }
  
  .forge-btn {
    font-size: 1.2em;
    padding: 15px 30px;
  }
  
  .background-doodles .doodle-element {
    font-size: 1.5em;
  }
  
  .theme-toggle {
    top: 15px;
    right: 15px;
  }
}

@media (max-width: 480px) {
  .main-title {
    font-size: 2em;
  }
  
  .subtitle {
    font-size: 1.2em;
  }
  
  .form-title {
    font-size: 1.8em;
  }
  
  .paper-scrap {
    padding: 15px;
  }
  
  .title-word {
    margin: 0 5px;
  }
}

/* 📖 STORY OUTPUT STYLES */
.story-output-container {
  margin-top: 40px;
  animation: fadeInUp 0.6s ease-out;
}

.story-header {
  text-align: center;
  margin-bottom: 30px;
  position: relative;
}

.story-title {
  font-family: var(--font-title);
  font-size: 2em;
  color: var(--accent-color);
  margin: 0;
  text-shadow: 2px 2px 0 var(--accent-secondary);
}

[data-theme="dark"] .story-title {
  text-shadow: 
    2px 2px 0 var(--accent-secondary),
    0 0 15px var(--accent-color);
}

.title-underline {
  height: 3px;
  background: linear-gradient(90deg, var(--accent-color), var(--accent-secondary));
  margin: 10px auto;
  width: 200px;
  border-radius: 2px;
}

.story-doodles {
  position: absolute;
  top: -15px;
  right: 20px;
  display: flex;
  gap: 10px;
}

.story-doodles .doodle {
  color: var(--accent-color);
  font-size: 1.5em;
  animation: sparkle 2s ease-in-out infinite;
}

.story-doodles .doodle:nth-child(2) {
  animation-delay: 0.4s;
}

.story-doodles .doodle:nth-child(3) {
  animation-delay: 0.8s;
}

/* ✨ MAGICAL LOADING SPINNER */
.loading-section {
  text-align: center;
  padding: 40px;
}

.magical-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid var(--accent-secondary);
  border-top: 4px solid var(--accent-color);
  border-radius: 50%;
  margin: 0 auto 20px;
  animation: magicalSpin 1s linear infinite;
  box-shadow: 
    0 0 20px rgba(255, 107, 107, 0.3),
    inset 0 0 20px rgba(78, 205, 196, 0.3);
}

[data-theme="dark"] .magical-spinner {
  border-color: var(--accent-secondary);
  border-top-color: var(--accent-color);
  box-shadow: 
    0 0 30px rgba(245, 158, 11, 0.4),
    inset 0 0 20px rgba(6, 214, 160, 0.3);
}

.loading-text {
  font-family: var(--font-handwriting);
  font-size: 1.3em;
  color: var(--text-secondary);
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.loading-emoji {
  animation: pulse 1.5s ease-in-out infinite;
}

/* 📚 STORY CONTENT */
.story-content {
  position: relative;
  margin: 30px 0;
}

.story-text-container {
  position: relative;
  padding: 20px 0;
}

.story-decoration-top,
.story-decoration-bottom {
  text-align: center;
  margin: 15px 0;
  display: flex;
  justify-content: center;
  gap: 20px;
}

.story-decoration-top span,
.story-decoration-bottom span {
  font-size: 1.5em;
  color: var(--accent-color);
  animation: sparkle 3s ease-in-out infinite;
}

.story-decoration-top span:nth-child(2),
.story-decoration-bottom span:nth-child(2) {
  animation-delay: 0.5s;
}

.story-decoration-top span:nth-child(3),
.story-decoration-bottom span:nth-child(3) {
  animation-delay: 1s;
}

.story-text {
  font-family: var(--font-body);
  font-size: 1.2em;
  line-height: 1.8;
  color: var(--text-primary);
  padding: 25px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 15px;
  border: 2px solid var(--border-color);
  margin: 0;
  white-space: pre-wrap;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] .story-text {
  background: rgba(45, 27, 78, 0.6);
  color: var(--text-primary);
  text-shadow: 0 0 8px var(--text-primary);
  border-color: var(--border-color);
  box-shadow: 
    inset 0 2px 8px rgba(0, 0, 0, 0.3),
    0 0 15px rgba(167, 139, 250, 0.1);
}

/* 🎧 AUDIO SECTION */
.audio-section {
  text-align: center;
  margin: 30px 0;
}

.audio-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-bottom: 20px;
  font-family: var(--font-handwriting);
  font-size: 1.4em;
  color: var(--text-accent);
}

.audio-icon {
  font-size: 1.2em;
  animation: wiggle 3s ease-in-out infinite;
}

.story-audio {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  border-radius: 15px;
  box-shadow: 0 4px 12px var(--shadow-medium);
}

/* 🎵 YOTO SECTION */
.yoto-section {
  text-align: center;
  margin: 30px 0;
}

.yoto-btn {
  font-family: var(--font-title);
  font-size: 1.3em;
  padding: 18px 35px;
  border: 3px solid var(--border-color);
  border-radius: 25px;
  background: linear-gradient(45deg, var(--accent-color), var(--accent-secondary));
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 
    0 5px 15px rgba(255, 107, 107, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transform: rotate(-1deg);
  display: inline-flex;
  align-items: center;
  gap: 12px;
  position: relative;
}

.yoto-btn:hover {
  transform: rotate(1deg) scale(1.05);
  box-shadow: 
    0 7px 20px rgba(255, 107, 107, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.yoto-btn:active {
  transform: rotate(-0.5deg) scale(0.98);
}

[data-theme="dark"] .yoto-btn {
  background: linear-gradient(45deg, var(--accent-color), var(--accent-secondary));
  box-shadow: 
    0 5px 15px rgba(245, 158, 11, 0.4),
    0 0 25px rgba(245, 158, 11, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.btn-icon {
  font-size: 1.1em;
}

.btn-magic {
  font-size: 1.2em;
  animation: sparkle 2s ease-in-out infinite;
}

/* 🔍 UTILITY CLASSES */
.hidden {
  display: none !important;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* 🏠 WELCOME SECTION */
.welcome-section {
  text-align: center;
  margin-bottom: 40px;
  padding: 20px 0;
}

.welcome-content {
  position: relative;
  max-width: 800px;
  margin: 0 auto;
}

.welcome-decorative-icons {
  position: relative;
  width: 100%;
  height: 40px;
  margin-bottom: 20px;
}

.left-icon, .right-icon {
  position: absolute;
  font-size: 2.5em;
  color: var(--accent-color);
  filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.1));
  top: 0;
}

.left-icon {
  left: 0;
}

.right-icon {
  right: 0;
}

[data-theme="dark"] .left-icon,
[data-theme="dark"] .right-icon {
  color: var(--accent-color);
  text-shadow: 0 0 10px var(--accent-color);
}

.welcome-title {
  font-family: var(--font-title);
  font-size: 2.4em;
  color: var(--accent-color);
  margin: 0 0 30px 0;
  text-shadow: 2px 2px 0 var(--accent-secondary);
}

[data-theme="dark"] .welcome-title {
  color: var(--accent-color);
  text-shadow: 
    2px 2px 0 var(--accent-secondary),
    0 0 15px var(--accent-color);
}

.mode-summary {
  margin-top: 20px;
}

.summary-text {
  font-family: var(--font-handwriting);
  font-size: 1.4em;
  color: var(--text-secondary);
  margin: 0 0 20px 0;
  transform: rotate(-0.5deg);
}

[data-theme="dark"] .summary-text {
  color: var(--text-secondary);
  text-shadow: 0 0 8px var(--text-secondary);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 15px;
  max-width: 600px;
  margin: 0 auto;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 15px 10px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.summary-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

[data-theme="dark"] .summary-item {
  background: rgba(45, 27, 78, 0.6);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

[data-theme="dark"] .summary-item:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.summary-icon {
  font-size: 2em;
  filter: drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.1));
}

.summary-label {
  font-family: var(--font-body);
  font-size: 0.9em;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
}

[data-theme="dark"] .summary-label {
  color: var(--text-primary);
}

/* 🎭 MODE SELECTION GRID */
.mode-selection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 25px;
  margin: 40px 0;
}

.mode-btn {
  /* Crayon/masking tape base styling */
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.95), 
    rgba(248, 250, 252, 0.95)
  );
  border: none;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-height: 200px;
  transform: rotate(-1deg);
  
  /* Crayon texture effect */
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    inset 0 -1px 0 rgba(0, 0, 0, 0.05);
  
}

/* Masking tape edges */
.mode-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    linear-gradient(45deg, transparent 25%, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.1) 50%, transparent 50%, transparent 75%, rgba(255,255,255,0.1) 75%),
    linear-gradient(90deg, 
      transparent 0%, 
      rgba(0,0,0,0.05) 2%, 
      transparent 4%, 
      transparent 96%, 
      rgba(0,0,0,0.05) 98%, 
      transparent 100%
    );
  background-size: 8px 8px, 100% 100%;
  pointer-events: none;
  opacity: 0.3;
}

/* Washi tape color strips */
.mode-btn::after {
  content: '';
  position: absolute;
  top: 0;
  left: -2px;
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, 
    var(--accent-color) 0%,
    var(--accent-secondary) 100%
  );
  border-radius: 2px;
  opacity: 0.7;
}

.mode-btn:nth-child(even) {
  transform: rotate(1deg);
}

.mode-btn:nth-child(even)::after {
  left: auto;
  right: -2px;
  background: linear-gradient(180deg, 
    #ff6b9d 0%,
    #c44569 100%
  );
}

/* Individual crayon colors for each button */
.mode-btn:nth-child(1)::after {
  background: linear-gradient(180deg, #ff6b6b 0%, #ee5a24 100%); /* Classic - Red */
}

.mode-btn:nth-child(2)::after {
  background: linear-gradient(180deg, #4ecdc4 0%, #26d0ce 100%); /* Wanted - Teal */
}

.mode-btn:nth-child(3)::after {
  background: linear-gradient(180deg, #45b7d1 0%, #3742fa 100%); /* Homework - Blue */
}

.mode-btn:nth-child(4)::after {
  background: linear-gradient(180deg, #a55eea 0%, #8c7ae6 100%); /* Sleep - Purple */
}

.mode-btn:nth-child(5)::after {
  background: linear-gradient(180deg, #fd79a8 0%, #e84393 100%); /* Monster - Pink */
}

.mode-btn:nth-child(6)::after {
  background: linear-gradient(180deg, #fdcb6e 0%, #f39c12 100%); /* Help - Yellow */
}

.mode-btn:hover {
  transform: rotate(-1deg) translateY(-8px) scale(1.05);
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 1), 
    rgba(248, 250, 252, 1)
  );
  box-shadow: 
    0 16px 48px rgba(0, 0, 0, 0.15),
    inset 0 2px 0 rgba(255, 255, 255, 1),
    inset 0 -2px 0 rgba(0, 0, 0, 0.08);
}

.mode-btn:nth-child(even):hover {
  transform: rotate(1deg) translateY(-8px) scale(1.05);
}

.mode-btn:active {
  transform: var(--paper-rotation) translateY(-2px) scale(0.98);
}

[data-theme="dark"] .mode-btn {
  background: linear-gradient(135deg, 
    rgba(45, 27, 78, 0.95), 
    rgba(55, 35, 88, 0.95)
  );
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(167, 139, 250, 0.3),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] .mode-btn:hover {
  background: linear-gradient(135deg, 
    rgba(55, 35, 88, 1), 
    rgba(65, 45, 98, 1)
  );
  box-shadow: 
    0 16px 48px rgba(0, 0, 0, 0.25),
    0 0 30px rgba(167, 139, 250, 0.3),
    inset 0 2px 0 rgba(167, 139, 250, 0.4),
    inset 0 -2px 0 rgba(0, 0, 0, 0.15);
}

.mode-icon {
  font-size: 3em;
  margin-bottom: 15px;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.1));
}

.mode-btn:hover .mode-icon {
  animation: crayonBounce 0.6s ease-out;
  transform: scale(1.1);
  filter: drop-shadow(3px 3px 6px rgba(0, 0, 0, 0.15));
}

.mode-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.mode-title {
  font-family: var(--font-title);
  font-size: 1.4em;
  color: var(--text-primary);
  margin: 0 0 12px 0;
  text-shadow: 1px 1px 0 var(--accent-secondary);
}

[data-theme="dark"] .mode-title {
  color: var(--text-primary);
  text-shadow: 
    1px 1px 0 var(--accent-secondary),
    0 0 10px var(--text-primary);
}

.mode-description {
  font-family: var(--font-body);
  font-size: 1em;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0 0 15px 0;
  flex: 1;
}

[data-theme="dark"] .mode-description {
  color: var(--text-secondary);
}

.mode-doodles {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: auto;
}

.mode-doodles span {
  font-size: 1.3em;
  color: var(--accent-color);
  transition: all 0.2s ease;
  filter: drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.1));
}

.mode-btn:hover .mode-doodles span {
  animation: doodleWiggle 0.8s ease-out;
}

.mode-btn:hover .mode-doodles span:nth-child(2) {
  animation-delay: 0.1s;
}

.mode-btn:hover .mode-doodles span:nth-child(3) {
  animation-delay: 0.2s;
}

/* Mode button active state */
.mode-btn.active {
  background: linear-gradient(135deg, 
    rgba(255, 107, 107, 0.1), 
    rgba(248, 250, 252, 1)
  );
  transform: rotate(-1deg) scale(1.02);
  box-shadow: 
    0 12px 36px rgba(255, 107, 107, 0.2),
    0 0 25px rgba(255, 107, 107, 0.3),
    inset 0 2px 0 rgba(255, 255, 255, 0.9),
    inset 0 -2px 0 rgba(255, 107, 107, 0.1);
}

[data-theme="dark"] .mode-btn.active {
  background: linear-gradient(135deg, 
    rgba(245, 158, 11, 0.1), 
    rgba(55, 35, 88, 1)
  );
  box-shadow: 
    0 12px 36px rgba(245, 158, 11, 0.2),
    0 0 30px rgba(245, 158, 11, 0.3),
    inset 0 2px 0 rgba(167, 139, 250, 0.4),
    inset 0 -2px 0 rgba(245, 158, 11, 0.1);
}

/* 📝 MODE CONTENT CONTAINER */
.mode-content-container {
  margin-top: 40px;
  animation: fadeInUp 0.6s ease-out;
}

/* Back to modes button */
.back-to-modes-btn {
  font-family: var(--font-body);
  font-size: 1.1em;
  padding: 12px 24px;
  margin-bottom: 20px;
  border: 2px solid var(--border-color);
  border-radius: 15px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 3px 8px var(--shadow-light);
  transform: rotate(-0.5deg);
}

.back-to-modes-btn:hover {
  background: var(--accent-secondary);
  color: white;
  transform: rotate(0deg) scale(1.05);
  box-shadow: 0 5px 15px var(--shadow-medium);
}

/* 📱 RESPONSIVE MODE GRID */
@media (max-width: 768px) {
  .mode-selection-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .mode-btn {
    min-height: 180px;
    padding: 20px;
  }
  
  .mode-icon {
    font-size: 2.5em;
  }
  
  .mode-title {
    font-size: 1.3em;
  }
  
  .welcome-title {
    font-size: 2em;
  }
  
  .welcome-decorative-icons {
    height: 35px;
    margin-bottom: 15px;
  }
  
  .left-icon, .right-icon {
    font-size: 2em;
  }
  
  .summary-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  
  .summary-item {
    padding: 12px 8px;
  }
  
  .summary-icon {
    font-size: 1.8em;
  }
  
  .summary-label {
    font-size: 0.8em;
  }
}

@media (max-width: 480px) {
  .mode-selection-grid {
    gap: 15px;
  }
  
  .mode-btn {
    min-height: 160px;
    padding: 15px;
  }
  
  .welcome-title {
    font-size: 1.7em;
  }
  
  .welcome-decorative-icons {
    height: 30px;
    margin-bottom: 12px;
  }
  
  .left-icon, .right-icon {
    font-size: 1.8em;
  }
  
  .summary-text {
    font-size: 1.2em;
  }
  
  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  
  .summary-item {
    padding: 10px 6px;
  }
  
  .summary-icon {
    font-size: 1.6em;
  }
  
  .summary-label {
    font-size: 0.75em;
  }
}

/* 📚 HELP SECTION STYLES */
.mode-header {
  margin-bottom: 30px;
}

.mode-title-header {
  font-family: var(--font-title);
  font-size: 2em;
  color: var(--accent-color);
  margin: 15px 0 0 0;
  text-shadow: 2px 2px 0 var(--accent-secondary);
  display: flex;
  align-items: center;
  gap: 15px;
}

[data-theme="dark"] .mode-title-header {
  color: var(--accent-color);
  text-shadow: 
    2px 2px 0 var(--accent-secondary),
    0 0 15px var(--accent-color);
}

.help-content {
  padding: 30px;
}

.help-section {
  margin-bottom: 40px;
}

.help-section h3 {
  font-family: var(--font-title);
  font-size: 1.5em;
  color: var(--text-primary);
  margin-bottom: 20px;
  text-shadow: 1px 1px 0 var(--accent-secondary);
}

[data-theme="dark"] .help-section h3 {
  color: var(--text-primary);
  text-shadow: 
    1px 1px 0 var(--accent-secondary),
    0 0 10px var(--text-primary);
}

.help-section ol,
.help-section ul {
  font-family: var(--font-body);
  font-size: 1.1em;
  color: var(--text-primary);
  line-height: 1.7;
}

.help-section li {
  margin-bottom: 10px;
}

.mode-guide-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.mode-guide {
  background: rgba(255, 255, 255, 0.5);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
  transform: rotate(-0.5deg);
}

.mode-guide:nth-child(even) {
  transform: rotate(0.5deg);
}

.mode-guide:hover {
  transform: rotate(0deg) scale(1.02);
  box-shadow: 0 4px 12px var(--shadow-medium);
  border-color: var(--accent-color);
}

[data-theme="dark"] .mode-guide {
  background: rgba(45, 27, 78, 0.5);
  border-color: var(--border-color);
}

.mode-guide h4 {
  font-family: var(--font-title);
  font-size: 1.2em;
  color: var(--accent-color);
  margin: 0 0 10px 0;
  text-shadow: 1px 1px 0 var(--accent-secondary);
}

[data-theme="dark"] .mode-guide h4 {
  color: var(--accent-color);
  text-shadow: 
    1px 1px 0 var(--accent-secondary),
    0 0 8px var(--accent-color);
}

.mode-guide p {
  font-family: var(--font-body);
  font-size: 1em;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

[data-theme="dark"] .mode-guide p {
  color: var(--text-secondary);
}

/* Coming Soon Styles */
.coming-soon {
  text-align: center;
  padding: 60px 40px;
}

.coming-soon h3 {
  font-family: var(--font-title);
  font-size: 2em;
  color: var(--accent-color);
  margin-bottom: 20px;
  text-shadow: 2px 2px 0 var(--accent-secondary);
}

[data-theme="dark"] .coming-soon h3 {
  color: var(--accent-color);
  text-shadow: 
    2px 2px 0 var(--accent-secondary),
    0 0 15px var(--accent-color);
}

.coming-soon p {
  font-family: var(--font-body);
  font-size: 1.2em;
  color: var(--text-secondary);
  margin-bottom: 30px;
}

[data-theme="dark"] .coming-soon p {
  color: var(--text-secondary);
}

.coming-soon-doodles {
  display: flex;
  justify-content: center;
  gap: 20px;
}

.coming-soon-doodles span {
  font-size: 2em;
  color: var(--accent-color);
  animation: bounce 2s ease-in-out infinite;
}

.coming-soon-doodles span:nth-child(2) {
  animation-delay: 0.3s;
}

.coming-soon-doodles span:nth-child(3) {
  animation-delay: 0.6s;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes crayonBounce {
  0% { transform: scale(1); }
  30% { transform: scale(1.15) rotate(-2deg); }
  60% { transform: scale(1.05) rotate(1deg); }
  100% { transform: scale(1.1) rotate(0deg); }
}

@keyframes doodleWiggle {
  0% { transform: rotate(0deg) scale(1); }
  20% { transform: rotate(3deg) scale(1.1); }
  40% { transform: rotate(-2deg) scale(1.05); }
  60% { transform: rotate(1deg) scale(1.08); }
  80% { transform: rotate(-1deg) scale(1.02); }
  100% { transform: rotate(0deg) scale(1); }
}

/* Responsive help section */
@media (max-width: 768px) {
  .mode-guide-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .help-content {
    padding: 20px;
  }
  
  .mode-title-header {
    font-size: 1.7em;
    flex-direction: column;
    gap: 10px;
  }
}

/* Required field indicator */
.required {
  color: var(--accent-color);
  font-weight: bold;
  margin-left: 2px;
}

[data-theme="dark"] .required {
  color: var(--accent-color);
  text-shadow: 0 0 5px var(--accent-color);
}
</file>

<file path="index.html">
<!DOCTYPE html>
<!-- Trigger redeploy -->
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Storyforge ✨ - Create Magical Audio Stories</title>
    <link rel="stylesheet" href="styles.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fredoka+One:wght@400&family=Kalam:wght@300;400;700&family=Caveat:wght@400;600;700&display=swap" rel="stylesheet">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📚</text></svg>">
</head>
<body>
    <!-- Top Bar with compact logo and controls -->
    <div class="top-bar">
        <div class="nav-section">
            <div class="compact-logo" id="logo-home" title="Return to mode selection">
                <span class="title-word">The</span>
                <div class="storyforge-nav-container">
                    <span class="title-word highlight storyforge-nav-trigger">Storyforge</span>
                    <div class="nav-dropdown" id="nav-dropdown">
                        <div class="nav-item" data-mode="classic">
                            <span class="nav-icon">📚</span>
                            <span class="nav-label">Classic Story</span>
                        </div>
                        <div class="nav-item" data-mode="adventure-me">
                            <span class="nav-icon">⚔️</span>
                            <span class="nav-label">Adventure Me</span>
                        </div>
                        <div class="nav-item" data-mode="homework-forge">
                            <span class="nav-icon">📝</span>
                            <span class="nav-label">Homework Forge</span>
                        </div>
                        <div class="nav-item" data-mode="sleep-forge">
                            <span class="nav-icon">🌙</span>
                            <span class="nav-label">Sleep Forge</span>
                        </div>
                        <div class="nav-item" data-mode="dream-job">
                            <span class="nav-icon">🔮</span>
                            <span class="nav-label">Dream Job Detective</span>
                        </div>
                        <div class="nav-item" data-mode="monster-maker">
                            <span class="nav-icon">👹</span>
                            <span class="nav-label">Monster Maker</span>
                        </div>
                        <div class="nav-divider"></div>
                        <div class="nav-item" data-mode="help">
                            <span class="nav-icon">💡</span>
                            <span class="nav-label">Help & Tips</span>
                        </div>
                    </div>
                </div>
                <span class="title-doodle">✨</span>
                <span class="current-mode" id="current-mode"></span>
            </div>
        </div>
        <div class="top-controls">
            <button id="settings-btn" class="settings-btn" aria-label="Settings" title="Settings (Coming Soon)">
                <span class="settings-icon">⚙️</span>
            </button>
            <div id="yoto-status" class="yoto-status hidden" title="Connected to Yoto">
                <div class="status-dot"></div>
            </div>
            <button id="theme-toggle" class="theme-btn" aria-label="Toggle dark mode">
                <span class="sun-icon">☀️</span>
                <span class="moon-icon">🌙</span>
            </button>
        </div>
    </div>

    <main class="main-content">
        <div class="auth-section paper-scrap hidden">
            <button id="login-button" class="login-btn">
                <span class="btn-icon">🎧</span>
                <span class="btn-text">Connect to Yoto</span>
                <span class="btn-magic">✨</span>
            </button>
        </div>

        <div id="app-content" class="app-container hidden">
            <!-- Welcome Section -->
            <div class="welcome-section">
                <div class="welcome-content">
                    <div class="welcome-decorative-icons">
                        <span class="left-icon">🎭</span>
                        <span class="right-icon">✨</span>
                    </div>
                    <h2 class="welcome-title">
                        Welcome to StoryForge
                    </h2>
                    <div class="storyforge-intro">
                        <p class="intro-description">
                            <strong>StoryForge</strong> is where your imagination comes to life! 🌟 Our AI storyteller creates personalized adventures just for you, complete with your artwork, characters, and dreams. Each story becomes a beautiful audiobook that's automatically sent to your Yoto player.
                        </p>
                        <div class="intro-features">
                            <div class="feature-item">
                                <span class="feature-icon">🎨</span>
                                <span class="feature-text">Your Art Becomes Stories</span>
                            </div>
                            <div class="feature-item">
                                <span class="feature-icon">🎧</span>
                                <span class="feature-text">Instant Yoto Audiobooks</span>
                            </div>
                            <div class="feature-item">
                                <span class="feature-icon">✨</span>
                                <span class="feature-text">AI-Powered Creativity</span>
                            </div>
                        </div>
                        <p class="modes-intro">
                            Choose your adventure below or use the navigation menu to explore different storytelling modes!
                        </p>
                    </div>
                </div>
            </div>

            <!-- Mode Selection Grid -->
            <div class="mode-selection-grid">
                <button class="mode-btn paper-scrap" data-mode="classic">
                    <div class="mode-icon">📚</div>
                    <div class="mode-content">
                        <h3 class="mode-title">Classic Story</h3>
                        <p class="mode-description">Create traditional tales with heroes, adventures, and magical endings</p>
                        <div class="mode-doodles">
                            <span>⚔️</span>
                            <span>🏰</span>
                            <span>✨</span>
                        </div>
                    </div>
                </button>

                <button class="mode-btn paper-scrap" data-mode="adventure-me">
                    <div class="mode-icon">⚔️</div>
                    <div class="mode-content">
                        <h3 class="mode-title">Adventure Me</h3>
                        <p class="mode-description">Put yourself in epic adventures! Choose from Wild West, underwater, sky, or jungle themes</p>
                        <div class="mode-doodles">
                            <span>🏔️</span>
                            <span>🌊</span>
                            <span>☁️</span>
                        </div>
                    </div>
                </button>

                <button class="mode-btn paper-scrap" data-mode="homework-forge">
                    <div class="mode-icon">📝</div>
                    <div class="mode-content">
                        <h3 class="mode-title">Homework Forge</h3>
                        <p class="mode-description">Turn learning into adventure! Educational stories that make subjects exciting</p>
                        <div class="mode-doodles">
                            <span>🧮</span>
                            <span>🔬</span>
                            <span>📖</span>
                        </div>
                    </div>
                </button>

                <button class="mode-btn paper-scrap" data-mode="sleep-forge">
                    <div class="mode-icon">🌙</div>
                    <div class="mode-content">
                        <h3 class="mode-title">Sleep Forge</h3>
                        <p class="mode-description">Gentle, calming bedtime stories with soothing narration</p>
                        <div class="mode-doodles">
                            <span>⭐</span>
                            <span>🛏️</span>
                            <span>💤</span>
                        </div>
                    </div>
                </button>

                <button class="mode-btn paper-scrap" data-mode="dream-job">
                    <div class="mode-icon">🔮</div>
                    <div class="mode-content">
                        <h3 class="mode-title">Dream Job Detective</h3>
                        <p class="mode-description">Take a fun quiz to discover your perfect future job and hear your career story!</p>
                        <div class="mode-doodles">
                            <span>🚀</span>
                            <span>🎓</span>
                            <span>✨</span>
                        </div>
                    </div>
                </button>

                <button class="mode-btn paper-scrap" data-mode="monster-maker">
                    <div class="mode-icon">👹</div>
                    <div class="mode-content">
                        <h3 class="mode-title">Monster Maker</h3>
                        <p class="mode-description">Design custom creatures and hear their wild adventures come to life</p>
                        <div class="mode-doodles">
                            <span>🎨</span>
                            <span>🦄</span>
                            <span>🐉</span>
                        </div>
                    </div>
                </button>

                <button class="mode-btn paper-scrap" data-mode="help">
                    <div class="mode-icon">💡</div>
                    <div class="mode-content">
                        <h3 class="mode-title">Help & Templates</h3>
                        <p class="mode-description">Get tips, guides, and downloadable templates for better storytelling</p>
                        <div class="mode-doodles">
                            <span>📋</span>
                            <span>⭐</span>
                            <span>🎯</span>
                        </div>
                    </div>
                </button>
            </div>

            <!-- Dynamic Mode Content Area -->
            <div id="mode-content" class="mode-content-container hidden">
                <!-- Mode-specific content will be dynamically loaded here -->
            </div>
        
            <div id="story-output" class="story-output-container hidden">
                <!-- Main Story Section - combines header, loading, and content -->
                <div class="main-story-section paper-scrap">
                    <div class="story-header">
                        <h2 class="story-title">
                            <span>📚 Your Epic Tale! 📚</span>
                            <div class="title-underline"></div>
                        </h2>
                        <div class="story-doodles">
                            <span class="doodle">✨</span>
                            <span class="doodle">🌟</span>
                            <span class="doodle">✨</span>
                        </div>
                    </div>
                    
                    <div class="loading-section" id="loading-section">
                        <div id="loading-spinner" class="magical-spinner"></div>
                        <p class="loading-text">
                            <span class="loading-emoji">✨</span>
                            <span>Brewing your magical story...</span>
                            <span class="loading-emoji">✨</span>
                        </p>
                    </div>
                    
                    <div class="story-content" id="story-content">
                        <div class="story-text-container">
                            <div class="story-decoration-top">
                                <span>🌟</span>
                                <span>✨</span>
                                <span>🌟</span>
                            </div>
                            <p id="story-text" class="story-text"></p>
                            <div class="story-decoration-bottom">
                                <span>✨</span>
                                <span>🌟</span>
                                <span>✨</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Media & Actions Section - combines audio and Yoto upload -->
                <div class="media-actions-section paper-scrap">
                    <div class="audio-section" id="audio-section">
                        <div class="audio-header">
                            <span class="audio-icon">🎧</span>
                            <span class="audio-text">Listen to Your Story</span>
                            <span class="audio-icon">🎵</span>
                        </div>
                        <audio id="story-audio-player" controls class="story-audio hidden"></audio>
                    </div>
                    
                    <div class="action-divider"></div>
                    
                    <div class="yoto-section" id="yoto-section">
                        <button id="upload-to-yoto-button" class="yoto-btn hidden">
                            <span class="btn-icon">🎧</span>
                            <span class="btn-text">Upload to Yoto</span>
                            <span class="btn-magic">✨</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Simple Debug Section - Shows when ?debug=true -->
        <div id="debug-section" class="debug-simple hidden">
            <div class="paper-scrap">
                <h3>🔧 Debug Tools</h3>
                
                <div class="debug-controls">
                    <input type="text" id="debug-hero" placeholder="Hero: Test Hero" value="Test Hero" />
                    <input type="text" id="debug-setup" placeholder="Setup: magical forest" value="magical forest" />
                    <input type="text" id="debug-rising" placeholder="Rising: lost treasure" value="lost treasure" />
                    <input type="text" id="debug-climax" placeholder="Climax: friendship" value="friendship saves day" />
                </div>
                
                <div class="debug-buttons">
                    <button onclick="testStreamingGET()">🧪 Test GET</button>
                    <button onclick="testStreamingPOST()">📝 Test POST</button>
                    <button onclick="compareStreaming()">⚖️ Compare Both</button>
                    <button onclick="clearDebugLogs()">🧹 Clear</button>
                </div>
                
                <div class="debug-buttons">
                    <h4 style="margin: 10px 0 5px 0; color: #666;">Audio Format Tests:</h4>
                    <button onclick="testMinimal()">🔊 Minimal WAV</button>
                    <button onclick="testSimple()">🔊 Simple WAV</button>
                    <button onclick="testDummyAudio()">🔊 WAV 22kHz</button>
                    <button onclick="testWAV44()">🔊 WAV 44kHz</button>
                    <button onclick="testYotoMinimal()">🎵 Yoto Minimal</button>
                    <button onclick="testYotoSimple()">🎵 Yoto Simple</button>
                    <button onclick="testYotoDummy()">🎵 Yoto WAV 22kHz</button>
                    <button onclick="testYotoWAV44()">🎵 Yoto WAV 44kHz</button>
                </div>
                
                <div id="debug-output" class="debug-output">
                    <div id="debug-logs-simple">🚀 Debug ready...</div>
                </div>
                
                <div id="debug-players"></div>
            </div>
        </div>
    </main>
    
    <div id="alert-modal" class="modal hidden">
        <div class="modal-content paper-scrap">
            <span class="close-button">&times;</span>
            <div class="modal-header">
                <span class="modal-icon">🚨</span>
                <div class="modal-doodles">
                    <span>★</span>
                    <span>♡</span>
                </div>
            </div>
            <p id="alert-message" class="alert-text"></p>
        </div>
    </div>
    
    <!-- Background Doodles -->
    <div class="background-doodles">
        <div class="doodle-element doodle-star" style="top: 10%; left: 5%;">★</div>
        <div class="doodle-element doodle-heart" style="top: 15%; right: 8%;">♡</div>
        <div class="doodle-element doodle-arrow" style="top: 30%; left: 3%;">↗</div>
        <div class="doodle-element doodle-swirl" style="top: 45%; right: 5%;">∿</div>
        <div class="doodle-element doodle-star" style="bottom: 20%; left: 7%;">✦</div>
        <div class="doodle-element doodle-circle" style="bottom: 15%; right: 10%;">○</div>
        <div class="doodle-element doodle-zigzag" style="bottom: 40%; left: 2%;">〰</div>
        <div class="doodle-element doodle-triangle" style="top: 60%; right: 3%;">△</div>
    </div>
    
    <!-- Story Generation Progress Popup -->
    <div id="story-progress-modal" class="modal hidden">
        <div class="modal-content paper-scrap progress-modal">
            <div class="modal-header">
                <span class="modal-icon">✨</span>
                <h3 class="modal-title">Forging Your Epic Tale!</h3>
                <div class="modal-doodles">
                    <span>★</span>
                    <span>♡</span>
                </div>
            </div>
            <div class="progress-stages">
                <div class="stage" id="stage-1">
                    <div class="stage-icon">🧿</div>
                    <div class="stage-text">
                        <div class="stage-title">Gathering Magic Ingredients</div>
                        <div class="stage-subtitle">Collecting pixie dust and inspiration...</div>
                    </div>
                    <div class="stage-status">
                        <div class="stage-spinner hidden"></div>
                        <div class="stage-check hidden">✅</div>
                    </div>
                </div>
                <div class="stage" id="stage-2">
                    <div class="stage-icon">🎨</div>
                    <div class="stage-text">
                        <div class="stage-title">Analyzing Your Artwork</div>
                        <div class="stage-subtitle">Teaching our dragons to see...</div>
                    </div>
                    <div class="stage-status">
                        <div class="stage-spinner hidden"></div>
                        <div class="stage-check hidden">✅</div>
                    </div>
                </div>
                <div class="stage" id="stage-3">
                    <div class="stage-icon">📝</div>
                    <div class="stage-text">
                        <div class="stage-title">Weaving the Tale</div>
                        <div class="stage-subtitle">Our storytelling wizards are at work...</div>
                    </div>
                    <div class="stage-status">
                        <div class="stage-spinner hidden"></div>
                        <div class="stage-check hidden">✅</div>
                    </div>
                </div>
                <div class="stage" id="stage-4">
                    <div class="stage-icon">🎤</div>
                    <div class="stage-text">
                        <div class="stage-title">Bringing Words to Life</div>
                        <div class="stage-subtitle">Training our voice sprites to sing...</div>
                    </div>
                    <div class="stage-status">
                        <div class="stage-spinner hidden"></div>
                        <div class="stage-check hidden">✅</div>
                    </div>
                </div>
                <div class="stage" id="stage-5">
                    <div class="stage-icon">🎧</div>
                    <div class="stage-text">
                        <div class="stage-title">Uploading to Yoto Kingdom</div>
                        <div class="stage-subtitle">Sending via magical portal...</div>
                    </div>
                    <div class="stage-status">
                        <div class="stage-spinner hidden"></div>
                        <div class="stage-check hidden">✅</div>
                    </div>
                </div>
            </div>
            <div class="progress-footer">
                <div class="progress-bar-container">
                    <div class="progress-bar" id="overall-progress-bar"></div>
                </div>
                <div class="progress-text" id="progress-text">Preparing your magical adventure...</div>
            </div>
        </div>
    </div>
    
    <script type="module" src="script.js?v=20250916-1054"></script>
    <script type="module" src="tokens.js?v=20250916-1054"></script>
</body>
</html>
</file>

<file path="api/generate-story.js">
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

// Helper function to process story text with pause control
function processStoryWithPauses(rawStoryText, heroName = '') {
  // Context-aware cleaning that preserves character names like 'Dot'
  let cleanedRawText = rawStoryText;
  
  // If hero name contains punctuation words, be extra careful
  const heroNameLower = heroName.toLowerCase();
  const isProtectedName = heroNameLower.includes('dot') || heroNameLower.includes('period') || 
                         heroNameLower.includes('comma') || heroNameLower.includes('question') ||
                         heroNameLower.includes('exclamation');
  
  // ALWAYS use ultra-conservative cleaning to preserve legitimate word usage
  console.log('🧠 Using ultra-conservative early processing for hero:', heroName);
  
  // SMART punctuation fixing - aggressive on errors, protective of legitimate usage
  
  // First, protect legitimate "dot" usage by temporarily replacing it
  cleanedRawText = rawStoryText
    // Protect "polka dots", "connect the dots", etc.
    .replace(/\b(polka|connect the|tiny)\s+dots?\b/gi, '$1 PROTECTED_DOTS')
    // Protect "dot" as verb: "fireflies dot the trees"
    .replace(/\b(\w+)\s+dots?\s+(the|a|an|these|those)\s/gi, '$1 PROTECTED_DOT_VERB $2 ')
    
    // Now aggressively fix punctuation errors
    .replace(/([a-zA-Z])\s+(dot|period)\s*$/gim, '$1.')
    .replace(/([a-zA-Z])\s+(dot|period)\s*\n/gim, '$1.\n')
    .replace(/([a-zA-Z])\s+(dot|period)\s+([A-Z][a-zA-Z]+)/g, '$1. $3')
    .replace(/([a-zA-Z])\s+(dot|period)\s*([,;!?])/gim, '$1.$3')
    .replace(/([a-zA-Z])\s+(dot|period)\s*(\[pause)/gim, '$1. $3')
    .replace(/([a-zA-Z])\s+(dot|period)\s*(["\'\"\'])/gim, '$1.$3')
    .replace(/([a-zA-Z])\s+(exclamation mark|exclamation point)\s*$/gim, '$1!')
    .replace(/([a-zA-Z])\s+(question mark)\s*$/gim, '$1?')
    
    // Restore protected legitimate usage
    .replace(/PROTECTED_DOTS/g, 'dots')
    .replace(/PROTECTED_DOT_VERB/g, 'dot');
    
  console.log('🧠 Early processing preserved all legitimate word usage');
  
  // Common spacing cleanup
  cleanedRawText = cleanedRawText
    .replace(/\s+([.!?])/g, '$1')
    .replace(/([.!?])([A-Z])/g, '$1 $2');
  
  // For Chirp3-HD, both display and TTS use the same clean text (no pause markers needed)
  const finalText = cleanedRawText
    .replace(/\*/g, '') // Remove any asterisks
    .replace(/\s+/g, ' ') // Clean up spacing
    .replace(/([.!?])([A-Z])/g, '$1 $2') // Ensure space after punctuation
    .trim();
    
  return { displayText: finalText, ttsText: finalText };
}

// Helper function to clean story text for OpenAI TTS (fallback)
function processStoryForTTS(storyText) {
  // For OpenAI TTS, remove pause markers and clean text
  const cleanText = storyText
    // Remove Chirp3-HD pause markers (not supported by OpenAI)
    .replace(/\[pause short\]/g, '')
    .replace(/\[pause long\]/g, '')
    .replace(/\[pause\]/g, '')
    // Remove asterisks and other formatting
    .replace(/\*/g, '')
    .replace(/[^a-zA-Z0-9\s.,!?;:'"-]/g, '')
    // Fix spacing and punctuation
    .replace(/\s+/g, ' ')
    .replace(/([.!?])([A-Z])/g, '$1 $2')
    .trim();

  return cleanText; // OpenAI TTS doesn't support SSML or pause markers
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

// Mode handler functions
async function handleClassicMode(requestBody) {
  const { heroName, promptSetup, promptRising, promptClimax, heroImage, sceneImage, characterDescription, sceneDescription, age, surpriseMode } = requestBody;
  
  // Validate input (skip validation for surprise mode)
  if (!surpriseMode) {
    const hasAtLeastOneElement = 
      (heroName && heroName.trim()) || 
      (promptSetup && promptSetup.trim()) || 
      (promptRising && promptRising.trim()) || 
      (promptClimax && promptClimax.trim());
    
    if (!hasAtLeastOneElement) {
      throw new Error('Please provide at least one story element (hero name, setup, rising action, or climax).');
    }
  }

  console.log(surpriseMode ? "Generating surprise story for client..." : "Generating custom story for client...");
  
  // Add timeout protection (110 seconds - just under Vercel's 120s limit)
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Story generation timeout - please try again')), 110000)
  );
  
  const storyPromise = generateStoryAndAudio({
    heroName, promptSetup, promptRising, promptClimax, heroImage, sceneImage, characterDescription, sceneDescription, age, surpriseMode
  });
  
  const { storyText, audioContent, generatedImage } = await Promise.race([
    storyPromise,
    timeoutPromise
  ]);

  // Return story text, Base64 audio, and generated image (if any) for the client to handle
  const response = {
    story: storyText,
    audio: audioContent.toString('base64'),
    // Calculate estimated duration (rough approximation: ~150 words per minute)
    duration: Math.ceil(storyText.split(' ').length / 2.5), // seconds
    fileSize: audioContent.length,
    // Add basic debugging information for client-side troubleshooting
    debug: {
      storyLength: storyText.length,
      audioSize: audioContent.length,
      heroName: heroName || '',
      punctuationAnalysis: {
        storyContainsDot: (storyText.match(/\bdot\b/gi) || []).length,
        storyContainsPeriod: (storyText.match(/\bperiod\b/gi) || []).length,
        actualPeriods: (storyText.match(/\./g) || []).length
      }
    }
  };
  
  // Include generated image for surprise mode
  if (generatedImage) {
    response.generatedImage = generatedImage;
  }
  
  return response;
}

async function handleWantedPosterMode(requestBody) {
  const { name, wantedFor, skills, reward, useAI, heroImage, age } = requestBody;
  
  if (!name || !wantedFor) {
    throw new Error('Please provide the outlaw\'s name and what they\'re wanted for.');
  }
  
  console.log('Generating wanted poster for:', name);
  
  // Generate character image if AI is requested
  let characterImage = heroImage;
  if (useAI && !heroImage) {
    console.log('🎨 Generating AI character image...');
    characterImage = await generateCharacterImage(name, wantedFor, skills);
  }
  
  // Generate wanted poster image
  const posterImage = await createWantedPoster({
    name,
    wantedFor,
    skills,
    reward,
    characterImage
  });
  
  // Generate Wild West story
  const storyPrompt = `Create an exciting Wild West adventure story about the outlaw ${name}. They are wanted for ${wantedFor}. ${skills ? `They are known for: ${skills}. ` : ''}${reward ? `There's a reward of ${reward} for their capture. ` : ''}Make it a thrilling tale suitable for children aged ${age || 6}-${parseInt(age || 6) + 2} years.`;
  
  const { storyText, audioContent } = await generateStoryAndAudio({
    heroName: name,
    promptSetup: 'the Wild West frontier',
    promptRising: wantedFor,
    promptClimax: 'justice and redemption',
    characterDescription: `Outlaw named ${name}, wanted for ${wantedFor}`,
    age: age || '6'
  });
  
  return {
    story: storyText,
    audio: audioContent.toString('base64'),
    posterImage: posterImage,
    duration: Math.ceil(storyText.split(' ').length / 2.5),
    fileSize: audioContent.length
  };
}

async function handleHomeworkForgeMode(requestBody) {
  const { type, files, subject, topic, age } = requestBody;
  
  let extractedText = '';
  
  if (type === 'upload') {
    if (!files || files.length === 0) {
      throw new Error('Please upload at least one homework file or document.');
    }
    
    console.log('📚 Processing homework files...');
    
    // Extract text from uploaded files (OCR)
    for (const file of files) {
      if (file.type === 'image') {
        const ocrText = await extractTextFromImage(file.data);
        extractedText += ocrText + '\n\n';
      }
    }
    
    if (!extractedText.trim()) {
      throw new Error('Could not extract any text from the uploaded files.');
    }
  } else {
    if (!topic) {
      throw new Error('Please enter a topic to learn about.');
    }
    extractedText = `Subject: ${subject}\nTopic: ${topic}`;
  }
  
  // Generate educational summary story
  const educationalSummary = await generateEducationalSummary(extractedText, age, subject);
  
  // Generate audio using educational TTS voice
  const audioContent = await generateEducationalTTS(educationalSummary, age);
  
  return {
    story: educationalSummary,
    audio: audioContent.toString('base64'),
    duration: Math.ceil(educationalSummary.split(' ').length / 2.0), // Educational content read slightly faster
    fileSize: audioContent.length,
    subject: subject
  };
}

async function handleSleepForgeMode(requestBody) {
  const { heroName, promptSetup, promptRising, promptClimax, age, surpriseMode, heroImage } = requestBody;
  
  // Validate input (skip validation for surprise mode)
  if (!surpriseMode) {
    const hasAtLeastOneElement = 
      (heroName && heroName.trim()) || 
      (promptSetup && promptSetup.trim()) || 
      (promptRising && promptRising.trim()) || 
      (promptClimax && promptClimax.trim());
    
    if (!hasAtLeastOneElement) {
      throw new Error('Please provide at least one story element for your bedtime tale.');
    }
  }
  
  console.log('Generating calming bedtime story...');
  
  // Generate sleep-focused story with meditation elements
  const { storyText, audioContent } = await generateSleepStoryAndAudio({
    heroName, promptSetup, promptRising, promptClimax, heroImage, age, surpriseMode
  });
  
  return {
    story: storyText,
    audio: audioContent.toString('base64'),
    duration: Math.ceil(storyText.split(' ').length / 1.8), // Slower reading for sleep stories
    fileSize: audioContent.length
  };
}

async function handleMonsterMakerMode(requestBody) {
  const { description1, description2, description3, locationImage, age } = requestBody;
  
  if (!description1) {
    throw new Error('Please describe your monster.');
  }
  
  console.log('Creating monster and story...');
  
  const monsterDescription = [description1, description2, description3]
    .filter(desc => desc && desc.trim())
    .join('. ');
  
  // Generate monster image
  const monsterImage = await generateMonsterImage(monsterDescription, locationImage);
  
  // Generate monster story
  const { storyText, audioContent } = await generateStoryAndAudio({
    heroName: 'your friendly monster',
    promptSetup: locationImage ? 'in its favorite hiding spot' : 'in a magical place',
    promptRising: 'meeting new friends and having adventures',
    promptClimax: 'everyone becomes the best of friends',
    characterDescription: monsterDescription,
    age: age || '6'
  });
  
  return {
    story: storyText,
    audio: audioContent.toString('base64'),
    monsterImage: monsterImage,
    duration: Math.ceil(storyText.split(' ').length / 2.5),
    fileSize: audioContent.length
  };
}

async function handleAdventureMeMode(requestBody) {
  const { childName, theme, role, specialSkill, age } = requestBody;
  
  console.log('🏔️ Adventure Me mode: Creating personalized adventure story...');
  console.log('📋 Adventure details:', { childName, theme, role, specialSkill, age });
  
  if (!childName || !theme) {
    throw new Error('Please provide your name and choose an adventure theme.');
  }
  
  // Define adventure themes with child-centered prompts
  const adventureThemes = {
    'wild-west': {
      setting: `the dusty frontier town of Sundown Valley, where ${childName} is the newest adventurer`,
      challenge: `helping the townspeople solve the mystery of the missing golden horseshoe`,
      resolution: `${childName} uses their cleverness and ${specialSkill || 'brave heart'} to save the day`,
      characterDescription: `${childName}, a brave young adventurer in the Wild West with ${specialSkill ? `a special talent for ${specialSkill}` : 'a kind heart and quick thinking'}`
    },
    'underwater': {
      setting: `the magical underwater kingdom of Coral Bay, where ${childName} has just discovered they can breathe underwater`,
      challenge: `helping the sea creatures find their lost treasure chest before the tide turns`,
      resolution: `${childName} uses their ${specialSkill || 'swimming skills'} and new underwater friends to recover the treasure`,
      characterDescription: `${childName}, a young underwater explorer with ${specialSkill ? `amazing ${specialSkill} abilities` : 'the gift of talking to sea creatures'}`
    },
    'sky': {
      setting: `the floating cloud city of Nimbus Heights, where ${childName} has learned to fly`,
      challenge: `rescuing the rainbow birds whose colors have faded and need to be restored`,
      resolution: `${childName} uses their ${specialSkill || 'flying abilities'} to gather starlight and restore the birds' beautiful colors`,
      characterDescription: `${childName}, a courageous sky adventurer with ${specialSkill ? `incredible ${specialSkill} powers` : 'the ability to soar through the clouds'}`
    },
    'jungle': {
      setting: `the lush Amazon jungle, where ${childName} is exploring with their trusty animal companions`,
      challenge: `finding the lost Temple of Friendship and solving its ancient riddles`,
      resolution: `${childName} uses their ${specialSkill || 'jungle knowledge'} and teamwork with animal friends to unlock the temple's secrets`,
      characterDescription: `${childName}, a young jungle explorer with ${specialSkill ? `special ${specialSkill} talents` : 'the rare gift of understanding animal languages'}`
    }
  };
  
  const selectedTheme = adventureThemes[theme];
  if (!selectedTheme) {
    throw new Error('Please choose a valid adventure theme: wild-west, underwater, sky, or jungle.');
  }
  
  console.log('✨ Generating personalized adventure with theme:', theme);
  
  // Generate the adventure story with the child as the main character
  const { storyText, audioContent } = await generateStoryAndAudio({
    heroName: childName,
    promptSetup: selectedTheme.setting,
    promptRising: selectedTheme.challenge,
    promptClimax: selectedTheme.resolution,
    characterDescription: selectedTheme.characterDescription,
    age: age || '6'
  });
  
  console.log('🎉 Adventure Me story generated successfully!');
  
  return {
    story: storyText,
    audio: audioContent.toString('base64'),
    theme: theme,
    duration: Math.ceil(storyText.split(' ').length / 2.5),
    fileSize: audioContent.length,
    debug: {
      theme: theme,
      childName: childName,
      specialSkill: specialSkill
    }
  };
}

async function handleDreamJobMode(requestBody) {
  const { childName, favoriteSubject, dreamActivity, workEnvironment, helpingStyle, age } = requestBody;
  
  console.log('🔮 Dream Job Detective mode: Analyzing career path...');
  console.log('📋 Quiz responses:', { childName, favoriteSubject, dreamActivity, workEnvironment, helpingStyle, age });
  
  if (!childName || !favoriteSubject || !dreamActivity) {
    throw new Error('Please provide your name and answer at least the first two quiz questions.');
  }
  
  // AI-powered job matching based on quiz responses
  const jobMatches = analyzeJobMatch({ favoriteSubject, dreamActivity, workEnvironment, helpingStyle });
  const selectedJob = jobMatches[0]; // Get the top match
  
  console.log('🎯 Job analysis complete. Top match:', selectedJob.title);
  
  // Generate personalized career story
  const careerStoryPrompt = `Create an inspiring story about ${childName} discovering their dream career as a ${selectedJob.title}. Show them using their love of ${favoriteSubject} and passion for ${dreamActivity} in their exciting work. Make it encouraging and show how they make a positive difference in the world. Include what a typical exciting day looks like in their job.`;
  
  const { storyText, audioContent } = await generateStoryAndAudio({
    heroName: childName,
    promptSetup: `a world where ${childName} has grown up and discovered their perfect career`,
    promptRising: `learning all about being a ${selectedJob.title} and the amazing things they do`,
    promptClimax: `${childName} realizes this is their true calling and starts making their dreams come true`,
    characterDescription: `${childName}, a talented individual with a passion for ${favoriteSubject} and ${dreamActivity}, destined to become an amazing ${selectedJob.title}`,
    age: age || '9'
  });
  
  console.log('🎆 Dream Job story generated successfully!');
  
  return {
    story: storyText,
    audio: audioContent.toString('base64'),
    dreamJob: selectedJob,
    allMatches: jobMatches,
    duration: Math.ceil(storyText.split(' ').length / 2.5),
    fileSize: audioContent.length,
    debug: {
      topJob: selectedJob.title,
      favoriteSubject: favoriteSubject,
      dreamActivity: dreamActivity
    }
  };
}

// Helper function to analyze job matches based on quiz responses
function analyzeJobMatch({ favoriteSubject, dreamActivity, workEnvironment, helpingStyle }) {
  console.log('🧠 Analyzing personality and interests for job matching...');
  
  // Comprehensive job database with matching criteria
  const jobDatabase = [
    {
      title: 'Video Game Designer',
      subjects: ['technology', 'art', 'math'],
      activities: ['creating', 'building', 'playing'],
      environments: ['indoors', 'teams'],
      helping: ['inspiring', 'creating'],
      description: 'Design amazing video games that bring joy to millions of players worldwide!'
    },
    {
      title: 'Marine Biologist',
      subjects: ['science', 'nature'],
      activities: ['exploring', 'discovering', 'swimming'],
      environments: ['outdoors', 'water'],
      helping: ['protecting', 'researching'],
      description: 'Explore the ocean depths and protect amazing sea creatures!'
    },
    {
      title: 'Space Engineer',
      subjects: ['science', 'technology', 'math'],
      activities: ['building', 'exploring', 'solving'],
      environments: ['labs', 'space'],
      helping: ['advancing', 'discovering'],
      description: 'Build rockets and spacecraft to explore the mysteries of the universe!'
    },
    {
      title: 'Children\'s Book Illustrator',
      subjects: ['art', 'reading', 'storytelling'],
      activities: ['creating', 'drawing', 'imagining'],
      environments: ['indoors', 'quiet'],
      helping: ['inspiring', 'educating'],
      description: 'Create beautiful artwork that brings stories to life for children everywhere!'
    },
    {
      title: 'Wildlife Photographer',
      subjects: ['nature', 'art', 'geography'],
      activities: ['exploring', 'creating', 'traveling'],
      environments: ['outdoors', 'adventure'],
      helping: ['protecting', 'educating'],
      description: 'Travel the world capturing stunning photos of amazing animals in their natural habitats!'
    },
    {
      title: 'Robot Engineer',
      subjects: ['technology', 'science', 'math'],
      activities: ['building', 'solving', 'inventing'],
      environments: ['labs', 'teams'],
      helping: ['solving', 'advancing'],
      description: 'Design and build helpful robots that make life easier for everyone!'
    },
    {
      title: 'Music Producer',
      subjects: ['music', 'technology', 'art'],
      activities: ['creating', 'performing', 'listening'],
      environments: ['studios', 'teams'],
      helping: ['inspiring', 'entertaining'],
      description: 'Create amazing music and help artists share their talents with the world!'
    },
    {
      title: 'Environmental Scientist',
      subjects: ['science', 'nature', 'geography'],
      activities: ['exploring', 'researching', 'solving'],
      environments: ['outdoors', 'labs'],
      helping: ['protecting', 'saving'],
      description: 'Protect our planet and find solutions to help the environment!'
    },
    {
      title: 'Theme Park Designer',
      subjects: ['art', 'technology', 'math'],
      activities: ['creating', 'building', 'entertaining'],
      environments: ['teams', 'creative'],
      helping: ['entertaining', 'inspiring'],
      description: 'Design incredible theme parks and rides that create magical experiences!'
    },
    {
      title: 'Chef and Restaurant Owner',
      subjects: ['cooking', 'art', 'science'],
      activities: ['creating', 'cooking', 'sharing'],
      environments: ['kitchens', 'teams'],
      helping: ['feeding', 'bringing joy'],
      description: 'Create delicious food that brings people together and makes them happy!'
    }
  ];
  
  // Score each job based on how well it matches the quiz responses
  const scoredJobs = jobDatabase.map(job => {
    let score = 0;
    
    // Subject match (highest weight)
    if (job.subjects.includes(favoriteSubject)) score += 3;
    
    // Activity match (high weight)
    if (job.activities.includes(dreamActivity)) score += 3;
    
    // Environment match (medium weight)
    if (workEnvironment && job.environments.includes(workEnvironment)) score += 2;
    
    // Helping style match (medium weight)
    if (helpingStyle && job.helping.includes(helpingStyle)) score += 2;
    
    // Add small random factor for variety
    score += Math.random() * 0.5;
    
    return { ...job, score };
  });
  
  // Sort by score (highest first) and return top matches
  const topMatches = scoredJobs
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  
  console.log('🏆 Top job matches calculated:', topMatches.map(job => `${job.title} (score: ${job.score.toFixed(2)})`));
  
  return topMatches;
}

// Helper function to generate story and audio
async function generateStoryAndAudio({ heroName, promptSetup, promptRising, promptClimax, heroImage, sceneImage, characterDescription, sceneDescription, age, surpriseMode = false }) {
  const startTime = Date.now();
  
  // Initialize debug tracking
  const debugSteps = [];
  debugSteps.push({ step: 'generation_start', heroName, age, timestamp: Date.now() });
  
  console.log('⏱️ Story generation started:', { surpriseMode, hasCharacterDesc: !!characterDescription, hasSceneDesc: !!sceneDescription });
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
  let ttsInstructions = "Use very simple sentences with gentle commas for natural pauses. Include fun dialogue and gentle excitement! Keep it warm and engaging for little ears.";
  
  switch (age) {
    case '6':
      storyLength = 500;
      readingLevel = "a slightly more detailed, engaging style for emerging readers";
      ttsInstructions = "Use simple, clear sentences with commas for natural rhythm. Include exciting dialogue and questions! Use ellipses for suspense... and hyphens for fun asides.";
      break;
    case '9':
      storyLength = 1000;
      readingLevel = "a captivating narrative with more complex vocabulary and sentence structures for confident readers";
      ttsInstructions = "Create dramatic audio flow with ellipses for suspense..., hyphens for character thoughts - like this - and varied comma placement for perfect speech rhythm.";
      break;
    case '12':
      storyLength = 2000;
      readingLevel = "a rich, descriptive, and mature style suitable for young adult readers";
      ttsInstructions = "Master sophisticated audio pacing: ellipses for dramatic pauses..., strategic hyphens for emphasis - building tension, and complex comma-rich sentences that create beautiful, flowing narration when spoken aloud.";
      break;
  }
  
  // ENHANCED: Use pre-generated descriptions or analyze images for magical personalization
  let finalCharacterDescription = characterDescription;
  let finalSceneDescription = sceneDescription;
  
  // Run image analysis in parallel for better performance
  const imageAnalysisPromises = [];
  
  if (!finalCharacterDescription && heroImage) {
    console.log('🎨 Starting character image analysis...');
    imageAnalysisPromises.push(
      analyzeCharacterImage(heroImage).then(desc => ({ type: 'character', description: desc }))
    );
  }
  
  if (!finalSceneDescription && sceneImage) {
    console.log('🏞️ Starting scene image analysis...');
    imageAnalysisPromises.push(
      analyzeSceneImage(sceneImage).then(desc => ({ type: 'scene', description: desc }))
    );
  }
  
  // Wait for all image analysis to complete in parallel
  if (imageAnalysisPromises.length > 0) {
    console.log(`🚀 Running ${imageAnalysisPromises.length} image analysis tasks in parallel...`);
    const results = await Promise.all(imageAnalysisPromises);
    
    // Apply results
    results.forEach(result => {
      if (result.type === 'character') {
        finalCharacterDescription = result.description;
      } else if (result.type === 'scene') {
        finalSceneDescription = result.description;
      }
    });
    
    console.log('✅ Parallel image analysis complete:', {
      characterDesc: !!finalCharacterDescription,
      sceneDesc: !!finalSceneDescription
    });
  }
  
  // Generate Story with Gemini - TTS-optimized prompts with enhanced image descriptions
  const textPrompt = `
    You are a master storyteller for children who specializes in creating stories that sound AMAZING when read aloud. 
    
    CRITICAL REQUIREMENTS:
    - Write ONLY in plain text - NO asterisks (*), NO special characters, NO formatting symbols
    - Use natural, flowing sentences that sound great when spoken
    - Include exciting dialogue with "said" instead of unusual speech tags
    - Write exactly around ${storyLength} words in ${readingLevel}
    - ${ttsInstructions}
    
    PUNCTUATION RULES (EXTREMELY IMPORTANT - AUDIO WILL SOUND BROKEN IF YOU VIOLATE THESE):
    - NEVER EVER write punctuation names like: "dot", "period", "comma", "exclamation mark", "exclamation point", "question mark"
    - ALWAYS use the actual punctuation symbols: . ! ? , : ;
    - When ending sentences, use a period (.) NOT the word "dot" or "period"
    - For excitement, use an exclamation mark (!) NOT "exclamation mark" or "exclamation point"
    - For questions, use a question mark (?) NOT "question mark"
    - Example: "Hello world! How are you?" NOT "Hello world exclamation mark How are you question mark"
    - This is CRITICAL for audio quality - punctuation names will be read aloud and sound terrible
    
    OPTIMIZE FOR BEAUTIFUL TTS AUDIO - Use these native Chirp3-HD punctuation features:
    
    🎵 PAUSE CONTROL through Natural Punctuation:
    - Periods (.): Full stop with standard sentence-ending pause - perfect for story beats
    - Commas (,): Short, natural intra-sentence pauses - use generously for rhythm
    - Ellipses (...): Prolonged, deliberate pauses for suspense, trailing thoughts, dramatic effect
    - Hyphens (-): Brief breaks in thought - great for asides, emphasis, or character quirks
    - Paragraph breaks: Longer natural pauses between story sections
    
    🎭 STORYTELLING TECHNIQUES for Audio:
    - Use ellipses for suspense: "The door slowly opened... and inside was..."
    - Use hyphens for character thoughts: "Maybe - just maybe - this could work!"
    - Use commas to build rhythm: "Slowly, carefully, quietly, she tiptoed forward."
    - Vary sentence lengths: Short punchy sentences. Then longer, flowing descriptive passages.
    
    Example with perfect TTS optimization:
    "Once upon a time, in a magical forest filled with secrets, there lived a brave little mouse named Pip.
    
    One sunny morning - the kind that makes everything sparkle - Pip discovered something extraordinary... something that would change everything."
    
    Create an exciting story based on these elements:
    - Hero's Name: ${heroName || 'a mysterious hero'}
    - The Beginning: ${promptSetup || 'a surprising place'}
    - The Challenge: ${promptRising || 'an unexpected problem'}
    - The Climax: ${promptClimax || 'a clever solution'}
    
    ${finalCharacterDescription && finalSceneDescription ? 
      `CRITICAL STORYTELLING RULES:
      1. CHARACTER INTEGRATION: Don't say "${finalCharacterDescription}" as a separate description. Instead, naturally weave these details into the action: "As ${heroName} [action], her [specific detail from description] [action]."
      2. SETTING INTEGRATION: Don't describe the setting separately. Instead, reveal it through ${heroName}'s experience: "${heroName} stepped into [setting detail], noticing [another detail]."
      3. SEAMLESS FLOW: Merge descriptions with plot - no information dumps or separate paragraphs.
      
      Character details to weave in: ${finalCharacterDescription}
      Setting details to weave in: ${finalSceneDescription}` : 
      finalCharacterDescription ? 
        `CRITICAL: Don't describe ${heroName} in a separate paragraph. Weave these details naturally into actions: "As ${heroName} [action], [character detail from: ${finalCharacterDescription}]"` :
        finalSceneDescription ?
          `CRITICAL: Don't describe the setting separately. Reveal it through ${heroName}'s actions: "${heroName} [action] in [detail from: ${finalSceneDescription}]"` :
          ''
    }
    
    Make it magical and engaging for children, with natural speech that flows beautifully when narrated! Remember to integrate all descriptions seamlessly into the narrative flow.
  `;
  
  const promptParts = [{ text: textPrompt }];
  
  // Note: We now use dedicated image analysis functions above to create rich descriptions
  // The character and scene descriptions are embedded directly in the text prompt
  
  const storyGenStart = Date.now();
  console.log('📝 Starting Gemini story generation...');
  console.log('🎭 Story context:', {
    heroName: heroName || 'none',
    hasCharacterDesc: !!finalCharacterDescription,
    hasSceneDesc: !!finalSceneDescription,
    characterDescSample: finalCharacterDescription ? finalCharacterDescription.substring(0, 100) : 'none',
    sceneDescSample: finalSceneDescription ? finalSceneDescription.substring(0, 100) : 'none'
  });
  
  const result = await model.generateContent({ contents: [{ role: "user", parts: promptParts }] });
  const rawStoryText = (await result.response).text();
  
  console.log('✅ Gemini story generation complete:', {
    timeMs: Date.now() - storyGenStart,
    storyLength: rawStoryText.length
  });
  
  // IMMEDIATE CHECK: Did the AI ignore our instructions and include punctuation words?
  const immediateCheck = {
    dots: (rawStoryText.match(/\bdot\b/gi) || []).length,
    periods: (rawStoryText.match(/\bperiod\b/gi) || []).length,
    exclamationMarks: (rawStoryText.match(/\bexclamation\s*mark\b/gi) || []).length,
    questionMarks: (rawStoryText.match(/\bquestion\s*mark\b/gi) || []).length
  };
  
  // Track AI output for debugging
  try {
    debugSteps.push({ 
      step: 'ai_generation_complete', 
      rawTextLength: rawStoryText.length,
      punctuationCheck: immediateCheck
    });
  } catch (e) {
    console.log('Debug tracking error (non-critical):', e.message);
  }
  
  if (immediateCheck.dots > 0 || immediateCheck.periods > 0 || immediateCheck.exclamationMarks > 0 || immediateCheck.questionMarks > 0) {
    console.log('🚨 AI IGNORED INSTRUCTIONS - Generated punctuation words:', immediateCheck);
    console.log('🚨 Raw AI output sample:', JSON.stringify(rawStoryText.substring(0, 300)));
    
    // Show all punctuation word instances with context
    const allPunctuationMatches = rawStoryText.match(/.{0,20}\b(dot|period|exclamation\s*mark|question\s*mark)\b.{0,20}/gi) || [];
    console.log('🚨 All AI punctuation violations:', allPunctuationMatches);
    
    debugSteps.push({ 
      step: 'ai_violations_found', 
      violations: allPunctuationMatches
    });
  } else {
    console.log('✅ AI FOLLOWED INSTRUCTIONS - No punctuation words in raw output');
    debugSteps.push({ step: 'ai_followed_instructions' });
  }
  
  // Process story to separate display text from TTS text with pauses
  const { displayText, ttsText } = processStoryWithPauses(rawStoryText, heroName);
  
  // Quick check for any remaining issues
  const ttsDots = (ttsText.match(/\bdot\b/gi) || []).length;
  if (ttsDots > 0) {
    console.log('⚠️ Found', ttsDots, 'dot words in TTS text');
  }
  
  const processingResults = {
    rawLength: rawStoryText.length,
    displayLength: displayText.length,
    ttsLength: ttsText.length,
    pauseMarkers: (ttsText.match(/\[pause[^\]]*\]/g) || []).length,
    punctuationWordsInRaw: {
      dots: (rawStoryText.match(/\b(dot|period)\b/gi) || []).length,
      exclamations: (rawStoryText.match(/\b(exclamation mark|exclamation point)\b/gi) || []).length,
      questions: (rawStoryText.match(/\b(question mark)\b/gi) || []).length,
      commas: (rawStoryText.match(/\b(comma)\b/gi) || []).length
    },
    punctuationWordsInTTS: {
      dots: (ttsText.match(/\b(dot|period)\b/gi) || []).length,
      exclamations: (ttsText.match(/\b(exclamation mark|exclamation point)\b/gi) || []).length,
      questions: (ttsText.match(/\b(question mark)\b/gi) || []).length,
      commas: (ttsText.match(/\b(comma)\b/gi) || []).length
    },
    displayTextSample: displayText.substring(0, 200),
    ttsTextSample: ttsText.substring(0, 200)
  };
  
  console.log('📝 Story processing complete:', processingResults);
  
  debugSteps.push({ 
    step: 'story_processing_complete', 
    results: processingResults
  });
  
  // Debug: Log sample of raw text to check for punctuation words
  const allPunctuationWords = [
    ...(rawStoryText.match(/\b(dot|period)\b/gi) || []),
    ...(rawStoryText.match(/\b(exclamation mark|exclamation point)\b/gi) || []),
    ...(rawStoryText.match(/\b(question mark)\b/gi) || []),
    ...(rawStoryText.match(/\b(comma)\b/gi) || [])
  ];
  
  if (allPunctuationWords.length > 0) {
    console.log('⚠️ RAW TEXT CONTAINS PUNCTUATION WORDS:', allPunctuationWords);
    console.log('📝 Sample:', JSON.stringify(rawStoryText.substring(0, 300)));
    
    // Log all instances with context
    const punctuationMatches = rawStoryText.match(/.{0,20}\b(dot|period|exclamation mark|exclamation point|question mark|comma)\b.{0,20}/gi) || [];
    console.log('🔎 All punctuation word instances with context:', punctuationMatches);
  }
  
  // Generate image for surprise mode using Gemini 2.5 Flash
  let generatedImageBase64 = null;
  if (surpriseMode) {
    try {
      console.log('🎨 Generating illustration for surprise story...');
      
      const imagePrompt = `Create a beautiful, child-friendly illustration for this story:
      
      Story: ${displayText.substring(0, 500)}...
      
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

  // Process story text appropriately for each TTS engine
  const cleanStoryText = processStoryForTTS(ttsText); // For OpenAI TTS (removes pause markers)
  const markupStoryText = ttsText; // For Google Chirp3-HD (keeps pause markers)
  
  // Get age-appropriate voice settings
  const voiceSettings = getVoiceSettings(age);
  
  console.log('🎵 Generating audio:', {
    voice: voiceSettings.voice,
    speed: voiceSettings.speed,
    cleanTextLength: cleanStoryText.length,
    markupTextLength: markupStoryText.length,
    pauseMarkers: (markupStoryText.match(/\[pause[^\]]*\]/g) || []).length,
    engine: USE_OPENAI_TTS ? 'OpenAI (no pause control)' : 'Google Chirp3-HD (with pause control)'
  });
  
  // Convert Story Text to Speech using appropriate engine and text format
  const ttsStart = Date.now();
  console.log('🎵 Starting TTS generation...');
  
  let audioContent;
  
  if (USE_OPENAI_TTS) {
    try {
      console.log('🎵 Attempting OpenAI TTS (using clean text)...');
      audioContent = await generateOpenAITTS(cleanStoryText, voiceSettings);
      console.log('✅ OpenAI TTS successful, using OpenAI audio');
    } catch (openaiError) {
      console.warn('⚠️ OpenAI TTS failed, falling back to Google TTS with pause control:', openaiError.message);
      try {
        audioContent = await generateGoogleTTS(markupStoryText, age, heroName);
        console.log('✅ Google TTS fallback successful with pause markers');
      } catch (googleError) {
        console.error('❌ Both TTS services failed:', googleError.message);
        throw new Error(`Both TTS services failed. OpenAI: ${openaiError.message.substring(0, 100)}... Google: ${googleError.message}`);
      }
    }
  } else {
    console.log('🎥 Using Google Chirp3-HD with pause control (using markup text)...');
    audioContent = await generateGoogleTTS(markupStoryText, age, heroName);
  }
  
  console.log('✅ TTS generation complete:', {
    timeMs: Date.now() - ttsStart,
    audioSizeKB: Math.round(audioContent.length / 1024)
  });
  
  const totalTime = Date.now() - startTime;
  console.log('✅ Story generation complete - Performance Summary:', {
    totalTimeMs: totalTime,
    totalTimeSec: Math.round(totalTime / 1000),
    storyLength: displayText.length,
    audioSizeKB: Math.round(audioContent.length / 1024),
    hasCharacterDesc: !!finalCharacterDescription,
    hasSceneDesc: !!finalSceneDescription
  });
  
  return { 
    storyText: displayText, // Return display text without pause markers for UI
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
    const audioContent = Buffer.from(await ttsResponse.arrayBuffer());
    
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

// Google TTS Function - Enhanced with Chirp3-HD pause control using proper markup syntax
async function generateGoogleTTS(storyTextWithPauses, age, heroName = '') {
  console.log('🎵 Generating audio with Google Chirp3-HD (MP3 format with pause control)');
  
  const voiceSettings = {
    languageCode: 'en-GB',
    name: 'en-GB-Chirp3-HD-Vindemiatrix', // High-quality Chirp3-HD voice with pause support
    ssmlGender: 'FEMALE'
  };
  
  console.log('⏸️ Pause markers in text:', {
    pauseShort: (storyTextWithPauses.match(/\[pause short\]/g) || []).length,
    pause: (storyTextWithPauses.match(/\[pause\](?![^\]]*\])/g) || []).length,
    pauseLong: (storyTextWithPauses.match(/\[pause long\]/g) || []).length,
    totalMarkers: (storyTextWithPauses.match(/\[pause[^\]]*\]/g) || []).length
  });
  
  // Quick punctuation check for TTS
  const punctuationWords = (storyTextWithPauses.match(/\b(dot|period|exclamation mark|question mark)\b/gi) || []).length;
  if (punctuationWords > 0) {
    console.log('⚠️ TTS input contains', punctuationWords, 'punctuation words - applying cleaning');
  }
  
  // Ultra-aggressive dot cleaning with character inspection
  let cleanedMarkupText = storyTextWithPauses;
  
  // Log character codes around any 'dot' instances for debugging
  const dotInstances = cleanedMarkupText.match(/.{0,10}dot.{0,10}/gi) || [];
  if (dotInstances.length > 0) {
    console.log('🔍 DOT INSTANCES FOUND:', dotInstances);
    dotInstances.forEach((instance, i) => {
      const charCodes = instance.split('').map(c => `${c}(${c.charCodeAt(0)})`).join(' ');
      console.log(`🔢 Instance ${i + 1} char codes:`, charCodes);
    });
  }
  
  // ULTRA-CONSERVATIVE cleaning - only fix obvious TTS pronunciation errors
  // Preserve ALL legitimate uses of words like "dot", "period", etc.
  cleanedMarkupText = storyTextWithPauses;
  
  console.log('🧠 Using ultra-conservative cleaning to preserve legitimate word usage');
  
  // Only replace in VERY specific contexts where it's clearly a TTS pronunciation error:
  // 1. At the very end of sentences where it's clearly meant to be punctuation
  // 2. In patterns like "word dot word" where "dot" is clearly punctuation
  
  cleanedMarkupText = cleanedMarkupText
    // AGGRESSIVELY fix sentence-ending errors where AI wrote "dot" instead of "."
    .replace(/([a-zA-Z])\s+(dot|period)\s*$/gim, '$1.')
    .replace(/([a-zA-Z])\s+(dot|period)\s*\n/gim, '$1.\n')
    .replace(/([a-zA-Z])\s+(dot|period)\s+([A-Z][a-zA-Z]+)/g, '$1. $3') // "word dot Word" -> "word. Word"
    // Fix "word dot" at end of clauses (before punctuation or pause markers)
    .replace(/([a-zA-Z])\s+(dot|period)\s*([,;!?])/gim, '$1.$3')
    .replace(/([a-zA-Z])\s+(dot|period)\s*(\[pause)/gim, '$1. $3')
    // Fix "word dot" followed by quotes or other punctuation
    .replace(/([a-zA-Z])\s+(dot|period)\s*(["\'\"\'])/gim, '$1.$3')
    
    // HELP TTS understand "dot" as a verb by using synonyms
    // Pattern: "noun dot the" (like "fireflies dot the trees") -> "fireflies speckle the trees"
    .replace(/\b(\w+)\s+dot\s+(the|a|an)\b/gi, '$1 speckle $2')
    // Pattern: "dots" as plural verb -> "speckles"
    .replace(/\b(\w+)\s+dots\s+(the|a|an)\b/gi, '$1 speckles $2')
    
    // ONLY fix clear exclamation/question errors at sentence end
    .replace(/([a-zA-Z])\s+(exclamation mark|exclamation point)\s*$/gim, '$1!')
    .replace(/([a-zA-Z])\s+(question mark)\s*$/gim, '$1?')
    
    // Clean up spacing issues ONLY (don't change words)
    .replace(/\s+([.!?])/g, '$1')
    .replace(/([.!?])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
    
  console.log('🧠 Conservative cleaning complete - preserved legitimate word usage');
  
  // Verify cleaning worked for all punctuation names
  const remainingDots = (cleanedMarkupText.match(/\b(dot|period)\b/gi) || []).length;
  const remainingExclamations = (cleanedMarkupText.match(/\b(exclamation mark|exclamation point)\b/gi) || []).length;
  const remainingQuestions = (cleanedMarkupText.match(/\b(question mark)\b/gi) || []).length;
  const remainingCommas = (cleanedMarkupText.match(/\b(comma)\b/gi) || []).length;
  const totalPunctuationWords = remainingDots + remainingExclamations + remainingQuestions + remainingCommas;
  
  if (totalPunctuationWords > 0) {
    console.log('❌ PUNCTUATION CLEANING FAILED:', {
      dots: remainingDots,
      exclamations: remainingExclamations, 
      questions: remainingQuestions,
      commas: remainingCommas,
      total: totalPunctuationWords
    });
    console.log('🔍 Problem sample:', JSON.stringify(cleanedMarkupText.substring(0, 300)));
    console.log('⚠️ Continuing with best-effort cleaning - some punctuation words may remain');
  } else {
    console.log('✅ PUNCTUATION CLEANING SUCCESSFUL - No punctuation words remaining');
  }
  
  console.log('✨ Final cleaned markup text sample:', JSON.stringify(cleanedMarkupText.substring(0, 200)));
  
  // EMERGENCY DEBUGGING - Log the exact text being sent to TTS
  console.log('🚨 EMERGENCY DEBUG - EXACT TTS INPUT TEXT:');
  console.log('🚨 Full length:', cleanedMarkupText.length);
  console.log('🚨 First 500 chars:', JSON.stringify(cleanedMarkupText.substring(0, 500)));
  console.log('🚨 Last 500 chars:', JSON.stringify(cleanedMarkupText.substring(-500)));
  
  // Check if TTS input contains dot words that display text doesn't
  const ttsHasDot = (cleanedMarkupText.match(/\bdot\b/gi) || []).length;
  const ttsHasPeriod = (cleanedMarkupText.match(/\bperiod\b/gi) || []).length;
  console.log('🚨 TTS TEXT DOT CHECK:', { ttsHasDot, ttsHasPeriod });
  
  if (ttsHasDot > 0 || ttsHasPeriod > 0) {
    console.log('🚨 FOUND THE PROBLEM! TTS text contains dot/period words that display text does not!');
    const dotMatches = cleanedMarkupText.match(/.{0,30}\b(dot|period)\b.{0,30}/gi) || [];
    console.log('🚨 TTS dot contexts:', dotMatches);
  }
  
  // Check for any remaining punctuation words in final text
  const finalDotCheck = (cleanedMarkupText.match(/\bdot\b/gi) || []);
  const finalPeriodCheck = (cleanedMarkupText.match(/\bperiod\b/gi) || []);
  const finalExclamationCheck = (cleanedMarkupText.match(/\bexclamation\s*mark\b/gi) || []);
  
  const finalTTSDebug = {
    finalDots: finalDotCheck,
    finalPeriods: finalPeriodCheck, 
    finalExclamations: finalExclamationCheck,
    finalTextSample: cleanedMarkupText.substring(0, 300),
    textLength: cleanedMarkupText.length
  };
  
  // Debug info will be tracked in the main function
  
  if (finalDotCheck.length > 0 || finalPeriodCheck.length > 0 || finalExclamationCheck.length > 0) {
    console.log('🚨 CRITICAL: PUNCTUATION WORDS STILL IN FINAL TTS TEXT!');
    console.log('🚨 Found dots:', finalDotCheck);
    console.log('🚨 Found periods:', finalPeriodCheck);
    console.log('🚨 Found exclamations:', finalExclamationCheck);
    
    // Show exact context around each problem
    finalDotCheck.forEach((match, i) => {
      const index = cleanedMarkupText.toLowerCase().indexOf(match.toLowerCase());
      const context = cleanedMarkupText.substring(Math.max(0, index - 30), index + 30);
      console.log(`🚨 DOT CONTEXT ${i + 1}:`, JSON.stringify(context));
    });
  } else {
    console.log('✅ FINAL CHECK PASSED - No punctuation words in TTS input');
  }
  
  // CRITICAL FIX: Chirp3-HD only supports plain text, not markup!
  // Remove all pause markers and send as plain text for natural speech
  const plainTextForChirp = cleanedMarkupText
    .replace(/\[pause short\]/g, '')
    .replace(/\[pause long\]/g, '')
    .replace(/\[pause\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  console.log('🎯 CHIRP3-HD FIX: Using plain text format (no markup)');
  console.log('🎯 Plain text sample:', JSON.stringify(plainTextForChirp.substring(0, 200)));
  
  const request = {
    input: { text: plainTextForChirp }, // Use plain 'text' format for Chirp3-HD
    voice: voiceSettings,
    audioConfig: {
      audioEncoding: 'MP3',
      sampleRateHertz: 22050,
      speakingRate: age === '3' ? 0.85 : age === '6' ? 0.9 : 0.95,
      volumeGainDb: 2.0
    }
  };
  
  const [response] = await ttsClient.synthesizeSpeech(request);
  
  // Return MP3 data directly (no WAV header needed)
  const mp3Data = response.audioContent;
  
  console.log('✅ Google Chirp3-HD generation successful:', {
    audioSize: mp3Data.length,
    format: 'mp3',
    sampleRate: '22050Hz',
    encoding: 'MP3',
    pauseControlEnabled: true
  });
  
  return mp3Data;
}

// ✅ DUAL-MODE SERVERLESS FUNCTION - CRITICAL FOR STREAMING WORKFLOW
module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    // Mode 1: Client requests story generation
    try {
      // Extract mode from request body - defaults to 'classic' for backwards compatibility
      const { mode = 'classic' } = req.body;
      
      console.log(`🎭 Processing ${mode} mode request...`);
      
      // Route to appropriate handler based on mode
      let result;
      switch (mode) {
        case 'classic':
          result = await handleClassicMode(req.body);
          break;
        case 'wanted-poster':
          result = await handleWantedPosterMode(req.body);
          break;
        case 'homework-forge':
          result = await handleHomeworkForgeMode(req.body);
          break;
        case 'sleep-forge':
          result = await handleSleepForgeMode(req.body);
          break;
        case 'monster-maker':
          result = await handleMonsterMakerMode(req.body);
          break;
        case 'adventure-me':
          result = await handleAdventureMeMode(req.body);
          break;
        case 'dream-job':
          result = await handleDreamJobMode(req.body);
          break;
        default:
          return res.status(400).json({ message: `Unknown mode: ${mode}` });
      }
      
      res.status(200).json(result);

      // Return story text, Base64 audio, and generated image (if any) for the client to handle
      const response = {
        story: storyText,
        audio: audioContent.toString('base64'),
        // Calculate estimated duration (rough approximation: ~150 words per minute)
        duration: Math.ceil(storyText.split(' ').length / 2.5), // seconds
        fileSize: audioContent.length,
        // Add basic debugging information for client-side troubleshooting
        debug: {
          storyLength: storyText.length,
          audioSize: audioContent.length,
          heroName: heroName || '',
          punctuationAnalysis: {
            storyContainsDot: (storyText.match(/\bdot\b/gi) || []).length,
            storyContainsPeriod: (storyText.match(/\bperiod\b/gi) || []).length,
            actualPeriods: (storyText.match(/\./g) || []).length
          }
        }
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
      
      res.status(200).json(result);

    } catch (error) {
      console.error(`Error in ${req.body.mode || 'classic'} mode generation:`, error);
      res.status(500).json({ 
        message: `Failed to generate ${req.body.mode || 'classic'} content.`,
        error: error.message 
      });
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
      
      const { heroName, promptSetup, promptRising, promptClimax, heroImage, sceneImage, characterDescription, sceneDescription, age, audioOnly } = req.query;

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
        heroName, promptSetup, promptRising, promptClimax, heroImage, sceneImage, characterDescription, sceneDescription, age
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

// Helper functions for new modes

// Helper function to extract image data from Gemini response
function extractImageFromGeminiResponse(response, context = 'image generation') {
  console.log(`🔍 [${context}] Starting image extraction...`);
  console.log(`🔍 [${context}] Response structure:`, {
    hasResponse: !!response,
    hasCandidates: !!response?.candidates,
    candidatesCount: response?.candidates?.length || 0
  });
  
  if (!response || !response.candidates || !response.candidates[0]) {
    console.warn(`⚠️ [${context}] No candidates found in response`);
    console.log(`🔍 [${context}] Full response:`, JSON.stringify(response, null, 2));
    return null;
  }
  
  const candidate = response.candidates[0];
  console.log(`🔍 [${context}] First candidate:`, {
    hasContent: !!candidate.content,
    contentKeys: candidate.content ? Object.keys(candidate.content) : 'none',
    hasParts: !!candidate.content?.parts,
    partsCount: candidate.content?.parts?.length || 0
  });
  
  if (!candidate.content || !candidate.content.parts) {
    console.warn(`⚠️ [${context}] No content parts found in response`);
    console.log(`🔍 [${context}] Candidate structure:`, JSON.stringify(candidate, null, 2));
    return null;
  }
  
  for (let i = 0; i < candidate.content.parts.length; i++) {
    const part = candidate.content.parts[i];
    console.log(`🔍 [${context}] Part ${i + 1}:`, {
      hasText: !!part.text,
      hasInlineData: !!part.inlineData,
      hasInline_data: !!part.inline_data,
      partKeys: Object.keys(part)
    });
    
    // Check both inlineData (old format) and inline_data (new format from docs)
    const imageData = part.inlineData || part.inline_data;
    if (imageData) {
      console.log(`🔍 [${context}] Image data structure:`, {
        hasMimeType: !!imageData.mimeType,
        mimeType: imageData.mimeType,
        hasData: !!imageData.data,
        dataLength: imageData.data ? imageData.data.length : 0,
        imageDataKeys: Object.keys(imageData),
        format: part.inlineData ? 'inlineData' : 'inline_data'
      });
      
      if (imageData.mimeType && imageData.data) {
        const base64Image = `data:${imageData.mimeType};base64,${imageData.data}`;
        console.log(`✅ [${context}] Successfully extracted image! MimeType: ${imageData.mimeType}, Data size: ${imageData.data.length} chars`);
        return base64Image;
      }
    }
  }
  
  console.warn(`⚠️ [${context}] No image data found in any parts`);
  console.log(`🔍 [${context}] All parts:`, JSON.stringify(candidate.content.parts, null, 2));
  return null;
}

// Character image generation using Gemini 2.5 Flash
async function generateCharacterImage(name, wantedFor, skills) {
  console.log('🎨 Generating AI character image for:', name);
  console.log('🔧 Using Gemini 2.5 Flash model for image generation');
  
  try {
    console.log('🎨 Using correct Gemini 2.5 Flash Image Preview model for image generation');
    
    // Use the correct model for image generation: gemini-2.5-flash-image-preview
    const imageModel = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-image-preview"
    });
    console.log('✅ Gemini 2.5 Flash Image Preview model initialized successfully');
    
    const prompt = `Create a cartoon-style Wild West outlaw character portrait for a children's story. Character name: ${name}. They are wanted for: ${wantedFor}. ${skills ? `Special skills: ${skills}. ` : ''}Make it colorful, friendly, and suitable for children. Western theme with hat, bandana, etc. Style: vibrant cartoon illustration, child-friendly, non-threatening. No text or words in the image.`;
    
    console.log('📝 Character image prompt:', prompt.substring(0, 100) + '...');
    console.log('🚀 Sending request to Gemini 2.5 Flash Image Preview...');
    
    // Use the correct API pattern from Google's documentation
    const result = await imageModel.generateContent({
      contents: prompt  // Simplified contents format as per docs
    });
    
    console.log('✅ Gemini 2.5 Flash response received');
    console.log('🔍 Raw response structure:', {
      hasResult: !!result,
      hasResponse: !!result?.response,
      responseKeys: result?.response ? Object.keys(result.response) : 'none'
    });
    
    const response = await result.response;
    console.log('🔍 Response candidates:', {
      hasCandidates: !!response.candidates,
      candidatesLength: response.candidates?.length || 0,
      firstCandidateKeys: response.candidates?.[0] ? Object.keys(response.candidates[0]) : 'none'
    });
    
    if (response.candidates && response.candidates[0]) {
      const candidate = response.candidates[0];
      console.log('🔍 First candidate content:', {
        hasContent: !!candidate.content,
        hasParts: !!candidate.content?.parts,
        partsLength: candidate.content?.parts?.length || 0,
        partsTypes: candidate.content?.parts?.map(p => Object.keys(p)) || 'none'
      });
    }
    
    return extractImageFromGeminiResponse(response, 'character image generation');
    
  } catch (error) {
    console.error('❌ Character image generation failed:', error.message);
    console.error('🔍 Full error details:', error);
    console.error('🔍 Error stack:', error.stack);
    return null;
  }
}

// Create wanted poster using Gemini 2.5 Flash to generate poster image
async function createWantedPoster({ name, wantedFor, skills, reward, characterImage }) {
  console.log('📋 Creating wanted poster for:', name);
  
  try {
    // Use the correct Gemini 2.5 Flash Image Preview model
    const imageModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" });
    console.log('✅ Wanted poster: Using Gemini 2.5 Flash Image Preview model');
    
    const posterPrompt = `Create a vintage Wild West WANTED poster with the following details:
    
    WANTED
    Name: ${name}
    For: ${wantedFor}
    ${skills ? `Skills: ${skills}` : ''}
    ${reward ? `Reward: ${reward}` : 'Reward: To be determined'}
    
    Style: Authentic vintage Wild West wanted poster design with weathered parchment background, bold western typography, decorative borders, and classic "WANTED" header. Include a cartoon-style character portrait in the center. Make it look aged and authentic but child-friendly. Cartoon/illustration style character portrait.`;
    
    console.log('📋 Wanted poster prompt:', posterPrompt.substring(0, 100) + '...');
    
    // For now, use text-only generation. Image+text integration can be added later
    const result = await imageModel.generateContent({
      contents: posterPrompt
    });
    
    const response = await result.response;
    return extractImageFromGeminiResponse(response, 'wanted poster generation');
    
  } catch (error) {
    console.warn('⚠️ Wanted poster creation failed:', error.message);
    console.warn('Error details:', error);
    return null;
  }
}

// OCR text extraction from images
async function extractTextFromImage(imageBase64) {
  console.log('🔍 Extracting text from homework image...');
  
  try {
    // Use Gemini for OCR/text extraction
    const analysisPrompt = `Extract all text content from this homework/study material image. Return only the text content, maintaining structure like headings, bullet points, etc. If there are diagrams or charts, describe them briefly. Focus on educational content.`;
    
    const mimeType = imageBase64.substring(imageBase64.indexOf(":") + 1, imageBase64.indexOf(";"));
    const imagePart = fileToGenerativePart(imageBase64, mimeType);
    
    const result = await model.generateContent({
      contents: [{ 
        role: "user", 
        parts: [{ text: analysisPrompt }, imagePart] 
      }]
    });
    
    const extractedText = (await result.response).text().trim();
    console.log('✅ Text extracted from homework image:', extractedText.substring(0, 100) + '...');
    return extractedText;
    
  } catch (error) {
    console.warn('⚠️ Text extraction failed:', error.message);
    return '';
  }
}

// Generate educational summary
async function generateEducationalSummary(extractedText, age, subject) {
  console.log('📖 Generating educational summary...');
  
  const ageGroups = {
    '6': 'elementary school students (ages 6-8)',
    '9': 'middle school students (ages 9-12)', 
    '12': 'high school students (ages 13+)'
  };
  
  const targetAudience = ageGroups[age] || ageGroups['6'];
  
  const educationalPrompt = `
    You are an enthusiastic and knowledgeable teacher creating a fun audio summary of educational content.
    
    Source Material:
    ${extractedText}
    
    Create an engaging, humorous, and age-appropriate summary for ${targetAudience}.
    
    Requirements:
    - Make it FUN and engaging with humor appropriate for the age group
    - Use simple, clear language that explains concepts well
    - Include interesting facts and examples
    - Keep it educational but entertaining
    - Add enthusiasm and energy to make learning exciting
    - Length: approximately 300-500 words
    
    Write ONLY in plain text with proper punctuation for audio narration.
  `;
  
  const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: educationalPrompt }] }] });
  const summary = (await result.response).text().trim();
  
  console.log('✅ Educational summary generated:', summary.length, 'characters');
  return summary;
}

// Generate educational TTS with special voice
async function generateEducationalTTS(text, age) {
  console.log('🎧 Generating educational TTS with Chirp3-HD-Leda...');
  
  const voiceSettings = {
    languageCode: 'en-GB',
    name: 'en-GB-Chirp3-HD-Leda', // Special educational voice as requested
    ssmlGender: 'FEMALE'
  };
  
  const request = {
    input: { text: text },
    voice: voiceSettings,
    audioConfig: {
      audioEncoding: 'MP3',
      sampleRateHertz: 22050,
      speakingRate: age === '6' ? 0.9 : age === '9' ? 0.95 : 1.0, // Adjust speed for age
      volumeGainDb: 2.0
    }
  };
  
  const [response] = await ttsClient.synthesizeSpeech(request);
  console.log('✅ Educational TTS generated with Leda voice');
  
  return response.audioContent;
}

// Generate sleep-focused story and audio
async function generateSleepStoryAndAudio({ heroName, promptSetup, promptRising, promptClimax, heroImage, age, surpriseMode }) {
  console.log('🌙 Generating calming bedtime story...');
  
  // Use existing generateStoryAndAudio but with sleep-specific prompting
  const sleepPrompt = `Create a gentle, calming bedtime story that helps children relax and fall asleep. Use soft, peaceful language with a slow, meditative pace. Include natural breathing pauses and gentle imagery. Make it soothing and dreamy.`;
  
  // Generate story using existing function but with sleep modifications
  const { storyText, audioContent } = await generateStoryAndAudio({
    heroName: heroName || 'Sleepy Sam',
    promptSetup: promptSetup || 'a peaceful cloud kingdom',
    promptRising: promptRising || 'helping tired animals find their beds',
    promptClimax: promptClimax || 'everyone falls peacefully asleep under the starlight',
    heroImage,
    age: age || '3',
    surpriseMode,
    sleepMode: true // Special flag for sleep stories
  });
  
  // Generate slower, calmer TTS for sleep stories
  const sleepAudio = await generateSleepTTS(storyText, age);
  
  return {
    storyText,
    audioContent: sleepAudio
  };
}

// Generate calming sleep TTS
async function generateSleepTTS(text, age) {
  console.log('🌙 Generating calming sleep TTS...');
  
  const voiceSettings = {
    languageCode: 'en-GB',
    name: 'en-GB-Chirp3-HD-Vindemiatrix', // Calm, soothing voice
    ssmlGender: 'FEMALE'
  };
  
  const request = {
    input: { text: text },
    voice: voiceSettings,
    audioConfig: {
      audioEncoding: 'MP3',
      sampleRateHertz: 22050,
      speakingRate: 0.75, // Much slower for sleep stories
      volumeGainDb: -2.0 // Slightly quieter
    }
  };
  
  const [response] = await ttsClient.synthesizeSpeech(request);
  console.log('✅ Sleep TTS generated with calm pacing');
  
  return response.audioContent;
}

// Generate monster image using Gemini 2.5 Flash
async function generateMonsterImage(description, locationImage) {
  console.log('👹 Generating monster image...');
  
  try {
    // Use the correct Gemini 2.5 Flash Image Preview model
    const imageModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" });
    console.log('✅ Monster image: Using Gemini 2.5 Flash Image Preview model');
    
    const prompt = `Create a friendly, colorful monster based on this description: ${description}. Make it child-friendly, cute, and non-scary. Cartoon style, vibrant colors. ${locationImage ? 'Place the monster in a cozy indoor or outdoor setting.' : 'Place the monster in a magical, whimsical environment.'} Style: bright cartoon illustration, adorable and fun, suitable for children's stories. No text or words in the image.`;
    
    console.log('👹 Monster image prompt:', prompt.substring(0, 100) + '...');
    
    // For now, use text-only generation. Location image integration can be added later
    const result = await imageModel.generateContent({
      contents: prompt
    });
    
    const response = await result.response;
    return extractImageFromGeminiResponse(response, 'monster image generation');
    
  } catch (error) {
    console.warn('⚠️ Monster image generation failed:', error.message);
    console.warn('Error details:', error);
    return null;
  }
}

// WAV header function removed - now using MP3 format to match Yoto's official example
</file>

<file path="script.js">
// Build test - 2025-09-16
import { getStoredTokens, storeTokens, clearTokens, isTokenExpired, refreshTokens } from "./tokens.js";
import pkceChallenge from "pkce-challenge";
import { jwtDecode } from "jwt-decode";

document.addEventListener('DOMContentLoaded', () => {
    const questForm = document.getElementById('quest-form');
    const storyOutput = document.getElementById('story-output');
    const loadingSpinner = document.getElementById('loading-spinner');
    const storyText = document.getElementById('story-text');
    const heroImageInput = document.getElementById('heroImage');
    const imagePreview = document.getElementById('image-preview');
    const imageUploadArea = document.getElementById('image-upload-area');
    const loginButton = document.getElementById("login-button");
    const logoHome = document.getElementById("logo-home");
    const currentModeSpan = document.getElementById("current-mode");
    const appContent = document.getElementById("app-content");
    const audioPlayer = document.getElementById('story-audio-player');
    const playButton = document.getElementById('play-story-button');
    const uploadToYotoButton = document.getElementById('upload-to-yoto-button');
    const alertModal = document.getElementById('alert-modal');
    const alertMessage = document.getElementById('alert-message');
    const closeButton = document.querySelector('.close-button');
    const themeToggle = document.getElementById('theme-toggle');
    
    let heroImageBase64 = null;
    let sceneImageBase64 = null;
    let monsterLocationImageBase64 = null;
    let accessToken = null;
    let refreshToken = null;
    
    // Audio player state management to prevent infinite loops
    let audioPlayerInitialized = false;

    const clientId = import.meta.env.VITE_CLIENT_ID;

    // --- Modal Functionality ---
    const showAlert = (message) => {
        if (alertMessage) alertMessage.textContent = message;
        if (alertModal) alertModal.classList.remove('hidden');
    };
    
    if (closeButton) {
        closeButton.onclick = () => {
            if (alertModal) alertModal.classList.add('hidden');
        };
    }
    
    window.onclick = (event) => {
        if (event.target === alertModal && alertModal) {
            alertModal.classList.add('hidden');
        }
    };
    
    // --- Theme Toggle Functionality ---
    const initTheme = () => {
        const savedTheme = localStorage.getItem('storyforge-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    };
    
    const toggleTheme = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('storyforge-theme', newTheme);
        
        // Add a little celebration animation
        if (themeToggle) {
            themeToggle.style.transform = 'scale(1.2) rotate(360deg)';
            setTimeout(() => {
                if (themeToggle) themeToggle.style.transform = '';
            }, 300);
        }
    };
    
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    initTheme();

    // --- Navigation Dropdown Functionality ---
    const initializeNavigation = () => {
        // Handle navigation dropdown clicks
        const navItems = document.querySelectorAll('.nav-item[data-mode]');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const mode = item.dataset.mode;
                showMode(mode);
                // Hide dropdown after selection (will auto-hide on next mouse move anyway)
            });
        });
        
        // Settings button (dummy for now)
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                showAlert('⚙️ Settings panel coming soon! \n\nPlanned features:\n• Voice selection\n• Story length preferences\n• Custom themes\n• Export options');
            });
        }
    };
    
    // --- Part 1: Authentication Logic ---
    const handleLogin = async () => {
        try {
            const { code_verifier, code_challenge } = await pkceChallenge();
            sessionStorage.setItem('pkce_code_verifier', code_verifier);
            const authUrl = new URL("https://login.yotoplay.com/authorize");
            authUrl.search = new URLSearchParams({
                audience: "https://api.yotoplay.com",
                scope: "offline_access write:myo", // 'write:myo' scope is crucial for creating content
                response_type: "code",
                client_id: clientId,
                code_challenge: code_challenge,
                code_challenge_method: "S256",
                redirect_uri: window.location.origin,
            }).toString();
            window.location.href = authUrl.toString();
        } catch (error) {
            console.error("Error generating PKCE:", error);
            showAlert("An error occurred during login setup.");
        }
    };

    const handleLogout = () => {
        clearTokens();
        appContent.classList.add('hidden');
        loginButton.classList.remove('hidden');
        
        // Hide Yoto connection status
        const yotoStatus = document.getElementById('yoto-status');
        if (yotoStatus) {
            yotoStatus.classList.add('hidden');
        }
        
        // Clear current mode
        if (currentModeSpan) {
            currentModeSpan.textContent = '';
        }
    };

    const checkAuthentication = async () => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const error = params.get("error");
        
        if (error) {
            console.error("Authentication error:", error);
            showAlert("Authentication failed. Please try logging in again.");
            loginButton.classList.remove('hidden');
            return;
        }

        if (code) {
            try {
                const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
                if (!codeVerifier) throw new Error("No PKCE code verifier found");

                const res = await fetch("https://login.yotoplay.com/oauth/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        grant_type: "authorization_code",
                        client_id: clientId,
                        code_verifier: codeVerifier,
                        code,
                        redirect_uri: window.location.origin,
                    }).toString(),
                });

                if (!res.ok) {
                    const errorResult = await res.json();
                    throw new Error(`Token exchange failed: ${errorResult.error_description || res.statusText}`);
                }

                const json = await res.json();
                accessToken = json.access_token;
                refreshToken = json.refresh_token;
                storeTokens(accessToken, refreshToken);
                
                sessionStorage.removeItem('pkce_code_verifier');
                window.history.replaceState({}, document.title, window.location.pathname);
                showAppUI();
            } catch (e) {
                console.error(e);
                showAlert(e.message);
                loginButton.classList.remove('hidden');
            }
        } else {
            const stored = getStoredTokens();
            if (stored?.accessToken && !isTokenExpired(stored.accessToken)) {
                accessToken = stored.accessToken;
                refreshToken = stored.refreshToken;
                showAppUI();
            } else if (stored?.refreshToken) {
                 try {
                    const newTokens = await refreshTokens(stored.refreshToken);
                    accessToken = newTokens.accessToken;
                    refreshToken = newTokens.refreshToken;
                    showAppUI();
                 } catch (e) {
                     console.error("Failed to refresh token:", e);
                     showAlert("Session expired. Please log in again.");
                     clearTokens();
                     loginButton.classList.remove('hidden');
                 }
            } else {
                loginButton.classList.remove('hidden');
            }
        }
    };

    const showAppUI = () => {
        loginButton.classList.add('hidden');
        appContent.classList.remove('hidden');
        
        // Show Yoto connection status
        const yotoStatus = document.getElementById('yoto-status');
        if (yotoStatus) {
            yotoStatus.classList.remove('hidden');
        }
    };

    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
    }
    
    // Make logo clickable to return to mode selection
    if (logoHome) {
        logoHome.addEventListener('click', () => {
            if (currentMode) {
                backToModeSelection();
            }
        });
        logoHome.style.cursor = 'pointer';
    }
    // 🎯 PROPER: Create or update StoryForge playlist with new stories as chapters
    async function createOrUpdateStoryForgePlaylist(storyData, accessToken) {
        const PLAYLIST_TITLE = "StoryForge";
        
        try {
            console.log("🔍 Starting StoryForge playlist creation/update...");
            
            // Step 1: Search for existing StoryForge playlist
            console.log("📋 Fetching existing user content...");
            const myoResponse = await fetch("https://api.yotoplay.com/content/mine", {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            
            if (!myoResponse.ok) {
                const errorText = await myoResponse.text();
                console.error('❌ Failed to fetch user content:', {
                    status: myoResponse.status,
                    statusText: myoResponse.statusText,
                    error: errorText
                });
                throw new Error(`Failed to fetch user content: ${myoResponse.status} ${errorText}`);
            }
            
            const myoData = await myoResponse.json();
            console.log('📊 User content response structure:', {
                isArray: Array.isArray(myoData),
                hasCards: !!myoData.cards,
                hasContent: !!myoData.content,
                keys: Object.keys(myoData || {}),
                totalItems: Array.isArray(myoData) ? myoData.length : 
                           (myoData.cards ? myoData.cards.length :
                           (myoData.content ? myoData.content.length : 'unknown'))
            });
            
            // Handle different API response formats
            let contentArray = [];
            if (Array.isArray(myoData)) {
                contentArray = myoData;
            } else if (myoData.cards && Array.isArray(myoData.cards)) {
                contentArray = myoData.cards;
            } else if (myoData.content && Array.isArray(myoData.content)) {
                contentArray = myoData.content;
            }
            
            console.log(`📚 Found ${contentArray.length} existing content items`);
            
            // Look for existing StoryForge playlist
            const existingStoryForge = contentArray.find(item => 
                item && item.title === PLAYLIST_TITLE
            );
            
            let playlistData = null;
            let cardId = null;
            
            if (existingStoryForge) {
                cardId = existingStoryForge.cardId;
                console.log(`🎯 Found existing StoryForge playlist (cardId: ${cardId})`);
                
                // Fetch full playlist data
                console.log(`📥 Fetching full playlist data...`);
                const fullResponse = await fetch(`https://api.yotoplay.com/content/${cardId}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                
                if (!fullResponse.ok) {
                    const errorText = await fullResponse.text();
                    console.error(`❌ Failed to fetch full playlist data:`, {
                        cardId,
                        status: fullResponse.status,
                        statusText: fullResponse.statusText,
                        error: errorText
                    });
                    throw new Error(`Failed to fetch playlist data: ${fullResponse.status}`);
                }
                
                playlistData = await fullResponse.json();
                console.log('📋 Existing playlist structure:', {
                    title: playlistData.title,
                    hasContent: !!playlistData.content,
                    hasChapters: !!(playlistData.content && playlistData.content.chapters),
                    chaptersCount: playlistData.content?.chapters?.length || 0,
                    hasMetadata: !!playlistData.metadata,
                    topLevelKeys: Object.keys(playlistData)
                });
                
            } else {
                console.log("🆕 No existing StoryForge playlist found - will create new one");
            }
            
            // Step 2: Upload cover image (will become the playlist cover)
            let coverImageUrl = null;
            if (storyData.heroImage) {
                console.log("🖼️ Uploading new cover image...");
                try {
                    // Skip SVG images as they're not supported by Yoto API
                    if (storyData.heroImage.includes('image/svg+xml')) {
                        console.log('📝 Skipping SVG image upload (not supported by Yoto API)');
                    } else {
                        const mimeType = storyData.heroImage.substring(
                            storyData.heroImage.indexOf(":") + 1, 
                            storyData.heroImage.indexOf(";")
                        );
                        const imageBytes = atob(storyData.heroImage.split(',')[1]);
                        const imageArray = new Uint8Array(imageBytes.length);
                        for (let i = 0; i < imageBytes.length; i++) {
                            imageArray[i] = imageBytes.charCodeAt(i);
                        }
                        const imageFile = new Blob([imageArray], { type: mimeType });
                    
                        const uploadUrl = new URL("https://api.yotoplay.com/media/coverImage/user/me/upload");
                        uploadUrl.searchParams.set("autoconvert", "true");
                        
                        const uploadResponse = await fetch(uploadUrl, {
                            method: "POST",
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': mimeType,
                            },
                            body: imageFile,
                        });
                        
                        if (uploadResponse.ok) {
                            const uploadResult = await uploadResponse.json();
                            coverImageUrl = uploadResult.coverImage.mediaUrl;
                            console.log("✅ Cover image uploaded:", coverImageUrl);
                        } else {
                            const uploadError = await uploadResponse.text();
                            console.warn("⚠️ Cover image upload failed:", {
                                status: uploadResponse.status,
                                error: uploadError
                            });
                        }
                    }
                } catch (imageError) {
                    console.warn("⚠️ Cover image upload error:", imageError);
                }
            }
            
            // Step 3: Upload audio using Yoto's 4-step permanent upload workflow
            console.log('🎵 Starting Yoto permanent upload workflow...');
            let trackUrl = null;
            let mediaInfo = null;
            
            // Show progress to user
            const progressElement = document.querySelector('.upload-progress');
            if (progressElement) {
                progressElement.textContent = 'Preparing audio... (0%)';
            }
            
            try {
                // Use the existing perfect audio - no regeneration needed!
                console.log('🎼 Using existing perfect audio for Yoto upload...');
                
                if (!storyData.audio) {
                    throw new Error('No audio data available - generate story first');
                }
                
                console.log('✅ Using existing audio:', {
                    storyLength: storyData.story?.length || 0,
                    audioSize: storyData.fileSize || 0,
                    duration: storyData.duration || 0
                });
                
                // Convert existing base64 to blob for upload (MP3 format)
                const audioBlob = b64toBlob(storyData.audio, 'audio/mpeg');
                console.log('🔄 Converted existing audio to blob:', audioBlob.size, 'bytes');
                
                if (progressElement) {
                    progressElement.textContent = 'Getting upload URL... (10%)';
                }
                
                // STEP 1: Get upload URL from Yoto's transcoding service
                console.log('🔗 Step 1: Getting upload URL...');
                const uploadUrlResponse = await fetch('https://api.yotoplay.com/media/transcode/audio/uploadUrl', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json'
                    }
                });
                
                if (!uploadUrlResponse.ok) {
                    const errorText = await uploadUrlResponse.text();
                    throw new Error(`Failed to get upload URL: ${uploadUrlResponse.status} - ${errorText}`);
                }
                
                const { upload: { uploadUrl: audioUploadUrl, uploadId } } = await uploadUrlResponse.json();
                console.log('✅ Upload URL obtained:', { uploadId, hasUrl: !!audioUploadUrl });
                
                if (progressElement) {
                    progressElement.textContent = 'Uploading audio... (25%)';
                }
                
                // STEP 2: Upload the audio file to the secured URL
                console.log('⬆️ Step 2: Uploading audio file...');
                const uploadResponse = await fetch(audioUploadUrl, {
                    method: 'PUT',
                    body: new Blob([audioBlob], {
                        type: 'audio/mpeg'
                    }),
                    headers: {
                        'Content-Type': 'audio/mpeg'
                    }
                });
                
                if (!uploadResponse.ok) {
                    throw new Error(`Audio upload failed: ${uploadResponse.status}`);
                }
                
                console.log('✅ Audio uploaded successfully, waiting for transcoding...');
                
                if (progressElement) {
                    progressElement.textContent = 'Transcoding audio... (50%)';
                }
                
                // STEP 3: Wait for transcoding to complete
                console.log('⚙️ Step 3: Waiting for transcoding...');
                let transcodedAudio = null;
                let attempts = 0;
                const maxAttempts = 60; // 30 seconds timeout
                
                while (attempts < maxAttempts) {
                    const transcodeResponse = await fetch(
                        `https://api.yotoplay.com/media/upload/${uploadId}/transcoded?loudnorm=false`,
                        {
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Accept': 'application/json'
                            }
                        }
                    );
                    
                    if (transcodeResponse.ok) {
                        const data = await transcodeResponse.json();
                        
                        if (data.transcode && data.transcode.transcodedSha256) {
                            console.log('✅ Transcoding complete:', data.transcode);
                            transcodedAudio = data.transcode;
                            mediaInfo = transcodedAudio.transcodedInfo;
                            break;
                        }
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 500));
                    attempts++;
                    
                    const progress = 50 + (attempts / maxAttempts) * 25;
                    if (progressElement) {
                        progressElement.textContent = `Transcoding audio... (${Math.round(progress)}%)`;
                    }
                    console.log(`⏳ Transcoding progress: ${Math.round(progress)}%`);
                }
                
                if (!transcodedAudio) {
                    throw new Error('Transcoding timed out after 30 seconds');
                }
                
                // STEP 4: Create permanent trackUrl with yoto:#hash
                trackUrl = `yoto:#${transcodedAudio.transcodedSha256}`;
                console.log('✅ Permanent trackUrl created:', trackUrl);
                console.log('📊 Media info:', mediaInfo);
                
                // Store media info for playlist creation
                storyData.mediaInfo = mediaInfo;
                
                if (progressElement) {
                    progressElement.textContent = 'Creating playlist... (85%)';
                }
                
            } catch (uploadError) {
                console.error('❌ Error in permanent upload workflow:', uploadError);
                throw uploadError; // Don't use fallback - we want to fix upload issues, not hide them
            }
            
    // Store URL globally for debugging
    window.lastTrackUrl = trackUrl;
    
    // Debug function to examine working Yoto content
    window.debugYotoContent = async function(cardId) {
        try {
            const accessToken = await getAccessToken();
            const response = await fetch(`https://api.yotoplay.com/content/${cardId}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            
            if (!response.ok) {
                console.error('Failed to fetch content:', response.status);
                return;
            }
            
            const content = await response.json();
            console.log('🔍 Working Yoto content structure:', content);
            
            content.content?.chapters?.forEach((chapter, chapterIndex) => {
                console.log(`📚 Chapter ${chapterIndex + 1}:`, {
                    key: chapter.key,
                    title: chapter.title,
                    trackCount: chapter.tracks?.length || 0
                });
                
                chapter.tracks?.forEach((track, trackIndex) => {
                    console.log(`  🎵 Track ${trackIndex + 1}:`, {
                        key: track.key,
                        title: track.title,
                        trackUrl: track.trackUrl,
                        type: track.type,
                        format: track.format,
                        duration: track.duration,
                        fileSize: track.fileSize,
                        hasTrackUrl: !!track.trackUrl,
                        urlType: track.trackUrl ? 
                            (track.trackUrl.startsWith('yoto:#') ? 'permanent-hash' : 
                             (track.trackUrl.startsWith('https://api.yotoplay.com') ? 'yoto-audio' : 'external-stream')) : 'none'
                    });
                });
            });
            
            return content;
        } catch (error) {
            console.error('Error examining Yoto content:', error);
        }
    };
            
            // Step 4: Build playlist structure
            let finalPlaylist;
            
            if (playlistData) {
                // Update existing playlist
                console.log("📝 Updating existing playlist...");
                
                // Ensure proper structure
                if (!playlistData.content) playlistData.content = {};
                if (!playlistData.content.chapters) playlistData.content.chapters = [];
                if (!playlistData.metadata) {
                    playlistData.metadata = {
                        description: "AI-generated stories from The Storyforge",
                        media: { duration: 0, fileSize: 0 }
                    };
                }
                
                // Add new chapter
                const nextChapterNumber = playlistData.content.chapters.length + 1;
                const newChapterKey = String(nextChapterNumber).padStart(2, '0');
                
                const trackData = {
                    key: "01",
                    title: "Chapter One",
                    trackUrl: trackUrl,
                    type: (trackUrl.startsWith('yoto:#') || trackUrl.startsWith('https://api.yotoplay.com')) ? "audio" : "stream",
                    format: "mp3", // Always MP3 now, matching Yoto's official example
                    duration: storyData.duration || (mediaInfo?.duration) || 180,
                    fileSize: storyData.fileSize || (mediaInfo?.fileSize) || 1000000
                };
                
                console.log('🎵 Track data being added to existing playlist:', {
                    trackUrl: trackData.trackUrl,
                    type: trackData.type,
                    format: trackData.format,
                    duration: trackData.duration,
                    fileSize: trackData.fileSize,
                    isPermanentUrl: trackUrl.startsWith('yoto:#') || trackUrl.startsWith('https://api.yotoplay.com'),
                    urlType: trackUrl.startsWith('yoto:#') ? 'permanent-hash' : (trackUrl.startsWith('https://api.yotoplay.com') ? 'yoto-audio' : 'stream'),
                    urlLength: trackUrl.length
                });
                
                const newChapter = {
                    key: newChapterKey,
                    title: storyData.heroName || `Story ${nextChapterNumber}`,
                    tracks: [trackData],
                    display: {
                        icon16x16: "yoto:#ZuVmuvnoFiI4el6pBPvq0ofcgQ18HjrCmdPEE7GCnP8"
                    }
                };
                
                playlistData.content.chapters.push(newChapter);
                console.log(`📚 Added chapter ${nextChapterNumber}: "${newChapter.title}"`);
                
                // Recalculate metadata
                const totalDuration = playlistData.content.chapters.reduce((sum, chapter) => {
                    if (chapter?.tracks && Array.isArray(chapter.tracks)) {
                        return sum + chapter.tracks.reduce((trackSum, track) => 
                            trackSum + (track?.duration || 0), 0);
                    }
                    return sum;
                }, 0);
                
                const totalFileSize = playlistData.content.chapters.reduce((sum, chapter) => {
                    if (chapter?.tracks && Array.isArray(chapter.tracks)) {
                        return sum + chapter.tracks.reduce((trackSum, track) => 
                            trackSum + (track?.fileSize || 0), 0);
                    }
                    return sum;
                }, 0);
                
                playlistData.metadata.media = {
                    duration: totalDuration,
                    fileSize: totalFileSize
                };
                
                // Update cover image
                if (coverImageUrl) {
                    playlistData.metadata.cover = { imageL: coverImageUrl };
                }
                
                finalPlaylist = {
                    title: playlistData.title,
                    content: playlistData.content,
                    metadata: playlistData.metadata
                };
                
            } else {
                // Create new playlist
                console.log("🆕 Creating new playlist...");
                
                const trackData = {
                    key: "01",
                    title: "Chapter One",
                    trackUrl: trackUrl,
                    type: (trackUrl.startsWith('yoto:#') || trackUrl.startsWith('https://api.yotoplay.com')) ? "audio" : "stream",
                    format: "mp3", // Always MP3 now, matching Yoto's official example
                    duration: storyData.duration || (mediaInfo?.duration) || 180,
                    fileSize: storyData.fileSize || (mediaInfo?.fileSize) || 1000000
                };
                
                console.log('🎵 Track data being added to new playlist:', {
                    trackUrl: trackData.trackUrl,
                    type: trackData.type,
                    format: trackData.format,
                    duration: trackData.duration,
                    fileSize: trackData.fileSize,
                    isPermanentUrl: trackUrl.startsWith('yoto:#') || trackUrl.startsWith('https://api.yotoplay.com'),
                    urlType: trackUrl.startsWith('yoto:#') ? 'permanent-hash' : (trackUrl.startsWith('https://api.yotoplay.com') ? 'yoto-audio' : 'stream'),
                    urlLength: trackUrl.length
                });
                
                const newChapter = {
                    key: "01",
                    title: storyData.heroName || "Story 1",
                    tracks: [trackData],
                    display: {
                        icon16x16: "yoto:#ZuVmuvnoFiI4el6pBPvq0ofcgQ18HjrCmdPEE7GCnP8"
                    }
                };
                
                finalPlaylist = {
                    title: PLAYLIST_TITLE,
                    content: {
                        chapters: [newChapter]
                    },
                    metadata: {
                        description: "AI-generated stories from The Storyforge",
                        media: {
                            duration: storyData.duration || 180,
                            fileSize: storyData.fileSize || 1000000
                        }
                    }
                };
                
                if (coverImageUrl) {
                    finalPlaylist.metadata.cover = { imageL: coverImageUrl };
                }
            }
            
            console.log('📦 Final payload structure:', {
                title: finalPlaylist.title,
                chaptersCount: finalPlaylist.content.chapters.length,
                hasCover: !!(finalPlaylist.metadata.cover),
                totalDuration: finalPlaylist.metadata.media.duration
            });
            
            // Log the complete track details that will be sent to Yoto
            finalPlaylist.content.chapters.forEach((chapter, chapterIndex) => {
                console.log(`🎵 Chapter ${chapterIndex + 1} tracks:`);
                chapter.tracks?.forEach((track, trackIndex) => {
                    console.log(`  📀 Track ${trackIndex + 1}:`, {
                        title: track.title,
                        trackUrl: track.trackUrl?.substring(0, 80) + '...',
                        fullTrackUrl: track.trackUrl,
                        type: track.type,
                        format: track.format,
                        duration: track.duration,
                        fileSize: track.fileSize
                    });
                });
            });
            
            // Step 5: Submit to Yoto API
            // Note: Due to CORS restrictions, we'll always create new content instead of updating
            // This means each story becomes a separate card rather than chapters in one playlist
            
            // Create a unique title for each story to avoid conflicts
            const uniqueTitle = cardId ? 
                `${PLAYLIST_TITLE} - ${storyData.heroName || 'Story'}` : 
                PLAYLIST_TITLE;
                
            finalPlaylist.title = uniqueTitle;
            
            console.log(`🆕 Creating new content: "${uniqueTitle}" (CORS workaround)...`);
            const apiResponse = await fetch('https://api.yotoplay.com/content', {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(finalPlaylist)
            });
            
            if (!apiResponse.ok) {
                const errorText = await apiResponse.text();
                console.error('❌ Yoto API Error:', {
                    operation: 'CREATE',
                    endpoint: '/content',
                    method: 'POST',
                    status: apiResponse.status,
                    statusText: apiResponse.statusText,
                    errorBody: errorText,
                    payloadSent: JSON.stringify(finalPlaylist, null, 2)
                });
                
                let parsedError = null;
                try {
                    parsedError = JSON.parse(errorText);
                } catch (e) {
                    // Error is not JSON
                }
                
                throw new Error(`Yoto API content creation failed: ${errorText}`);
            }
            
            const result = await apiResponse.json();
            console.log('✅ Success! StoryForge content created:', {
                operation: 'CREATED',
                cardId: result.cardId,
                title: result.title,
                chapters: result.content?.chapters?.length || 'unknown'
            });
            
            // Update progress to completion
            if (progressElement) {
                progressElement.textContent = '✅ Story created successfully! (100%)';
            }
            
            return result;
            
        } catch (error) {
            console.error('💥 Error in createOrUpdateStoryForgePlaylist:', error);
            throw error;
        }
    }

    // --- Mode Switching Logic ---
    let currentMode = null;
    
    // Mode switching functionality
    const initializeModeSelection = () => {
        const modeButtons = document.querySelectorAll('.mode-btn');
        const modeContentContainer = document.getElementById('mode-content');
        const modeSelectionGrid = document.querySelector('.mode-selection-grid');
        const welcomeSection = document.querySelector('.welcome-section');
        
        modeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const selectedMode = button.dataset.mode;
                showMode(selectedMode);
            });
        });
    };
    
    const showMode = (mode) => {
        currentMode = mode;
        console.log(`Switching to ${mode} mode`);
        
        // Update current mode display in top bar
        const modeNames = {
            'classic': '📚 Classic Story',
            'adventure-me': '⚔️ Adventure Me',
            'homework-forge': '📝 Homework Forge',
            'sleep-forge': '🌙 Sleep Forge',
            'dream-job': '🔮 Dream Job Detective',
            'monster-maker': '👹 Monster Maker',
            'help': '💡 Help & Templates'
        };
        
        if (currentModeSpan) {
            currentModeSpan.textContent = ` → ${modeNames[mode] || mode}`;
        }
        
        const modeContentContainer = document.getElementById('mode-content');
        const modeSelectionGrid = document.querySelector('.mode-selection-grid');
        const welcomeSection = document.querySelector('.welcome-section');
        
        // Hide welcome section and mode grid
        if (welcomeSection) welcomeSection.classList.add('hidden');
        if (modeSelectionGrid) modeSelectionGrid.classList.add('hidden');
        
        // Show mode content container
        if (modeContentContainer) {
            modeContentContainer.classList.remove('hidden');
            modeContentContainer.innerHTML = getModeContent(mode);
            
            // Set up mode-specific event listeners
            setupModeEventListeners(mode);
        }
    };
    
    const backToModeSelection = () => {
        console.log('Returning to mode selection');
        
        const modeContentContainer = document.getElementById('mode-content');
        const modeSelectionGrid = document.querySelector('.mode-selection-grid');
        const welcomeSection = document.querySelector('.welcome-section');
        
        // Hide mode content
        if (modeContentContainer) {
            modeContentContainer.classList.add('hidden');
            modeContentContainer.innerHTML = '';
        }
        
        // Show welcome section and mode grid
        if (welcomeSection) welcomeSection.classList.remove('hidden');
        if (modeSelectionGrid) modeSelectionGrid.classList.remove('hidden');
        
        // Clear current mode indicator
        if (currentModeSpan) {
            currentModeSpan.textContent = '';
        }
        
        currentMode = null;
    };
    
    const getModeContent = (mode) => {
        switch (mode) {
            case 'classic':
                return `
                    <div class="mode-header-compact">
                        <button class="back-to-modes-btn" onclick="backToModeSelection()">
                            ← Back to Modes
                        </button>
                        <div class="mode-info">
                            <h2 class="mode-title-compact">
                                <span class="mode-icon">📚</span>
                                <span>Classic Story</span>
                            </h2>
                            <div class="mode-actions">
                                <button class="print-btn" onclick="printStoryWorksheet()" title="Download story arc worksheet">
                                    <span>🖨️</span>
                                    <span>Print worksheet</span>
                                </button>
                            </div>
                        </div>
                        
                        <!-- Instructions Section -->
                        <div class="instructions-section">
                            <div class="instructions-content">
                                <div class="instruction-point">
                                    <span class="instruction-icon">✨</span>
                                    <span><strong>Just one element needed!</strong> Fill in at least one story element below - hero name, beginning, challenge, or resolution.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">🌈</span>
                                    <span><strong>More details = more magic!</strong> The more you add, the more personalized and fun your story becomes.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">👨‍👩‍👧‍👦</span>
                                    <span><strong>Parents:</strong> Work with your children on their own story arc using our worksheet (🖨️ above) - it's a great way to plan together!</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Age Selection moved up -->
                        <div class="age-selection-compact">
                            <label for="classic-story-age" class="compact-label">
                                <span>Story Length:</span>
                            </label>
                            <select id="classic-story-age" class="paper-select" required>
                                <option value="3">🧒 Little Listeners (3-6 years, ~150 words)</option>
                                <option value="6" selected>🧒 Young Explorers (6-8 years, ~500 words)</option>
                                <option value="9">🧒 Adventure Seekers (8-12 years, ~1000 words)</option>
                                <option value="12">🧑 Epic Readers (13+ years, ~2000 words)</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="story-form-container">
                        
                        <form id="classic-story-form" class="story-form">
                            <!-- Unified Story Creation Section -->
                            <div class="unified-story-group paper-scrap">
                                <h3 class="section-title">
                                    <span class="section-icon">✨</span>
                                    <span>Create Your Story</span>
                                </h3>
                                
                                <!-- Story Elements -->
                                <div class="story-elements">
                                    <div class="input-grid">
                                        <div class="input-group">
                                            <label for="classic-heroName" class="compact-label">
                                                <span>🦸 Hero's Name</span>
                                            </label>
                                            <input type="text" id="classic-heroName" class="paper-input" placeholder="e.g., Captain Comet, Princess Luna...">
                                        </div>
                                        <div class="input-group">
                                            <label for="classic-promptSetup" class="compact-label">
                                                <span>🌅 The Beginning</span>
                                            </label>
                                            <input type="text" id="classic-promptSetup" class="paper-input" placeholder="e.g., a magical forest made of ice cream...">
                                        </div>
                                        <div class="input-group">
                                            <label for="classic-promptRising" class="compact-label">
                                                <span>⚡ The Challenge</span>
                                            </label>
                                            <input type="text" id="classic-promptRising" class="paper-input" placeholder="e.g., a grumpy dragon stole the sprinkles...">
                                        </div>
                                        <div class="input-group">
                                            <label for="classic-promptClimax" class="compact-label">
                                                <span>🎆 The Resolution</span>
                                            </label>
                                            <input type="text" id="classic-promptClimax" class="paper-input" placeholder="e.g., the dragon became best friends with everyone...">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Character & Scene Images - Expanded Layout -->
                                <div class="images-section-expanded">
                                    <h4 class="images-title">
                                        <span class="section-icon">🎨</span>
                                        <span>Add Your Artwork (Optional)</span>
                                    </h4>
                                    
                                    <div class="image-uploads-expanded">
                                        <div class="image-upload-full">
                                            <label for="classic-heroImage" class="upload-label">
                                                <span class="label-text">Character Drawing</span>
                                                <span class="label-doodle">🎨</span>
                                            </label>
                                            <div id="classic-image-upload-area" class="paper-upload-full">
                                                <input type="file" id="classic-heroImage" accept="image/*" class="hidden-input">
                                                <div class="upload-content-full">
                                                    <button type="button" class="upload-btn-full" onclick="document.getElementById('classic-heroImage').click()">
                                                        <span>📎 Upload Character Drawing</span>
                                                    </button>
                                                    <p class="upload-hint">Draw or upload your hero character!</p>
                                                    <div id="classic-image-preview" class="preview-container hidden"></div>
                                                </div>
                                                <div class="upload-doodles">
                                                    <span class="doodle-arrow">→</span>
                                                    <span class="doodle-star">★</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="image-upload-full">
                                            <label for="classic-sceneImage" class="upload-label">
                                                <span class="label-text">Scene Drawing</span>
                                                <span class="label-doodle">🖼️</span>
                                            </label>
                                            <div id="classic-scene-upload-area" class="paper-upload-full">
                                                <input type="file" id="classic-sceneImage" accept="image/*" class="hidden-input">
                                                <div class="upload-content-full">
                                                    <button type="button" class="upload-btn-full" onclick="document.getElementById('classic-sceneImage').click()">
                                                        <span>🏖️ Upload Scene Drawing</span>
                                                    </button>
                                                    <p class="upload-hint">Draw or upload a magical place!</p>
                                                    <div id="classic-scene-preview" class="preview-container hidden"></div>
                                                </div>
                                                <div class="upload-doodles">
                                                    <span class="doodle-tree">🌳</span>
                                                    <span class="doodle-castle">🏰</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Centered Forge Button -->
                            <div class="forge-section">
                                <button type="submit" class="forge-btn-centered">
                                    <span class="btn-text">✨ Forge My Story! ✨</span>
                                    <div class="btn-sparkles">
                                        <span>✨</span>
                                        <span>★</span>
                                        <span>✨</span>
                                    </div>
                                </button>
                                
                                <div class="or-divider">
                                    <span>or</span>
                                </div>
                                
                                <button type="button" id="classic-surprise-me-btn" class="surprise-btn-compact">
                                    <span>🎲 Surprise Me! 🎲</span>
                                </button>
                            </div>
                        </form>
                    </div>
                `;
                
            case 'help':
                return `
                    <div class="mode-header paper-scrap">
                        <button class="back-to-modes-btn" onclick="backToModeSelection()">
                            ← Back to Modes
                        </button>
                        <h2 class="mode-title-header">
                            <span class="mode-icon">💡</span>
                            <span>Help & Templates</span>
                        </h2>
                    </div>
                    
                    <div class="help-content paper-scrap">
                        <div class="help-section">
                            <h3>📚 How to Use StoryForge</h3>
                            <ol>
                                <li><strong>Choose Your Mode:</strong> Select from Classic stories, Wild West adventures, educational tales, bedtime stories, or monster adventures</li>
                                <li><strong>Fill in Details:</strong> Each mode has different inputs to customize your story</li>
                                <li><strong>Generate:</strong> Click the generate button to create your personalized story</li>
                                <li><strong>Listen & Share:</strong> Enjoy the audio narration and share with friends</li>
                                <li><strong>Upload to Yoto:</strong> Connect your Yoto account to add stories to your player</li>
                            </ol>
                        </div>
                        
                        <div class="help-section">
                            <h3>🎭 Story Modes Guide</h3>
                            <div class="mode-guide-grid">
                                <div class="mode-guide">
                                    <h4>📚 Classic Story</h4>
                                    <p>Traditional storytelling with heroes, challenges, and magical endings. Perfect for timeless adventures.</p>
                                </div>
                                <div class="mode-guide">
                                    <h4>🤠 Wanted Poster</h4>
                                    <p>Wild West tales with outlaws, sheriffs, and frontier justice. Great for action-packed adventures.</p>
                                </div>
                                <div class="mode-guide">
                                    <h4>📝 Homework Forge</h4>
                                    <p>Educational stories that make learning fun. Turn any subject into an engaging adventure.</p>
                                </div>
                                <div class="mode-guide">
                                    <h4>🌙 Sleep Forge</h4>
                                    <p>Gentle bedtime stories with calming narration. Perfect for winding down at night.</p>
                                </div>
                                <div class="mode-guide">
                                    <h4>👹 Monster Maker</h4>
                                    <p>Design custom creatures and hear their adventures. Great for creative storytelling.</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="help-section">
                            <h3>💡 Tips for Better Stories</h3>
                            <ul>
                                <li>Be specific with your descriptions - details make stories come alive</li>
                                <li>Think about your audience age when setting story complexity</li>
                                <li>Upload character drawings to personalize your tales</li>
                                <li>Try the Surprise Me feature for unexpected adventures</li>
                                <li>Use Sleep Forge for gentle bedtime stories</li>
                            </ul>
                        </div>
                    </div>
                `;
            
            case 'wanted-poster':
                return `
                    <div class="mode-header-compact">
                        <button class="back-to-modes-btn" onclick="backToModeSelection()">
                            ← Back to Modes
                        </button>
                        <div class="mode-info">
                            <h2 class="mode-title-compact">
                                <span class="mode-icon">🤠</span>
                                <span>Wanted Poster</span>
                            </h2>
                        </div>
                        
                        <div class="instructions-section">
                            <div class="instructions-content">
                                <div class="instruction-point">
                                    <span class="instruction-icon">📋</span>
                                    <span><strong>Fill in the details!</strong> Enter your character's name, what they're wanted for, their special skills, and the reward.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">🎨</span>
                                    <span><strong>Add artwork or generate!</strong> Draw your outlaw or let our AI create one for you.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">⭐</span>
                                    <span><strong>Download your poster!</strong> Get a printable wanted poster plus an exciting story.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="story-form-container">
                        <form id="wanted-poster-form" class="story-form">
                            <div class="unified-story-group paper-scrap">
                                <h3 class="section-title">
                                    <span class="section-icon">🤠</span>
                                    <span>Create Your Wanted Poster</span>
                                </h3>
                                
                                <div class="story-elements">
                                    <div class="input-grid">
                                        <div class="input-group">
                                            <label for="wanted-name" class="compact-label">
                                                <span>🤠 Outlaw's Name *</span>
                                            </label>
                                            <input type="text" id="wanted-name" class="paper-input" placeholder="e.g., Black Bart, Calamity Jane..." required>
                                        </div>
                                        <div class="input-group">
                                            <label for="wanted-for" class="compact-label">
                                                <span>⚖️ Wanted For *</span>
                                            </label>
                                            <input type="text" id="wanted-for" class="paper-input" placeholder="e.g., stealing all the town's cookies..." required>
                                        </div>
                                        <div class="input-group">
                                            <label for="wanted-skills" class="compact-label">
                                                <span>⚡ Special Skills</span>
                                            </label>
                                            <input type="text" id="wanted-skills" class="paper-input" placeholder="e.g., lightning-fast draw, expert horseback rider...">
                                        </div>
                                        <div class="input-group">
                                            <label for="wanted-reward" class="compact-label">
                                                <span>💰 Reward</span>
                                            </label>
                                            <input type="text" id="wanted-reward" class="paper-input" placeholder="e.g., $1000, A lifetime supply of beans...">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="images-section-expanded">
                                    <h4 class="images-title">
                                        <span class="section-icon">🎨</span>
                                        <span>Outlaw Portrait</span>
                                    </h4>
                                    
                                    <div class="image-choice-section">
                                        <div class="choice-toggles">
                                            <label class="choice-option">
                                                <input type="radio" name="image-choice" value="upload" id="upload-choice" checked>
                                                <span class="choice-label">
                                                    <span class="choice-icon">📎</span>
                                                    <span>Upload Drawing</span>
                                                </span>
                                            </label>
                                            <label class="choice-option">
                                                <input type="radio" name="image-choice" value="generate" id="generate-choice">
                                                <span class="choice-label">
                                                    <span class="choice-icon">🎭</span>
                                                    <span>AI Generate</span>
                                                </span>
                                            </label>
                                        </div>
                                        
                                        <div id="upload-section" class="image-upload-full">
                                            <div id="wanted-image-upload-area" class="paper-upload-full">
                                                <input type="file" id="wanted-image" accept="image/*" class="hidden-input">
                                                <div class="upload-content-full">
                                                    <button type="button" class="upload-btn-full" onclick="document.getElementById('wanted-image').click()">
                                                        <span>📎 Upload Outlaw Drawing</span>
                                                    </button>
                                                    <p class="upload-hint">Draw your wanted character!</p>
                                                    <div id="wanted-image-preview" class="preview-container hidden"></div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div id="generate-section" class="generate-options hidden">
                                            <p class="generate-hint">Our AI will create your outlaw based on the details above!</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="forge-section">
                                <button type="submit" class="forge-btn-centered">
                                    <span class="btn-text">🤠 Create Wanted Poster! 🤠</span>
                                    <div class="btn-sparkles">
                                        <span>⭐</span>
                                        <span>🌟</span>
                                        <span>⭐</span>
                                    </div>
                                </button>
                            </div>
                        </form>
                    </div>
                `;

            case 'homework-forge':
                return `
                    <div class="mode-header-compact">
                        <button class="back-to-modes-btn" onclick="backToModeSelection()">
                            ← Back to Modes
                        </button>
                        <div class="mode-info">
                            <h2 class="mode-title-compact">
                                <span class="mode-icon">📝</span>
                                <span>Homework Forge</span>
                            </h2>
                        </div>
                        
                        <div class="instructions-section">
                            <div class="instructions-content">
                                <div class="instruction-point">
                                    <span class="instruction-icon">📸</span>
                                    <span><strong>Upload your notes!</strong> Take photos of homework, worksheets, or textbook pages.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">🎭</span>
                                    <span><strong>Or choose a topic!</strong> Tell us what you want to learn about and we'll create a summary.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">🎧</span>
                                    <span><strong>Learn while listening!</strong> Get a fun, age-appropriate audio summary.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="story-form-container">
                        <form id="homework-forge-form" class="story-form">
                            <div class="unified-story-group paper-scrap">
                                <h3 class="section-title">
                                    <span class="section-icon">📚</span>
                                    <span>Create Your Learning Summary</span>
                                </h3>
                                
                                <div class="homework-choice-section">
                                    <div class="choice-toggles">
                                        <label class="choice-option">
                                            <input type="radio" name="homework-choice" value="upload" id="homework-upload-choice" checked>
                                            <span class="choice-label">
                                                <span class="choice-icon">📸</span>
                                                <span>Upload Notes/Work</span>
                                            </span>
                                        </label>
                                        <label class="choice-option">
                                            <input type="radio" name="homework-choice" value="topic" id="homework-topic-choice">
                                            <span class="choice-label">
                                                <span class="choice-icon">💡</span>
                                                <span>Choose Topic</span>
                                            </span>
                                        </label>
                                    </div>
                                    
                                    <div id="homework-upload-section" class="homework-upload-area">
                                        <div class="multiple-uploads">
                                            <div class="upload-instruction">
                                                <span class="instruction-icon">📝</span>
                                                <span>Upload multiple pages or documents (up to 5 files)</span>
                                            </div>
                                            <input type="file" id="homework-files" accept="image/*,application/pdf" multiple class="hidden-input">
                                            <button type="button" class="upload-btn-full" onclick="document.getElementById('homework-files').click()">
                                                <span>📎 Upload Notes & Documents</span>
                                            </button>
                                            <div id="homework-files-preview" class="files-preview-container"></div>
                                        </div>
                                    </div>
                                    
                                    <div id="homework-topic-section" class="topic-selection-area hidden">
                                        <div class="input-group">
                                            <label for="homework-subject" class="compact-label">
                                                <span>📖 Subject</span>
                                            </label>
                                            <select id="homework-subject" class="paper-select">
                                                <option value="">Choose a subject...</option>
                                                <option value="math">🧮 Mathematics</option>
                                                <option value="science">🔬 Science</option>
                                                <option value="history">🏛️ History</option>
                                                <option value="english">📝 English/Language Arts</option>
                                                <option value="geography">🌍 Geography</option>
                                                <option value="art">🎨 Art</option>
                                                <option value="music">🎵 Music</option>
                                                <option value="other">🌟 Other</option>
                                            </select>
                                        </div>
                                        <div class="input-group">
                                            <label for="homework-topic" class="compact-label">
                                                <span>💡 What to Learn About</span>
                                            </label>
                                            <input type="text" id="homework-topic" class="paper-input" placeholder="e.g., How volcanoes work, The water cycle, Ancient Egypt...">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="age-selection-compact">
                                    <label for="homework-age" class="compact-label">
                                        <span>Learning Level:</span>
                                    </label>
                                    <select id="homework-age" class="paper-select">
                                        <option value="6" selected>🧒 Elementary (6-8 years)</option>
                                        <option value="9">🧒 Middle School (9-12 years)</option>
                                        <option value="12">🧑 High School (13+ years)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="forge-section">
                                <button type="submit" class="forge-btn-centered">
                                    <span class="btn-text">📚 Create Learning Summary! 📚</span>
                                    <div class="btn-sparkles">
                                        <span>💡</span>
                                        <span>⚡</span>
                                        <span>💡</span>
                                    </div>
                                </button>
                            </div>
                        </form>
                    </div>
                `;

            case 'sleep-forge':
                return `
                    <div class="mode-header-compact">
                        <button class="back-to-modes-btn" onclick="backToModeSelection()">
                            ← Back to Modes
                        </button>
                        <div class="mode-info">
                            <h2 class="mode-title-compact">
                                <span class="mode-icon">🌙</span>
                                <span>Sleep Forge</span>
                            </h2>
                        </div>
                        
                        <div class="instructions-section">
                            <div class="instructions-content">
                                <div class="instruction-point">
                                    <span class="instruction-icon">🌙</span>
                                    <span><strong>Gentle bedtime stories!</strong> Like classic stories but with soothing, calm narration.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">💤</span>
                                    <span><strong>Sleep meditation style!</strong> Longer pauses and peaceful pacing to help you drift off.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">⭐</span>
                                    <span><strong>Sweet dreams guaranteed!</strong> Perfect for winding down at bedtime.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="story-form-container">
                        <form id="sleep-forge-form" class="story-form">
                            <div class="unified-story-group paper-scrap">
                                <h3 class="section-title">
                                    <span class="section-icon">🌙</span>
                                    <span>Create Your Bedtime Story</span>
                                </h3>
                                
                                <div class="story-elements">
                                    <div class="input-grid">
                                        <div class="input-group">
                                            <label for="sleep-heroName" class="compact-label">
                                                <span>✨ Hero's Name</span>
                                            </label>
                                            <input type="text" id="sleep-heroName" class="paper-input" placeholder="e.g., Sleepy Sam, Luna the Dreamer...">
                                        </div>
                                        <div class="input-group">
                                            <label for="sleep-promptSetup" class="compact-label">
                                                <span>🌅 The Peaceful Beginning</span>
                                            </label>
                                            <input type="text" id="sleep-promptSetup" class="paper-input" placeholder="e.g., a cozy cloud kingdom, a gentle meadow...">
                                        </div>
                                        <div class="input-group">
                                            <label for="sleep-promptRising" class="compact-label">
                                                <span>🌸 The Gentle Adventure</span>
                                            </label>
                                            <input type="text" id="sleep-promptRising" class="paper-input" placeholder="e.g., helping sleepy animals find their beds...">
                                        </div>
                                        <div class="input-group">
                                            <label for="sleep-promptClimax" class="compact-label">
                                                <span>😴 The Peaceful Ending</span>
                                            </label>
                                            <input type="text" id="sleep-promptClimax" class="paper-input" placeholder="e.g., everyone falls asleep under the stars...">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="images-section-expanded">
                                    <h4 class="images-title">
                                        <span class="section-icon">🎨</span>
                                        <span>Add Your Dreamy Artwork (Optional)</span>
                                    </h4>
                                    
                                    <div class="image-uploads-expanded">
                                        <div class="image-upload-full">
                                            <div id="sleep-image-upload-area" class="paper-upload-full">
                                                <input type="file" id="sleep-heroImage" accept="image/*" class="hidden-input">
                                                <div class="upload-content-full">
                                                    <button type="button" class="upload-btn-full" onclick="document.getElementById('sleep-heroImage').click()">
                                                        <span>🌙 Upload Dreamy Character</span>
                                                    </button>
                                                    <p class="upload-hint">Draw your sleepy hero!</p>
                                                    <div id="sleep-image-preview" class="preview-container hidden"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="age-selection-compact">
                                    <label for="sleep-story-age" class="compact-label">
                                        <span>Story Length:</span>
                                    </label>
                                    <select id="sleep-story-age" class="paper-select">
                                        <option value="3" selected>🧒 Little Dreamers (3-6 years, ~150 words)</option>
                                        <option value="6">🧒 Young Sleepyheads (6-8 years, ~300 words)</option>
                                        <option value="9">🧒 Peaceful Explorers (8-12 years, ~500 words)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="forge-section">
                                <button type="submit" class="forge-btn-centered">
                                    <span class="btn-text">🌙 Create Bedtime Story! 🌙</span>
                                    <div class="btn-sparkles">
                                        <span>⭐</span>
                                        <span>💤</span>
                                        <span>⭐</span>
                                    </div>
                                </button>
                                
                                <div class="or-divider">
                                    <span>or</span>
                                </div>
                                
                                <button type="button" id="sleep-surprise-me-btn" class="surprise-btn-compact">
                                    <span>🌙 Surprise Bedtime Story! 🌙</span>
                                </button>
                            </div>
                        </form>
                    </div>
                `;

            case 'monster-maker':
                return `
                    <div class="mode-header-compact">
                        <button class="back-to-modes-btn" onclick="backToModeSelection()">
                            ← Back to Modes
                        </button>
                        <div class="mode-info">
                            <h2 class="mode-title-compact">
                                <span class="mode-icon">👹</span>
                                <span>Monster Maker</span>
                            </h2>
                        </div>
                        
                        <div class="instructions-section">
                            <div class="instructions-content">
                                <div class="instruction-point">
                                    <span class="instruction-icon">👹</span>
                                    <span><strong>Describe your monster!</strong> Tell us about your creature's appearance, personality, and powers.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">📸</span>
                                    <span><strong>Where does it live?</strong> Upload a photo of where you want to see your monster (bedroom, garden, etc.).</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">🎨</span>
                                    <span><strong>AI brings it to life!</strong> We'll create an image and an exciting story about your monster.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="story-form-container">
                        <form id="monster-maker-form" class="story-form">
                            <div class="unified-story-group paper-scrap">
                                <h3 class="section-title">
                                    <span class="section-icon">👹</span>
                                    <span>Design Your Monster</span>
                                </h3>
                                
                                <div class="story-elements">
                                    <div class="input-grid">
                                        <div class="input-group">
                                            <label for="monster-description1" class="compact-label">
                                                <span>👹 Describe Your Monster *</span>
                                            </label>
                                            <input type="text" id="monster-description1" class="paper-input" placeholder="e.g., A fluffy purple monster with three eyes..." required>
                                        </div>
                                        <div class="input-group">
                                            <label for="monster-description2" class="compact-label">
                                                <span>⚡ Special Powers or Traits</span>
                                            </label>
                                            <input type="text" id="monster-description2" class="paper-input" placeholder="e.g., Can turn invisible when scared, loves to dance...">
                                        </div>
                                        <div class="input-group">
                                            <label for="monster-description3" class="compact-label">
                                                <span>💫 Personality</span>
                                            </label>
                                            <input type="text" id="monster-description3" class="paper-input" placeholder="e.g., Friendly but shy, mischievous but kind...">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="images-section-expanded">
                                    <h4 class="images-title">
                                        <span class="section-icon">🏡</span>
                                        <span>Where Does Your Monster Live?</span>
                                    </h4>
                                    
                                    <div class="image-uploads-expanded">
                                        <div class="image-upload-full">
                                            <div id="monster-location-upload-area" class="paper-upload-full">
                                                <input type="file" id="monster-location" accept="image/*" class="hidden-input">
                                                <div class="upload-content-full">
                                                    <button type="button" class="upload-btn-full" onclick="document.getElementById('monster-location').click()">
                                                        <span>📸 Upload Location Photo</span>
                                                    </button>
                                                    <p class="upload-hint">Take a photo of your bedroom, garden, or anywhere you want to see your monster!</p>
                                                    <div id="monster-location-preview" class="preview-container hidden"></div>
                                                </div>
                                                <div class="upload-doodles">
                                                    <span class="doodle-house">🏠</span>
                                                    <span class="doodle-tree">🌳</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="age-selection-compact">
                                    <label for="monster-story-age" class="compact-label">
                                        <span>Story Length:</span>
                                    </label>
                                    <select id="monster-story-age" class="paper-select">
                                        <option value="3">🧒 Little Monster Fans (3-6 years, ~150 words)</option>
                                        <option value="6" selected>🧒 Young Adventurers (6-8 years, ~500 words)</option>
                                        <option value="9">🧒 Monster Experts (8-12 years, ~1000 words)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="forge-section">
                                <button type="submit" class="forge-btn-centered">
                                    <span class="btn-text">👹 Create My Monster! 👹</span>
                                    <div class="btn-sparkles">
                                        <span>🎨</span>
                                        <span>⚡</span>
                                        <span>🎨</span>
                                    </div>
                                </button>
                            </div>
                        </form>
                    </div>
                `;

            case 'adventure-me':
                return `
                    <div class="mode-header-compact">
                        <button class="back-to-modes-btn" onclick="backToModeSelection()">
                            ← Back to Modes
                        </button>
                        <div class="mode-info">
                            <h2 class="mode-title-compact">
                                <span class="mode-icon">⚔️</span>
                                <span>Adventure Me</span>
                            </h2>
                        </div>
                        
                        <div class="instructions-section">
                            <div class="instructions-content">
                                <div class="instruction-point">
                                    <span class="instruction-icon">🌟</span>
                                    <span><strong>You're the hero!</strong> Put yourself in the center of an epic adventure story.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">🗺️</span>
                                    <span><strong>Choose your adventure:</strong> Wild West, underwater kingdom, sky cities, or jungle exploration.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">⚡</span>
                                    <span><strong>Add your skills:</strong> Tell us your special abilities to make the story uniquely yours!</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="story-form-container">
                        <form id="adventure-me-form" class="story-form">
                            <div class="unified-story-group paper-scrap">
                                <h3 class="section-title">
                                    <span class="section-icon">⚔️</span>
                                    <span>Design Your Adventure</span>
                                </h3>
                                
                                <div class="story-elements">
                                    <div class="input-grid">
                                        <div class="input-group">
                                            <label for="adventure-child-name" class="compact-label">
                                                <span>🌟 Your Name *</span>
                                            </label>
                                            <input type="text" id="adventure-child-name" class="paper-input" placeholder="Enter your name..." required>
                                        </div>
                                        <div class="input-group">
                                            <label for="adventure-theme" class="compact-label">
                                                <span>🗺️ Adventure Theme *</span>
                                            </label>
                                            <select id="adventure-theme" class="paper-select" required>
                                                <option value="">Choose your adventure...</option>
                                                <option value="wild-west">🤠 Wild West Frontier</option>
                                                <option value="underwater">🌊 Underwater Kingdom</option>
                                                <option value="sky">☁️ Sky Cities</option>
                                                <option value="jungle">🌴 Jungle Exploration</option>
                                            </select>
                                        </div>
                                        <div class="input-group">
                                            <label for="adventure-special-skill" class="compact-label">
                                                <span>⚡ Your Special Skill</span>
                                            </label>
                                            <input type="text" id="adventure-special-skill" class="paper-input" placeholder="e.g., super speed, talking to animals, magic spells...">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="age-selection-compact">
                                    <label for="adventure-story-age" class="compact-label">
                                        <span>Story Length:</span>
                                    </label>
                                    <select id="adventure-story-age" class="paper-select">
                                        <option value="6" selected>🧒 Young Adventurers (6-8 years, ~500 words)</option>
                                        <option value="9">🧒 Brave Explorers (8-12 years, ~1000 words)</option>
                                        <option value="12">🧑 Epic Heroes (12+ years, ~2000 words)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="forge-section">
                                <button type="submit" class="forge-btn-centered">
                                    <span class="btn-text">⚔️ Start My Adventure! ⚔️</span>
                                    <div class="btn-sparkles">
                                        <span>🌟</span>
                                        <span>⚡</span>
                                        <span>🌟</span>
                                    </div>
                                </button>
                            </div>
                        </form>
                    </div>
                `;

            case 'dream-job':
                return `
                    <div class="mode-header-compact">
                        <button class="back-to-modes-btn" onclick="backToModeSelection()">
                            ← Back to Modes
                        </button>
                        <div class="mode-info">
                            <h2 class="mode-title-compact">
                                <span class="mode-icon">🔮</span>
                                <span>Dream Job Detective</span>
                            </h2>
                        </div>
                        
                        <div class="instructions-section">
                            <div class="instructions-content">
                                <div class="instruction-point">
                                    <span class="instruction-icon">🔮</span>
                                    <span><strong>Discover your future!</strong> Take our fun personality quiz to find your perfect career match.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">🎯</span>
                                    <span><strong>AI-powered matching:</strong> Our smart system analyzes your interests and suggests exciting jobs.</span>
                                </div>
                                <div class="instruction-point">
                                    <span class="instruction-icon">📖</span>
                                    <span><strong>Story time:</strong> Hear an inspiring story about your future career adventures!</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="story-form-container">
                        <form id="dream-job-form" class="story-form">
                            <div class="unified-story-group paper-scrap">
                                <h3 class="section-title">
                                    <span class="section-icon">🔮</span>
                                    <span>Career Discovery Quiz</span>
                                </h3>
                                
                                <div class="story-elements">
                                    <div class="input-grid">
                                        <div class="input-group">
                                            <label for="dream-child-name" class="compact-label">
                                                <span>🌟 Your Name *</span>
                                            </label>
                                            <input type="text" id="dream-child-name" class="paper-input" placeholder="Enter your name..." required>
                                        </div>
                                        <div class="input-group">
                                            <label for="dream-favorite-subject" class="compact-label">
                                                <span>📚 Favorite Subject *</span>
                                            </label>
                                            <select id="dream-favorite-subject" class="paper-select" required>
                                                <option value="">Choose your favorite...</option>
                                                <option value="science">🔬 Science</option>
                                                <option value="art">🎨 Art</option>
                                                <option value="technology">💻 Technology</option>
                                                <option value="nature">🌿 Nature</option>
                                                <option value="music">🎵 Music</option>
                                                <option value="storytelling">📖 Reading & Writing</option>
                                                <option value="math">🧮 Math</option>
                                                <option value="cooking">👨‍🍳 Cooking</option>
                                                <option value="geography">🗺️ Geography</option>
                                            </select>
                                        </div>
                                        <div class="input-group">
                                            <label for="dream-activity" class="compact-label">
                                                <span>⚡ Dream Activity *</span>
                                            </label>
                                            <select id="dream-activity" class="paper-select" required>
                                                <option value="">What do you love to do?</option>
                                                <option value="creating">🎨 Creating & Making Things</option>
                                                <option value="exploring">🔍 Exploring & Discovering</option>
                                                <option value="building">🏗️ Building & Engineering</option>
                                                <option value="performing">🎭 Performing & Entertaining</option>
                                                <option value="solving">🧩 Solving Problems</option>
                                                <option value="teaching">👩‍🏫 Teaching & Helping Others</option>
                                                <option value="cooking">👨‍🍳 Cooking & Food</option>
                                                <option value="traveling">✈️ Traveling & Adventure</option>
                                            </select>
                                        </div>
                                        <div class="input-group">
                                            <label for="dream-work-environment" class="compact-label">
                                                <span>🏢 Work Environment</span>
                                            </label>
                                            <select id="dream-work-environment" class="paper-select">
                                                <option value="">Where do you like to be?</option>
                                                <option value="outdoors">🌲 Outdoors in Nature</option>
                                                <option value="indoors">🏢 Indoors & Cozy</option>
                                                <option value="teams">👥 Working with Teams</option>
                                                <option value="quiet">🤫 Quiet & Peaceful</option>
                                                <option value="labs">🧪 Labs & Workshops</option>
                                                <option value="creative">🎨 Creative Studios</option>
                                            </select>
                                        </div>
                                        <div class="input-group">
                                            <label for="dream-helping-style" class="compact-label">
                                                <span>💝 How You Like to Help</span>
                                            </label>
                                            <select id="dream-helping-style" class="paper-select">
                                                <option value="">How do you help others?</option>
                                                <option value="inspiring">✨ Inspiring & Motivating</option>
                                                <option value="protecting">🛡️ Protecting & Saving</option>
                                                <option value="teaching">📖 Teaching & Educating</option>
                                                <option value="creating">🎨 Creating Beautiful Things</option>
                                                <option value="solving">🔧 Solving Problems</option>
                                                <option value="entertaining">🎪 Entertaining & Fun</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="age-selection-compact">
                                    <label for="dream-story-age" class="compact-label">
                                        <span>Story Length:</span>
                                    </label>
                                    <select id="dream-story-age" class="paper-select">
                                        <option value="9" selected>🧒 Future Dreamers (9-12 years, ~800 words)</option>
                                        <option value="12">🧑 Career Explorers (12+ years, ~1200 words)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="forge-section">
                                <button type="submit" class="forge-btn-centered">
                                    <span class="btn-text">🔮 Discover My Dream Job! 🔮</span>
                                    <div class="btn-sparkles">
                                        <span>💼</span>
                                        <span>✨</span>
                                        <span>💼</span>
                                    </div>
                                </button>
                            </div>
                        </form>
                    </div>
                `;

            default:
                return `
                    <div class="mode-header paper-scrap">
                        <button class="back-to-modes-btn" onclick="backToModeSelection()">
                            ← Back to Modes
                        </button>
                        <h2 class="mode-title-header">
                            <span class="mode-icon">🚧</span>
                            <span>${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode</span>
                        </h2>
                    </div>
                    
                    <div class="coming-soon paper-scrap">
                        <h3>Coming Soon!</h3>
                        <p>This story mode is currently under development. Please check back soon for exciting new features!</p>
                        <div class="coming-soon-doodles">
                            <span>🚀</span>
                            <span>⚡</span>
                            <span>✨</span>
                        </div>
                    </div>
                `;
        }
    };
    
    const setupModeEventListeners = (mode) => {
        // Mode-specific event listener setup
        console.log(`Setting up event listeners for ${mode} mode`);
        
        // Make backToModeSelection globally available
        window.backToModeSelection = backToModeSelection;
        
        switch (mode) {
            case 'classic':
                setupClassicModeListeners();
                break;
            case 'wanted-poster':
                setupWantedPosterModeListeners();
                break;
            case 'homework-forge':
                setupHomeworkForgeModeListeners();
                break;
            case 'sleep-forge':
                setupSleepForgeModeListeners();
                break;
            case 'monster-maker':
                setupMonsterMakerModeListeners();
                break;
            case 'adventure-me':
                setupAdventureMeModeListeners();
                break;
            case 'dream-job':
                setupDreamJobModeListeners();
                break;
            // Additional modes will be added here
        }
    };
    
    const setupClassicModeListeners = () => {
        const classicForm = document.getElementById('classic-story-form');
        const classicSurpriseBtn = document.getElementById('classic-surprise-me-btn');
        const classicImageInput = document.getElementById('classic-heroImage');
        const classicImageUploadArea = document.getElementById('classic-image-upload-area');
        const classicImagePreview = document.getElementById('classic-image-preview');
        const classicSceneInput = document.getElementById('classic-sceneImage');
        const classicSceneUploadArea = document.getElementById('classic-scene-upload-area');
        const classicScenePreview = document.getElementById('classic-scene-preview');
        
        // Form submission
        if (classicForm) {
            classicForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await generateClassicStory(false); // false = not surprise mode
            });
        }
        
        // Surprise Me button
        if (classicSurpriseBtn) {
            classicSurpriseBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await generateClassicStory(true); // true = surprise mode
            });
        }
        
        // Character image upload handling
        if (classicImageInput && classicImagePreview) {
            classicImageInput.addEventListener('change', (e) => {
                handleImageUpload(e, classicImagePreview, 'character');
            });
        }
        
        // Scene image upload handling
        if (classicSceneInput && classicScenePreview) {
            classicSceneInput.addEventListener('change', (e) => {
                handleImageUpload(e, classicScenePreview, 'scene');
            });
        }
        
        // Drag and drop for image upload
        if (classicImageUploadArea) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                classicImageUploadArea.addEventListener(eventName, preventDefaults, false);
            });
            
            ['dragenter', 'dragover'].forEach(eventName => {
                classicImageUploadArea.addEventListener(eventName, () => {
                    classicImageUploadArea.classList.add('drag-over');
                }, false);
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                classicImageUploadArea.addEventListener(eventName, () => {
                    classicImageUploadArea.classList.remove('drag-over');
                }, false);
            });
            
            classicImageUploadArea.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    classicImageInput.files = files;
                    handleImageUpload({ target: { files: files } }, classicImagePreview, 'character');
                }
            }, false);
        }
        
        // Drag and drop for scene image upload
        if (classicSceneUploadArea) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                classicSceneUploadArea.addEventListener(eventName, preventDefaults, false);
            });
            
            ['dragenter', 'dragover'].forEach(eventName => {
                classicSceneUploadArea.addEventListener(eventName, () => {
                    classicSceneUploadArea.classList.add('drag-over');
                }, false);
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                classicSceneUploadArea.addEventListener(eventName, () => {
                    classicSceneUploadArea.classList.remove('drag-over');
                }, false);
            });
            
            classicSceneUploadArea.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    classicSceneInput.files = files;
                    handleImageUpload({ target: { files: files } }, classicScenePreview, 'scene');
                }
            }, false);
        }
    };
    
    // Setup functions for new modes
    const setupWantedPosterModeListeners = () => {
        const wantedForm = document.getElementById('wanted-poster-form');
        const wantedImageInput = document.getElementById('wanted-image');
        const wantedImagePreview = document.getElementById('wanted-image-preview');
        const uploadChoice = document.getElementById('upload-choice');
        const generateChoice = document.getElementById('generate-choice');
        const uploadSection = document.getElementById('upload-section');
        const generateSection = document.getElementById('generate-section');
        
        // Form submission
        if (wantedForm) {
            wantedForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await generateWantedPoster();
            });
        }
        
        // Image choice toggle
        if (uploadChoice && generateChoice) {
            uploadChoice.addEventListener('change', () => {
                if (uploadChoice.checked) {
                    uploadSection?.classList.remove('hidden');
                    generateSection?.classList.add('hidden');
                }
            });
            
            generateChoice.addEventListener('change', () => {
                if (generateChoice.checked) {
                    uploadSection?.classList.add('hidden');
                    generateSection?.classList.remove('hidden');
                }
            });
        }
        
        // Image upload handling
        if (wantedImageInput && wantedImagePreview) {
            wantedImageInput.addEventListener('change', (e) => {
                handleImageUpload(e, wantedImagePreview, 'wanted');
            });
        }
    };
    
    const setupHomeworkForgeModeListeners = () => {
        const homeworkForm = document.getElementById('homework-forge-form');
        const homeworkFilesInput = document.getElementById('homework-files');
        const homeworkFilesPreview = document.getElementById('homework-files-preview');
        const uploadChoice = document.getElementById('homework-upload-choice');
        const topicChoice = document.getElementById('homework-topic-choice');
        const uploadSection = document.getElementById('homework-upload-section');
        const topicSection = document.getElementById('homework-topic-section');
        
        // Form submission
        if (homeworkForm) {
            homeworkForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await generateHomeworkForge();
            });
        }
        
        // Choice toggle
        if (uploadChoice && topicChoice) {
            uploadChoice.addEventListener('change', () => {
                if (uploadChoice.checked) {
                    uploadSection?.classList.remove('hidden');
                    topicSection?.classList.add('hidden');
                }
            });
            
            topicChoice.addEventListener('change', () => {
                if (topicChoice.checked) {
                    uploadSection?.classList.add('hidden');
                    topicSection?.classList.remove('hidden');
                }
            });
        }
        
        // File upload handling (multiple files)
        if (homeworkFilesInput && homeworkFilesPreview) {
            homeworkFilesInput.addEventListener('change', (e) => {
                handleMultipleFileUpload(e, homeworkFilesPreview);
            });
        }
    };
    
    const setupSleepForgeModeListeners = () => {
        const sleepForm = document.getElementById('sleep-forge-form');
        const sleepSurpriseBtn = document.getElementById('sleep-surprise-me-btn');
        const sleepImageInput = document.getElementById('sleep-heroImage');
        const sleepImagePreview = document.getElementById('sleep-image-preview');
        
        // Form submission
        if (sleepForm) {
            sleepForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await generateSleepForge(false);
            });
        }
        
        // Surprise Me button
        if (sleepSurpriseBtn) {
            sleepSurpriseBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await generateSleepForge(true);
            });
        }
        
        // Image upload handling
        if (sleepImageInput && sleepImagePreview) {
            sleepImageInput.addEventListener('change', (e) => {
                handleImageUpload(e, sleepImagePreview, 'sleep');
            });
        }
    };
    
    const setupMonsterMakerModeListeners = () => {
        const monsterForm = document.getElementById('monster-maker-form');
        const monsterLocationInput = document.getElementById('monster-location');
        const monsterLocationPreview = document.getElementById('monster-location-preview');
        
        // Form submission
        if (monsterForm) {
            monsterForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await generateMonsterMaker();
            });
        }
        
        // Location image upload handling
        if (monsterLocationInput && monsterLocationPreview) {
            monsterLocationInput.addEventListener('change', (e) => {
                handleImageUpload(e, monsterLocationPreview, 'location');
            });
        }
    };
    
    const setupAdventureMeModeListeners = () => {
        const adventureForm = document.getElementById('adventure-me-form');
        
        console.log('⚔️ Setting up Adventure Me mode listeners...');
        
        // Form submission
        if (adventureForm) {
            adventureForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await generateAdventureMe();
            });
        }
    };
    
    const setupDreamJobModeListeners = () => {
        const dreamJobForm = document.getElementById('dream-job-form');
        
        console.log('🔮 Setting up Dream Job Detective mode listeners...');
        
        // Form submission
        if (dreamJobForm) {
            dreamJobForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await generateDreamJob();
            });
        }
    };
    
    // Helper functions for image upload
    const preventDefaults = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };
    
    // Image compression function to reduce payload size for Vercel
    const compressImage = (file, maxWidth = 800, quality = 0.8) => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Calculate new dimensions while maintaining aspect ratio
                let { width, height } = img;
                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxWidth) {
                        width = (width * maxWidth) / height;
                        height = maxWidth;
                    }
                }
                
                // Set canvas size and draw compressed image
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to base64 with compression
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedBase64);
            };
            
            img.src = URL.createObjectURL(file);
        });
    };
    
    // Helper function for multiple file upload (Homework Forge)
    const handleMultipleFileUpload = async (e, previewElement) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        console.log('📁 Processing', files.length, 'homework files...');
        
        // Clear previous preview
        previewElement.innerHTML = '';
        
        try {
            for (let i = 0; i < Math.min(files.length, 5); i++) { // Limit to 5 files
                const file = files[i];
                if (!file.type.startsWith('image/') && !file.type.includes('pdf')) {
                    continue;
                }
                
                const filePreview = document.createElement('div');
                filePreview.className = 'file-preview-item';
                
                if (file.type.startsWith('image/')) {
                    const compressedBase64 = await compressImage(file, 400, 0.6);
                    filePreview.innerHTML = `
                        <div class="file-thumbnail">
                            <img src="${compressedBase64}" alt="${file.name}" class="homework-file-thumb">
                        </div>
                        <div class="file-info">
                            <div class="file-name">${file.name}</div>
                            <div class="file-size">${Math.round(file.size / 1024)}KB</div>
                        </div>
                    `;
                } else {
                    filePreview.innerHTML = `
                        <div class="file-thumbnail">
                            <span class="file-icon">📄</span>
                        </div>
                        <div class="file-info">
                            <div class="file-name">${file.name}</div>
                            <div class="file-size">${Math.round(file.size / 1024)}KB</div>
                        </div>
                    `;
                }
                
                previewElement.appendChild(filePreview);
            }
            
            if (files.length > 5) {
                const warning = document.createElement('div');
                warning.className = 'upload-warning';
                warning.textContent = `⚠️ Only first 5 files will be processed`;
                previewElement.appendChild(warning);
            }
        } catch (error) {
            console.error('❌ Multiple file processing failed:', error);
            previewElement.innerHTML = `
                <div class="upload-error">
                    <span class="error-icon">❌</span>
                    <span class="error-text">Failed to process files. Please try smaller files.</span>
                </div>
            `;
        }
    };
    
    const handleImageUpload = async (e, previewElement, imageType = 'character') => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            try {
                // Show processing state
                const processingText = imageType === 'scene' ? 'Processing scene...' : 'Processing character...';
                previewElement.innerHTML = `
                    <div class="image-preview-content">
                        <div class="preview-loading">
                            <span class="loading-icon">⏳</span>
                            <span class="loading-text">${processingText}</span>
                        </div>
                    </div>
                `;
                previewElement.classList.remove('hidden');
                
                // Compress image to ensure it fits within Vercel limits
                const compressedBase64 = await compressImage(file, 600, 0.7); // More aggressive compression
                
                // Calculate compression stats
                const originalSize = file.size;
                const compressedSize = Math.round(compressedBase64.length * 0.75); // Rough base64 to bytes
                const reduction = Math.round((1 - compressedSize / originalSize) * 100);
                
                const altText = imageType === 'scene' ? 'Uploaded scene' : 'Uploaded character';
                const successText = imageType === 'scene' ? 'Scene ready!' : 'Character ready!';
                
                // Create success preview
                previewElement.innerHTML = `
                    <div class="image-preview-content">
                        <div class="preview-image">
                            <img src="${compressedBase64}" alt="${altText}" class="uploaded-image">
                        </div>
                        <div class="preview-success">
                            <span class="success-icon">✅</span>
                            <span class="success-text">${successText} (${reduction > 0 ? reduction + '% smaller' : 'optimized'})</span>
                        </div>
                        <div class="preview-filename">${file.name}</div>
                    </div>
                `;
                
                // Store compressed base64 data
                if (imageType === 'scene') {
                    sceneImageBase64 = compressedBase64;
                    console.log('🖼️ Scene image compressed and ready:', {
                        original: Math.round(originalSize / 1024) + 'KB',
                        compressed: Math.round(compressedSize / 1024) + 'KB',
                        reduction: reduction + '%'
                    });
                } else if (imageType === 'location') {
                    monsterLocationImageBase64 = compressedBase64;
                    console.log('🖼️ Monster location image compressed and ready:', {
                        original: Math.round(originalSize / 1024) + 'KB',
                        compressed: Math.round(compressedSize / 1024) + 'KB',
                        reduction: reduction + '%'
                    });
                } else {
                    heroImageBase64 = compressedBase64;
                    console.log('🖼️ Character image compressed and ready:', {
                        original: Math.round(originalSize / 1024) + 'KB',
                        compressed: Math.round(compressedSize / 1024) + 'KB',
                        reduction: reduction + '%'
                    });
                }
            } catch (error) {
                console.error('❌ Image processing failed:', error);
                previewElement.innerHTML = `
                    <div class="image-preview-content">
                        <div class="preview-error">
                            <span class="error-icon">❌</span>
                            <span class="error-text">Failed to process image. Please try a smaller file.</span>
                        </div>
                    </div>
                `;
            }
        } else {
            console.warn('⚠️ Invalid file type. Please upload an image.');
        }
    };
    
    // Story generation functions for new modes
    const generateWantedPoster = async () => {
        console.log('Generating wanted poster story...');
        
        // Get form data
        const name = document.getElementById('wanted-name')?.value?.trim() || '';
        const wantedFor = document.getElementById('wanted-for')?.value?.trim() || '';
        const skills = document.getElementById('wanted-skills')?.value?.trim() || '';
        const reward = document.getElementById('wanted-reward')?.value?.trim() || '';
        const useAI = document.getElementById('generate-choice')?.checked || false;
        
        // Validate required fields
        if (!name || !wantedFor) {
            showAlert('Please fill in the outlaw\'s name and what they\'re wanted for!');
            return;
        }
        
        // Show progress modal
        showProgressModal();
        updateProgressStage(1, 'active', 'Gathering sheriff\'s reports...');
        
        try {
            const formData = {
                mode: 'wanted-poster',
                name: name,
                wantedFor: wantedFor,
                skills: skills,
                reward: reward,
                useAI: useAI,
                heroImage: heroImageBase64,
                age: '6' // Default age for wanted poster stories
            };
            
            updateProgressStage(1, 'completed');
            updateProgressStage(2, 'active', useAI ? 'Generating outlaw portrait with AI...' : 'Creating wanted poster...');
            
            // Call the API
            const response = await fetch('/api/generate-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Handle successful response with detailed progress
            updateProgressStage(2, 'completed');
            updateProgressStage(3, 'active', 'Writing Wild West adventure story...');
            setTimeout(() => {
                updateProgressStage(3, 'completed');
                updateProgressStage(4, 'active', 'Recording cowboy narration...');
                setTimeout(() => {
                    updateProgressStage(4, 'completed');
                    updateProgressStage(5, 'active', 'Sending to Yoto device...');
                    setTimeout(() => {
                        updateProgressStage(5, 'completed');
                        displayStoryResults(data, 'wanted-poster');
                        hideProgressModal();
                    }, 500);
                }, 500);
            }, 500);
            
        } catch (error) {
            console.error('Error generating wanted poster:', error);
            hideProgressModal();
            showAlert('Failed to create wanted poster: ' + error.message);
        }
    };
    
    const generateHomeworkForge = async () => {
        console.log('Generating homework summary...');
        
        const isUploadMode = document.getElementById('homework-upload-choice')?.checked;
        let formData;
        
        if (isUploadMode) {
            const filesInput = document.getElementById('homework-files');
            if (!filesInput?.files || filesInput.files.length === 0) {
                showAlert('Please upload at least one homework file or document!');
                return;
            }
            
            // Process uploaded files
            const files = Array.from(filesInput.files).slice(0, 5);
            const fileData = [];
            
            for (const file of files) {
                if (file.type.startsWith('image/')) {
                    const compressedBase64 = await compressImage(file, 800, 0.7);
                    fileData.push({
                        type: 'image',
                        data: compressedBase64,
                        name: file.name
                    });
                }
            }
            
            formData = {
                mode: 'homework-forge',
                type: 'upload',
                files: fileData,
                age: document.getElementById('homework-age')?.value || '6'
            };
        } else {
            const subject = document.getElementById('homework-subject')?.value?.trim() || '';
            const topic = document.getElementById('homework-topic')?.value?.trim() || '';
            
            if (!topic) {
                showAlert('Please enter a topic to learn about!');
                return;
            }
            
            formData = {
                mode: 'homework-forge',
                type: 'topic',
                subject: subject,
                topic: topic,
                age: document.getElementById('homework-age')?.value || '6'
            };
        }
        
        // Show progress modal
        showProgressModal();
        updateProgressStage(1, 'active', 'Analyzing your homework...');
        
        try {
            updateProgressStage(2, 'active', 'Creating fun summary...');
            
            // Call the API
            const response = await fetch('/api/generate-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Handle successful response
            updateProgressStage(5, 'completed');
            displayStoryResults(data, 'homework-forge');
            hideProgressModal();
            
        } catch (error) {
            console.error('Error generating homework summary:', error);
            hideProgressModal();
            showAlert('Failed to create learning summary: ' + error.message);
        }
    };
    
    const generateSleepForge = async (isSurpriseMode) => {
        console.log('Generating bedtime story, surprise mode:', isSurpriseMode);
        
        // Show progress modal
        showProgressModal();
        updateProgressStage(1, 'active', 'Gathering sleepy magic...');
        
        try {
            const formData = {
                mode: 'sleep-forge',
                heroName: document.getElementById('sleep-heroName')?.value?.trim() || '',
                promptSetup: document.getElementById('sleep-promptSetup')?.value?.trim() || '',
                promptRising: document.getElementById('sleep-promptRising')?.value?.trim() || '',
                promptClimax: document.getElementById('sleep-promptClimax')?.value?.trim() || '',
                age: document.getElementById('sleep-story-age')?.value || '3',
                surpriseMode: isSurpriseMode,
                heroImage: heroImageBase64
            };
            
            // Validate required fields for non-surprise mode
            if (!isSurpriseMode) {
                const hasAtLeastOneElement = 
                    formData.heroName || formData.promptSetup || 
                    formData.promptRising || formData.promptClimax;
                
                if (!hasAtLeastOneElement) {
                    showAlert('Please fill in at least one story element for your bedtime tale! 🌙');
                    return;
                }
            }
            
            updateProgressStage(2, 'active', 'Weaving peaceful dreams...');
            
            // Call the API
            const response = await fetch('/api/generate-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Handle successful response
            updateProgressStage(5, 'completed');
            displayStoryResults(data, 'sleep-forge');
            hideProgressModal();
            
        } catch (error) {
            console.error('Error generating sleep story:', error);
            hideProgressModal();
            showAlert('Failed to create bedtime story: ' + error.message);
        }
    };
    
    const generateMonsterMaker = async () => {
        console.log('Generating monster story...');
        
        const description1 = document.getElementById('monster-description1')?.value?.trim() || '';
        const description2 = document.getElementById('monster-description2')?.value?.trim() || '';
        const description3 = document.getElementById('monster-description3')?.value?.trim() || '';
        
        if (!description1) {
            showAlert('Please describe your monster!');
            return;
        }
        
        // Show progress modal
        showProgressModal();
        updateProgressStage(1, 'active', 'Summoning your monster...');
        
        try {
            const formData = {
                mode: 'monster-maker',
                description1: description1,
                description2: description2,
                description3: description3,
                locationImage: monsterLocationImageBase64, // Use monsterLocationImageBase64 for location
                age: document.getElementById('monster-story-age')?.value || '6'
            };
            
            updateProgressStage(2, 'active', 'Creating monster image...');
            
            // Call the API
            const response = await fetch('/api/generate-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Handle successful response
            updateProgressStage(5, 'completed');
            displayStoryResults(data, 'monster-maker');
            hideProgressModal();
            
        } catch (error) {
            console.error('Error generating monster:', error);
            hideProgressModal();
            showAlert('Failed to create monster: ' + error.message);
        }
    };
    
    // Generate Adventure Me story
    const generateAdventureMe = async () => {
        console.log('⚔️ Generating Adventure Me story...');
        
        const childName = document.getElementById('adventure-child-name')?.value?.trim() || '';
        const theme = document.getElementById('adventure-theme')?.value || '';
        const specialSkill = document.getElementById('adventure-special-skill')?.value?.trim() || '';
        const age = document.getElementById('adventure-story-age')?.value || '6';
        
        if (!childName || !theme) {
            showAlert('Please enter your name and choose an adventure theme!');
            return;
        }
        
        // Show progress modal
        showProgressModal();
        updateProgressStage(1, 'active', 'Preparing your epic adventure...');
        
        try {
            const formData = {
                mode: 'adventure-me',
                childName: childName,
                theme: theme,
                specialSkill: specialSkill,
                age: age
            };
            
            updateProgressStage(3, 'active', 'Crafting your personalized adventure story...');
            
            // Call the API
            const response = await fetch('/api/generate-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Handle successful response
            updateProgressStage(5, 'completed');
            displayStoryResults(data, 'adventure-me');
            hideProgressModal();
            
            console.log('✨ Adventure Me story generated successfully!');
            
        } catch (error) {
            console.error('Error generating Adventure Me story:', error);
            hideProgressModal();
            showAlert('Failed to create your adventure: ' + error.message);
        }
    };
    
    // Generate Dream Job Detective story
    const generateDreamJob = async () => {
        console.log('🔮 Generating Dream Job Detective story...');
        
        const childName = document.getElementById('dream-child-name')?.value?.trim() || '';
        const favoriteSubject = document.getElementById('dream-favorite-subject')?.value || '';
        const dreamActivity = document.getElementById('dream-activity')?.value || '';
        const workEnvironment = document.getElementById('dream-work-environment')?.value || '';
        const helpingStyle = document.getElementById('dream-helping-style')?.value || '';
        const age = document.getElementById('dream-story-age')?.value || '9';
        
        if (!childName || !favoriteSubject || !dreamActivity) {
            showAlert('Please enter your name and answer at least the first two quiz questions!');
            return;
        }
        
        // Show progress modal
        showProgressModal();
        updateProgressStage(1, 'active', 'Analyzing your personality and interests...');
        
        try {
            const formData = {
                mode: 'dream-job',
                childName: childName,
                favoriteSubject: favoriteSubject,
                dreamActivity: dreamActivity,
                workEnvironment: workEnvironment,
                helpingStyle: helpingStyle,
                age: age
            };
            
            updateProgressStage(2, 'active', 'Matching you with the perfect career...');
            updateProgressStage(3, 'active', 'Creating your inspirational career story...');
            
            // Call the API
            const response = await fetch('/api/generate-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Handle successful response
            updateProgressStage(5, 'completed');
            displayStoryResults(data, 'dream-job');
            
            // Show job match results
            if (data.dreamJob) {
                showJobMatchResults(data.dreamJob, data.allMatches);
            }
            
            hideProgressModal();
            
            console.log('🎆 Dream Job Detective story generated successfully!');
            
        } catch (error) {
            console.error('Error generating Dream Job story:', error);
            hideProgressModal();
            showAlert('Failed to discover your dream job: ' + error.message);
        }
    };
    
    // Helper function to show job match results
    const showJobMatchResults = (topJob, allMatches) => {
        const storyOutput = document.getElementById('story-output');
        if (storyOutput && topJob) {
            const jobResults = document.createElement('div');
            jobResults.className = 'job-results paper-scrap';
            jobResults.innerHTML = `
                <div class="job-header">
                    <span class="job-icon">🎯</span>
                    <span class="job-text">Your Perfect Career Match!</span>
                    <span class="job-icon">✨</span>
                </div>
                <div class="top-job">
                    <h3 class="job-title">🎆 ${topJob.title}</h3>
                    <p class="job-description">${topJob.description}</p>
                </div>
                <div class="other-matches">
                    <h4>Other Great Matches:</h4>
                    <div class="match-list">
                        ${allMatches.slice(1, 3).map(job => `
                            <div class="match-item">
                                <span class="match-title">🎼 ${job.title}</span>
                                <span class="match-desc">${job.description}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            storyOutput.appendChild(jobResults);
        }
    };
    
    // Helper function to display story results
    const displayStoryResults = (data, mode) => {
        const storyOutput = document.getElementById('story-output');
        const storyText = document.getElementById('story-text');
        
        if (storyOutput) storyOutput.classList.remove('hidden');
        
        if (data.story && storyText) {
            storyText.textContent = data.story;
        }
        
        // Handle audio if available
        const audioPlayer = document.getElementById('story-audio-player');
        if (data.audio && audioPlayer) {
            try {
                const audioBlob = b64toBlob(data.audio, 'audio/mpeg');
                const audioBlobUrl = URL.createObjectURL(audioBlob);
                audioPlayer.src = audioBlobUrl;
                audioPlayer.classList.remove('hidden');
                audioPlayer.style.display = 'block';
                console.log('🎵 Audio player setup for', mode, 'mode');
            } catch (audioError) {
                console.error('❌ Error setting up audio player:', audioError);
            }
        }
        
        // Handle mode-specific results
        if (mode === 'wanted-poster') {
            if (data.posterImage) {
                // Show wanted poster download button
                showDownloadButton(data.posterImage, 'wanted-poster.png');
            } else {
                // Show message that poster generation failed but story succeeded
                const storyOutput = document.getElementById('story-output');
                if (storyOutput) {
                    const posterNote = document.createElement('div');
                    posterNote.className = 'poster-note paper-scrap';
                    posterNote.innerHTML = `
                        <div class="note-header">
                            <span class="note-icon">🤠</span>
                            <span class="note-text">Poster Generation Update</span>
                        </div>
                        <p>Your Wild West story was created successfully! The wanted poster image is being worked on - this feature is still in development. You can still enjoy your cowboy adventure audio story!</p>
                    `;
                    storyOutput.appendChild(posterNote);
                }
            }
        } else if (mode === 'monster-maker') {
            if (data.monsterImage) {
                // Show monster image download button
                showDownloadButton(data.monsterImage, 'my-monster.png');
            } else {
                // Show message that monster generation failed but story succeeded
                const storyOutput = document.getElementById('story-output');
                if (storyOutput) {
                    const monsterNote = document.createElement('div');
                    monsterNote.className = 'monster-note paper-scrap';
                    monsterNote.innerHTML = `
                        <div class="note-header">
                            <span class="note-icon">👹</span>
                            <span class="note-text">Monster Image Update</span>
                        </div>
                        <p>Your monster story was created successfully! The monster image generation is being worked on - this feature is still in development. You can still enjoy your creature adventure audio story!</p>
                    `;
                    storyOutput.appendChild(monsterNote);
                }
            }
        }
        
        // Auto-upload to Yoto if authenticated
        if (accessToken) {
            console.log('🚀 Auto-uploading', mode, 'to Yoto...');
            createOrUpdateStoryForgePlaylist({
                ...data,
                mode: mode
            }, accessToken)
                .then(() => {
                    console.log('✅ Auto-uploaded to Yoto successfully!');
                    let successMessage;
                    switch(mode) {
                        case 'wanted-poster':
                            successMessage = 'Your Wild Wild West Adventure has been sent to your Yoto device! See your poster below! 🤠';
                            break;
                        case 'homework-forge':
                            successMessage = 'Your learning summary has been sent to your Yoto device! 📚';
                            break;
                        case 'sleep-forge':
                            successMessage = 'Your bedtime story has been sent to your Yoto device! Sweet dreams! 🌙';
                            break;
                        case 'monster-maker':
                            successMessage = 'Your monster adventure has been sent to your Yoto device! See your creature below! 👹';
                            break;
                        default:
                            successMessage = `${getModeDisplayName(mode)} created and uploaded to Yoto! 🎧`;
                    }
                    showAlert(successMessage);
                })
                .catch((yotoError) => {
                    console.error('❌ Auto-upload to Yoto failed:', yotoError);
                    showAlert(`${getModeDisplayName(mode)} created successfully! Yoto upload failed - you can retry manually.`);
                });
        }
    };
    
    // Helper function to get display name for mode
    const getModeDisplayName = (mode) => {
        const names = {
            'wanted-poster': 'Wanted Poster',
            'homework-forge': 'Learning Summary',
            'sleep-forge': 'Bedtime Story',
            'monster-maker': 'Monster Story',
            'adventure-me': 'Adventure Story',
            'dream-job': 'Career Story'
        };
        return names[mode] || 'Story';
    };
    
    // Helper function to show download button
    const showDownloadButton = (imageBase64, filename) => {
        // Create download button in the story output area
        const storyOutput = document.getElementById('story-output');
        if (storyOutput && imageBase64) {
            // Remove any existing download section first
            const existingDownload = storyOutput.querySelector('.download-section');
            if (existingDownload) {
                existingDownload.remove();
            }
            
            const downloadSection = document.createElement('div');
            downloadSection.className = 'download-section paper-scrap';
            
            const buttonId = `download-image-btn-${Date.now()}`;
            downloadSection.innerHTML = `
                <div class="download-header">
                    <span class="download-icon">📎</span>
                    <span class="download-text">Download Your Creation</span>
                    <span class="download-icon">⭐</span>
                </div>
                <button id="${buttonId}" class="download-btn">
                    <span class="btn-icon">📄</span>
                    <span class="btn-text">Download ${filename}</span>
                </button>
                <div class="download-preview">
                    <img src="${imageBase64}" alt="Generated image preview" style="max-width: 200px; max-height: 200px; border-radius: 8px; margin-top: 10px;">
                </div>
            `;
            
            storyOutput.appendChild(downloadSection);
            
            // Add download functionality with unique ID
            const downloadBtn = document.getElementById(buttonId);
            if (downloadBtn) {
                downloadBtn.onclick = () => {
                    try {
                        const link = document.createElement('a');
                        link.href = imageBase64;
                        link.download = filename;
                        link.style.display = 'none';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        // Show success feedback
                        downloadBtn.innerHTML = '<span class="btn-icon">✅</span><span class="btn-text">Downloaded!</span>';
                        setTimeout(() => {
                            downloadBtn.innerHTML = `<span class="btn-icon">📄</span><span class="btn-text">Download ${filename}</span>`;
                        }, 2000);
                    } catch (error) {
                        console.error('Download failed:', error);
                        showAlert('Download failed. Please try again.');
                    }
                };
            }
        }
    };
    
    // Progress modal management functions
    const showProgressModal = () => {
        const progressModal = document.getElementById('story-progress-modal');
        if (progressModal) {
            progressModal.classList.remove('hidden');
            // Reset all stages
            for (let i = 1; i <= 5; i++) {
                const stage = document.getElementById(`stage-${i}`);
                if (stage) {
                    stage.classList.remove('active', 'completed');
                    stage.querySelector('.stage-spinner')?.classList.add('hidden');
                    stage.querySelector('.stage-check')?.classList.add('hidden');
                }
            }
            updateProgressBar(0);
        }
    };
    
    const hideProgressModal = () => {
        const progressModal = document.getElementById('story-progress-modal');
        if (progressModal) {
            setTimeout(() => {
                progressModal.classList.add('hidden');
            }, 2000); // Give time to see completion
        }
    };
    
    const updateProgressStage = (stageNum, status, text = '') => {
        const stage = document.getElementById(`stage-${stageNum}`);
        if (!stage) return;
        
        const spinner = stage.querySelector('.stage-spinner');
        const check = stage.querySelector('.stage-check');
        const progressText = document.getElementById('progress-text');
        
        // Reset stage classes
        stage.classList.remove('active', 'completed');
        spinner?.classList.add('hidden');
        check?.classList.add('hidden');
        
        if (status === 'active') {
            stage.classList.add('active');
            spinner?.classList.remove('hidden');
            if (progressText && text) progressText.textContent = text;
        } else if (status === 'completed') {
            stage.classList.add('completed');
            check?.classList.remove('hidden');
        }
        
        // Update progress bar
        const progress = (stageNum / 5) * 100;
        updateProgressBar(progress);
    };
    
    const updateProgressBar = (percentage) => {
        const progressBar = document.getElementById('overall-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
    };
    
    // Main story generation function for Classic mode
    const generateClassicStory = async (isSurpriseMode) => {
        console.log(`Generating classic story, surprise mode: ${isSurpriseMode}`);
        
        // Show progress modal instead of old loading spinner
        showProgressModal();
        updateProgressStage(1, 'active', 'Gathering magical ingredients...');
        
        // Hide story output initially
        const storyOutput = document.getElementById('story-output');
        const storyText = document.getElementById('story-text');
        const uploadToYotoButton = document.getElementById('upload-to-yoto-button');
        
        if (storyOutput) storyOutput.classList.add('hidden');
        if (storyText) storyText.textContent = '';
        if (uploadToYotoButton) uploadToYotoButton.classList.add('hidden');
        
        try {
            // First, analyze any uploaded images to get descriptions
            let characterDescription = null;
            let sceneDescription = null;
            
            // Complete stage 1
            updateProgressStage(1, 'completed');
            
            if (heroImageBase64 || sceneImageBase64) {
                // Move to image analysis stage
                updateProgressStage(2, 'active', 'Teaching our dragons to see your artwork...');
                
                console.log('🖼️ Starting image analysis...');
                
                try {
                    // Create payload and check size before sending
                    const payload = {
                        heroImage: heroImageBase64,
                        sceneImage: sceneImageBase64,
                        imageType: 'both'
                    };
                    
                    const payloadSize = JSON.stringify(payload).length;
                    const maxSize = 5 * 1024 * 1024; // 5MB conservative limit
                    
                    console.log('📄 Image analysis payload size:', Math.round(payloadSize / 1024) + 'KB');
                    
                    if (payloadSize > maxSize) {
                        throw new Error(`Images still too large after compression (${Math.round(payloadSize/1024/1024)}MB). Try smaller images.`);
                    }
                    
                    const imageAnalysisResponse = await fetch('/api/upload-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    
                    if (!imageAnalysisResponse.ok) {
                        console.warn('⚠️ Image analysis failed, proceeding without descriptions');
                    } else {
                        const analysisResult = await imageAnalysisResponse.json();
                        characterDescription = analysisResult.characterDescription;
                        sceneDescription = analysisResult.sceneDescription;
                        console.log('✅ Image analysis complete:', {
                            hasCharacterDescription: !!characterDescription,
                            hasSceneDescription: !!sceneDescription
                        });
                    }
                } catch (imageError) {
                    console.warn('⚠️ Image analysis error, proceeding without descriptions:', imageError);
                }
                
                // Complete image analysis stage
                updateProgressStage(2, 'completed');
            } else {
                // Skip image analysis if no images
                updateProgressStage(2, 'completed');
            }
            
            // Move to story creation stage
            updateProgressStage(3, 'active', 'Our storytelling wizards are weaving your tale...');
            
            // Get form data in the format expected by the API (without large image data)
            const formData = {
                heroName: document.getElementById('classic-heroName')?.value.trim() || '',
                promptSetup: document.getElementById('classic-promptSetup')?.value.trim() || '',
                promptRising: document.getElementById('classic-promptRising')?.value.trim() || '',
                promptClimax: document.getElementById('classic-promptClimax')?.value.trim() || '',
                age: document.getElementById('classic-story-age')?.value || '6',
                characterDescription: characterDescription,
                sceneDescription: sceneDescription,
                surpriseMode: isSurpriseMode
            };
            
            // Validate required fields for non-surprise mode
            // User needs at least one story element to generate a story
            if (!isSurpriseMode) {
                const hasAtLeastOneElement = 
                    formData.heroName.trim() || 
                    formData.promptSetup.trim() || 
                    formData.promptRising.trim() || 
                    formData.promptClimax.trim();
                
                if (!hasAtLeastOneElement) {
                    showAlert('Please fill in at least one story element to create your tale! \u2728');
                    return;
                }
            }
            
            console.log('Sending story generation request:', formData);
            
            // Call the existing story generation API
            const response = await fetch('/api/generate-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Basic debug info for troubleshooting if needed
            if (data.debug && data.debug.punctuationAnalysis.storyContainsDot > 0) {
                console.log('⚠️ Story contains', data.debug.punctuationAnalysis.storyContainsDot, 'dot words - may need cleaning');
            }
            
            // Handle the response
            if (loadingSpinner) loadingSpinner.classList.add('hidden');
            
            if (data.story && storyText) {
                storyText.textContent = data.story;
            }
            
            // Handle audio if available
            const audioPlayer = document.getElementById('story-audio-player');
            if (data.audio && audioPlayer) {
                try {
                    console.log('🎵 Processing audio data...');
                    console.log('Audio data length:', data.audio.length);
                    console.log('File size from API:', data.fileSize);
                    
                    // Use improved base64 to blob conversion (from experimental code)
                    const audioBlob = b64toBlob(data.audio, 'audio/mpeg');
                    const audioBlobUrl = URL.createObjectURL(audioBlob);
                    
                    console.log('Created audio blob:', audioBlob.size, 'bytes');
                    console.log('Created blob URL:', audioBlobUrl);
                    
                    audioPlayer.src = audioBlobUrl;
                    
                    // Make sure audio player is visible
                    audioPlayer.classList.remove('hidden');
                    audioPlayer.style.display = 'block';
                    audioPlayer.style.width = '100%';
                    
                    console.log('🎮 Audio player visibility set:', !audioPlayer.classList.contains('hidden'));
                    console.log('🎮 Audio player display style:', audioPlayer.style.display);
                    
                    // NO EVENT LISTENERS TO PREVENT INFINITE LOOPS
                    // Just set up the audio source and let the user interact with it
                    
                    console.log('🎵 Audio player setup complete - ready for user interaction');
                } catch (audioError) {
                    console.error('❌ Error setting up audio player:', audioError);
                }
            }
            
            // Auto-upload to Yoto immediately if user is authenticated
            if (accessToken) {
                console.log('🚀 Auto-uploading to Yoto immediately...');
                try {
                    // Prepare complete story data with the perfect audio
                    const completeStoryData = {
                        ...formData,
                        story: data.story,
                        audio: data.audio, // The perfect base64 audio
                        duration: data.duration,
                        fileSize: data.fileSize
                    };
                    
                    // Start Yoto upload immediately
                    createOrUpdateStoryForgePlaylist(completeStoryData, accessToken)
                        .then(() => {
                            console.log('✅ Auto-uploaded to Yoto successfully!');
                            showAlert('Story created and automatically uploaded to Yoto! 🎧');
                        })
                        .catch((yotoError) => {
                            console.error('❌ Auto-upload to Yoto failed:', yotoError);
                            showAlert('Story created successfully! Yoto upload failed - you can retry manually.');
                        });
                } catch (autoUploadError) {
                    console.error('❌ Error in auto-upload setup:', autoUploadError);
                }
            }
            
        } catch (error) {
            console.error('Error generating story:', error);
            if (loadingSpinner) loadingSpinner.classList.add('hidden');
            if (storyText) {
                storyText.textContent = `Oh no! The storyforge has run out of magic. Error: ${error.message}`;
            }
            showAlert(error.message);
        }
    };
    
    // Helper function to set up Yoto upload handler
    const setupYotoUploadHandler = (storyData) => {
        const uploadButton = document.getElementById('upload-to-yoto-button');
        if (uploadButton) {
            // Remove existing listeners
            uploadButton.replaceWith(uploadButton.cloneNode(true));
            const newUploadButton = document.getElementById('upload-to-yoto-button');
            
            newUploadButton.onclick = async () => {
                newUploadButton.disabled = true;
                newUploadButton.textContent = 'Uploading...';
                
                try {
                    const myoContent = await createOrUpdateStoryForgePlaylist({
                        heroName: storyData.heroName,
                        promptSetup: storyData.promptSetup,
                        promptRising: storyData.promptRising,
                        promptClimax: storyData.promptClimax,
                        age: storyData.age,
                        heroImage: storyData.heroImage,
                        surpriseMode: storyData.surpriseMode,
                        // CRITICAL: Include the image descriptions for perfect audio
                        characterDescription: storyData.characterDescription,
                        sceneDescription: storyData.sceneDescription
                    }, accessToken);
                    showAlert('Story successfully uploaded as individual Yoto card!');
                    console.log('StoryForge Playlist Updated:', myoContent);
                } catch (e) {
                    console.error("Failed to create/update StoryForge playlist:", e);
                    showAlert("Error updating StoryForge playlist. Please check the console.");
                } finally {
                    newUploadButton.disabled = false;
                    newUploadButton.textContent = 'Upload to Yoto';
                }
            };
        }
    };
    
    // Global debugging function for streaming URL testing
    window.testStreamingUrl = async () => {
        if (!window.lastStreamingUrl) {
            console.error('❌ No streaming URL available. Generate a story first.');
            return;
        }
        
        console.log('🧪 Manual streaming URL test:', window.lastStreamingUrl);
        try {
            const response = await fetch(window.lastStreamingUrl);
            console.log('✅ Test response status:', response.status, response.statusText);
            console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (response.ok) {
                const blob = await response.blob();
                console.log('🎵 Audio blob size:', blob.size, 'bytes');
                console.log('🎵 Audio blob type:', blob.type);
                
                // Create a temporary audio element to test playback
                const testAudio = new Audio(URL.createObjectURL(blob));
                testAudio.addEventListener('loadedmetadata', () => {
                    console.log('✅ Test audio duration:', testAudio.duration, 'seconds');
                });
                testAudio.load();
            } else {
                const errorText = await response.text();
                console.error('❌ Test failed with error:', errorText);
            }
        } catch (error) {
            console.error('❌ Streaming URL test error:', error);
        }
    };
    
    // Utility function to convert Base64 to Blob (improved version from experimental code)
    const b64toBlob = (b64Data, contentType = '', sliceSize = 512) => {
        const byteCharacters = atob(b64Data);
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }

        const blob = new Blob(byteArrays, { type: contentType });
        return blob;
    };
    
    // Simple Debug Functions
    let simpleLogCount = 0;
    const simpleLog = (message, type = 'info') => {
        simpleLogCount++;
        const timestamp = new Date().toLocaleTimeString();
        const logsDiv = document.getElementById('debug-logs-simple');
        const prefix = {
            'error': '❌',
            'success': '✅', 
            'warning': '⚠️',
            'info': 'ℹ️'
        }[type] || 'ℹ️';
        
        if (logsDiv) {
            logsDiv.textContent += `[${timestamp}] ${prefix} ${message}\n`;
            logsDiv.scrollTop = logsDiv.scrollHeight;
            
            if (simpleLogCount > 50) {
                const lines = logsDiv.textContent.split('\n');
                logsDiv.textContent = lines.slice(-25).join('\n');
                simpleLogCount = 25;
            }
        }
    };
    
    const getSimpleParams = () => {
        return {
            heroName: document.getElementById('debug-hero')?.value?.trim() || 'Test Hero',
            promptSetup: document.getElementById('debug-setup')?.value?.trim() || 'magical forest',
            promptRising: document.getElementById('debug-rising')?.value?.trim() || 'lost treasure',
            promptClimax: document.getElementById('debug-climax')?.value?.trim() || 'friendship saves day',
            age: '6',
            audioOnly: 'true'
        };
    };
    
    window.testStreamingGET = async () => {
        simpleLog('Testing GET streaming endpoint...');
        
        const params = getSimpleParams();
        const url = new URL(`${window.location.origin}/api/generate-story`);
        Object.entries(params).forEach(([key, value]) => {
            if (value) url.searchParams.set(key, value);
        });
        
        try {
            const startTime = Date.now();
            const response = await fetch(url.toString());
            const duration = Date.now() - startTime;
            
            simpleLog(`GET ${response.status} ${response.statusText} (${duration}ms)`);
            simpleLog(`Content-Type: ${response.headers.get('content-type')}`);
            simpleLog(`Content-Length: ${response.headers.get('content-length')}`);
            
            if (response.ok) {
                const blob = await response.blob();
                simpleLog(`Success: ${blob.size} bytes audio`, 'success');
                
                // Add audio player
                const playersDiv = document.getElementById('debug-players');
                if (playersDiv) {
                    const audioEl = document.createElement('audio');
                    audioEl.controls = true;
                    audioEl.src = URL.createObjectURL(blob);
                    
                    const label = document.createElement('div');
                    label.textContent = `GET Audio (${blob.size} bytes)`;
                    label.style.marginBottom = '5px';
                    label.style.fontWeight = 'bold';
                    
                    playersDiv.appendChild(label);
                    playersDiv.appendChild(audioEl);
                }
            } else {
                const errorText = await response.text();
                simpleLog(`GET failed: ${errorText}`, 'error');
            }
        } catch (error) {
            simpleLog(`GET error: ${error.message}`, 'error');
        }
    };
    
    window.testStreamingPOST = async () => {
        simpleLog('Testing POST endpoint...');
        
        const params = getSimpleParams();
        
        try {
            const response = await fetch('/api/generate-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    heroName: params.heroName,
                    promptSetup: params.promptSetup,
                    promptRising: params.promptRising,
                    promptClimax: params.promptClimax,
                    age: params.age
                })
            });
            
            if (!response.ok) throw new Error(`POST ${response.status}`);
            
            const data = await response.json();
            simpleLog(`POST success: ${data.fileSize || 0} bytes`, 'success');
            
            // Add audio player from base64
            if (data.audio) {
                const playersDiv = document.getElementById('debug-players');
                if (playersDiv) {
                    const audioBlob = b64toBlob(data.audio, 'audio/mpeg');
                    const audioEl = document.createElement('audio');
                    audioEl.controls = true;
                    audioEl.src = URL.createObjectURL(audioBlob);
                    
                    const label = document.createElement('div');
                    label.textContent = `POST Audio (${audioBlob.size} bytes)`;
                    label.style.marginBottom = '5px';
                    label.style.fontWeight = 'bold';
                    
                    playersDiv.appendChild(label);
                    playersDiv.appendChild(audioEl);
                }
            }
        } catch (error) {
            simpleLog(`POST error: ${error.message}`, 'error');
        }
    };
    
    window.compareStreaming = async () => {
        simpleLog('=== COMPARING ENDPOINTS ===');
        await testStreamingPOST();
        await testStreamingGET();
        simpleLog('Comparison complete!', 'success');
    };
    
    window.testDummyAudio = async (format = '') => {
        const formatName = format || 'default';
        simpleLog(`Testing ${formatName} audio endpoint...`);
        
        try {
            const url = format ? `/api/test-audio?format=${format}` : '/api/test-audio';
            const startTime = Date.now();
            const response = await fetch(url);
            const duration = Date.now() - startTime;
            
            simpleLog(`${formatName.toUpperCase()} ${response.status} ${response.statusText} (${duration}ms)`);
            simpleLog(`Content-Type: ${response.headers.get('content-type')}`);
            simpleLog(`Content-Length: ${response.headers.get('content-length')}`);
            
            if (response.ok) {
                const blob = await response.blob();
                simpleLog(`${formatName} success: ${blob.size} bytes audio`, 'success');
                
                // Add audio player and direct link
                const playersDiv = document.getElementById('debug-players');
                if (playersDiv) {
                    const audioEl = document.createElement('audio');
                    audioEl.controls = true;
                    audioEl.src = URL.createObjectURL(blob);
                    
                    const label = document.createElement('div');
                    label.textContent = `${formatName} Audio (${blob.size} bytes) - 5sec 440Hz tone`;
                    label.style.marginBottom = '5px';
                    label.style.fontWeight = 'bold';
                    
                    // Add direct URL link for testing
                    const directUrl = format ? `/api/test-audio?format=${format}` : '/api/test-audio';
                    const linkEl = document.createElement('a');
                    linkEl.href = directUrl;
                    linkEl.textContent = 'Direct Link';
                    linkEl.target = '_blank';
                    linkEl.style.marginLeft = '10px';
                    linkEl.style.color = '#0066cc';
                    
                    const containerDiv = document.createElement('div');
                    containerDiv.appendChild(label);
                    label.appendChild(linkEl);
                    
                    playersDiv.appendChild(containerDiv);
                    playersDiv.appendChild(audioEl);
                }
            } else {
                const errorText = await response.text();
                simpleLog(`${formatName} failed: ${errorText}`, 'error');
            }
        } catch (error) {
            simpleLog(`${formatName} error: ${error.message}`, 'error');
        }
    };
    
    window.testYotoDummy = async (format = '') => {
        if (!accessToken) {
            simpleLog('Please log in to Yoto first!', 'error');
            return;
        }
        
        const formatName = format || 'default';
        simpleLog(`Creating Yoto playlist with ${formatName} audio...`);
        
        const audioUrl = format ? 
            `${window.location.origin}/api/test-audio?format=${format}` :
            `${window.location.origin}/api/test-audio`;
        
        try {
            const result = await createStreamingOnlyPlaylist({
                heroName: `Test ${formatName.toUpperCase()}`,
                audioStreamUrl: audioUrl
            }, accessToken);
            simpleLog(`Yoto ${formatName} test success!`, 'success');
            simpleLog(`Card ID: ${result.card?.cardId || 'unknown'}`);
        } catch (error) {
            simpleLog(`Yoto ${formatName} error: ${error.message}`, 'error');
        }
    };
    
    // Streaming-only playlist creation for testing (skips direct upload attempt)
    async function createStreamingOnlyPlaylist(testData, accessToken) {
        const PLAYLIST_TITLE = "StoryForge";
        
        try {
            console.log("🔍 Creating streaming-only test playlist...");
            
            // Step 1: Find existing StoryForge playlist
            const myoResponse = await fetch("https://api.yotoplay.com/content/mine", {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            
            if (!myoResponse.ok) {
                throw new Error(`Failed to fetch user content: ${myoResponse.status}`);
            }
            
            const myoData = await myoResponse.json();
            let contentArray = [];
            if (Array.isArray(myoData)) {
                contentArray = myoData;
            } else if (myoData.cards && Array.isArray(myoData.cards)) {
                contentArray = myoData.cards;
            } else if (myoData.content && Array.isArray(myoData.content)) {
                contentArray = myoData.content;
            }
            
            const existingStoryForge = contentArray.find(item => 
                item && item.title === PLAYLIST_TITLE
            );
            
            // Step 2: Create playlist using streaming URL (skip upload attempt)
            console.log('🔄 Using streaming URL (test mode):', testData.audioStreamUrl);
            
            const playlistPayload = {
                title: `${PLAYLIST_TITLE} - ${testData.heroName}`,
                content: {
                    chapters: [{
                        key: "01",
                        title: testData.heroName,
                        tracks: [{
                            key: "01",
                            title: "Test Audio",
                            trackUrl: testData.audioStreamUrl,
                            type: "stream",
                            format: "wav",
                            duration: 5,
                            fileSize: 100000
                        }],
                        display: {
                            icon16x16: "yoto:#ZuVmuvnoFiI4el6pBPvq0ofcgQ18HjrCmdPEE7GCnP8"
                        }
                    }]
                },
                metadata: {
                    description: "Audio format test from StoryForge",
                    media: {
                        duration: 5,
                        fileSize: 100000
                    }
                }
            };
            
            console.log('📝 Creating test playlist...');
            const createResponse = await fetch('https://api.yotoplay.com/content', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(playlistPayload)
            });
            
            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                throw new Error(`Playlist creation failed: ${createResponse.status} ${errorText}`);
            }
            
            const createResult = await createResponse.json();
            console.log('✅ Test playlist created:', {
                operation: 'CREATED',
                cardId: createResult.card?.cardId || 'unknown'
            });
            
            return { card: createResult.card };
            
        } catch (error) {
            console.error('❌ Streaming test error:', error);
            throw error;
        }
    };
    
    // Format-specific test functions
    window.testMinimal = () => testDummyAudio('minimal');
    window.testSimple = () => testDummyAudio('simple');
    window.testWAV22 = () => testDummyAudio('wav22');
    window.testWAV44 = () => testDummyAudio('wav44');
    window.testYotoMinimal = () => testYotoDummy('minimal');
    window.testYotoWAV22 = () => testYotoDummy('wav22');
    window.testYotoWAV44 = () => testYotoDummy('wav44');
    window.testYotoSimple = () => testYotoDummy('simple');
    
    window.clearDebugLogs = () => {
        const logsDiv = document.getElementById('debug-logs-simple');
        const playersDiv = document.getElementById('debug-players');
        if (logsDiv) logsDiv.textContent = '🧹 Logs cleared\n';
        if (playersDiv) playersDiv.innerHTML = '';
        simpleLogCount = 0;
    };
    
    // Show debug section if ?debug=true
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'true') {
        const debugSection = document.getElementById('debug-section');
        if (debugSection) {
            debugSection.classList.remove('hidden');
            simpleLog('Debug mode activated!', 'success');
        }
    }
    
    // Initialize mode selection after all functions are defined
    initializeModeSelection();
    
    // Initialize navigation dropdown
    initializeNavigation();
    
    // Initial check on page load
    checkAuthentication();
    
    // Helper functions for new UI elements
    window.showModeHelp = (mode) => {
        const helpMessages = {
            classic: 'Classic Story mode creates traditional tales with heroes, adventures, and magical endings. Fill in at least one story element - the more details you provide, the richer your story will be!'
        };
        showAlert(helpMessages[mode] || 'Help information coming soon!');
    };
    
    window.printStoryWorksheet = () => {
        // This will be implemented when the worksheet file is ready
        showAlert('Story arc worksheet coming soon! 📝 This will help you plan amazing stories.');
    };
    
    // Add debug functionality directly in main script
    setupDebugSystem();
});

// Debug system setup
function setupDebugSystem() {
    console.log('🔧 Setting up debug system...');
    
    // Test Yoto upload workflow
    window.testYotoUploadWorkflow = async function() {
        try {
            console.log('🧪 Testing Yoto upload workflow manually...');
            
            // First run checkYotoAuth to discover and normalize the token
            const isAuthenticated = window.checkYotoAuth();
            if (!isAuthenticated) {
                console.error('❌ No access token found - please log in first');
                return null;
            }
            
            const accessToken = localStorage.getItem('yoto_access_token');
            if (!accessToken) {
                console.error('❌ Token normalization failed');
                return null;
            }
            
            // Test upload URL endpoint
            console.log('🔗 Testing upload URL endpoint...');
            const uploadUrlResponse = await fetch('https://api.yotoplay.com/media/transcode/audio/uploadUrl', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });
            
            console.log('🔍 Upload URL Response:', {
                status: uploadUrlResponse.status,
                statusText: uploadUrlResponse.statusText,
                headers: Object.fromEntries(uploadUrlResponse.headers.entries())
            });
            
            if (uploadUrlResponse.ok) {
                const uploadUrlData = await uploadUrlResponse.json();
                console.log('📊 Upload URL Data:', uploadUrlData);
                return uploadUrlData;
            } else {
                const errorText = await uploadUrlResponse.text();
                console.error('❌ Upload URL failed:', errorText);
                return null;
            }
        } catch (error) {
            console.error('❌ Test failed:', error);
            return null;
        }
    };
    
    // Check authentication status
    window.checkYotoAuth = function() {
        // Check multiple possible token storage locations
        const possibleKeys = [
            'yoto_access_token',
            'access_token', 
            'accessToken',
            'yoto_token',
            'auth_token'
        ];
        
        console.log('🔐 Checking localStorage for Yoto tokens...');
        
        // Log all localStorage keys for debugging
        const allKeys = Object.keys(localStorage);
        console.log('🗝 All localStorage keys:', allKeys);
        
        let foundToken = null;
        let foundKey = null;
        
        // Try each possible key
        for (const key of possibleKeys) {
            const token = localStorage.getItem(key);
            if (token) {
                foundToken = token;
                foundKey = key;
                console.log(`✅ Found token at key: ${key}`);
                break;
            }
        }
        
        // Also check for JSON-stored tokens like YOTO_STORYFORGE_TOKENS
        if (!foundToken) {
            const yotoTokensKey = 'YOTO_STORYFORGE_TOKENS';
            const yotoTokensStr = localStorage.getItem(yotoTokensKey);
            
            if (yotoTokensStr) {
                try {
                    const yotoTokens = JSON.parse(yotoTokensStr);
                    console.log('🔍 Parsed YOTO_STORYFORGE_TOKENS:', yotoTokens);
                    
                    if (yotoTokens.accessToken) {
                        foundToken = yotoTokens.accessToken;
                        foundKey = `${yotoTokensKey}.accessToken`;
                        console.log(`✅ Found token in JSON at: ${foundKey}`);
                    }
                } catch (e) {
                    console.warn('⚠️ Failed to parse YOTO_STORYFORGE_TOKENS:', e);
                }
            }
        }
        
        // Also check if there are any keys containing 'token' or 'yoto'
        const relevantKeys = allKeys.filter(key => 
            key.toLowerCase().includes('token') || 
            key.toLowerCase().includes('yoto') ||
            key.toLowerCase().includes('auth')
        );
        
        if (relevantKeys.length > 0) {
            console.log('🔍 Keys containing token/yoto/auth:', relevantKeys);
            relevantKeys.forEach(key => {
                const value = localStorage.getItem(key);
                console.log(`  ${key}: ${value ? value.substring(0, 20) + '...' : 'null'}`);
            });
        }
        
        if (foundToken) {
            // Store the found token in the expected location for other functions
            if (foundKey !== 'yoto_access_token') {
                localStorage.setItem('yoto_access_token', foundToken);
                console.log('🔄 Copied token to yoto_access_token for compatibility');
            }
        }
        
        console.log('🔐 Final authentication status:', {
            hasToken: !!foundToken,
            tokenLength: foundToken ? foundToken.length : 0,
            foundAt: foundKey || 'none'
        });
        
        return !!foundToken;
    };
    
    // Create visual debug panel
    window.showDebugPanel = function() {
        // Remove existing panel
        const existing = document.getElementById('debug-panel');
        if (existing) existing.remove();
        
        console.log('🔧 Creating debug panel...');
        
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debug-panel';
        debugPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        debugPanel.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold; color: #4CAF50;">🔧 Yoto API Debug Panel</div>
            <div id="debug-results">Ready to run diagnostics...</div>
            <button onclick="runDiagnostics()" style="margin-top: 10px; padding: 5px 10px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">Run Tests</button>
            <button onclick="document.getElementById('debug-panel').remove()" style="margin: 10px 0 0 5px; padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
        `;
        
        document.body.appendChild(debugPanel);
        console.log('✅ Debug panel created successfully');
    };
    
    // Run diagnostics function
    window.runDiagnostics = async function() {
        const resultsDiv = document.getElementById('debug-results');
        if (!resultsDiv) {
            console.error('❌ Debug results div not found');
            return;
        }
        
        resultsDiv.innerHTML = 'Running diagnostics...';
        
        try {
            let results = [];
            
            // Test 1: Authentication
            const authStatus = window.checkYotoAuth();
            results.push(`✅ Auth Status: ${authStatus ? 'Authenticated' : 'Not logged in'}`);
            
            if (!authStatus) {
                results.push(`❌ Please log in to Yoto to run API tests`);
                resultsDiv.innerHTML = results.join('<br>');
                return;
            }
            
            // Test 2: Upload URL endpoint
            results.push(`🔄 Testing upload URL endpoint...`);
            resultsDiv.innerHTML = results.join('<br>');
            
            const uploadTest = await window.testYotoUploadWorkflow();
            
            if (uploadTest) {
                results[results.length - 1] = `✅ Upload URL: SUCCESS`;
                results.push(`📄 Upload ID: ${uploadTest.upload?.uploadId || 'N/A'}`);
                results.push(`🔗 Upload URL: ${uploadTest.upload?.uploadUrl ? 'Provided' : 'Missing'}`);
            } else {
                results[results.length - 1] = `❌ Upload URL: FAILED`;
            }
            
            // Test 3: Content API
            results.push(`🔄 Testing content API...`);
            resultsDiv.innerHTML = results.join('<br>');
            
            try {
                const accessToken = localStorage.getItem('yoto_access_token');
                const contentResponse = await fetch('https://api.yotoplay.com/content/mine', {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                
                if (contentResponse.ok) {
                    const contentData = await contentResponse.json();
                    results[results.length - 1] = `✅ Content API: SUCCESS`;
                    results.push(`📊 Total items: ${(contentData.cards || contentData || []).length}`);
                } else {
                    results[results.length - 1] = `❌ Content API: FAILED (${contentResponse.status})`;
                }
            } catch (e) {
                results[results.length - 1] = `❌ Content API: ERROR`;
            }
            
            resultsDiv.innerHTML = results.join('<br>');
            
        } catch (error) {
            resultsDiv.innerHTML = `❌ Diagnostics failed: ${error.message}`;
        }
    };
    
    // Debug panel is now hidden by default
    // Use window.showDebugPanel() to show it when needed
    console.log('🔧 Debug system ready - call window.showDebugPanel() to show debug panel');
    
    console.log('✅ Debug system setup complete');
}
</file>

</files>
