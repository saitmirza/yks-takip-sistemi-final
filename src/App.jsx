

import React, { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
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

  const addToast = (message, type = 'success') => { setToast({ message, type }); };

  // --- GİRİŞ YAPMA (LOGIN) ---
  const handleLogin = async (e) => {
    e.preventDefault(); setAuthError("");
    const inputVal = authInput.email?.trim(); 
    if (!inputVal || !authInput.password) { setAuthError("Lütfen bilgileri girin."); return; }
    
    // 1. DEMO GİRİŞİ
    if ((inputVal === DEMO_USERNAME || inputVal === DEMO_USER_DATA.email) && authInput.password === DEMO_PASSWORD) {
        const s = { ...DEMO_USER_DATA, base64Avatar: "" }; setCurrentUser(s); localStorage.setItem('examApp_session', JSON.stringify(s)); setActiveTab('my_exams'); addToast("Demo giriş başarılı!", "info"); return;
    }
    
    // 2. ADMİN GİRİŞİ
    if ((inputVal === ADMIN_USERNAME || inputVal === "admin@yks.com") && authInput.password === ADMIN_PASSWORD) {
      const s = { username: "Yönetici", email: ADMIN_USERNAME, internalId: "ADMIN_ID", isAdmin: true, avatar: "🛡️", realName: "Admin", classSection: "Yönetim" }; setCurrentUser(s); localStorage.setItem('examApp_session', JSON.stringify(s)); setActiveTab('dashboard'); addToast("Admin girişi yapıldı.", "success"); return;
    }
    
    // 3. NORMAL KULLANICI GİRİŞİ
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
            const s = { ...userData, isAdmin: false, isDemo: false }; 
            setCurrentUser(s); 
            localStorage.setItem('examApp_session', JSON.stringify(s)); 
            setActiveTab('my_exams'); 
            addToast(`Hoş geldin ${s.username}!`);
          } else { setAuthError("Hatalı şifre."); addToast("Giriş başarısız.", "error"); }
      } else { setAuthError("Kullanıcı bulunamadı."); }
    } catch (e) { console.error(e); setAuthError("Giriş hatası."); }
  };

  // --- KAYIT OLMA (REGISTER) - AKTİF ---
  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError("");

    // 1. Boş Alan Kontrolü
    if (!authInput.email || !authInput.password || !authInput.username || !authInput.realName) {
        setAuthError("Lütfen tüm zorunlu alanları doldurun.");
        return;
    }

    // 2. Şifre Eşleşmesi
    if (authInput.password !== authInput.passwordConfirm) {
        setAuthError("Şifreler eşleşmiyor.");
        return;
    }

    try {
        setLoading(true);

        // 3. E-posta Kontrolü
        const emailKey = authInput.email.toLowerCase().trim();
        const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', emailKey);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            setAuthError("Bu e-posta adresi zaten kullanımda.");
            setLoading(false);
            return;
        }

        // 4. Kullanıcı Adı Kontrolü
        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts'), where("username", "==", authInput.username));
        const usernameSnap = await getDocs(q);

        if (!usernameSnap.empty) {
            setAuthError("Bu kullanıcı adı başkası tarafından alınmış.");
            setLoading(false);
            return;
        }

        // 5. Yeni Kullanıcı Verisini Hazırla
        const internalId = "U_" + Date.now() + Math.random().toString(36).substr(2, 9);
        
        const newUser = {
            username: authInput.username,
            realName: authInput.realName,
            email: emailKey,
            password: authInput.password, 
            classSection: authInput.classSection || "Mezun",
            internalId: internalId,
            isAdmin: false,
            isDemo: false,
            createdAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
            avatar: "🎓", 
            base64Avatar: "",
            themeColor: "indigo",
            s9Avg: Number(authInput.s9Avg) || 0,
            s10Avg: Number(authInput.s10Avg) || 0,
            s11Avg: Number(authInput.s11Avg) || 0,
            s12Avg: Number(authInput.s12Avg) || 0,
            streak: 0,
            totalSolved: 0,
            totalStudyMinutes: 0
        };

        // 6. Veritabanına Kaydet
        await setDoc(userRef, newUser);

        // 7. Otomatik Giriş Yap
        setCurrentUser(newUser);
        localStorage.setItem('examApp_session', JSON.stringify(newUser));
        setActiveTab('my_exams');
        addToast(`Aramıza hoş geldin, ${newUser.realName}! 🎉`);

    } catch (error) {
        console.error("Kayıt Hatası:", error);
        setAuthError("Kayıt sırasında bir hata oluştu: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  const handleLogout = () => { setCurrentUser(null); localStorage.removeItem('examApp_session'); setActiveTab("calendar"); setAuthInput({}); addToast("Çıkış yapıldı.", "info"); };

  // --- EFFECTLER ---
  useEffect(() => { const initAuth = async () => { try { await signInAnonymously(auth); } catch (err) {} }; initAuth(); onAuthStateChanged(auth, (user) => { setFirebaseUser(user); setLoading(false); const savedSession = localStorage.getItem('examApp_session'); if (savedSession) setCurrentUser(JSON.parse(savedSession)); }); }, []);
  
  // Last Seen Güncelleyici
  useEffect(() => { if (!currentUser || currentUser.isDemo || currentUser.isAdmin) return; const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email); updateDoc(userRef, { lastSeen: serverTimestamp() }); const interval = setInterval(() => { updateDoc(userRef, { lastSeen: serverTimestamp() }); }, 120000); return () => clearInterval(interval); }, [currentUser]);
  
  // Veri Dinleyicileri
  useEffect(() => { if (!firebaseUser) return; const unsubScores = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'exam_scores_v3'), (snap) => { let data = snap.docs.map(d => ({ id: d.id, ...d.data() })); data = data.filter(s => s.internalUserId !== DEMO_INTERNAL_ID); data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)); setAllScores(data); }); const unsubUsers = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts'), (snap) => { setUsersList(snap.docs.map(d => d.data()).filter(u => u.internalId !== DEMO_INTERNAL_ID)); }); const qQuery = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'questions'), orderBy('timestamp', 'desc')); const unsubQuestions = onSnapshot(qQuery, (snap) => { setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() }))); }); return () => { unsubScores(); unsubUsers(); unsubQuestions(); }; }, [firebaseUser]);
  
  // Sıralama Hesaplama
  useEffect(() => { if (!currentUser || allScores.length === 0) return; let mine = allScores.filter(s => s.internalUserId === currentUser.internalId); if (!currentUser.isAdmin && !currentUser.isDemo) { const { placementBonus } = calculateOBP(currentUser.s9Avg, currentUser.s10Avg, currentUser.s11Avg, currentUser.s12Avg); mine = mine.map(s => ({ ...s, placementScore: Number((s.finalScore + Number(placementBonus)).toFixed(2)) })); } setMyScores(mine); const fetchRanks = async () => { const newRanks = {}; for (const s of mine) { const rank = await getEstimatedRank(s.placementScore); newRanks[s.id] = rank; } setRankings(newRanks); }; fetchRanks(); }, [allScores, currentUser]);
  
  const getUserStats = (uid) => { const userScores = allScores.filter(s => s.internalUserId === uid); if (userScores.length === 0) return null; const examCount = userScores.length; const lastExamDate = new Date(userScores[0].timestamp?.seconds * 1000).toLocaleDateString('tr-TR'); const bestScore = Math.max(...userScores.map(s => s.finalScore)); return { examCount, lastExamDate, bestRank: `${bestScore} Puan` }; };
  const getUserScores = (uid) => allScores.filter(s => s.internalUserId === uid);
  const handleUserClick = (uid) => { const user = usersList.find(u => u.internalId === uid); if (user) setViewingUser(user); };

  const theme = COLOR_THEMES[currentUser?.themeColor] || COLOR_THEMES['indigo'];

  const DynamicStyles = () => (
    <style>{`
        :root { --primary: ${theme.primary}; --primary-light: ${theme.light}; --primary-dark: ${theme.dark}; }
        .bg-indigo-600, .hover\\:bg-indigo-700:hover { background-color: var(--primary) !important; }
        .text-indigo-600 { color: var(--primary) !important; }
        .text-indigo-700 { color: var(--primary-dark) !important; }
        .bg-indigo-50 { background-color: var(--primary-light) !important; }
        .border-indigo-600 { border-color: var(--primary) !important; }
        .ring-indigo-500 { --tw-ring-color: var(--primary) !important; }
        body { background: ${theme.gradient} !important; background-attachment: fixed; color: #e2e8f0 !important; }
        .text-indigo-600 { color: #818cf8 !important; } 
    `}</style>
  );

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900 text-white font-sans"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  if (!currentUser) return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: theme.gradient }}>
          <DynamicStyles />
          <Auth authMode={authMode} setAuthMode={setAuthMode} authInput={authInput} setAuthInput={setAuthInput} authError={authError} setAuthError={setAuthError} handleLogin={handleLogin} handleRegister={handleRegister} />
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans overflow-hidden dark" style={{ background: theme.gradient }}>
      <DynamicStyles />
      <NotificationManager currentUser={currentUser} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {viewingUser && <ProfileCard user={viewingUser} onClose={() => setViewingUser(null)} stats={getUserStats(viewingUser.internalId)} userScores={getUserScores(viewingUser.internalId)} questions={questions} />}
      <ClassSelectionModal currentUser={currentUser} setCurrentUser={setCurrentUser} />
      <Sidebar currentUser={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} handleLogout={handleLogout} />

      <div className="flex-1 p-4 md:p-8 pt-20 pb-32 md:pt-8 md:pb-8 md:ml-64 min-h-screen relative scroll-smooth">
        <div key={activeTab} className="page-enter max-w-7xl mx-auto">
            {activeTab === 'dashboard' && currentUser.isAdmin && <AdminDashboard usersList={usersList} allScores={allScores} appId={APP_ID} />}
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
            {activeTab === 'videos' && !currentUser.isAdmin && <VideoLessons />}
            {activeTab === 'studylog' && !currentUser.isAdmin && <StudyLogger currentUser={currentUser} />}
            {activeTab === 'scheduler' && !currentUser.isAdmin && <StudyScheduler currentUser={currentUser} />}
            {activeTab === 'subjects' && !currentUser.isAdmin && <SubjectTracker currentUser={currentUser} />}
            {activeTab === 'feedback' && !currentUser.isAdmin && <FeedbackPanel currentUser={currentUser} />}
            {activeTab === 'exam_request' && !currentUser.isAdmin && <StudentExamRequest currentUser={currentUser} allScores={allScores} />}
            {activeTab === 'forum' && <Forum currentUser={currentUser} />}
            {activeTab === 'dreams' && !currentUser.isAdmin && <DreamSchool currentUser={currentUser} myScores={myScores} />}
            {activeTab === 'coach' && !currentUser.isAdmin && <SmartCoach currentUser={currentUser} myScores={myScores} />}
        </div>
      </div>
    </div>
  );
}
