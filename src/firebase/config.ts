/**
 * Firebase project config, read from Vite env vars.
 *
 * To enable cloud saves:
 *  1. Create a free Firebase project at https://console.firebase.google.com
 *  2. Enable Authentication > Sign-in method > Anonymous
 *  3. Enable Firestore Database (start in production mode, add rules below)
 *  4. Copy the web app config into game/.env.local (see .env.example)
 *
 * Suggested Firestore rules (per-user document, owner-only access):
 *   rules_version = '2';
 *   service cloud.firestore {
 *     match /databases/{database}/documents {
 *       match /saves/{userId} {
 *         allow read, write: if request.auth != null && request.auth.uid == userId;
 *       }
 *     }
 *   }
 *
 * Without a configured project, the game runs fine using localStorage only.
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export function hasFirebaseConfig(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}
