# ExpenseCloud — Backend Setup Guide
## How to integrate this backend with your frontend.html in VS Code

---

## FOLDER STRUCTURE

```
expensecloud/
├── frontend.html              ← your existing frontend (unchanged)
├── firebaseConfig.js          ← paste <script> tags from this into frontend.html
├── firebase.json              ← Firebase project config
├── firestore.rules            ← Firestore security rules
├── firestore.indexes.json     ← Firestore query indexes
└── functions/
    ├── index.js               ← Cloud Functions (40% done)
    └── package.json           ← Node.js dependencies
```

---

## STEP 1 — Install Prerequisites (do this once)

Open **VS Code Terminal** (`Ctrl + `` ` ```) and run:

```bash
# Install Node.js first from https://nodejs.org (LTS version)
# Then install Firebase CLI globally
npm install -g firebase-tools

# Verify installation
firebase --version
```

---

## STEP 2 — Create Your Firebase Project

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"** → name it `expensecloud`
3. Disable Google Analytics (not needed) → **Create project**
4. In the left menu: **Build → Authentication**
   - Click **Get started** → Enable **Email/Password**
5. In the left menu: **Build → Firestore Database**
   - Click **Create database** → choose **"Start in test mode"** → pick region `asia-south1` (Mumbai)
6. In the left menu: **Project Settings (gear icon) → General**
   - Scroll down → **"Your apps"** → click **`</>`** (Web)
   - Register app as `expensecloud-web`
   - **Copy the firebaseConfig object** — you'll need it in Step 4

---

## STEP 3 — Connect VS Code to Firebase

In VS Code terminal, navigate to your project folder and run:

```bash
cd path/to/your/expensecloud/

# Log in to Firebase
firebase login

# Initialize Firebase in this folder
firebase init

# When prompted, select these options using SPACE to check:
#   ✅ Firestore
#   ✅ Functions
#   ✅ Emulators
#
# Then:
#   → Use existing project → select "expensecloud"
#   → Firestore rules file: firestore.rules  (press Enter)
#   → Firestore indexes file: firestore.indexes.json  (press Enter)
#   → Functions language: JavaScript  (press Enter)
#   → Use ESLint: No  (press Enter)
#   → Install dependencies now: Yes  (press Enter)
#   → Emulators: select Auth, Firestore, Functions  (Space to check each)
```

---

## STEP 4 — Paste Firebase Config into frontend.html

Open `frontend.html` in VS Code and add these lines just before `</body>`:

```html
<!-- Firebase SDK — add these 4 lines before your closing </body> tag -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-functions-compat.js"></script>

<!-- Your config + helper functions -->
<script src="firebaseConfig.js"></script>
```

Then open `firebaseConfig.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",       // ← paste your real values here
  authDomain:        "expensecloud-xxx.firebaseapp.com",
  projectId:         "expensecloud-xxx",
  storageBucket:     "expensecloud-xxx.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123...",
};
```

---

## STEP 5 — Connect the "Save to Cloud" Button

In `frontend.html`, find the `saveTxn()` function and replace it:

```js
// BEFORE (original — only shows toast)
async function saveTxn() {
  // ... original code
}

// AFTER — calls Firebase
async function saveTxn() {
  const amt  = document.getElementById('amtInput').value;
  const desc = document.getElementById('descInput').value;
  const note = document.getElementById('noteInput').value;
  const date = document.getElementById('dateInput').value;
  const cat  = document.querySelector('.cat-chip.sel .cat-chip-lbl')?.textContent || 'Others';

  if (!amt || !desc) {
    showToast('⚠️ Fill amount & description', '#ff5f7e');
    return;
  }

  showToast('Saving...', '#7c6aff');

  const result = await saveTransaction({
    amount:      amt,
    description: desc,
    note:        note,
    category:    cat,
    type:        currentType,   // 'expense' or 'income'
    date:        date,
  });

  if (result.success) {
    showToast('✓ Saved to cloud!', '#22d3a0');
    setTimeout(() => { showScreen('screen-home'); setNav('nav-home'); }, 1800);
  } else {
    showToast('❌ Error: ' + result.error, '#ff5f7e');
  }
}
```

---

## STEP 6 — Connect the Dashboard (Real-Time Updates)

Find the `screen-home` section in `frontend.html`. Add this to your `<script>`:

```js
let unsubTxns = null;  // keep reference to stop listening when needed

// Call this after user logs in
function startDashboard() {
  unsubTxns = listenToTransactions((txns) => {
    let income = 0, expense = 0;

    txns.forEach(t => {
      if (t.type === 'income')  income  += t.amount;
      if (t.type === 'expense') expense += t.amount;
    });

    const savings = income - expense;

    // Update the balance hero card
    document.querySelector('.bh-amount').innerHTML =
      `<span>₹</span>${savings.toLocaleString('en-IN')}`;
    document.querySelector('.income-val').textContent =
      `₹${income.toLocaleString('en-IN')}`;
    document.querySelector('.expense-val').textContent =
      `₹${expense.toLocaleString('en-IN')}`;
  });
}
```

---

## STEP 7 — Run Locally (Test Without Deploying)

```bash
# Install Cloud Functions dependencies first
cd functions
npm install
cd ..

# Start the local Firebase emulator
firebase emulators:start

# Emulator UI opens at: http://localhost:4000
# Your functions run at:  http://localhost:5001
# Firestore viewer at:   http://localhost:8080
```

Open `frontend.html` in your browser (use **Live Server** extension in VS Code).
Transactions saved will appear in the **Firestore Emulator UI** in real time.

---

## STEP 8 — Deploy to Production

When ready to push live:

```bash
# Deploy Firestore rules + indexes
firebase deploy --only firestore

# Deploy Cloud Functions
firebase deploy --only functions

# Check function logs
firebase functions:log
```

---

## WHAT'S WORKING NOW (40%)

| Feature | Status | Where |
|---|---|---|
| User registration (email/password) | ✅ Done | `firebaseConfig.js → registerUser()` |
| User login / logout | ✅ Done | `firebaseConfig.js → loginUser()` |
| Auto-create user doc on signup | ✅ Done | `functions/index.js → onUserCreated` |
| Save transaction to Firestore | ✅ Done | `firebaseConfig.js → saveTransaction()` |
| Real-time dashboard listener | ✅ Done | `firebaseConfig.js → listenToTransactions()` |
| Budget alert push notification | ✅ Done | `functions/index.js → checkBudgetAlert` |
| Anomaly detection + alert | ✅ Done | `functions/index.js → detectAnomaly` |
| Firestore security rules | ✅ Done | `firestore.rules` |
| FCM token registration | ✅ Done | `functions/index.js → updateFcmToken` |

## STILL TODO (60%)

| Feature | File to edit |
|---|---|
| Spend forecasting (linear regression) | `functions/index.js` — see TODO block |
| Weekly digest (every Sunday) | `functions/index.js` — see TODO block |
| Monthly PDF report + email | `functions/index.js` — see TODO block |
| Recurring transaction detection | `functions/index.js` — see TODO block |

---

## QUICK REFERENCE — Key Commands

```bash
firebase emulators:start          # run locally
firebase deploy --only functions  # deploy functions only
firebase deploy --only firestore  # deploy rules only
firebase deploy                   # deploy everything
firebase functions:log            # view real-time logs
```
