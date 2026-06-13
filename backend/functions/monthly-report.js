// ============================================================
//  Monthly PDF Report Generator & Email Module
//  ExpenseCloud — Cloud Functions
//
//  Generates a styled multi-page PDF using pdfkit (in-memory),
//  then emails it as an attachment via nodemailer.
//  Clerk SDK is used to look up the user's primary email.
// ============================================================

'use strict';

const PDFDocument = require('pdfkit');
const nodemailer  = require('nodemailer');
const { Clerk }   = require('@clerk/clerk-sdk-node');

// ── Clerk client (uses CLERK_SECRET_KEY from .env / Firebase config) ──
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

// ── Nodemailer transporter ──
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

// ── Rupee formatter ──
const fmt = (n) => `Rs.${Number(n || 0).toLocaleString('en-IN')}`;
const pct = (n) => `${Number(n || 0).toFixed(1)}%`;

// ─────────────────────────────────────────────────────────────
//  HELPER: Get user's primary email from Clerk,
//          falls back to the email passed in from Firestore.
// ─────────────────────────────────────────────────────────────
async function getUserEmailFromClerk(clerkUserId, fallbackEmail) {
  try {
    const user = await clerk.users.getUser(clerkUserId);
    const addr = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId
    );
    return addr ? addr.emailAddress : fallbackEmail;
  } catch (err) {
    console.warn(`⚠️  Clerk email lookup failed for ${clerkUserId}: ${err.message}. Using Firestore email.`);
    return fallbackEmail;
  }
}

// ─────────────────────────────────────────────────────────────
//  HELPER: Build the PDF buffer in memory using pdfkit
// ─────────────────────────────────────────────────────────────
function buildPDFBuffer(reportData) {
  return new Promise((resolve, reject) => {
    const {
      displayName,
      monthLabel,
      totalIncome,
      totalExpense,
      savings,
      budgetLimit,
      budgetUtilization,
      categoryWise,
      anomalies,
    } = reportData;

    const doc    = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data',  (chunk) => chunks.push(chunk));
    doc.on('end',   ()      => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── COLOUR PALETTE ──
    const BLUE    = '#2563eb';
    const GREEN   = '#10b981';
    const RED     = '#ef4444';
    const DARK    = '#1e293b';
    const GREY    = '#64748b';
    const LIGHT   = '#f8fafc';
    const BORDER  = '#e2e8f0';

    const W = doc.page.width  - 100; // usable width
    const pageH = doc.page.height;

    // ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
    //  PAGE 1 — COVER
    // ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──

    // Background header block
    doc.rect(0, 0, doc.page.width, 220).fill(BLUE);

    // Logo / App name
    doc.fontSize(32).font('Helvetica-Bold').fillColor('#ffffff')
       .text('ExpenseCloud', 50, 60, { align: 'center' });

    doc.fontSize(14).font('Helvetica').fillColor('rgba(255,255,255,0.85)')
       .text('Personal Finance Manager', 50, 100, { align: 'center' });

    // Month badge
    doc.roundedRect(doc.page.width / 2 - 110, 135, 220, 48, 8)
       .fill('rgba(255,255,255,0.15)');
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#ffffff')
       .text(monthLabel, 50, 148, { align: 'center' });

    // User greeting
    doc.moveDown(3);
    doc.fontSize(13).font('Helvetica').fillColor(DARK)
       .text(`Prepared for: ${displayName || 'ExpenseCloud User'}`, 50, 250);

    doc.fontSize(11).fillColor(GREY)
       .text(`Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`, 50, 270);

    // Divider
    doc.moveTo(50, 295).lineTo(doc.page.width - 50, 295).strokeColor(BORDER).lineWidth(1).stroke();

    // Quick-stats strip on cover
    const stats = [
      { label: 'Total Income',      value: fmt(totalIncome),       color: GREEN },
      { label: 'Total Expense',      value: fmt(totalExpense),      color: RED   },
      { label: 'Net Savings',        value: fmt(savings),           color: savings >= 0 ? GREEN : RED },
      { label: 'Budget Used',        value: pct(budgetUtilization), color: budgetUtilization > 100 ? RED : BLUE },
    ];

    const colW = W / stats.length;
    stats.forEach((s, i) => {
      const x = 50 + i * colW;
      doc.roundedRect(x, 310, colW - 12, 90, 6).fill(LIGHT);
      doc.fontSize(10).font('Helvetica').fillColor(GREY).text(s.label, x + 10, 322, { width: colW - 22 });
      doc.fontSize(18).font('Helvetica-Bold').fillColor(s.color).text(s.value, x + 10, 340, { width: colW - 22 });
    });

    doc.fontSize(10).font('Helvetica').fillColor(GREY)
       .text(
         'This report is auto-generated by ExpenseCloud Cloud Functions every 1st of the month.',
         50, 430, { align: 'center', width: W }
       );

    // ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
    //  PAGE 2 — CATEGORY BREAKDOWN
    // ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
    doc.addPage();

    _sectionHeader(doc, 'Category Breakdown', BLUE, W);

    const cats = Object.entries(categoryWise || {})
      .sort((a, b) => b[1] - a[1]);

    if (cats.length === 0) {
      doc.fontSize(12).fillColor(GREY).text('No expense transactions recorded this month.', 50, 120);
    } else {
      // Table header
      const rowTop = 115;
      const cols   = { rank: 50, name: 90, amount: 330, pct: 430, bar: 470 };

      doc.roundedRect(50, rowTop - 4, W, 22, 3).fill(BLUE);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text('#',         cols.rank,   rowTop, { width: 35 });
      doc.text('Category',  cols.name,   rowTop, { width: 230 });
      doc.text('Amount',    cols.amount, rowTop, { width: 90, align: 'right' });
      doc.text('% Share',   cols.pct,    rowTop, { width: 60, align: 'right' });

      let y = rowTop + 26;
      cats.forEach(([cat, amt], idx) => {
        const share = totalExpense > 0 ? (amt / totalExpense) * 100 : 0;
        const bg    = idx % 2 === 0 ? LIGHT : '#ffffff';

        doc.rect(50, y - 3, W, 22).fill(bg);

        doc.fontSize(10).font('Helvetica').fillColor(DARK);
        doc.text(String(idx + 1),     cols.rank,   y, { width: 35 });
        doc.text(cat,                 cols.name,   y, { width: 230 });
        doc.text(fmt(amt),            cols.amount, y, { width: 90, align: 'right' });
        doc.fillColor(share > 30 ? RED : GREY)
           .text(pct(share),          cols.pct,    y, { width: 60, align: 'right' });

        // Mini bar
        const barW = Math.round((share / 100) * 120);
        doc.rect(cols.bar, y + 4, barW, 10).fill(share > 30 ? RED : BLUE);

        y += 22;
        if (y > pageH - 80) { doc.addPage(); y = 60; }
      });
    }

    // ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
    //  PAGE 3 — ANOMALY HIGHLIGHTS
    // ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
    doc.addPage();

    _sectionHeader(doc, 'Anomaly Highlights', RED, W);

    if (!anomalies || anomalies.length === 0) {
      doc.roundedRect(50, 110, W, 60, 6).fill(LIGHT);
      doc.fontSize(13).font('Helvetica-Bold').fillColor(GREEN)
         .text('✓ No anomalies detected this month!', 50, 126, { align: 'center', width: W });
      doc.fontSize(10).font('Helvetica').fillColor(GREY)
         .text('All transactions were within your normal spending patterns.', 50, 146, { align: 'center', width: W });
    } else {
      doc.fontSize(11).font('Helvetica').fillColor(GREY)
         .text(
           `${anomalies.length} transaction${anomalies.length > 1 ? 's' : ''} ` +
           'were flagged as unusually high compared to your historical averages.',
           50, 110, { width: W }
         );

      const aRowTop = 135;
      doc.roundedRect(50, aRowTop - 4, W, 22, 3).fill(RED);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text('Date',        55,  aRowTop, { width: 80 });
      doc.text('Category',   140,  aRowTop, { width: 120 });
      doc.text('Amount',     265,  aRowTop, { width: 90, align: 'right' });
      doc.text('Avg',        360,  aRowTop, { width: 90, align: 'right' });
      doc.text('Multiplier', 455,  aRowTop, { width: 70, align: 'right' });

      let ay = aRowTop + 26;
      anomalies.forEach((a, idx) => {
        const bg   = idx % 2 === 0 ? '#fff5f5' : '#ffffff';
        const date = a.date ? new Date(a.date.seconds * 1000).toLocaleDateString('en-IN') : '—';

        doc.rect(50, ay - 3, W, 22).fill(bg);
        doc.fontSize(9).font('Helvetica').fillColor(DARK);
        doc.text(date,                         55,  ay, { width: 80 });
        doc.text(a.category || '—',           140,  ay, { width: 120 });
        doc.fillColor(RED)
           .text(fmt(a.amount),               265,  ay, { width: 90, align: 'right' });
        doc.fillColor(GREY)
           .text(fmt(a.categoryAverage),      360,  ay, { width: 90, align: 'right' });
        doc.fillColor(RED).font('Helvetica-Bold')
           .text(`${(a.anomalyMultiplier || 0).toFixed(1)}×`, 455, ay, { width: 70, align: 'right' });

        ay += 22;
      });
    }

    // ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
    //  PAGE 4 — SAVINGS ANALYSIS & TIPS
    // ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
    doc.addPage();

    _sectionHeader(doc, 'Savings Analysis & Tips', GREEN, W);

    // Savings gauge
    const savingsRate   = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;
    const budgetUsed    = Math.min(budgetUtilization, 150); // cap display at 150%
    const gaugeColor    = savingsRate >= 20 ? GREEN : savingsRate >= 10 ? '#f59e0b' : RED;

    doc.roundedRect(50, 110, W, 80, 8).fill(LIGHT);

    // Savings rate
    doc.fontSize(11).font('Helvetica').fillColor(GREY).text('Savings Rate', 70, 122);
    doc.fontSize(26).font('Helvetica-Bold').fillColor(gaugeColor)
       .text(pct(savingsRate), 70, 140);

    // Budget utilization
    doc.fontSize(11).font('Helvetica').fillColor(GREY).text('Budget Utilization', 270, 122);
    doc.fontSize(26).font('Helvetica-Bold').fillColor(budgetUtilization > 100 ? RED : BLUE)
       .text(pct(budgetUtilization), 270, 140);

    // Net savings
    doc.fontSize(11).font('Helvetica').fillColor(GREY).text('Net Savings', 450, 122);
    doc.fontSize(26).font('Helvetica-Bold').fillColor(savings >= 0 ? GREEN : RED)
       .text(fmt(savings), 450, 140);

    // Progress bar — budget utilization
    const barY = 205;
    doc.fontSize(10).font('Helvetica').fillColor(DARK)
       .text('Budget Progress', 50, barY - 18);
    doc.roundedRect(50, barY, W, 16, 4).fill(BORDER);
    const fillW = Math.min((budgetUtilization / 100) * W, W);
    doc.roundedRect(50, barY, fillW, 16, 4)
       .fill(budgetUtilization > 100 ? RED : budgetUtilization > 80 ? '#f59e0b' : GREEN);
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff')
       .text(pct(budgetUtilization), 50 + fillW - 40, barY + 3, { width: 38, align: 'right' });

    // Personalised tips
    const tips = _generateTips(savingsRate, budgetUtilization, cats);
    doc.fontSize(13).font('Helvetica-Bold').fillColor(DARK)
       .text('Personalised Recommendations', 50, 245);

    tips.forEach((tip, i) => {
      doc.roundedRect(50, 268 + i * 52, W, 44, 6).fill(LIGHT);
      doc.circle(70, 290 + i * 52, 10).fill(BLUE);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff')
         .text(String(i + 1), 66, 285 + i * 52);
      doc.fontSize(10).font('Helvetica').fillColor(DARK)
         .text(tip, 88, 272 + i * 52, { width: W - 50 });
    });

    // ── Footer on last page ──
    const footerY = pageH - 55;
    doc.moveTo(50, footerY).lineTo(doc.page.width - 50, footerY).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.fontSize(9).font('Helvetica').fillColor(GREY)
       .text(
         `ExpenseCloud Financial Report — ${monthLabel} | Generated automatically by Cloud Functions`,
         50, footerY + 8, { align: 'center', width: W }
       );

    doc.end();
  });
}

// ─────────────────────────────────────────────────────────────
//  HELPER: Section header band
// ─────────────────────────────────────────────────────────────
function _sectionHeader(doc, title, color, W) {
  doc.rect(0, 0, doc.page.width, 88).fill(color);
  doc.fontSize(22).font('Helvetica-Bold').fillColor('#ffffff')
     .text(title, 50, 28, { width: W });
  doc.fontSize(10).font('Helvetica').fillColor('rgba(255,255,255,0.75)')
     .text('ExpenseCloud Monthly Report', 50, 58, { width: W });
}

// ─────────────────────────────────────────────────────────────
//  HELPER: Generate 3 personalised tips
// ─────────────────────────────────────────────────────────────
function _generateTips(savingsRate, budgetUtilization, cats) {
  const tips = [];

  if (savingsRate < 10) {
    tips.push('Your savings rate is below 10%. Try the 50/30/20 rule — 50% needs, 30% wants, 20% savings. Small cuts in discretionary spending add up quickly.');
  } else if (savingsRate >= 20) {
    tips.push('Excellent savings rate! Consider putting a portion into a recurring deposit or SIP to grow your wealth over time.');
  } else {
    tips.push('You\'re on track! Aim to push your savings rate above 20% by reviewing subscriptions and dining-out expenses.');
  }

  if (budgetUtilization > 100) {
    tips.push(`You exceeded your budget by ${(budgetUtilization - 100).toFixed(0)}%. Review your top spending categories and consider setting stricter category-level limits in your ExpenseCloud settings.`);
  } else if (budgetUtilization > 85) {
    tips.push('You\'re close to your monthly budget limit. Keep an eye on discretionary spending for the rest of the month to avoid going over.');
  } else {
    tips.push('Great budget discipline! You\'re comfortably within your monthly limit. Consider investing the surplus.');
  }

  if (cats.length > 0) {
    const topCat = cats[0];
    tips.push(`Your highest spend category is "${topCat[0]}" at Rs.${Number(topCat[1]).toLocaleString('en-IN')}. Setting a specific limit for this category in ExpenseCloud can help you stay on track next month.`);
  } else {
    tips.push('Log your expenses consistently to get personalised category-level insights and smarter recommendations.');
  }

  return tips;
}

// ─────────────────────────────────────────────────────────────
//  MAIN EXPORT: Generate PDF and send via email
//
//  Parameters:
//    uid         — Firebase / Clerk user ID
//    firestoreEmail — email stored in Firestore (fallback)
//    reportData  — { displayName, monthLabel, totalIncome,
//                    totalExpense, savings, budgetLimit,
//                    budgetUtilization, categoryWise, anomalies }
// ─────────────────────────────────────────────────────────────
async function generateAndEmailMonthlyReport(uid, firestoreEmail, reportData) {
  // 1. Resolve email via Clerk (fallback to Firestore value)
  const email = await getUserEmailFromClerk(uid, firestoreEmail);
  if (!email) {
    console.warn(`⚠️  No email found for user ${uid}. Skipping monthly report.`);
    return { success: false, reason: 'no_email' };
  }

  // 2. Build PDF buffer
  console.log(`📄 Generating PDF report for ${uid} (${reportData.monthLabel})...`);
  const pdfBuffer = await buildPDFBuffer(reportData);

  // 3. Build the HTML email body
  const { monthLabel, totalIncome, totalExpense, savings, budgetUtilization } = reportData;
  const savingsColor = savings >= 0 ? '#10b981' : '#ef4444';
  const budgetColor  = budgetUtilization > 100 ? '#ef4444' : '#2563eb';

  const htmlEmail = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ${monthLabel} Report</title>
</head>
<body style="margin:0; padding:0; background-color:#0f172a; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:600px; margin:32px auto; background:#1e293b; border-radius:16px; overflow:hidden; box-shadow:0 25px 50px rgba(0,0,0,0.4);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#2563eb 0%,#10b981 100%); padding:40px 36px; text-align:center;">
      <div style="font-size:32px; font-weight:800; color:#ffffff; letter-spacing:-0.5px;">
        💰 ExpenseCloud
      </div>
      <div style="font-size:14px; color:rgba(255,255,255,0.8); margin-top:6px;">
        Personal Finance Manager
      </div>
      <div style="margin-top:18px; background:rgba(255,255,255,0.15); border-radius:50px; padding:8px 24px; display:inline-block;">
        <span style="font-size:15px; font-weight:700; color:#ffffff;">📄 ${monthLabel} Financial Report</span>
      </div>
    </div>

    <!-- Body -->
    <div style="padding:32px 36px;">
      <p style="font-size:15px; color:#cbd5e1; margin:0 0 24px 0; line-height:1.6;">
        Hi there! Your <strong style="color:#f8fafc;">${monthLabel}</strong> financial report has been generated.
        It's attached as a PDF — open it for your full category breakdown, anomaly highlights, and personalised savings tips.
      </p>

      <!-- Stats grid -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr>
          <td width="50%" style="padding-right:8px;">
            <div style="background:#0f172a; border-radius:12px; padding:20px; text-align:center;">
              <div style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:8px;">Income</div>
              <div style="font-size:22px; font-weight:800; color:#10b981;">₹${Number(totalIncome).toLocaleString('en-IN')}</div>
            </div>
          </td>
          <td width="50%" style="padding-left:8px;">
            <div style="background:#0f172a; border-radius:12px; padding:20px; text-align:center;">
              <div style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:8px;">Expenses</div>
              <div style="font-size:22px; font-weight:800; color:#ef4444;">₹${Number(totalExpense).toLocaleString('en-IN')}</div>
            </div>
          </td>
        </tr>
        <tr><td colspan="2" style="height:12px;"></td></tr>
        <tr>
          <td width="50%" style="padding-right:8px;">
            <div style="background:#0f172a; border-radius:12px; padding:20px; text-align:center;">
              <div style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:8px;">Net Savings</div>
              <div style="font-size:22px; font-weight:800; color:${savingsColor};">₹${Number(savings).toLocaleString('en-IN')}</div>
            </div>
          </td>
          <td width="50%" style="padding-left:8px;">
            <div style="background:#0f172a; border-radius:12px; padding:20px; text-align:center;">
              <div style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:8px;">Budget Used</div>
              <div style="font-size:22px; font-weight:800; color:${budgetColor};">${Number(budgetUtilization).toFixed(1)}%</div>
            </div>
          </td>
        </tr>
      </table>

      <!-- CTA Button -->
      <div style="text-align:center; margin:28px 0;">
        <a href="${process.env.APP_URL || 'https://expensecloud.app'}/dashboard"
           style="display:inline-block; background:linear-gradient(135deg,#2563eb,#10b981); color:#ffffff;
                  padding:14px 36px; text-decoration:none; border-radius:50px; font-size:15px;
                  font-weight:700; letter-spacing:0.3px;">
          Open Dashboard →
        </a>
      </div>

      <!-- Attachment note -->
      <div style="background:#0f172a; border-left:4px solid #2563eb; border-radius:0 8px 8px 0; padding:14px 18px; margin-top:12px;">
        <p style="margin:0; font-size:13px; color:#94a3b8; line-height:1.5;">
          📎 <strong style="color:#f8fafc;">PDF attached:</strong> Your full report including category analysis, anomaly alerts, and savings recommendations is in the attachment below.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:20px 36px; border-top:1px solid rgba(255,255,255,0.06); text-align:center;">
      <p style="font-size:12px; color:#475569; margin:0;">
        This report is auto-generated by ExpenseCloud every 1st of the month.<br>
        © ${new Date().getFullYear()} ExpenseCloud. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;

  // 4. Send email with PDF attachment
  const filename = `ExpenseCloud_Report_${monthLabel.replace(/\s/g, '_')}.pdf`;

  await transporter.sendMail({
    from:    `"ExpenseCloud" <${process.env.EMAIL_USER}>`,
    to:      email,
    subject: `📄 Your ${monthLabel} ExpenseCloud Financial Report`,
    html:    htmlEmail,
    attachments: [
      {
        filename,
        content:     pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });

  console.log(`✅ Monthly report PDF emailed to ${email} for ${monthLabel}`);
  return { success: true, email, filename };
}

module.exports = {
  generateAndEmailMonthlyReport,
  getUserEmailFromClerk,
};