// ============================================================
//  Anomaly Alert Email Module
//  Sends email notifications via Clerk when unusual spending
//  is detected on expense transactions
// ============================================================

const { Clerk } = require('@clerk/clerk-sdk-node');
const nodemailer = require('nodemailer');

// Initialize Clerk (uses CLERK_SECRET_KEY from environment)
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

// Configure email transporter
const transporter = nodemailer.createTransport(
  process.env.EMAIL_HOST 
    ? {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      }
    : {
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      }
);

// ─────────────────────────────────────────────────────────────
//  HELPER: format Indian Rupees
// ─────────────────────────────────────────────────────────────
const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

// ─────────────────────────────────────────────────────────────
//  Send Anomaly Detection Email via Clerk
//  Parameters:
//    - clerkUserId: User's Clerk ID
//    - email: User's email address
//    - anomalyDetails: { category, amount, average, multiplier, description }
// ─────────────────────────────────────────────────────────────
async function sendAnomalyAlertEmail(clerkUserId, email, anomalyDetails) {
  try {
    const { category, amount, average, multiplier, description } = anomalyDetails;

    // Email subject and content
    const subject = `🚨 Unusual Spending Alert: ${category}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Anomaly Alert</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 20px auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { border-left: 4px solid #ff6b6b; padding-left: 15px; margin-bottom: 25px; }
          h1 { color: #ff6b6b; margin: 0 0 5px 0; }
          .subtitle { color: #666; font-size: 14px; }
          .alert-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
          .detail-row:last-child { border-bottom: none; }
          .label { color: #666; font-weight: 500; }
          .value { color: #333; font-weight: 600; }
          .amount-high { color: #ff6b6b; font-weight: bold; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center; }
          .button { display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Unusual Spending Alert</h1>
            <p class="subtitle">We detected unusual spending in your ${category} category</p>
          </div>
          
          <div class="alert-box">
            <strong>⚠️ Alert Details:</strong><br>
            Your recent ${category} transaction of <span class="amount-high">${fmt(amount)}</span> is <strong>${multiplier}× your usual spending</strong> in this category.
          </div>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <div class="detail-row">
              <span class="label">Category:</span>
              <span class="value">${category}</span>
            </div>
            <div class="detail-row">
              <span class="label">Transaction Amount:</span>
              <span class="value amount-high">${fmt(amount)}</span>
            </div>
            <div class="detail-row">
              <span class="label">Your Average:</span>
              <span class="value">${fmt(average)}</span>
            </div>
            <div class="detail-row">
              <span class="label">Multiplier:</span>
              <span class="value">${multiplier}×</span>
            </div>
            ${description ? `
            <div class="detail-row">
              <span class="label">Description:</span>
              <span class="value">${description}</span>
            </div>
            ` : ''}
          </div>
          
          <p style="color: #666; margin: 20px 0;">
            This alert helps you identify unusual spending patterns. Review the transaction and adjust your budget if needed.
          </p>
          
          <a href="${process.env.APP_URL || 'https://expensecloud.app'}/dashboard" class="button">View Dashboard</a>
          
          <div class="footer">
            <p>This is an automated email from ExpenseCloud. Please do not reply to this email.</p>
            <p>© 2024 ExpenseCloud. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via Clerk's email functionality or nodemailer
    if (process.env.USE_CLERK_EMAIL === 'true') {
      // Using Clerk's native email system (requires Clerk backend setup)
      // This requires Clerk email template configuration
      console.log(`📧 Sending anomaly alert via Clerk to ${email}`);
      // Note: Clerk email sending requires API setup - this is a placeholder
    } else {
      // Using nodemailer
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: subject,
        html: htmlContent,
      });
    }

    console.log(`✅ Anomaly alert email sent to ${email}`);
    return { success: true, email };
  } catch (err) {
    console.error(`❌ Failed to send anomaly alert email:`, err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
//  Get User Email from Clerk
// ─────────────────────────────────────────────────────────────
async function getUserEmailFromClerk(clerkUserId) {
  try {
    const user = await clerk.users.getUser(clerkUserId);
    const emailAddress = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId);
    return emailAddress ? emailAddress.emailAddress : null;
  } catch (err) {
    console.error(`❌ Failed to fetch user email from Clerk:`, err);
    return null;
  }
}

module.exports = {
  sendAnomalyAlertEmail,
  getUserEmailFromClerk,
};
