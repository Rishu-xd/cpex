# CPex GitHub Bridge (Browser Extension)

This Manifest V3 extension stores your GitHub `.env` credentials (`GITHUB_TOKEN`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and allowed CPex origins) locally in `chrome.storage.local` and proxies CPex GitHub operations securely without requiring server-side `.env.local` secrets.

## Install Unpacked in Chrome / Edge / Brave

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select the `extension/` folder inside this repository.

## Setup Options

Click the **CPex GitHub Bridge** toolbar icon:

- **Option A — Paste `.env` contents**: Paste your `.env` / `.env.local` lines (`GITHUB_TOKEN=...`, `GITHUB_CLIENT_ID=...`, `GITHUB_CLIENT_SECRET=...`, `NEXT_PUBLIC_APP_URL=...`) and click **Import .env & Save**.
- **Option B — Direct Personal Access Token**: Enter a GitHub PAT with `repo` scope and click **Save & Verify Token**.
- **Option C — OAuth App inside Extension**: Enter `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`, register the displayed `OAuth Callback` URL in your GitHub OAuth App settings, and click **Sign in via GitHub OAuth**.

Reload the CPex playground tab and open **GitHub Repos** in the left sidebar.
