import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC8G4DMB2xvLUrvs8hqJ8a4sAbXDpWXF0w",
  authDomain: "ykshub-8c76f.firebaseapp.com",
  projectId: "ykshub-8c76f",
  storageBucket: "ykshub-8c76f.appspot.com",
  messagingSenderId: "905968701676",
  appId: "1:905968701676:web:8a8be57db68bfef7f3b49d"
};

console.log('🔥 Firebase başlatılıyor...');

try {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  
  console.log('✅ Firebase başarıyla başlatıldı');
  console.log('App ID:', firebaseConfig.appId);
  console.log('Project ID:', firebaseConfig.projectId);
  
  // Auth durumunu dinle
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('👤 Kullanıcı giriş yaptı:', user.uid);
    } else {
      console.log('🚪 Kullanıcı çıkış yapamış veya giriş yapmamış');
    }
  });
  
  window.firebaseDebug = {
    auth,
    db,
    checkAuth: () => auth.currentUser,
    checkConnection: async () => {
      try {
        const response = await fetch('https://www.google.com/favicon.ico');
        return response.ok ? '✅ İnternet: OK' : '❌ İnternet: Sorun';
      } catch (e) {
        return '❌ İnternet: ' + e.message;
      }
    }
  };
  
} catch (error) {
  console.error('❌ Firebase başlatma hatası:', error);
}
