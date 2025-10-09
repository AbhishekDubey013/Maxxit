# Node.js Dockerfile for Workers
FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --legacy-peer-deps

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Copy application code
COPY . .

# Start command
CMD ["bash", "workers/start-railway.sh"]

