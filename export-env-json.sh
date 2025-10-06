#!/bin/bash
# Convert .env to JSON format

echo "{"
grep -v '^#' .env | grep '=' | while IFS='=' read -r key value; do
  # Remove quotes from value
  value=$(echo "$value" | sed 's/^"//;s/"$//')
  # Escape backslashes and quotes for JSON
  value=$(echo "$value" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g')
  echo "  \"$key\": \"$value\","
done | sed '$ s/,$//'
echo "}"
