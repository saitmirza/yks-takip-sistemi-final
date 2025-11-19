import React, { useState, useEffect, useRef } from 'react';
// Firebase modüllerini import ediyoruz
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, doc, getDoc, setDoc, onSnapshot, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
// İkonlar ve Grafikler
import { BarChart3, Trophy, User, LogOut, Edit2, Trash2, ShieldCheck, Search, CheckSquare, TrendingUp, ShieldAlert, Lock, LineChart as LineChartIcon, MessageCircle, Settings, Send, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// --- FIREBASE AYARLARI ---
// Not: Yerel ortamda kendi yapılandırmanız kullanılacaktır.
const firebaseConfig = {
  apiKey: "AIzaSyBshG7k-i-9opqZUoIFi81I4ZZ9N6Y9sTg",
  authDomain: "yks-takip-sistemi.firebaseapp.com",
  projectId: "yks-takip-sistemi",
  storageBucket: "yks-takip-sistemi.firebasestorage.app",
  messagingSenderId: "110539270734",
  appId: "1:110539270734:web:19ab6ae0b1d2c65d2c711f",
  measurementId: "G-8WK1JVLF8D"
};

// Uygulama Başlatma
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Kendi veritabanın olduğu için sabit bir proje ismi kullanıyoruz
const appId = 'yks-takip-sistemi-v1'; 

export default function ExamTrackerApp() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  
  // Kullanıcı Oturum Bilgileri
  const [currentUser, setCurrentUser] = useState(null); 
  const [usersList, setUsersList] = useState([]); 
  const [authMode, setAuthMode] = useState("login");
  const [authInput, setAuthInput] = useState({ username: "", password: "" });
  const [authError, setAuthError] = useState("");

  // Veriler
  const [allScores, setAllScores] = useState([]); 
  const [myScores, setMyScores] = useState([]);   
  
  // Admin Analiz
  const [adminSelectedStudentId, setAdminSelectedStudentId] = useState("");
  const [adminStudentScores, setAdminStudentScores] = useState([]);
  
  // Düzenleme
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Filtreleme
  const [selectedExamFilter, setSelectedExamFilter] = useState("all"); 
  const [statsMetric, setStatsMetric] = useState("finalScore");

  // --- SOHBET STATE ---
  const [chatMode, setChatMode] = useState("public"); 
  const [selectedChatPartner, setSelectedChatPartner] = useState(null); 
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef(null);

  // --- PROFIL STATE ---
  const [profileForm, setProfileForm] = useState({ username: "", password: "", avatar: "🎓" });
  const avatarOptions = ["🎓", "📚", "✏️", "🧠", "🚀", "🦁", "🦉", "🦄", "⚽", "🎵", "🎨", "💻"];

  // --- FORM YAPISI ---
  const [formData, setFormData] = useState({
    studentId: "", 
    examName: "",
    includeTYT: true,
    includeAYT: true,
    tyt: { math: "", turkish: "", science: "", social: "", score: "" },
    ayt: { math: "", science: "", score: "" }
  });

  // Canlı Puan Hesaplama
  const calculatedPreviewScore = () => {
    const tytS = Number(formData.tyt.score) || 0;
    const aytS = Number(formData.ayt.score) || 0;
    if (formData.includeTYT && formData.includeAYT) return (tytS * 0.4) + (aytS * 0.6);
    else if (formData.includeTYT) return tytS;
    else if (formData.includeAYT) return aytS;
    return 0;
  };

  const theme = currentUser?.isAdmin 
    ? { sidebar: "bg-gradient-to-b from-zinc-900 to-black", accent: "text-white", btnPrimary: "bg-zinc-800 hover:bg-zinc-700 text-white", bgMain: "bg-zinc-100", textHeader: "text-zinc-900", cardBorder: "border-zinc-300" }
    : { sidebar: "bg-slate-900", accent: "text-yellow-400", btnPrimary: "bg-indigo-600 hover:bg-indigo-700 text-white", bgMain: "bg-slate-50", textHeader: "text-slate-800", cardBorder: "border-slate-200" };

  // 1. Auth ve Init
  useEffect(() => {
    const initAuth = async () => {
      try {
         // Veritabanına erişim için anonim giriş yapıyoruz
         await signInAnonymously(auth);
      } catch (err) { console.error("Auth error:", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setLoading(false);
      // Tarayıcıda kayıtlı oturum var mı kontrol et
      const savedSession = localStorage.getItem('examApp_session');
      if (savedSession) {
        const parsedUser = JSON.parse(savedSession);
        setCurrentUser(parsedUser);
        setProfileForm({ 
            username: parsedUser.username, 
            password: parsedUser.password || "", 
            avatar: parsedUser.avatar || "🎓" 
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Veri Çekme
  useEffect(() => {
    if (!firebaseUser) return;
    
    const qAll = collection(db, 'artifacts', appId, 'public', 'data', 'exam_scores_v3'); 
    const unsubAll = onSnapshot(qAll, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setAllScores(data);
    });
    
    const qUsers = collection(db, 'artifacts', appId, 'public', 'data', 'user_accounts');
    const unsubUsers = onSnapshot(qUsers, (snap) => setUsersList(snap.docs.map(d => d.data())));
    
    return () => { unsubAll(); unsubUsers(); };
  }, [firebaseUser]);

  // 3. Sohbet
  useEffect(() => {
    if (!firebaseUser || activeTab !== 'chat') return;
    const qChat = collection(db, 'artifacts', appId, 'public', 'data', 'chat_messages');
    const unsubChat = onSnapshot(qChat, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      let filteredMsgs = [];
      if (chatMode === 'public') {
        filteredMsgs = msgs.filter(m => m.type === 'public');
      } else if (chatMode === 'private' && selectedChatPartner && currentUser) {
        filteredMsgs = msgs.filter(m => 
            m.type === 'private' && 
            m.participants.includes(currentUser.internalId) && 
            m.participants.includes(selectedChatPartner.internalId)
        );
      }
      filteredMsgs.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
      setChatMessages(filteredMsgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsubChat();
  }, [firebaseUser, activeTab, chatMode, selectedChatPartner, currentUser]);


  // Veri İşleme
  useEffect(() => {
    if (currentUser && !currentUser.isAdmin && allScores.length > 0) {
      const mine = allScores
        .filter(s => s.internalUserId === currentUser.internalId)
        .sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
      
      const formattedMine = mine.map((item, index) => ({
        ...item,
        displayLabel: item.examName || `Deneme ${index + 1}`,
        tytScore: item.includeTYT ? item.tyt?.score : null,
        aytScore: item.includeAYT ? item.ayt?.score : null,
        finalScore: item.finalScore,
        tytMath: item.includeTYT ? item.tyt?.math : null,
        tytTurkish: item.includeTYT ? item.tyt?.turkish : null,
        tytScience: item.includeTYT ? item.tyt?.science : null,
        tytSocial: item.includeTYT ? item.tyt?.social : null,
        aytMath: item.includeAYT ? item.ayt?.math : null,
        aytScience: item.includeAYT ? item.ayt?.science : null
      }));
      setMyScores(formattedMine);
    } else { setMyScores([]); }
  }, [allScores, currentUser]);

  useEffect(() => {
    if (currentUser?.isAdmin && adminSelectedStudentId && allScores.length > 0) {
      const studentScores = allScores
        .filter(s => s.internalUserId === adminSelectedStudentId)
        .sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
      
      const formattedScores = studentScores.map((item) => ({
        ...item,
        displayLabel: item.examName,
        finalScore: item.finalScore,
        tytScore: item.includeTYT ? item.tyt?.score : null,
        aytScore: item.includeAYT ? item.ayt?.score : null,
        tytMath: item.includeTYT ? item.tyt?.math : null,
        tytTurkish: item.includeTYT ? item.tyt?.turkish : null,
        tytScience: item.includeTYT ? item.tyt?.science : null,
        tytSocial: item.includeTYT ? item.tyt?.social : null,
        aytMath: item.includeAYT ? item.ayt?.math : null,
        aytScience: item.includeAYT ? item.ayt?.science : null
      }));
      setAdminStudentScores(formattedScores);
    } else { setAdminStudentScores([]); }
  }, [adminSelectedStudentId, allScores]);

  const uniqueExamNames = [...new Set(allScores.map(s => s.examName).filter(n => n))].sort();

  const getLeaderboardData = () => {
    if (selectedExamFilter === "all") {
      const studentStats = {};
      allScores.forEach(score => {
        if (!studentStats[score.internalUserId]) {
          studentStats[score.internalUserId] = {
            userName: score.userName,
            internalUserId: score.internalUserId,
            totalFinalScore: 0,
            examCount: 0
          };
        }
        studentStats[score.internalUserId].totalFinalScore += score.finalScore;
        studentStats[score.internalUserId].examCount += 1;
      });
      const rankings = Object.values(studentStats).map(student => ({
        id: student.internalUserId,
        internalUserId: student.internalUserId,
        userName: student.userName,
        examName: "Genel Ortalama",
        finalScore: parseFloat((student.totalFinalScore / student.examCount).toFixed(2)),
        detail: `${student.examCount} Sınav`
      }));
      return rankings.sort((a, b) => b.finalScore - a.finalScore);
    }
    let filtered = allScores.filter(s => s.examName === selectedExamFilter);
    return filtered.sort((a, b) => b.finalScore - a.finalScore);
  };

  // --- AUTH ---
  const handleLogin = async (e) => {
    e.preventDefault();
    if (authInput.username === "esemcey" && authInput.password === "103.5") {
      const s = { username: "Yönetici (Admin)", internalId: "ADMIN_ID", isAdmin: true, avatar: "🛡️" };
      setCurrentUser(s); localStorage.setItem('examApp_session', JSON.stringify(s)); return;
    }
    try {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'user_accounts', authInput.username);
      const snap = await getDoc(userRef);
      if(snap.exists() && snap.data().password === authInput.password) {
        const s = { ...snap.data(), isAdmin: false };
        if(!s.avatar) s.avatar = "🎓";
        setCurrentUser(s); 
        setProfileForm({ username: s.username, password: s.password, avatar: s.avatar });
        localStorage.setItem('examApp_session', JSON.stringify(s));
      } else { setAuthError("Hatalı bilgi."); }
    } catch (e) { setAuthError("Hata oluştu."); }
  };

  const handleRegister = async (e) => {
      e.preventDefault(); 
      if (authInput.username === "esemcey") { setAuthError("Bu kullanıcı adı rezerve edilmiştir."); return; }
      if (!authInput.username || !authInput.password) { setAuthError("Lütfen tüm alanları doldurun."); return; }
      setAuthError(""); 
      try {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'user_accounts', authInput.username);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) { setAuthError("Bu kullanıcı adı zaten alınmış."); return; }
      const internalId = crypto.randomUUID();
      const newData = { username: authInput.username, password: authInput.password, internalId, avatar: "🎓", createdAt: serverTimestamp() };
      await setDoc(userRef, newData);
      const sessionData = {...newData, isAdmin: false};
      setCurrentUser(sessionData); 
      setProfileForm({ username: sessionData.username, password: sessionData.password, avatar: sessionData.avatar });
      localStorage.setItem('examApp_session', JSON.stringify(sessionData));
      setAuthInput({ username: "", password: "" });
    } catch (error) { setAuthError("Kayıt hatası."); }
  };

  const handleLogout = () => {
    setCurrentUser(null); localStorage.removeItem('examApp_session'); setActiveTab("dashboard");
    setFormData({ studentId: "", examName: "", includeTYT: true, includeAYT: true, tyt: { math: "", turkish: "", science: "", social: "", score: "" }, ayt: { math: "", science: "", score: "" } });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!currentUser || currentUser.isAdmin) return; 
    try {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'user_accounts', currentUser.username);
      await updateDoc(userRef, { password: profileForm.password, avatar: profileForm.avatar });
      const updatedUser = { ...currentUser, password: profileForm.password, avatar: profileForm.avatar };
      setCurrentUser(updatedUser);
      localStorage.setItem('examApp_session', JSON.stringify(updatedUser));
      alert("Profil başarıyla güncellendi!");
    } catch (error) { console.error(error); alert("Güncelleme sırasında hata oluştu."); }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentUser) return;
    const msgData = {
      text: chatInput,
      senderId: currentUser.internalId,
      senderName: currentUser.username,
      senderAvatar: currentUser.avatar || "👤",
      timestamp: serverTimestamp(),
      type: chatMode 
    };
    if (chatMode === 'private' && selectedChatPartner) {
      msgData.receiverId = selectedChatPartner.internalId;
      msgData.participants = [currentUser.internalId, selectedChatPartner.internalId];
    }
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'chat_messages'), msgData);
      setChatInput("");
    } catch (error) { console.error("Mesaj hatası:", error); }
  };

  const handleSaveScore = async (e) => {
    e.preventDefault();
    if (!currentUser?.isAdmin) return;
    if (!formData.studentId) { alert("Öğrenci seçiniz."); return; }
    const student = usersList.find(u => u.internalId === formData.studentId);
    const finalCalculatedScore = calculatedPreviewScore();
    const scoreData = {
      internalUserId: student.internalId,
      userName: student.username,
      examName: formData.examName.trim() || `Deneme ${allScores.length + 1}`,
      includeTYT: formData.includeTYT,
      includeAYT: formData.includeAYT,
      tyt: { math: Number(formData.tyt.math), turkish: Number(formData.tyt.turkish), science: Number(formData.tyt.science), social: Number(formData.tyt.social), score: Number(formData.tyt.score) },
      ayt: { math: Number(formData.ayt.math), science: Number(formData.ayt.science), score: Number(formData.ayt.score) },
      finalScore: Number(finalCalculatedScore.toFixed(2)),
      timestamp: serverTimestamp()
    };
    try {
      if (isEditing && editingId) {
        const { timestamp, ...updateData } = scoreData; 
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exam_scores_v3', editingId), updateData);
        alert("Güncellendi."); setIsEditing(false); setEditingId(null);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'exam_scores_v3'), scoreData);
        alert("Kaydedildi.");
      }
      setFormData(prev => ({ ...prev, examName: "", tyt: { math: "", turkish: "", science: "", social: "", score: "" }, ayt: { math: "", science: "", score: "" } }));
    } catch (error) { console.error(error); alert("Hata."); }
  };

  const startEditing = (s) => {
    setActiveTab("dashboard"); setIsEditing(true); setEditingId(s.id);
    setFormData({ studentId: s.internalUserId, examName: s.examName, includeTYT: s.includeTYT, includeAYT: s.includeAYT, tyt: s.tyt || { math: "", turkish: "", science: "", social: "", score: "" }, ayt: s.ayt || { math: "", science: "", score: "" } });
  };
  const deleteScore = async (id) => { if(confirm("Silinsin mi?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exam_scores_v3', id)); };
  const getMetricConfig = (metric) => {
    switch(metric) {
      case 'tytMath': return { color: '#3b82f6', label: 'TYT Matematik' };
      case 'tytTurkish': return { color: '#ef4444', label: 'TYT Türkçe' };
      case 'tytScience': return { color: '#22c55e', label: 'TYT Fen' };
      case 'tytSocial': return { color: '#f59e0b', label: 'TYT Sosyal' };
      case 'aytMath': return { color: '#8b5cf6', label: 'AYT Matematik' };
      case 'aytScience': return { color: '#06b6d4', label: 'AYT Fen' };
      case 'tytScore': return { color: '#10b981', label: 'TYT Puan' };
      case 'aytScore': return { color: '#6366f1', label: 'AYT Puan' };
      default: return { color: '#111827', label: 'Yerleştirme Puanı' };
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900 text-white">Yükleniyor...</div>;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border-t-4 border-indigo-500 relative overflow-hidden">
           <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-100 rounded-full opacity-50 blur-xl"></div>
           <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-100 rounded-full opacity-50 blur-xl"></div>
           <div className="text-center mb-8 relative z-10">
             <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
               <Lock className="text-indigo-600" size={32} />
             </div>
             <h1 className="text-3xl font-bold text-slate-800">Sisteme Giriş</h1>
             <p className="text-slate-500 mt-2 text-sm">Öğrenci veya Yönetici hesabınızla devam edin.</p>
           </div>
           <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-5 relative z-10">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1 ml-1">Kullanıcı Adı</label>
               <input type="text" placeholder="Örn: ahmet123" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={authInput.username} onChange={e => setAuthInput({...authInput, username: e.target.value})} />
             </div>
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1 ml-1">Şifre</label>
               <input type="password" placeholder="••••••" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={authInput.password} onChange={e => setAuthInput({...authInput, password: e.target.value})} />
             </div>
             {authError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2"><ShieldAlert size={16} /> {authError}</div>}
             <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5">{authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</button>
           </form>
           <div className="mt-6 text-center relative z-10">
             <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(""); }} className="text-indigo-600 text-sm font-medium hover:text-indigo-800 transition-colors">{authMode === 'login' ? 'Hesabın yok mu? Kayıt Ol' : 'Zaten hesabın var mı? Giriş Yap'}</button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bgMain} flex flex-col md:flex-row transition-colors duration-300`}>
      <div className={`md:w-64 ${theme.sidebar} text-white flex flex-col flex-shrink-0`}>
        <div className="p-6 border-b border-white/10">
          <h1 className={`text-xl font-bold flex items-center gap-2 ${theme.accent}`}>{currentUser.isAdmin ? <ShieldCheck /> : <Trophy />} YKS Ligi</h1>
          <p className="text-xs opacity-50 mt-1 flex items-center gap-1">
             <span>{currentUser.avatar || "👤"}</span>
             <span>{currentUser.isAdmin ? 'ADMIN PANEL' : currentUser.username}</span>
          </p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
           <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded ${activeTab === 'dashboard' ? 'bg-white/10' : 'hover:bg-white/5'}`}><User size={18}/> <span>{currentUser.isAdmin ? 'Veri Girişi' : 'Profilim'}</span></button>
           <button onClick={() => setActiveTab('leaderboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded ${activeTab === 'leaderboard' ? 'bg-white/10' : 'hover:bg-white/5'}`}><BarChart3 size={18}/> <span>Sıralama</span></button>
           {!currentUser.isAdmin && <button onClick={() => setActiveTab('chat')} className={`w-full flex items-center gap-3 px-4 py-3 rounded ${activeTab === 'chat' ? 'bg-white/10' : 'hover:bg-white/5'}`}><MessageCircle size={18}/> <span>Sohbet</span></button>}
           {!currentUser.isAdmin && <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded ${activeTab === 'profile' ? 'bg-white/10' : 'hover:bg-white/5'}`}><Settings size={18}/> <span>Profil Ayarları</span></button>}
           {currentUser.isAdmin && <button onClick={() => setActiveTab('admin_analysis')} className={`w-full flex items-center gap-3 px-4 py-3 rounded ${activeTab === 'admin_analysis' ? 'bg-white/10' : 'hover:bg-white/5'}`}><Search size={18}/> <span>Öğrenci Analizi</span></button>}
           {!currentUser.isAdmin && <button onClick={() => setActiveTab('stats')} className={`w-full flex items-center gap-3 px-4 py-3 rounded ${activeTab === 'stats' ? 'bg-white/10' : 'hover:bg-white/5'}`}><LineChartIcon size={18}/> <span>İstatistikler</span></button>}
        </nav>
        <div className="p-4"><button onClick={handleLogout} className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm"><LogOut size={16}/> Çıkış</button></div>
      </div>

      <div className="flex-1 p-4 md:p-8 overflow-y-auto h-screen relative">
        
        {activeTab === 'profile' && !currentUser.isAdmin && (
           <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Settings className="text-slate-400"/> Profil Düzenle</h2>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Avatar Seçimi</label>
                    <div className="flex flex-wrap gap-3">
                       {avatarOptions.map((emoji) => (
                          <button 
                             key={emoji} 
                             type="button" 
                             onClick={() => setProfileForm({...profileForm, avatar: emoji})}
                             className={`w-12 h-12 text-2xl flex items-center justify-center rounded-full border-2 transition-all ${profileForm.avatar === emoji ? 'border-indigo-500 bg-indigo-50 scale-110' : 'border-slate-200 hover:border-indigo-200'}`}
                          >
                             {emoji}
                          </button>
                       ))}
                    </div>
                 </div>
                 <div className="grid grid-cols-1 gap-4">
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Kullanıcı Adı (Değiştirilemez)</label>
                       <input type="text" disabled value={profileForm.username} className="w-full p-3 bg-slate-100 border border-slate-200 rounded text-slate-500 cursor-not-allowed" />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Yeni Şifre</label>
                       <input type="text" value={profileForm.password} onChange={e => setProfileForm({...profileForm, password: e.target.value})} className="w-full p-3 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Yeni şifreniz..." />
                    </div>
                 </div>
                 <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-colors">Değişiklikleri Kaydet</button>
              </form>
           </div>
        )}

        {activeTab === 'chat' && !currentUser.isAdmin && (
           <div className="max-w-6xl mx-auto h-[calc(100vh-4rem)] bg-white rounded-2xl shadow-xl border border-slate-200 flex overflow-hidden">
              <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
                 <div className="p-4 border-b border-slate-200 font-bold text-slate-700">Sohbet Odaları</div>
                 <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    <button 
                       onClick={() => { setChatMode('public'); setSelectedChatPartner(null); }}
                       className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${chatMode === 'public' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-600'}`}
                    >
                       <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white"><Users size={20}/></div>
                       <div className="font-bold text-sm">Sınıf Grubu</div>
                    </button>
                    
                    <div className="pt-4 pb-2 px-2 text-xs font-bold text-slate-400 uppercase">Öğrenciler</div>
                    {usersList.filter(u => u.internalId !== currentUser.internalId && !u.isAdmin).map(user => (
                       <button 
                          key={user.internalId}
                          onClick={() => { setChatMode('private'); setSelectedChatPartner(user); }}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedChatPartner?.internalId === user.internalId ? 'bg-white shadow border border-indigo-100' : 'hover:bg-slate-100'}`}
                       >
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-lg">{user.avatar || "👤"}</div>
                          <div className="text-sm font-medium text-slate-700 truncate">{user.username}</div>
                       </button>
                    ))}
                 </div>
              </div>
              
              <div className="flex-1 flex flex-col bg-white">
                 <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-white">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl">
                       {chatMode === 'public' ? '🏫' : (selectedChatPartner?.avatar || '👤')}
                    </div>
                    <div>
                       <h3 className="font-bold text-slate-800">
                          {chatMode === 'public' ? "Sınıf Grubu (Herkese Açık)" : selectedChatPartner?.username}
                       </h3>
                       <p className="text-xs text-slate-400">
                          {chatMode === 'public' ? `${usersList.length} üye` : "Özel Mesaj"}
                       </p>
                    </div>
                 </div>

                 <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {chatMessages.map((msg) => {
                       const isMe = msg.senderId === currentUser.internalId;
                       return (
                          <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                             <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                                {msg.senderAvatar}
                             </div>
                             <div className={`max-w-[70%] p-3 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'}`}>
                                {!isMe && <div className="text-xs font-bold opacity-70 mb-1">{msg.senderName}</div>}
                                {msg.text}
                                <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                   {msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                                </div>
                             </div>
                          </div>
                       );
                    })}
                    <div ref={messagesEndRef} />
                 </div>

                 <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-3">
                    <input 
                       type="text" 
                       value={chatInput}
                       onChange={(e) => setChatInput(e.target.value)}
                       className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                       placeholder={chatMode === 'public' ? "Sınıfa bir şeyler yaz..." : `@${selectedChatPartner?.username} kişisine mesaj gönder...`}
                    />
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl transition-colors shadow-lg">
                       <Send size={20} />
                    </button>
                 </form>
              </div>
           </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="max-w-4xl mx-auto">
            {currentUser.isAdmin ? (
              <div className={`bg-white rounded-2xl shadow-lg border ${theme.cardBorder} p-6`}>
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800"><Edit2 size={20}/> {isEditing ? 'Deneme Düzenle' : 'Yeni Deneme Girişi'}</h2>
                <form onSubmit={handleSaveScore} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Öğrenci</label>
                      <select value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})} className="w-full p-2 border rounded bg-gray-50" disabled={isEditing}>
                        <option value="">Seçiniz...</option>
                        {usersList.map(u => <option key={u.internalId} value={u.internalId}>{u.username}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Deneme Adı</label>
                      <input type="text" value={formData.examName} onChange={e => setFormData({...formData, examName: e.target.value})} className="w-full p-2 border rounded" placeholder="Örn: Limit Türkiye Geneli 1" />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className={`border rounded-xl p-4 ${formData.includeTYT ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-100 border-gray-200 opacity-60'}`}>
                      <div className="flex items-center justify-between mb-4 border-b pb-2 border-indigo-100">
                        <h3 className="font-bold text-indigo-900">TYT Bölümü</h3>
                        <button type="button" onClick={() => setFormData(p => ({...p, includeTYT: !p.includeTYT}))} className="flex items-center gap-1 text-xs font-bold bg-white px-2 py-1 rounded border shadow-sm">
                          {formData.includeTYT ? <CheckSquare className="text-green-600" size={16}/> : <div className="w-4 h-4 border rounded bg-gray-200"></div>} Dahil Et
                        </button>
                      </div>
                      {formData.includeTYT && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <input type="number" placeholder="Mat Net" className="p-2 rounded border text-sm" value={formData.tyt.math} onChange={e => setFormData({...formData, tyt: {...formData.tyt, math: e.target.value}})} />
                            <input type="number" placeholder="Türkçe Net" className="p-2 rounded border text-sm" value={formData.tyt.turkish} onChange={e => setFormData({...formData, tyt: {...formData.tyt, turkish: e.target.value}})} />
                            <input type="number" placeholder="Fen Net" className="p-2 rounded border text-sm" value={formData.tyt.science} onChange={e => setFormData({...formData, tyt: {...formData.tyt, science: e.target.value}})} />
                            <input type="number" placeholder="Sosyal Net" className="p-2 rounded border text-sm" value={formData.tyt.social} onChange={e => setFormData({...formData, tyt: {...formData.tyt, social: e.target.value}})} />
                          </div>
                          <div>
                             <label className="text-xs font-bold text-indigo-800">TYT Ham Puan</label>
                             <input type="number" className="w-full p-2 mt-1 font-bold text-indigo-700 border-2 border-indigo-200 rounded focus:outline-none focus:border-indigo-500" value={formData.tyt.score} onChange={e => setFormData({...formData, tyt: {...formData.tyt, score: e.target.value}})} />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={`border rounded-xl p-4 ${formData.includeAYT ? 'bg-purple-50 border-purple-200' : 'bg-gray-100 border-gray-200 opacity-60'}`}>
                      <div className="flex items-center justify-between mb-4 border-b pb-2 border-purple-100">
                        <h3 className="font-bold text-purple-900">AYT Bölümü</h3>
                        <button type="button" onClick={() => setFormData(p => ({...p, includeAYT: !p.includeAYT}))} className="flex items-center gap-1 text-xs font-bold bg-white px-2 py-1 rounded border shadow-sm">
                          {formData.includeAYT ? <CheckSquare className="text-green-600" size={16}/> : <div className="w-4 h-4 border rounded bg-gray-200"></div>} Dahil Et
                        </button>
                      </div>
                      {formData.includeAYT && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 gap-3">
                            <div><label className="text-xs text-purple-700 font-medium">Matematik Net (Max 40)</label><input type="number" max="40" className="w-full p-2 rounded border text-sm" value={formData.ayt.math} onChange={e => setFormData({...formData, ayt: {...formData.ayt, math: e.target.value}})} /></div>
                            <div><label className="text-xs text-purple-700 font-medium">Fen Bilimleri Net (Max 40)</label><input type="number" max="40" className="w-full p-2 rounded border text-sm" value={formData.ayt.science} onChange={e => setFormData({...formData, ayt: {...formData.ayt, science: e.target.value}})} /></div>
                          </div>
                          <div className="mt-2"><label className="text-xs font-bold text-purple-800">AYT Ham Puan</label><input type="number" className="w-full p-2 mt-1 font-bold text-purple-700 border-2 border-purple-200 rounded focus:outline-none focus:border-purple-500" value={formData.ayt.score} onChange={e => setFormData({...formData, ayt: {...formData.ayt, score: e.target.value}})} /></div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-800 text-white p-4 rounded-xl flex justify-between items-center">
                     <div className="text-sm opacity-80">{formData.includeTYT && formData.includeAYT ? "Formül: (%40 TYT) + (%60 AYT)" : formData.includeTYT ? "Formül: Sadece TYT Puanı" : formData.includeAYT ? "Formül: Sadece AYT Puanı" : "Hesaplanamaz"}</div>
                     <div className="text-2xl font-bold">{calculatedPreviewScore().toFixed(2)}</div>
                  </div>
                  <button className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all ${theme.btnPrimary}`}>{isEditing ? 'Güncelle' : 'Kaydet'}</button>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-200">
                 <ShieldAlert size={48} className="mx-auto text-indigo-600 mb-4"/>
                 <h2 className="text-2xl font-bold text-gray-800">Öğrenci Profili</h2>
                 <p className="text-gray-500 mt-2">Sınav verileriniz yönetici tarafından girilmektedir. Sıralama ve istatistik sekmelerini kullanarak gelişiminizi takip edebilirsiniz.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-bold text-gray-800">Sıralama</h2>
               <select value={selectedExamFilter} onChange={e => setSelectedExamFilter(e.target.value)} className="p-2 border rounded bg-white">
                  <option value="all">Genel Başarı (Ortalama)</option>
                  <option disabled>--- Denemeler ---</option>
                  {uniqueExamNames.map(n => <option key={n} value={n}>{n}</option>)}
               </select>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left">
                 <thead className="bg-gray-100 text-gray-500 text-xs font-bold uppercase">
                    <tr>
                      <th className="p-4">#</th>
                      <th className="p-4">Öğrenci</th>
                      <th className="p-4">Deneme / Detay</th>
                      {selectedExamFilter !== "all" && <th className="p-4 text-right">TYT Puan</th>}
                      {selectedExamFilter !== "all" && <th className="p-4 text-right">AYT Puan</th>}
                      <th className="p-4 text-right text-indigo-600">Sonuç Puanı</th>
                      {currentUser.isAdmin && selectedExamFilter !== "all" && <th className="p-4 text-right">İşlem</th>}
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {getLeaderboardData().map((s, i) => (
                     <tr key={i} className="hover:bg-gray-50">
                        <td className="p-4 font-medium text-gray-500">{i+1}</td>
                        <td className="p-4 font-bold text-gray-700 flex items-center gap-2">
                            <span>{usersList.find(u => u.internalId === s.internalUserId)?.avatar || "👤"}</span>
                            {s.userName} {s.internalUserId === currentUser.internalId && "(Sen)"}
                        </td>
                        <td className="p-4 text-sm text-gray-500">{s.detail ? s.detail : s.examName}</td>
                        {selectedExamFilter !== "all" && <td className="p-4 text-right text-gray-500">{s.includeTYT ? s.tytScore : '-'}</td>}
                        {selectedExamFilter !== "all" && <td className="p-4 text-right text-gray-500">{s.includeAYT ? s.aytScore : '-'}</td>}
                        <td className="p-4 text-right font-bold text-indigo-600 text-lg">{s.finalScore}</td>
                        {currentUser.isAdmin && selectedExamFilter !== "all" && (
                          <td className="p-4 text-right flex justify-end gap-2">
                             <button onClick={() => startEditing(s)} className="p-2 bg-blue-50 text-blue-600 rounded"><Edit2 size={14}/></button>
                             <button onClick={() => deleteScore(s.id)} className="p-2 bg-red-50 text-red-600 rounded"><Trash2 size={14}/></button>
                          </td>
                        )}
                     </tr>
                   ))}
                 </tbody>
              </table>
              {getLeaderboardData().length === 0 && <div className="p-8 text-center text-gray-400">Kayıt yok.</div>}
            </div>
          </div>
        )}

        {activeTab === 'admin_analysis' && currentUser.isAdmin && (
           <div className="max-w-5xl mx-auto">
             <div className="bg-white p-6 rounded-2xl shadow-sm border mb-6">
                <h2 className="font-bold mb-4">Öğrenci Seçimi</h2>
                <select className="w-full p-3 bg-gray-50 border rounded" onChange={e => setAdminSelectedStudentId(e.target.value)}>
                   <option value="">Seçiniz...</option>
                   {usersList.map(u => <option key={u.internalId} value={u.internalId}>{u.username}</option>)}
                </select>
             </div>
             {adminStudentScores.length > 0 && (
               <div className="bg-white p-6 rounded-2xl shadow-sm border h-[500px]">
                  <div className="flex justify-between mb-6">
                     <h3 className="font-bold text-gray-700">Gelişim Grafiği</h3>
                     <select value={statsMetric} onChange={e => setStatsMetric(e.target.value)} className="p-2 border rounded">
                        <option value="finalScore">Yerleştirme Puanı</option>
                        <option value="tytScore">TYT Puan</option>
                        <option value="aytScore">AYT Puan</option>
                        <optgroup label="TYT Netleri">
                          <option value="tytMath">TYT Matematik</option>
                          <option value="tytTurkish">TYT Türkçe</option>
                          <option value="tytScience">TYT Fen</option>
                          <option value="tytSocial">TYT Sosyal</option>
                        </optgroup>
                        <optgroup label="AYT Netleri">
                          <option value="aytMath">AYT Matematik</option>
                          <option value="aytScience">AYT Fen</option>
                        </optgroup>
                     </select>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={adminStudentScores}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                       <XAxis dataKey="displayLabel" hide/>
                       <YAxis domain={['auto', 'auto']}/>
                       <Tooltip/>
                       <Legend/>
                       <Line type="monotone" dataKey={statsMetric} name={getMetricConfig(statsMetric).label} stroke={getMetricConfig(statsMetric).color} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
               </div>
             )}
           </div>
        )}

        {activeTab === 'stats' && !currentUser.isAdmin && (
           <div className="max-w-5xl mx-auto bg-white p-6 rounded-2xl shadow-sm border h-[500px]">
              <div className="flex justify-between mb-6">
                 <h2 className="font-bold text-xl text-gray-800">Gelişim Analizi</h2>
                 <select value={statsMetric} onChange={e => setStatsMetric(e.target.value)} className="p-2 border rounded">
                    <option value="finalScore">Yerleştirme Puanı</option>
                    <option value="tytScore">TYT Puan</option>
                    <option value="aytScore">AYT Puan</option>
                    <optgroup label="TYT Netleri">
                        <option value="tytMath">TYT Matematik</option>
                        <option value="tytTurkish">TYT Türkçe</option>
                        <option value="tytScience">TYT Fen</option>
                        <option value="tytSocial">TYT Sosyal</option>
                    </optgroup>
                    <optgroup label="AYT Netleri">
                        <option value="aytMath">AYT Matematik</option>
                        <option value="aytScience">AYT Fen</option>
                    </optgroup>
                 </select>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={myScores}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                    <XAxis dataKey="displayLabel" tick={{fontSize: 10}}/>
                    <YAxis domain={['auto', 'auto']}/>
                    <Tooltip/>
                    <Line type="monotone" dataKey={statsMetric} name={getMetricConfig(statsMetric).label} stroke={getMetricConfig(statsMetric).color} strokeWidth={3} activeDot={{r:8}}/>
                 </LineChart>
              </ResponsiveContainer>
           </div>
        )}

      </div>
    </div>
  );
}