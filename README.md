# Trading Bot Control Panel

Telegram Mini App control panel for a Binance trading bot managed through n8n webhooks.

## Safety Defaults

- Real trading is blocked in the frontend.
- Every n8n payload forces `dryRun: true`.
- Every n8n payload forces `realTrading: false`.
- Every n8n payload forces `canTrade: false`.
- Binance, Telegram, OpenAI, and Perplexity keys must stay only in n8n credentials.
- The frontend uses only the n8n webhook base URL from environment variables.

## Local Install

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

The GitHub Pages workflow injects these build variables automatically:

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

## Deploy to GitHub Pages

Deployment is handled by `.github/workflows/deploy.yml`.

On every push to `main`, GitHub Actions will:

1. Install dependencies with `npm install`.
2. Build the Vite app with `npm run build`.
3. Upload `dist` as a GitHub Pages artifact.
4. Deploy the artifact to GitHub Pages.

The production URL is:

```text
https://87082099782a-afk.github.io/trading-bot-miniapp/
```

The Vite config uses:

```js
base: "/trading-bot-miniapp/"
```

## BotFather Setup

After the GitHub Pages workflow succeeds, use this URL as the Telegram Web App/Menu Button URL in BotFather:

```text
https://87082099782a-afk.github.io/trading-bot-miniapp/
```

## n8n Start Button

In the n8n `/start` workflow response, use the same GitHub Pages URL for the Telegram Web App button. Keep all exchange and AI provider secrets in n8n credentials.

## Real Mode

The Real Mode screen only sends a confirmation request to:

```text
POST /telegram-miniapp/confirm-real-mode
```

The frontend never enables real trading by itself. Real orders remain blocked by UI state and by every request payload.
