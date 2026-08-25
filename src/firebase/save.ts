import type { GameState } from "../state/types";
import { firebaseConfig, hasFirebaseConfig } from "./config";

let cachedApp: import("firebase/app").FirebaseApp | null = null;
let cachedUid: string | null = null;

export function isCloudSaveAvailable(): boolean {
  return hasFirebaseConfig();
}

async function getUid(): Promise<string | null> {
  if (!hasFirebaseConfig()) return null;
  if (cachedUid) return cachedUid;

  const { initializeApp, getApps } = await import("firebase/app");
  const { getAuth, signInAnonymously, onAuthStateChanged } = await import("firebase/auth");

  cachedApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const auth = getAuth(cachedApp);

  cachedUid = await new Promise<string | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        resolve(user.uid);
      } else {
        signInAnonymously(auth)
          .then((credential) => resolve(credential.user.uid))
          .catch(() => resolve(null));
      }
    });
  });

  return cachedUid;
}

export async function saveCloudState(state: GameState): Promise<void> {
  const uid = await getUid();
  if (!uid || !cachedApp) return;

  const { getFirestore, doc, setDoc } = await import("firebase/firestore");
  const db = getFirestore(cachedApp);
  await setDoc(doc(db, "saves", uid), state);
}

export async function loadCloudState(): Promise<GameState | null> {
  const uid = await getUid();
  if (!uid || !cachedApp) return null;

  const { getFirestore, doc, getDoc } = await import("firebase/firestore");
  const db = getFirestore(cachedApp);
  const snapshot = await getDoc(doc(db, "saves", uid));
  return snapshot.exists() ? (snapshot.data() as GameState) : null;
}
