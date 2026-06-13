#!/bin/bash

# ═══════════════════════════════════════════════════════════════
#  ExpenseCloud — Automated Setup Script
#  Run this to deploy ExpenseCloud in minutes!
# ═══════════════════════════════════════════════════════════════

set -e

echo "🚀 ExpenseCloud — Deployment Script"
echo "════════════════════════════════════════════════════════════"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "⚠️  Firebase CLI not found. Installing globally..."
    npm install -g firebase-tools
fi

echo "✅ Firebase CLI version: $(firebase --version)"
echo ""

# Step 1: Authentication
echo "📝 Step 1/4: Firebase Authentication"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -p "Have you already created a Firebase project? (y/n): " HAS_PROJECT

if [ "$HAS_PROJECT" = "n" ] || [ "$HAS_PROJECT" = "N" ]; then
    echo ""
    echo "📌 Create a Firebase project:"
    echo "   1. Go to https://console.firebase.google.com"
    echo "   2. Click 'Add project' → Follow wizard"
    echo "   3. Name: 'ExpenseCloud'"
    echo "   4. Enable Google Analytics (optional)"
    echo "   5. Wait for project to initialize"
    echo ""
    read -p "Press ENTER when Firebase project is ready..."
fi

echo ""
echo "🔐 Step 2/4: Firebase Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Logging into Firebase..."
firebase login

echo ""
echo "📱 Step 3/4: Function Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "expensecloud-backend/expensecloud-backend/functions" || exit

echo "Installing dependencies..."
npm install

echo ""
echo "Deploying Cloud Functions..."
firebase deploy --only functions

cd - > /dev/null || exit

echo ""
echo "✅ Cloud Functions deployed successfully!"
echo ""

echo "🎨 Step 4/4: Frontend Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Get your Firebase Config:"
echo "   1. Go to Firebase Console"
echo "   2. Project Settings (⚙️)"
echo "   3. Your apps → Web app"
echo "   4. Copy the config object"
echo ""
echo "📝 Update firebaseConfig.js with your config"
echo ""

echo "🌐 Testing Application"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✨ Your ExpenseCloud is ready!"
echo ""
echo "📋 Quick Checklist:"
echo "  ☐ Update Firebase config in firebaseConfig.js"
echo "  ☐ Open expensecloud-frontend.html in browser"
echo "  ☐ Sign up with email & password"
echo "  ☐ Add a test transaction"
echo "  ☐ Verify real-time dashboard update"
echo ""
echo "📚 Next Steps:"
echo "  1. Read README.md for full documentation"
echo "  2. Check QUICK_START.md for detailed setup"
echo "  3. Explore PROJECT_SUMMARY.md for features"
echo ""
echo "🚀 Ready to deploy to Firebase Hosting?"
read -p "Deploy to Firebase Hosting? (y/n): " DEPLOY_HOSTING

if [ "$DEPLOY_HOSTING" = "y" ] || [ "$DEPLOY_HOSTING" = "Y" ]; then
    echo ""
    echo "Deploying to Firebase Hosting..."
    firebase deploy --only hosting
    echo "✅ Website is live!"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✨ ExpenseCloud Setup Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "💡 Tips:"
echo "  • Monitor functions: firebase functions:log"
echo "  • Run locally: firebase emulators:start"
echo "  • View database: Firebase Console → Firestore"
echo ""
echo "📞 Need help? Check the documentation files in the project!"
echo ""
