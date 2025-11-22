import React, { useState, useEffect } from 'react';
import { PenTool, Clock, Save, TrendingUp, BookOpen, Hash, Filter } from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore'; 
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { TOPICS } from '../utils/topics';

export default function StudyLogger({ currentUser }) {
    const [activeTab, setActiveTab] = useState('feed');
    const [logs, setLogs] = useState([]);
    const [examType, setExamType] = useState("TYT");
    const [selectedSubject, setSelectedSubject] = useState("");
    const [selectedTopic, setSelectedTopic] = useState("");
    const [questionCount, setQuestionCount] = useState("");
    const [duration, setDuration] = useState("");

    useEffect(() => {
        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'study_logs'), orderBy('timestamp', 'desc'));
        const unsub = onSnapshot(q, (snap) => { setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
        return () => unsub();
    }, []);

    useEffect(() => {
        const firstSubject = Object.keys(TOPICS[examType])[0];
        setSelectedSubject(firstSubject); setSelectedTopic("");
    }, [examType]);

    // --- STREAK VE TOPLAM SORU KAYDI ---
    const handleSave = async (e) => {
        e.preventDefault();
        if (!selectedTopic || !questionCount) return alert("Lütfen konu ve soru sayısını gir.");

        const count = Number(questionCount);
        
        // 1. Logu Kaydet
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'study_logs'), {
            userId: currentUser.internalId, username: currentUser.username, avatar: currentUser.base64Avatar || currentUser.avatar,
            examType: examType, subject: selectedSubject, topic: selectedTopic, questionCount: count, duration: Number(duration) || 0, timestamp: serverTimestamp()
        });

        // 2. Kullanıcı İstatistiklerini ve Streak'i Güncelle
        if (!currentUser.isDemo) {
            const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email);
            
            const today = new Date().toDateString();
            const lastLogDate = currentUser.lastLogDate; 
            
            let newStreak = currentUser.streak || 0;

            // Eğer bugün daha önce girmemişse kontrol et
            if (lastLogDate !== today) {
                const yesterday = new Date(Date.now() - 86400000).toDateString();
                
                if (lastLogDate === yesterday) {
                    newStreak += 1; // Dün girmiş, zincir devam ediyor
                } else {
                    newStreak = 1; // Dün girmemiş, zincir koptu veya yeni başladı
                }
            }

            await updateDoc(userRef, {
                totalSolved: increment(count), // Toplam soruyu arttır
                streak: newStreak,
                lastLogDate: today
            });
        }

        alert("Çalışma günlüğe işlendi! 🔥");
        setQuestionCount(""); setDuration("");
    };

    const getDailyLeaders = () => {
        const today = new Date().toDateString();
        const dailyLogs = logs.filter(l => l.timestamp && new Date(l.timestamp.seconds * 1000).toDateString() === today);
        const stats = {};
        dailyLogs.forEach(log => {
            if (!stats[log.userId]) stats[log.userId] = { username: log.username, avatar: log.avatar, totalQ: 0 };
            stats[log.userId].totalQ += log.questionCount;
        });
        return Object.values(stats).sort((a, b) => b.totalQ - a.totalQ).slice(0, 5);
    };
    const dailyLeaders = getDailyLeaders();

    return (
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-gray-700 transition-colors">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><PenTool className="text-indigo-600 dark:text-indigo-400"/> Çalışma Ekle</h2>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Alan Seçimi</label>
                            <div className="flex bg-slate-100 dark:bg-gray-700 p-1 rounded-xl">
                                {['TYT', 'AYT'].map(type => <button key={type} type="button" onClick={() => setExamType(type)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${examType === type ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-gray-400'}`}>{type}</button>)}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Ders</label>
                            <select className="w-full p-3 bg-slate-50 dark:bg-gray-700 dark:text-white rounded-xl border border-slate-200 dark:border-gray-600 outline-none" value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); setSelectedTopic(""); }}>{Object.keys(TOPICS[examType]).map(s => <option key={s} value={s}>{s}</option>)}</select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Konu</label>
                            <select className="w-full p-3 bg-slate-50 dark:bg-gray-700 dark:text-white rounded-xl border border-slate-200 dark:border-gray-600 outline-none" value={selectedTopic} onChange={e => setSelectedTopic(e.target.value)} disabled={!selectedSubject}><option value="">{selectedSubject ? "Konu Seçiniz..." : "Önce Ders Seçin"}</option>{(selectedSubject ? TOPICS[examType][selectedSubject] : []).map(t => <option key={t} value={t}>{t}</option>)}</select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Soru</label><input type="number" className="w-full p-3 bg-slate-50 dark:bg-gray-700 dark:text-white rounded-xl border border-slate-200 dark:border-gray-600 outline-none" value={questionCount} onChange={e => setQuestionCount(e.target.value)} placeholder="0"/></div>
                            <div><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Süre (Dk)</label><input type="number" className="w-full p-3 bg-slate-50 dark:bg-gray-700 dark:text-white rounded-xl border border-slate-200 dark:border-gray-600 outline-none" value={duration} onChange={e => setDuration(e.target.value)} placeholder="Opsiyonel"/></div>
                        </div>
                        <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all">Kaydet ve Paylaş</button>
                    </form>
                </div>
                <div className="bg-gradient-to-b from-orange-500 to-red-500 p-6 rounded-3xl shadow-lg text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2 mb-4"><TrendingUp/> Bugünün Liderleri</h3>
                    <div className="space-y-3">{dailyLeaders.length > 0 ? dailyLeaders.map((l, i) => (<div key={i} className="flex items-center justify-between bg-white/10 p-2 rounded-xl backdrop-blur-sm"><div className="flex items-center gap-3"><div className="font-bold text-xl w-6 text-center opacity-80">{i+1}</div><div className="text-sm font-bold truncate max-w-[100px]">{l.username}</div></div><div className="text-xs font-bold bg-white text-orange-600 px-2 py-1 rounded-lg">{l.totalQ} Soru</div></div>)) : <div className="text-sm opacity-80 text-center py-4">Veri Yok.</div>}</div>
                </div>
            </div>

            <div className="flex-1 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-slate-100 dark:border-gray-700 flex flex-col overflow-hidden transition-colors">
                <div className="p-4 border-b border-slate-100 dark:border-gray-700 flex gap-4">
                    <button onClick={() => setActiveTab('feed')} className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'feed' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600' : 'text-slate-400'}`}>Sınıf Akışı</button>
                    <button onClick={() => setActiveTab('history')} className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'history' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600' : 'text-slate-400'}`}>Geçmişim</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {logs.filter(l => activeTab === 'feed' ? true : l.userId === currentUser.internalId).map(log => (
                        <div key={log.id} className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-gray-700/50 border border-slate-100 dark:border-gray-600 hover:border-indigo-200 transition-colors">
                            <div className="flex-shrink-0"><div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xl border border-indigo-50 dark:border-indigo-800">{log.avatar?.startsWith('data:') ? <img src={log.avatar} className="w-full h-full object-cover rounded-full"/> : log.avatar}</div></div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start"><div><span className="font-bold text-slate-800 dark:text-white">{log.username}</span><span className="text-slate-500 dark:text-gray-400 text-sm"> bir çalışma tamamladı.</span></div><div className="text-[10px] text-slate-400 flex items-center gap-1"><Clock size={12}/> {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Az önce'}</div></div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <span className="bg-slate-800 text-white px-2 py-1 rounded-md text-[10px] font-bold">{log.examType || "Genel"}</span>
                                    <span className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 px-3 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-gray-300 flex items-center gap-1"><BookOpen size={14} className="text-indigo-500"/> {log.subject}</span>
                                    <span className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 px-3 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-gray-300 flex items-center gap-1"><Hash size={14} className="text-orange-500"/> {log.topic}</span>
                                    <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-lg text-xs font-bold">+{log.questionCount} Soru</span>
                                    {log.duration > 0 && <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-lg text-xs font-bold">{log.duration} Dk</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                    {logs.length === 0 && <div className="flex flex-col items-center justify-center h-64 text-slate-400"><Filter size={48} className="mb-2 opacity-20"/><p>Henüz aktivite yok.</p></div>}
                </div>
            </div>
        </div>
    );
}