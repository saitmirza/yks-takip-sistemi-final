import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain, Zap, Settings, Save, X } from 'lucide-react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';

export default function Pomodoro({ currentUser }) {
    // --- AYARLAR STATE'İ ---
    const [customTimes, setCustomTimes] = useState(() => {
        // Hafızadan ayarları çek, yoksa varsayılanı kullan
        const saved = localStorage.getItem('pomodoro_settings');
        return saved ? JSON.parse(saved) : { focus: 25, short: 5, long: 15 };
    });
    const [showSettings, setShowSettings] = useState(false);

    // --- SAYAÇ STATE'LERİ ---
    const [timeLeft, setTimeLeft] = useState(customTimes.focus * 60);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState('focus'); // focus, short, long
    const [todayTotal, setTodayTotal] = useState(0); // Dakika cinsinden

    // --- KALICILIK MANTIĞI (Sihirli Kısım) ---
    useEffect(() => {
        // Sayfa ilk açıldığında: Devam eden bir sayaç var mı kontrol et
        const savedEndTime = localStorage.getItem('pomodoro_endTime');
        const savedMode = localStorage.getItem('pomodoro_mode');
        const savedTotal = localStorage.getItem('pomodoro_todayTotal');

        if (savedTotal) setTodayTotal(parseInt(savedTotal));

        if (savedEndTime && savedMode) {
            const now = Date.now();
            const end = parseInt(savedEndTime);
            
            if (end > now) {
                // Sayaç hala çalışıyor olmalı
                setMode(savedMode);
                setIsActive(true);
                setTimeLeft(Math.ceil((end - now) / 1000));
            } else {
                // Süre biz yokken bitmiş
                setIsActive(false);
                setMode(savedMode);
                setTimeLeft(0);
                localStorage.removeItem('pomodoro_endTime');
            }
        }
    }, []);

    // Sayaç Döngüsü
    useEffect(() => {
        let interval = null;

        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                // Her saniye tekrar hesapla (Zaman kaymasını önler)
                const savedEndTime = localStorage.getItem('pomodoro_endTime');
                if (savedEndTime) {
                    const now = Date.now();
                    const diff = Math.ceil((parseInt(savedEndTime) - now) / 1000);
                    
                    if (diff <= 0) {
                        handleComplete();
                    } else {
                        setTimeLeft(diff);
                    }
                } else {
                    // Eğer storage silindiyse manuel azalt
                    setTimeLeft(prev => prev - 1);
                }
            }, 1000);
        } else if (timeLeft === 0 && isActive) {
            handleComplete();
        }

        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    // Başlat / Durdur
    const toggleTimer = () => {
        if (!isActive) {
            // BAŞLAT: Bitiş zamanını hesapla ve kaydet
            const now = Date.now();
            const endTime = now + (timeLeft * 1000);
            localStorage.setItem('pomodoro_endTime', endTime.toString());
            localStorage.setItem('pomodoro_mode', mode);
            setIsActive(true);
        } else {
            // DURDUR: Kaydı sil
            localStorage.removeItem('pomodoro_endTime');
            setIsActive(false);
        }
    };

    // Sıfırla
    const resetTimer = () => {
        localStorage.removeItem('pomodoro_endTime');
        setIsActive(false);
        setTimeLeft(customTimes[mode] * 60);
    };

    // Süre Bittiğinde
    const handleComplete = () => {
        localStorage.removeItem('pomodoro_endTime');
        setIsActive(false);
        setTimeLeft(0);

        // Sesli uyarı (Tarayıcı izin verirse)
        try {
            const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
            audio.play();
        } catch(e) {}

        if (mode === 'focus') {
            const minutes = customTimes.focus;
            const newTotal = todayTotal + minutes;
            setTodayTotal(newTotal);
            localStorage.setItem('pomodoro_todayTotal', newTotal.toString());
            
            // Firebase'e kaydet
            if (!currentUser.isDemo) {
                try {
                    const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email);
                    updateDoc(userRef, { totalStudyMinutes: increment(minutes) });
                } catch (err) { console.error(err); }
            }
            alert("Süre doldu! Harika iş çıkardın. Mola vakti! ☕");
        } else {
            alert("Mola bitti! Derse dönme vakti. 📚");
        }
    };

    const switchMode = (newMode) => {
        localStorage.removeItem('pomodoro_endTime'); // Mod değişince sayacı iptal et
        setMode(newMode);
        setIsActive(false);
        setTimeLeft(customTimes[newMode] * 60);
        localStorage.setItem('pomodoro_mode', newMode);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Ayarları Kaydet
    const saveSettings = (e) => {
        e.preventDefault();
        localStorage.setItem('pomodoro_settings', JSON.stringify(customTimes));
        setShowSettings(false);
        // Eğer sayaç çalışmıyorsa süreyi hemen güncelle
        if (!isActive) {
            setTimeLeft(customTimes[mode] * 60);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-6 relative">
            
            {/* AYARLAR MODALI */}
            {showSettings && (
                <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm rounded-3xl flex items-center justify-center animate-in fade-in">
                    <form onSubmit={saveSettings} className="p-6 w-full text-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg flex items-center gap-2"><Settings size={20}/> Süre Ayarları (dk)</h3>
                            <button type="button" onClick={() => setShowSettings(false)}><X size={24}/></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-400">Odaklanma</label>
                                <input type="number" min="1" max="120" value={customTimes.focus} onChange={e => setCustomTimes({...customTimes, focus: Number(e.target.value)})} className="w-full border rounded-xl p-2 font-bold text-center bg-indigo-50 text-indigo-600 outline-none focus:ring-2 ring-indigo-200"/>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-400">Kısa Mola</label>
                                    <input type="number" min="1" max="30" value={customTimes.short} onChange={e => setCustomTimes({...customTimes, short: Number(e.target.value)})} className="w-full border rounded-xl p-2 font-bold text-center bg-emerald-50 text-emerald-600 outline-none focus:ring-2 ring-emerald-200"/>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-400">Uzun Mola</label>
                                    <input type="number" min="1" max="60" value={customTimes.long} onChange={e => setCustomTimes({...customTimes, long: Number(e.target.value)})} className="w-full border rounded-xl p-2 font-bold text-center bg-blue-50 text-blue-600 outline-none focus:ring-2 ring-blue-200"/>
                                </div>
                            </div>
                        </div>
                        <button className="w-full mt-6 bg-slate-800 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors">
                            <Save size={18}/> Ayarları Kaydet
                        </button>
                    </form>
                </div>
            )}

            {/* ANA KART */}
            <div className={`relative rounded-3xl shadow-2xl p-8 text-white transition-all duration-500 overflow-hidden ${mode === 'focus' ? 'bg-indigo-600' : mode === 'short' ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                
                {/* Arka Plan Efekti */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-black opacity-10 rounded-full -ml-10 -mb-10 blur-2xl"></div>

                {/* Üst Bar (Modlar ve Ayar) */}
                <div className="flex justify-between items-center mb-8 relative z-10">
                    <div className="flex gap-1 bg-black/20 p-1 rounded-full">
                        <button onClick={() => switchMode('focus')} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all ${mode === 'focus' ? 'bg-white text-indigo-600 shadow-sm' : 'text-white/70 hover:text-white'}`}>Odak</button>
                        <button onClick={() => switchMode('short')} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all ${mode === 'short' ? 'bg-white text-emerald-600 shadow-sm' : 'text-white/70 hover:text-white'}`}>Kısa</button>
                        <button onClick={() => switchMode('long')} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all ${mode === 'long' ? 'bg-white text-blue-600 shadow-sm' : 'text-white/70 hover:text-white'}`}>Uzun</button>
                    </div>
                    <button onClick={() => setShowSettings(true)} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                        <Settings size={18}/>
                    </button>
                </div>

                {/* Sayaç */}
                <div className="text-center mb-8 relative z-10">
                    <div className="text-8xl font-bold tracking-tighter font-mono drop-shadow-lg">
                        {formatTime(timeLeft)}
                    </div>
                    <div className="text-white/80 font-medium mt-2 flex justify-center items-center gap-2 animate-pulse">
                        {isActive ? (mode === 'focus' ? '🔥 Odaklanılıyor...' : '☕ Mola Yapılıyor...') : 'Hazır mısın?'}
                    </div>
                </div>

                {/* Kontroller */}
                <div className="flex justify-center gap-4 relative z-10">
                    <button 
                        onClick={toggleTimer}
                        className="bg-white text-slate-800 w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all"
                    >
                        {isActive ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1"/>}
                    </button>
                    <button 
                        onClick={resetTimer}
                        className="bg-white/20 hover:bg-white/30 text-white w-20 h-20 rounded-2xl flex items-center justify-center backdrop-blur-sm transition-all"
                    >
                        <RotateCcw size={28}/>
                    </button>
                </div>
            </div>

            {/* İstatistik Kartı */}
            <div className="mt-6 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                        <Zap size={20}/>
                    </div>
                    <div>
                        <div className="text-xs text-slate-400 font-bold uppercase">Bugünkü Odak</div>
                        <div className="font-bold text-slate-700 text-lg">{Math.floor(todayTotal / 60)}sa {todayTotal % 60}dk</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold text-indigo-600">{Math.floor(todayTotal / customTimes.focus)}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Tamamlanan</div>
                </div>
            </div>
        </div>
    );
}