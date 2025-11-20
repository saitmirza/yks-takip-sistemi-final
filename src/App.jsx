import React, { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { APP_ID, DEMO_INTERNAL_ID, ADMIN_USERNAME, ADMIN_PASSWORD, DEMO_USERNAME, DEMO_PASSWORD, DEMO_USER_DATA } from './utils/constants';
import { calculateOBP, getEstimatedRank } from './utils/helpers';

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
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [activeTab, setActiveTab] = useState("calendar");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null); // Profil Kartı için State
  
  const [usersList, setUsersList] = useState([]);
  const [allScores, setAllScores] = useState([]);
  const [myScores, setMyScores] = useState([]);
  const [rankings, setRankings] = useState({});
  const [authMode, setAuthMode] = useState("login");
  const [authInput, setAuthInput] = useState({});
  const [authError, setAuthError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    if (authInput.email === DEMO_USERNAME && authInput.password === DEMO_PASSWORD) {
        const s = { ...DEMO_USER_DATA, base64Avatar: "" }; 
        setCurrentUser(s); localStorage.setItem('examApp_session', JSON.stringify(s)); setActiveTab('my_exams'); return;
    }
    if (authInput.email === ADMIN_USERNAME && authInput.password === ADMIN_PASSWORD) {
      const s = { username: "Yönetici", email: ADMIN_USERNAME, internalId: "ADMIN_ID", isAdmin: true, avatar: "🛡️", realName: "Admin" };
      setCurrentUser(s); localStorage.setItem('examApp_session', JSON.stringify(s)); setActiveTab('dashboard'); return;
    }
    try {
      const emailKey = authInput.email.toLowerCase();
      const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', emailKey);
      const snap = await getDoc(userRef);
      if(snap.exists() && snap.data().password === authInput.password) {
        const s = { ...snap.data(), isAdmin: false, isDemo: false };
        setCurrentUser(s); localStorage.setItem('examApp_session', JSON.stringify(s)); setActiveTab('my_exams'); 
      } else { setAuthError("E-posta veya şifre hatalı."); }
    } catch (e) { console.error(e); setAuthError("Giriş hatası."); }
  };

  const handleLogout = () => { setCurrentUser(null); localStorage.removeItem('examApp_session'); setActiveTab("calendar"); setAuthInput({}); };
  const handleRegister = async (e) => { e.preventDefault(); alert("Kayıt işlemi kapalıdır."); };

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

  useEffect(() => {
      if (!currentUser || currentUser.isDemo || currentUser.isAdmin) return;
      const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email);
      updateDoc(userRef, { lastSeen: serverTimestamp() });
      const interval = setInterval(() => { updateDoc(userRef, { lastSeen: serverTimestamp() }); }, 120000);
      return () => clearInterval(interval);
  }, [currentUser]);

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

  useEffect(() => {
      if (!currentUser || allScores.length === 0) return;
      let mine = allScores.filter(s => s.internalUserId === currentUser.internalId);
      if (!currentUser.isAdmin && !currentUser.isDemo) {
          const { placementBonus } = calculateOBP(currentUser.s9Avg, currentUser.s10Avg, currentUser.s11Avg, currentUser.s12Avg);
          mine = mine.map(s => ({ ...s, placementScore: Number((s.finalScore + Number(placementBonus)).toFixed(2)) }));
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

  const getUserStats = (uid) => {
      const userScores = allScores.filter(s => s.internalUserId === uid);
      if (userScores.length === 0) return null;
      const examCount = userScores.length;
      const lastExamDate = new Date(userScores[0].timestamp?.seconds * 1000).toLocaleDateString('tr-TR');
      const bestScore = Math.max(...userScores.map(s => s.finalScore));
      return { examCount, lastExamDate, bestRank: `${bestScore} Puan` }; 
  };

  // Kullanıcı tıklandığında çalışacak fonksiyon
  const handleUserClick = (uid) => {
      const user = usersList.find(u => u.internalId === uid);
      if (user) setViewingUser(user);
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900 text-white font-sans">Sistem Yükleniyor...</div>;
  if (!currentUser) return <Auth authMode={authMode} setAuthMode={setAuthMode} authInput={authInput} setAuthInput={setAuthInput} authError={authError} setAuthError={setAuthError} handleLogin={handleLogin} handleRegister={handleRegister} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row transition-colors duration-300 font-sans">
      {viewingUser && <ProfileCard user={viewingUser} onClose={() => setViewingUser(null)} stats={getUserStats(viewingUser.internalId)} />}
      <Sidebar currentUser={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} handleLogout={handleLogout} />
      <div className="flex-1 p-4 md:p-8 h-screen overflow-y-auto relative scroll-smooth bg-[#f8fafc]">
        {activeTab === 'dashboard' && currentUser.isAdmin && <AdminExcelView usersList={usersList} appId={APP_ID} />}
        
        {/* --- BURADA DEĞİŞİKLİK YAPILDI: onUserClick EKLENDİ --- */}
        {activeTab === 'leaderboard' && (
            <Leaderboard 
                allScores={allScores} 
                usersList={usersList} 
                currentUser={currentUser} 
                onUserClick={handleUserClick} 
            />
        )}

        {activeTab === 'my_exams' && !currentUser.isAdmin && <MyExams myScores={myScores} currentUser={currentUser} rankings={rankings} />}
        
        {/* --- BURADA DEĞİŞİKLİK YAPILDI: onUserClick EKLENDİ --- */}
        {activeTab === 'chat' && (
            <Chat 
                currentUser={currentUser} 
                usersList={usersList} 
                onUserClick={handleUserClick} 
            />
        )}
        
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