#!/bin/bash

# Image Optimization Script for Gossip App
# This script helps you optimize your app icons to reduce APK size

echo "🖼️  Image Optimization Guide for Gossip App"
echo "==========================================="
echo ""

# Check current sizes
echo "📊 Current Image Sizes:"
echo "----------------------"
du -h assets/app-icon.png 2>/dev/null || echo "❌ app-icon.png not found"
du -h assets/images/app-logo.png 2>/dev/null || echo "❌ app-logo.png not found"
echo ""

# Show image dimensions
echo "📐 Current Image Dimensions:"
echo "---------------------------"
file assets/app-icon.png 2>/dev/null | grep -o '[0-9]* x [0-9]*' || echo "❌ Cannot read app-icon.png"
file assets/images/app-logo.png 2>/dev/null | grep -o '[0-9]* x [0-9]*' || echo "❌ Cannot read app-logo.png"
echo ""

echo "🎯 Optimization Recommendations:"
echo "--------------------------------"
echo "Current: 1024x1024 PNG (~1 MB each)"
echo "Target:  512x512 PNG (<50 KB each)"
echo "Savings: ~1.9 MB total"
echo ""

echo "🛠️  How to Optimize:"
echo "-------------------"
echo ""
echo "Option 1: Online Tools (Easiest)"
echo "  1. Go to https://tinypng.com/"
echo "  2. Upload assets/app-icon.png"
echo "  3. Download optimized version"
echo "  4. Replace original file"
echo "  5. Repeat for assets/images/app-logo.png"
echo ""
echo "Option 2: ImageOptim (Mac)"
echo "  1. Install ImageOptim: https://imageoptim.com/"
echo "  2. Drag and drop your images"
echo "  3. It will optimize in place"
echo ""
echo "Option 3: Command Line (sips - Mac built-in)"
echo "  # Resize to 512x512"
echo "  sips -Z 512 assets/app-icon.png"
echo "  sips -Z 512 assets/images/app-logo.png"
echo ""
echo "  # Then compress with ImageOptim or TinyPNG"
echo ""

echo "✅ After optimization, your images should be:"
echo "  - Size: <50 KB each"
echo "  - Dimensions: 512x512 (or 1024x1024 if highly compressed)"
echo "  - Format: PNG with transparency"
echo ""

echo "🚀 Next Steps:"
echo "-------------"
echo "1. Optimize images using one of the methods above"
echo "2. Rebuild your app: cd android && ./gradlew assembleRelease"
echo "3. Check new APK size - should be ~2 MB smaller"
echo ""

# Offer to resize (but not compress) using sips
echo "Would you like to resize the images to 512x512 now? (y/n)"
echo "(Note: This only resizes, you'll still need to compress them)"
