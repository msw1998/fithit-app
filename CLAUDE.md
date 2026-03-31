# FitHit Boxing — Kiosk UI

## Project Overview
A touch-screen kiosk UI for a smart boxing punch machine, running on a Raspberry Pi (10" screen). Built with Flask (Python) + vanilla HTML/CSS/JS. No frontend framework.

## Tech Stack
- **Backend**: Flask (`app.py`) — serves templates, manages sessions
- **Frontend**: Jinja2 templates, Bootstrap 5.3 (quickstart only), custom CSS per page
- **Real-time**: Microsoft SignalR v8 (`/static/js/signalr-connection.js`) connected to Azure backend
- **Auth**: QR code scanned on phone → SignalR `DEVICE_SESSION_AUTHORIZE` → Flask session

## Brand / Design Language
All pages must follow these rules — no exceptions:

```css
--fh-navy:     #26215C;
--fh-indigo:   #3C3489;   /* primary button colour */
--fh-purple:   #7F77DD;   /* accents, borders */
--fh-lavender: #AFA9EC;   /* labels, subtitles */
--fh-dark-bg:  #1A1730;   /* page background */
```
- Background: `#1A1730` + `radial-gradient(ellipse 80% 50% at 50% -10%, #26215C 0%, transparent 70%)`
- Font: `"Segoe UI", Roboto, sans-serif`
- Buttons: `height 76–88px`, `border-radius 8px`, touch-friendly (users wear fingerless gloves)
- Back button: fixed top-left, `border: 1.5px solid --fh-purple`, transparent background
- Section labels: `13–16px`, `letter-spacing 0.1em`, uppercase, `--fh-lavender`
- Dark mode throughout — no light backgrounds except QR code container

## Pages & Routes
| Route | Template | Notes |
|---|---|---|
| `/` | `main.html` | Landing — Quick Start + Login buttons |
| `/quickstart` | `quickstart.html` | Height, level, workout, rounds, intensity → POST → `/calibration` |
| `/calibration` | `calibration.html` | Countdown, detects player, redirects to `/single-fight` |
| `/single-fight` | `single-fight.html` | Single-player fight UI |
| `/fight` | `fight.html` | Two-player fight UI |
| `/login` | `login.html` | SignalR QR auth — redirects to `/dashboard` on success |
| `/dashboard` | `dashboard.html` | Post-login welcome, fighter stats, 3 action buttons |
| `/start-a-fight` | `start-a-fight.html` | Tabbed fighter browser (Friends / Community / Anybody) |
| `/logout` | — | Clears Flask session → `/` |

## SignalR / Auth Flow
1. `/login` renders — JS connects to `wss://<AZURE_HOST>/fightHub?deviceId=<MACHINE_ID>`
2. JS invokes `InitiateDeviceSession` with `{ machineId: "<uuid>" }`
3. Server pushes `DEVICE_SESSION_QR` → payload: `{ qRCode: "<base64>", machineId }`
4. QR displayed on screen. Auto-refreshes every 45s (server expiry: 30s–1min)
5. User scans QR on phone → authenticates → server pushes `DEVICE_SESSION_AUTHORIZE`
6. Payload: `{ fighterId: "<uuid>", machineId }` — JS POSTs to `/api/set-fighter`
7. Flask stores `fighter_id` in session → JS redirects to `/dashboard`

**Azure SignalR URL**: `https://fithit-api-dev-southuk-01-gpbxfrg6eufqghcr.uksouth-01.azurewebsites.net`
**Hub path**: `/fightHub`
**Machine ID**: hardcoded UUID in `signalr-connection.js` — must be unique per device
**Auth on socket**: currently open (token auth coming in a future phase from Saud)

## Session Keys (Flask)
- `session['fighter_id']` — GUID from `DEVICE_SESSION_AUTHORIZE`
- `session['fighter_name']` — placeholder, populated when profile REST endpoint is ready (Phase 3)

## Fighter REST API (implemented)
- **Auth**: OAuth2 client credentials → `POST https://fithit-uat.uk.auth0.com/oauth/token` → Bearer token (24h, cached server-side in `_token_cache`)
- **Profile**: `GET /api/fighters/{fighter_id}` → `name`, `nickname`, `weightClass`, `guest`
- **Stats**: `GET /api/fighters/{fighter_id}/stats` → `wins`, `losses`, `draws`, `totalFights`
- Both called in `app.py:/api/set-fighter` immediately after QR auth; results stored in Flask session
- Dashboard displays: nickname (heading), full name + weight class (subtitle), wins/losses/draws/total (stat cards)

## Known Pending Items (Phase 3)
- Socket connection auth (token-based) — Saud to provide guidance

## File Structure
```
fithit-app/
├── app.py
├── static/
│   ├── css/style.css          # legacy shared styles (being phased out per-page)
│   ├── js/signalr-connection.js
│   └── images/                # logo assets
├── templates/
│   ├── main.html
│   ├── quickstart.html
│   ├── calibration.html
│   ├── login.html
│   ├── dashboard.html
│   ├── start-a-fight.html
│   ├── single-fight.html
│   ├── fight.html
│   └── login_success_mobile.html
└── CLAUDE.md
```

## Key Conventions
- Each template is self-contained with its own `<style>` block — no shared CSS framework dependency
- Bootstrap 5.3 still used in `quickstart.html` for grid layout only
- Touch targets minimum 64px height
- All pages session-protected except `/`, `/quickstart`, `/login`
