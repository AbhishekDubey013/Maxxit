#!/bin/bash

# Railway Deployment Checklist
# Run this before deploying to Railway

echo "🚂 Railway Deployment Pre-Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass=0
fail=0
warn=0

# Check 1: Railway config file
echo -n "Checking railway.json... "
if [ -f "railway.json" ]; then
  echo -e "${GREEN}✓ Found${NC}"
  ((pass++))
else
  echo -e "${RED}✗ Missing${NC}"
  echo "  Create railway.json with build and deploy config"
  ((fail++))
fi

# Check 2: Worker script
echo -n "Checking workers/start-railway.sh... "
if [ -f "workers/start-railway.sh" ]; then
  echo -e "${GREEN}✓ Found${NC}"
  ((pass++))
else
  echo -e "${RED}✗ Missing${NC}"
  ((fail++))
fi

# Check 3: Prisma schema
echo -n "Checking prisma/schema.prisma... "
if [ -f "prisma/schema.prisma" ]; then
  echo -e "${GREEN}✓ Found${NC}"
  ((pass++))
else
  echo -e "${RED}✗ Missing${NC}"
  ((fail++))
fi

# Check 4: Package.json
echo -n "Checking package.json... "
if [ -f "package.json" ]; then
  echo -e "${GREEN}✓ Found${NC}"
  ((pass++))
else
  echo -e "${RED}✗ Missing${NC}"
  ((fail++))
fi

# Check 5: All worker files exist
echo -n "Checking worker files... "
missing_workers=0
for worker in "tweet-ingestion-worker.ts" "signal-generator.ts" "trade-executor-worker.ts" "position-monitor-v2.ts"; do
  if [ ! -f "workers/$worker" ]; then
    echo -e "${RED}✗ Missing workers/$worker${NC}"
    ((missing_workers++))
  fi
done

if [ $missing_workers -eq 0 ]; then
  echo -e "${GREEN}✓ All workers present${NC}"
  ((pass++))
else
  echo -e "${RED}✗ $missing_workers worker(s) missing${NC}"
  ((fail++))
fi

# Check 6: Git status
echo -n "Checking git status... "
if git rev-parse --git-dir > /dev/null 2>&1; then
  uncommitted=$(git status --porcelain | wc -l)
  if [ $uncommitted -eq 0 ]; then
    echo -e "${GREEN}✓ Clean (no uncommitted changes)${NC}"
    ((pass++))
  else
    echo -e "${YELLOW}⚠ $uncommitted uncommitted changes${NC}"
    echo "  Run: git add . && git commit -m 'deploy: railway config'"
    ((warn++))
  fi
else
  echo -e "${RED}✗ Not a git repository${NC}"
  ((fail++))
fi

# Check 7: .gitignore includes .env
echo -n "Checking .gitignore... "
if [ -f ".gitignore" ] && grep -q "\.env" ".gitignore"; then
  echo -e "${GREEN}✓ .env files ignored${NC}"
  ((pass++))
else
  echo -e "${YELLOW}⚠ Make sure .env files are in .gitignore${NC}"
  ((warn++))
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Results: ${GREEN}$pass passed${NC}, ${YELLOW}$warn warnings${NC}, ${RED}$fail failed${NC}"
echo ""

if [ $fail -eq 0 ]; then
  echo -e "${GREEN}✅ Ready for Railway deployment!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Push to GitHub: git push origin main"
  echo "  2. Create Railway project: https://railway.app/new"
  echo "  3. Connect GitHub repo"
  echo "  4. Add PostgreSQL database"
  echo "  5. Set environment variables (see RAILWAY_ENV_VARS.txt)"
  echo "  6. Deploy!"
  echo ""
  echo "See RAILWAY_DEPLOYMENT.md for detailed guide"
else
  echo -e "${RED}❌ Fix the issues above before deploying${NC}"
  exit 1
fi

