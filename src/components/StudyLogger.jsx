import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, BookOpen, Hash, Filter, Star, Users, School, User, Clock } from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { TOPICS } from '../utils/topics';

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

    // Inputlar için kesin stil (Global stillerden etkilenmez)
    const inputStyle = {
        backgroundColor: '#1e293b', // Slate-800
        color: '#ffffff',
        border: '1px solid #334155',
        outline: 'none'
    };

    useEffect(() => {
        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'study_logs'), orderBy('timestamp', 'desc'));
        const unsub = onSnapshot(q, (snap) => { 
            setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        const firstSubject = Object.keys(TOPICS[examType])[0];
        setSelectedSubject(firstSubject); 
        setSelectedTopic("");
    }, [examType]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!countValue) return alert("Soru sayısı veya değer giriniz.");
        if (logType === 'question' && !selectedTopic) return alert("Konu seçiniz.");

        try {
            await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'study_logs'), {
                userId: currentUser.internalId, username: currentUser.username, avatar: currentUser.base64Avatar || currentUser.avatar,
                classSection: currentUser.classSection || "Belirsiz", weekId: getWeekId(),
                logType, examType, subject: logType === 'general' ? (examType + " Genel") : selectedSubject,
                topic: logType === 'question' ? selectedTopic : (logType === 'branch' ? 'Branş' : 'Genel'),
                countValue: Number(countValue), duration: Number(duration) || 0, 
                timestamp: serverTimestamp()
            });

            const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const today = new Date().toISOString().split('T')[0];
                await updateDoc(userRef, {
                    lastStudyDate: today,
                    totalSolved: increment(Number(countValue) || 0),
                    totalStudyMinutes: increment(Number(duration) || 0)
                });
            }
            alert(`Kaydedildi! 🔥`); setCountValue(""); setDuration("");
        } catch (error) { console.error(error); alert("Hata oluştu."); }
    };

    const calculatePoints = (type, count) => { return Number(count) || 0; };

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
            
            {/* SOL PANEL */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
                <div className="glass-box p-6 rounded-3xl shadow-sm transition-colors">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Activity className="text-indigo-400"/> Aktivite Ekle
                    </h2>
                    
                    {/* LOG TİPİ SEÇİMİ (BUTON FIX) */}
                    <div className="flex bg-black/30 p-1 rounded-xl mb-4 border border-white/5">
                        {[{id:'question', l:'Soru'}, {id:'branch', l:'Branş'}, {id:'general', l:'Genel'}].map(t => (
                            <button 
                                key={t.id} 
                                onClick={() => setLogType(t.id)} 
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${logType === t.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                            >
                                {t.l}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Alan</label>
                            {/* ALAN SEÇİMİ (BUTON FIX) */}
                            <div className="flex bg-black/30 p-1 rounded-xl border border-white/5">
                                {['TYT', 'AYT'].map(type => (
                                    <button 
                                        type="button" 
                                        key={type} 
                                        onClick={() => setExamType(type)} 
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${examType === type ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {logType !== 'general' && (
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Ders</label>
                                <select className="w-full p-3 rounded-xl" style={inputStyle} value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); setSelectedTopic(""); }}>
                                    {Object.keys(TOPICS[examType]).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        )}
                        {logType === 'question' && (
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Konu</label>
                                <select className="w-full p-3 rounded-xl" style={inputStyle} value={selectedTopic} onChange={e => setSelectedTopic(e.target.value)} disabled={!selectedSubject}>
                                    <option value="">Seçiniz...</option>
                                    {(selectedSubject ? TOPICS[examType][selectedSubject] : []).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">{logType === 'question' ? 'Soru' : 'Net'}</label>
                                <input type="number" className="w-full p-3 rounded-xl" style={inputStyle} value={countValue} onChange={e => setCountValue(e.target.value)} placeholder="0" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Süre (Dk)</label>
                                <input type="number" className="w-full p-3 rounded-xl" style={inputStyle} value={duration} onChange={e => setDuration(e.target.value)} placeholder="Ops." />
                            </div>
                        </div>
                        <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-95">Kaydet</button>
                    </form>
                </div>
                
                {/* Liderler */}
                <div className="bg-gradient-to-b from-orange-600 to-red-600 p-6 rounded-3xl shadow-lg text-white border border-orange-500/30">
                    <h3 className="font-bold text-lg flex items-center gap-2 mb-4"><TrendingUp/> Bugünün Liderleri</h3>
                    <div className="space-y-3">
                        {dailyLeaders.length > 0 ? dailyLeaders.map((l, i) => (
                            <div key={i} className="flex items-center justify-between bg-black/20 p-2 rounded-xl backdrop-blur-sm border border-white/10">
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
            
            {/* SAĞ PANEL: AKIŞ */}
            <div className="flex-1 glass-box rounded-3xl shadow-sm flex flex-col overflow-hidden transition-colors min-h-[500px]">
                <div className="p-2 border-b border-white/10 flex gap-2 overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveTab('class_feed')} className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'class_feed' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:bg-white/5'}`}><Users size={16}/> Sınıf</button>
                    <button onClick={() => setActiveTab('school_feed')} className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'school_feed' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:bg-white/5'}`}><School size={16}/> Okul</button>
                    <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:bg-white/5'}`}><User size={16}/> Ben</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {filteredLogs.length > 0 ? filteredLogs.map(log => {
                        const val = Number(log.countValue || log.questionCount || 0);
                        const type = log.logType || 'question';
                        return (
                            <div key={log.id} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-colors">
                                <div className="flex-shrink-0"><div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-xl border border-indigo-500/30">{log.avatar?.startsWith('data:') ? <img src={log.avatar} className="w-full h-full object-cover rounded-full"/> : log.avatar}</div></div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start"><div><span className="font-bold text-white">{log.username}</span>{activeTab === 'school_feed' && <span className="ml-2 text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-300 font-bold">{log.classSection || "?"}</span>}</div><div className="text-[10px] text-slate-400 flex items-center gap-1"><Clock size={12}/> {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Az önce'}</div></div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-lg text-xs font-bold text-slate-300 flex items-center gap-1"><BookOpen size={14} className="text-indigo-400"/> {log.subject}</span>
                                        {log.topic && <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-lg text-xs font-bold text-slate-300 flex items-center gap-1"><Hash size={14} className="text-orange-400"/> {log.topic}</span>}
                                        <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-lg text-xs font-bold">{type === 'question' ? `+${val} Soru` : `+${val} Net`}</span>
                                        {log.duration > 0 && <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg text-xs font-bold">{log.duration} Dk</span>}
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