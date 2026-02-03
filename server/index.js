import express from 'express';
import cors from 'cors';
import ytDlp from 'yt-dlp-exec';
const exec = ytDlp;
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Setup ffmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller);

app.use(cors());
app.use(express.json());

const ASSETS_DIR = path.join(__dirname, '../public/assets');
const USERS_FILE = path.join(__dirname, 'users.json');

// Ensure assets directory exists
if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// Serve static files from the dist directory (built frontend)
const DIST_PATH = path.join(__dirname, '../dist');
if (fs.existsSync(DIST_PATH)) {
    app.use(express.static(DIST_PATH));
}

// Serve assets directly for fallback
app.use('/assets', express.static(ASSETS_DIR));

// Load users helper
const loadUsers = () => {
    if (fs.existsSync(USERS_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        } catch (e) {
            console.error("Error reading users file:", e);
            return [];
        }
    }
    return [];
};

// Save users helper
const saveUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// ---- ENDPOINTS ----

// Register or Login (Get user state)
app.post('/api/register', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });

    let users = loadUsers();
    let user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (user) {
        // User exists (Session 2 logic)
        return res.json({
            message: 'User found',
            user: { username: user.username, hasPassword: !!user.password, songsCount: user.songs.length },
            isReturning: true
        });
    }

    // New User (Session 1 logic)
    user = {
        username,
        password: '',
        songs: [],
        metrics: []
    };
    users.push(user);
    saveUsers(users);

    res.json({
        message: 'User created',
        user: { username: user.username, hasPassword: false, songsCount: 0 },
        isReturning: false
    });
});

// Set Password
app.post('/api/users/:username/password', (req, res) => {
    const { username } = req.params;
    const { password } = req.body;

    let users = loadUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user) return res.status(404).json({ error: 'User not found' });

    user.password = password; // Stored in plain text for study
    saveUsers(users);

    res.json({ message: 'Password set' });
});

// Add Song
app.post('/api/users/:username/songs', async (req, res) => {
    const { username } = req.params;
    const { query } = req.body;

    let users = loadUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.songs.length >= 5) return res.status(400).json({ error: 'Max 5 songs allowed' });

    // Append 'lyrics' to avoid age-restricted music videos which often hang or require cookies
    const searchQ = `${query} lyrics`;
    console.log(`[DEBUG] SEARCHING for: "${searchQ}" for user "${username}"`);

    try {
        // Use a timeout for the search to prevent hanging
        const searchPromise = exec(`ytsearch1:${searchQ}`, {
            dumpJson: true,
            noPlaylist: true,
            skipDownload: true,
            noWarnings: true,
            jsRuntimes: 'node',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Search timed out')), 15000)
        );

        const searchResult = await Promise.race([searchPromise, timeoutPromise]);

        console.log(`[DEBUG] SEARCH COMPLETED for "${searchQ}"`);

        const videoData = typeof searchResult === 'string' ? JSON.parse(searchResult) : searchResult;

        // If it's a search result, it might be in an 'entries' array
        const actualData = videoData.entries ? videoData.entries[0] : videoData;

        if (!actualData) {
            console.log(`[DEBUG] NO RESULTS found for "${searchQ}"`);
            return res.status(404).json({ error: 'No results found for this search.' });
        }

        const videoId = actualData.id;
        const title = actualData.title;
        const videoUrl = actualData.webpage_url;
        const duration = actualData.duration;

        console.log(`[DEBUG] VIDEO FOUND: "${title}" (ID: ${videoId}, Duration: ${duration}s)`);

        // Prevent downloading songs over 10 minutes (600 seconds)
        if (duration > 600) {
            console.log(`[DEBUG] SONG TOO LONG: ${duration}s`);
            return res.status(400).json({ error: 'Song is too long. Max 10 minutes allowed.' });
        }

        // Check duplicates for this user
        if (user.songs.find(s => s.originalId === videoId)) {
            console.log(`[DEBUG] DUPLICATE found for user ${username}`);
            return res.status(400).json({ error: 'This song is already in your list.' });
        }

        // Create readable filename from title
        const sanitizedTitle = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
            .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
            .substring(0, 100); // Limit length

        const songId = `${sanitizedTitle}-${uuidv4().substring(0, 8)}`;
        const finalFile = path.join(ASSETS_DIR, `${songId}.opus`);

        console.log(`[DEBUG] STARTING DOWNLOAD: "${title}" to "${songId}.opus"`);

        // Use high-efficiency download settings for maximum speed and minimal storage
        await exec(videoUrl, {
            format: 'worstaudio', // Download the smallest source file
            extractAudio: true,
            audioFormat: 'opus',  // Most efficient codec
            audioQuality: 9,      // Maximum compression
            output: finalFile,
            noPlaylist: true,
            noPart: true,
            concurrentFragments: 16, // Keep these for parallel speed boost
            noMtime: true,
            ffmpegLocation: ffmpegInstaller,
            jsRuntimes: 'node',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });

        console.log(`[DEBUG] DOWNLOAD COMPLETE: ${songId}.opus`);

        // RE-LOAD users just before saving to avoid overwriting parallel downloads
        const currentUsers = loadUsers();
        const currentUser = currentUsers.find(u => u.username.toLowerCase() === username.toLowerCase());

        if (!currentUser) {
            console.log(`[DEBUG] USER LOST: "${username}" during download`);
            return res.status(404).json({ error: 'User not found during save' });
        }

        // FINAL SECURITY CHECK: Prevent duplicates that might have finished in parallel
        if (currentUser.songs.find(s => s.originalId === videoId)) {
            console.log(`[DEBUG] PARALLEL DUPLICATE suppressed for user ${username}`);
            return res.status(400).json({ error: 'This song was already added by a parallel download.' });
        }

        if (currentUser.songs.length >= 5) {
            console.log(`[DEBUG] LIMIT REACHED for user ${username}`);
            return res.status(400).json({ error: 'Max 5 songs allowed' });
        }

        const newSong = {
            id: songId,
            title: title,
            originalId: videoId,
            path: `/assets/${songId}.opus`,
            duration: duration // Store the actual duration
        };

        currentUser.songs.push(newSong);
        saveUsers(currentUsers);

        console.log(`[DEBUG] SONG SAVED to user "${username}"`);
        res.json({ message: 'Song added', song: newSong });

    } catch (error) {
        console.error('[DEBUG] ADD SONG FAILED:', error);
        res.status(500).json({ error: 'Failed to download song' });
    }
});

// Remove Song
app.delete('/api/users/:username/songs/:id', (req, res) => {
    const { username, id } = req.params;
    let users = loadUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user) return res.status(404).json({ error: 'User not found' });

    const songIndex = user.songs.findIndex(s => s.id === id);
    if (songIndex === -1) return res.status(404).json({ error: 'Song not found' });

    const song = user.songs[songIndex];
    // We keep the file in case other users have it? For simplicity, we can delete if unique, 
    // but for this study, just unlinking from user is fine. The file can persist.

    user.songs.splice(songIndex, 1);
    saveUsers(users);

    res.json({ message: 'Song removed', count: user.songs.length });
});

app.get('/api/users/:username', (req, res) => {
    const { username } = req.params;
    let users = loadUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Don't separate password
    const { password, ...safeUser } = user;
    res.json(safeUser);
});

// -- LOGIN & CHALLENGE --

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    let users = loadUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.password !== password) return res.status(401).json({ error: 'Invalid password' });

    res.json({ message: 'Login successful', username: user.username });
});

// Generate Challenge (Server-side logic)
// In a real session, we'd store state. For APIs, we can just return random snippet config
app.get('/api/challenge/:username', (req, res) => {
    const { username } = req.params;
    const excludeIds = req.query.exclude ? req.query.exclude.split(',') : [];

    let users = loadUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user || user.songs.length < 3) return res.status(400).json({ error: 'Not enough songs' });

    // Filter available songs (exclude ones used in this session)
    const availableTargets = user.songs.filter(s => !excludeIds.includes(s.id));

    if (availableTargets.length === 0) {
        return res.status(400).json({ error: 'No more songs available' });
    }

    // Pick target from available unique songs
    const targetSong = availableTargets[Math.floor(Math.random() * availableTargets.length)];

    // Distractors
    let options = [targetSong];
    const pool = user.songs.filter(s => s.id !== targetSong.id);

    // Simple shuffle
    pool.sort(() => 0.5 - Math.random());
    options.push(...pool.slice(0, 2)); // Add 2 distractors
    options.sort(() => 0.5 - Math.random()); // Shuffle options

    // Generate Verification Token (contains snippet instructions)
    const duration = targetSong.duration || 30; // Use stored duration, fallback to 30s for legacy
    const snippetDuration = 1; // 1s snippet
    const startTime = Math.floor(Math.random() * (duration - snippetDuration));

    const token = Buffer.from(JSON.stringify({
        songId: targetSong.id,
        start: startTime
    })).toString('base64');

    res.json({
        options,
        targetId: targetSong.id, // In a real secure system, don't send this obviously
        audioUrl: `/api/snippet/${token}`
    });
});

// Stream Snippet
app.get('/api/snippet/:token', (req, res) => {
    try {
        const payload = JSON.parse(Buffer.from(req.params.token, 'base64').toString());
        const { songId, start } = payload;

        const filePath = path.join(ASSETS_DIR, `${songId}.opus`);

        if (!fs.existsSync(filePath)) return res.status(404).send('Audio not found');

        // Stream random slice using ffmpeg to pipe to response
        ffmpeg(filePath)
            .setStartTime(start)
            .setDuration(1)
            .format('mp3')
            .on('error', (err) => {
                if (!res.headersSent) res.status(500).end();
            })
            .pipe(res, { end: true });

    } catch (e) {
        res.status(400).send('Invalid token');
    }
});

// Record Metrics
app.post('/api/metrics', (req, res) => {
    const { username, metric } = req.body;
    let users = loadUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (user) {
        user.metrics.push(metric);
        saveUsers(users);
    }
    res.json({ success: true });
});


// Catch-all to serve index.html for React Router compatibility
if (fs.existsSync(path.join(__dirname, '../dist'))) {
    app.get('/:path*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(__dirname, '../dist/index.html'));
        }
    });
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
