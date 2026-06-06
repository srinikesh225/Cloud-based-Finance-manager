# Clerk Email Integration - Quick Reference Guide

## 🎯 What Was Implemented

Your ExpenseCloud app now sends **3 types of emails** via Clerk:

### 1️⃣ Anomaly Alert Email
```
WHEN:     Real-time (when unusual spending detected)
SUBJECT:  🚨 Unusual Spending Alert: [Category]
EXAMPLE:  ₹5,000 Food expense is 5× your usual ₹1,000
INCLUDES: Amount, category avg, multiplier, dashboard link
```

### 2️⃣ Budget Alert Email  
```
WHEN:     Real-time (when monthly budget exceeded)
SUBJECT:  ⚠️ Budget Alert: You've Exceeded Your Limit
EXAMPLE:  You spent ₹60,000 (₹10,000 over ₹50,000 limit)
INCLUDES: Total, budget, overshoot, % over, recommendations
```

### 3️⃣ Weekly Digest Email
```
WHEN:     Every Sunday at 8 AM IST
SUBJECT:  📊 Your Weekly Spending Summary
EXAMPLE:  Total: ₹35,000 | Daily avg: ₹5,000 | Top: Food
INCLUDES: Stats, top categories, week-over-week comparison
```

---

## 🚀 Quick Setup (3 Simple Steps)

### Step 1: Get Clerk Secret Key
```
👉 https://dashboard.clerk.com/last-active?path=api-keys
   Click "Backend" → Copy "Secret Key"
```

### Step 2: Create Gmail App Password
```
👉 https://myaccount.google.com/apppasswords
   Select "Mail" + "Windows Computer"
   Copy generated password
```

### Step 3: Set Environment Variables
```bash
cd functions
cp .env.example .env

# Edit .env with:
CLERK_SECRET_KEY=sk_test_YOUR_KEY
EMAIL_USER=your@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
APP_URL=https://expensecloud.app
```

---

## 📦 Files You Need To Know About

```
Project Root
├── 📄 IMPLEMENTATION_COMPLETE.md      ← Read first (summary)
├── 📄 QUICKSTART_EMAIL.md             ← 5-minute setup guide
├── 📄 CLERK_EMAIL_INTEGRATION.md      ← Architecture details
└── expensecloud-backend/
    ├── 📄 EMAIL_SETUP.md              ← Detailed setup (all services)
    ├── 📄 QUICKSTART_EMAIL.md         ← Copy here for quick reference
    └── functions/
        ├── 📄 .env.example            ← Configuration template
        ├── 📄 .gitignore              ← Protects .env secrets
        ├── 📄 anomaly-alert.js        ← NEW: Anomaly emails
        ├── 📄 weekly-digest.js        ← NEW: Budget & digest emails
        ├── 📄 index.js                ← MODIFIED: Calls email functions
        └── 📄 package.json            ← MODIFIED: Added dependencies
```

---

## ✅ Deployment Checklist

- [ ] **Clerk Secret Key** copied from dashboard
- [ ] **Gmail App Password** created and copied
- [ ] **.env file** created with all 4 variables
- [ ] **Local test** with Firebase emulator passed
- [ ] **Test email** received in inbox
- [ ] **Production deploy** ready: `firebase deploy --only functions`

---

## 🧪 Quick Test

### Test 1: Anomaly Alert
```javascript
// Create high-value transaction to trigger anomaly
await db.collection('users/YOUR_UID/transactions').add({
  type: 'expense',
  amount: 50000,
  category: 'Food',
  date: admin.firestore.Timestamp.now()
});
// ✅ Check email for anomaly alert
```

### Test 2: Budget Alert
```javascript
// Create expenses totaling over budget (default: ₹50,000)
await db.collection('users/YOUR_UID/transactions').add({
  type: 'expense',
  amount: 60000,  // Over ₹50,000 budget
  category: 'General',
  date: admin.firestore.Timestamp.now()
});
// ✅ Check email for budget alert
```

### Test 3: Weekly Digest
```
// Manually triggered every Sunday at 8 AM IST
// Or test locally: add 7 days of transactions, run function
// ✅ Check email for weekly summary
```

---

## 🔍 Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| 📧 **Emails not sending** | Check `.env` file exists with correct values |
| 🔑 **"Invalid login"** | Use Gmail **App Password**, not main password |
| 📬 **Emails in spam** | Add SPF/DKIM records for your domain |
| 🔴 **Function errors** | Run: `firebase functions:log` to see errors |
| ❌ **Clerk "user not found"** | Verify `CLERK_SECRET_KEY` is correct |
| ⏸️ **Functions timeout** | Increase Firebase timeout to 60 seconds |

---

## 🎛️ Configuration Options

### Email Services (Choose 1)

**Gmail (DEFAULT)** - Easiest for testing
```env
EMAIL_USER=your@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx  # App Password
```

**SendGrid** - Better for production
```env
# Modify code to use SendGrid API
SENDGRID_API_KEY=SG.xxxxx
```

**AWS SES** - For enterprise
```env
# Modify code to use AWS SES
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
```

---

## 📊 How Emails Trigger

### Automatic Triggers
```
Transaction Created (any type)
  ├─ If amount > 2× avg → ANOMALY EMAIL ⚡
  └─ If monthly > budget → BUDGET EMAIL ⚠️

Weekly Scheduled (Sunday 8 AM)
  └─ Calculate & send → WEEKLY DIGEST EMAIL 📊
```

### Error Handling
```
If email fails: ✅ Push notification still sent
If push fails:  ✅ Email still sent (independent)
```

---

## 🔐 Security Notes

✅ **Good Practices Included:**
- `.env` file in `.gitignore` (never committed)
- Clerk Secret Key only in environment
- No hardcoded API keys in code
- Email credentials protected

⚠️ **Before Production:**
- Rotate API keys
- Enable 2FA on email account
- Set up bounce/complaint handling
- Test with production email account

---

## 📞 Getting Help

**For Setup Issues:**
1. Read: `EMAIL_SETUP.md` (Detailed guide)
2. Check: `QUICKSTART_EMAIL.md` (5-min version)
3. Review: Troubleshooting section above
4. Check logs: `firebase functions:log`

**For Code Issues:**
1. Check `CLERK_EMAIL_INTEGRATION.md` (Architecture)
2. Review inline comments in `.js` files
3. Check Firebase Cloud Functions documentation

---

## ✨ Next Steps After Setup

1. ✅ Complete setup from this guide
2. ✅ Test locally with emulator
3. ✅ Deploy to Firebase
4. ✅ Monitor: `firebase functions:log`
5. ✅ Celebrate! 🎉

---

## 📋 Key Files Summary

| File | Purpose | Created/Modified |
|------|---------|-----------------|
| `anomaly-alert.js` | Anomaly email module | ✅ Created |
| `weekly-digest.js` | Budget & digest emails | ✅ Created |
| `.env.example` | Configuration template | ✅ Created |
| `index.js` | Email integration | 🔄 Modified |
| `package.json` | Dependencies | 🔄 Modified |
| `EMAIL_SETUP.md` | Detailed guide | ✅ Created |
| `QUICKSTART_EMAIL.md` | Quick start | ✅ Created |

---

**Last Updated**: June 4, 2026
**Status**: ✅ Ready to Deploy
**Support**: See EMAIL_SETUP.md for detailed help
