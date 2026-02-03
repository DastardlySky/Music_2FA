# Music-Based 2FA Study Prototype

A research prototype for a "Musical Two-Factor Authentication" system. This application is designed to conduct user studies on the efficacy and usability of using short, randomized audio clips from user-selected songs as an authentication mechanism.

## Overview

Users authenticate by recognizing a **1-second random snippet** from a song they previously selected. The system requires users to build a "library" of exactly 5 songs. During authentication, they must correctly identify the song playing from a list of distractors.

This prototype includes robust features for longitudinal user studies, including:
- **Session Tracking**: Records success rates, response times, and failure counts.
- **Persistent Storage**: User data (songs, passwords, metrics) is stored in `users.json`.
- **Duplicate Prevention**: Logic to prevent adding the same song twice.
- **Privacy**: Passwords and data are localized for the study environment.

## Key Features

### User Experience
- **Parallel Song Downloads**: Users can queue multiple songs rapidly; the system downloads them in parallel using optimized `yt-dlp` settings.
- **Fluid UI**: Type-and-enter interface for quick library setup.
- **Smart Feedback**: Real-time progress indicators for downloads and detailed error messages (e.g., "Song too long").

### Systems & Performance
- **Optimized Download Pipeline**:
  - Uses `yt-dlp` with `format: 'worstaudio'` and `opus` codec for minimal file size (~1MB per song).
  - Enforces a **10-minute (600s)** max duration to prevent system bloat.
  - Automatically appends "lyrics" to search queries to prioritize faster, non-age-restricted videos.
  - **15s Timeout** on searches to prevent server hanging.
- **Concurrency Safety**: Server-side locking prevents race conditions when multiple downloads finish simultaneously.
- **Dynamic Snippets**: Audio snippets are generated on-the-fly using `ffmpeg` from the full song file, selecting a random 1-second window each time.

## Technology Stack

- **Frontend**: React (Vite), Bootstrap
- **Backend**: Node.js, Express
- **Audio Processing**: `fluent-ffmpeg`, `yt-dlp-exec`
- **Data**: JSON-based flat file storage (for easy study data export)

## Getting Started

1. **Setup**:
   ```bash
   npm install
   ```
2. **Build**:
   ```bash
   npm run build
   ```
3. **Local Development**:
   See [INSTRUCTIONS.md](./INSTRUCTIONS.md) for detailed local runner setup.

4. **Hosting**:
   See [hosting.md](./hosting.md) for Vercel and Railway deployment instructions.

## Deployment Note
This application requires **binary dependencies** (`ffmpeg` and `yt-dlp`). Standard Vercel deployment of the backend is restricted due to these requirements. Refer to `hosting.md` for the recommended setup.

## Study Metrics
The system records the following data points in `server/users.json` for every authentication attempt:
- `timestamp`: When the attempt occurred.
- `duration`: Time taken to identify the song (in ms).
- `success`: Whether the identification was correct.
- `session`: Session identifier (e.g., "session_1" for initial setup, "session_2" for return visits).

## License
Research Prototype - Internal Use Only.
