import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Settings, CheckCircle, Timer, Watch, Music, X, Link as LinkIcon, HelpCircle } from 'lucide-react';
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { TOPICS } from '../utils/topics';

// --- YARDIMCI BİLEŞENLER ---
const CustomInput = ({ label, value, onChange, type = "text", placeholder, min, max }) => (
    <div>
        {label && <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">{label}</label>}
        <input 
            type={type} 
            value={value} 
            onChange={onChange}
            placeholder={placeholder}
            min={min} max={max}
            className="w-full p-3 rounded-xl text-white outline-none focus:border-indigo-500 transition-colors text-center font-bold"
            style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} // Input Fix
        />
    </div>
);

const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
        <div className="glass-box rounded-3xl w-full max-w-md p-6 shadow-2xl border border-white/10 animate-in zoom-in-95 relative">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">{title}</h3>
                <button onClick={onClose}><X size={24} className="text-slate-400 hover:text-white"/></button>
            </div>
            {children}
        </div>
    </div>
);

export default function Pomodoro({ currentUser }) {
    // STATE
    const [customTimes, setCustomTimes] = useState(() => JSON.parse(localStorage.getItem('pomodoro_settings')) || { focus: 25, short: 5, long: 15 });
    const [timerType, setTimerType] = useState('pomodoro');
    const [isActive, setIsActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(customTimes.focus * 60);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [mode, setMode] = useState('focus');
    const [todayTotal, setTodayTotal] = useState(() => parseInt(localStorage.getItem('pomodoro_todayTotal') || '0'));
    
    // UI STATE
    const [showSpotify, setShowSpotify] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showLogModal, setShowLogModal] = useState(false);
    const [spotifyUrl, setSpotifyUrl] = useState(() => localStorage.getItem('user_spotify_link') || "https://open.spotify.com/playlist/07tkrILaQ1gcD6JV2cMebx");

    // LOG STATE
    const [examType, setExamType] = useState("TYT");
    const [logData, setLogData] = useState({ subject: '', topic: '', count: '' });

    // EFFECT: Sayaç Motoru
    useEffect(() => {
        let interval = null;
        if (isActive) {
            interval = setInterval(() => {
                if (timerType === 'pomodoro') {
                    setTimeLeft((prev) => {
                        if (prev <= 1) { clearInterval(interval); handleComplete(false); return 0; }
                        return prev - 1;
                    });
                } else {
                    setElapsedTime(prev => prev + 1);
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, timerType]);

    // EFFECT: Ders Listesi Güncelleme
    useEffect(() => {
        const subjects = TOPICS[examType] ? Object.keys(TOPICS[examType]) : [];
        if (subjects.length > 0) setLogData(p => ({ ...p, subject: subjects[0], topic: '' }));
    }, [examType]);

    // FONKSİYONLAR
    const handleModeChange = (newMode) => { setMode(newMode); setIsActive(false); setTimeLeft(customTimes[newMode] * 60); };
    
    const handleTypeChange = (type) => { 
        setTimerType(type); 
        setIsActive(false); 
        if (type === 'pomodoro') setTimeLeft(customTimes[mode] * 60); 
        else setElapsedTime(0); 
    };

    // --- KRİTİK DÜZELTME: resetTimer Fonksiyonu Eklendi ---
    const resetTimer = () => {
        setIsActive(false);
        if (timerType === 'pomodoro') {
            setTimeLeft(customTimes[mode] * 60);
        } else {
            setElapsedTime(0);
        }
    };
    // -----------------------------------------------------

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
        return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleComplete = (isManualStop = false) => {
        setIsActive(false);
        try { new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play().catch(()=>{}); } catch (e) {}

        if (timerType === 'pomodoro' && mode !== 'focus') { alert("Mola bitti! 📚"); handleModeChange('focus'); return; }

        const duration = timerType === 'pomodoro' ? customTimes.focus : Math.floor(elapsedTime / 60);
        if (duration < 1) { if (isManualStop) alert("Süre 1 dakikadan az, kaydedilmedi."); return; }

        const newTotal = todayTotal + duration;
        setTodayTotal(newTotal);
        localStorage.setItem('pomodoro_todayTotal', newTotal.toString());

        if (!currentUser.isDemo) {
            updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email), { totalStudyMinutes: increment(duration) }).catch(console.error);
        }
        setShowLogModal(true);
    };

    const saveLog = async () => {
        if (!logData.topic) return alert("Konu seçin.");
        const duration = timerType === 'pomodoro' ? customTimes.focus : Math.floor(elapsedTime / 60);
        
        try {
            await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'study_logs'), {
                userId: currentUser.internalId, username: currentUser.username, avatar: currentUser.base64Avatar || currentUser.avatar,
                classSection: currentUser.classSection || "Belirsiz", examType, subject: logData.subject, topic: logData.topic,
                questionCount: Number(logData.count) || 0, duration, timestamp: serverTimestamp()
            });
            alert("Kaydedildi! 🔥"); setShowLogModal(false); setLogData(p => ({ ...p, count: '' }));
            
            // İşlem bitince sayacı sıfırla
            resetTimer(); 

        } catch (e) { console.error(e); alert("Hata."); }
    };

    // GÖRSEL HESAPLAMALAR
    const totalTime = timerType === 'pomodoro' ? (customTimes[mode] * 60) : 3600;
    const current = timerType === 'pomodoro' ? timeLeft : (elapsedTime % 3600);
    const radius = 120;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - ((totalTime - current) / totalTime) * circumference;

    // Ortak Dropdown Stili
    const selectStyle = {
        backgroundColor: '#1e293b',
        color: '#ffffff',
        border: '1px solid #334155',
        outline: 'none'
    };

    return (
        <div className="max-w-md mx-auto mt-4 relative pb-32">
            
            {/* MOD SEÇİMİ */}
            <div className="flex bg-black/20 p-1.5 rounded-2xl shadow-sm border border-white/5 mb-6">
                {['pomodoro', 'stopwatch'].map(t => (
                    <button key={t} onClick={() => handleTypeChange(t)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${timerType === t ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                        {t === 'pomodoro' ? <><Timer size={18}/> Pomodoro</> : <><Watch size={18}/> Kronometre</>}
                    </button>
                ))}
            </div>

            {/* ANA KART */}
            <div className={`relative rounded-[2.5rem] shadow-2xl p-6 text-white transition-all duration-500 overflow-hidden border-4 border-white/10 ${timerType === 'stopwatch' ? 'bg-slate-800' : (mode === 'focus' ? 'bg-indigo-600' : mode === 'short' ? 'bg-emerald-600' : 'bg-blue-600')}`}>
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none"></div>
                
                {/* Header */}
                <div className="flex justify-between items-center mb-8 relative z-10">
                    {timerType === 'pomodoro' ? (
                        <div className="flex gap-1 bg-black/20 p-1 rounded-full backdrop-blur-md">
                            {['focus', 'short', 'long'].map(m => (
                                <button key={m} onClick={() => handleModeChange(m)} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${mode === m ? 'bg-white text-black shadow' : 'text-white/70 hover:text-white'}`}>
                                    {m === 'focus' ? 'Odak' : m === 'short' ? 'Kısa' : 'Uzun'}
                                </button>
                            ))}
                        </div>
                    ) : <div className="text-xs font-bold text-white/70 uppercase tracking-widest">Süre Tutuluyor</div>}
                    
                    <div className="flex gap-2">
                        <button onClick={() => setShowSpotify(!showSpotify)} className={`p-2 rounded-full transition-colors ${showSpotify ? 'bg-green-500 text-white' : 'bg-white/20 hover:bg-white/30'}`}><Music size={18}/></button>
                        {timerType === 'pomodoro' && <button onClick={() => setShowSettings(true)} className="p-2 rounded-full bg-white/20 hover:bg-white/30"><Settings size={18}/></button>}
                    </div>
                </div>

                {/* Dairesel Sayaç */}
                <div className="relative flex items-center justify-center mb-8 z-10">
                    <svg width="260" height="260" className="transform -rotate-90">
                        <circle cx="130" cy="130" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                        <circle cx="130" cy="130" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="text-white transition-all duration-1000 ease-linear" />
                    </svg>
                    <div className="absolute text-center">
                        <div className="text-7xl font-bold tracking-tighter font-mono drop-shadow-lg">{formatTime(timerType === 'pomodoro' ? timeLeft : elapsedTime)}</div>
                        <div className="text-white/80 font-medium mt-2 animate-pulse">{isActive ? 'Çalışılıyor...' : 'Hazır mısın?'}</div>
                    </div>
                </div>

                {/* Kontroller */}
                <div className="flex justify-center gap-6 relative z-10 items-center">
                    {/* BURADA resetTimer ÇAĞRILIYOR, ARTIK TANIMLI */}
                    <button onClick={resetTimer} className="bg-white/20 hover:bg-white/30 text-white w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-sm"><RotateCcw size={24}/></button>
                    <button onClick={() => setIsActive(!isActive)} className="bg-white text-slate-900 w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all ring-4 ring-white/30">
                        {isActive ? <Pause size={36} fill="currentColor"/> : <Play size={36} fill="currentColor" className="ml-1"/>}
                    </button>
                    {timerType === 'stopwatch' && (
                        <button onClick={() => handleComplete(true)} className="w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-sm bg-green-500/20 hover:bg-green-500/40 text-green-300 border border-green-500/30"><CheckCircle size={24}/></button>
                    )}
                </div>
            </div>
            
            {/* SPOTIFY */}
            {showSpotify && (
                <div className="mt-4 glass-box rounded-2xl p-3 shadow-lg animate-in slide-in-from-top-2">
                    <div className="mb-2 flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-700">
                        <LinkIcon size={14} className="text-slate-400"/>
                        <input type="text" placeholder="Spotify Linki..." className="bg-transparent w-full text-xs outline-none text-white" value={spotifyUrl} onChange={e => {setSpotifyUrl(e.target.value); localStorage.setItem('user_spotify_link', e.target.value)}}/>
                    </div>
                    <iframe style={{borderRadius:'12px'}} src={spotifyUrl.replace("open.spotify.com/", "open.spotify.com/embed/")} width="100%" height="152" frameBorder="0" allowFullScreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
                </div>
            )}

            <div className="mt-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Bugün: {Math.floor(todayTotal / 60)} sa {todayTotal % 60} dk</div>

            {/* LOG MODALI */}
            {showLogModal && (
                <Modal title="Tebrikler! 🎉" onClose={() => setShowLogModal(false)}>
                    <p className="text-sm text-slate-400 mb-4 text-center">Süre: {timerType === 'pomodoro' ? customTimes.focus : Math.floor(elapsedTime / 60)} dakika.</p>
                    <div className="space-y-4">
                        <div className="flex gap-2 p-1 bg-slate-900 rounded-xl border border-slate-700">
                            {['TYT', 'AYT'].map(t => <button key={t} onClick={() => setExamType(t)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${examType === t ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>{t}</button>)}
                        </div>
                        <select className="w-full p-3 rounded-xl" style={selectStyle} value={logData.subject} onChange={e => setLogData({...logData, subject: e.target.value})}>{Object.keys(TOPICS[examType] || {}).map(s => <option key={s} value={s}>{s}</option>)}</select>
                        <select className="w-full p-3 rounded-xl" style={selectStyle} value={logData.topic} onChange={e => setLogData({...logData, topic: e.target.value})}><option value="">Konu Seç...</option>{(TOPICS[examType]?.[logData.subject] || []).map(t => <option key={t} value={t}>{t}</option>)}</select>
                        <CustomInput placeholder="Soru Sayısı (Opsiyonel)" type="number" value={logData.count} onChange={e => setLogData({...logData, count: e.target.value})} />
                        <button onClick={saveLog} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg">Kaydet</button>
                    </div>
                </Modal>
            )}

            {/* AYARLAR MODALI */}
            {showSettings && (
                <Modal title="Süre Ayarları" onClose={() => setShowSettings(false)}>
                    <form onSubmit={(e) => { e.preventDefault(); localStorage.setItem('pomodoro_settings', JSON.stringify(customTimes)); setShowSettings(false); if(!isActive) setTimeLeft(customTimes.focus * 60); }} className="space-y-3">
                        <CustomInput label="Odak (dk)" type="number" min="1" max="120" value={customTimes.focus} onChange={e => setCustomTimes({...customTimes, focus: Number(e.target.value)})} />
                        <div className="grid grid-cols-2 gap-3">
                            <CustomInput label="Kısa Mola" type="number" min="1" max="30" value={customTimes.short} onChange={e => setCustomTimes({...customTimes, short: Number(e.target.value)})} />
                            <CustomInput label="Uzun Mola" type="number" min="1" max="60" value={customTimes.long} onChange={e => setCustomTimes({...customTimes, long: Number(e.target.value)})} />
                        </div>
                        <button className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl">Kaydet</button>
                    </form>
                </Modal>
            )}
        </div>
    );
}