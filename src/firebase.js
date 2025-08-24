// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCgG2KX1ZNmnFv1jaFsROMiq5cPCkxp7Ws",
  authDomain: "dbawanku.firebaseapp.com",
  projectId: "dbawanku",
  storageBucket: "dbawanku.firebasestorage.app",
  messagingSenderId: "59054163087",
  appId: "1:59054163087:web:c8264caba4fb9cbfde1cfa",
  measurementId: "G-HF7D71W9F2"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
