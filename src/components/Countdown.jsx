import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function Countdown() {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

    useEffect(() => {
        // HEDEF TARİHİ GÜNCELLEDİK: 20 Haziran 2026 (Tahmini YKS 2026)
        // Format: Yıl, Ay (0=Ocak...5=Haziran), Gün, Saat, Dakika
        const examDate = new Date(2026, 5, 20, 10, 15, 0).getTime(); 

        const calculateTime = () => {
            const now = new Date().getTime();
            const distance = examDate - now;

            // Eğer tarih geçmişse 0 göster, değilse hesapla
            if (distance < 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0 });
            } else {
                setTimeLeft({
                    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
                });
            }
        };

        // İlk açılışta hesapla
        calculateTime();

        // Her saniye güncelle
        const timer = setInterval(calculateTime, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="bg-indigo-500/20 rounded-xl p-3 text-center border border-indigo-500/30 mx-4 mt-2 mb-4 backdrop-blur-sm">
            <div className="text-[10px] text-indigo-200 uppercase font-bold tracking-widest mb-1 flex justify-center items-center gap-1">
                <Clock size={10}/> YKS 2026
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