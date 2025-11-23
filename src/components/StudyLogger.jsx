import React, { useState, useEffect } from 'react';
import { PenTool, Clock, TrendingUp, BookOpen, Hash, Filter, FileText, Trophy, Activity, Star } from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { TOPICS } from '../utils/topics';

export default function StudyLogger({ currentUser }) {
    const [activeTab, setActiveTab] = useState('feed');
    const [logs, setLogs] = useState([]);
    
    // GİRİŞ TÜRÜ
    const [logType, setLogType] = useState("question"); // question, branch, general
    const [examType, setExamType] = useState("TYT");
    const [selectedSubject, setSelectedSubject] = useState("");
    const [selectedTopic, setSelectedTopic] = useState("");
    const [countValue, setCountValue] = useState(""); 
    const [duration, setDuration] = useState("");

    // Verileri Çek
    useEffect(() => {
        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'study_logs'), orderBy('timestamp', 'desc'));
        const unsub = onSnapshot(q, (snap) => { setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
        return () => unsub();
    }, []);

    // Ders Seçimini Güncelle
    useEffect(() => {
        const firstSubject = Object.keys(TOPICS[examType])[0];
        setSelectedSubject(firstSubject); setSelectedTopic("");
    }, [examType]);

    // --- PUAN HESAPLAMA MOTORU ---
    const calculatePoints = (type, count) => {
        const val = Number(count) || 0;
        switch (type) {
            case 'branch': return val * 1.5;  // Branş Denemesi
            case 'general': return val * 1.75; // Genel Deneme
            default: return val * 1;          // Soru Çözümü
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!countValue) return alert("Lütfen sayı/net giriniz.");
        if (logType === 'question' && !selectedTopic) return alert("Lütfen konu seçiniz.");

        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'study_logs'), {
            userId: currentUser.internalId, username: currentUser.username, avatar: currentUser.base64Avatar || currentUser.avatar,
            logType: logType,
            examType: examType,
            subject: logType === 'general' ? (examType + " Genel Deneme") : selectedSubject,
            topic: logType === 'question' ? selectedTopic : (logType === 'branch' ? 'Branş Denemesi' : 'Genel Prova'),
            countValue: Number(countValue),
            duration: Number(duration) || 0,
            timestamp: serverTimestamp()
        });
        alert("Aktivite ve Puanlar Kaydedildi! 🔥"); 
        setCountValue(""); setDuration("");
    };

    // --- LİDERLİK TABLOSU (PUAN BAZLI) ---
    const getDailyLeaders = () => {
        const today = new Date().toDateString();
        const dailyLogs = logs.filter(l => l.timestamp && new Date(l.timestamp.seconds * 1000).toDateString() === today);
        const stats = {};
        
        dailyLogs.forEach(log => {
            if (!stats[log.userId]) stats[log.userId] = { username: log.username, avatar: log.avatar, totalPoints: 0 };
            
            // ESKİ VERİ UYUMLULUĞU: countValue yoksa questionCount'a bak
            const val = Number(log.countValue || log.questionCount || 0);
            // ESKİ VERİ UYUMLULUĞU: logType yoksa 'question' say
            const type = log.logType || 'question';
            
            stats[log.userId].totalPoints += calculatePoints(type, val);
        });
        
        // Puana göre sırala
        return Object.values(stats).sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 5);
    };
    
    const dailyLeaders = getDailyLeaders();

    return (
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
            {/* SOL PANEL */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-gray-700 transition-colors">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Activity className="text-indigo-600 dark:text-indigo-400"/> Aktivite Ekle</h2>
                    
                    {/* TÜR SEÇİMİ */}
                    <div className="flex bg-slate-100 dark:bg-gray-700 p-1 rounded-xl mb-4">
                        <button onClick={() => setLogType('question')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${logType === 'question' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-gray-400'}`}>Soru (1x)</button>
                        <button onClick={() => setLogType('branch')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${logType === 'branch' ? 'bg-white dark:bg-gray-600 text-orange-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-gray-400'}`}>Branş (1.5x)</button>
                        <button onClick={() => setLogType('general')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${logType === 'general' ? 'bg-white dark:bg-gray-600 text-red-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-gray-400'}`}>Genel (1.75x)</button>
                    </div>

                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Alan</label>
                            <div className="flex bg-slate-100 dark:bg-gray-700 p-1 rounded-xl">
                                {['TYT', 'AYT'].map(type => <button key={type} type="button" onClick={() => setExamType(type)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${examType === type ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-gray-400'}`}>{type}</button>)}
                            </div>
                        </div>

                        {logType !== 'general' && (
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Ders</label>
                                <select className="w-full p-3 bg-slate-50 dark:bg-gray-700 dark:text-white rounded-xl border border-slate-200 dark:border-gray-600 outline-none" value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); setSelectedTopic(""); }}>{Object.keys(TOPICS[examType]).map(s => <option key={s} value={s}>{s}</option>)}</select>
                            </div>
                        )}

                        {logType === 'question' && (
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Konu</label>
                                <select className="w-full p-3 bg-slate-50 dark:bg-gray-700 dark:text-white rounded-xl border border-slate-200 dark:border-gray-600 outline-none" value={selectedTopic} onChange={e => setSelectedTopic(e.target.value)} disabled={!selectedSubject}><option value="">{selectedSubject ? "Konu Seçiniz..." : "Önce Ders Seçin"}</option>{(selectedSubject ? TOPICS[examType][selectedSubject] : []).map(t => <option key={t} value={t}>{t}</option>)}</select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">{logType === 'question' ? 'Soru Sayısı' : 'Net Sayısı'}</label>
                                <input type="number" className="w-full p-3 bg-slate-50 dark:bg-gray-700 dark:text-white rounded-xl border border-slate-200 dark:border-gray-600 outline-none" value={countValue} onChange={e => setCountValue(e.target.value)} placeholder="0"/>
                            </div>
                            <div><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Süre (Dk)</label><input type="number" className="w-full p-3 bg-slate-50 dark:bg-gray-700 dark:text-white rounded-xl border border-slate-200 dark:border-gray-600 outline-none" value={duration} onChange={e => setDuration(e.target.value)} placeholder="Opsiyonel"/></div>
                        </div>
                        <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all">Kaydet</button>
                    </form>
                </div>

                <div className="bg-gradient-to-b from-orange-500 to-red-500 p-6 rounded-3xl shadow-lg text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2 mb-4"><TrendingUp/> Bugünün Liderleri</h3>
                    <div className="space-y-3">
                        {dailyLeaders.length > 0 ? dailyLeaders.map((l, i) => (
                            <div key={i} className="flex items-center justify-between bg-white/10 p-2 rounded-xl backdrop-blur-sm">
                                <div className="flex items-center gap-3"><div className="font-bold text-xl w-6 text-center opacity-80">{i+1}</div><div className="text-sm font-bold truncate max-w-[100px]">{l.username}</div></div>
                                <div className="text-xs font-bold bg-white text-orange-600 px-2 py-1 rounded-lg flex items-center gap-1"><Star size={10} fill="currentColor"/> {l.totalPoints.toFixed(1)} Puan</div>
                            </div>
                        )) : <div className="text-sm opacity-80 text-center py-4">Veri Yok.</div>}
                    </div>
                </div>
            </div>

            {/* SAĞ PANEL: AKIŞ */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-slate-100 dark:border-gray-700 flex flex-col overflow-hidden transition-colors">
                <div className="p-4 border-b border-slate-100 dark:border-gray-700 flex gap-4">
                    <button onClick={() => setActiveTab('feed')} className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'feed' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600' : 'text-slate-400'}`}>Sınıf Akışı</button>
                    <button onClick={() => setActiveTab('history')} className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'history' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600' : 'text-slate-400'}`}>Geçmişim</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {logs.filter(l => activeTab === 'feed' ? true : l.userId === currentUser.internalId).map(log => {
                        // Geriye dönük uyumluluk: Eğer countValue yoksa questionCount kullan
                        const val = Number(log.countValue || log.questionCount || 0);
                        const type = log.logType || 'question';
                        const points = calculatePoints(type, val);

                        return (
                            <div key={log.id} className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-gray-700/50 border border-slate-100 dark:border-gray-600 hover:border-indigo-200 transition-colors">
                                <div className="flex-shrink-0"><div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xl border border-indigo-50 dark:border-indigo-800">{log.avatar?.startsWith('data:') ? <img src={log.avatar} className="w-full h-full object-cover rounded-full"/> : log.avatar}</div></div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start"><div><span className="font-bold text-slate-800 dark:text-white">{log.username}</span><span className="text-slate-500 dark:text-gray-400 text-sm"> bir aktivite tamamladı.</span></div><div className="text-[10px] text-slate-400 flex items-center gap-1"><Clock size={12}/> {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Az önce'}</div></div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {type === 'general' && <span className="bg-red-600 text-white px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1"><Trophy size={12}/> GENEL DENEME</span>}
                                        {type === 'branch' && <span className="bg-orange-500 text-white px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1"><FileText size={12}/> BRANŞ DENEME</span>}
                                        
                                        <span className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 px-3 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-gray-300 flex items-center gap-1"><BookOpen size={14} className="text-indigo-500"/> {log.subject}</span>
                                        
                                        {log.topic && log.topic !== 'Branş Denemesi' && log.topic !== 'Genel Prova' && (
                                            <span className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 px-3 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-gray-300 flex items-center gap-1"><Hash size={14} className="text-orange-500"/> {log.topic}</span>
                                        )}
                                        
                                        <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-lg text-xs font-bold">
                                            {type === 'question' ? `+${val} Soru` : `+${val} Net`}
                                        </span>
                                        
                                        <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                            <Star size={10}/> {points.toFixed(1)} Puan
                                        </span>

                                        {log.duration > 0 && <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-lg text-xs font-bold">{log.duration} Dk</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {logs.length === 0 && <div className="flex flex-col items-center justify-center h-64 text-slate-400"><Filter size={48} className="mb-2 opacity-20"/><p>Henüz aktivite yok.</p></div>}
                </div>
            </div>
        </div>
    );
}