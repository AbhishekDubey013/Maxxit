# Node.js Dockerfile for Workers
FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy dependency files AND Prisma schema (needed for postinstall)
COPY package*.json ./
COPY prisma ./prisma

# Install Node.js dependencies (postinstall will run prisma generate)
RUN npm install --legacy-peer-deps

# Copy application code
COPY . .

# Start command
CMD ["bash", "workers/start-railway.sh"]

