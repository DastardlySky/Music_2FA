# Hosting on Vercel & Railway (Guide)

Since this project requires a Node.js backend with `ffmpeg` and `yt-dlp` (which are binary dependencies), a standard Vercel deployment of the frontend is easy, but the **backend requires more consideration**.

## Option 1: Railway (Recommended for Backend)
Railway is much better suited for apps with binary dependencies like `ffmpeg` because it supports **Nixpacks** and **Docker**.

1.  **Create a Account**: Go to [Railway.app](https://railway.app).
2.  **New Project**: Connect your GitHub repository.
3.  **Variable Configuration**:
    - Add `PORT` = `3001`
    - Railway will automatically detect the `npm run server` command.
4.  **Binary Support**: Add the following file to your root directory (`railway.json`) to ensure `ffmpeg` is available:
    ```json
    {
      "$schema": "https://railway.app/v1.json",
      "build": {
        "builder": "NIXPACKS"
      }
    }
    ```
5.  **Persistent Storage**: Since `users.json` and `public/assets/` are local files, they will be wiped on every deployment unless you attach a **Volume** in Railway settings to `/server` and `/public/assets`.

---

## Option 2: Vercel (Complex for this Stack)
Vercel is primarily for **Serverless Functions**. Running `ffmpeg` and `yt-dlp` inside a Serverless Function is possible but difficult due to the 250MB bundle limit and 30s timeout.

### Deployment Steps:
1.  **Project Structure**: You must convert the Express server to a Vercel Serverless Function by creating a `api/index.js` or using a `vercel.json` configuration.
2.  **yt-dlp binaries**: The `yt-dlp-exec` package will try to download the binary during build, which might fail on Vercel's read-only filesystem.
3.  **Storage**: Vercel has a read-only filesystem. You **cannot** save `users.json` or `.opus` files to the disk.
    - **Fix**: You must replace `users.json` with a database (like MongoDB or Supabase).
    - **Fix**: You must upload downloaded songs to an S3 bucket (like AWS S3 or Vercel Blob) instead of `public/assets`.

### Configuration (`vercel.json`):
```json
{
  "version": 2,
  "rewrites": [
    { "source": "/api/(.*)", "destination": "server/index.js" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Summary Recommendation
For a study prototype where you want to keep the "flat file" (`users.json`) logic:
1.  **Hosting**: Use **Railway** or **Render** for the backend.
2.  **Persistent Data**: Add a persistent volume for the `server/` and `public/assets/` directories.
3.  **Frontend**: You can host the frontend on Vercel and point it to your Railway backend URL.

### Environment Variables
In your frontend, update the API URL:
- `VITE_API_URL` = `https://your-backend-url.railway.app`
