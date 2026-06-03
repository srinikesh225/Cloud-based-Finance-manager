# Email Notifications Implementation - Quick Summary

## What We're Implementing

### 1. **Anomaly Alerts** 🚨
- **When**: Real-time when unusual spending detected
- **How**: Automatically triggers when transaction > 250% of average
- **Content**: Alert details, spending pattern, action link

### 2. **Weekly Digest** 📊
- **When**: Every Monday at 9 AM
- **How**: Cloud Function scheduled via Pub/Sub
- **Content**: Statistics, category breakdown, recent transactions

### 3. **Monthly PDF Report** 📈
- **When**: 1st of each month at 9 AM
- **How**: Cloud Function scheduled via Pub/Sub
- **Content**: Professional PDF with charts, tables, full analysis

---

## Quick Start (Step by Step)

### **Phase 1: Setup (15 minutes)**

```bash
# 1. Go to functions directory
cd expensecloud-backend/functions

# 2. Install dependencies
npm install firebase-admin firebase-functions dotenv nodemailer nodemailer-sendgrid-transport pdfkit

# 3. Create .env file with your SendGrid key
# SENDGRID_API_KEY=your_key_here
# SENDER_EMAIL=noreply@expensecloud.com
```

### **Phase 2: Add Code Files (10 minutes)**

Create three files in `functions/`:
1. `anomaly-alert.js` - Anomaly detection logic
2. `weekly-digest.js` - Weekly summary logic
3. `monthly-report.js` - Monthly PDF logic

Update `functions/index.js` to import all three.

### **Phase 3: Deploy (5 minutes)**

```bash
firebase deploy --only functions
```

### **Phase 4: Test (20 minutes)**

1. Create test user with notification preferences
2. Trigger each function manually
3. Verify emails in test account
4. Check PDF quality

### **Phase 5: Monitor (Ongoing)**

```bash
firebase functions:log
```

---

## File Structure

```
expensecloud-backend/
├── functions/
│   ├── index.js (updated)
│   ├── anomaly-alert.js (new)
│   ├── weekly-digest.js (new)
│   ├── monthly-report.js (new)
│   ├── package.json (updated)
│   └── .env (new - DO NOT COMMIT)
├── firestore.rules (updated)
├── firebase.json (updated)
└── firestore.indexes.json
```

---

## Key Configuration Files

### `.env` (in functions folder)
```
SENDGRID_API_KEY=sg_XXXXX...
SENDER_EMAIL=noreply@expensecloud.com
```

### `firebase.json`
```json
{
  "functions": {
    "timeoutSeconds": 540,
    "memory": "512MB"
  }
}
```

### Firestore Document Structure
```
users/{userId}
  ├── email: string
  ├── name: string
  ├── notificationPreferences:
  │   ├── anomalyAlert: boolean
  │   ├── weeklyDigest: boolean
  │   └── monthlyReport: boolean
  └── alerts (subcollection)
      └── {alertId}: anomaly details
```

---

## Deployment Commands

```bash
# Install all dependencies
npm install

# Deploy only functions
firebase deploy --only functions

# Deploy functions + Firestore rules
firebase deploy --only functions,firestore:rules

# View logs
firebase functions:log

# Test locally
firebase serve --only functions

# Describe a function
firebase functions:describe sendWeeklyDigest
```

---

## Email Type Details

### Anomaly Alert Email
```
When: Immediately (real-time)
Trigger: Transaction amount > 250% of average daily spend
Recipients: Users with anomalyAlert enabled
Content:
  - User name
  - Transaction details
  - Average spending
  - Alert threshold
  - Percentage above normal
  - Action link
```

### Weekly Digest Email
```
When: Every Monday, 9:00 AM IST
Trigger: Scheduled via Cloud Pub/Sub
Recipients: All users with weeklyDigest enabled
Content:
  - Total expenses for week
  - Total income for week
  - Net savings
  - Savings rate (%)
  - Category breakdown (table)
  - Top spending category
  - Recent transactions (last 10)
  - Dashboard link
```

### Monthly PDF Report Email
```
When: 1st of each month, 9:00 AM IST
Trigger: Scheduled via Cloud Pub/Sub
Recipients: All users with monthlyReport enabled
Content: Professional PDF with:
  - Header and title
  - Summary statistics boxes
  - Category breakdown table
  - All transactions for month
  - Footer with generation timestamp
Attachment: Finance_Report_[Month].pdf
```

---

## Testing Checklist

### Before Deployment
- [ ] All functions deploy without errors
- [ ] Test emails received in test account
- [ ] Email content is readable and formatted correctly
- [ ] PDF generated and downloads successfully
- [ ] User preferences can be updated
- [ ] Functions respect preference settings
- [ ] Logs show no errors

### During Testing
```bash
# Test anomaly alert
1. Create high-value transaction
2. Check email inbox (should receive within 30 seconds)

# Test weekly digest
1. Add multiple transactions
2. Manually trigger: firebase functions:shell > sendWeeklyDigest()
3. Check email inbox

# Test monthly report
1. Manually trigger: firebase functions:shell > sendMonthlyReport()
2. Check email and download PDF
3. Verify PDF content
```

---

## Troubleshooting

### Email Not Sending
```
✓ Check SendGrid API key is correct
✓ Verify sender email is verified in SendGrid
✓ Check user email address is valid
✓ Check spam/promotions folder
✓ View function logs: firebase functions:log
```

### PDF Not Generating
```
✓ Verify pdfkit is installed: npm list pdfkit
✓ Check function timeout (should be 540s)
✓ Check available memory (should be 512MB)
✓ Look for errors in logs
```

### Function Timeout
```
✓ Increase timeout in firebase.json
✓ Optimize database queries
✓ Batch operations if processing many users
✓ Cache results
```

### Wrong User Email
```
✓ Verify email in Firestore users collection
✓ Check user logged in with correct email
✓ Verify notification preferences exist
```

---

## Email Service Options

### SendGrid (Recommended)
- Free: 40,000 emails/month
- Reliable and well-documented
- Easy setup in Firebase

### Gmail SMTP
- Free: Unlimited (within rate limits)
- Requires App Password
- Good for personal use

### Mailgun
- Free: 1,000 emails/month
- Pay-as-you-go after that
- Developer-friendly

### AWS SES
- Very affordable
- Higher complexity
- Good for enterprise

---

## Performance & Costs

### Firebase Billing
- **Cloud Functions**: Pay only for execution
  - Free tier: 2 million invocations/month
  - $0.40 per million invocations after
  
- **Firestore**: Pay for reads/writes
  - Free tier: 50,000 reads/day
  - $0.06 per 100,000 reads after

- **Pub/Sub**: Pub/Sub pricing
  - Free tier: 10 GB/month
  - $0.05 per GB after

### SendGrid Pricing
- **Free**: 40,000 emails/month
- **Pro**: $10-$30/month for more features
- **Enterprise**: Custom pricing

---

## Security Best Practices

✅ **DO:**
- Store API keys in `.env` (not in code)
- Add `.env` to `.gitignore`
- Use least-privilege Firebase rules
- Validate user emails
- Rate limit function calls
- Monitor function logs
- Rotate API keys regularly

❌ **DON'T:**
- Commit `.env` to Git
- Hardcode secrets in code
- Use overly permissive Firestore rules
- Send emails to unverified addresses
- Ignore error logs
- Store sensitive data in plain text

---

## Monitoring & Maintenance

### Daily
- Check Firebase Console for errors
- Monitor SendGrid delivery stats

### Weekly
- Review function execution logs
- Check email bounce rates
- Verify all functions are running

### Monthly
- Analyze email engagement
- Review costs and usage
- Update anomaly thresholds if needed
- Check for security issues

### Quarterly
- User feedback review
- Performance optimization
- Update dependencies

---

## Documentation Files Generated

1. **EMAIL_NOTIFICATIONS_GUIDE.md**
   - Complete step-by-step implementation guide
   - Full code for all three functions
   - HTML email templates

2. **IMPLEMENTATION_CHECKLIST.md**
   - Quick reference checklist
   - Time estimates
   - Common commands

3. **ENV_SETUP.md**
   - Environment variable configuration
   - Multiple email provider options
   - Security notes

4. **TESTING_GUIDE.md**
   - Comprehensive testing procedures
   - Test cases for each feature
   - Troubleshooting guide

5. **firebase.json**
   - Firebase configuration
   - Function settings
   - Firestore configuration

6. **firestore.rules**
   - Security rules for transactions
   - Protection for alerts collection
   - Validation logic

7. **package.json** (functions)
   - All required dependencies
   - NPM scripts for development

---

## Next Steps

1. **Read** `EMAIL_NOTIFICATIONS_GUIDE.md` for detailed implementation
2. **Follow** `IMPLEMENTATION_CHECKLIST.md` step-by-step
3. **Configure** environment variables in `ENV_SETUP.md`
4. **Test** thoroughly using `TESTING_GUIDE.md`
5. **Deploy** to production with confidence

---

## Support Resources

- Firebase Documentation: https://firebase.google.com/docs
- Cloud Functions Guide: https://firebase.google.com/docs/functions
- SendGrid Documentation: https://docs.sendgrid.com
- Nodemailer Docs: https://nodemailer.com
- PDFKit Docs: http://pdfkit.org

---

## Quick Command Reference

```bash
# Setup
firebase login
firebase init functions
npm install

# Development
firebase serve --only functions
firebase functions:shell

# Deployment
firebase deploy --only functions
firebase deploy --only functions,firestore:rules

# Monitoring
firebase functions:log
firebase functions:describe [functionName]

# Cleanup
firebase functions:delete [functionName]
```

---

**Last Updated**: June 3, 2026
**Status**: Ready for Implementation
**Difficulty**: Intermediate
**Estimated Time**: 1-2 hours for full setup and testing

