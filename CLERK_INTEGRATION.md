# 🔐 Clerk Authentication Integration Guide

## What is Clerk?

**Clerk** is a modern authentication platform that handles user sign-up, login, session management, and social OAuth seamlessly. It replaces Firebase Auth with a more user-friendly, modern authentication experience.

### Why Clerk Over Firebase Auth?

| Feature | Firebase Auth | Clerk |
|---------|---------------|-------|
| **UI Components** | Basic | Beautiful, pre-built UI |
| **Social Login** | Limited OAuth | 30+ providers |
| **Session Management** | Manual | Automatic |
| **User Profile** | Minimal | Rich profile management |
| **Dashboard** | Admin console | Professional dashboard |
| **2FA/MFA** | Limited | Full MFA support |
| **API** | REST/SDK | Modern GraphQL + REST |
| **Developer Experience** | Average | Excellent |

---

## 📋 Quick Start (10 Minutes)

### Step 1: Create Clerk Account

1. Go to [clerk.com](https://clerk.com)
2. Click "Sign Up" → Choose "Free" plan
3. Create a new project named "ExpenseCloud"
4. Select "Web → HTML/JavaScript"

### Step 2: Get Your Clerk API Key

After creating the project:
1. Go to **API Keys** section
2. Copy your **Publishable Key** (starts with `pk_`)
3. Save it in your `.env` file:

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
```

### Step 3: Add Clerk to Your HTML

In the `<head>` section of your HTML file:

```html
<script
  async
  crossorigin="anonymous"
  data-clerk-publishable-key="pk_test_xxxxx"
  src="https://cdn.clerk.com/clerk.js"
></script>
```

### Step 4: Add Sign-In/Sign-Up Components

Replace your Firebase auth forms with Clerk components:

```html
<!-- BEFORE (Firebase) -->
<div id="authScreen">
  <input id="emailInput" type="email" placeholder="Email" />
  <input id="passwordInput" type="password" placeholder="Password" />
  <button onclick="loginUser()">Login</button>
</div>

<!-- AFTER (Clerk) -->
<div id="authScreen">
  <div id="sign-in-component"></div>
</div>

<script>
  const { Clerk } = window;
  
  Clerk.load().then(() => {
    if (!Clerk.user) {
      Clerk.mountSignIn(document.getElementById('sign-in-component'));
    } else {
      showMainApp();
    }
  });
</script>
```

### Step 5: Check User Authentication

```javascript
import Clerk from '@clerk/clerk-js';

// Initialize Clerk
const clerk = new Clerk('YOUR_PUBLISHABLE_KEY');
await clerk.load();

if (clerk.user) {
  console.log('User logged in:', clerk.user.primaryEmailAddress);
  // Show main app
  showMainApp();
} else {
  // Show login/signup
  showAuthScreen();
}
```

---

## 🔧 Complete Implementation

### Full Frontend Integration

```html
<!DOCTYPE html>
<html>
<head>
  <script
    async
    crossorigin="anonymous"
    data-clerk-publishable-key="pk_test_YOUR_KEY"
    src="https://cdn.clerk.com/clerk.js"
  ></script>
  <style>
    .clerk-elements {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 400px;
      margin: 0 auto;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div id="root">
    <div id="authContainer" class="clerk-elements"></div>
    <div id="appContainer" style="display: none;"></div>
  </div>

  <script>
    const { Clerk } = window;

    async function initializeApp() {
      await Clerk.load();

      if (Clerk.user) {
        // User is signed in
        document.getElementById('authContainer').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        initializeExpenseCloud();
      } else {
        // User is not signed in, mount sign in component
        Clerk.mountSignIn(document.getElementById('authContainer'));
      }
    }

    function initializeExpenseCloud() {
      const user = Clerk.user;
      console.log('Welcome:', user.primaryEmailAddress?.emailAddress);
      // Initialize your expense tracking app
    }

    // Listen for auth changes
    Clerk.addListener(({ user }) => {
      if (user) {
        location.reload(); // Reload page after sign-in
      }
    });

    initializeApp();
  </script>
</body>
</html>
```

---

## 🔗 Backend Integration (Firebase Functions)

### Update Package.json

```json
{
  "dependencies": {
    "firebase-admin": "^11.0.0",
    "firebase-functions": "^4.0.0",
    "clerk-sdk-node": "^0.17.0"
  }
}
```

### Verify Clerk Token in Cloud Functions

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { verifyToken } = require('clerk-sdk-node');

admin.initializeApp();

exports.saveTransaction = functions.https.onCall(async (data, context) => {
  const token = data.token;

  if (!token) {
    throw new functions.https.HttpsError('unauthenticated', 'No token provided');
  }

  try {
    // Verify the Clerk token
    const decoded = await verifyToken(token);
    const userId = decoded.sub;

    // Save transaction to Firestore
    await admin.firestore().collection('users').doc(userId).collection('transactions').add({
      amount: data.amount,
      description: data.description,
      category: data.category,
      paymentMethod: data.paymentMethod,
      type: data.type,
      date: new Date(data.date),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, message: 'Transaction saved' };
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new functions.https.HttpsError('unauthenticated', 'Invalid token');
  }
});
```

### Updated Transaction Form Handler

```javascript
async function saveTransaction(txnData) {
  try {
    // Get the Clerk session token
    const token = await Clerk.session.getToken();

    // Send to Firebase Function
    const response = await fetch('https://your-firebase-region-projectid.cloudfunctions.net/saveTransaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...txnData,
        token: token
      })
    });

    const result = await response.json();
    if (result.success) {
      showToast('✅ Transaction saved!', 'success');
    }
  } catch (error) {
    showToast('❌ Error saving transaction', 'error');
    console.error(error);
  }
}
```

---

## 📊 Payment Methods Tracking with Clerk

### Enhanced Transaction Structure

```javascript
const transactionData = {
  userId: Clerk.user.id,           // User ID from Clerk
  amount: 500,
  description: "Coffee at Starbucks",
  category: "Food & Dining",
  paymentMethod: "UPI",             // Payment method
  type: "expense",
  date: new Date(),
  clerkUserEmail: Clerk.user.primaryEmailAddress?.emailAddress,
  metadata: {
    userPhoneNumber: Clerk.user.phoneNumbers?.[0]?.phoneNumber,
    userImageUrl: Clerk.user.imageUrl
  }
};
```

### Firestore Rules for Clerk

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/transactions/{transactionId} {
      // Allow users to read/write their own transactions
      allow read, write: if request.auth.uid == userId;
    }

    match /users/{userId}/settings/{settingsId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

---

## 🎨 Customizing Clerk UI

### Sign-In Component Styling

```html
<style>
  .cl-root {
    --colors-primary: #7c6aff;
    --colors-success: #10b981;
    --colors-danger: #ef4444;
    --colors-warning: #f59e0b;
    --colors-neutral-dark: #0a0e27;
    --colors-neutral-light: #f5f7fa;
  }

  .cl-card {
    background-color: #111629;
    border-color: rgba(255, 255, 255, 0.08);
  }

  .cl-input {
    background-color: #1a1f3a;
    color: #f5f7fa;
  }

  .cl-button-primary {
    background-color: #7c6aff;
  }
</style>
```

### Custom Logo & Branding

In Clerk Dashboard → **Appearance**:
1. Upload your logo
2. Set primary color: `#7c6aff`
3. Set background color: `#0a0e27`
4. Enable "Dark mode"

---

## 🔑 Social OAuth Setup

### Enable Google OAuth

1. In Clerk Dashboard → **Social Connections**
2. Click "Google"
3. Paste your Google OAuth credentials
4. Save

### Enable GitHub OAuth

1. In Clerk Dashboard → **Social Connections**
2. Click "GitHub"
3. Add your GitHub OAuth App credentials
4. Save

### Supported OAuth Providers

✅ Google, GitHub, Microsoft, Apple, Discord, Facebook, LinkedIn, Twitter, Twitch, and more!

---

## 📱 Payment Methods Support

Your expense app now supports these payment methods:

| Method | Use Case | Integration |
|--------|----------|-------------|
| **Card** 🏦 | Debit/Credit cards | Track card expenses |
| **UPI** 📱 | Google Pay, PhonePe, Paytm | Indian payment apps |
| **Bank Account** 🏪 | Direct transfers | NEFT/RTGS transfers |
| **Cash** 💵 | Physical money | Manual entries |
| **Digital Wallet** 👛 | Amazon Pay, Apple Pay | Mobile wallets |
| **Net Banking** 🌐 | Online banking | Direct bank transfers |
| **Cheque** 📄 | Cheque payments | Corporate payments |
| **Crypto** ₿ | Bitcoin, Ethereum | Cryptocurrency |
| **Other** ❓ | Custom methods | Flexible tracking |

### Analytics by Payment Method

```javascript
function getPaymentMethodStats(transactions) {
  const stats = {};

  transactions.forEach(tx => {
    if (tx.paymentMethod) {
      stats[tx.paymentMethod] = (stats[tx.paymentMethod] || 0) + tx.amount;
    }
  });

  return stats;
}

// Example output:
// {
//   "Card": 5000,
//   "UPI": 12000,
//   "Cash": 800,
//   "Bank Account": 25000
// }
```

---

## 🛡️ Security Best Practices

✅ **DO:**
- Store Clerk API key in `.env` file
- Add `.env` to `.gitignore`
- Use HTTPS for all connections
- Verify tokens on backend
- Enable MFA for users
- Keep Clerk SDK updated
- Use HTTPS in production

❌ **DON'T:**
- Commit API keys to Git
- Store sensitive data in localStorage
- Skip token verification
- Use non-HTTPS URLs
- Hardcode API keys
- Use development keys in production

---

## 🚀 Deployment Checklist

### Before Going Live

- [ ] Clerk account created and configured
- [ ] Production API key obtained
- [ ] Social OAuth providers configured
- [ ] Email customization done
- [ ] Custom domain configured (optional)
- [ ] Backend functions updated
- [ ] Firestore rules updated
- [ ] Environment variables set
- [ ] User testing completed
- [ ] Error handling tested

### Production Environment Variables

```
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
FIREBASE_API_KEY=xxxxx
FIREBASE_PROJECT_ID=expensecloud-prod
NODE_ENV=production
```

---

## 🐛 Troubleshooting

### Issue: "Clerk is not defined"

**Solution:** Make sure the Clerk script is loaded in `<head>`:
```html
<script
  async
  data-clerk-publishable-key="pk_test_xxxxx"
  src="https://cdn.clerk.com/clerk.js"
></script>
```

### Issue: Token Verification Fails

**Solution:** Ensure you're using the correct environment key:
```javascript
// Wrong - using live key in development
const token = await Clerk.session.getToken({ template: 'your-template' });

// Correct - let Clerk handle it automatically
const token = await Clerk.session.getToken();
```

### Issue: Social Login Not Working

**Solution:** Verify OAuth credentials in Clerk Dashboard:
1. Go to **Social Connections**
2. Check if credentials are correct
3. Ensure redirect URLs match

### Issue: User Data Not Syncing

**Solution:** Add Clerk user ID to Firestore document:
```javascript
await admin.firestore()
  .collection('users')
  .doc(Clerk.user.id)
  .set({
    clerkId: Clerk.user.id,
    email: Clerk.user.primaryEmailAddress?.emailAddress,
    name: Clerk.user.fullName,
    createdAt: new Date()
  });
```

---

## 📚 Resources

- **Clerk Documentation**: https://clerk.com/docs
- **Clerk API Reference**: https://clerk.com/docs/reference/backend-api
- **Firebase Integration**: https://clerk.com/docs/integrations/firebase
- **OAuth Setup**: https://clerk.com/docs/authentication/social-connections
- **Support**: support@clerk.com

---

## 🎓 Next Steps

1. ✅ Set up Clerk account
2. ✅ Add Clerk to your HTML
3. ✅ Update authentication flow
4. ✅ Test sign-in/sign-up
5. ✅ Configure social OAuth
6. ✅ Update backend functions
7. ✅ Test payment tracking
8. ✅ Deploy to production

---

**Last Updated**: June 4, 2026  
**Status**: Ready for Integration  
**Difficulty**: Beginner to Intermediate  
**Estimated Time**: 1-2 hours for full setup
