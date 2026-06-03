# Testing Guide for Email Notifications

## Overview
This guide helps you test anomaly alerts, weekly digests, and monthly PDF reports before deploying to production.

---

## Prerequisites for Testing

### 1. Set Up Testing Email Account
- Use **Mailtrap.io** (recommended for testing)
- Or create a temporary Gmail account
- Or use **Ethereal Email** for quick testing

### 2. Update Environment for Testing
```bash
# .env.test (for local testing)
SENDGRID_API_KEY=test_key_here
SENDER_EMAIL=test@example.com
MAILGUN_DOMAIN=sandboxXXX.mailgun.org
```

### 3. Install Testing Tools
```bash
npm install --save-dev firebase-functions-test jest
npm install --save-dev supertest
```

---

## Test 1: Anomaly Alert Email

### Step 1: Create Test Data
```javascript
// test/anomaly-alert.test.js
const admin = require('firebase-admin');
const test = require('firebase-functions-test')();

describe('Anomaly Alert Function', () => {
  before(() => {
    // Initialize Firebase Admin
    admin.initializeApp();
  });

  it('should send anomaly alert for high spending', async () => {
    const wrapped = test.wrap(require('../index').detectAnomaly);
    
    // Create test data
    const snap = {
      data: () => ({
        amount: 50000,
        category: 'Food',
        description: 'Restaurant Booking',
        date: new Date(),
        type: 'expense'
      }),
      id: 'test-transaction-1'
    };
    
    const context = {
      params: { userId: 'test-user-1' }
    };
    
    // Run function
    await wrapped(snap, context);
    
    // Check email was queued
    const emailQueue = await admin.firestore()
      .collection('emailQueue')
      .where('recipient', '==', 'test@example.com')
      .get();
    
    expect(emailQueue.size).toBe(1);
  });

  after(() => {
    test.cleanup();
  });
});
```

### Step 2: Run Test
```bash
npm test -- test/anomaly-alert.test.js
```

### Step 3: Check Email
1. Log in to your test email account (Mailtrap/Ethereal)
2. Look for email with subject: "⚠️ Unusual Spending Alert"
3. Verify:
   - User name is displayed
   - Transaction amount is shown
   - Category is correct
   - Alert threshold is calculated
   - Anomaly percentage is displayed

### Expected Email Content:
```
Subject: ⚠️ Unusual Spending Alert - ExpenseCloud

Body should include:
✓ User name
✓ Amount: ₹50,000
✓ Category: Food
✓ Description: Restaurant Booking
✓ Your Average Daily Spending: ₹XXX
✓ Alert Threshold: ₹XXX
✓ Percentage above average: 4x higher
✓ "View Transaction" link
```

---

## Test 2: Weekly Digest Email

### Step 1: Prepare Test Data
```javascript
// Create multiple transactions for the week
const testTransactions = [
  {
    amount: 500,
    category: 'Food',
    description: 'Lunch',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    type: 'expense'
  },
  {
    amount: 200,
    category: 'Transport',
    description: 'Uber',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    type: 'expense'
  },
  {
    amount: 50000,
    category: 'Salary',
    description: 'Monthly Salary',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    type: 'income'
  }
  // Add more transactions...
];

// Add to Firestore
const batch = admin.firestore().batch();
testTransactions.forEach(txn => {
  const ref = admin.firestore()
    .collection('transactions')
    .doc('test-user-1')
    .collection('expenses')
    .doc();
  
  batch.set(ref, txn);
});
await batch.commit();
```

### Step 2: Trigger Function
```bash
# Option 1: Use Firebase Shell
firebase functions:shell
> sendWeeklyDigest()

# Option 2: Manually call via REST API
curl -X POST \
  https://us-central1-your-project.cloudfunctions.net/sendWeeklyDigest \
  -H 'Content-Type: application/json'
```

### Step 3: Check Email
1. Open test email account
2. Look for subject: "📊 Your Weekly Finance Summary"
3. Verify content:

### Expected Email Content:
```
✓ Week date range
✓ Total Expenses: ₹XXX
✓ Total Income: ₹XXX
✓ Net Savings: ₹XXX
✓ Savings Rate: XX%
✓ Category breakdown table
✓ Recent transactions list
✓ Top spending category
✓ "View Full Dashboard" link
✓ Notification preferences link
```

### Verification Checklist:
- [ ] Statistics are calculated correctly
- [ ] All transactions are listed
- [ ] Category breakdown is accurate
- [ ] Formatting is readable
- [ ] Links are working
- [ ] No missing data

---

## Test 3: Monthly PDF Report Email

### Step 1: Prepare Monthly Data
```javascript
// Create transactions for entire month
const startDate = new Date();
startDate.setDate(1); // First day of month
startDate.setHours(0, 0, 0, 0);

const endDate = new Date();
endDate.setDate(0); // Last day of month
endDate.setHours(23, 59, 59, 999);

// Create 30 days of sample data
for (let i = 0; i < 30; i++) {
  const date = new Date(startDate);
  date.setDate(date.getDate() + i);
  
  // Create 2-3 random transactions per day
  const transaction = {
    amount: Math.random() * 2000,
    category: ['Food', 'Transport', 'Entertainment', 'Utilities'][Math.floor(Math.random() * 4)],
    description: 'Sample transaction',
    date: date,
    type: 'expense'
  };
  
  // Add to Firestore
  await admin.firestore()
    .collection('transactions')
    .doc('test-user-1')
    .collection('expenses')
    .add(transaction);
}
```

### Step 2: Trigger Monthly Report
```bash
# Using Firebase Shell
firebase functions:shell
> sendMonthlyReport()

# Or use REST API
curl -X POST \
  https://us-central1-your-project.cloudfunctions.net/sendMonthlyReport \
  -H 'Content-Type: application/json'
```

### Step 3: Check Email with Attachment
1. Open test email account
2. Look for subject: "📈 Your Monthly Finance Report - [Month]"
3. Verify:

### Expected Email Content:
```
✓ Month and year in subject
✓ Professional greeting
✓ PDF attachment named: Finance_Report_[Month].pdf
✓ Summary section in email body
```

### Verify PDF Content:
1. Download attached PDF
2. Open with PDF viewer
3. Check for:
   - [ ] Header with "ExpenseCloud"
   - [ ] Report title with month/year
   - [ ] Summary boxes: Total Expenses, Total Income, Net Savings
   - [ ] Category breakdown table
   - [ ] All transactions listed
   - [ ] Proper formatting and spacing
   - [ ] No corrupted text

---

## Test 4: User Preference Settings

### Step 1: Test Disabling Notifications
```javascript
// Update user preferences
await admin.firestore()
  .collection('users')
  .doc('test-user-1')
  .update({
    'notificationPreferences.weeklyDigest': false,
    'notificationPreferences.monthlyReport': false
  });

// Trigger functions - should skip this user
firebase functions:shell
> sendWeeklyDigest()
> sendMonthlyReport()
```

### Step 2: Verify No Email Sent
1. Check test email account
2. Confirm no new emails

### Step 3: Re-enable Preferences
```javascript
await admin.firestore()
  .collection('users')
  .doc('test-user-1')
  .update({
    'notificationPreferences.weeklyDigest': true,
    'notificationPreferences.monthlyReport': true
  });
```

---

## Test 5: Error Handling

### Test 1: Invalid Email Address
```javascript
// Set invalid email
await admin.firestore()
  .collection('users')
  .doc('test-user-1')
  .update({ email: 'invalid-email' });

// Trigger function
firebase functions:shell
> detectAnomaly()

// Check logs for error handling
firebase functions:log
```

### Test 2: Missing User Data
```javascript
// Create transaction for non-existent user
// Function should skip gracefully
```

### Test 3: Rate Limiting
```javascript
// Send 10 anomaly alerts rapidly
// Verify:
// - Function completes without timeout
// - Rate limiting is applied
// - No duplicate emails
```

---

## Test 6: Load Testing

### Test 1: Send to Multiple Users
```javascript
// Create 100 test users
for (let i = 0; i < 100; i++) {
  await admin.firestore()
    .collection('users')
    .doc(`test-user-${i}`)
    .set({
      email: `testuser${i}@mailtrap.io`,
      name: `Test User ${i}`,
      notificationPreferences: {
        anomalyAlert: true,
        weeklyDigest: true,
        monthlyReport: true
      }
    });
}

// Trigger weekly digest
firebase functions:shell
> sendWeeklyDigest()

// Monitor:
firebase functions:log
```

### Test 2: Monitor Performance
```bash
# Check function execution time
firebase functions:log | grep "Function execution time"

# Check memory usage
firebase functions:log | grep "Memory"

# Check API quota usage
gcloud compute instances list
```

---

## Common Testing Issues & Solutions

| Issue | Solution |
|-------|----------|
| Email not received | Check spam folder, verify email service API key |
| PDF corrupted | Reinstall pdfkit: `npm install pdfkit --save` |
| Function timeout | Increase timeout in firebase.json |
| Wrong user email | Verify email in Firestore is correct |
| Statistics incorrect | Check date calculations in function |
| Duplicate emails | Check for function triggers |

---

## Production Deployment Checklist

Before deploying to production:

- [ ] All tests pass locally
- [ ] No errors in Firebase function logs
- [ ] Emails formatted correctly
- [ ] PDFs generated without issues
- [ ] Rate limiting implemented
- [ ] Error handling tested
- [ ] Database indexes created
- [ ] Security rules deployed
- [ ] Environment variables configured
- [ ] Monitoring/alerting set up

```bash
# Final deployment
firebase deploy --only functions,firestore:rules,firestore:indexes
```

---

## Monitoring in Production

### 1. Set Up Email Delivery Monitoring
```javascript
// Add to index.js
exports.monitorEmailDelivery = functions.pubsub
  .schedule('0 * * * *') // Every hour
  .onRun(async () => {
    const emails = await db.collection('emailQueue')
      .where('status', '==', 'failed')
      .get();
    
    if (emails.size > 0) {
      console.error(`${emails.size} failed emails`);
      // Send alert to admin
    }
  });
```

### 2. Monitor Function Performance
```bash
# View metrics
firebase functions:describe detectAnomaly
firebase functions:describe sendWeeklyDigest
firebase functions:describe sendMonthlyReport
```

### 3. Regular Reviews
- Weekly: Check failed emails
- Monthly: Review delivery rates
- Quarterly: Analyze user feedback

