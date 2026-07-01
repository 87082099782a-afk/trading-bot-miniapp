# Trading Bot Control Panel

Telegram Mini App control panel for a Binance trading bot managed through n8n webhooks.

## Safety Defaults

- Real trading is blocked in the frontend.
- Every n8n payload forces `dryRun: true`.
- Every n8n payload forces `realTrading: false`.
- Every n8n payload forces `canTrade: false`.
- Binance, Telegram, OpenAI, and Perplexity keys must stay only in n8n credentials.
- The frontend uses only the n8n webhook base URL from environment variables.

## Install

```bash
npm install
```

## Run Locally

```bash
cp .env.example .env
npm run dev
```

Open the local Vite URL. Outside Telegram, the app uses a demo fallback user and shows:

```text
Открыто вне Telegram. Доступен только preview режим.
```

## Environment Variables

Create `.env` locally and add the same variables in Vercel:

```env
VITE_APP_NAME=Trading Bot Control
VITE_N8N_WEBHOOK_BASE_URL=https://almaz2607kz.app.n8n.cloud/webhook
VITE_ALLOWED_USER_ID=8300266144
VITE_REQUEST_TIMEOUT_MS=20000
```

`VITE_N8N_WEBHOOK_BASE_URL` is required. If it is missing, the app renders a clear configuration error instead of crashing.

## Build

```bash
npm run build
```

## Deploy to Vercel

1. Import the GitHub repository into Vercel.
2. Add the environment variables listed above.
3. Use the default Vite build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Deploy.

`vercel.json` includes an SPA fallback so Telegram deep links load the app correctly.

## BotFather Setup

After Vercel deploys, copy the production URL, for example:

```text
https://your-project.vercel.app
```

In BotFather, configure the bot Web App/Menu Button URL with that Vercel URL.

## n8n Start Button

In the n8n `/start` workflow response, use the same Vercel URL for the Telegram Web App button. Keep all exchange and AI provider secrets in n8n credentials.

## Real Mode

The Real Mode screen only sends a confirmation request to:

```text
POST /telegram-miniapp/confirm-real-mode
```

The frontend never enables real trading by itself. Real orders remain blocked by UI state and by every request payload.
