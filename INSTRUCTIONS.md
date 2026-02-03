# Music 2FA Prototype - Instructions

## Prerequisites
- Node.js (v18+)
- `ffmpeg` (installed via dependencies, but ensure system libraries are compatible if issues arise)

## Setup
1. Open a terminal in the project directory:
   ```bash
   cd /Users/cammyearly/Downloads/Music_2FA
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. **Note on Audio**: The system uses `yt-dlp` to download audio. 
   - Downloads are optimized for speed using `aria2c`-like parallel processing.
   - Files are stored as high-efficiency OPUS files in `public/assets`.

## Running the Application
You need to run **two** separate terminal processes (or use a tool like `concurrently`).

### Terminal 1: Backend Server
This handles user management, song downloading, and study metrics.
```bash
npm run server
```
*Expected Output:* `Server running on http://localhost:3001`

### Terminal 2: Frontend Application
This runs the React interface for the user study.
```bash
npm run dev
```
*Expected Output:* `Local: http://localhost:5173/`

## How to Use
1. Open `http://localhost:5173` in your browser.
2. **Registration / Login**:
   - Enter a username.
   - **New Users**: Will be guided to set up their profile.
   - **Returning Users**: Can log in to generate new sessions for the study.
3. **Setup Mode**:
   - Enter song titles (e.g., "The Beatles - Come Together").
   - **Parallel Downloads**: You can type a song and hit Enter immediately to queue another.
   - **Constraints**:
     - You must add **exactly 5 unique songs**.
     - Songs longer than **10 minutes** are not allowed.
     - Duplicate songs are prevented.
   - Once 5 songs are downloaded, proceed to password setup.
4. **Authentication Mode**:
   - Click **Enable 2FA** or start a verification session.
   - A **1-second random clip** from one of your songs will play.
   - Identify the correct song from the options.
   - **Goal**: Get 3 correct answers in a row to authenticate.
   - **Metrics**: Your response time, success rate, and errors are logged to `users.json`.

## Troubleshooting
- **Download Stuck?**: The server logs detailed debug info. Search queries append "lyrics" automatically to avoid age-restricted video hangs.
- **Audio Doesn't Play**: Ensure the frontend is running on port 5173 and backend on 3001.
- **"Song Too Long"**: Try a "Radio Edit" or "Lyric Video" version if the original is >10 mins.

## Deployment & Hosting
For instructions on how to host this on GitHub and deploy to a cloud provider (like Vercel or Railway), please refer to **[hosting.md](./hosting.md)**.

Note that because this app uses `ffmpeg` and `yt-dlp`, a standard "Frontend-only" Vercel host is not sufficient for the backend logic.
