// ============================================================
//  ExpenseCloud — Cloud Functions  (100% complete)
//  Auth trigger, Budget Alert, Anomaly Detection,
//  Spend Forecasting, Weekly Behavioral Digest,
//  Monthly PDF Report (email), Recurring Tx Detection
// ============================================================

const functions = require("firebase-functions");
const admin     = require("firebase-admin");
const { sendAnomalyAlertEmail, getUserEmailFromClerk: getEmailFromClerkAnomaly } = require("./anomaly-alert");
const { sendWeeklyDigestEmail, sendBudgetAlertEmail, getUserEmailFromClerk: getEmailFromClerkDigest } = require("./weekly-digest");
const { generateAndEmailMonthlyReport } = require("./monthly-report");

admin.initializeApp();
const db = admin.firestore();

// ─────────────────────────────────────────────────────────────
//  HELPER: format Indian Rupees
// ─────────────────────────────────────────────────────────────
const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

// ─────────────────────────────────────────────────────────────
//  1. AUTH TRIGGER — Create user document on signup
//     Fires automatically when a new user registers.
//     Creates: /users/{uid}  with default budget + FCM slot
// ─────────────────────────────────────────────────────────────
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  const { uid, email, displayName } = user;

  try {
    // Create the user document in Firestore
    await db.collection("users").doc(uid).set({
      uid,
      email,
      displayName: displayName || email.split("@")[0],
      createdAt:   admin.firestore.FieldValue.serverTimestamp(),
      budgetLimit: 50000,          // default ₹50,000/month — user can change
      fcmToken:    null,            // populated when app launches on device
      currency:    "INR",
    });

    // Create a default settings document
    await db.collection("users").doc(uid)
            .collection("settings").doc("preferences").set({
      notifications:   true,
      weeklyDigest:    true,
      anomalyAlerts:   true,
      budgetAlerts:    true,
      anomalyMultiplier: 2,        // alert if spend > 2× category average
    });

    console.log(`✅ User doc created for ${email} (${uid})`);
  } catch (err) {
    console.error("❌ onUserCreated failed:", err);
  }
});

// ─────────────────────────────────────────────────────────────
//  2. BUDGET ALERT — Fires on every new expense transaction
//     Checks if monthly total > user's budgetLimit
//     Sends FCM push notification if exceeded
// ─────────────────────────────────────────────────────────────
exports.checkBudgetAlert = functions.firestore
  .document("users/{userId}/transactions/{txnId}")
  .onCreate(async (snap, context) => {
    const txn    = snap.data();
    const userId = context.params.userId;

    // Only run for expense transactions
    if (txn.type !== "expense") return null;

    try {
      // ── Get user doc (budget limit + FCM token) ──
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) return null;

      const { budgetLimit, fcmToken } = userDoc.data();
      if (!fcmToken) {
        console.log(`ℹ️  No FCM token for ${userId}, skipping notification`);
        return null;
      }

      // ── Sum all expenses for the current month ──
      const now        = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const txnSnap = await db
        .collection("users").doc(userId)
        .collection("transactions")
        .where("type",  "==", "expense")
        .where("date",  ">=", admin.firestore.Timestamp.fromDate(monthStart))
        .get();

      let totalExpense = 0;
      txnSnap.forEach((doc) => {
        totalExpense += doc.data().amount || 0;
      });

      console.log(`💰 ${userId} monthly expense: ${fmt(totalExpense)} / limit: ${fmt(budgetLimit)}`);

      // ── Send alert if over limit ──
      if (totalExpense > budgetLimit) {
        const overshoot = totalExpense - budgetLimit;

        // Send FCM push notification
        await admin.messaging().send({
          token: fcmToken,
          notification: {
            title: "⚠️ Budget Exceeded!",
            body:  `You've spent ${fmt(totalExpense)} — ${fmt(overshoot)} over your ${fmt(budgetLimit)} limit.`,
          },
          data: {
            screen: "budget",    // tells the Android app which screen to open
            type:   "BUDGET_ALERT",
          },
          android: {
            priority: "high",
            notification: { channelId: "budget_alerts" },
          },
        });

        console.log(`🔔 Budget alert sent to ${userId}`);

        // ── Send email notification via Clerk ──
        const userEmail = userDoc.data().email;
        if (userEmail) {
          try {
            const percentOver = Math.round((overshoot / budgetLimit) * 100);
            await sendBudgetAlertEmail(userId, userEmail, {
              totalSpent: totalExpense,
              budgetLimit: budgetLimit,
              overshoot: overshoot,
              percentOver: percentOver
            });
            console.log(`📧 Budget alert email sent to ${userEmail}`);
          } catch (emailErr) {
            console.error(`⚠️  Failed to send budget email: ${emailErr.message}`);
            // Continue even if email fails, push notification was sent
          }
        }
      }

      return null;
    } catch (err) {
      console.error("❌ checkBudgetAlert failed:", err);
      return null;
    }
  });

// ─────────────────────────────────────────────────────────────
//  3. ANOMALY DETECTION — Fires on every new expense
//     Compares new transaction to user's 3-month category avg
//     Alerts if amount > (avg × anomalyMultiplier)
// ─────────────────────────────────────────────────────────────
exports.detectAnomaly = functions.firestore
  .document("users/{userId}/transactions/{txnId}")
  .onCreate(async (snap, context) => {
    const txn    = snap.data();
    const userId = context.params.userId;

    // Only check expense transactions
    if (txn.type !== "expense") return null;

    const { amount, category, description } = txn;
    if (!category || !amount) return null;

    try {
      // ── Get user settings (FCM token + multiplier) ──
      const userDoc     = await db.collection("users").doc(userId).get();
      const settingsDoc = await db.collection("users").doc(userId)
                                  .collection("settings").doc("preferences").get();

      if (!userDoc.exists) return null;

      const { fcmToken }        = userDoc.data();
      const anomalyMultiplier   = settingsDoc.exists
                                    ? settingsDoc.data().anomalyMultiplier || 2
                                    : 2;

      // ── Fetch last 3 months of transactions for this category ──
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const histSnap = await db
        .collection("users").doc(userId)
        .collection("transactions")
        .where("type",     "==", "expense")
        .where("category", "==", category)
        .where("date",     ">=", admin.firestore.Timestamp.fromDate(threeMonthsAgo))
        .get();

      // ── Need at least 3 past transactions to compute a reliable average ──
      if (histSnap.size < 3) {
        console.log(`ℹ️  Not enough history for ${category} — skipping anomaly check`);
        return null;
      }

      // ── Calculate category average ──
      let total = 0;
      let count = 0;
      histSnap.forEach((doc) => {
        // Exclude the current transaction from the average
        if (doc.id !== context.params.txnId) {
          total += doc.data().amount || 0;
          count++;
        }
      });

      if (count === 0) return null;

      const average   = total / count;
      const threshold = average * anomalyMultiplier;

      console.log(
        `📊 Anomaly check — category: ${category} | ` +
        `new: ${fmt(amount)} | avg: ${fmt(average)} | threshold: ${fmt(threshold)}`
      );

      // ── Flag as anomaly if it exceeds threshold ──
      if (amount > threshold) {
        const multiplierActual = (amount / average).toFixed(1);

        // Mark the transaction as anomalous in Firestore
        await snap.ref.update({
          isAnomalous:        true,
          anomalyMultiplier:  parseFloat(multiplierActual),
          categoryAverage:    Math.round(average),
          anomalyThreshold:   Math.round(threshold),
        });

        // Send push notification if FCM token exists
        if (fcmToken) {
          await admin.messaging().send({
            token: fcmToken,
            notification: {
              title: "🚨 Unusual Spending Detected",
              body:  `${description || category}: ${fmt(amount)} is ${multiplierActual}× your usual ${fmt(Math.round(average))}.`,
            },
            data: {
              screen:   "anomaly",
              type:     "ANOMALY_ALERT",
              category: category,
              amount:   String(amount),
              average:  String(Math.round(average)),
            },
            android: {
              priority: "high",
              notification: { channelId: "anomaly_alerts" },
            },
          });

          console.log(`🔔 Anomaly alert sent — ${category} ${fmt(amount)} (${multiplierActual}× avg)`);

          // ── Send email notification via Clerk ──
          const userEmail = userDoc.data().email;
          if (userEmail) {
            try {
              await sendAnomalyAlertEmail(userId, userEmail, {
                category: category,
                amount: amount,
                average: Math.round(average),
                multiplier: multiplierActual,
                description: description
              });
              console.log(`📧 Anomaly alert email sent to ${userEmail}`);
            } catch (emailErr) {
              console.error(`⚠️  Failed to send anomaly email: ${emailErr.message}`);
              // Continue even if email fails, push notification was sent
            }
          }
        }
      }

      return null;
    } catch (err) {
      console.error("❌ detectAnomaly failed:", err);
      return null;
    }
  });

// ─────────────────────────────────────────────────────────────
//  4. FCM TOKEN UPDATER — HTTP endpoint called by the Android
//     app on launch to register/refresh the device FCM token
// ─────────────────────────────────────────────────────────────
exports.updateFcmToken = functions.https.onCall(async (data, context) => {
  // Must be authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to update your FCM token."
    );
  }

  const { token } = data;
  if (!token || typeof token !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "A valid FCM token string is required."
    );
  }

  const userId = context.auth.uid;

  try {
    await db.collection("users").doc(userId).update({
      fcmToken:        token,
      fcmUpdatedAt:    admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✅ FCM token updated for ${userId}`);
    return { success: true };
  } catch (err) {
    console.error("❌ updateFcmToken failed:", err);
    throw new functions.https.HttpsError("internal", "Failed to update token.");
  }
});

// ─────────────────────────────────────────────────────────────
//  5. SPEND FORECASTING (scheduled — runs daily at 2 AM IST)
// ─────────────────────────────────────────────────────────────
exports.forecastMonthlySpend = functions.pubsub
  .schedule("0 2 * * *")
  .timeZone("Asia/Kolkata")
  .onRun(async (context) => {
    console.log("🔮 Running monthly spend forecast...");

    try {
      const usersSnapshot = await db.collection("users").get();

      for (const userDoc of usersSnapshot.docs) {
        const uid = userDoc.id;
        const budgetLimit = userDoc.data().budgetLimit || 50000;

        // Get last 90 days of expenses
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const txnSnap = await db
          .collection("users")
          .doc(uid)
          .collection("transactions")
          .where("type", "==", "expense")
          .where("date", ">=", admin.firestore.Timestamp.fromDate(ninetyDaysAgo))
          .get();

        if (txnSnap.size < 5) continue;

        // Group by day and calculate daily average
        const dailyExpense = {};
        txnSnap.forEach((doc) => {
          const tx = doc.data();
          const dateKey = tx.date.toDate().toISOString().split("T")[0];
          dailyExpense[dateKey] = (dailyExpense[dateKey] || 0) + tx.amount;
        });

        const avgDaily = Object.values(dailyExpense).reduce((a, b) => a + b, 0) / Object.keys(dailyExpense).length;
        const predictedMonthly = Math.round(avgDaily * 30);
        const percentageOfBudget = Math.round((predictedMonthly / budgetLimit) * 100);

        // Store forecast
        await db
          .collection("users")
          .doc(uid)
          .collection("settings")
          .doc("forecast")
          .set({
            predictedMonthlySpend: predictedMonthly,
            percentageOfBudget,
            avgDailySpend: Math.round(avgDaily),
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });

        console.log(`📊 Forecast for ${uid}: ${fmt(predictedMonthly)} (${percentageOfBudget}% of budget)`);
      }
    } catch (err) {
      console.error("❌ forecastMonthlySpend failed:", err);
    }
  });

// ─────────────────────────────────────────────────────────────
//  6. WEEKLY DIGEST (scheduled — every Sunday at 8 AM IST)
// ─────────────────────────────────────────────────────────────
exports.sendWeeklyDigest = functions.pubsub
  .schedule("0 8 * * 0")
  .timeZone("Asia/Kolkata")
  .onRun(async (context) => {
    console.log("📧 Sending weekly digest notifications...");

    try {
      const usersSnapshot = await db.collection("users").get();

      for (const userDoc of usersSnapshot.docs) {
        const uid = userDoc.id;
        const { displayName, fcmToken, email } = userDoc.data();

        const settingsDoc = await db
          .collection("users")
          .doc(uid)
          .collection("settings")
          .doc("preferences")
          .get();

        if (!settingsDoc.exists || !settingsDoc.data().weeklyDigest) continue;

        // Get this week's transactions
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());

        const txnSnap = await db
          .collection("users")
          .doc(uid)
          .collection("transactions")
          .where("date", ">=", admin.firestore.Timestamp.fromDate(startOfWeek))
          .get();

        let weekIncome = 0,
          weekExpense = 0;
        const categories = {};
        const categoryTransactions = {};

        txnSnap.forEach((doc) => {
          const tx = doc.data();
          if (tx.type === "income") {
            weekIncome += tx.amount;
          } else {
            weekExpense += tx.amount;
            categories[tx.category] = (categories[tx.category] || 0) + tx.amount;
            if (!categoryTransactions[tx.category]) {
              categoryTransactions[tx.category] = 0;
            }
            categoryTransactions[tx.category]++;
          }
        });

        const topCategories = Object.entries(categories)
          .map(([category, amount]) => ({
            category,
            amount,
            count: categoryTransactions[category]
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5);

        const lastWeekEnd = new Date(startOfWeek);
        lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6);

        const lastWeekTxnSnap = await db
          .collection("users")
          .doc(uid)
          .collection("transactions")
          .where("type", "==", "expense")
          .where("date", ">=", admin.firestore.Timestamp.fromDate(lastWeekStart))
          .where("date", "<=", admin.firestore.Timestamp.fromDate(lastWeekEnd))
          .get();

        let lastWeekExpense = 0;
        lastWeekTxnSnap.forEach((doc) => {
          lastWeekExpense += doc.data().amount || 0;
        });

        const trend = lastWeekExpense > 0 ? ((weekExpense - lastWeekExpense) / lastWeekExpense) * 100 : 0;

        // Send FCM push notification if token exists
        if (fcmToken) {
          const body = `Income: ${fmt(weekIncome)} | Expense: ${fmt(weekExpense)} | Saved: ${fmt(weekIncome - weekExpense)}${
            topCategories.length > 0 ? ` | Top: ${topCategories[0].category}` : ""
          }`;

          await admin.messaging().send({
            token: fcmToken,
            notification: {
              title: "📊 Your Weekly Summary",
              body,
            },
            data: {
              screen: "transactions",
              weekIncome: String(Math.round(weekIncome)),
              weekExpense: String(Math.round(weekExpense)),
            },
            android: {
              priority: "high",
              notification: { channelId: "weekly_digest" },
            },
          });

          console.log(`✅ Weekly digest push sent to ${uid}`);
        }

        // ── Send email notification via Clerk (with behavioral insights) ──
        if (email) {
          try {
            const weekEnding = now.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
            const { budgetLimit: bl } = userDoc.data();
            await sendWeeklyDigestEmail(uid, email, {
              totalSpent:    weekExpense,
              avgDaily:      Math.round(weekExpense / 7),
              topCategories: topCategories,
              trend:         trend,
              weekEnding:    weekEnding,
              budgetLimit:   bl || 50000,
            });
            console.log(`📧 Weekly digest email sent to ${email}`);
          } catch (emailErr) {
            console.error(`⚠️  Failed to send weekly digest email: ${emailErr.message}`);
            // Continue even if email fails, push notification was sent
          }
        }
      }
    } catch (err) {
      console.error("❌ sendWeeklyDigest failed:", err);
    }
  });

// ─────────────────────────────────────────────────────────────
//  7. MONTHLY PDF REPORT (scheduled — 1st of every month 9 AM IST)
//  Note: Install dependencies: npm install pdfkit nodemailer
// ─────────────────────────────────────────────────────────────
exports.generateMonthlyReport = functions.pubsub
  .schedule("0 9 1 * *")
  .timeZone("Asia/Kolkata")
  .onRun(async (context) => {
    console.log("📄 Generating monthly PDF reports...");

    try {
      const usersSnapshot = await db.collection("users").get();

      for (const userDoc of usersSnapshot.docs) {
        const uid = userDoc.id;
        const { email, displayName, budgetLimit } = userDoc.data();

        // Get previous month's data
        const now = new Date();
        const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

        const monthStart = new Date(year, prevMonth, 1);
        const monthEnd = new Date(year, prevMonth + 1, 0, 23, 59, 59);

        const txnSnap = await db
          .collection("users")
          .doc(uid)
          .collection("transactions")
          .where("date", ">=", admin.firestore.Timestamp.fromDate(monthStart))
          .where("date", "<=", admin.firestore.Timestamp.fromDate(monthEnd))
          .get();

        let totalIncome = 0,
          totalExpense = 0;
        const categoryWise = {};

        txnSnap.forEach((doc) => {
          const tx = doc.data();
          if (tx.type === "income") {
            totalIncome += tx.amount;
          } else {
            totalExpense += tx.amount;
            categoryWise[tx.category] = (categoryWise[tx.category] || 0) + tx.amount;
          }
        });

        const savings          = totalIncome - totalExpense;
        const budgetUtilization = Math.round((totalExpense / (budgetLimit || 50000)) * 100);

        // ── Store report summary in Firestore ──
        const reportMonth = monthStart.toLocaleString("en-IN", { month: "long", year: "numeric" });
        await db
          .collection("users")
          .doc(uid)
          .collection("reports")
          .add({
            month: reportMonth,
            totalIncome,
            totalExpense,
            savings,
            categoryWise,
            budgetUtilization,
            generatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

        console.log(
          `✅ Report stored for ${uid}: ${reportMonth} — Income: ${fmt(totalIncome)}, Expense: ${fmt(totalExpense)}`
        );

        // ── Fetch anomalous transactions for this month ──
        const anomalySnap = await db
          .collection("users").doc(uid)
          .collection("transactions")
          .where("isAnomalous", "==", true)
          .where("date", ">=", admin.firestore.Timestamp.fromDate(monthStart))
          .where("date", "<=", admin.firestore.Timestamp.fromDate(monthEnd))
          .get();

        const anomalies = anomalySnap.docs.map((d) => ({
          ...d.data(),
          date: d.data().date,
        }));

        // ── Generate + email PDF report ──
        if (email) {
          try {
            await generateAndEmailMonthlyReport(uid, email, {
              displayName:      displayName || email.split("@")[0],
              monthLabel:       reportMonth,
              totalIncome,
              totalExpense,
              savings,
              budgetLimit:      budgetLimit || 50000,
              budgetUtilization,
              categoryWise,
              anomalies,
            });
            console.log(`📧 Monthly PDF report emailed to ${email} for ${reportMonth}`);
          } catch (pdfErr) {
            console.error(`⚠️  Failed to send monthly PDF report: ${pdfErr.message}`);
            // Continue — Firestore data is already stored
          }
        }
      }
    } catch (err) {
      console.error("❌ generateMonthlyReport failed:", err);
    }
  });

// ─────────────────────────────────────────────────────────────
//  8. RECURRING TRANSACTION DETECTION (scheduled — daily at 3 AM IST)
// ─────────────────────────────────────────────────────────────
exports.detectRecurringTransactions = functions.pubsub
  .schedule("0 3 * * *")
  .timeZone("Asia/Kolkata")
  .onRun(async (context) => {
    console.log("🔄 Scanning for recurring transactions...");

    try {
      const usersSnapshot = await db.collection("users").get();

      for (const userDoc of usersSnapshot.docs) {
        const uid = userDoc.id;

        // Get last 120 days of transactions
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 120);

        const txnSnap = await db
          .collection("users")
          .doc(uid)
          .collection("transactions")
          .where("type", "==", "expense")
          .where("date", ">=", admin.firestore.Timestamp.fromDate(startDate))
          .orderBy("date", "desc")
          .get();

        if (txnSnap.size < 5) continue;

        const transactionsByCategory = {};

        txnSnap.forEach((doc) => {
          const tx = doc.data();
          const cat = tx.category;
          if (!transactionsByCategory[cat]) {
            transactionsByCategory[cat] = [];
          }
          transactionsByCategory[cat].push(tx);
        });

        // Check each category for recurring pattern
        for (const [category, transactions] of Object.entries(transactionsByCategory)) {
          if (transactions.length < 3) continue;

          // Sort by date (newest first)
          transactions.sort((a, b) => b.date.toDate() - a.date.toDate());

          // Calculate gaps between transactions
          const gaps = [];
          for (let i = 0; i < transactions.length - 1; i++) {
            const gapDays =
              (transactions[i].date.toDate() - transactions[i + 1].date.toDate()) / (1000 * 60 * 60 * 24);
            gaps.push(gapDays);
          }

          const avgGap = gaps.reduce((a, b) => a + b) / gaps.length;
          const avgAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0) / transactions.length;

          // If recurring pattern detected (gaps consistent, likely monthly/weekly)
          if (avgGap >= 5 && avgGap <= 45 && gaps.length >= 2) {
            const consistency = gaps.length >= 3;

            // Check if already exists
            const existingSnap = await db
              .collection("users")
              .doc(uid)
              .collection("recurring")
              .where("category", "==", category)
              .where("active", "==", true)
              .limit(1)
              .get();

            if (existingSnap.empty) {
              await db
                .collection("users")
                .doc(uid)
                .collection("recurring")
                .add({
                  category,
                  amount: Math.round(avgAmount),
                  frequency: avgGap > 20 ? "monthly" : avgGap > 5 ? "weekly" : "daily",
                  averageGapDays: Math.round(avgGap),
                  occurrences: transactions.length,
                  detectedAt: admin.firestore.FieldValue.serverTimestamp(),
                  active: true,
                });

              console.log(`🔄 Recurring found: ${category} every ${Math.round(avgGap)} days for ${uid}`);
            }
          }
        }
      }
    } catch (err) {
      console.error("❌ detectRecurringTransactions failed:", err);
    }
  });

// ─────────────────────────────────────────────────────────────
//  9. SMART INSIGHTS API (callable function)
// ─────────────────────────────────────────────────────────────
exports.getSmartInsights = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in");
  }

  const uid = context.auth.uid;

  try {
    // Get last 6 months of data
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const txnSnap = await db
        .collection("users")
        .doc(uid)
        .collection("transactions")
        .where("date", ">=", admin.firestore.Timestamp.fromDate(monthStart))
        .where("date", "<=", admin.firestore.Timestamp.fromDate(monthEnd))
        .get();

      let income = 0,
        expense = 0;
      txnSnap.forEach((doc) => {
        const tx = doc.data();
        if (tx.type === "income") income += tx.amount;
        else expense += tx.amount;
      });

      months.push({
        month: monthStart.toLocaleString("en-IN", { month: "short" }),
        income,
        expense,
        savings: income - expense,
      });
    }

    const avgMonthlyExpense =
      months.reduce((sum, m) => sum + m.expense, 0) / months.length;
    const avgMonthlySavings =
      months.reduce((sum, m) => sum + m.savings, 0) / months.length;

    const trend = months[5].expense > avgMonthlyExpense ? "UP ⬆️" : "DOWN ⬇️";
    const trendPercent = Math.abs(
      Math.round(((months[5].expense - avgMonthlyExpense) / avgMonthlyExpense) * 100)
    );

    let recommendation = "";
    if (months[5].expense > avgMonthlyExpense * 1.2) {
      recommendation = "Your spending is 20%+ above average. Consider reviewing subscriptions and recurring expenses.";
    } else if (months[5].savings < 0) {
      recommendation = "You're spending more than you earn! Prioritize cutting unnecessary expenses.";
    } else if (avgMonthlySavings > avgMonthlyExpense * 0.3) {
      recommendation = "Great! You're saving 30%+ of your income. Keep up the discipline!";
    } else {
      recommendation = "Your spending is stable. Look for opportunities to increase savings.";
    }

    return {
      monthlyData: months,
      avgMonthlyExpense: Math.round(avgMonthlyExpense),
      avgMonthlySavings: Math.round(avgMonthlySavings),
      trend: trend + ` (${trendPercent}%)`,
      recommendation,
    };
  } catch (err) {
    throw new functions.https.HttpsError("internal", err.message);
  }
});

console.log("✅ All Cloud Functions loaded — Weekly Digest + Monthly PDF Report active!");
