# ClearView News

AI-powered news analysis browser extension that provides bias detection, fact-checking, and alternative perspectives.

## Prerequisites

- Node.js 20+
- Docker (optional, for containerized deployment)

## Quick Start

### Backend Setup

```bash
cd backend
cp ../.env.example .env
# Edit .env with your API keys
npm install
npm run build
npm start
```

### Extension Setup

```bash
cd extension
npm install
npm run build
```

Load the extension in Chrome:
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/dist` folder

## Docker Deployment

```bash
# Copy environment file and configure
cp .env.example .env
# Edit .env with your API keys

# Build and start services
cd backend && npm run build && cd ..
docker-compose build
docker-compose up -d
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `OPENAI_MODEL` | No | Model to use (default: gpt-5) |
| `EXA_API_KEY` | Yes | Exa research API key |
| `REDIS_URL` | No | Redis connection URL |
| `CROSSREF_EMAIL` | No | Email for CrossRef API (improves rate limits) |
| `DAILY_COST_CAP` | No | Daily API cost limit in USD (default: 50) |

## API Endpoints

- `GET /health` - Health check
- `POST /api/analyze` - Analyze article content
