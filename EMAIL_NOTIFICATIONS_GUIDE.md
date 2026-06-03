# Email Notifications Implementation Guide

## Overview
This guide covers implementing three types of email notifications in ExpenseCloud using Firebase Cloud Messaging (FCM) and Cloud Functions:
1. **Anomaly Alerts** - Real-time alerts when unusual spending detected
2. **Weekly Digest** - Summary of weekly transactions
3. **Monthly PDF Report** - Comprehensive monthly report with charts

---

## Prerequisites
- Firebase Project set up
- Node.js 14+ installed
- Firebase CLI installed
- Email service configured (SendGrid/Gmail/Mailgun)

---

## Step 1: Set Up Firebase Cloud Functions

### 1.1 Initialize Cloud Functions
```bash
cd expensecloud-backend
firebase init functions
# Choose: JavaScript/TypeScript
# Install dependencies
```

### 1.2 Install Required Dependencies
```bash
cd functions
npm install firebase-admin firebase-functions cors dotenv nodemailer html-pdf puppeteer
npm install --save-dev firebase-tools
```

---

## Step 2: Configure Email Service

### 2.1 Create Environment Variables
Create `functions/.env`:
```
SENDGRID_API_KEY=your_sendgrid_api_key
SENDER_EMAIL=noreply@expensecloud.com
ADMIN_EMAIL=admin@expensecloud.com
```

### 2.2 Update Functions Configuration
Edit `functions/index.js`:
```javascript
const admin = require('firebase-admin');
const functions = require('firebase-functions');
const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid-transport');
require('dotenv').config();

// Initialize Firebase
admin.initializeApp();
const db = admin.firestore();

// Configure email transport
const transporter = nodemailer.createTransport(
  sgTransport({
    service: 'SendGrid',
    auth: {
      api_user: 'apikey',
      api_key: process.env.SENDGRID_API_KEY
    }
  })
);

module.exports = { admin, db, transporter };
```

---

## Step 3: Implement Anomaly Detection & Email Alert

### 3.1 Create Anomaly Detection Function
Create `functions/anomaly-alert.js`:
```javascript
const { admin, db, transporter } = require('./index');
const functions = require('firebase-functions');

// Detect anomalies when transaction is added
exports.detectAnomaly = functions.firestore
  .document('transactions/{userId}/expenses/{transactionId}')
  .onCreate(async (snap, context) => {
    try {
      const { userId } = context.params;
      const transaction = snap.data();
      
      // Get user profile and email
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) return;
      
      const userData = userDoc.data();
      const userEmail = userData.email;
      
      // Calculate monthly average spending
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const snapshot = await db.collection('transactions')
        .doc(userId)
        .collection('expenses')
        .where('date', '>=', thirtyDaysAgo)
        .get();
      
      const expenses = snapshot.docs.map(doc => doc.data());
      const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const avgDaily = totalExpenses / 30;
      const threshold = avgDaily * 2.5; // 250% of average
      
      // Check if current transaction is anomalous
      if (transaction.amount > threshold) {
        console.log(`Anomaly detected for user ${userId}: ${transaction.amount}`);
        
        // Send email alert
        const mailOptions = {
          from: process.env.SENDER_EMAIL,
          to: userEmail,
          subject: '⚠️ Unusual Spending Alert - ExpenseCloud',
          html: generateAnomalyEmailHTML({
            userName: userData.name,
            amount: transaction.amount,
            category: transaction.category,
            description: transaction.description,
            date: new Date(transaction.date.toDate()).toLocaleDateString(),
            avgSpend: avgDaily.toFixed(2),
            threshold: threshold.toFixed(2)
          })
        };
        
        await transporter.sendMail(mailOptions);
        
        // Store alert in database
        await db.collection('users').doc(userId).collection('alerts').add({
          type: 'anomaly',
          transactionId: snap.id,
          amount: transaction.amount,
          threshold: threshold,
          category: transaction.category,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          read: false
        });
      }
    } catch (error) {
      console.error('Error detecting anomaly:', error);
    }
  });

function generateAnomalyEmailHTML(data) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #3366cc; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2>Unusual Spending Alert</h2>
      </div>
      <div style="padding: 20px; background-color: #f8f8f8; border: 1px solid #ddd;">
        <p>Hi ${data.userName},</p>
        
        <p style="color: #d9534f;">
          <strong>⚠️ We detected an unusually high transaction on your account:</strong>
        </p>
        
        <div style="background-color: white; padding: 15px; border-left: 4px solid #d9534f; margin: 15px 0;">
          <p><strong>Amount:</strong> ₹${data.amount}</p>
          <p><strong>Category:</strong> ${data.category}</p>
          <p><strong>Description:</strong> ${data.description}</p>
          <p><strong>Date:</strong> ${data.date}</p>
          <p><strong>Your Average Daily Spending:</strong> ₹${data.avgSpend}</p>
          <p><strong>Alert Threshold (250% of average):</strong> ₹${data.threshold}</p>
        </div>
        
        <p>This transaction is <strong>${Math.round((data.amount / data.avgSpend) * 100)}% higher than your average spending</strong>.</p>
        
        <p>If this transaction is legitimate, you can ignore this alert. If not, please contact your bank immediately.</p>
        
        <div style="margin-top: 20px; text-align: center;">
          <a href="https://expensecloud.app/transactions" 
             style="background-color: #3366cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Transaction
          </a>
        </div>
        
        <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
        <p style="color: #999; font-size: 12px;">
          ExpenseCloud • Smart Finance Manager<br>
          © 2024 All rights reserved
        </p>
      </div>
    </div>
  `;
}

module.exports = { detectAnomaly };
```

---

## Step 4: Implement Weekly Digest Notification

### 4.1 Create Weekly Digest Function
Create `functions/weekly-digest.js`:
```javascript
const { admin, db, transporter } = require('./index');
const functions = require('firebase-functions');

// Schedule weekly digest every Monday at 9 AM
exports.sendWeeklyDigest = functions.pubsub
  .schedule('0 9 ? * MON')
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    try {
      const users = await db.collection('users').get();
      
      for (const userDoc of users.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        
        // Skip if user opted out
        if (userData.notificationPreferences?.weeklyDigest === false) {
          continue;
        }
        
        await sendDigestToUser(userId, userData);
      }
      
      console.log('Weekly digests sent successfully');
    } catch (error) {
      console.error('Error sending weekly digests:', error);
    }
  });

async function sendDigestToUser(userId, userData) {
  try {
    // Calculate last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Get transactions
    const snapshot = await db.collection('transactions')
      .doc(userId)
      .collection('expenses')
      .where('date', '>=', sevenDaysAgo)
      .orderBy('date', 'desc')
      .get();
    
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Calculate statistics
    const stats = calculateStats(transactions);
    
    // Generate email
    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: userData.email,
      subject: `📊 Your Weekly Finance Summary - ${new Date().toLocaleDateString()}`,
      html: generateWeeklyDigestHTML({
        userName: userData.name,
        stats: stats,
        transactions: transactions.slice(0, 10), // Last 10 transactions
        weekStart: sevenDaysAgo.toLocaleDateString(),
        weekEnd: new Date().toLocaleDateString()
      })
    };
    
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(`Error sending digest to user ${userId}:`, error);
  }
}

function calculateStats(transactions) {
  const stats = {
    totalExpense: 0,
    totalIncome: 0,
    categoryBreakdown: {},
    transactionCount: transactions.length,
    topCategory: null,
    topAmount: 0
  };
  
  transactions.forEach(txn => {
    if (txn.type === 'expense') {
      stats.totalExpense += txn.amount;
    } else {
      stats.totalIncome += txn.amount;
    }
    
    // Category breakdown
    if (!stats.categoryBreakdown[txn.category]) {
      stats.categoryBreakdown[txn.category] = 0;
    }
    stats.categoryBreakdown[txn.category] += txn.amount;
  });
  
  // Find top category
  let max = 0;
  for (const [category, amount] of Object.entries(stats.categoryBreakdown)) {
    if (amount > max) {
      max = amount;
      stats.topCategory = category;
      stats.topAmount = amount;
    }
  }
  
  stats.netSavings = stats.totalIncome - stats.totalExpense;
  stats.savingsRate = stats.totalIncome > 0 
    ? ((stats.netSavings / stats.totalIncome) * 100).toFixed(1)
    : 0;
  
  return stats;
}

function generateWeeklyDigestHTML(data) {
  const categoryRows = Object.entries(data.stats.categoryBreakdown)
    .map(([category, amount]) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${category}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${amount.toFixed(2)}</td>
      </tr>
    `).join('');
  
  const transactionRows = data.transactions
    .map(txn => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px;">${txn.description}</td>
        <td style="padding: 10px;">${txn.category}</td>
        <td style="padding: 10px; text-align: right; color: ${txn.type === 'expense' ? '#d9534f' : '#5cb85c'};">
          ${txn.type === 'expense' ? '-' : '+'}₹${txn.amount.toFixed(2)}
        </td>
        <td style="padding: 10px; color: #999; font-size: 12px;">
          ${new Date(txn.date.toDate()).toLocaleDateString()}
        </td>
      </tr>
    `).join('');
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #3366cc 0%, #254fa0 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">📊 Weekly Finance Summary</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">${data.weekStart} - ${data.weekEnd}</p>
      </div>
      
      <div style="padding: 30px; background-color: #f8f8f8;">
        <p>Hi ${data.userName},</p>
        <p>Here's your financial summary for the week:</p>
        
        <!-- Key Metrics -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin: 20px 0;">
          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #d9534f;">
            <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Total Expenses</p>
            <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #d9534f;">₹${data.stats.totalExpense.toFixed(2)}</p>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #5cb85c;">
            <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Total Income</p>
            <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #5cb85c;">₹${data.stats.totalIncome.toFixed(2)}</p>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #3366cc;">
            <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Net Savings</p>
            <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #3366cc;">₹${data.stats.netSavings.toFixed(2)}</p>
          </div>
        </div>
        
        <!-- Savings Rate -->
        <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase; margin-bottom: 10px;">Savings Rate</p>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="flex: 1; background: #eee; height: 20px; border-radius: 10px; overflow: hidden;">
              <div style="background: linear-gradient(90deg, #5cb85c, #3366cc); width: ${data.stats.savingsRate}%; height: 100%;"></div>
            </div>
            <span style="font-size: 18px; font-weight: bold; color: #3366cc;">${data.stats.savingsRate}%</span>
          </div>
        </div>
        
        <!-- Top Category -->
        ${data.stats.topCategory ? `
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404;"><strong>💡 Top Spending Category:</strong> ${data.stats.topCategory} (₹${data.stats.topAmount.toFixed(2)})</p>
          </div>
        ` : ''}
        
        <!-- Category Breakdown -->
        <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <h3 style="margin: 0 0 15px 0; color: #333;">Spending by Category</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${categoryRows}
          </table>
        </div>
        
        <!-- Recent Transactions -->
        <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <h3 style="margin: 0 0 15px 0; color: #333;">Recent Transactions</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f3f3f3;">
                <th style="padding: 10px; text-align: left; font-size: 12px; font-weight: 600; color: #666;">Description</th>
                <th style="padding: 10px; text-align: left; font-size: 12px; font-weight: 600; color: #666;">Category</th>
                <th style="padding: 10px; text-align: right; font-size: 12px; font-weight: 600; color: #666;">Amount</th>
                <th style="padding: 10px; text-align: left; font-size: 12px; font-weight: 600; color: #666;">Date</th>
              </tr>
            </thead>
            <tbody>
              ${transactionRows}
            </tbody>
          </table>
        </div>
        
        <div style="margin-top: 20px; text-align: center;">
          <a href="https://expensecloud.app/dashboard" 
             style="background-color: #3366cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Full Dashboard
          </a>
        </div>
        
        <!-- Notification Preferences -->
        <div style="margin-top: 20px; padding: 15px; background: #f0f0f0; border-radius: 8px; font-size: 12px; color: #666;">
          <p style="margin: 0;">
            💌 Want to change notification preferences? 
            <a href="https://expensecloud.app/settings/notifications" style="color: #3366cc; text-decoration: none;">Update here</a>
          </p>
        </div>
      </div>
      
      <div style="padding: 20px; text-align: center; color: #999; font-size: 12px; background: white; border-top: 1px solid #ddd;">
        <p style="margin: 0;">ExpenseCloud • Smart Finance Manager</p>
        <p style="margin: 5px 0 0 0;">© 2024 All rights reserved</p>
      </div>
    </div>
  `;
}

module.exports = { sendWeeklyDigest };
```

---

## Step 5: Implement Monthly PDF Report

### 5.1 Create Monthly Report Function
Create `functions/monthly-report.js`:
```javascript
const { admin, db, transporter } = require('./index');
const functions = require('firebase-functions');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Schedule monthly report for 1st of each month at 9 AM
exports.sendMonthlyReport = functions.pubsub
  .schedule('0 9 1 * *')
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    try {
      const users = await db.collection('users').get();
      
      for (const userDoc of users.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        
        // Skip if user opted out
        if (userData.notificationPreferences?.monthlyReport === false) {
          continue;
        }
        
        await sendMonthlyReportToUser(userId, userData);
      }
      
      console.log('Monthly reports sent successfully');
    } catch (error) {
      console.error('Error sending monthly reports:', error);
    }
  });

async function sendMonthlyReportToUser(userId, userData) {
  try {
    // Get last month's data
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    // Get transactions
    const snapshot = await db.collection('transactions')
      .doc(userId)
      .collection('expenses')
      .where('date', '>=', firstDayOfMonth)
      .where('date', '<=', lastDayOfMonth)
      .orderBy('date', 'desc')
      .get();
    
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Generate PDF
    const pdfBuffer = await generatePDF({
      userName: userData.name,
      email: userData.email,
      monthStart: firstDayOfMonth,
      monthEnd: lastDayOfMonth,
      transactions: transactions
    });
    
    // Send email with PDF attachment
    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: userData.email,
      subject: `📈 Your Monthly Finance Report - ${getMonthName(firstDayOfMonth)}`,
      html: generateMonthlyReportHTML({
        userName: userData.name,
        month: getMonthName(firstDayOfMonth),
        year: firstDayOfMonth.getFullYear()
      }),
      attachments: [
        {
          filename: `Finance_Report_${getMonthName(firstDayOfMonth)}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };
    
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(`Error sending monthly report to user ${userId}:`, error);
  }
}

function generatePDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('ExpenseCloud', 50, 40);
      doc.fontSize(10).font('Helvetica').text('Finance Report', 50, 70);
      
      // Title and Date
      const month = getMonthName(data.monthStart);
      doc.fontSize(18).font('Helvetica-Bold').text(`${month} ${data.monthStart.getFullYear()} Report`, 50, 100);
      doc.fontSize(10).font('Helvetica').text(`Report for: ${data.userName}`, 50, 130);
      
      // Calculate Statistics
      const stats = calculateMonthlyStats(data.transactions);
      
      // Summary Section
      doc.fontSize(14).font('Helvetica-Bold').text('Summary', 50, 170);
      
      const summaryY = 200;
      const boxWidth = 120;
      const boxHeight = 80;
      
      // Total Expenses Box
      doc.rect(50, summaryY, boxWidth, boxHeight).stroke();
      doc.fontSize(10).font('Helvetica').text('Total Expenses', 60, summaryY + 10);
      doc.fontSize(16).font('Helvetica-Bold').text(`₹${stats.totalExpense.toFixed(2)}`, 60, summaryY + 30);
      
      // Total Income Box
      doc.rect(180, summaryY, boxWidth, boxHeight).stroke();
      doc.fontSize(10).font('Helvetica').text('Total Income', 190, summaryY + 10);
      doc.fontSize(16).font('Helvetica-Bold').text(`₹${stats.totalIncome.toFixed(2)}`, 190, summaryY + 30);
      
      // Net Savings Box
      doc.rect(310, summaryY, boxWidth, boxHeight).stroke();
      doc.fontSize(10).font('Helvetica').text('Net Savings', 320, summaryY + 10);
      doc.fontSize(16).font('Helvetica-Bold').text(`₹${stats.netSavings.toFixed(2)}`, 320, summaryY + 30);
      
      // Category Breakdown
      doc.fontSize(14).font('Helvetica-Bold').text('Spending by Category', 50, 310);
      
      let categoryY = 340;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Category', 60, categoryY);
      doc.text('Amount', 400, categoryY);
      
      categoryY += 20;
      doc.fontSize(9).font('Helvetica');
      Object.entries(stats.categoryBreakdown).forEach(([category, amount], index) => {
        if (categoryY > 700) {
          doc.addPage();
          categoryY = 50;
        }
        doc.text(category, 60, categoryY);
        doc.text(`₹${amount.toFixed(2)}`, 400, categoryY);
        categoryY += 20;
      });
      
      // Recent Transactions
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').text('Transactions', 50, 50);
      
      let transactionY = 80;
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Date', 60, transactionY);
      doc.text('Description', 120, transactionY);
      doc.text('Category', 300, transactionY);
      doc.text('Amount', 420, transactionY);
      
      transactionY += 15;
      doc.fontSize(8).font('Helvetica');
      data.transactions.forEach((txn, index) => {
        if (transactionY > 700) {
          doc.addPage();
          transactionY = 50;
        }
        
        const date = new Date(txn.date.toDate()).toLocaleDateString();
        doc.text(date, 60, transactionY);
        doc.text(txn.description.substring(0, 30), 120, transactionY);
        doc.text(txn.category, 300, transactionY);
        doc.text(`${txn.type === 'expense' ? '-' : '+'}₹${txn.amount.toFixed(2)}`, 420, transactionY);
        
        transactionY += 15;
      });
      
      // Footer
      doc.fontSize(8).font('Helvetica').text(
        'This is an automatically generated report. Please do not reply to this email.',
        50,
        750
      );
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function calculateMonthlyStats(transactions) {
  const stats = {
    totalExpense: 0,
    totalIncome: 0,
    categoryBreakdown: {},
    transactionCount: transactions.length
  };
  
  transactions.forEach(txn => {
    if (txn.type === 'expense') {
      stats.totalExpense += txn.amount;
    } else {
      stats.totalIncome += txn.amount;
    }
    
    if (!stats.categoryBreakdown[txn.category]) {
      stats.categoryBreakdown[txn.category] = 0;
    }
    stats.categoryBreakdown[txn.category] += txn.amount;
  });
  
  stats.netSavings = stats.totalIncome - stats.totalExpense;
  stats.savingsRate = stats.totalIncome > 0 
    ? ((stats.netSavings / stats.totalIncome) * 100).toFixed(1)
    : 0;
  
  return stats;
}

function getMonthName(date) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return months[date.getMonth()];
}

function generateMonthlyReportHTML(data) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #3366cc 0%, #254fa0 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">📈 Monthly Finance Report</h1>
        <p style="margin: 5px 0 0 0; font-size: 16px; opacity: 0.9;">${data.month} ${data.year}</p>
      </div>
      
      <div style="padding: 30px; background-color: #f8f8f8;">
        <p>Hi ${data.userName},</p>
        <p>Your detailed monthly finance report for <strong>${data.month} ${data.year}</strong> is attached as a PDF.</p>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0; color: #856404;">📎 Please find the detailed PDF report attached to this email.</p>
        </div>
        
        <p>The PDF report includes:</p>
        <ul style="color: #666;">
          <li>Complete spending summary</li>
          <li>Category-wise breakdown</li>
          <li>Income vs Expenses analysis</li>
          <li>All transactions for the month</li>
          <li>Savings rate calculation</li>
        </ul>
        
        <div style="margin-top: 20px; text-align: center;">
          <a href="https://expensecloud.app/analytics" 
             style="background-color: #3366cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Analytics
          </a>
        </div>
      </div>
      
      <div style="padding: 20px; text-align: center; color: #999; font-size: 12px; background: white; border-top: 1px solid #ddd;">
        <p style="margin: 0;">ExpenseCloud • Smart Finance Manager</p>
        <p style="margin: 5px 0 0 0;">© 2024 All rights reserved</p>
      </div>
    </div>
  `;
}

module.exports = { sendMonthlyReport };
```

---

## Step 6: Update Main Functions Index

Edit `functions/index.js`:
```javascript
const admin = require('firebase-admin');
const functions = require('firebase-functions');
const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid-transport');
require('dotenv').config();

// Initialize Firebase
admin.initializeApp();

// Configure email transport
const transporter = nodemailer.createTransport(
  sgTransport({
    service: 'SendGrid',
    auth: {
      api_user: 'apikey',
      api_key: process.env.SENDGRID_API_KEY
    }
  })
);

// Import all functions
const { detectAnomaly } = require('./anomaly-alert');
const { sendWeeklyDigest } = require('./weekly-digest');
const { sendMonthlyReport } = require('./monthly-report');

// Export all functions
exports.detectAnomaly = detectAnomaly;
exports.sendWeeklyDigest = sendWeeklyDigest;
exports.sendMonthlyReport = sendMonthlyReport;

module.exports = { admin, transporter };
```

---

## Step 7: Deploy Functions

```bash
cd functions
firebase deploy --only functions
```

---

## Step 8: Configure User Preferences in Frontend

Add to your database schema (Firestore):
```
users/{userId}
  - email: string
  - name: string
  - notificationPreferences:
      - anomalyAlert: boolean (default: true)
      - weeklyDigest: boolean (default: true)
      - monthlyReport: boolean (default: true)
```

---

## Step 9: Add Notification Settings to Frontend

Create `notificationSettings.html`:
```html
<div class="notification-settings">
  <h3>Email Notifications</h3>
  
  <div class="setting-item">
    <input type="checkbox" id="anomalyAlert" checked>
    <label for="anomalyAlert">
      <strong>Anomaly Alerts</strong>
      <small>Get notified of unusual spending</small>
    </label>
  </div>
  
  <div class="setting-item">
    <input type="checkbox" id="weeklyDigest" checked>
    <label for="weeklyDigest">
      <strong>Weekly Digest</strong>
      <small>Receive weekly summary every Monday</small>
    </label>
  </div>
  
  <div class="setting-item">
    <input type="checkbox" id="monthlyReport" checked>
    <label for="monthlyReport">
      <strong>Monthly Report</strong>
      <small>Get detailed PDF report on 1st of each month</small>
    </label>
  </div>
  
  <button onclick="saveNotificationPreferences()">Save Preferences</button>
</div>

<script>
async function saveNotificationPreferences() {
  const userId = getCurrentUser().uid;
  const prefs = {
    anomalyAlert: document.getElementById('anomalyAlert').checked,
    weeklyDigest: document.getElementById('weeklyDigest').checked,
    monthlyReport: document.getElementById('monthlyReport').checked
  };
  
  await firebase.firestore().collection('users').doc(userId)
    .update({ notificationPreferences: prefs });
  
  alert('Notification preferences updated!');
}
</script>
```

---

## Step 10: Testing

### Test Anomaly Alert:
```bash
firebase functions:shell
> detectAnomaly({data: {amount: 50000, category: "Food"}})
```

### Test Weekly Digest:
```bash
firebase pubsub:topic:publish sendWeeklyDigest
```

### Test Monthly Report:
```bash
firebase pubsub:topic:publish sendMonthlyReport
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Emails not sending | Check SendGrid API key in `.env` |
| PDF not generating | Install `pdfkit` and `puppeteer` |
| Functions timeout | Increase timeout in `firebase.json` |
| Email blocked | Check spam folder or SendGrid dashboard |

---

## Security Best Practices

1. **Use environment variables** for API keys
2. **Add rate limiting** to prevent spam
3. **Validate user emails** before sending
4. **Encrypt sensitive data** in Firestore
5. **Use CORS** to prevent unauthorized access
6. **Monitor function logs** regularly

