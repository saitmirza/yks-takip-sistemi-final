import React, { useState, useEffect } from 'react';
import { Clock, Target, Flame, Calendar } from 'lucide-react';

export default function Countdown() {
    const [selectedExam, setSelectedExam] = useState('TYT');
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
    const [progress, setProgress] = useState(0);
    const [quote, setQuote] = useState("");

    // --- AYARLAR ---
    // Not: Tarihler tahmini 2026 tarihleridir, ÖSYM açıkladıkça güncellenebilir.
    const EXAMS = {
        MSU: { date: new Date(2026, 2, 29, 10, 15, 0).getTime(), label: "MSÜ" }, // Mart (Tahmini)
        TYT: { date: new Date(2026, 5, 20, 10, 15, 0).getTime(), label: "TYT" }, // Haziran (Tahmini)
        AYT: { date: new Date(2026, 5, 21, 10, 15, 0).getTime(), label: "AYT" }  // Haziran Ertesi
    };

    // Sınav maratonunun başlangıcı (Genelde Eylül başı kabul edilir - İlerleme çubuğu için)
    const START_DATE = new Date(2025, 8, 1).getTime(); 

    const QUOTES = [
        "Acı geçici, zafer kalıcıdır.",
        "Bugün çalışmazsan yarın ağlarsın.",
        "Hayallerin bahanelerinden büyük olsun.",
        "Odaklan, Hızlan, Kazan.",
        "Disiplin özgürlüktür.",
        "Rakibin şu an çalışıyor.",
        "Pes etmek yok, mola vermek var.",
	"Zorlandığın yer, geliştiğin yerdir.",
    ];

    useEffect(() => {
        // Rastgele motivasyon sözü seç
        setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);

        const timer = setInterval(() => {
            const now = new Date().getTime();
            const target = EXAMS[selectedExam].date;
            const distance = target - now;

            // İlerleme Çubuğu Hesabı
            const totalDuration = target - START_DATE;
            const passedDuration = now - START_DATE;
            let percent = Math.round((passedDuration / totalDuration) * 100);
            if (percent < 0) percent = 0;
            if (percent > 100) percent = 100;
            setProgress(percent);

            if (distance < 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0 });
            } else {
                setTimeLeft({
                    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
                });
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [selectedExam]);

    return (
        <div className="mx-3 mt-4 mb-6">
            {/* Ana Kart */}
            <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-4 relative overflow-hidden group">
                
                {/* Arka Plan Efekti */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/10 rounded-full blur-2xl -mr-6 -mt-6 transition-all group-hover:bg-indigo-500/20"></div>

                {/* Üst Sekmeler (Sınav Seçimi) */}
                <div className="flex justify-center gap-1 mb-3 bg-slate-900/50 p-1 rounded-xl">
                    {Object.keys(EXAMS).map(exam => (
                        <button
                            key={exam}
                            onClick={() => setSelectedExam(exam)}
                            className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg transition-all ${
                                selectedExam === exam 
                                ? 'bg-indigo-600 text-white shadow-sm' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                        >
                            {EXAMS[exam].label}
                        </button>
                    ))}
                </div>

                {/* Sayaç */}
                <div className="text-center mb-3">
                    <div className="flex justify-center gap-3 text-white font-mono">
                        <div className="flex flex-col items-center">
                            <span className="text-2xl font-bold leading-none tracking-tight">{timeLeft.days}</span>
                            <span className="text-[9px] text-indigo-300 font-bold mt-0.5">GÜN</span>
                        </div>
                        <span className="text-xl font-bold leading-none opacity-30 mt-1">:</span>
                        <div className="flex flex-col items-center">
                            <span className="text-xl font-bold leading-none text-slate-300">{timeLeft.hours}</span>
                            <span className="text-[9px] text-slate-500 mt-0.5">SA</span>
                        </div>
                        <span className="text-xl font-bold leading-none opacity-30 mt-1">:</span>
                        <div className="flex flex-col items-center">
                            <span className="text-xl font-bold leading-none text-slate-300">{timeLeft.minutes}</span>
                            <span className="text-[9px] text-slate-500 mt-0.5">DK</span>
                        </div>
                    </div>
                </div>

                {/* İlerleme Çubuğu */}
                <div className="relative h-1.5 w-full bg-slate-700 rounded-full overflow-hidden mb-2">
                    <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 font-medium px-0.5">
                    <span>Maraton</span>
                    <span>%{progress} Bitti</span>
                </div>

                {/* Motivasyon Sözü */}
                <div className="mt-3 pt-3 border-t border-slate-700/50 text-center">
                    <p className="text-[10px] text-slate-400 italic leading-relaxed">
                        "{quote}"
                    </p>
                </div>
            </div>
        </div>
    );
}