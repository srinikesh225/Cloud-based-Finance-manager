# Quick Start - Clerk Email Integration for ExpenseCloud

## 5-Minute Setup

### Step 1: Get Your Clerk Secret Key (2 min)
1. Go to https://dashboard.clerk.com/last-active?path=api-keys
2. Click "Backend"
3. Copy the "Secret Key" (starts with `sk_test_`)

### Step 2: Set Up Gmail (2 min)
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer"
3. Copy the generated password (e.g., `xxxx xxxx xxxx xxxx`)

### Step 3: Configure Environment (1 min)
```bash
cd functions
cp .env.example .env
```

Edit `.env`:
```env
CLERK_SECRET_KEY=sk_test_YOUR_KEY_HERE
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
APP_URL=https://expensecloud.app
```

## What Gets Sent

### 1. Anomaly Alert Email (Real-time)
Triggers when spending > 2× user's category average

**Example:**
```
Subject: 🚨 Unusual Spending Alert: Food

Content:
- Your ₹5,000 Food transaction is 5× your usual ₹1,000
- Shows category breakdown
- Includes dashboard link
```

### 2. Budget Alert Email (Real-time)
Triggers when monthly spending exceeds budget

**Example:**
```
Subject: ⚠️ Budget Alert: You've Exceeded Your Limit

Content:
- You spent ₹60,000 (₹10,000 over your ₹50,000 limit)
- Progress visualization (120%)
- Budget management recommendations
```

### 3. Weekly Digest Email (Every Sunday 8 AM)
Summarizes the week's spending

**Example:**
```
Subject: 📊 Your Weekly Spending Summary

Content:
- Total spent: ₹35,000
- Daily average: ₹5,000
- Top categories: Food (₹12,000), Travel (₹8,000), etc.
- Week-over-week comparison
```

## Testing

### Test Email Sending
```bash
# Create a test expense to trigger emails
firebase emulators:start --only functions

# In another terminal:
firebase emulators:exec '
  const admin = require("firebase-admin");
  const db = admin.firestore();
  
  await db.collection("users/TEST_USER_ID/transactions").add({
    type: "expense",
    amount: 50000,
    category: "Food",
    date: admin.firestore.Timestamp.now()
  });
'
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid login" | Use Gmail App Password, not regular password |
| Emails not sent | Check `.env` file is set correctly |
| Emails in spam | Add email domain SPF/DKIM records |
| Function errors | Check Firebase logs: `firebase functions:log` |

## Files Created/Modified

```
✅ NEW: anomaly-alert.js          - Anomaly alert emails
✅ NEW: weekly-digest.js          - Budget & digest emails
✅ MODIFIED: index.js             - Integrated email sending
✅ MODIFIED: package.json         - Added dependencies
✅ NEW: .env.example              - Configuration template
✅ NEW: .gitignore                - Protect .env file
✅ NEW: EMAIL_SETUP.md            - Detailed setup guide
```

## Deploy to Firebase

```bash
# From functions directory
firebase deploy --only functions
```

## Next Steps

1. ✅ Set up `.env` file
2. ✅ Test locally with emulator
3. ✅ Deploy to Firebase
4. ✅ Create test transaction
5. ✅ Check email inbox for test email

## Support

See [EMAIL_SETUP.md](./EMAIL_SETUP.md) for detailed setup and troubleshooting.

---

**Need help?**
- Check Firebase Logs: `firebase functions:log`
- Verify Clerk API key: https://dashboard.clerk.com/last-active?path=api-keys
- Gmail Settings: https://myaccount.google.com/apppasswords
