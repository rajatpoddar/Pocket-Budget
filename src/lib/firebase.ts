
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Explicitly check for critical Firebase configuration variables
if (!firebaseConfig.apiKey || typeof firebaseConfig.apiKey !== 'string' || firebaseConfig.apiKey.trim() === "") {
  const errorMsg = `CRITICAL Firebase Config Error: NEXT_PUBLIC_FIREBASE_API_KEY is missing, empty, or invalid.
  Received API Key: '${firebaseConfig.apiKey}'
  Please ensure this environment variable is correctly set in your Vercel project settings (or .env.local for local development) and a new deployment/build was triggered.`;
  console.error(errorMsg);
  throw new Error(errorMsg); // Stop execution if API key is invalid
}

if (!firebaseConfig.projectId || typeof firebaseConfig.projectId !== 'string' || firebaseConfig.projectId.trim() === "") {
  const errorMsg = `CRITICAL Firebase Config Error: NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing, empty, or invalid.
  Received Project ID: '${firebaseConfig.projectId}'
  Please ensure this environment variable is correctly set in your Vercel project settings (or .env.local for local development) and a new deployment/build was triggered.`;
  console.error(errorMsg);
  throw new Error(errorMsg); // Stop execution if Project ID is invalid
}

// Check for other potentially important environment variables and log if missing, but don't hard stop for all.
const recommendedEnvVarKeys: (keyof FirebaseOptions)[] = ['authDomain', 'appId'];
const missingRecommendedEnvVars = recommendedEnvVarKeys.filter(key => !firebaseConfig[key] || typeof firebaseConfig[key] !== 'string' || (firebaseConfig[key] as string).trim() === "");

if (missingRecommendedEnvVars.length > 0) {
  console.warn(`Firebase Config Warning: Some recommended Firebase environment variables are missing or empty. This might lead to issues.
  Missing or empty for keys: ${missingRecommendedEnvVars.join(', ')}
  Ensure all NEXT_PUBLIC_FIREBASE_... variables are set in Vercel (and .env.local).
  Current values:
  authDomain: ${firebaseConfig.authDomain}
  appId: ${firebaseConfig.appId}`);
}

let app;

// Initialize Firebase
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
