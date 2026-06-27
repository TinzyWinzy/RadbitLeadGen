/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "./dbError";

// Configuration retrieved from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyCzptDFwJamgo19hfLiw0GDlWNovirPzZU",
  authDomain: "studio-1786310527-e2fad.firebaseapp.com",
  projectId: "studio-1786310527-e2fad",
  storageBucket: "studio-1786310527-e2fad.firebasestorage.app",
  messagingSenderId: "620586552327",
  appId: "1:620586552327:web:e0e71cbc3ca9d6d7f4eea2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use custom Firestore Database ID if specified
export const db = getFirestore(app, "ai-studio-2cdfec05-2948-4309-bac6-4d69a3cb6acc");

// Enable offline-first local cache synchronization
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("Firestore offline persistence: Multiple browser tabs open. Persistence enabled in first tab.");
  } else if (err.code === "unimplemented") {
    console.warn("Firestore offline persistence: Current browser does not support local caching.");
  } else {
    console.error("Firestore offline persistence failed to initialize:", err);
  }
});

// Test Firestore Connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("Firebase connection established successfully.");
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("offline")) {
      console.warn("Firebase client appears to be offline. Verify your network or configuration.");
    } else if (error?.code === "permission-denied" || (error instanceof Error && error.message.toLowerCase().includes("permission"))) {
      handleFirestoreError(error, OperationType.GET, "test/connection");
    } else {
      console.log("Firebase initialized. Note: Empty/offline state is handled gracefully.");
    }
  }
}

testConnection();
