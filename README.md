# FitHit — Marketing & Waitlist Website

Product marketing and waitlist site for **FitHit**, the smart boxing kiosk.

## Tech

- Pure HTML/CSS/JS — no build step, no bundler
- [Netlify](https://netlify.com) for hosting, forms, and serverless functions
- Netlify Forms — zero-config waitlist capture
- Netlify Functions — scalable serverless API (`netlify/functions/subscribe.js`)

## Project Structure

```
.
├── index.html                   # Main site (single page)
├── logo.png                     # FitHit logo asset
├── netlify.toml                 # Netlify build + redirect config
├── .gitignore
└── netlify/
    └── functions/
        └── subscribe.js         # Waitlist signup serverless function
```

## Deploy to Netlify via GitHub

1. Push this folder to a GitHub repository
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import from Git**
3. Connect the repo — Netlify auto-detects `netlify.toml`
4. Click **Deploy site** — done

Netlify Forms activates automatically on first deploy (the hidden forms in `index.html` are detected at build time).

## Waitlist Storage (Serverless Function)

The function at `/.netlify/functions/subscribe` supports three storage backends.  
Set the relevant environment variables in **Netlify → Site settings → Environment variables**:

| Backend   | Variables needed |
|-----------|-----------------|
| Airtable  | `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE_NAME` |
| Supabase  | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` |
| Resend (email notify) | `RESEND_API_KEY`, `NOTIFY_EMAIL` |

Without any variables set, signups are logged to Netlify function logs and captured by Netlify Forms — both work on free tier.

## Local Development

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Start local dev server with functions
netlify dev
```

The site will be available at `http://localhost:8888`.
