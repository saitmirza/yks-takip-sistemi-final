import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain, Zap } from 'lucide-react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';

export default function Pomodoro({ currentUser }) {
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState('focus'); // focus, short, long
    const [todayTotal, setTodayTotal] = useState(0); // Dakika cinsinden

    // Sayaç Mantığı
    useEffect(() => {
        let interval = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(timeLeft - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            if (mode === 'focus') {
                handleCompleteSession();
                alert("Süre doldu! Mola vakti. ☕");
            } else {
                alert("Mola bitti! Derse dön. 📚");
            }
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const handleCompleteSession = async () => {
        const minutes = 25;
        setTodayTotal(prev => prev + minutes);
        
        // Firebase'e kaydet (Opsiyonel - İleride sınıf toplamı için)
        try {
             const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email);
             await updateDoc(userRef, {
                 totalStudyMinutes: increment(minutes)
             });
        } catch (err) {
            console.error("İstatistik kaydedilemedi", err);
        }
    };

    const switchMode = (newMode) => {
        setMode(newMode);
        setIsActive(false);
        if (newMode === 'focus') setTimeLeft(25 * 60);
        if (newMode === 'short') setTimeLeft(5 * 60);
        if (newMode === 'long') setTimeLeft(15 * 60);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="max-w-md mx-auto mt-10">
            {/* Ana Kart */}
            <div className={`relative rounded-3xl shadow-2xl p-8 text-white transition-colors duration-500 overflow-hidden ${mode === 'focus' ? 'bg-indigo-600' : mode === 'short' ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                
                {/* Arka Plan Efekti */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-black opacity-10 rounded-full -ml-10 -mb-10 blur-2xl"></div>

                {/* Mod Seçimi */}
                <div className="flex justify-center gap-2 mb-8 relative z-10">
                    <button onClick={() => switchMode('focus')} className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${mode === 'focus' ? 'bg-white text-indigo-600' : 'bg-white/20 hover:bg-white/30'}`}>Odaklan</button>
                    <button onClick={() => switchMode('short')} className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${mode === 'short' ? 'bg-white text-emerald-600' : 'bg-white/20 hover:bg-white/30'}`}>Kısa Mola</button>
                    <button onClick={() => switchMode('long')} className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${mode === 'long' ? 'bg-white text-blue-600' : 'bg-white/20 hover:bg-white/30'}`}>Uzun Mola</button>
                </div>

                {/* Sayaç */}
                <div className="text-center mb-8 relative z-10">
                    <div className="text-8xl font-bold tracking-tighter font-mono">
                        {formatTime(timeLeft)}
                    </div>
                    <div className="text-indigo-100 font-medium mt-2 flex justify-center items-center gap-2">
                        {mode === 'focus' ? <><Brain size={16}/> Ders Çalışma Modu</> : <><Coffee size={16}/> Dinlenme Modu</>}
                    </div>
                </div>

                {/* Kontroller */}
                <div className="flex justify-center gap-4 relative z-10">
                    <button 
                        onClick={() => setIsActive(!isActive)}
                        className="bg-white text-slate-800 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                    >
                        {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1"/>}
                    </button>
                    <button 
                        onClick={() => switchMode(mode)}
                        className="bg-white/20 hover:bg-white/30 text-white w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-sm transition-all"
                    >
                        <RotateCcw size={24}/>
                    </button>
                </div>
            </div>

            {/* İstatistik Kartı */}
            <div className="mt-6 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                        <Zap size={20}/>
                    </div>
                    <div>
                        <div className="text-xs text-slate-400 font-bold uppercase">Bugünkü Odak</div>
                        <div className="font-bold text-slate-700">{Math.floor(todayTotal / 60)} sa {todayTotal % 60} dk</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-indigo-600">{Math.floor(todayTotal / 25)}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Pomodoro</div>
                </div>
            </div>
        </div>
    );
}