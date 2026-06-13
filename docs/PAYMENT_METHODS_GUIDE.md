# 💳 Payment Methods Guide

## Overview

ExpenseCloud tracks expenses across **9 different payment methods**, allowing you to analyze spending patterns by payment type and optimize your financial choices.

---

## Supported Payment Methods

### 1. 🏦 Debit/Credit Card
**Use for:** Everyday purchases, online shopping, restaurants

- Best for tracking credit card rewards
- Identifies recurring card expenses
- Credit card payment cycles
- Interest calculation

**Example:**
```javascript
{
  paymentMethod: "Card",
  amount: 1500,
  description: "Grocery shopping - Walmart",
  category: "Shopping"
}
```

---

### 2. 📱 UPI (Unified Payments Interface)
**Use for:** Mobile payments, peer-to-peer transfers

**Supported Apps:**
- Google Pay
- PhonePe
- Paytm
- BHIM
- WhatsApp Pay
- Amazon Pay
- Apple Pay (for UPI)

**Example:**
```javascript
{
  paymentMethod: "UPI",
  amount: 250,
  description: "Coffee at Starbucks - PhonePe",
  category: "Food & Dining"
}
```

**Benefits:**
- Real-time transactions
- No transaction fees
- Instant payment confirmation
- Works offline for some apps

---

### 3. 🏪 Bank Account (Direct Transfer)
**Use for:** Bill payments, salary transfers, large purchases

**Transfer Types:**
- NEFT (National Electronic Funds Transfer)
- RTGS (Real Time Gross Settlement)
- IMPS (Immediate Payment Service)
- Direct Bank Transfer

**Example:**
```javascript
{
  paymentMethod: "Bank Account",
  amount: 15000,
  description: "Rent payment - Transfer",
  category: "Utilities"
}
```

**Benefits:**
- Secure transactions
- Large payment support
- Traceable records
- Bank statement integration

---

### 4. 💵 Cash
**Use for:** Small purchases, local vendors, tips

**Tracking Tips:**
- Record cash transactions immediately
- Use for vendors without digital payment
- Track daily cash expenses
- Monitor cash withdrawal patterns

**Example:**
```javascript
{
  paymentMethod: "Cash",
  amount: 50,
  description: "Taxi fare - Auto",
  category: "Transport"
}
```

---

### 5. 👛 Digital Wallet
**Use for:** Quick payments, cashback opportunities

**Supported Wallets:**
- Amazon Pay
- Apple Pay
- Google Pay (wallet mode)
- Samsung Pay
- Airtel Pay
- MobiKwik

**Example:**
```javascript
{
  paymentMethod: "Wallet",
  amount: 600,
  description: "Movie tickets - Amazon Pay",
  category: "Entertainment"
}
```

**Benefits:**
- Cashback rewards
- Quick checkout
- Accumulated balance
- Integrated loyalty programs

---

### 6. 🌐 Net Banking
**Use for:** Online purchases, bill payments, transfers

**Supported Banks:**
- ICICI Net Banking
- HDFC Net Banking
- SBI Net Banking
- Axis Bank Online
- Kotak Mahindra
- Yes Bank
- IDBI Bank

**Example:**
```javascript
{
  paymentMethod: "Net Banking",
  amount: 2000,
  description: "Flight booking - ICICI",
  category: "Transport"
}
```

---

### 7. 📄 Cheque
**Use for:** Corporate payments, large transactions, formal purposes

**Cheque Types:**
- Bearer Cheque (can be cashed by anyone)
- Account Payee Cheque (only deposited in mentioned account)
- Crossed Cheque (requires bank clearance)

**Example:**
```javascript
{
  paymentMethod: "Cheque",
  amount: 50000,
  description: "Office supplier payment - Cheque #123456",
  category: "Other"
}
```

---

### 8. ₿ Cryptocurrency
**Use for:** Investment tracking, digital payments, modern transactions

**Supported Cryptocurrencies:**
- Bitcoin (BTC)
- Ethereum (ETH)
- Stablecoin (USDC, USDT)
- Dogecoin (DOGE)
- Other altcoins

**Example:**
```javascript
{
  paymentMethod: "Crypto",
  amount: 0.05,
  description: "BTC purchase - Coinbase",
  category: "Investment",
  cryptoType: "Bitcoin"
}
```

---

### 9. ❓ Other
**Use for:** Custom payment methods not listed above

**Examples:**
- Gift cards
- Store credits
- Reward points redemption
- Barter/exchange

**Example:**
```javascript
{
  paymentMethod: "Other",
  amount: 1000,
  description: "Amazon gift card redemption",
  category: "Shopping"
}
```

---

## Payment Method Analytics

### Dashboard Metrics

```javascript
const paymentMethodStats = {
  "Card": {
    total: 15000,
    percentage: 35,
    transactions: 12,
    average: 1250
  },
  "UPI": {
    total: 12000,
    percentage: 28,
    transactions: 24,
    average: 500
  },
  "Cash": {
    total: 8000,
    percentage: 19,
    transactions: 16,
    average: 500
  },
  "Bank Account": {
    total: 7000,
    percentage: 16,
    transactions: 3,
    average: 2333
  }
};
```

### Payment Method Trends

**Chart Data:**
```javascript
{
  labels: ['Card', 'UPI', 'Bank Account', 'Cash', 'Wallet', 'Net Banking', 'Cheque', 'Crypto', 'Other'],
  data: [15000, 12000, 7000, 8000, 2000, 1500, 5000, 500, 1000],
  colors: ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#14B8A6', '#F97316', '#6366F1', '#78716C']
}
```

---

## Best Practices by Category

### Food & Dining
✅ **Recommended:** UPI (fastest), Card (rewards)  
❌ **Not ideal:** Cheque, Crypto

### Transport
✅ **Recommended:** UPI (Uber/Ola), Card  
❌ **Not ideal:** Cheque, Crypto

### Shopping
✅ **Recommended:** Card (rewards), Wallet (cashback)  
✅ **Acceptable:** Net Banking

### Entertainment
✅ **Recommended:** Card, UPI, Digital Wallet  
✅ **Acceptable:** Net Banking

### Utilities & Bills
✅ **Recommended:** Net Banking, Bank Account  
✅ **Acceptable:** Card, Cheque

### Healthcare
✅ **Recommended:** Card, Net Banking  
✅ **Acceptable:** Cash, UPI

### Investment
✅ **Recommended:** Bank Account, Crypto  
✅ **Acceptable:** Card, Net Banking

---

## Payment Method Security

### Card Transactions
- ✅ Tokenize card details
- ✅ Use 3D Secure authentication
- ✅ Monitor for suspicious activity
- ✅ Set spending limits
- ✅ Enable notifications

### UPI Transactions
- ✅ Use strong UPI PIN
- ✅ Enable transaction verification
- ✅ Don't share UPI ID publicly
- ✅ Verify payee details
- ✅ Check bank SMS confirmations

### Bank Account Transfers
- ✅ Verify account numbers
- ✅ Double-check IFSC codes
- ✅ Confirm beneficiary names
- ✅ Use registered devices
- ✅ Monitor for unusual transfers

### Cryptocurrency Transactions
- ✅ Use hardware wallets
- ✅ Verify wallet addresses
- ✅ Enable 2FA
- ✅ Keep private keys secure
- ✅ Track for tax reporting

---

## Payment Method Insights

### Spending Patterns

```javascript
function analyzePaymentMethodPatterns(transactions) {
  const patterns = {
    cardSpent: 0,
    upiSpent: 0,
    cashSpent: 0,
    averageTransactionByMethod: {},
    frequencyByMethod: {},
    categoryByMethod: {}
  };

  // Analyze and group
  transactions.forEach(tx => {
    patterns[`${tx.paymentMethod.toLowerCase()}Spent`] += tx.amount;
  });

  return patterns;
}
```

### Most Used Method
```javascript
const mostUsedMethod = Object.entries(paymentMethodStats)
  .sort((a, b) => b[1].transactions - a[1].transactions)[0];
// Returns: ["UPI", {transactions: 24, ...}]
```

### Highest Spending Method
```javascript
const highestSpending = Object.entries(paymentMethodStats)
  .sort((a, b) => b[1].total - a[1].total)[0];
// Returns: ["Card", {total: 15000, ...}]
```

---

## Filtering by Payment Method

### Recent Card Transactions
```javascript
const cardTransactions = transactions.filter(
  tx => tx.paymentMethod === 'Card'
);
```

### UPI Expenses This Week
```javascript
const weekStart = new Date();
weekStart.setDate(weekStart.getDate() - 7);

const weeklyUPI = transactions.filter(tx =>
  tx.paymentMethod === 'UPI' && 
  tx.date >= weekStart
);
```

### Cash Expenses by Category
```javascript
const cashByCategory = transactions
  .filter(tx => tx.paymentMethod === 'Cash')
  .reduce((acc, tx) => {
    acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
    return acc;
  }, {});
```

---

## Reports by Payment Method

### Monthly Payment Method Report
```
════════════════════════════════════════
  PAYMENT METHOD BREAKDOWN - JUNE 2026
════════════════════════════════════════

💳 DEBIT/CREDIT CARD
   Total Spent: ₹15,000
   Transactions: 12
   Average: ₹1,250
   Top Category: Shopping
   Cashback Earned: ₹150

📱 UPI
   Total Spent: ₹12,000
   Transactions: 24
   Average: ₹500
   Top Category: Food & Dining
   Cashback Earned: ₹120

💵 CASH
   Total Spent: ₹8,000
   Transactions: 16
   Average: ₹500
   Top Category: Transport
   Cashback Earned: ₹0

🏦 BANK ACCOUNT
   Total Spent: ₹7,000
   Transactions: 3
   Average: ₹2,333
   Top Category: Utilities
   Cashback Earned: ₹0

════════════════════════════════════════
TOTAL SPENT: ₹42,000
TOTAL CASHBACK: ₹270
════════════════════════════════════════
```

---

## Firestore Document Structure

```javascript
{
  userId: "clerk_user_id",
  transactions: [
    {
      id: "tx_001",
      amount: 500,
      description: "Coffee",
      category: "Food & Dining",
      paymentMethod: "UPI",  // Payment method
      type: "expense",
      date: Timestamp("2026-06-04"),
      createdAt: Timestamp("2026-06-04T10:30:00Z"),
      metadata: {
        merchant: "Starbucks",
        transactionId: "UPI123456",
        status: "completed"
      }
    }
  ]
}
```

---

## Database Query Examples

### Get all transactions for a payment method
```javascript
db.collection('users').doc(userId)
  .collection('transactions')
  .where('paymentMethod', '==', 'UPI')
  .get();
```

### Get total spent by payment method
```javascript
const transactions = await db.collection('users').doc(userId)
  .collection('transactions')
  .get();

const byMethod = {};
transactions.forEach(doc => {
  const tx = doc.data();
  const method = tx.paymentMethod || 'Unknown';
  byMethod[method] = (byMethod[method] || 0) + tx.amount;
});
```

---

## Tips & Tricks

### 💡 Maximize Rewards
- Use **Card** for purchases with cashback (1-2% back)
- Use **Digital Wallet** for special offers
- Combine rewards across platforms

### 💡 Reduce Fees
- Avoid multiple **UPI** payments if a **Card** offers same rewards
- Use **Net Banking** for large transfers (no fees)
- Consolidate **Bank Account** transfers

### 💡 Better Tracking
- Categorize by payment method + merchant
- Track recurring payments by method
- Identify spending leaks in cash expenses

### 💡 Security First
- Monitor **Card** statements regularly
- Set up **UPI** transaction alerts
- Use **Bank Account** for large sums only
- Keep **Crypto** wallet separate

---

## Integration with Clerk

Your payment methods are tied to Clerk user accounts:

```javascript
{
  clerkUserId: "user_123",
  clerkUserEmail: "user@example.com",
  clerkUserName: "John Doe",
  paymentMethods: {
    card: { count: 12, total: 15000 },
    upi: { count: 24, total: 12000 },
    cash: { count: 16, total: 8000 }
  }
}
```

---

## FAQ

**Q: Can I change the payment method after saving?**  
A: Yes, edit the transaction and change the payment method.

**Q: Are payment methods required for income?**  
A: No, payment method is only for expense tracking.

**Q: Can I create custom payment methods?**  
A: Yes, use "Other" and add details in the description.

**Q: How do I track multiple cards?**  
A: Use the description field: "Card (Visa-1234)"

**Q: Can I see payment method analytics?**  
A: Yes, in the Analytics section under "Payment Method Breakdown"

---

**Last Updated:** June 4, 2026  
**Status:** Complete  
**Version:** 1.0
