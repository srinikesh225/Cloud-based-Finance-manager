# Quick Implementation Checklist

## Pre-Setup (5 minutes)
- [ ] Have Firebase Project created
- [ ] Have Node.js 14+ installed
- [ ] Have Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Have a SendGrid account (or similar email service)
- [ ] Have an API key from your email service

## Step 1: Initialize Cloud Functions (5 minutes)
```bash
cd expensecloud-backend
firebase init functions
```
- [ ] Select JavaScript
- [ ] Install dependencies automatically

## Step 2: Install Dependencies (3 minutes)
```bash
cd functions
npm install firebase-admin firebase-functions cors dotenv nodemailer nodemailer-sendgrid-transport pdfkit
```
- [ ] All packages installed successfully
- [ ] No errors in console

## Step 3: Configure Environment (2 minutes)
Create `functions/.env`:
```
SENDGRID_API_KEY=your_api_key_here
SENDER_EMAIL=noreply@expensecloud.com
```
- [ ] `.env` file created
- [ ] API key added
- [ ] Sender email configured

## Step 4: Copy Code Files (10 minutes)
- [ ] Copy `anomaly-alert.js` to `functions/`
- [ ] Copy `weekly-digest.js` to `functions/`
- [ ] Copy `monthly-report.js` to `functions/`
- [ ] Update `functions/index.js` with imports

## Step 5: Set Firebase Rules (5 minutes)
- [ ] Update Firestore security rules
- [ ] Enable Cloud Functions API in Firebase Console
- [ ] Enable Pub/Sub in Google Cloud Console

## Step 6: Deploy (5 minutes)
```bash
firebase deploy --only functions
```
- [ ] All functions deployed successfully
- [ ] Check Firebase Console for any errors

## Step 7: Update Database Schema (5 minutes)
Create sample user document with:
```
{
  email: "user@example.com",
  name: "User Name",
  notificationPreferences: {
    anomalyAlert: true,
    weeklyDigest: true,
    monthlyReport: true
  }
}
```
- [ ] Schema updated
- [ ] Sample user created for testing

## Step 8: Test Each Feature (15 minutes)

### Test Anomaly Alert:
- [ ] Add a high-value transaction
- [ ] Check email inbox for anomaly alert
- [ ] Verify email formatting

### Test Weekly Digest:
- [ ] Manually trigger function (or wait until Monday)
- [ ] Verify email with statistics
- [ ] Check category breakdown

### Test Monthly Report:
- [ ] Manually trigger function (or wait until 1st of month)
- [ ] Verify PDF attachment
- [ ] Check PDF content

## Step 9: Add Frontend UI (10 minutes)
- [ ] Create notification settings page
- [ ] Add checkboxes for preferences
- [ ] Implement save functionality
- [ ] Test preference updates

## Step 10: Monitor & Maintain (Ongoing)
- [ ] Check function logs weekly
- [ ] Monitor email delivery rates
- [ ] Update anomaly thresholds as needed
- [ ] Review user feedback

---

## Total Time Estimate: ~65 minutes

### Quick Reference Commands
```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:detectAnomaly

# View logs
firebase functions:log

# Test locally
firebase serve --only functions

# Clear old logs
firebase functions:log --limit 10
```

### Common Issues & Quick Fixes

**Issue: "Permission denied" error**
```bash
# Solution: Login again
firebase login
```

**Issue: Email not sending**
```
Check:
1. API key is correct in .env
2. Sender email is verified in SendGrid
3. User email is valid
4. Check spam folder
```

**Issue: Function timeout**
```
Edit firebase.json:
{
  "functions": {
    "timeoutSeconds": 540
  }
}
```

**Issue: PDF not generating**
```bash
# Reinstall pdfkit
npm uninstall pdfkit
npm install pdfkit
```

---

## Testing Email Addresses

Use these for testing:
- **Mailtrap.io** - Free email testing
- **Ethereal Email** - Temporary test emails
- **SendGrid Sandbox** - Built-in testing

