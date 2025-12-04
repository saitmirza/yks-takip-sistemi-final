import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings, CheckCircle, Timer, Watch, Music, X, Link as LinkIcon, HelpCircle } from 'lucide-react';
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { TOPICS } from '../utils/topics';

export default function Pomodoro({ currentUser }) {
    // --- AYARLAR ---
    const [customTimes, setCustomTimes] = useState(() => {
        const saved = localStorage.getItem('pomodoro_settings');
        return saved ? JSON.parse(saved) : { focus: 25, short: 5, long: 15 };
    });

    // --- ANA STATE'LER ---
    const [timerType, setTimerType] = useState('pomodoro'); // 'pomodoro' veya 'stopwatch'
    const [isActive, setIsActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(customTimes.focus * 60);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [mode, setMode] = useState('focus'); // focus, short, long
    const [todayTotal, setTodayTotal] = useState(() => {
        return parseInt(localStorage.getItem('pomodoro_todayTotal') || '0');
    });

    // --- SPOTIFY ---
    const [showSpotify, setShowSpotify] = useState(false);
    const [showSpotifyHelp, setShowSpotifyHelp] = useState(false);
    const [spotifyUrl, setSpotifyUrl] = useState(() => localStorage.getItem('user_spotify_link') || "https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn");

    // --- MODALLAR ---
    const [showSettings, setShowSettings] = useState(false);
    const [showLogModal, setShowLogModal] = useState(false);
    
    // --- LOGLAMA ---
    const [examType, setExamType] = useState("TYT");
    const [logData, setLogData] = useState({ subject: '', topic: '', count: '' });

    // --- DERS LİSTESİ ---
    const currentSubjects = TOPICS[examType] ? Object.keys(TOPICS[examType]) : [];
    const currentTopics = (logData.subject && TOPICS[examType] && TOPICS[examType][logData.subject]) ? TOPICS[examType][logData.subject] : [];

    // Sınav türü değişince dersi sıfırla
    useEffect(() => {
        if (currentSubjects.length > 0) {
            setLogData(p => ({ ...p, subject: currentSubjects[0], topic: '' }));
        }
    }, [examType]);

    // --- SAYAÇ MOTORU (Kalp Atışı) ---
    useEffect(() => {
        let interval = null;

        if (isActive) {
            interval = setInterval(() => {
                if (timerType === 'pomodoro') {
                    setTimeLeft((prevTime) => {
                        if (prevTime <= 1) {
                            clearInterval(interval);
                            handleComplete(false); // Otomatik bitiş
                            return 0;
                        }
                        return prevTime - 1;
                    });
                } else {
                    setElapsedTime(prev => prev + 1);
                }
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [isActive, timerType]);

    // --- İŞLEMLER ---

    const toggleTimer = () => {
        setIsActive(!isActive);
    };

    const resetTimer = () => {
        setIsActive(false);
        if (timerType === 'pomodoro') {
            setTimeLeft(customTimes[mode] * 60);
        } else {
            setElapsedTime(0);
        }
    };

    const handleModeChange = (newMode) => {
        setMode(newMode);
        setIsActive(false);
        setTimeLeft(customTimes[newMode] * 60);
    };

    const handleTypeChange = (type) => {
        setTimerType(type);
        setIsActive(false);
        // Tür değişince sayaçları sıfırla ki karışmasın
        if (type === 'pomodoro') setTimeLeft(customTimes[mode] * 60);
        else setElapsedTime(0);
    };

    // SÜRE BİTTİĞİNDE VEYA BİTİR BUTONUNA BASILDIĞINDA
    const handleComplete = (isManualStop = false) => {
        setIsActive(false); // Sayacı durdur
        
        // Ses Çal
        try { new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play().catch(() => {}); } catch (e) {}

        // Süreyi Hesapla (Dakika cinsinden)
        let duration = 0;
        if (timerType === 'pomodoro') {
            duration = customTimes.focus;
            // Eğer mola modundaysa kaydetme, sadece uyar
            if (mode !== 'focus') {
                alert("Mola bitti! Hadi derse dön. 📚");
                resetTimer(); // Molayı sıfırla
                return;
            }
        } else {
            duration = Math.floor(elapsedTime / 60);
        }

        // Güvenlik Kontrolü: 1 dakikadan azsa kaydetme
        if (duration < 1) {
            if (isManualStop) alert("Süre 1 dakikadan az, kaydedilmedi.");
            return;
        }

        // İstatistikleri Güncelle
        const newTotal = todayTotal + duration;
        setTodayTotal(newTotal);
        localStorage.setItem('pomodoro_todayTotal', newTotal.toString());

        // Firebase'e Toplam Süreyi İşle (Arka Planda)
        if (!currentUser.isDemo) {
            try { 
                updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email), { 
                    totalStudyMinutes: increment(duration) 
                }); 
            } catch (err) { console.error(err); }
        }

        // Log Modalını Aç
        setShowLogModal(true);
    };

    const saveLog = async () => {
        if (!logData.topic) return alert("Lütfen bir konu seçin.");
        
        const durationToSave = timerType === 'pomodoro' ? customTimes.focus : Math.floor(elapsedTime / 60);

        try {
            await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'study_logs'), {
                userId: currentUser.internalId,
                username: currentUser.username,
                avatar: currentUser.base64Avatar || currentUser.avatar,
                examType: examType,
                subject: logData.subject,
                topic: logData.topic,
                questionCount: Number(logData.count) || 0,
                duration: durationToSave,
                timestamp: serverTimestamp()
            });
            
            alert("Çalışma kaydedildi! 🔥");
            setShowLogModal(false);
            setLogData(p => ({ ...p, count: '' })); // Sadece sayıyı temizle
            
            // Sayaçları sıfırla
            if (timerType === 'pomodoro') resetTimer();
            else setElapsedTime(0);

        } catch (error) {
            console.error("Log hatası:", error);
            alert("Kaydedilirken bir hata oluştu.");
        }
    };

    const saveSettings = (e) => {
        e.preventDefault();
        localStorage.setItem('pomodoro_settings', JSON.stringify(customTimes));
        setShowSettings(false);
        if (!isActive && timerType === 'pomodoro') {
            setTimeLeft(customTimes[mode] * 60);
        }
    };

    // --- FORMATLAMA ---
    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // --- SPOTIFY HELPER ---
    const getEmbedUrl = (url) => {
        if (!url) return "";
        try {
            if (url.includes("open.spotify.com/embed")) return url;
            return url.replace("open.spotify.com/", "open.spotify.com/embed/");
        } catch { return ""; }
    };

    const handleSpotifyChange = (e) => {
        const newUrl = e.target.value;
        setSpotifyUrl(newUrl);
        localStorage.setItem('user_spotify_link', newUrl);
        // Opsiyonel: Burada Firebase'e de kaydedebilirsin
    };

    // Dairesel İlerleme Hesabı
    const totalTimeForCircle = timerType === 'pomodoro' ? (customTimes[mode] * 60) : 3600; // Kronometre için görsel limit 60dk
    const currentTimeForCircle = timerType === 'pomodoro' ? timeLeft : (elapsedTime % 3600);
    const radius = 120;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - ((totalTimeForCircle - currentTimeForCircle) / totalTimeForCircle) * circumference;

    return (
        <div className="max-w-md mx-auto mt-4 relative pb-32">
            
            {/* MOD SEÇİMİ (POMODORO / KRONOMETRE) */}
            <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded-2xl shadow-sm border border-slate-100 dark:border-gray-700 mb-6 transition-colors">
                <button 
                    onClick={() => handleTypeChange('pomodoro')} 
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${timerType === 'pomodoro' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700'}`}
                >
                    <Timer size={18}/> Pomodoro
                </button>
                <button 
                    onClick={() => handleTypeChange('stopwatch')} 
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${timerType === 'stopwatch' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700'}`}
                >
                    <Watch size={18}/> Kronometre
                </button>
            </div>

            {/* --- LOGLAMA MODALI --- */}
            {showLogModal && (
                <div className="absolute inset-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl flex flex-col items-center justify-center p-6 animate-in zoom-in-95 border border-slate-200 dark:border-gray-700">
                    <div className="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 w-12 h-12 rounded-full flex items-center justify-center mb-3"><CheckCircle size={24}/></div>
                    <h3 className="font-bold text-slate-800 dark:text-white mb-1">Harika İş! 🎉</h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">
                        Süre: {timerType === 'pomodoro' ? customTimes.focus : Math.floor(elapsedTime / 60)} dakika.
                    </p>
                    
                    <div className="w-full space-y-3">
                         {/* TYT/AYT Seçimi */}
                         <div className="flex bg-slate-100 dark:bg-gray-800 p-1 rounded-lg">
                            {['TYT', 'AYT'].map(type => (
                                <button key={type} onClick={() => setExamType(type)} className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${examType === type ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-gray-400'}`}>{type}</button>
                            ))}
                        </div>

                        <select className="w-full p-2 bg-slate-50 dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-sm outline-none dark:text-white" value={logData.subject} onChange={e => setLogData({...logData, subject: e.target.value})}>
                            {currentSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        
                        <select className="w-full p-2 bg-slate-50 dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-sm outline-none dark:text-white" value={logData.topic} onChange={e => setLogData({...logData, topic: e.target.value})}>
                            <option value="">Konu Seç...</option>
                            {currentTopics.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>

                        <input type="number" placeholder="Soru Sayısı (Opsiyonel)" className="w-full p-2 bg-slate-50 dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-sm outline-none dark:text-white" value={logData.count} onChange={e => setLogData({...logData, count: e.target.value})}/>
                        
                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setShowLogModal(false)} className="flex-1 py-2 text-slate-400 dark:text-gray-500 font-bold hover:bg-slate-50 dark:hover:bg-gray-800 rounded-xl text-sm">İptal</button>
                            <button onClick={saveLog} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm">Kaydet</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- AYARLAR MODALI --- */}
            {showSettings && (
                <div className="absolute inset-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-3xl flex items-center justify-center animate-in fade-in border border-slate-200 dark:border-gray-700">
                    <form onSubmit={saveSettings} className="p-6 w-full text-slate-700 dark:text-white">
                        <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg flex items-center gap-2"><Settings size={20}/> Süreler (Dk)</h3><button type="button" onClick={() => setShowSettings(false)}><X size={24}/></button></div>
                        <div className="space-y-3">
                            <div><label className="text-xs font-bold uppercase text-slate-400">Odak</label><input type="number" min="1" max="120" value={customTimes.focus} onChange={e => setCustomTimes({...customTimes, focus: Number(e.target.value)})} className="w-full border dark:border-gray-600 dark:bg-gray-800 rounded-xl p-2 text-center"/></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-bold uppercase text-slate-400">Kısa Mola</label><input type="number" min="1" max="30" value={customTimes.short} onChange={e => setCustomTimes({...customTimes, short: Number(e.target.value)})} className="w-full border dark:border-gray-600 dark:bg-gray-800 rounded-xl p-2 text-center"/></div>
                                <div><label className="text-xs font-bold uppercase text-slate-400">Uzun Mola</label><input type="number" min="1" max="60" value={customTimes.long} onChange={e => setCustomTimes({...customTimes, long: Number(e.target.value)})} className="w-full border dark:border-gray-600 dark:bg-gray-800 rounded-xl p-2 text-center"/></div>
                            </div>
                        </div>
                        <button className="w-full mt-6 bg-slate-800 dark:bg-gray-700 text-white font-bold py-3 rounded-xl shadow-lg">Kaydet</button>
                    </form>
                </div>
            )}

            {/* --- ANA KART --- */}
            <div className={`relative rounded-[2.5rem] shadow-2xl p-6 text-white transition-all duration-500 overflow-hidden border-4 border-white/10 ${timerType === 'stopwatch' ? 'bg-slate-800' : (mode === 'focus' ? 'bg-indigo-600' : mode === 'short' ? 'bg-emerald-600' : 'bg-blue-600')}`}>
                <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                
                {/* Header */}
                <div className="flex justify-between items-center mb-8 relative z-10">
                    {timerType === 'pomodoro' ? (
                        <div className="flex gap-1 bg-black/20 p-1 rounded-full backdrop-blur-md">
                            {['focus', 'short', 'long'].map(m => <button key={m} onClick={() => handleModeChange(m)} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${mode === m ? 'bg-white text-black shadow' : 'text-white/70 hover:text-white'}`}>{m === 'focus' ? 'Odak' : m === 'short' ? 'Kısa' : 'Uzun'}</button>)}
                        </div>
                    ) : <div className="text-xs font-bold text-white/70 uppercase tracking-widest">Süre Tutuluyor</div>}
                    
                    <div className="flex gap-2">
                        <button onClick={() => setShowSpotify(!showSpotify)} className={`p-2 rounded-full transition-colors ${showSpotify ? 'bg-green-500 text-white' : 'bg-white/20 hover:bg-white/30'}`} title="Müzik"><Music size={18}/></button>
                        {timerType === 'pomodoro' && <button onClick={() => setShowSettings(true)} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"><Settings size={18}/></button>}
                    </div>
                </div>

                {/* Dairesel Sayaç */}
                <div className="relative flex items-center justify-center mb-8 z-10">
                    <svg width="260" height="260" className="transform -rotate-90">
                        <circle cx="130" cy="130" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                        <circle cx="130" cy="130" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="text-white transition-all duration-1000 ease-linear" />
                    </svg>
                    <div className="absolute text-center flex flex-col items-center">
                        <div className="text-7xl font-bold tracking-tighter font-mono drop-shadow-lg">
                            {formatTime(timerType === 'pomodoro' ? timeLeft : elapsedTime)}
                        </div>
                        <div className="text-white/80 font-medium mt-2 flex justify-center items-center gap-2 animate-pulse">
                            {isActive ? (timerType === 'stopwatch' ? 'Çalışılıyor...' : mode === 'focus' ? 'Odaklan...' : 'Dinlen...') : 'Hazır mısın?'}
                        </div>
                    </div>
                </div>

                {/* Kontroller */}
                <div className="flex justify-center gap-6 relative z-10 items-center">
                    <button onClick={resetTimer} className="bg-white/20 hover:bg-white/30 text-white w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-sm transition-all"><RotateCcw size={24}/></button>
                    <button onClick={toggleTimer} className="bg-white text-slate-900 w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all ring-4 ring-white/30">
                        {isActive ? <Pause size={36} fill="currentColor"/> : <Play size={36} fill="currentColor" className="ml-1"/>}
                    </button>
                    
                    {/* BİTİR BUTONU (SADECE KRONOMETREDE) */}
                    {timerType === 'stopwatch' && (
                        <button onClick={() => handleComplete(true)} className="w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-sm transition-all bg-green-500/20 hover:bg-green-500/40 text-green-300 border border-green-500/30" title="Bitir ve Kaydet">
                            <CheckCircle size={24}/>
                        </button>
                    )}
                </div>
            </div>
            
            {/* SPOTIFY */}
            {showSpotify && (
                <div className="mt-4 bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-lg border border-slate-200 dark:border-gray-700 animate-in slide-in-from-top-2 transition-colors">
                    <div className="mb-2 flex items-center gap-2 bg-slate-100 dark:bg-gray-900 p-2 rounded-xl">
                        <LinkIcon size={14} className="text-slate-400"/>
                        <input type="text" placeholder="Spotify Linki..." className="bg-transparent w-full text-xs outline-none dark:text-white" value={spotifyUrl} onChange={handleSpotifyChange}/>
                        <button onClick={() => setShowSpotifyHelp(true)} className="text-slate-400 hover:text-indigo-500"><HelpCircle size={16}/></button>
                    </div>
                    <iframe style={{borderRadius:'12px'}} src={getEmbedUrl(spotifyUrl)} width="100%" height="152" frameBorder="0" allowFullScreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
                </div>
            )}

            {/* SPOTIFY HELP */}
            {showSpotifyHelp && (
                <div className="absolute inset-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 border border-slate-200 dark:border-gray-700">
                     <div className="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 w-10 h-10 rounded-full flex items-center justify-center mb-4"><Music size={20}/></div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Nasıl Eklenir?</h3>
                    <ol className="text-sm text-slate-600 dark:text-slate-300 space-y-2 text-left list-decimal pl-4 mb-4"><li>Spotify'ı aç.</li><li>Çalma listesine sağ tıkla.</li><li><strong>Paylaş {'\u2192'} Bağlantıyı kopyala</strong> de.</li><li>Kutucuğa yapıştır.</li></ol>
                    <button onClick={() => setShowSpotifyHelp(false)} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-sm">Anlaşıldı</button>
                </div>
            )}

            <div className="mt-4 text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Bugün: {Math.floor(todayTotal / 60)} sa {todayTotal % 60} dk
            </div>
        </div>
    );
}