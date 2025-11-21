import React, { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, setDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'; // setDoc eklendi

// --- FIREBASE VE AYARLAR ---
import { auth, db } from './firebase';
import { APP_ID, DEMO_INTERNAL_ID, ADMIN_USERNAME, ADMIN_PASSWORD, DEMO_USERNAME, DEMO_PASSWORD, DEMO_USER_DATA } from './utils/constants';
import { calculateOBP, getEstimatedRank } from './utils/helpers';

// --- BİLEŞENLER (TÜM MODÜLLER) ---
import Sidebar from './components/Sidebar';
import Auth from './components/Auth';
import AdminExcelView from './components/AdminExcelView';
import Leaderboard from './components/Leaderboard';
import MyExams from './components/MyExams';
import Chat from './components/Chat';
import Calendar from './components/Calendar';
import UserProfile from './components/UserProfile';
import Stats from './components/Stats';
import QuestionWall from './components/QuestionWall';
import Pomodoro from './components/Pomodoro';
import Achievements from './components/Achievements';
import Simulator from './components/Simulator';
import ProfileCard from './components/ProfileCard';

export default function ExamTrackerApp() {
  // --- STATES ---
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [activeTab, setActiveTab] = useState("calendar");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Popup State
  const [viewingUser, setViewingUser] = useState(null);
  
  // Veriler
  const [usersList, setUsersList] = useState([]);
  const [allScores, setAllScores] = useState([]);
  const [myScores, setMyScores] = useState([]);
  const [rankings, setRankings] = useState({});

  // Auth Form
  const [authMode, setAuthMode] = useState("login");
  const [authInput, setAuthInput] = useState({});
  const [authError, setAuthError] = useState("");

  // --- GİRİŞ (LOGIN) ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    
    // 1. Demo Girişi
    if (authInput.email === DEMO_USERNAME && authInput.password === DEMO_PASSWORD) {
        const s = { ...DEMO_USER_DATA, base64Avatar: "" }; 
        setCurrentUser(s); 
        localStorage.setItem('examApp_session', JSON.stringify(s)); 
        setActiveTab('my_exams'); 
        return;
    }
    
    // 2. Admin Girişi
    if (authInput.email === ADMIN_USERNAME && authInput.password === ADMIN_PASSWORD) {
      const s = { username: "Yönetici", email: ADMIN_USERNAME, internalId: "ADMIN_ID", isAdmin: true, avatar: "🛡️", realName: "Admin" };
      setCurrentUser(s); 
      localStorage.setItem('examApp_session', JSON.stringify(s)); 
      setActiveTab('dashboard'); 
      return;
    }
    
    // 3. Öğrenci Girişi
    try {
      const emailKey = authInput.email.toLowerCase();
      const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', emailKey);
      const snap = await getDoc(userRef);
      
      if(snap.exists() && snap.data().password === authInput.password) {
        const s = { ...snap.data(), isAdmin: false, isDemo: false };
        setCurrentUser(s); 
        localStorage.setItem('examApp_session', JSON.stringify(s));
        setActiveTab('my_exams'); 
      } else { 
        setAuthError("E-posta veya şifre hatalı."); 
      }
    } catch (e) { 
      console.error(e); 
      setAuthError("Giriş sırasında bir hata oluştu."); 
    }
  };

  // --- ÇIKIŞ ---
  const handleLogout = () => {
    setCurrentUser(null); 
    localStorage.removeItem('examApp_session'); 
    setActiveTab("calendar"); 
    setAuthInput({});
  };

  // --- KAYIT (REGISTER) - ARTIK AKTİF! ✅ ---
  const handleRegister = async (e) => {
      e.preventDefault();
      setAuthError("");

      // 1. Doğrulama (Validation)
      if (!authInput.email || !authInput.password || !authInput.username || !authInput.realName) {
          setAuthError("Lütfen tüm alanları doldurun.");
          return;
      }
      if (authInput.password !== authInput.passwordConfirm) {
          setAuthError("Şifreler eşleşmiyor.");
          return;
      }
      // OBP Kontrolü
      if (!authInput.s9Avg || !authInput.s10Avg || !authInput.s11Avg || !authInput.s12Avg) {
          setAuthError("Lütfen tüm lise ortalamalarını (OBP için) girin.");
          return;
      }

      try {
          const emailKey = authInput.email.toLowerCase();
          const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', emailKey);

          // 2. E-posta kontrolü (Zaten var mı?)
          const snap = await getDoc(userRef);
          if (snap.exists()) {
              setAuthError("Bu e-posta adresi zaten kayıtlı.");
              return;
          }

          // 3. Yeni Kullanıcı Verisi Oluşturma
          const internalId = crypto.randomUUID(); // Benzersiz ID
          const newUserData = {
              email: emailKey,
              username: authInput.username,
              realName: authInput.realName,
              password: authInput.password, // Not: Gerçek projede şifreleme gerekir
              internalId: internalId,
              avatar: "🎓",
              base64Avatar: "",
              s9Avg: Number(authInput.s9Avg),
              s10Avg: Number(authInput.s10Avg),
              s11Avg: Number(authInput.s11Avg),
              s12Avg: Number(authInput.s12Avg),
              createdAt: serverTimestamp(),
              lastSeen: serverTimestamp(),
              isAdmin: false,
              isDemo: false,
              statusMessage: "YKS Ligi'ne katıldım! 🚀"
          };

          // 4. Veritabanına Kaydet
          await setDoc(userRef, newUserData);

          // 5. Otomatik Giriş Yap
          setCurrentUser(newUserData);
          localStorage.setItem('examApp_session', JSON.stringify(newUserData));
          setActiveTab('my_exams');
          alert("Kayıt başarılı! Aramıza hoş geldin.");

      } catch (error) {
          console.error("Kayıt hatası:", error);
          setAuthError("Kayıt sırasında bir hata oluştu.");
      }
  };

  // --- BAŞLANGIÇ ---
  useEffect(() => {
    const initAuth = async () => { try { await signInAnonymously(auth); } catch (err) {} };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user); setLoading(false);
      const savedSession = localStorage.getItem('examApp_session');
      if (savedSession) setCurrentUser(JSON.parse(savedSession));
    });
    return () => unsubscribe();
  }, []);

  // --- ONLINE DURUMU ---
  useEffect(() => {
      if (!currentUser || currentUser.isDemo || currentUser.isAdmin) return;
      const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email);
      updateDoc(userRef, { lastSeen: serverTimestamp() });
      const interval = setInterval(() => { updateDoc(userRef, { lastSeen: serverTimestamp() }); }, 120000);
      return () => clearInterval(interval);
  }, [currentUser]);

  // --- VERİLERİ DİNLE ---
  useEffect(() => {
    if (!firebaseUser) return;
    
    const unsubScores = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'exam_scores_v3'), (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data = data.filter(s => s.internalUserId !== DEMO_INTERNAL_ID);
      data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setAllScores(data);
    });
    
    const unsubUsers = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts'), (snap) => {
        setUsersList(snap.docs.map(d => d.data()).filter(u => u.internalId !== DEMO_INTERNAL_ID));
    });
    
    return () => { unsubScores(); unsubUsers(); };
  }, [firebaseUser]);

  // --- HESAPLAMALAR ---
  useEffect(() => {
      if (!currentUser || allScores.length === 0) return;

      let mine = allScores.filter(s => s.internalUserId === currentUser.internalId);
      
      if (!currentUser.isAdmin && !currentUser.isDemo) {
          const { placementBonus } = calculateOBP(currentUser.s9Avg, currentUser.s10Avg, currentUser.s11Avg, currentUser.s12Avg);
          mine = mine.map(s => ({
              ...s,
              placementScore: Number((s.finalScore + Number(placementBonus)).toFixed(2))
          }));
      }
      setMyScores(mine);

      const fetchRanks = async () => {
          const newRanks = {};
          for (const s of mine) {
              const rank = await getEstimatedRank(s.placementScore);
              newRanks[s.id] = rank;
          }
          setRankings(newRanks);
      };
      fetchRanks();

  }, [allScores, currentUser]);

  // --- HELPER: Profil Kartı Verileri ---
  const getUserStats = (uid) => {
      const userScores = allScores.filter(s => s.internalUserId === uid);
      if (userScores.length === 0) return null;
      const examCount = userScores.length;
      const lastExamDate = new Date(userScores[0].timestamp?.seconds * 1000).toLocaleDateString('tr-TR');
      const bestScore = Math.max(...userScores.map(s => s.finalScore));
      return { examCount, lastExamDate, bestRank: `${bestScore} Puan` }; 
  };

  const handleUserClick = (uid) => {
      const user = usersList.find(u => u.internalId === uid);
      if (user) setViewingUser(user);
  };

  // --- RENDER ---
  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900 text-white font-sans flex-col gap-4"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div><div>Sistem Yükleniyor...</div></div>;

  if (!currentUser) {
    return (
        <Auth 
            authMode={authMode} 
            setAuthMode={setAuthMode} 
            authInput={authInput} 
            setAuthInput={setAuthInput} 
            authError={authError} 
            setAuthError={setAuthError} 
            handleLogin={handleLogin} 
            handleRegister={handleRegister} // Artık dolu fonksiyon çalışacak
        />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row transition-colors duration-300 font-sans">
      {viewingUser && <ProfileCard user={viewingUser} onClose={() => setViewingUser(null)} stats={getUserStats(viewingUser.internalId)} />}
      
      <Sidebar currentUser={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} handleLogout={handleLogout} />

      <div className="flex-1 p-4 md:p-8 h-screen overflow-y-auto relative scroll-smooth bg-[#f8fafc]">
        {activeTab === 'dashboard' && currentUser.isAdmin && <AdminExcelView usersList={usersList} allScores={allScores} appId={APP_ID} />}
        {activeTab === 'leaderboard' && <Leaderboard allScores={allScores} usersList={usersList} currentUser={currentUser} onUserClick={handleUserClick} />}
        {activeTab === 'my_exams' && !currentUser.isAdmin && <MyExams myScores={myScores} currentUser={currentUser} rankings={rankings} />}
        {activeTab === 'chat' && <Chat currentUser={currentUser} usersList={usersList} onUserClick={handleUserClick} />}
        {activeTab === 'calendar' && <Calendar currentUser={currentUser} />}
        {activeTab === 'profile' && !currentUser.isAdmin && <UserProfile currentUser={currentUser} setCurrentUser={setCurrentUser} />}
        {activeTab === 'stats' && !currentUser.isAdmin && <Stats myScores={myScores} />}
        {activeTab === 'questions' && <QuestionWall currentUser={currentUser} />}
        {activeTab === 'pomodoro' && !currentUser.isAdmin && <Pomodoro currentUser={currentUser} />}
        {activeTab === 'achievements' && !currentUser.isAdmin && <Achievements myScores={myScores} currentUser={currentUser} />}
        {activeTab === 'simulator' && !currentUser.isAdmin && <Simulator currentUser={currentUser} />}
      </div>
    </div>
  );
}