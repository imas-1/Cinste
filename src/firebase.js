import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyA3Rf-lKEvqgX9qm6y0xHyGs0jBM4k69Bo",
  authDomain: "cinste-5e134.firebaseapp.com",
  projectId: "cinste-5e134",
  storageBucket: "cinste-5e134.firebasestorage.app",
  messagingSenderId: "731841447336",
  appId: "1:731841447336:web:4e69f5b6005001b77d499d",
  // dupa ce activezi Realtime Database, Firebase iti arata un URL de forma
  // https://cinste-5e134-default-rtdb.europe-west1.firebasedatabase.app
  // copiaza-l aici:
  databaseURL: "https://cinste-5e134-default-rtdb.europe-west1.firebasedatabase.app/",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
