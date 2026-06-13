// ============================================================
//  firebaseConfig.js — paste this into your frontend HTML
//  Replace ALL values below with your actual Firebase project
//  values from: Firebase Console → Project Settings → General
// ============================================================

// Step 1: Go to https://console.firebase.google.com
// Step 2: Create project → "ExpenseCloud"
// Step 3: Add Web App → copy the config object below
// Step 4: Replace the placeholder values with your real ones

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAeOBGD-H2EyoI5qVbFiWZbmz8hidi2h64",
  authDomain: "expensecloud-f6a20.firebaseapp.com",
  projectId: "expensecloud-f6a20",
  storageBucket: "expensecloud-f6a20.firebasestorage.app",
  messagingSenderId: "883180514980",
  appId: "1:883180514980:web:8451366d2f707dfb584031",
  measurementId: "G-F09X6777V4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// ── Initialize Firebase ──
firebase.initializeApp(firebaseConfig);

const auth      = firebase.auth();
const db        = firebase.firestore();
const functions = firebase.functions();

// ── Enable offline persistence (transactions work without internet) ──
db.enablePersistence({ synchronizeTabs: true })
  .catch((err) => {
    if (err.code === "failed-precondition") {
      console.warn("Persistence: multiple tabs open — only one tab will persist");
    } else if (err.code === "unimplemented") {
      console.warn("Persistence: browser does not support IndexedDB");
    }
  });

// ── AUTH FUNCTIONS ──

/**
 * Register a new user with email + password
 * Called by: sign-up form in your HTML
 */
async function registerUser(email, password, displayName) {
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName });
    console.log("✅ Registered:", cred.user.uid);
    return { success: true, user: cred.user };
  } catch (err) {
    console.error("❌ Register failed:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Log in an existing user
 * Called by: login form in your HTML
 */
async function loginUser(email, password) {
  try {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    console.log("✅ Logged in:", cred.user.uid);
    return { success: true, user: cred.user };
  } catch (err) {
    console.error("❌ Login failed:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Log out the current user
 */
async function logoutUser() {
  await auth.signOut();
  console.log("✅ Logged out");
}

// ── TRANSACTION FUNCTIONS ──

/**
 * Save a new transaction to Firestore
 * Called by: "Save to Cloud" button in Add Transaction screen
 *
 * @param {Object} txn - { amount, description, category, type, note, date }
 */
async function saveTransaction(txn) {
  const user = auth.currentUser;
  if (!user) return { success: false, error: "Not logged in" };

  try {
    const docRef = await db
      .collection("users")
      .doc(user.uid)
      .collection("transactions")
      .add({
        ...txn,
        amount:      Number(txn.amount),
        userId:      user.uid,
        date:        firebase.firestore.Timestamp.fromDate(new Date(txn.date || Date.now())),
        createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
        isAnomalous: false,    // Cloud Function will update this if anomaly detected
      });

    console.log("✅ Transaction saved:", docRef.id);
    return { success: true, id: docRef.id };
  } catch (err) {
    console.error("❌ saveTransaction failed:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Real-time listener for the current month's transactions
 * Calls onUpdate(transactions[]) every time data changes
 *
 * Returns: unsubscribe function — call it to stop listening
 *
 * CONNECT TO FRONTEND:
 *   Call this when dashboard loads. Pass a callback that
 *   updates your HTML balance hero, chart, and txn list.
 */
function listenToTransactions(onUpdate) {
  const user = auth.currentUser;
  if (!user) return () => {};

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const unsubscribe = db
    .collection("users")
    .doc(user.uid)
    .collection("transactions")
    .where("date", ">=", firebase.firestore.Timestamp.fromDate(startOfMonth))
    .orderBy("date", "desc")
    .onSnapshot((snapshot) => {
      const txns = [];
      snapshot.forEach((doc) => txns.push({ id: doc.id, ...doc.data() }));
      onUpdate(txns);
    });

  return unsubscribe;
}

/**
 * Get user's budget settings
 */
async function getBudgetSettings() {
  const user = auth.currentUser;
  if (!user) return null;

  const doc = await db.collection("users").doc(user.uid).get();
  return doc.exists ? doc.data() : null;
}

/**
 * Update the monthly budget limit
 * Called by: budget settings input in your HTML
 */
async function updateBudgetLimit(newLimit) {
  const user = auth.currentUser;
  if (!user) return;

  await db.collection("users").doc(user.uid).update({
    budgetLimit: Number(newLimit),
  });
  console.log("✅ Budget limit updated to", newLimit);
}

// ── AUTH STATE LISTENER ──
// Attach this to the top of your frontend script
// It fires whenever user logs in or out
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log("👤 Signed in as:", user.displayName || user.email);
    // TODO: call listenToTransactions() here
    // TODO: update dashboard UI with user's name
  } else {
    console.log("🚪 Signed out — redirect to login screen");
    // TODO: showScreen('screen-login')
  }
});
