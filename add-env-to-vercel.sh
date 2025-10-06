#!/bin/bash
# Script to add environment variables to Vercel

echo "📝 Adding environment variables to Vercel..."
echo ""
echo "This will read from your .env file and add them to Vercel production"
echo ""

# Read .env and show variables (without values for security)
echo "Found these variables in .env:"
grep -v "^#" .env | grep "=" | cut -d'=' -f1 | while read var; do
  echo "  - $var"
done

echo ""
echo "To add them to Vercel, run these commands:"
echo ""
grep -v "^#" .env | grep "=" | while IFS='=' read key value; do
  # Remove quotes from value
  value=$(echo "$value" | sed 's/^"//;s/"$//')
  echo "echo '$value' | npx vercel env add $key production"
done
