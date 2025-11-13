#!/bin/bash

# Maxxit Microservices Monorepo Setup Script
# This script creates the complete directory structure for the microservices architecture

set -e

echo "🚀 Setting up Maxxit Microservices Monorepo..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the Maxxit directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the Maxxit root directory"
    exit 1
fi

echo "${BLUE}📁 Creating monorepo directory structure...${NC}"
echo ""

# Create main directories
mkdir -p {services,apps,packages,infrastructure,scripts}

# Create service directories
echo "${GREEN}✓${NC} Creating Node.js service directories..."
services=(
    "api-gateway"
    "auth-service"
    "agent-service"
    "signal-service"
    "trade-execution-service"
    "deployment-service"
    "position-monitor-service"
    "safe-wallet-service"
    "notification-service"
    "analytics-service"
    "billing-service"
)

for service in "${services[@]}"; do
    mkdir -p "services/$service/src"/{controllers,services,routes,models,middleware,config,utils}
    mkdir -p "services/$service/tests"/{unit,integration}
    echo "${GREEN}  ✓${NC} Created services/$service/"
done

# Create Python service directories
echo "${GREEN}✓${NC} Creating Python service directories..."
python_services=("hyperliquid-service" "ostium-service" "twitter-proxy-service")

for service in "${python_services[@]}"; do
    mkdir -p "services/$service"/{app,tests}
    echo "${GREEN}  ✓${NC} Created services/$service/"
done

# Create apps directory
echo "${GREEN}✓${NC} Creating apps directory..."
mkdir -p apps/frontend/src/{components,pages,hooks,contexts,lib,styles}
mkdir -p apps/frontend/public
echo "${GREEN}  ✓${NC} Created apps/frontend/"

# Create packages directory
echo "${GREEN}✓${NC} Creating shared packages..."
mkdir -p packages/common/src/{types,interfaces,constants,utils}
mkdir -p packages/auth-middleware/src
mkdir -p packages/prisma-schemas/{agent-schema,signal-schema,shared-schema}
echo "${GREEN}  ✓${NC} Created packages/common/"
echo "${GREEN}  ✓${NC} Created packages/auth-middleware/"
echo "${GREEN}  ✓${NC} Created packages/prisma-schemas/"

# Create infrastructure directory
echo "${GREEN}✓${NC} Creating infrastructure directory..."
mkdir -p infrastructure/{kubernetes,terraform,prometheus,postgres}
mkdir -p infrastructure/kubernetes/{deployments,services,configmaps,secrets}
echo "${GREEN}  ✓${NC} Created infrastructure/"

echo ""
echo "${BLUE}📝 Creating package.json files...${NC}"
echo ""

# Root package.json
cat > package.json << 'EOF'
{
  "name": "maxxit-platform",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "services/*",
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "clean": "turbo run clean",
    "docker:up": "docker-compose -f docker-compose.microservices.yml up -d",
    "docker:down": "docker-compose -f docker-compose.microservices.yml down",
    "docker:logs": "docker-compose -f docker-compose.microservices.yml logs -f"
  },
  "devDependencies": {
    "turbo": "^1.11.0",
    "typescript": "^5.3.3"
  }
}
EOF
echo "${GREEN}  ✓${NC} Created root package.json"

# Turbo.json
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "clean": {
      "cache": false
    }
  }
}
EOF
echo "${GREEN}  ✓${NC} Created turbo.json"

# Create service package.json templates
for service in "${services[@]}"; do
    cat > "services/$service/package.json" << EOF
{
  "name": "@maxxit/$service",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "lint": "eslint src/**/*.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "@maxxit/common": "*",
    "@maxxit/auth-middleware": "*"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.10.5",
    "typescript": "^5.3.3",
    "ts-node-dev": "^2.0.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11",
    "eslint": "^8.56.0"
  }
}
EOF
done

# Create Python service requirements.txt templates
for service in "${python_services[@]}"; do
    cat > "services/$service/requirements.txt" << 'EOF'
flask==3.0.0
python-dotenv==1.0.0
requests==2.31.0
gunicorn==21.2.0
psycopg2-binary==2.9.9
EOF
done

# Common package
cat > packages/common/package.json << 'EOF'
{
  "name": "@maxxit/common",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.3.3"
  }
}
EOF

# Auth middleware package
cat > packages/auth-middleware/package.json << 'EOF'
{
  "name": "@maxxit/auth-middleware",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "jsonwebtoken": "^9.0.2",
    "express": "^4.18.2",
    "@maxxit/common": "*"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.5",
    "@types/express": "^4.17.21",
    "typescript": "^5.3.3"
  }
}
EOF

# Frontend package.json
cat > apps/frontend/package.json << 'EOF'
{
  "name": "@maxxit/frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.8",
    "eslint": "^8.56.0"
  }
}
EOF

echo ""
echo "${BLUE}📄 Creating Dockerfile templates...${NC}"
echo ""

# Dockerfile template for Node.js services
for service in "${services[@]}"; do
    cat > "services/$service/Dockerfile" << 'EOF'
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

EXPOSE 4000

CMD ["npm", "start"]
EOF
    echo "${GREEN}  ✓${NC} Created Dockerfile for $service"
done

# Dockerfile template for Python services
for service in "${python_services[@]}"; do
    cat > "services/$service/Dockerfile" << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "app:app"]
EOF
    echo "${GREEN}  ✓${NC} Created Dockerfile for $service"
done

echo ""
echo "${BLUE}📝 Creating README files...${NC}"
echo ""

# Create README for each service
for service in "${services[@]}"; do
    cat > "services/$service/README.md" << EOF
# $service

## Description
[Add description of this service]

## API Endpoints
[Document API endpoints]

## Environment Variables
\`\`\`
PORT=4000
DATABASE_URL=postgresql://...
\`\`\`

## Development
\`\`\`bash
npm install
npm run dev
\`\`\`

## Testing
\`\`\`bash
npm test
\`\`\`

## Deployment
\`\`\`bash
npm run build
npm start
\`\`\`
EOF
done

echo ""
echo "${BLUE}🔧 Creating TypeScript configs...${NC}"
echo ""

# Root tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "resolveJsonModule": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "exclude": ["node_modules", "dist"]
}
EOF

# Copy tsconfig to each service
for service in "${services[@]}"; do
    cp tsconfig.json "services/$service/tsconfig.json"
done

# Copy tsconfig to packages
cp tsconfig.json packages/common/tsconfig.json
cp tsconfig.json packages/auth-middleware/tsconfig.json

echo ""
echo "${BLUE}🔐 Creating .env.example...${NC}"
echo ""

cat > .env.example << 'EOF'
# Database
DATABASE_URL=postgresql://maxxit:maxxit_dev_password@localhost:5432/maxxit

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
LUNARCRUSH_API_KEY=...

# Blockchain
RPC_URL_ARBITRUM=https://arb1.arbitrum.io/rpc
EXECUTOR_PRIVATE_KEY=0x...
SAFE_MODULE_ADDRESS=0x...

# External Services
TWITTER_API_KEY=...
TWITTER_API_SECRET=...
TWITTER_ACCESS_TOKEN=...
TWITTER_ACCESS_SECRET=...

TELEGRAM_BOT_TOKEN=...
SENDGRID_API_KEY=...
STRIPE_SECRET_KEY=sk_test_...

# Python Services
OSTIUM_API_URL=https://api.ostium.io
EOF

echo ""
echo "${GREEN}✅ Monorepo structure created successfully!${NC}"
echo ""
echo "${YELLOW}📋 Next steps:${NC}"
echo "1. Review the generated structure"
echo "2. Copy .env.example to .env and fill in values"
echo "3. Install dependencies: ${BLUE}npm install${NC}"
echo "4. Start services: ${BLUE}npm run docker:up${NC}"
echo "5. Begin migrating services one by one"
echo ""
echo "${YELLOW}📚 Documentation:${NC}"
echo "- MICROSERVICES_ARCHITECTURE.md"
echo "- MICROSERVICES_MIGRATION_PLAN.md"
echo ""
echo "🎉 Happy coding!"

