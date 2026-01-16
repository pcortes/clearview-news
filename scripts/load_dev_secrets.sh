#!/bin/bash
set -e

echo "🔐 Loading secrets from Google Secret Manager..."

# Check authentication
if ! gcloud auth application-default print-access-token &>/dev/null; then
    echo "❌ Not authenticated. Please run:"
    echo "   gcloud auth application-default login"
    exit 1
fi

# Use same project as moderndoc (shared API keys)
PROJECT_ID="theta-voyager-455802-u6"

# Function to safely get secret
get_secret() {
    local secret_name=$1
    local value=$(gcloud secrets versions access latest --secret=$secret_name --project=$PROJECT_ID 2>/dev/null || echo "")
    if [ -z "$value" ]; then
        echo "⚠️  Warning: Secret $secret_name not found in Secret Manager"
        echo "your_${secret_name,,}_here"
    else
        echo "$value"
    fi
}

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Create backend/.env file from Secret Manager
cat > "$PROJECT_ROOT/backend/.env" << EOF
# Loaded from Google Secret Manager on $(date)
# DO NOT COMMIT THIS FILE

# Server
PORT=3000
API_URL=http://localhost:3000

# OpenAI (GPT-5)
OPENAI_API_KEY=$(get_secret "OPENAI_API_KEY")
OPENAI_MODEL=gpt-5

# Exa (search/fact-checking)
EXA_API_KEY=$(get_secret "EXA_API_KEY")

# Redis (local development)
REDIS_URL=redis://localhost:6379

# Cost tracking
DAILY_COST_CAP=50
EOF

echo "✅ Secrets loaded to backend/.env"
echo ""
echo "⚠️  Security reminders:"
echo "   - Never commit .env files"
echo "   - This file is gitignored for your safety"
echo "   - Secrets are synced with Google Secret Manager"
echo ""
echo "🚀 To start the backend:"
echo "   cd backend && npm run build && npm start"

# Verify .env is gitignored
if ! grep -q "^\.env$" "$PROJECT_ROOT/.gitignore" 2>/dev/null; then
    echo ""
    echo "🚨 WARNING: .env is not in .gitignore!"
fi
