# Trading Bot Control Panel

Production Telegram Mini App for trading-bot control through n8n.

GitHub Pages URL:

```text
https://87082099782a-afk.github.io/trading-bot-miniapp/
```

Telegram bot:

```text
https://t.me/Bossst11as_bot
```

## Safety Defaults

- `dryRun: true`
- `realTrading: false`
- `canTrade: false`
- frontend never enables real trading by itself
- real orders are blocked in UI and request payload
- Telegram token, Binance secret, OpenAI key, MT5 password, and provider API keys are not stored in code

## Frontend Defaults

- `selectedSymbol = XAUUSD`
- `selectedProvider = mt5`
- `selectedMarket = metals`
- `selectedTimeframe = 15m`
- default trading mode: `Balanced`
- default auto mode: `ANALYSIS_ONLY`

## n8n API

All frontend actions call:

```text
POST https://almaz2607kz.app.n8n.cloud/webhook/telegram-miniapp/action
```

Every payload includes:

```json
{
  "dryRun": true,
  "realTrading": false,
  "canTrade": false
}
```

The frontend sends an `action` field such as `status`, `get_signal`, `get_opportunity_radar`, `start_paper_trading`, `diagnostics`, or `self_repair`.

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## GitHub Pages Deploy

Deployment is handled by `.github/workflows/deploy.yml`.

On push to `main`, GitHub Actions:

1. Installs dependencies with `npm install`.
2. Builds with `npm run build`.
3. Uploads `dist` as a Pages artifact.
4. Deploys to GitHub Pages.
5. If repository secret `TELEGRAM_BOT_TOKEN` exists, configures the Telegram Menu Button and bot commands.

Required Vite build env is defined inside the workflow:

```env
VITE_APP_NAME=Trading Bot Control
VITE_N8N_WEBHOOK_BASE_URL=https://almaz2607kz.app.n8n.cloud/webhook
VITE_ALLOWED_USER_ID=8300266144
VITE_REQUEST_TIMEOUT_MS=20000
```

## Credentials Still Needed

Configure these only in n8n credentials or safe environment secrets:

- MT5 credentials
- Binance credentials
- AI provider keys
- Telegram bot token as GitHub secret `TELEGRAM_BOT_TOKEN` if automatic menu setup is desired
