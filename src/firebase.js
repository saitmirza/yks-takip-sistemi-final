import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Senin verdiğin orijinal ayarlar
const firebaseConfig = {
  apiKey: "AIzaSyBshG7k-i-9opqZUoIFi81I4ZZ9N6Y9sTg",
  authDomain: "yks-takip-sistemi.firebaseapp.com",
  projectId: "yks-takip-sistemi",
  storageBucket: "yks-takip-sistemi.firebasestorage.app",
  messagingSenderId: "110539270734",
  appId: "1:110539270734:web:19ab6ae0b1d2c65d2c711f",
  measurementId: "G-8WK1JVLF8D"
};

// Firebase'i başlatıyoruz
const app = initializeApp(firebaseConfig);

// Diğer dosyalarda kullanmak üzere dışarı aktarıyoruz
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

export default app;