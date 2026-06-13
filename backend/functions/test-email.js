require('dotenv').config();
const { generateAndEmailMonthlyReport } = require('./monthly-report');

async function runTest() {
  console.log("Testing Ethereal Email Configuration...");
  
  const dummyReportData = {
    displayName: "Silas Jast (Test)",
    monthLabel: "June 2026",
    totalIncome: 150000,
    totalExpense: 90000,
    savings: 60000,
    budgetLimit: 100000,
    budgetUtilization: 90.0,
    categoryWise: {
      "Food & Dining": 40000,
      "Transport": 25000,
      "Entertainment": 25000
    },
    anomalies: [
      {
        date: { seconds: Date.now() / 1000 },
        category: "Food & Dining",
        amount: 15000,
        categoryAverage: 5000,
        anomalyMultiplier: 3.0
      }
    ]
  };

  try {
    // We pass a dummy UID and a fallback email address.
    // The Clerk lookup will fail (dummy UID) and use the fallback email.
    const result = await generateAndEmailMonthlyReport(
      'dummy-uid',
      'silas.jast@ethereal.email',
      dummyReportData
    );
    console.log("\n==============================================");
    console.log("Test Result:", result);
    console.log("==============================================");
    console.log("If successful, check your Ethereal mailbox!");
  } catch (err) {
    console.error("Test failed:", err);
  }
}

runTest();
