import React from 'react';
import { Medal, Star, Flame, Target, BookOpen, Crown, Zap, Lock } from 'lucide-react';

export default function Achievements({ myScores, currentUser }) {
  
  // --- ROZET TANIMLARI ---
  const badges = [
      {
          id: 'first_blood',
          title: 'İlk Adım',
          desc: 'İlk deneme sonucunu sisteme girdin.',
          icon: <FlagIcon />,
          color: 'bg-blue-500',
          check: () => myScores.length >= 1
      },
      {
          id: 'veteran',
          title: 'İstikrar Abidesi',
          desc: 'Toplam 5 deneme sınavına girdin.',
          icon: <BookOpen />,
          color: 'bg-indigo-500',
          check: () => myScores.length >= 5
      },
      {
          id: 'math_wizard',
          title: 'Matematik Büyücüsü',
          desc: 'Herhangi bir denemede 30+ Matematik (TYT) neti yaptın.',
          icon: <Zap />,
          color: 'bg-yellow-500',
          check: () => myScores.some(s => s.tyt?.math >= 30)
      },
      {
          id: 'science_geek',
          title: 'Fen Dehası',
          desc: 'Herhangi bir denemede 15+ Fen (TYT) neti yaptın.',
          icon: <Target />,
          color: 'bg-green-500',
          check: () => myScores.some(s => s.tyt?.science >= 15)
      },
      {
          id: 'elite_club',
          title: 'Elit Lig',
          desc: '400+ Yerleştirme puanına ulaştın.',
          icon: <Crown />,
          color: 'bg-purple-600',
          check: () => myScores.some(s => s.placementScore >= 400)
      },
      {
          id: 'on_fire',
          title: 'Alev Aldın!',
          desc: 'Son denemende sıralamanı yükselttin (veya korudun).',
          icon: <Flame />,
          color: 'bg-orange-500',
          check: () => {
              if (myScores.length < 2) return false;
              // Son iki denemeyi kıyasla (Basit mantık: Puan artışı)
              const latest = myScores[0]; // En yeni
              const prev = myScores[1];   // Bir önceki
              return latest.finalScore > prev.finalScore;
          }
      }
  ];

  // Kazanılan rozet sayısını hesapla
  const earnedCount = badges.filter(b => b.check()).length;
  const progress = Math.round((earnedCount / badges.length) * 100);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
        {/* Üst Bilgi Kartı */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
            <div className="relative z-10">
                <h2 className="text-3xl font-bold flex items-center gap-3">
                    <Medal size={32} className="text-yellow-300"/> Başarı Salonu
                </h2>
                <p className="text-indigo-100 mt-2">Denemelere gir, netlerini arttır, efsanevi rozetleri topla!</p>
                
                <div className="mt-6">
                    <div className="flex justify-between text-sm font-bold mb-2">
                        <span>Koleksiyon Durumu</span>
                        <span>%{progress} Tamamlandı ({earnedCount}/{badges.length})</span>
                    </div>
                    <div className="w-full bg-black/20 rounded-full h-4 overflow-hidden">
                        <div className="bg-yellow-400 h-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            </div>
        </div>

        {/* Rozet Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {badges.map((badge) => {
                const isUnlocked = badge.check();
                return (
                    <div 
                        key={badge.id} 
                        className={`relative p-6 rounded-2xl border transition-all duration-300 group overflow-hidden ${isUnlocked ? 'bg-white border-slate-200 shadow-lg hover:-translate-y-1' : 'bg-slate-50 border-slate-100 opacity-60 grayscale'}`}
                    >
                        {/* Kilit İkonu (Kilitliyse) */}
                        {!isUnlocked && (
                            <div className="absolute top-4 right-4 text-slate-300">
                                <Lock size={20}/>
                            </div>
                        )}

                        <div className="flex items-start gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md ${isUnlocked ? badge.color : 'bg-slate-300'}`}>
                                {React.cloneElement(badge.icon, { size: 28 })}
                            </div>
                            <div>
                                <h3 className={`font-bold text-lg ${isUnlocked ? 'text-slate-800' : 'text-slate-500'}`}>{badge.title}</h3>
                                <p className="text-sm text-slate-500 mt-1 leading-tight">{badge.desc}</p>
                            </div>
                        </div>
                        
                        {isUnlocked && (
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent opacity-50"></div>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
  );
}

// İkon Yardımcısı
const FlagIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
);