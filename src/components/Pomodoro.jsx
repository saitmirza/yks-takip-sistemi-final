import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain, Zap, Settings, Save, X, CheckCircle } from 'lucide-react';
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { TOPICS } from '../utils/topics';

export default function Pomodoro({ currentUser }) {
    const [customTimes, setCustomTimes] = useState(() => { const saved = localStorage.getItem('pomodoro_settings'); return saved ? JSON.parse(saved) : { focus: 25, short: 5, long: 15 }; });
    const [showSettings, setShowSettings] = useState(false);
    const [showLogModal, setShowLogModal] = useState(false);
    const [examType, setExamType] = useState("TYT");
    const [logData, setLogData] = useState({ subject: '', topic: '', count: '' });
    const [timeLeft, setTimeLeft] = useState(customTimes.focus * 60);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState('focus'); 
    const [todayTotal, setTodayTotal] = useState(0); 

    useEffect(() => { const firstSubject = Object.keys(TOPICS[examType])[0]; setLogData(p => ({ ...p, subject: firstSubject, topic: '' })); }, [examType]);
    const currentSubjects = Object.keys(TOPICS[examType]);
    const currentTopics = logData.subject ? TOPICS[examType][logData.subject] : [];

    // ... (Sayaç mantığı aynı) ...
    // KISALTMADIM, TAM KOD:
    useEffect(() => {
        const savedEndTime = localStorage.getItem('pomodoro_endTime');
        const savedMode = localStorage.getItem('pomodoro_mode');
        const savedTotal = localStorage.getItem('pomodoro_todayTotal');
        if (savedTotal) setTodayTotal(parseInt(savedTotal));
        if (savedEndTime && savedMode) {
            const now = Date.now();
            const end = parseInt(savedEndTime);
            if (end > now) { setMode(savedMode); setIsActive(true); setTimeLeft(Math.ceil((end - now) / 1000)); } 
            else { setIsActive(false); setMode(savedMode); setTimeLeft(0); localStorage.removeItem('pomodoro_endTime'); if (savedMode === 'focus') setShowLogModal(true); }
        }
    }, []);

    useEffect(() => {
        let interval = null;
        if (isActive && timeLeft > 0) { interval = setInterval(() => { const savedEndTime = localStorage.getItem('pomodoro_endTime'); if (savedEndTime) { const diff = Math.ceil((parseInt(savedEndTime) - Date.now()) / 1000); if (diff <= 0) handleComplete(); else setTimeLeft(diff); } else { setTimeLeft(prev => prev - 1); } }, 1000); } else if (timeLeft === 0 && isActive) { handleComplete(); }
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const toggleTimer = () => { if (!isActive) { const endTime = Date.now() + (timeLeft * 1000); localStorage.setItem('pomodoro_endTime', endTime.toString()); localStorage.setItem('pomodoro_mode', mode); setIsActive(true); } else { localStorage.removeItem('pomodoro_endTime'); setIsActive(false); } };
    const resetTimer = () => { localStorage.removeItem('pomodoro_endTime'); setIsActive(false); setTimeLeft(customTimes[mode] * 60); };
    const handleComplete = () => { localStorage.removeItem('pomodoro_endTime'); setIsActive(false); setTimeLeft(0); try { new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play(); } catch(e) {} if (mode === 'focus') { const minutes = customTimes.focus; const newTotal = todayTotal + minutes; setTodayTotal(newTotal); localStorage.setItem('pomodoro_todayTotal', newTotal.toString()); if (!currentUser.isDemo) { try { updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email), { totalStudyMinutes: increment(minutes) }); } catch (err) {} } setShowLogModal(true); } else { alert("Mola bitti!"); } };
    const saveLog = async () => { if(!logData.topic) return alert("Konu seçmelisin."); await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'study_logs'), { userId: currentUser.internalId, username: currentUser.username, avatar: currentUser.base64Avatar || currentUser.avatar, examType: examType, subject: logData.subject, topic: logData.topic, questionCount: Number(logData.count) || 0, duration: customTimes.focus, timestamp: serverTimestamp() }); setShowLogModal(false); setLogData({ subject: 'Matematik', topic: '', count: '' }); alert("Kaydedildi! 🔥"); };
    const switchMode = (newMode) => { localStorage.removeItem('pomodoro_endTime'); setMode(newMode); setIsActive(false); setTimeLeft(customTimes[newMode] * 60); localStorage.setItem('pomodoro_mode', newMode); };
    const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
    const saveSettings = (e) => { e.preventDefault(); localStorage.setItem('pomodoro_settings', JSON.stringify(customTimes)); setShowSettings(false); if (!isActive) setTimeLeft(customTimes[mode] * 60); };

    return (
        <div className="max-w-md mx-auto mt-6 relative">
            {/* LOG MODALI */}
            {showLogModal && (
                <div className="absolute inset-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl flex flex-col items-center justify-center p-6 animate-in zoom-in-95 border border-slate-200 dark:border-gray-700">
                    <div className="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 w-10 h-10 rounded-full flex items-center justify-center mb-2"><CheckCircle size={20}/></div>
                    <h3 className="font-bold text-slate-800 dark:text-white mb-3">Tebrikler! Ne çalıştın?</h3>
                    <div className="w-full space-y-3">
                        <div className="flex bg-slate-100 dark:bg-gray-800 p-1 rounded-lg">{['TYT', 'AYT'].map(type => <button key={type} onClick={() => setExamType(type)} className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${examType === type ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-gray-400'}`}>{type}</button>)}</div>
                        <select className="w-full p-2 bg-slate-50 dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-sm outline-none dark:text-white" value={logData.subject} onChange={e => setLogData({...logData, subject: e.target.value})}>{currentSubjects.map(s => <option key={s} value={s}>{s}</option>)}</select>
                        <select className="w-full p-2 bg-slate-50 dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-sm outline-none dark:text-white" value={logData.topic} onChange={e => setLogData({...logData, topic: e.target.value})}><option value="">Konu Seç...</option>{currentTopics.map(t => <option key={t} value={t}>{t}</option>)}</select>
                        <input type="number" placeholder="Soru Sayısı (Opsiyonel)" className="w-full p-2 bg-slate-50 dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-sm outline-none dark:text-white" value={logData.count} onChange={e => setLogData({...logData, count: e.target.value})}/>
                        <div className="flex gap-2 pt-2"><button onClick={() => setShowLogModal(false)} className="flex-1 py-2 text-slate-400 dark:text-gray-500 font-bold hover:bg-slate-50 dark:hover:bg-gray-800 rounded-xl text-sm">Atla</button><button onClick={saveLog} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm">Kaydet</button></div>
                    </div>
                </div>
            )}

            {/* AYARLAR MODALI */}
            {showSettings && (
                <div className="absolute inset-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-3xl flex items-center justify-center animate-in fade-in border border-slate-200 dark:border-gray-700">
                    <form onSubmit={saveSettings} className="p-6 w-full text-slate-700 dark:text-white">
                        <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg flex items-center gap-2"><Settings size={20}/> Ayarlar</h3><button type="button" onClick={() => setShowSettings(false)}><X size={24}/></button></div>
                        <div className="space-y-3">
                            <div><label className="text-xs font-bold uppercase text-slate-400">Odak</label><input type="number" min="1" max="120" value={customTimes.focus} onChange={e => setCustomTimes({...customTimes, focus: Number(e.target.value)})} className="w-full border dark:border-gray-600 dark:bg-gray-800 rounded-xl p-2 text-center"/></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-bold uppercase text-slate-400">Kısa</label><input type="number" min="1" max="30" value={customTimes.short} onChange={e => setCustomTimes({...customTimes, short: Number(e.target.value)})} className="w-full border dark:border-gray-600 dark:bg-gray-800 rounded-xl p-2 text-center"/></div>
                                <div><label className="text-xs font-bold uppercase text-slate-400">Uzun</label><input type="number" min="1" max="60" value={customTimes.long} onChange={e => setCustomTimes({...customTimes, long: Number(e.target.value)})} className="w-full border dark:border-gray-600 dark:bg-gray-800 rounded-xl p-2 text-center"/></div>
                            </div>
                        </div>
                        <button className="w-full mt-6 bg-slate-800 dark:bg-gray-700 text-white font-bold py-3 rounded-xl shadow-lg">Kaydet</button>
                    </form>
                </div>
            )}

            {/* ANA KART (AYNI KALDI, Renkler Dinamik) */}
            <div className={`relative rounded-3xl shadow-2xl p-8 text-white transition-all duration-500 overflow-hidden ${mode === 'focus' ? 'bg-indigo-600' : mode === 'short' ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div className="flex justify-between items-center mb-8 relative z-10">
                    <div className="flex gap-1 bg-black/20 p-1 rounded-full">{['focus', 'short', 'long'].map(m => <button key={m} onClick={() => switchMode(m)} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${mode === m ? 'bg-white text-black shadow' : 'text-white/70'}`}>{m}</button>)}</div>
                    <button onClick={() => setShowSettings(true)} className="p-2 rounded-full bg-white/20 hover:bg-white/30"><Settings size={18}/></button>
                </div>
                <div className="text-center mb-8 relative z-10"><div className="text-8xl font-bold tracking-tighter font-mono">{formatTime(timeLeft)}</div><div className="text-white/80 font-medium mt-2 flex justify-center items-center gap-2 animate-pulse">{isActive ? 'Çalışılıyor...' : 'Hazır mısın?'}</div></div>
                <div className="flex justify-center gap-4 relative z-10"><button onClick={toggleTimer} className="bg-white text-slate-800 w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all">{isActive ? <Pause size={36} fill="currentColor"/> : <Play size={36} fill="currentColor" className="ml-1"/>}</button><button onClick={resetTimer} className="bg-white/20 hover:bg-white/30 text-white w-20 h-20 rounded-2xl flex items-center justify-center backdrop-blur-sm transition-all"><RotateCcw size={28}/></button></div>
            </div>
            
            {/* İstatistik Kartı */}
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-gray-700 flex items-center justify-between transition-colors">
                <div className="flex items-center gap-3"><div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center"><Zap size={20}/></div><div><div className="text-xs text-slate-400 font-bold uppercase">Bugün</div><div className="font-bold text-slate-700 dark:text-white text-lg">{Math.floor(todayTotal / 60)}sa {todayTotal % 60}dk</div></div></div>
                <div className="text-right"><div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{Math.floor(todayTotal / customTimes.focus)}</div><div className="text-[9px] text-slate-400 font-bold uppercase">Seans</div></div>
            </div>
        </div>
    );
}