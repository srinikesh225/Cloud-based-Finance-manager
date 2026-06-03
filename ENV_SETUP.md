# Environment Configuration Template

## Create this file as `functions/.env`

```env
# ==========================================
# EMAIL SERVICE CONFIGURATION
# ==========================================

# SendGrid API Key (get from https://app.sendgrid.com/settings/api_keys)
SENDGRID_API_KEY=your_sendgrid_api_key_here

# Sender email address (must be verified in SendGrid)
SENDER_EMAIL=noreply@expensecloud.com

# Admin email for error notifications
ADMIN_EMAIL=admin@expensecloud.com

# ==========================================
# NOTIFICATION SETTINGS
# ==========================================

# Anomaly detection threshold (multiplier of average spending)
ANOMALY_THRESHOLD=2.5

# Enable/disable notifications
ENABLE_ANOMALY_ALERTS=true
ENABLE_WEEKLY_DIGEST=true
ENABLE_MONTHLY_REPORT=true

# ==========================================
# SCHEDULE SETTINGS (CRON FORMAT)
# ==========================================

# Weekly digest: Every Monday at 9 AM IST
WEEKLY_DIGEST_SCHEDULE=0 9 ? * MON

# Monthly report: 1st of every month at 9 AM IST
MONTHLY_REPORT_SCHEDULE=0 9 1 * *

# ==========================================
# FIREBASE CONFIGURATION
# ==========================================

# Firebase project ID (optional, usually auto-detected)
FIREBASE_PROJECT_ID=your-project-id

# ==========================================
# SENDGRID ALTERNATIVE PROVIDERS
# ==========================================

# For Gmail SMTP:
# GMAIL_USER=your-email@gmail.com
# GMAIL_PASSWORD=your-app-password

# For Mailgun:
# MAILGUN_API_KEY=your-mailgun-key
# MAILGUN_DOMAIN=your-domain.mailgun.org

# For AWS SES:
# AWS_ACCESS_KEY=your-access-key
# AWS_SECRET_KEY=your-secret-key
# AWS_REGION=us-east-1

```

---

## Setup Instructions

### 1. Get SendGrid API Key

1. Sign up at https://sendgrid.com/
2. Go to Settings → API Keys
3. Create a new API key with Mail Send permissions
4. Copy the key to `.env`

### 2. Verify Sender Email

1. In SendGrid, go to Settings → Sender Authentication
2. Verify your email or domain
3. Add the email to `SENDER_EMAIL` in `.env`

### 3. Test Configuration

```bash
# Create a test file to verify config
node -e "require('dotenv').config(); console.log('API Key loaded:', !!process.env.SENDGRID_API_KEY)"
```

---

## Alternative Email Providers

### Gmail SMTP
```javascript
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD
  }
});
```

### Mailgun
```javascript
const transporter = nodemailer.createTransport({
  host: `smtp.mailgun.org`,
  port: 587,
  secure: false,
  auth: {
    user: `postmaster@${process.env.MAILGUN_DOMAIN}`,
    pass: process.env.MAILGUN_API_KEY
  }
});
```

### AWS SES
```javascript
const transporter = nodemailer.createTransport({
  host: `email-smtp.${process.env.AWS_REGION}.amazonaws.com`,
  port: 587,
  secure: false,
  auth: {
    user: process.env.AWS_ACCESS_KEY,
    pass: process.env.AWS_SECRET_KEY
  }
});
```

---

## Security Notes

⚠️ **IMPORTANT**:
- Never commit `.env` to Git
- Add `.env` to `.gitignore`
- Keep API keys confidential
- Rotate keys regularly
- Use least-privilege permissions

### .gitignore
```
functions/.env
functions/.env.local
functions/node_modules/
```

---

## Monitoring & Debugging

### View Function Logs
```bash
firebase functions:log
```

### Monitor Email Delivery
- SendGrid Dashboard: https://app.sendgrid.com/email_activity
- Check bounce/spam rates
- Review delivery metrics

### Debug Email Issues
```javascript
// Add logging in your functions
console.log('Sending email to:', userEmail);
console.log('Email content:', mailOptions);
transporter.sendMail(mailOptions, (err, info) => {
  if (err) console.error('Email error:', err);
  else console.log('Email sent:', info.messageId);
});
```

