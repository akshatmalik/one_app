import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth, GoogleAuthProvider, signInWithPopup, signOut, User, onAuthStateChanged } from 'firebase/auth';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

// Firebase config is safe to be public - security comes from Firestore rules
const firebaseConfig = {
  apiKey: "AIzaSyBS3IVvszDrm_zjjXu8TATgs1H-FlegHtM",
  authDomain: "oneapp-943e3.firebaseapp.com",
  projectId: "oneapp-943e3",
  storageBucket: "oneapp-943e3.firebasestorage.app",
  messagingSenderId: "1052736128978",
  appId: "1:1052736128978:web:9d42b47c6a343eac35aa0b",
};

function getApp(): FirebaseApp {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  return app!;
}

export function getFirebaseDb(): Firestore {
  if (!db) {
    db = getFirestore(getApp());
  }
  return db;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getApp());
  }
  return auth;
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(getFirebaseAuth(), provider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export const isFirebaseConfigured = (): boolean => {
  return true;
};
