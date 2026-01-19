#!/bin/bash

# App Icon and Splash Screen Verification Script
# This script helps verify that the icon and splash screen are correctly configured

echo "🔍 Verifying App Icon and Splash Screen Configuration..."
echo ""

# Check if app-icon.png exists
if [ -f "./assets/app-icon.png" ]; then
    echo "✅ Custom app icon found: ./assets/app-icon.png"
    file ./assets/app-icon.png
else
    echo "❌ Custom app icon NOT found at ./assets/app-icon.png"
fi

echo ""

# Check iconBackground color
ICON_BG=$(grep "iconBackground" android/app/src/main/res/values/colors.xml | grep -o '#[0-9a-fA-F]*')
if [ "$ICON_BG" = "#000000" ]; then
    echo "✅ Icon background color is black ($ICON_BG) - No white square!"
else
    echo "⚠️  Icon background color is $ICON_BG (should be #000000)"
fi

echo ""

# Check splash screen background
SPLASH_BG=$(grep "splashscreen_background" android/app/src/main/res/values/colors.xml | grep -o '#[0-9a-fA-F]*')
if [ "$SPLASH_BG" = "#000000" ]; then
    echo "✅ Splash screen background is black ($SPLASH_BG)"
else
    echo "⚠️  Splash screen background is $SPLASH_BG (should be #000000)"
fi

echo ""

# Check if CustomSplashScreen component exists
if [ -f "./components/CustomSplashScreen.tsx" ]; then
    echo "✅ Custom splash screen component found"
else
    echo "❌ Custom splash screen component NOT found"
fi

echo ""

# Check app.json splash configuration
if grep -q "expo-splash-screen" app.json; then
    echo "✅ Splash screen plugin configured in app.json"
    echo "   Image: $(grep -A 5 "expo-splash-screen" app.json | grep "image" | cut -d'"' -f4)"
    echo "   Background: $(grep -A 5 "expo-splash-screen" app.json | grep "backgroundColor" | cut -d'"' -f4)"
else
    echo "❌ Splash screen plugin NOT configured in app.json"
fi

echo ""
echo "📱 To test on device:"
echo "   1. Connect Android device or start emulator"
echo "   2. Run: npx expo run:android"
echo "   3. Verify:"
echo "      - App icon has NO white square background"
echo "      - Splash screen shows with your custom branding"
echo ""
