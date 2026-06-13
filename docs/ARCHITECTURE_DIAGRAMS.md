# Email Notification Flows & Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ExpenseCloud Frontend                     │
│  (Web/Mobile App)                                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ User Actions
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               Firestore Database                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐    │
│  │   Users     │  │ Transactions│  │ Notification     │    │
│  │ - email     │  │ - amount    │  │ Preferences      │    │
│  │ - name      │  │ - category  │  │ - anomaly alert  │    │
│  │ - prefs     │  │ - date      │  │ - weekly digest  │    │
│  │             │  │ - type      │  │ - monthly report │    │
│  └─────────────┘  └─────────────┘  └──────────────────┘    │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   Triggers          Triggers         Triggers
   (Real-time)       (Monday 9AM)     (1st, 9AM)
        │                │                │
        ▼                ▼                ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Anomaly Alert    │ │ Weekly Digest    │ │ Monthly Report   │
│ Cloud Function   │ │ Cloud Function   │ │ Cloud Function   │
└────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
         │                    │                    │
         │ Fetch User Data    │ Fetch User Data    │ Fetch User Data
         │ Validate Prefs     │ Calculate Stats    │ Generate PDF
         │ Generate Email     │ Generate Email     │ Generate Email
         │                    │                    │
         └────────────┬───────┴──────────┬────────┘
                      │                  │
                      ▼                  ▼
        ┌─────────────────────────────────────┐
        │   SendGrid Email Service            │
        │  (or alternative email provider)    │
        └─────────────┬───────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────┐
        │      User Email Inbox               │
        │                                     │
        │  📧 Anomaly Alerts                 │
        │  📊 Weekly Digests                 │
        │  📈 Monthly Reports (with PDF)     │
        └─────────────────────────────────────┘
```

---

## Anomaly Alert Flow

```
┌─────────────────────────────────────────────────────────┐
│ User adds transaction: ₹50,000 (Food Category)          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────┐
        │ Firestore Trigger: onCreate          │
        │ (for transactions/{userId}/expenses) │
        └──────────────────┬───────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │ Fetch User Profile                   │
        │ - Get user email                     │
        │ - Check notification preference      │
        └──────────────────┬───────────────────┘
                           │
                    ┌──────▼──────┐
                    │ Pref enabled?│
                    └──┬───────┬──┘
                 No    │       │    Yes
                  ┌────▼──┐    │
                  │ Exit  │    │
                  └───────┘    │
                               ▼
        ┌──────────────────────────────────────┐
        │ Fetch Last 30 Days Transactions      │
        │ - Calculate total spending           │
        │ - Calculate average daily spending   │
        └──────────────────┬───────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │ Calculate Threshold                  │
        │ Threshold = Average Daily × 2.5      │
        │ = (₹1,000 average) × 2.5             │
        │ = ₹2,500                            │
        └──────────────────┬───────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │ Compare Amount vs Threshold          │
        │ ₹50,000 > ₹2,500?                   │
        └──────┬──────────────┬────────────────┘
             Yes             │    No
               │         ┌───▼──┐
               │         │ Exit │
               │         └──────┘
               ▼
        ┌──────────────────────────────────────┐
        │ GENERATE ANOMALY ALERT EMAIL         │
        │ - Subject: ⚠️ Unusual Spending Alert│
        │ - Include transaction details        │
        │ - Show spending stats                │
        │ - Add action link                    │
        └──────────────────┬───────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │ Send via SendGrid                    │
        │ Email queued for delivery            │
        └──────────────────┬───────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │ Store Alert in Firestore             │
        │ alerts/{alertId}                     │
        │ - type: 'anomaly'                    │
        │ - amount: 50000                      │
        │ - threshold: 2500                    │
        │ - timestamp: now                     │
        │ - read: false                        │
        └──────────────────────────────────────┘
```

---

## Weekly Digest Flow

```
Monday, 9:00 AM IST
│
▼
┌──────────────────────────────────────┐
│ Cloud Pub/Sub Trigger                │
│ sendWeeklyDigest                     │
└──────────────────┬───────────────────┘
                   │
                   ▼
        ┌──────────────────────────────────┐
        │ For Each User in Database        │
        └──────────────────┬───────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ Check User Preferences           │
        │ weeklyDigest = true?             │
        └──────┬──────────────┬────────────┘
             Yes             │    No
               │         ┌───▼─────┐
               │         │ Skip    │
               │         └─────────┘
               ▼
        ┌──────────────────────────────────┐
        │ Fetch Last 7 Days Transactions   │
        │ for this user                    │
        └──────────────────┬───────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ Calculate Statistics             │
        │ - Total Expenses                 │
        │ - Total Income                   │
        │ - Net Savings                    │
        │ - Savings Rate (%)               │
        │ - Category Breakdown             │
        │ - Top Category                   │
        └──────────────────┬───────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ GENERATE WEEKLY DIGEST EMAIL     │
        │ - Subject: 📊 Weekly Summary     │
        │ - Statistics boxes               │
        │ - Category table                 │
        │ - Recent transactions (10)       │
        │ - Savings progress bar           │
        │ - Call-to-action links           │
        └──────────────────┬───────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ Send via SendGrid                │
        │ for user@example.com             │
        └──────────────────┬───────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ Log sent notification            │
        │ to auditLogs collection          │
        └──────────────────────────────────┘
```

---

## Monthly Report Flow

```
1st of Each Month, 9:00 AM IST
│
▼
┌──────────────────────────────────────┐
│ Cloud Pub/Sub Trigger                │
│ sendMonthlyReport                    │
└──────────────────┬───────────────────┘
                   │
                   ▼
        ┌──────────────────────────────────┐
        │ For Each User in Database        │
        └──────────────────┬───────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ Check User Preferences           │
        │ monthlyReport = true?            │
        └──────┬──────────────┬────────────┘
             Yes             │    No
               │         ┌───▼─────┐
               │         │ Skip    │
               │         └─────────┘
               ▼
        ┌──────────────────────────────────┐
        │ Fetch Previous Month Transactions│
        │ From: 1st of last month          │
        │ To: Last day of last month       │
        └──────────────────┬───────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ Calculate Month Statistics       │
        │ - Total Expenses                 │
        │ - Total Income                   │
        │ - Net Savings                    │
        │ - Savings Rate                   │
        │ - Category Breakdown             │
        └──────────────────┬───────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ GENERATE PDF REPORT              │
        │ Using PDFKit library             │
        │ - Header with logo               │
        │ - Title: [Month] Report          │
        │ - Summary boxes                  │
        │ - Category breakdown table       │
        │ - All transactions list          │
        │ - Footer with timestamp          │
        └──────────────────┬───────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ GENERATE EMAIL HTML              │
        │ - Professional layout            │
        │ - Summary of report              │
        │ - Call-to-action link            │
        │ - Notification preferences link  │
        └──────────────────┬───────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ Send via SendGrid                │
        │ - TO: user@example.com           │
        │ - SUBJECT: 📈 Monthly Report     │
        │ - ATTACHMENT: PDF file           │
        └──────────────────┬───────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ Log sent notification            │
        │ to auditLogs collection          │
        │ with PDF file size               │
        └──────────────────────────────────┘
```

---

## Database Schema

```
Firestore Structure
│
├── users/{userId}
│   ├── email: string
│   ├── name: string
│   ├── role: string
│   ├── notificationPreferences:
│   │   ├── anomalyAlert: boolean
│   │   ├── weeklyDigest: boolean
│   │   └── monthlyReport: boolean
│   │
│   ├── transactions (subcollection)
│   │   └── expenses/{transactionId}
│   │       ├── amount: number
│   │       ├── category: string
│   │       ├── description: string
│   │       ├── date: timestamp
│   │       └── type: 'expense' | 'income'
│   │
│   └── alerts (subcollection)
│       └── {alertId}
│           ├── type: 'anomaly'
│           ├── amount: number
│           ├── threshold: number
│           ├── category: string
│           ├── timestamp: timestamp
│           └── read: boolean
│
├── emailQueue/{emailId}
│   ├── recipient: string
│   ├── subject: string
│   ├── body: string
│   ├── type: 'anomaly' | 'weekly' | 'monthly'
│   ├── status: 'pending' | 'sent' | 'failed'
│   ├── createdAt: timestamp
│   ├── sentAt: timestamp
│   └── error: string (if failed)
│
└── auditLogs/{logId}
    ├── action: string
    ├── userId: string
    ├── emailType: string
    ├── status: 'success' | 'failed'
    ├── timestamp: timestamp
    └── details: object
```

---

## Cloud Functions Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                   Cloud Functions                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ detectAnomaly    │  │ sendWeeklyDigest │                │
│  │ (Real-time)      │  │ (Scheduled)      │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
│           │                      │                          │
│           │ Triggers on          │ Triggers every          │
│           │ new transaction      │ Monday 9 AM             │
│           │                      │                          │
│           │                      │                          │
│  ┌────────▼───────────────────┬─┘                          │
│  │                            │                            │
│  │ ┌─────────────────────────────────────┐                │
│  │ │   sendMonthlyReport                 │                │
│  │ │   (Scheduled)                       │                │
│  │ └─────────────────────────────────────┘                │
│  │   Triggers on 1st of month 9 AM                        │
│  │                                                         │
│  ├─────────────────────────────────────────────────────┐  │
│  │              All Functions:                         │  │
│  │  1. Fetch user data from Firestore                │  │
│  │  2. Calculate statistics/anomalies                 │  │
│  │  3. Generate HTML email content                    │  │
│  │  4. (Monthly only) Generate PDF                    │  │
│  │  5. Send via SendGrid                              │  │
│  │  6. Log to Firestore                               │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Email Service Integration

```
┌──────────────────────────────────────┐
│    Firebase Cloud Functions          │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Email Generation Code          │  │
│  │ - HTML templates               │  │
│  │ - PDF generation (pdfkit)      │  │
│  │ - Data processing              │  │
│  └────────────────┬───────────────┘  │
└─────────────────────┼──────────────────┘
                      │
                      │ Email Objects:
                      │ {
                      │   to: user@example.com,
                      │   subject: "...",
                      │   html: "...",
                      │   attachments: [...]
                      │ }
                      │
                      ▼
┌──────────────────────────────────────┐
│      SendGrid API                    │
│  (or Gmail, Mailgun, AWS SES)        │
│                                      │
│  - Authentication (API Key)          │
│  - Email validation                  │
│  - Rate limiting                     │
│  - Delivery tracking                 │
└─────────────────┬────────────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │ Email Servers       │
        │ (SMTP Relay)        │
        └─────────────┬───────┘
                      │
                      ▼
        ┌─────────────────────┐
        │ User Mailbox        │
        │ (Gmail, Outlook...)│
        └─────────────────────┘
```

---

## Error Handling Flow

```
┌──────────────────────────────────────┐
│ Function Execution                   │
└──────────────────┬───────────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ Try-Catch Block          │
        └──────┬───────────┬───────┘
          Success          Error
               │             │
               ▼             ▼
        ┌──────────────┐ ┌─────────────────────┐
        │ Log Success  │ │ Catch Exception     │
        │ Send Email   │ │ Log Error Details   │
        │ Return OK    │ │ Update Status       │
        └──────────────┘ │ Notify Admin        │
                         │ Retry Later         │
                         └─────────────────────┘
```

---

## Real-time vs Scheduled Execution

```
REAL-TIME (Anomaly Alerts)
──────────────────────────
User Action: Add Transaction
     │
     ▼
Firestore Trigger
     │
     ▼
Function Runs Immediately
     │
     ▼
Email Sent in Seconds
     │
     ▼
User Receives Alert


SCHEDULED (Weekly & Monthly)
────────────────────────────
Cloud Pub/Sub Scheduler
     │
     ├─ Monday 9 AM ──→ Weekly Digest
     │
     └─ 1st, 9 AM  ──→ Monthly Report
        │
        ▼
Functions Start
     │
     ├─ Iterate all users
     │
     ├─ Check preferences
     │
     ├─ Calculate data
     │
     ├─ Generate emails
     │
     └─ Send to all users
```

---

## Notification Preference Logic

```
For Each Email Type:
│
├─ Check Firestore User Record
│  └─ users/{userId}/notificationPreferences
│
└─ Is [emailType] enabled?
   │
   ├─ YES (true)
   │  ├─ Fetch user email
   │  ├─ Generate email
   │  ├─ Send email
   │  └─ Log transaction
   │
   └─ NO (false)
      ├─ Skip user
      ├─ Log skipped action
      └─ Continue to next user
```

---

This architecture ensures:
- ✅ Real-time anomaly detection
- ✅ Reliable scheduled deliveries
- ✅ User preference control
- ✅ Professional email formatting
- ✅ PDF report generation
- ✅ Error handling and logging
- ✅ Scalable to thousands of users

