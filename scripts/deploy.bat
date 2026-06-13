@echo off
REM ═══════════════════════════════════════════════════════════════
REM  ExpenseCloud — Automated Setup Script (Windows)
REM  Run this to deploy ExpenseCloud in minutes!
REM ═══════════════════════════════════════════════════════════════

setlocal enabledelayedexpansion

echo.
echo 🚀 ExpenseCloud — Deployment Script (Windows)
echo ════════════════════════════════════════════════════════════
echo.

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

echo ✅ Node.js is installed

REM Check Firebase CLI
firebase --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Firebase CLI not found. Installing globally...
    call npm install -g firebase-tools
)

echo ✅ Firebase CLI is installed
echo.

REM Step 1
echo 📝 Step 1/4: Firebase Authentication
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

set /p HAS_PROJECT="Have you already created a Firebase project? (y/n): "

if /i not "%HAS_PROJECT%"=="y" (
    echo.
    echo 📌 Create a Firebase project:
    echo    1. Go to https://console.firebase.google.com
    echo    2. Click 'Add project' - Follow wizard
    echo    3. Name: 'ExpenseCloud'
    echo    4. Enable Google Analytics (optional)
    echo    5. Wait for project to initialize
    echo.
    pause
)

echo.
echo 🔐 Step 2/4: Firebase Configuration
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo Logging into Firebase...
call firebase login

echo.
echo 📱 Step 3/4: Function Deployment
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

cd "expensecloud-backend\expensecloud-backend\functions"

echo Installing dependencies...
call npm install

echo.
echo Deploying Cloud Functions...
call firebase deploy --only functions

cd ..\..\..\

echo.
echo ✅ Cloud Functions deployed successfully!
echo.

echo 🎨 Step 4/4: Firebase Config Update
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo 📍 Get your Firebase Config:
echo    1. Go to Firebase Console
echo    2. Project Settings (⚙️)
echo    3. Your apps - Web app
echo    4. Copy the config object
echo.
echo 📝 Update firebaseConfig.js with your config
echo.

echo 🌐 Frontend Ready!
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo ✨ Your ExpenseCloud is ready!
echo.
echo 📋 Quick Checklist:
echo    ☐ Update Firebase config in firebaseConfig.js
echo    ☐ Open expensecloud-frontend.html in browser
echo    ☐ Sign up with email + password
echo    ☐ Add a test transaction
echo    ☐ Verify real-time dashboard update
echo.
echo 📚 Next Steps:
echo    1. Read README.md for full documentation
echo    2. Check QUICK_START.md for detailed setup
echo    3. Explore PROJECT_SUMMARY.md for features
echo.

set /p DEPLOY_HOSTING="🚀 Deploy to Firebase Hosting? (y/n): "

if /i "%DEPLOY_HOSTING%"=="y" (
    echo.
    echo Deploying to Firebase Hosting...
    call firebase deploy --only hosting
    echo ✅ Website is live!
)

echo.
echo ════════════════════════════════════════════════════════════
echo ✨ ExpenseCloud Setup Complete!
echo ════════════════════════════════════════════════════════════
echo.
echo 💡 Tips:
echo    • Monitor functions: firebase functions:log
echo    • Run locally: firebase emulators:start
echo    • View database: Firebase Console - Firestore
echo.
echo 📞 Need help? Check the documentation files in the project!
echo.
pause
