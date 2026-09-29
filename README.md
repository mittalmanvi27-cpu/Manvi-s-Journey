# Manvi Mittal — Portfolio

Pinterest-style portfolio with a masonry "board", scroll/hover animations, dark mode and an AI chat assistant.

## Run locally
Open `index.html` in a browser. No build step. The AI chat uses built-in answers from `data.js`.

## Edit content
Everything (projects, pins, AI answers) is in **`data.js`**.

## Deploy (Vercel)
1. Push this folder to a GitHub repo.
2. Import it on vercel.com (Framework preset: **Other**).
3. Optional, for real Gemini AI answers: in Vercel → Settings → Environment Variables add
   `GEMINI_API_KEY` (from https://aistudio.google.com/apikey). Optional: `GEMINI_MODEL` (default `gemini-2.5-flash`).

The chat calls `/api/chat` (`api/chat.js`). If there's no key or the call fails, it falls back to the built-in answers, so the site always works.
