import React, { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, updateDoc, serverTimestamp, setDoc, query, where, getDocs, orderBy } from 'firebase/firestore';

// --- FIREBASE VE AYARLAR ---
import { auth, db } from './firebase';
import { APP_ID, DEMO_INTERNAL_ID, ADMIN_USERNAME, ADMIN_PASSWORD, DEMO_USERNAME, DEMO_PASSWORD, DEMO_USER_DATA, COLOR_THEMES } from './utils/constants';
import { calculateOBP, getEstimatedRank } from './utils/helpers';

// --- BİLEŞENLER ---
import Sidebar from './components/Sidebar';
import Auth from './components/Auth';
import AdminDashboard from './components/AdminDashboard'; // YENİ: Komuta Merkezi
import AdminExcelView from './components/AdminExcelView'; // Dashboard içinde kullanılıyor ama import kalsın
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

export default function ExamTrackerApp() {
  // --- STATES ---
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

  const addToast = (message, type = 'success') => { setToast({ message, type }); };

  // --- GİRİŞ İŞLEMLERİ ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    const inputVal = authInput.email?.trim(); 
    if (!inputVal || !authInput.password) { setAuthError("Lütfen bilgileri girin."); return; }

    // Demo Girişi
    if ((inputVal === DEMO_USERNAME || inputVal === DEMO_USER_DATA.email) && authInput.password === DEMO_PASSWORD) {
        const s = { ...DEMO_USER_DATA, base64Avatar: "" }; 
        setCurrentUser(s); localStorage.setItem('examApp_session', JSON.stringify(s)); setActiveTab('my_exams'); addToast("Demo giriş başarılı!", "info"); return;
    }
    // Admin Girişi
    if ((inputVal === ADMIN_USERNAME || inputVal === "admin@yks.com") && authInput.password === ADMIN_PASSWORD) {
      const s = { username: "Yönetici", email: ADMIN_USERNAME, internalId: "ADMIN_ID", isAdmin: true, avatar: "🛡️", realName: "Admin" };
      setCurrentUser(s); localStorage.setItem('examApp_session', JSON.stringify(s)); setActiveTab('dashboard'); addToast("Komuta Merkezine Hoş Geldiniz.", "success"); return;
    }
    
    // Öğrenci Girişi
    try {
      let userData = null;
      if (inputVal.includes('@')) {
          const emailKey = inputVal.toLowerCase();
          const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', emailKey);
          const snap = await getDoc(userRef);
          if (snap.exists()) userData = snap.data();
      } else {
          const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts'), where("username", "==", inputVal));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) userData = querySnapshot.docs[0].data();
      }
      if(userData && userData.password === authInput.password) {
        const s = { ...userData, isAdmin: false, isDemo: false };
        setCurrentUser(s); localStorage.setItem('examApp_session', JSON.stringify(s)); setActiveTab('my_exams'); addToast(`Hoş geldin ${s.username}!`);
      } else { setAuthError("Hatalı bilgi."); addToast("Giriş başarısız.", "error"); }
    } catch (e) { console.error(e); setAuthError("Giriş hatası."); }
  };

  const handleLogout = () => { setCurrentUser(null); localStorage.removeItem('examApp_session'); setActiveTab("calendar"); setAuthInput({}); addToast("Çıkış yapıldı.", "info"); };
  const handleRegister = async (e) => { e.preventDefault(); alert("Kayıt kapalı."); };

  // --- DATA LISTENERS ---
  useEffect(() => { const initAuth = async () => { try { await signInAnonymously(auth); } catch (err) {} }; initAuth(); onAuthStateChanged(auth, (user) => { setFirebaseUser(user); setLoading(false); const savedSession = localStorage.getItem('examApp_session'); if (savedSession) setCurrentUser(JSON.parse(savedSession)); }); }, []);
  
  // Online Durumu ve Kullanıcı Verisi Dinleme
  useEffect(() => { 
      if (!currentUser || currentUser.isDemo || currentUser.isAdmin) return; 
      const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email); 
      
      // Kullanıcı verisini dinle (Streak vb. için)
      const unsubMe = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
              const freshData = { ...docSnap.data(), isAdmin: false, isDemo: false };
              // Sadece gerekli alanları güncellemek daha performanslı olabilir ama şimdilik full update
              // Döngüye girmemesi için kontrol eklenebilir, burada basit tutuyoruz.
              if(JSON.stringify(freshData) !== JSON.stringify(currentUser)) {
                  setCurrentUser(prev => ({...prev, ...freshData}));
                  localStorage.setItem('examApp_session', JSON.stringify(freshData));
              }
          }
      });

      updateDoc(userRef, { lastSeen: serverTimestamp() }); 
      const interval = setInterval(() => { updateDoc(userRef, { lastSeen: serverTimestamp() }); }, 120000); 
      
      return () => { unsubMe(); clearInterval(interval); }; 
  }, [currentUser?.email]); // Sadece email değişince yeniden kur

  useEffect(() => { if (!firebaseUser) return; 
    const unsubScores = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'exam_scores_v3'), (snap) => { let data = snap.docs.map(d => ({ id: d.id, ...d.data() })); data = data.filter(s => s.internalUserId !== DEMO_INTERNAL_ID); data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)); setAllScores(data); }); 
    const unsubUsers = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts'), (snap) => { setUsersList(snap.docs.map(d => d.data()).filter(u => u.internalId !== DEMO_INTERNAL_ID)); }); 
    const qQuery = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'questions'), orderBy('timestamp', 'desc')); 
    const unsubQuestions = onSnapshot(qQuery, (snap) => { setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() }))); }); 
    return () => { unsubScores(); unsubUsers(); unsubQuestions(); }; 
  }, [firebaseUser]);

  useEffect(() => { if (!currentUser || allScores.length === 0) return; let mine = allScores.filter(s => s.internalUserId === currentUser.internalId); if (!currentUser.isAdmin && !currentUser.isDemo) { const { placementBonus } = calculateOBP(currentUser.s9Avg, currentUser.s10Avg, currentUser.s11Avg, currentUser.s12Avg); mine = mine.map(s => ({ ...s, placementScore: Number((s.finalScore + Number(placementBonus)).toFixed(2)) })); } setMyScores(mine); const fetchRanks = async () => { const newRanks = {}; for (const s of mine) { const rank = await getEstimatedRank(s.placementScore); newRanks[s.id] = rank; } setRankings(newRanks); }; fetchRanks(); }, [allScores, currentUser]);

  const getUserStats = (uid) => { const userScores = allScores.filter(s => s.internalUserId === uid); if (userScores.length === 0) return null; const examCount = userScores.length; const lastExamDate = new Date(userScores[0].timestamp?.seconds * 1000).toLocaleDateString('tr-TR'); const bestScore = Math.max(...userScores.map(s => s.finalScore)); return { examCount, lastExamDate, bestRank: `${bestScore} Puan` }; };
  const getUserScores = (uid) => allScores.filter(s => s.internalUserId === uid);
  const handleUserClick = (uid) => { const user = usersList.find(u => u.internalId === uid); if (user) setViewingUser(user); };

  // --- STİL MOTORU ---
  const theme = COLOR_THEMES[currentUser?.themeColor] || COLOR_THEMES['indigo'];

  const DynamicStyles = () => (
    <style>{`
        :root {
            --primary: ${theme.primary};
            --primary-light: ${theme.light};
            --primary-dark: ${theme.dark};
        }
        .bg-indigo-600, .hover\\:bg-indigo-700:hover { background-color: var(--primary) !important; }
        .text-indigo-600 { color: var(--primary) !important; }
        .text-indigo-700 { color: var(--primary-dark) !important; }
        .bg-indigo-50 { background-color: var(--primary-light) !important; }
        .border-indigo-600 { border-color: var(--primary) !important; }
        .ring-indigo-500 { --tw-ring-color: var(--primary) !important; }
        .bg-gradient-to-b.from-zinc-900 { background: ${theme.gradient} !important; }

        /* --- ZORUNLU KARANLIK MOD --- */
        body { 
            background: ${theme.gradient} !important;
            background-attachment: fixed;
            color: #e2e8f0 !important; 
        }
        
        /* Beyaz/Gri Kutular -> Koyu Glassmorphism */
        .bg-white, .bg-slate-50, .bg-gray-50, .bg-[#f8fafc], .bg-[#efeae2] { 
            background-color: rgba(17, 24, 39, 0.85) !important; 
            backdrop-filter: blur(12px);
            border-color: rgba(255, 255, 255, 0.1) !important; 
            color: #f3f4f6 !important; 
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5) !important;
        }

        /* Metinler */
        .text-slate-800, .text-slate-700, .text-gray-800, .text-gray-700, .text-black { color: #f3f4f6 !important; }
        .text-slate-600, .text-slate-500, .text-gray-600, .text-gray-500 { color: #9ca3af !important; }

        /* Inputlar */
        input, select, textarea { background-color: rgba(0, 0, 0, 0.5) !important; color: white !important; border-color: rgba(255, 255, 255, 0.2) !important; }
        
        /* Tablolar */
        thead, thead tr, .bg-slate-50\\/50, .bg-gray-100 { background-color: rgba(0,0,0,0.4) !important; color: #e5e7eb !important; }
        tbody tr:hover { background-color: rgba(255,255,255,0.05) !important; }

        /* Linkler */
        .text-indigo-600 { color: #818cf8 !important; } 
        
        /* Sohbet Balonları */
        .bg-white.text-slate-800 { background-color: #1f2937 !important; color: white !important; border: 1px solid #374151 !important; }
        .bg-\\[\\#d9fdd3\\] { background-color: #064e3b !important; color: white !important; border: none !important; }
    `}</style>
  );

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900 text-white font-sans"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  // GİRİŞ EKRANI (Stiller Burada da Geçerli Olsun Diye Wrapper İçinde)
  if (!currentUser) return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans" style={{ background: theme.gradient, backgroundAttachment: 'fixed' }}>
          <DynamicStyles />
          <Auth authMode={authMode} setAuthMode={setAuthMode} authInput={authInput} setAuthInput={setAuthInput} authError={authError} setAuthError={setAuthError} handleLogin={handleLogin} handleRegister={handleRegister} />
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
  );

  return (
    // ANA EKRAN
    <div className="min-h-screen flex flex-col md:flex-row transition-colors duration-300 font-sans overflow-hidden dark"
         style={{ background: theme.gradient, backgroundAttachment: 'fixed' }}>
      
      <DynamicStyles />
      <NotificationManager currentUser={currentUser} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {viewingUser && <ProfileCard user={viewingUser} onClose={() => setViewingUser(null)} stats={getUserStats(viewingUser.internalId)} userScores={getUserScores(viewingUser.internalId)} questions={questions} />}
      
      <Sidebar currentUser={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} handleLogout={handleLogout} />

      <div className="flex-1 p-4 md:p-8 pt-20 pb-32 md:pt-8 md:pb-8 md:ml-64 min-h-screen relative scroll-smooth">
        <div key={activeTab} className="page-enter max-w-7xl mx-auto">
            {/* YÖNETİCİ KOMUTA MERKEZİ (GÜNCELLENDİ) */}
            {activeTab === 'dashboard' && currentUser.isAdmin && (
                <AdminDashboard usersList={usersList} allScores={allScores} appId={APP_ID} />
            )}
            
            {activeTab === 'leaderboard' && <Leaderboard allScores={allScores} usersList={usersList} currentUser={currentUser} onUserClick={handleUserClick} />}
            {activeTab === 'my_exams' && !currentUser.isAdmin && <MyExams myScores={myScores} currentUser={currentUser} rankings={rankings} />}
            {activeTab === 'chat' && <Chat currentUser={currentUser} usersList={usersList} onUserClick={handleUserClick} />}
            {activeTab === 'calendar' && <Calendar currentUser={currentUser} />}
            {activeTab === 'profile' && !currentUser.isAdmin && <UserProfile currentUser={currentUser} setCurrentUser={setCurrentUser} myScores={myScores} questions={questions} />}
            {activeTab === 'settings' && !currentUser.isAdmin && <AccountSettings currentUser={currentUser} setCurrentUser={setCurrentUser} />}
            {activeTab === 'stats' && !currentUser.isAdmin && <Stats myScores={myScores} />}
            {activeTab === 'questions' && <QuestionWall currentUser={currentUser} initialQuestions={questions} />}
            {activeTab === 'pomodoro' && !currentUser.isAdmin && <Pomodoro currentUser={currentUser} />}
            {activeTab === 'achievements' && !currentUser.isAdmin && <Achievements myScores={myScores} currentUser={currentUser} questions={questions} />}
            {activeTab === 'simulator' && !currentUser.isAdmin && <Simulator currentUser={currentUser} />}
            {activeTab === 'studylog' && !currentUser.isAdmin && <StudyLogger currentUser={currentUser} />}
            {activeTab === 'scheduler' && !currentUser.isAdmin && <StudyScheduler currentUser={currentUser} />}
            {activeTab === 'subjects' && !currentUser.isAdmin && <SubjectTracker currentUser={currentUser} />}
        </div>
      </div>
    </div>
  );
}