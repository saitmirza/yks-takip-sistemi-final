import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function Countdown() {
    // Başlangıçta boş değil, hesaplanıyor olarak başlasın
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

    useEffect(() => {
        // 21 Haziran 2025, 10:15:00 için Sabit Timestamp (Milisaniye cinsinden)
        // Bu sayı evrenseldir, tarayıcıya göre değişmez.
        const TARGET_TIMESTAMP = 1750490100000; 

        const calculateTime = () => {
            const now = Date.now();
            const distance = TARGET_TIMESTAMP - now;

            if (distance < 0) {
                // Süre dolduysa
                setTimeLeft({ days: 0, hours: 0, minutes: 0 });
            } else {
                // Hesaplama
                const d = Math.floor(distance / (1000 * 60 * 60 * 24));
                const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                
                setTimeLeft({ days: d, hours: h, minutes: m });
            }
        };

        // İlk hesaplama
        calculateTime();

        // Saniye başı güncelleme
        const timer = setInterval(calculateTime, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="bg-indigo-500/20 rounded-xl p-3 text-center border border-indigo-500/30 mx-4 mt-2 mb-4 backdrop-blur-sm">
            <div className="text-[10px] text-indigo-200 uppercase font-bold tracking-widest mb-1 flex justify-center items-center gap-1">
                <Clock size={10}/> YKS 2025
            </div>
            <div className="flex justify-center gap-2 text-white font-mono">
                <div className="flex flex-col items-center">
                    <span className="text-lg font-bold leading-none">{timeLeft.days}</span>
                    <span className="text-[8px] text-white/60">GÜN</span>
                </div>
                <span className="text-lg font-bold leading-none opacity-50">:</span>
                <div className="flex flex-col items-center">
                    <span className="text-lg font-bold leading-none">{timeLeft.hours}</span>
                    <span className="text-[8px] text-white/60">SA</span>
                </div>
                <span className="text-lg font-bold leading-none opacity-50">:</span>
                <div className="flex flex-col items-center">
                    <span className="text-lg font-bold leading-none">{timeLeft.minutes}</span>
                    <span className="text-[8px] text-white/60">DK</span>
                </div>
            </div>
        </div>
    );
}