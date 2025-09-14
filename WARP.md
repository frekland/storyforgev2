# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## ⚠️ CRITICAL: Read This First

**This project has specific architectural constraints that MUST be followed to avoid critical failures.** The Storyforge project previously experienced complete audio corruption and playlist duplication due to violations of Yoto API architectural principles. This document codifies the **mandatory** patterns that prevent these failures.

## Overview

**Storyforge v2** is an AI-powered story generation app that creates personalized audio stories for Yoto devices. Users provide story prompts and optional images, and the app generates a complete story with audio using Google's Gemini AI and Text-to-Speech services, then adds them as chapters to a single persistent "StoryForge" playlist on Yoto.

### Project Architecture
- **Frontend**: Vite + Vanilla JavaScript (hosted on Vercel)
- **Backend**: Node.js serverless function (`/api/generate-story`)
- **External APIs**: Google Gemini AI, Google Cloud TTS, Yoto Play API
- **Authentication**: OAuth 2.0 + PKCE with Yoto
- **Audio Delivery**: Streaming workflow (NOT transcoding)

## Development Commands

### Core Commands
```bash
# Start development server (with hot reload)
npm run dev

# Build for production (Vercel compatible)
npm run build

# Preview production build locally
npm run preview

# Install dependencies
npm install
```

### Environment Setup
Create a `.env` file in the root with required API keys and credentials (see Environment Variables section below).

## 🚨 IMMUTABLE ARCHITECTURAL PRINCIPLES

**These 4 rules are NON-NEGOTIABLE and prevent critical system failures:**

### Rule 1: Two-Domain Architecture (MANDATORY)
- **Authentication Domain**: `https://login.yotoplay.com` - ONLY for `/authorize` and `/oauth/token`
- **API Resource Domain**: `https://api.yotoplay.com` - ONLY for `/content`, `/content/mine`, `/media/*`
- **❌ NEVER mix these domains** - This is the #1 cause of 403 Forbidden errors

### Rule 2: OAuth 2.0 + PKCE Authentication (MANDATORY)
- **ONLY** use `authorization_code` grant type with PKCE
- **❌ NEVER** use `client_credentials` grant (causes "unauthorized_client" error)
- **Required scopes**: `offline_access` (for refresh tokens) + `write:myo` (for content creation)

### Rule 3: Streaming Workflow for Audio (MANDATORY)
- **Dynamic audio MUST use streaming workflow** (type: "stream")
- **❌ NEVER** use transcoding workflow for AI-generated content
- `trackUrl` must be a public HTTPS endpoint that serves raw audio with `Content-Type: audio/mpeg`

### Rule 4: "Get, Modify, Post" for Updates (MANDATORY)
- **ALL playlist updates are COMPLETE REPLACEMENTS**
- **❌ NEVER** send partial updates - they delete existing content
- **Required pattern**: GET full playlist → modify in memory → POST entire object

## Corrected Architecture

```
┌──────────────┐  POST/GET   ┌─────────────────┐  Stream   ┌──────────────┐
│   Browser    │◄──────────►│  /api/generate  │◄─────────►│ Yoto Servers │
│              │  (stories)  │     -story      │  (audio)  │              │
│ • Auth Flow  │             │                 │           │              │
│ • Form UI    │             │ • Dual Mode:    │           │              │
│ • Playlist   │             │   POST: Generate│           │              │
│   Management │             │   GET: Stream   │           │              │
└──────────────┘             └─────────────────┘           └──────────────┘
       │                              │
       │ GET/POST                     │ API Calls
       ▼                              ▼
┌──────────────┐                ┌─────────────────┐
│ Yoto API     │                │ Google Services │
│              │                │                 │
│ • /content   │                │ • Gemini AI     │
│ • /content/  │                │ • Cloud TTS     │
│   mine       │                │                 │
└──────────────┘                └─────────────────┘
```

## Corrected Story Generation Workflow

**This 10-step flow prevents the audio corruption and playlist duplication issues:**

```
1. User Form Submission
   ↓
2. Client → POST /api/generate-story (with story data)
   ↓
3. Serverless: Generate story text + audio → Return to client
   ↓
4. Client: createOrUpdateStoryForgePlaylist()
   ↓
5. GET api.yotoplay.com/content/mine (find existing playlist)
   ↓
6. GET api.yotoplay.com/content/{cardId} (fetch full content if exists)
   ↓
7. Construct new chapter with STREAMING trackUrl
   ↓
8. Merge + recalculate metadata (duration, fileSize)
   ↓
9. POST api.yotoplay.com/content (complete replacement)
   ↓
10. Yoto → GET /api/generate-story?audioOnly=true (on-demand streaming)
```

### Critical Implementation Details

**Step 7 - Streaming trackUrl Format:**
```javascript
// ✅ CORRECT: Streaming workflow
const newChapter = {
  key: "01",
  title: storyData.heroName,
  tracks: [{
    key: "01",
    title: "Chapter One",
    trackUrl: `https://yourapp.vercel.app/api/generate-story?heroName=${encodeURIComponent(heroName)}&audioOnly=true`,
    type: "stream",  // ❗ CRITICAL: Must be "stream"
    format: "mp3",
    duration: estimatedDuration,
    fileSize: estimatedSize
  }]
}

// ❌ WRONG: Transcoding workflow (causes audio corruption)
{
  trackUrl: "yoto:#someTranscodedId",
  type: "audio"  // DO NOT USE for dynamic content
}
```

**Step 9 - Complete Replacement Pattern:**
```javascript
// ✅ CORRECT: Send ENTIRE playlist object
const updatePayload = {
  cardId: existingCardId,  // Include for updates
  title: "StoryForge",
  content: {
    chapters: [...allExistingChapters, newChapter]  // ALL chapters
  },
  metadata: {
    media: {
      duration: totalCalculatedDuration,  // Sum of ALL tracks
      fileSize: totalCalculatedFileSize   // Sum of ALL tracks
    }
  }
};

// ❌ WRONG: Partial update (deletes existing chapters)
{
  cardId: existingCardId,
  content: {
    chapters: [newChapter]  // Only new chapter = data loss
  }
}
```

## Dual-Mode Serverless Function Pattern

**The `/api/generate-story` function MUST handle both client and Yoto server requests:**

```javascript
// /api/generate-story.js
export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Mode 1: Client requests story generation
    const { heroName, promptSetup, promptRising, promptClimax, age } = req.body;
    
    const { storyText, audioContent } = await generateStoryAndAudio({
      heroName, promptSetup, promptRising, promptClimax, age
    });
    
    // Return story text and audio data to client
    res.status(200).json({
      story: storyText,
      audio: audioContent.toString('base64'),
      duration: estimatedDuration,
      fileSize: audioContent.length
    });
    
  } else if (req.method === 'GET') {
    // Mode 2: Yoto servers request audio stream
    const { heroName, promptSetup, promptRising, promptClimax, age, audioOnly } = req.query;
    
    if (!audioOnly || audioOnly !== 'true') {
      return res.status(400).json({ message: 'This endpoint is for audio streaming only.' });
    }
    
    // Re-generate audio on-demand for streaming
    const { audioContent } = await generateStoryAndAudio({
      heroName, promptSetup, promptRising, promptClimax, age
    });
    
    // ❗ CRITICAL: Set correct headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioContent.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    res.status(200).send(audioContent);
  } else {
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
```

## Error Troubleshooting Matrix

| HTTP Code | Error Context | Most Likely Cause | Fix |
|-----------|---------------|-------------------|-----|
| **403 Forbidden** | Any API call | Wrong domain used | Verify: `login.yotoplay.com` for auth, `api.yotoplay.com` for data |
| **401 Unauthorized** | Resource access | Expired/invalid token | Refresh token or re-authenticate |
| **500 Internal Server Error** | POST /content | Inconsistent metadata | Use "Get, Modify, Post" pattern; recalculate total duration/fileSize |
| **unauthorized_client** | /oauth/token | Wrong grant type | Use `authorization_code` with PKCE, not `client_credentials` |
| **Audio corruption** | 2-second clips | Using transcoding workflow | Switch to streaming workflow (type: "stream") |
| **Playlist duplication** | Multiple playlists | Not finding/updating existing | Implement proper playlist search and update logic |

## Environment Variables

Required environment variables for development and deployment:

```bash
# Google AI/Cloud Services
GOOGLE_API_KEY=your_gemini_api_key
GOOGLE_CLIENT_EMAIL=your_service_account_email
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Yoto OAuth (Frontend)
VITE_CLIENT_ID=your_yoto_oauth_client_id
```

### Notes
- `GOOGLE_PRIVATE_KEY` must preserve newline characters (`\n`)
- `VITE_` prefixed variables are exposed to the frontend
- Yoto OAuth redirect URI should match your domain origin
- **Removed AWS S3** - Not needed with streaming workflow

## 🚫 PROHIBITED PATTERNS (Anti-Patterns)

**These patterns WILL cause system failures - DO NOT USE:**

### ❌ Endpoint Hallucination
```javascript
// PROHIBITED - These endpoints DO NOT EXIST:
fetch('https://api.yotoplay.com/v1/playlists')           // ❌ NO
fetch('https://api.yotoplay.com/v1/myo/streaming-tracks') // ❌ NO  
fetch('https://api.yotoplay.com/v1/devices/mine')        // ❌ NO

// ✅ CORRECT - Only these endpoints exist:
fetch('https://api.yotoplay.com/content')                // ✓ YES
fetch('https://api.yotoplay.com/content/mine')           // ✓ YES
fetch('https://api.yotoplay.com/content/{cardId}')       // ✓ YES
```

### ❌ Partial Update Attempts
```javascript
// PROHIBITED - Partial updates delete existing content:
{
  cardId: "existing-id",
  content: {
    chapters: [newChapterOnly]  // ❌ Deletes all existing chapters
  }
}

// ✅ CORRECT - Always send complete object:
{
  cardId: "existing-id", 
  content: {
    chapters: [...existingChapters, newChapter]  // ✓ All chapters
  },
  metadata: {
    media: {
      duration: recalculatedTotalDuration,  // ✓ Must recalculate
      fileSize: recalculatedTotalFileSize   // ✓ Must recalculate  
    }
  }
}
```

### ❌ Wrong Authentication Grant
```javascript
// PROHIBITED - client_credentials not supported:
{
  grant_type: 'client_credentials',  // ❌ Causes "unauthorized_client"
  client_id: 'your-client-id'
}

// ✅ CORRECT - authorization_code with PKCE:
{
  grant_type: 'authorization_code',  // ✓ Required
  client_id: 'your-client-id',
  code_verifier: 'generated-verifier',
  code: 'auth-code-from-redirect'
}
```

## Core Client-Side Function

**Required implementation of `createOrUpdateStoryForgePlaylist()`:**

```javascript
async function createOrUpdateStoryForgePlaylist(storyData, accessToken) {
  const PLAYLIST_TITLE = "StoryForge";
  
  // Step 1: Find existing playlist
  const myoResponse = await fetch("https://api.yotoplay.com/content/mine", {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const myoCards = await myoResponse.json();
  const existing = myoCards.find(card => card.title === PLAYLIST_TITLE);
  
  let playlist = null;
  let cardId = null;
  
  if (existing) {
    // Step 2: Fetch full content of existing playlist
    cardId = existing.cardId;
    const fullResponse = await fetch(`https://api.yotoplay.com/content/${cardId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    playlist = await fullResponse.json();
  } else {
    // Create new playlist structure
    playlist = {
      title: PLAYLIST_TITLE,
      content: { chapters: [] },
      metadata: {
        description: "AI-generated stories from The Storyforge",
        media: { duration: 0, fileSize: 0 }
      }
    };
  }
  
  // Step 3: Create new chapter with streaming URL
  const newChapter = {
    key: String(playlist.content.chapters.length + 1).padStart(2, '0'),
    title: storyData.heroName,
    tracks: [{
      key: "01",
      title: "Chapter One",
      trackUrl: `${window.location.origin}/api/generate-story?heroName=${encodeURIComponent(storyData.heroName)}&audioOnly=true`,
      type: "stream",  // ❗ CRITICAL
      format: "mp3",
      duration: storyData.duration,
      fileSize: storyData.fileSize
    }]
  };
  
  // Step 4: Add chapter and recalculate metadata
  playlist.content.chapters.push(newChapter);
  
  const totalDuration = playlist.content.chapters.reduce((sum, ch) => 
    sum + ch.tracks.reduce((trackSum, track) => trackSum + (track.duration || 0), 0), 0);
  const totalFileSize = playlist.content.chapters.reduce((sum, ch) => 
    sum + ch.tracks.reduce((trackSum, track) => trackSum + (track.fileSize || 0), 0), 0);
    
  playlist.metadata.media = {
    duration: totalDuration,
    fileSize: totalFileSize
  };
  
  if (cardId) playlist.cardId = cardId;
  
  // Step 5: POST complete playlist
  const response = await fetch("https://api.yotoplay.com/content", {
    method: "POST",
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(playlist)
  });
  
  return await response.json();
}
```

## File Structure

```
storyforgev2/
├── api/
│   ├── generate-story.js      # ❗ DUAL-MODE: POST (client) + GET (Yoto streaming)
│   └── upload-audio.js        # ❌ DEPRECATED (not needed with streaming)
├── index.html                 # Main UI template
├── script.js                  # Frontend + createOrUpdateStoryForgePlaylist()
├── tokens.js                  # OAuth token management
├── styles.css                 # UI styling (purple theme)
├── vite.config.js            # Vite build configuration
├── package.json              # Dependencies and scripts
├── .env                      # Environment variables
└── WARP.md                   # This file
```

## Deployment & Vercel Configuration

**Vercel-specific requirements:**
- **Node.js version**: 20.x
- **Build command**: `npx vite build`
- **Output directory**: `dist/`
- **Callback URLs**: Must include both primary domain and deployment-specific URLs

```json
// vercel.json
{
  "functions": {
    "api/generate-story.js": {
      "maxDuration": 60
    }
  }
}
```

### OAuth Callback Configuration
In Yoto Developer Dashboard, set "Allowed Callback URLs" to:
```
https://storyforgev2.vercel.app,https://storyforgev2-username-projects.vercel.app
```

## Testing & Debugging

### Testing Audio Streaming
1. Deploy to Vercel
2. Test direct GET request: `https://yourapp.vercel.app/api/generate-story?heroName=Test&audioOnly=true`
3. Should return MP3 audio with `Content-Type: audio/mpeg`

### Common Debug Steps
1. **403 Errors**: Check domain (`login.yotoplay.com` vs `api.yotoplay.com`)
2. **Audio Issues**: Verify streaming workflow (type: "stream")
3. **Playlist Issues**: Check "Get, Modify, Post" pattern implementation
4. **Token Issues**: Test token refresh logic
