# YouTube Cookie Authentication Setup

If you're experiencing bot detection errors from YouTube, you can authenticate using browser cookies from your logged-in YouTube account.

## Option 1: Quick Setup (Recommended for Railway)

### Step 1: Install Browser Extension
1. Install **"Get cookies.txt LOCALLY"** extension:
   - Chrome: https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc
   - Firefox: https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/

### Step 2: Export YouTube Cookies
1. Go to https://youtube.com and **log in to your account**
2. Click the extension icon in your browser
3. Click **"Export as cookies.txt"**
4. Save the file as `youtube_cookies.txt`

### Step 3: Add Cookies to Railway

**Option A: Environment Variable (Simpler)**
1. Open the `youtube_cookies.txt` file in a text editor
2. Copy the entire contents
3. In Railway, go to your service → **Variables** tab
4. Add a new variable:
   - Name: `YOUTUBE_COOKIES`
   - Value: Paste the entire cookie file content
5. Redeploy

**Option B: Volume File (More Secure)**
1. You'll need to manually upload the file to your Railway volume
2. Use Railway's CLI or SSH access:
   ```bash
   railway run bash
   cat > /data/youtube_cookies.txt
   # Paste your cookies here, then press Ctrl+D
   ```

### Step 4: Set Cookie Path Environment Variable
In Railway Variables, add:
- Name: `YOUTUBE_COOKIE_FILE`
- Value: `/data/youtube_cookies.txt` (if using volume) or leave empty (if using env var)

The server will automatically detect and use the cookies.

---

## Option 2: Use Your Browser Directly (yt-dlp built-in)

Instead of exporting cookies manually, yt-dlp can extract them directly from your browser. This requires the browser to be installed on the server, which Railway doesn't support. **This only works for local development.**

For local testing, you can add:
```javascript
cookiesFromBrowser: 'chrome'  // or 'firefox', 'safari', etc.
```

---

## Security Notes

⚠️ **Important**: Your YouTube cookies contain sensitive authentication data. 

- **Never commit `youtube_cookies.txt` to git**
- **Use environment variables on Railway** to keep cookies private
- **Regenerate cookies periodically** (they expire after ~6 months typically)
- If you change your YouTube password, you'll need to export new cookies

---

## Troubleshooting

**Cookies not working?**
1. Make sure you're logged in to YouTube when exporting
2. Try logging out and back in, then re-export
3. Check that Railway has the correct environment variable set
4. Cookies might need to include `accounts.google.com` as well - export from that page too

**Still getting bot errors?**
YouTube might have rate-limited your account. Try:
- Waiting 24 hours
- Using a different Google account
- Running the service locally on your personal connection instead of Railway
