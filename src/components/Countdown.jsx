import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

export default function Countdown() {
    const [timeLeft, setTimeLeft] = useState({ tyt: 0, ayt: 0 });

    useEffect(() => {
        const calculateTime = () => {
            const now = new Date();
            const tytDate = new Date("2026-06-20T10:15:00"); // Tarihleri güncelleyebilirsiniz
            const aytDate = new Date("2026-06-21T10:15:00");
            
            const diffTyt = Math.ceil((tytDate - now) / (1000 * 60 * 60 * 24));
            const diffAyt = Math.ceil((aytDate - now) / (1000 * 60 * 60 * 24));
            
            setTimeLeft({
                tyt: diffTyt > 0 ? diffTyt : 0,
                ayt: diffAyt > 0 ? diffAyt : 0
            });
        };
        
        calculateTime();
        const timer = setInterval(calculateTime, 1000 * 60 * 60); // Saatte bir güncelle
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="bg-slate-800/50 rounded-xl p-2.5 border border-slate-700/50 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2 text-indigo-400">
                <Timer size={14} className="animate-pulse"/>
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">Kaç Gün?</span>
            </div>
            <div className="flex gap-3 text-xs font-bold text-white">
                <div className="flex items-center gap-1">
                    <span className="text-slate-500">TYT</span>
                    <span className="bg-indigo-600 px-1.5 py-0.5 rounded text-[10px]">{timeLeft.tyt}</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-slate-500">AYT</span>
                    <span className="bg-purple-600 px-1.5 py-0.5 rounded text-[10px]">{timeLeft.ayt}</span>
                </div>
            </div>
        </div>
    );
}
