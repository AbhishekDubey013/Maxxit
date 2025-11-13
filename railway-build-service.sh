#!/bin/bash
# Railway build script for microservices
# Usage: ./railway-build-service.sh <service-name>

set -e

SERVICE_NAME=$1

if [ -z "$SERVICE_NAME" ]; then
  echo "Error: Service name required"
  echo "Usage: ./railway-build-service.sh <service-name>"
  exit 1
fi

echo "🔨 Building shared library..."
cd services/shared
npm install
npm run build
cd ../..

echo "🔨 Building $SERVICE_NAME..."
cd services/$SERVICE_NAME
npm install
npm run build

echo "✅ Build complete!"

