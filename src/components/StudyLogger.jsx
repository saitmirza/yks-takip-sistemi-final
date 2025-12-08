import React, { useState, useEffect } from 'react';
import { PenTool, Clock, Save, TrendingUp, BookOpen, Hash, Filter, Trophy, Activity, Star, FileText, School, Users, User } from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { TOPICS } from '../utils/topics';

// YARDIMCI: Haftanın ID'si
const getWeekId = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNo}`;
};

export default function StudyLogger({ currentUser }) {
    const [activeTab, setActiveTab] = useState('class_feed'); 
    const [logs, setLogs] = useState([]);
    const [logType, setLogType] = useState("question");
    const [examType, setExamType] = useState("TYT");
    const [selectedSubject, setSelectedSubject] = useState("");
    const [selectedTopic, setSelectedTopic] = useState("");
    const [countValue, setCountValue] = useState("");
    const [duration, setDuration] = useState("");

    // LOGLARI ÇEKME
    useEffect(() => {
        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'study_logs'), orderBy('timestamp', 'desc'));
        const unsub = onSnapshot(q, (snap) => { 
            setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
        });
        return () => unsub();
    }, []);

    // KONU LİSTESİNİ GÜNCELLEME
    useEffect(() => {
        const firstSubject = Object.keys(TOPICS[examType])[0];
        setSelectedSubject(firstSubject); 
        setSelectedTopic("");
    }, [examType]);

    // KAYDETME İŞLEMİ (STREAK DÜZELTİLDİ)
    const handleSave = async (e) => {
        e.preventDefault();
        if (!countValue) return alert("Soru sayısı veya değer giriniz.");
        if (logType === 'question' && !selectedTopic) return alert("Konu seçiniz.");

        try {
            // 1. LOGU KAYDET
            await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'study_logs'), {
                userId: currentUser.internalId, 
                username: currentUser.username, 
                avatar: currentUser.base64Avatar || currentUser.avatar,
                classSection: currentUser.classSection || "Belirsiz",
                weekId: getWeekId(),
                logType, 
                examType, 
                subject: logType === 'general' ? (examType + " Genel") : selectedSubject,
                topic: logType === 'question' ? selectedTopic : (logType === 'branch' ? 'Branş' : 'Genel'),
                countValue: Number(countValue), 
                duration: Number(duration) || 0, 
                timestamp: serverTimestamp()
            });

            // 2. KULLANICI PROFİLİNİ GÜNCELLE (STREAK HESAPLAMA)
            const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const userData = userSnap.data();
                
                // Tarihleri "YYYY-MM-DD" formatında al (Yerel Saat)
                const now = new Date();
                const todayStr = now.toLocaleDateString('en-CA'); // '2023-12-09' gibi formatlar

                const yesterdayDate = new Date(now);
                yesterdayDate.setDate(now.getDate() - 1);
                const yesterdayStr = yesterdayDate.toLocaleDateString('en-CA');

                const lastDate = userData.lastStudyDate || "";
                let newStreak = userData.streak || 0;

                // STREAK MANTIĞI:
                if (lastDate === todayStr) {
                    // Bugün zaten çalışmış, streak değişmez.
                    console.log("Bugün zaten log girilmiş.");
                } else if (lastDate === yesterdayStr) {
                    // Dün çalışmış, bugün de çalıştı -> Streak Artır
                    newStreak += 1;
                    console.log("Zincir devam ediyor! +1");
                } else {
                    // Dün çalışmamış (veya ilk defa) -> Streak 1'e sıfırla
                    newStreak = 1;
                    console.log("Zincir kırıldı veya yeni başladı. Streak: 1");
                }

                await updateDoc(userRef, {
                    streak: newStreak,
                    lastStudyDate: todayStr,
                    totalSolved: increment(Number(countValue) || 0),
                    totalStudyMinutes: increment(Number(duration) || 0)
                });
            }

            alert(`Kaydedildi! 🔥`); 
            setCountValue(""); 
            setDuration("");
        } catch (error) { 
            console.error(error); 
            alert("Hata oluştu."); 
        }
    };

    // ... (Diğer fonksiyonlar aynen kalacak) ...
    const calculatePoints = (type, count) => {
        const val = Number(count) || 0;
        if(type === 'branch') return val * 1.5;
        if(type === 'general') return val * 1.75;
        return val;
    };

    const getDailyLeaders = () => {
        const today = new Date().toDateString();
        const dailyLogs = logs.filter(l => l.timestamp && new Date(l.timestamp.seconds * 1000).toDateString() === today);
        const stats = {};
        dailyLogs.forEach(log => {
            if (!stats[log.userId]) stats[log.userId] = { username: log.username, avatar: log.avatar, totalPoints: 0 };
            stats[log.userId].totalPoints += calculatePoints(log.logType || 'question', log.countValue || log.questionCount);
        });
        return Object.values(stats).sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 5);
    };
    
    const dailyLeaders = getDailyLeaders();

    const getFilteredLogs = () => {
        if (activeTab === 'history') return logs.filter(l => l.userId === currentUser.internalId);
        if (activeTab === 'class_feed') return logs.filter(l => l.classSection === currentUser.classSection);
        return logs; 
    };

    const filteredLogs = getFilteredLogs();

    return (
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 h-auto lg:h-[calc(100vh-8rem)] pb-20">
            {/* ... (JSX yapısı AYNEN kalacak, önceki kodla aynı) ... */}
            {/* SOL PANEL (GİRİŞ & LİDERLER) */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-gray-700 transition-colors">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Activity className="text-indigo-600 dark:text-indigo-400"/> Aktivite Ekle
                    </h2>
                    <div className="flex bg-slate-100 dark:bg-gray-700 p-1 rounded-xl mb-4">
                        {[{id:'question', l:'Soru'}, {id:'branch', l:'Branş'}, {id:'general', l:'Genel'}].map(t => (
                            <button key={t.id} onClick={() => setLogType(t.id)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${logType === t.id ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-gray-400'}`}>{t.l}</button>
                        ))}
                    </div>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Alan</label>
                            <div className="flex bg-slate-100 dark:bg-gray-700 p-1 rounded-xl">
                                {['TYT', 'AYT'].map(type => (
                                    <button type="button" key={type} onClick={() => setExamType(type)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${examType === type ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-gray-400'}`}>{type}</button>
                                ))}
                            </div>
                        </div>
                        {logType !== 'general' && (
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Ders</label>
                                <select className="w-full p-3 bg-slate-50 dark:bg-gray-900 dark:text-white rounded-xl border border-slate-200 dark:border-gray-600 outline-none" value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); setSelectedTopic(""); }}>
                                    {Object.keys(TOPICS[examType]).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        )}
                        {logType === 'question' && (
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Konu</label>
                                <select className="w-full p-3 bg-slate-50 dark:bg-gray-900 dark:text-white rounded-xl border border-slate-200 dark:border-gray-600 outline-none" value={selectedTopic} onChange={e => setSelectedTopic(e.target.value)} disabled={!selectedSubject}>
                                    <option value="">Seçiniz...</option>
                                    {(selectedSubject ? TOPICS[examType][selectedSubject] : []).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">{logType === 'question' ? 'Soru' : 'Net'}</label>
                                <input type="number" className="w-full p-3 bg-slate-50 dark:bg-gray-900 dark:text-white rounded-xl border border-slate-200 dark:border-gray-600 outline-none" value={countValue} onChange={e => setCountValue(e.target.value)} placeholder="0"/>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Süre (Dk)</label>
                                <input type="number" className="w-full p-3 bg-slate-50 dark:bg-gray-900 dark:text-white rounded-xl border border-slate-200 dark:border-gray-600 outline-none" value={duration} onChange={e => setDuration(e.target.value)} placeholder="Ops."/>
                            </div>
                        </div>
                        <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-95">Kaydet</button>
                    </form>
                </div>
                
                {/* Liderler */}
                <div className="bg-gradient-to-b from-orange-500 to-red-500 p-6 rounded-3xl shadow-lg text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2 mb-4"><TrendingUp/> Bugünün Liderleri</h3>
                    <div className="space-y-3">
                        {dailyLeaders.length > 0 ? dailyLeaders.map((l, i) => (
                            <div key={i} className="flex items-center justify-between bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="font-bold text-xl w-6 text-center opacity-80">{i+1}</div>
                                    <div className="text-sm font-bold truncate max-w-[100px]">{l.username}</div>
                                </div>
                                <div className="text-xs font-bold bg-white text-orange-600 px-2 py-1 rounded-lg flex items-center gap-1">
                                    <Star size={10} fill="currentColor"/> {l.totalPoints.toFixed(1)} P.
                                </div>
                            </div>
                        )) : <div className="text-sm opacity-80 text-center py-4">Henüz veri yok.</div>}
                    </div>
                </div>
            </div>

            {/* SAĞ PANEL (AKIŞ) */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-slate-100 dark:border-gray-700 flex flex-col overflow-hidden transition-colors min-h-[500px]">
                <div className="p-2 border-b border-slate-100 dark:border-gray-700 flex gap-2 overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveTab('class_feed')} className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'class_feed' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-gray-700'}`}><Users size={16}/> Sınıf</button>
                    <button onClick={() => setActiveTab('school_feed')} className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'school_feed' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-gray-700'}`}><School size={16}/> Okul</button>
                    <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-gray-700'}`}><User size={16}/> Ben</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {filteredLogs.length > 0 ? filteredLogs.map(log => {
                        const val = Number(log.countValue || log.questionCount || 0);
                        const type = log.logType || 'question';
                        return (
                            <div key={log.id} className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-gray-700/30 border border-slate-100 dark:border-gray-600 hover:border-indigo-200 transition-colors">
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xl border border-indigo-50 dark:border-indigo-800">
                                        {log.avatar?.startsWith('data:') ? <img src={log.avatar} className="w-full h-full object-cover rounded-full"/> : log.avatar}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="font-bold text-slate-800 dark:text-white">{log.username}</span>
                                            {activeTab === 'school_feed' && <span className="ml-2 text-[10px] bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-bold">{log.classSection || "?"}</span>}
                                        </div>
                                        <div className="text-[10px] text-slate-400 flex items-center gap-1"><Clock size={12}/> {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Az önce'}</div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <span className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-600 px-3 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-gray-300 flex items-center gap-1"><BookOpen size={14} className="text-indigo-500"/> {log.subject}</span>
                                        {log.topic && <span className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-600 px-3 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-gray-300 flex items-center gap-1"><Hash size={14} className="text-orange-500"/> {log.topic}</span>}
                                        <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-3 py-1 rounded-lg text-xs font-bold">{type === 'question' ? `+${val} Soru` : `+${val} Net`}</span>
                                        {log.duration > 0 && <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-lg text-xs font-bold">{log.duration} Dk</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    }) : <div className="flex flex-col items-center justify-center h-64 text-slate-400"><Filter size={48} className="mb-2 opacity-20"/><p>Henüz aktivite yok.</p></div>}
                </div>
            </div>
        </div>
    );
}