
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// IMPORTANT: Replace this with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyBHnQgi0WYLA1EFqvTkCBihrzMW_--mL5c",
  authDomain: "poddarsbudget.firebaseapp.com",
  projectId: "poddarsbudget",
  storageBucket: "poddarsbudget.firebasestorage.app",
  messagingSenderId: "577893818978",
  appId: "1:577893818978:web:1ba7358d303a198cbe273b",
  measurementId: "G-GQVVNGK5RL"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
