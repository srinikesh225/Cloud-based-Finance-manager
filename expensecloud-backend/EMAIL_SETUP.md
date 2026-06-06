# Email Configuration Guide - ExpenseCloud

This guide explains how to set up Clerk email notifications for anomaly alerts, budget alerts, and weekly digest emails.

## Prerequisites

1. **Firebase Project** with Cloud Functions enabled
2. **Clerk Account** for authentication and user management
3. **Email Service** (Gmail, SendGrid, or similar)
4. **Node.js 18+** for running functions

## Environment Variables

Create a `.env` file in the `functions/` directory with the following variables:

```env
# Clerk Configuration
CLERK_SECRET_KEY=your_clerk_secret_key_here

# Email Service Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your_app_specific_password
# For Gmail, use an App Password: https://myaccount.google.com/apppasswords

# Application Configuration
APP_URL=https://expensecloud.app
USE_CLERK_EMAIL=false  # Set to true if using Clerk's native email system

# Firebase Configuration (auto-configured in index.js)
# The Firebase Admin SDK will use your service account credentials
```

## Step-by-Step Setup

### 1. Get Your Clerk Secret Key

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **API Keys** → **Backend**
3. Copy your **Secret Key**
4. Add it to `.env`:
   ```env
   CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
   ```

### 2. Configure Email Service

#### Option A: Gmail (Recommended for Development)

1. Enable 2-Factor Authentication on your Gmail account
2. Create an App Password:
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable 2-Step Verification if not already enabled
   - Create an [App Password](https://myaccount.google.com/apppasswords)
   - Select "Mail" and "Windows Computer" (or relevant options)
   - Copy the generated password
3. Add to `.env`:
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
   ```

#### Option B: SendGrid

1. Sign up for [SendGrid](https://sendgrid.com)
2. Get your API key from Settings → API Keys
3. Modify `anomaly-alert.js` and `weekly-digest.js`:
   ```javascript
   const sgMail = require('@sendgrid/mail');
   sgMail.setApiKey(process.env.SENDGRID_API_KEY);
   
   // Replace transporter.sendMail with sgMail.send()
   ```
4. Add to `.env`:
   ```env
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
   ```

#### Option C: AWS SES

1. Configure AWS credentials
2. Verify email addresses in SES
3. Update `nodemailer` config:
   ```javascript
   const aws = require('@aws-sdk/client-ses');
   const transporter = nodemailer.createTransport({
     SES: new aws.SES({ region: 'us-east-1' })
   });
   ```

### 3. Install Dependencies

```bash
cd functions
npm install
```

Dependencies will include:
- `@clerk/clerk-sdk-node` - Clerk SDK for user management
- `nodemailer` - Email sending library
- `firebase-admin` - Firebase Admin SDK
- `firebase-functions` - Cloud Functions SDK

### 4. Deploy Cloud Functions

```bash
# From the functions directory
firebase deploy --only functions
```

Or deploy specific functions:
```bash
firebase deploy --only functions:checkBudgetAlert,functions:detectAnomaly,functions:sendWeeklyDigest
```

## Email Templates

The email module includes professionally designed HTML templates for:

### 1. Anomaly Alert Emails
- **Triggered**: When unusual spending detected (>2× category average)
- **Contains**: Category, amount, usual average, multiplier, action link
- **Schedule**: Real-time (triggered immediately)

### 2. Budget Alert Emails
- **Triggered**: When monthly spending exceeds budget limit
- **Contains**: Total spent, budget limit, overshoot amount, percentage over, recommendations
- **Schedule**: Real-time (triggered immediately)

### 3. Weekly Digest Emails
- **Triggered**: Every Sunday at 8 AM IST
- **Contains**: Total spent, daily average, top 5 categories, week-over-week comparison
- **Schedule**: Weekly (scheduled)

## Testing Email Functionality

### 1. Test with Local Functions Emulator

```bash
firebase emulators:start --only functions
```

### 2. Trigger Test Events

You can simulate transactions to test email sending:

```javascript
// Test anomaly alert
const testTxn = {
  type: 'expense',
  amount: 50000,  // High amount to trigger anomaly
  category: 'Food',
  description: 'Restaurant',
  date: admin.firestore.Timestamp.now()
};

await db.collection('users/{userId}/transactions').add(testTxn);
```

### 3. Check Email Delivery

- Check your email inbox for test messages
- Check Firebase Cloud Functions logs:
  ```bash
  firebase functions:log
  ```

## Troubleshooting

### "Failed to send email: Invalid login"
- Verify `EMAIL_USER` and `EMAIL_PASSWORD` are correct
- For Gmail, ensure you're using an App Password, not your main password
- Check if 2FA is enabled on the email account

### "Clerk was not loaded with UI components"
- This is in the frontend Clerk integration, not email-related
- Ensure Clerk is properly initialized in your app

### "Missing CLERK_SECRET_KEY"
- Add `CLERK_SECRET_KEY` to `.env` file
- Deploy functions after updating `.env`:
  ```bash
  firebase deploy --only functions
  ```

### Emails not being sent
- Check Cloud Functions logs: `firebase functions:log`
- Verify user email is stored in Firestore
- Ensure email notifications are enabled in user settings
- Check spam/junk folders

### CORS errors
- Email sending from Cloud Functions shouldn't have CORS issues
- If using HTTP endpoints, add proper headers

## Customizing Email Templates

Edit the HTML templates in:
- `anomaly-alert.js` - Line containing `htmlContent` for anomaly emails
- `weekly-digest.js` - Lines with `htmlContent` for digest and budget emails

## Production Deployment

Before deploying to production:

1. **Update APP_URL** in `.env`:
   ```env
   APP_URL=https://your-production-domain.com
   ```

2. **Use Production Email Service**:
   - Switch from test keys to production keys
   - Use a dedicated email account or SendGrid/SES

3. **Enable Email Logging**:
   - Add user consent tracking for email preferences
   - Log all email sends to Firestore for audit

4. **Set up Email Monitoring**:
   - Configure bounce/complaint handling
   - Monitor email delivery rates

5. **Test in Staging**:
   ```bash
   # Deploy to staging first
   firebase deploy --only functions --project=expensecloud-staging
   ```

## API Endpoints

### Update FCM Token
Used by the mobile app to register for push notifications:

```bash
curl -X POST https://your-firebase-region-projectid.cloudfunctions.net/updateFcmToken \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -d '{"token":"FCM_TOKEN_HERE"}'
```

## Support & Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Nodemailer Documentation](https://nodemailer.com/)
- [SendGrid Documentation](https://docs.sendgrid.com/)
