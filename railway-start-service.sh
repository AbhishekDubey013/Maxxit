#!/bin/bash
# Railway start script for microservices
# Usage: ./railway-start-service.sh <service-name>

SERVICE_NAME=$1

if [ -z "$SERVICE_NAME" ]; then
  echo "Error: Service name required"
  echo "Usage: ./railway-start-service.sh <service-name>"
  exit 1
fi

echo "🚀 Starting $SERVICE_NAME..."
cd services/$SERVICE_NAME
npm start

