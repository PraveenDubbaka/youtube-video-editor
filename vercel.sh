#!/bin/bash
# Helper script for Vercel deployment

echo "Starting Vercel deployment preparation..."

# Clean up any previous builds
echo "Cleaning previous builds..."
rm -rf dist

# Install dependencies 
echo "Installing dependencies..."
npm install

# Build the app for production
echo "Building Angular app..."
npm run build

# Ensure the browser output directory exists
if [ ! -d "dist/youtube-editor/browser" ]; then
  echo "Error: Build output directory not found!"
  echo "Expected path: dist/youtube-editor/browser"
  exit 1
fi

# Copy index.html to 404.html for SPA routing
echo "Setting up SPA routing..."
cp dist/youtube-editor/browser/index.html dist/youtube-editor/browser/404.html

echo "Deployment preparation complete."
echo "Your app is ready to be deployed to Vercel!"