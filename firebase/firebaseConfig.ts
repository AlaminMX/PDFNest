// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCA5P1W15FRzPUfjOrPoTRrHy2q-cHk6DI",
  authDomain: "pdfnestt.firebaseapp.com",
  projectId: "pdfnestt",
  storageBucket: "pdfnestt.firebasestorage.app",
  messagingSenderId: "431285342689",
  appId: "1:431285342689:web:558e385f1a984b341f02a0",
  measurementId: "G-3R2R30S0N1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);