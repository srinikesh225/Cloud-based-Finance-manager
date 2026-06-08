// ============================================================
//  Weekly Digest, Behavioral Insights & Budget Alert Emails
//  ExpenseCloud — Cloud Functions
//
//  Sends rich HTML emails via nodemailer every Sunday at 8 AM IST.
//  Clerk SDK is used to verify the user's primary email address.
// ============================================================

'use strict';

const { Clerk }   = require('@clerk/clerk-sdk-node');
const nodemailer  = require('nodemailer');

// ── Clerk client ──
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

// ── Nodemailer transporter (Gmail) ──
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

// ── Formatters ──
const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const pct = (n) => `${Number(n || 0).toFixed(1)}%`;

// ─────────────────────────────────────────────────────────────
//  HELPER: Get user email from Clerk
// ─────────────────────────────────────────────────────────────
async function getUserEmailFromClerk(clerkUserId) {
  try {
    const user = await clerk.users.getUser(clerkUserId);
    const addr = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId
    );
    return addr ? addr.emailAddress : null;
  } catch (err) {
    console.error(`❌ Failed to fetch user email from Clerk: ${err.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
//  HELPER: Derive behavioral insights from weekly data
//  Returns an array of plain-text insight strings.
// ─────────────────────────────────────────────────────────────
function getBehavioralInsights(topCategories, trend, totalSpent, avgDaily, budgetLimit) {
  const insights = [];

  // 1. Spending velocity
  if (trend > 25) {
    insights.push(`🔺 <strong>Spending spike:</strong> You spent <strong>${pct(Math.abs(trend))} more</strong> than last week. Try to slow down before the month end.`);
  } else if (trend < -20) {
    insights.push(`🟢 <strong>Great restraint:</strong> Your spending dropped <strong>${pct(Math.abs(trend))}</strong> compared to last week — keep it up!`);
  } else {
    insights.push(`📊 <strong>Stable pace:</strong> Your spending is consistent with last week (${trend > 0 ? '+' : ''}${pct(trend)}), which is a healthy sign.`);
  }

  // 2. Top category behaviour
  if (topCategories.length > 0) {
    const top = topCategories[0];
    const topShare = totalSpent > 0 ? (top.amount / totalSpent) * 100 : 0;
    if (topShare > 50) {
      insights.push(`🏷️ <strong>Category dominance:</strong> "${top.category}" accounted for <strong>${pct(topShare)}</strong> of your weekly spend (${fmt(top.amount)}). Consider if this is intentional or can be reduced.`);
    } else {
      insights.push(`📂 <strong>Balanced categories:</strong> Your spending is spread across categories — your top category "${top.category}" is ${pct(topShare)} of total spend.`);
    }
  }

  // 3. Daily average vs budget
  if (budgetLimit) {
    const dailyBudget = budgetLimit / 30;
    if (avgDaily > dailyBudget * 1.3) {
      insights.push(`⚠️ <strong>Daily average alert:</strong> Your daily spend of ${fmt(avgDaily)} is <strong>${pct(((avgDaily - dailyBudget) / dailyBudget) * 100)} above</strong> your daily budget target of ${fmt(Math.round(dailyBudget))}.`);
    } else if (avgDaily < dailyBudget * 0.7) {
      insights.push(`✅ <strong>Under daily budget:</strong> You're spending ${fmt(avgDaily)}/day, comfortably below your ${fmt(Math.round(dailyBudget))}/day target. Great discipline!`);
    }
  }

  // 4. Transaction frequency tip
  if (topCategories.length >= 2) {
    const second = topCategories[1];
    insights.push(`💡 <strong>Tip:</strong> "${second.category}" had <strong>${second.count} transactions</strong> this week totalling ${fmt(second.amount)}. Bundling similar purchases can reduce impulse spending.`);
  }

  return insights.slice(0, 4); // max 4 insights
}

// ─────────────────────────────────────────────────────────────
//  SEND WEEKLY BEHAVIORAL DIGEST EMAIL
//  Parameters:
//    clerkUserId — Clerk / Firebase UID
//    email       — Recipient email address
//    weeklyData  — { totalSpent, avgDaily, topCategories,
//                    trend, weekEnding, budgetLimit }
// ─────────────────────────────────────────────────────────────
async function sendWeeklyDigestEmail(clerkUserId, email, weeklyData) {
  try {
    const {
      totalSpent,
      avgDaily,
      topCategories = [],
      trend          = 0,
      weekEnding     = '',
      budgetLimit    = 0,
    } = weeklyData;

    const trendIcon   = trend > 5 ? '📈' : trend < -5 ? '📉' : '〰️';
    const trendText   = trend > 5 ? 'higher' : trend < -5 ? 'lower' : 'similar';
    const trendColor  = trend > 5 ? '#ef4444' : trend < -5 ? '#10b981' : '#f59e0b';

    const insights = getBehavioralInsights(topCategories, trend, totalSpent, avgDaily, budgetLimit);

    // Build category rows
    const catRows = topCategories.map((cat, i) => {
      const share = totalSpent > 0 ? ((cat.amount / totalSpent) * 100).toFixed(1) : '0.0';
      const barW  = Math.round((cat.amount / (topCategories[0].amount || 1)) * 120);
      return `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
          <td style="padding:10px 12px; color:#64748b; font-size:13px;">${i + 1}</td>
          <td style="padding:10px 12px; color:#f8fafc; font-size:13px; font-weight:600;">${cat.category}</td>
          <td style="padding:10px 12px; color:#94a3b8; font-size:12px; text-align:center;">${cat.count} txns</td>
          <td style="padding:10px 12px; text-align:right;">
            <span style="font-size:14px; font-weight:700; color:#10b981;">${fmt(cat.amount)}</span><br>
            <span style="font-size:10px; color:#64748b;">${share}% of total</span>
          </td>
        </tr>`;
    }).join('');

    // Build insight rows
    const insightRows = insights.map((ins) => `
      <div style="background:#0f172a; border-left:3px solid #2563eb; border-radius:0 8px 8px 0;
                  padding:12px 16px; margin-bottom:10px; font-size:13px; color:#cbd5e1; line-height:1.6;">
        ${ins}
      </div>`).join('');

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Spending Digest</title>
</head>
<body style="margin:0; padding:0; background-color:#0a0e1a; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:600px; margin:32px auto; background:#1e293b; border-radius:16px; overflow:hidden; box-shadow:0 25px 50px rgba(0,0,0,0.5);">

    <!-- Header gradient -->
    <div style="background:linear-gradient(135deg,#2563eb 0%,#10b981 100%); padding:36px 36px 28px; text-align:center;">
      <div style="font-size:30px; font-weight:800; color:#ffffff; letter-spacing:-0.5px;">💰 ExpenseCloud</div>
      <div style="font-size:13px; color:rgba(255,255,255,0.75); margin-top:4px;">Weekly Behavioral Digest</div>
      <div style="margin-top:14px; background:rgba(255,255,255,0.15); border-radius:50px;
                  padding:6px 20px; display:inline-block; font-size:13px; color:#ffffff; font-weight:600;">
        📅 Week ending ${weekEnding}
      </div>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;">

      <!-- Trend banner -->
      <div style="background:#0f172a; border-radius:12px; padding:18px 22px; margin-bottom:24px;
                  display:flex; align-items:center; gap:14px;">
        <div style="font-size:34px;">${trendIcon}</div>
        <div>
          <div style="font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:4px;">Week-on-Week Trend</div>
          <div style="font-size:16px; font-weight:700; color:${trendColor};">
            ${trend > 0 ? '+' : ''}${pct(trend)} ${trendText} than last week
          </div>
        </div>
      </div>

      <!-- Stats row -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td width="50%" style="padding-right:6px;">
            <div style="background:#0f172a; border-radius:12px; padding:18px; text-align:center;">
              <div style="font-size:10px; color:#64748b; font-weight:600; text-transform:uppercase;
                          letter-spacing:0.8px; margin-bottom:6px;">Total Spent</div>
              <div style="font-size:24px; font-weight:800; color:#ef4444;">${fmt(totalSpent)}</div>
            </div>
          </td>
          <td width="50%" style="padding-left:6px;">
            <div style="background:#0f172a; border-radius:12px; padding:18px; text-align:center;">
              <div style="font-size:10px; color:#64748b; font-weight:600; text-transform:uppercase;
                          letter-spacing:0.8px; margin-bottom:6px;">Daily Average</div>
              <div style="font-size:24px; font-weight:800; color:#2563eb;">${fmt(avgDaily)}</div>
            </div>
          </td>
        </tr>
      </table>

      <!-- Category breakdown -->
      ${topCategories.length > 0 ? `
      <div style="margin-bottom:24px;">
        <div style="font-size:14px; font-weight:700; color:#f8fafc; margin-bottom:12px;">
          🏷️ Top Spending Categories
        </div>
        <table width="100%" cellpadding="0" cellspacing="0"
               style="background:#0f172a; border-radius:12px; overflow:hidden;">
          <thead>
            <tr style="background:rgba(37,99,235,0.3);">
              <th style="padding:10px 12px; text-align:left; font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase;">#</th>
              <th style="padding:10px 12px; text-align:left; font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase;">Category</th>
              <th style="padding:10px 12px; text-align:center; font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase;">Frequency</th>
              <th style="padding:10px 12px; text-align:right; font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase;">Amount</th>
            </tr>
          </thead>
          <tbody>${catRows}</tbody>
        </table>
      </div>` : ''}

      <!-- Behavioral insights -->
      <div style="margin-bottom:24px;">
        <div style="font-size:14px; font-weight:700; color:#f8fafc; margin-bottom:12px;">
          🧠 Behavioral Insights
        </div>
        ${insightRows}
      </div>

      <!-- CTA -->
      <div style="text-align:center; margin:24px 0 8px;">
        <a href="${process.env.APP_URL || 'https://expensecloud.app'}/dashboard"
           style="display:inline-block; background:linear-gradient(135deg,#2563eb,#10b981);
                  color:#ffffff; padding:14px 36px; text-decoration:none; border-radius:50px;
                  font-size:14px; font-weight:700; letter-spacing:0.3px;">
          View Full Dashboard →
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="padding:18px 32px; border-top:1px solid rgba(255,255,255,0.06); text-align:center;">
      <p style="font-size:11px; color:#475569; margin:0; line-height:1.6;">
        You're receiving this because weekly digests are enabled in your ExpenseCloud account.<br>
        © ${new Date().getFullYear()} ExpenseCloud. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from:    `"ExpenseCloud" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: `📊 Your Weekly Spending Digest — ${weekEnding}`,
      html:    htmlContent,
    });

    console.log(`✅ Weekly digest email sent to ${email}`);
    return { success: true, email };

  } catch (err) {
    console.error(`❌ Failed to send weekly digest email:`, err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
//  SEND BUDGET ALERT EMAIL
//  Parameters:
//    clerkUserId — Clerk / Firebase UID
//    email       — Recipient email address
//    budgetData  — { totalSpent, budgetLimit, overshoot, percentOver }
// ─────────────────────────────────────────────────────────────
async function sendBudgetAlertEmail(clerkUserId, email, budgetData) {
  try {
    const { totalSpent, budgetLimit, overshoot, percentOver } = budgetData;
    const fillPct = Math.min(100, (totalSpent / budgetLimit) * 100).toFixed(0);

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Budget Alert</title>
</head>
<body style="margin:0; padding:0; background-color:#0a0e1a; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:600px; margin:32px auto; background:#1e293b; border-radius:16px; overflow:hidden; box-shadow:0 25px 50px rgba(0,0,0,0.5);">

    <!-- Red header -->
    <div style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%); padding:36px 36px 28px; text-align:center;">
      <div style="font-size:48px; margin-bottom:10px;">⚠️</div>
      <div style="font-size:26px; font-weight:800; color:#ffffff;">Budget Exceeded</div>
      <div style="font-size:13px; color:rgba(255,255,255,0.8); margin-top:6px;">
        Your monthly spending has crossed your set limit
      </div>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;">

      <!-- Alert box -->
      <div style="background:#0f172a; border-left:4px solid #ef4444; border-radius:0 12px 12px 0;
                  padding:18px 20px; margin-bottom:24px;">
        <p style="margin:0; font-size:14px; color:#cbd5e1; line-height:1.7;">
          You've spent <strong style="color:#ef4444;">${fmt(totalSpent)}</strong> — that's
          <strong style="color:#ef4444;">${fmt(overshoot)}</strong> over your budget of
          <strong style="color:#f8fafc;">${fmt(budgetLimit)}</strong>
          (<strong style="color:#ef4444;">${pct(percentOver)} over limit</strong>).
        </p>
      </div>

      <!-- Progress bar -->
      <div style="margin-bottom:24px;">
        <div style="font-size:12px; color:#64748b; margin-bottom:8px; font-weight:600; text-transform:uppercase; letter-spacing:0.6px;">
          Budget Utilization
        </div>
        <div style="background:#0f172a; border-radius:50px; height:18px; overflow:hidden;">
          <div style="background:linear-gradient(90deg,#ef4444,#dc2626); height:100%; width:${fillPct}%;
                      display:flex; align-items:center; justify-content:flex-end; padding-right:8px;
                      border-radius:50px;">
            <span style="font-size:10px; font-weight:700; color:#fff;">${fillPct}%</span>
          </div>
        </div>
      </div>

      <!-- Detail rows -->
      <div style="background:#0f172a; border-radius:12px; overflow:hidden; margin-bottom:24px;">
        ${[
          ['Budget Limit',     fmt(budgetLimit),  '#94a3b8'],
          ['Total Spent',      fmt(totalSpent),   '#ef4444'],
          ['Amount Over',      fmt(overshoot),    '#ef4444'],
          ['Percentage Over',  pct(percentOver),  '#ef4444'],
        ].map(([label, value, color], i) => `
          <div style="display:flex; justify-content:space-between; padding:13px 18px;
                      border-bottom:${i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none'};">
            <span style="font-size:13px; color:#64748b;">${label}</span>
            <span style="font-size:13px; font-weight:700; color:${color};">${value}</span>
          </div>`).join('')}
      </div>

      <!-- Recommended actions -->
      <div style="margin-bottom:24px;">
        <div style="font-size:13px; font-weight:700; color:#f8fafc; margin-bottom:10px;">
          📋 Recommended Actions
        </div>
        ${[
          'Review your recent transactions to identify high spends',
          'Avoid discretionary purchases until the month ends',
          'Adjust your budget limit if your income has increased',
          'Set category-level limits in ExpenseCloud to stay on track',
        ].map((action) => `
          <div style="display:flex; align-items:flex-start; gap:10px; margin-bottom:8px;">
            <div style="width:6px; height:6px; background:#2563eb; border-radius:50%; margin-top:6px; flex-shrink:0;"></div>
            <span style="font-size:13px; color:#cbd5e1; line-height:1.5;">${action}</span>
          </div>`).join('')}
      </div>

      <!-- CTA -->
      <div style="text-align:center;">
        <a href="${process.env.APP_URL || 'https://expensecloud.app'}/dashboard"
           style="display:inline-block; background:linear-gradient(135deg,#2563eb,#10b981);
                  color:#ffffff; padding:14px 36px; text-decoration:none; border-radius:50px;
                  font-size:14px; font-weight:700;">
          Manage Budget →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:18px 32px; border-top:1px solid rgba(255,255,255,0.06); text-align:center;">
      <p style="font-size:11px; color:#475569; margin:0;">
        This is an automated alert from ExpenseCloud.<br>
        © ${new Date().getFullYear()} ExpenseCloud. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from:    `"ExpenseCloud" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: `⚠️ Budget Alert — You've Exceeded Your Monthly Limit`,
      html:    htmlContent,
    });

    console.log(`✅ Budget alert email sent to ${email}`);
    return { success: true, email };

  } catch (err) {
    console.error(`❌ Failed to send budget alert email:`, err);
    throw err;
  }
}

module.exports = {
  sendWeeklyDigestEmail,
  sendBudgetAlertEmail,
  getUserEmailFromClerk,
};
