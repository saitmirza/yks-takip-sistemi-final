import React, { useState, useEffect, useRef } from 'react';
import { signInAnonymously, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, updateDoc, serverTimestamp, setDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { auth, db } from './firebase';
import { APP_ID, DEMO_INTERNAL_ID, ADMIN_USERNAME, ADMIN_PASSWORD, DEMO_USERNAME, DEMO_PASSWORD, DEMO_USER_DATA, COLOR_THEMES } from './utils/constants';
import { calculateOBP, getEstimatedRank } from './utils/helpers';

// BİLEŞENLER
import Sidebar from './components/Sidebar';
import Auth from './components/Auth';
import AdminDashboard from './components/AdminDashboard';
import Leaderboard from './components/Leaderboard';
import MyExams from './components/MyExams';
import Chat from './components/Chat';
import Calendar from './components/Calendar';
import UserProfile from './components/UserProfile';
import AccountSettings from './components/AccountSettings';
import Stats from './components/Stats';
import QuestionWall from './components/QuestionWall';
import Pomodoro from './components/Pomodoro';
import Achievements from './components/Achievements';
import Simulator from './components/Simulator';
import ProfileCard from './components/ProfileCard';
import Toast from './components/Toast';
import SubjectTracker from './components/SubjectTracker';
import StudyLogger from './components/StudyLogger';
import StudyScheduler from './components/StudyScheduler';
import NotificationManager from './components/NotificationManager';
import VideoLessons from './components/VideoLessons';
import FeedbackPanel from './components/FeedbackPanel';
import ClassSelectionModal from './components/ClassSelectionModal';
import StudentExamRequest from './components/StudentExamRequest';
import Forum from './components/Forum'; 
import DreamSchool from './components/DreamSchool'; 
import SmartCoach from './components/SmartCoach';
import ResourceLibrary from './components/ResourceLibrary';

export default function ExamTrackerApp() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [activeTab, setActiveTab] = useState("calendar");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [toast, setToast] = useState(null);
  
  const [usersList, setUsersList] = useState([]);
  const [allScores, setAllScores] = useState([]);
  const [myScores, setMyScores] = useState([]);
  const [rankings, setRankings] = useState({});
  const [questions, setQuestions] = useState([]); 
  const [authMode, setAuthMode] = useState("login");
  const [authInput, setAuthInput] = useState({});
  const [authError, setAuthError] = useState("");

  const userEmailRef = useRef(null);
  const addToast = (message, type = 'success') => { setToast({ message, type }); };

  const saveSession = (user) => { try { localStorage.setItem('examApp_session', JSON.stringify(user)); } catch (err) {} };
  const getSession = () => { try { const saved = localStorage.getItem('examApp_session'); if (saved) return JSON.parse(saved); } catch (err) {} return null; };

  // --- TEMA MOTORU ---
  const getActiveTheme = () => {
      const themeId = currentUser?.themeColor || 'indigo';
      if (COLOR_THEMES[themeId]) return COLOR_THEMES[themeId];
      if (currentUser?.customThemes) {
          const custom = currentUser.customThemes.find(t => t.id === themeId);
          if (custom) return custom;
      }
      return COLOR_THEMES['indigo'];
  };

  const theme = getActiveTheme();

// --- DYNAMIC STYLES (V14 - INPUT RESET & GLASS FIX) ---
  const DynamicStyles = () => (
    <style>{`
        :root { 
            --primary: ${theme.primary}; 
            --primary-light: ${theme.light || theme.primary + '33'};
            --primary-dark: ${theme.dark || theme.primary}; 
        }

        /* ... (Temel Renkler aynı kalsın) ... */
        .bg-indigo-600, .hover\\:bg-indigo-700:hover { background-color: var(--primary) !important; }
        /* ... */

        body { 
            background: ${theme.gradient} !important; 
            background-attachment: fixed; 
            color: #e2e8f0 !important; 
        }

        /* --- 1. GLASS BOX (KARTLAR İÇİN) --- */
        .glass-box {
            background-color: rgba(15, 23, 42, 0.70) !important; /* Slate 900 %70 */
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
            color: #ffffff !important;
        }

        /* --- 2. GLASS INPUT (GİRİŞ KUTULARI İÇİN - KESİN ÇÖZÜM) --- */
        .glass-input {
            background-color: #0f172a !important; /* Slate 900 (Opak) */
            border: 1px solid #334155 !important; /* Slate 700 */
            color: #ffffff !important;
            border-radius: 0.75rem !important; /* rounded-xl */
            padding: 0.75rem 1rem !important; /* p-3 */
            outline: none !important;
            width: 100% !important;
            -webkit-appearance: none !important; /* Safari varsayılanını kaldır */
        }
        
        /* Dropdown okunu düzelt (Safari için) */
        select.glass-input {
             background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e") !important;
             background-position: right 0.5rem center !important;
             background-repeat: no-repeat !important;
             background-size: 1.5em 1.5em !important;
             padding-right: 2.5rem !important;
        }

        /* Dropdown seçenekleri (Option) her zaman koyu olsun */
        .glass-input option {
            background-color: #0f172a !important;
            color: #ffffff !important;
        }

        /* Placeholder Rengi */
        .glass-input::placeholder {
            color: #94a3b8 !important; /* Slate 400 */
        }

        .text-indigo-600 { color: #818cf8 !important; } 
    `}</style>
  );
  // --- AUTH VE OTURUM YÖNETİMİ (iOS & YÜKLEME FIX) ---
  useEffect(() => {
    // 1. ZAMAN AŞIMI GÜVENLİĞİ (Safety Valve)
    // Eğer Firebase 4 saniye içinde cevap vermezse, yükleme ekranını zorla kapat.
    // Bu, iOS'ta beyaz ekranda kalmayı engeller.
    const safetyTimer = setTimeout(() => {
        setLoading(false);
    }, 4000);

    const initAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (err) { console.error("Persistence error:", err); }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(safetyTimer); // Firebase cevap verdi, zamanlayıcıyı iptal et.

      if (user) {
        setFirebaseUser(user);
        // Eğer kullanıcı varsa ama veritabanı okuması yavaşsa, en azından oturumu açık tut
        if (!user.isAnonymous && user.email) {
            try {
                const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', user.email);
                const docSnap = await getDoc(userRef);
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    setCurrentUser(userData);
                    saveSession(userData);
                } else if (user.email === ADMIN_USERNAME) {
                    const adminUser = { username: "Yönetici", email: ADMIN_USERNAME, internalId: "ADMIN_ID", isAdmin: true, avatar: "🛡️", realName: "Admin", classSection: "Yönetim" };
                    setCurrentUser(adminUser);
                }
            } catch (err) { console.error("User fetch err:", err); }
        }
      } else {
        setFirebaseUser(null);
        setCurrentUser(null);
      }
      setLoading(false); // Yüklemeyi kapat
    });
    
    return () => {
        unsubscribe();
        clearTimeout(safetyTimer);
    };
  }, []);

  // --- GİRİŞ / ÇIKIŞ / KAYIT ---
  const handleLogin = async (e) => {
    e.preventDefault(); setAuthError("");
    const inputVal = authInput.email?.trim(); 
    if (!inputVal || !authInput.password) { setAuthError("Lütfen bilgileri girin."); return; }
    
    if ((inputVal === DEMO_USERNAME || inputVal === DEMO_USER_DATA.email) && authInput.password === DEMO_PASSWORD) {
        const s = { ...DEMO_USER_DATA, base64Avatar: "" }; setCurrentUser(s); saveSession(s); setActiveTab('my_exams'); addToast("Demo giriş başarılı!", "info"); return;
    }
    
    if ((inputVal === ADMIN_USERNAME || inputVal === "admin@yks.com") && authInput.password === ADMIN_PASSWORD) {
      const s = { username: "Yönetici", email: ADMIN_USERNAME, internalId: "ADMIN_ID", isAdmin: true, avatar: "🛡️", realName: "Admin", classSection: "Yönetim" }; setCurrentUser(s); saveSession(s); setActiveTab('dashboard'); addToast("Admin girişi yapıldı.", "success"); return;
    }
    
    try {
      let userData = null;
      if (inputVal.includes('@')) {
          const emailKey = inputVal.toLowerCase(); const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', emailKey);
          const snap = await getDoc(userRef); if (snap.exists()) userData = snap.data();
      } else {
          const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts'), where("username", "==", inputVal));
          const querySnapshot = await getDocs(q); if (!querySnapshot.empty) userData = querySnapshot.docs[0].data();
      }
      
      if(userData) {
          if (userData.isBanned) { setAuthError("Bu hesap yasaklanmıştır."); return; }
          if (userData.password === authInput.password) {
            const s = { ...userData, isAdmin: false, isDemo: false }; setCurrentUser(s); saveSession(s); setActiveTab('my_exams'); addToast(`Hoş geldin ${s.username}!`);
          } else { setAuthError("Hatalı şifre."); addToast("Giriş başarısız.", "error"); }
      } else { setAuthError("Kullanıcı bulunamadı."); }
    } catch (e) { console.error(e); setAuthError("Giriş hatası."); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setAuthError("");
    if (!authInput.email || !authInput.password || !authInput.username || !authInput.realName) { setAuthError("Lütfen tüm zorunlu alanları doldurun."); return; }
    if (authInput.password !== authInput.passwordConfirm) { setAuthError("Şifreler eşleşmiyor."); return; }

    try {
        setLoading(true);
        const emailKey = authInput.email.toLowerCase().trim();
        const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', emailKey);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) { setAuthError("Bu e-posta adresi zaten kullanımda."); setLoading(false); return; }

        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts'), where("username", "==", authInput.username));
        const usernameSnap = await getDocs(q);
        if (!usernameSnap.empty) { setAuthError("Bu kullanıcı adı alınmış."); setLoading(false); return; }

        const internalId = "U_" + Date.now() + Math.random().toString(36).substr(2, 9);
        const newUser = {
            username: authInput.username, realName: authInput.realName, email: emailKey, password: authInput.password, 
            classSection: authInput.classSection || "Mezun", internalId: internalId, isAdmin: false, isDemo: false,
            createdAt: serverTimestamp(), lastSeen: serverTimestamp(), avatar: "🎓", base64Avatar: "", themeColor: "indigo",
            s9Avg: Number(authInput.s9Avg) || 0, s10Avg: Number(authInput.s10Avg) || 0, s11Avg: Number(authInput.s11Avg) || 0, s12Avg: Number(authInput.s12Avg) || 0,
            streak: 0, totalSolved: 0, totalStudyMinutes: 0
        };

        await setDoc(userRef, newUser);
        setCurrentUser(newUser); saveSession(newUser);
        setActiveTab('my_exams'); addToast(`Aramıza hoş geldin, ${newUser.realName}! 🎉`);
    } catch (error) { console.error(error); setAuthError("Kayıt hatası: " + error.message); } finally { setLoading(false); }
  };

  const handleLogout = () => { setCurrentUser(null); localStorage.removeItem('examApp_session'); setActiveTab("calendar"); setAuthInput({}); addToast("Çıkış yapıldı.", "info"); };

  // --- EFFECTLER ---
  useEffect(() => { const initAuth = async () => { try { await signInAnonymously(auth); } catch (err) {} }; initAuth(); }, []); // onAuthStateChanged'i buradan kaldırdık, yukarıda tek bir yerde yönetiyoruz.
  
  useEffect(() => {
    if (!currentUser?.email || currentUser.isDemo || currentUser.isAdmin) return;
    if (userEmailRef.current === currentUser.email) return;
    userEmailRef.current = currentUser.email;

    const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            const freshData = docSnap.data();
            setCurrentUser(prev => {
                if (JSON.stringify(prev) !== JSON.stringify({ ...prev, ...freshData })) {
                   const updated = { ...prev, ...freshData };
                   saveSession(updated);
                   return updated;
                }
                return prev;
            });
        }
    });
    return () => { unsubscribe(); userEmailRef.current = null; };
  }, [currentUser?.email]);

  useEffect(() => { 
      if (!currentUser || currentUser.isDemo || currentUser.isAdmin) return; 
      const updateSeen = () => updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email), { lastSeen: serverTimestamp() }).catch(e => console.log(e));
      updateSeen();
      const interval = setInterval(updateSeen, 120000); 
      return () => clearInterval(interval); 
  }, [currentUser?.email]);

  useEffect(() => { 
      if (!firebaseUser) return; 
      const unsubScores = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'exam_scores_v3'), (snap) => { let data = snap.docs.map(d => ({ id: d.id, ...d.data() })); data = data.filter(s => s.internalUserId !== DEMO_INTERNAL_ID); data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)); setAllScores(data); }); 
      const unsubUsers = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts'), (snap) => { setUsersList(snap.docs.map(d => d.data()).filter(u => u.internalId !== DEMO_INTERNAL_ID)); }); 
      const unsubQuestions = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'questions'), orderBy('timestamp', 'desc')), (snap) => { setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() }))); }); 
      return () => { unsubScores(); unsubUsers(); unsubQuestions(); }; 
  }, [firebaseUser]);
  
  useEffect(() => { 
      if (!currentUser || allScores.length === 0) return; 
      let mine = allScores.filter(s => s.internalUserId === currentUser.internalId); 
      if (!currentUser.isAdmin && !currentUser.isDemo) { 
          const { placementBonus } = calculateOBP(currentUser.s9Avg, currentUser.s10Avg, currentUser.s11Avg, currentUser.s12Avg); 
          mine = mine.map(s => ({ ...s, placementScore: Number((s.finalScore + Number(placementBonus)).toFixed(2)) })); 
      } 
      setMyScores(mine); 
      const fetchRanks = async () => { const newRanks = {}; for (const s of mine) { newRanks[s.id] = await getEstimatedRank(s.placementScore); } setRankings(newRanks); }; 
      fetchRanks(); 
  }, [allScores, currentUser?.internalId]);
  
  const getUserStats = (uid) => { const userScores = allScores.filter(s => s.internalUserId === uid); if (userScores.length === 0) return null; const examCount = userScores.length; const lastExamDate = new Date(userScores[0].timestamp?.seconds * 1000).toLocaleDateString('tr-TR'); const bestScore = Math.max(...userScores.map(s => s.finalScore)); return { examCount, lastExamDate, bestRank: `${bestScore} Puan` }; };
  const getUserScores = (uid) => allScores.filter(s => s.internalUserId === uid);
  const handleUserClick = (uid) => { const user = usersList.find(u => u.internalId === uid); if (user) setViewingUser(user); };

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-slate-900 text-white font-sans z-[9999]"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  if (!currentUser) return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center p-4 bg-slate-900 overflow-y-auto" style={{ background: theme.gradient }}>
          <DynamicStyles />
          <Auth authMode={authMode} setAuthMode={setAuthMode} authInput={authInput} setAuthInput={setAuthInput} authError={authError} setAuthError={setAuthError} handleLogin={handleLogin} handleRegister={handleRegister} />
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
  );

  return (
    // IOS FIX: fixed inset-0 ile tam ekran garanti
    <div className="fixed inset-0 w-full h-full bg-slate-900 text-slate-100 font-sans overflow-hidden flex flex-col md:flex-row" style={{ background: theme.gradient }}>
      <DynamicStyles />
      <NotificationManager currentUser={currentUser} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {viewingUser && <ProfileCard user={viewingUser} onClose={() => setViewingUser(null)} stats={getUserStats(viewingUser.internalId)} userScores={getUserScores(viewingUser.internalId)} questions={questions} />}
      <ClassSelectionModal currentUser={currentUser} setCurrentUser={setCurrentUser} />
      
      <Sidebar currentUser={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} handleLogout={handleLogout} />

      {/* IOS FIX: İçerik alanı absolute inset-0 değil, flex-1 olarak ayarlandı ve paddingler düzenlendi */}
      {/* iOS Safari'de sayfanın aşağıya taşmasını engellemek için -webkit-overflow-scrolling eklendi */}
      <main className="flex-1 h-full w-full relative overflow-y-auto overflow-x-hidden scroll-smooth custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="pt-20 pb-24 px-4 md:py-8 md:px-8 md:ml-64 min-h-full">
            <div className="max-w-7xl mx-auto page-enter pb-10">
                {activeTab === 'dashboard' && currentUser.isAdmin && <AdminDashboard usersList={usersList} allScores={allScores} appId={APP_ID} currentUser={currentUser} />}
                {activeTab === 'leaderboard' && <Leaderboard allScores={allScores} usersList={usersList} currentUser={currentUser} onUserClick={handleUserClick} />}
                {activeTab === 'my_exams' && !currentUser.isAdmin && <MyExams myScores={myScores} currentUser={currentUser} rankings={rankings} />}
                {activeTab === 'chat' && <Chat currentUser={currentUser} usersList={usersList} onUserClick={handleUserClick} />}
                {activeTab === 'calendar' && <Calendar currentUser={currentUser} />}
                {activeTab === 'profile' && !currentUser.isAdmin && <UserProfile currentUser={currentUser} setCurrentUser={setCurrentUser} myScores={myScores} questions={questions} />}
                {activeTab === 'settings' && !currentUser.isAdmin && <AccountSettings currentUser={currentUser} setCurrentUser={setCurrentUser} />}
                {activeTab === 'stats' && !currentUser.isAdmin && <Stats myScores={myScores} />}
                {activeTab === 'questions' && <QuestionWall currentUser={currentUser} initialQuestions={questions} />}
                {activeTab === 'pomodoro' && !currentUser.isAdmin && <Pomodoro currentUser={currentUser} />}
                {activeTab === 'achievements' && !currentUser.isAdmin && <Achievements myScores={myScores} currentUser={currentUser} questions={questions} appId={APP_ID} />}
                {activeTab === 'simulator' && !currentUser.isAdmin && <Simulator currentUser={currentUser} />}
                {activeTab === 'videos' && !currentUser.isAdmin && <VideoLessons />}
                {activeTab === 'studylog' && !currentUser.isAdmin && <StudyLogger currentUser={currentUser} />}
                {activeTab === 'scheduler' && !currentUser.isAdmin && <StudyScheduler currentUser={currentUser} />}
                {activeTab === 'subjects' && !currentUser.isAdmin && <SubjectTracker currentUser={currentUser} />}
                {activeTab === 'feedback' && !currentUser.isAdmin && <FeedbackPanel currentUser={currentUser} />}
                {activeTab === 'exam_request' && !currentUser.isAdmin && <StudentExamRequest currentUser={currentUser} allScores={allScores} />}
                {activeTab === 'forum' && <Forum currentUser={currentUser} />}
                {activeTab === 'dreams' && !currentUser.isAdmin && <DreamSchool currentUser={currentUser} myScores={myScores} />}
                {activeTab === 'coach' && !currentUser.isAdmin && <SmartCoach currentUser={currentUser} myScores={myScores} />}
                {activeTab === 'library' && <ResourceLibrary currentUser={currentUser} />}
            </div>
          </div>
      </main>
    </div>
  );
}