#!/bin/bash
# =============================================================================
# Ibn Al-Azhar Docs — Environment Fix Script
# Automatically fixes common .env configuration issues
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔧 Ibn Al-Azhar Docs — Environment Fix Script"
echo "=============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${GREEN}✅ .env created from .env.example${NC}"
fi

echo "Checking .env configuration..."
echo ""

# Function to check and fix empty values
fix_empty_value() {
    local key=$1
    local default_value=$2
    local current_value=$(grep "^${key}=" .env | cut -d'=' -f2-)
    
    if [ -z "$current_value" ] || [ "$current_value" = '""' ] || [ "$current_value" = "''" ]; then
        echo -e "${YELLOW}⚠️  ${key} is empty${NC}"
        echo "   Setting default value: ${default_value}"
        
        # Use different sed syntax for macOS vs Linux
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^${key}=.*|${key}=${default_value}|" .env
        else
            sed -i "s|^${key}=.*|${key}=${default_value}|" .env
        fi
        
        echo -e "${GREEN}   ✅ Fixed${NC}"
        return 0
    else
        echo -e "${GREEN}✅ ${key} is set${NC}"
        return 1
    fi
}

# Function to generate random password
generate_password() {
    openssl rand -base64 24 | tr -d "=+/" | cut -c1-20
}

# Track if any changes were made
CHANGES_MADE=0

# Fix REDIS_PASSWORD
if fix_empty_value "REDIS_PASSWORD" "redis_strong_password_$(date +%s)"; then
    CHANGES_MADE=1
fi

# Fix GEMINI_API_KEY (with warning)
current_gemini=$(grep "^GEMINI_API_KEY=" .env | cut -d'=' -f2-)
if [ -z "$current_gemini" ] || [ "$current_gemini" = '""' ] || [ "$current_gemini" = "''" ]; then
    echo -e "${YELLOW}⚠️  GEMINI_API_KEY is empty${NC}"
    echo "   Setting placeholder (MUST be replaced with real key)"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^GEMINI_API_KEY=.*|GEMINI_API_KEY=AIzaSyDummyKeyForDevelopment_REPLACE_ME|" .env
    else
        sed -i "s|^GEMINI_API_KEY=.*|GEMINI_API_KEY=AIzaSyDummyKeyForDevelopment_REPLACE_ME|" .env
    fi
    
    echo -e "${RED}   ⚠️  THIS IS A PLACEHOLDER — GET REAL KEY FROM:${NC}"
    echo -e "${YELLOW}   https://aistudio.google.com/app/apikey${NC}"
    CHANGES_MADE=1
fi

# Fix MINIO_ACCESS_KEY
if fix_empty_value "MINIO_ACCESS_KEY" "minioadmin"; then
    CHANGES_MADE=1
fi

# Fix MINIO_SECRET_KEY
if fix_empty_value "MINIO_SECRET_KEY" "minioadmin"; then
    CHANGES_MADE=1
fi

# Fix AUTH_SECRET if empty
current_auth_secret=$(grep "^AUTH_SECRET=" .env | cut -d'=' -f2-)
if [ -z "$current_auth_secret" ] || [ "$current_auth_secret" = '""' ] || [ "$current_auth_secret" = "''" ]; then
    new_auth_secret=$(openssl rand -base64 32 | tr -d '\n')
    echo -e "${YELLOW}⚠️  AUTH_SECRET is empty${NC}"
    echo "   Generating new secret..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^AUTH_SECRET=.*|AUTH_SECRET=${new_auth_secret}|" .env
    else
        sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=${new_auth_secret}|" .env
    fi
    
    echo -e "${GREEN}   ✅ Generated${NC}"
    CHANGES_MADE=1
else
    echo -e "${GREEN}✅ AUTH_SECRET is set${NC}"
fi

# Fix ADMIN_PASSWORD if it's weak
current_admin_password=$(grep "^ADMIN_PASSWORD=" .env | cut -d'=' -f2- | tr -d '"')
if [ -z "$current_admin_password" ] || [ "$current_admin_password" = "Admin@123456" ] || [ "$current_admin_password" = "CHANGE_ME" ]; then
    new_admin_password=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-20)
    echo -e "${YELLOW}⚠️  ADMIN_PASSWORD is weak or empty${NC}"
    echo "   Generating strong password..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${new_admin_password}|" .env
    else
        sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${new_admin_password}|" .env
    fi
    
    echo -e "${GREEN}   ✅ Generated: ${new_admin_password}${NC}"
    echo -e "${YELLOW}   ⚠️  SAVE THIS PASSWORD!${NC}"
    CHANGES_MADE=1
else
    echo -e "${GREEN}✅ ADMIN_PASSWORD is set${NC}"
fi

# Check DATABASE_URL format
current_db_url=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2-)
if [[ ! "$current_db_url" =~ ^postgresql:// ]]; then
    echo -e "${RED}❌ DATABASE_URL format is incorrect${NC}"
    echo "   Fixing..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' 's|^DATABASE_URL=.*|DATABASE_URL="postgresql://ibn_docs:ibn_docs_password@localhost:5433/ibn_docs?schema=public"|' .env
    else
        sed -i 's|^DATABASE_URL=.*|DATABASE_URL="postgresql://ibn_docs:ibn_docs_password@localhost:5433/ibn_docs?schema=public"|' .env
    fi
    
    echo -e "${GREEN}   ✅ Fixed${NC}"
    CHANGES_MADE=1
else
    echo -e "${GREEN}✅ DATABASE_URL format is correct${NC}"
fi

echo ""
echo "=============================================="

if [ $CHANGES_MADE -eq 1 ]; then
    echo -e "${GREEN}✅ .env file has been fixed!${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
    echo "1. Check .env and verify all values are correct"
    echo "2. Replace GEMINI_API_KEY with your real API key from:"
    echo "   https://aistudio.google.com/app/apikey"
    echo "3. Save the ADMIN_PASSWORD shown above (you'll need it to login)"
    echo ""
    echo "Run the following to restart services:"
    echo "  ./ibn.sh dev-infra"
    echo "  pnpm --filter @ibn-al-azhar-docs/web dev"
else
    echo -e "${GREEN}✅ All required values are already set!${NC}"
fi

echo ""
echo "For more help, see: TROUBLESHOOTING.md"
