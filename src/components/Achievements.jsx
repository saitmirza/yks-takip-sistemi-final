import React from 'react';
import { Medal, Lock, Trophy } from 'lucide-react';
import { BADGE_DEFINITIONS, calculateUserBadges } from '../utils/badges.jsx';

export default function Achievements({ myScores, currentUser, questions }) {
  
  // DÜZELTME: Parametreler sırasıyla (scores, questions, userId)
  // Bu sayede helper fonksiyonu kimin soru sorduğunu kontrol edebilir.
  const earnedBadges = calculateUserBadges(myScores, questions, currentUser.internalId);
  
  const earnedIds = earnedBadges.map(b => b.id);
  const progress = Math.round((earnedBadges.length / BADGE_DEFINITIONS.length) * 100);

  return (
    <div className="max-w-6xl mx-auto space-y-8 mb-20">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
            <div className="relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold flex items-center gap-3">
                            <Medal size={32} className="text-yellow-300"/> Başarı Müzesi
                        </h2>
                        <p className="text-indigo-100 mt-2 text-sm md:text-base">
                            Denemelere gir, soru sor, arkadaşlarına yardım et ve rozetleri topla!
                        </p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm text-center min-w-[120px]">
                        <div className="text-3xl font-bold text-yellow-300">{earnedBadges.length}</div>
                        <div className="text-xs font-bold uppercase tracking-wider opacity-80">Kazanılan</div>
                    </div>
                </div>
                
                <div className="mt-8">
                    <div className="flex justify-between text-xs font-bold mb-2 uppercase tracking-wide opacity-90">
                        <span>Koleksiyon Durumu</span>
                        <span>%{progress} Tamamlandı ({earnedBadges.length}/{BADGE_DEFINITIONS.length})</span>
                    </div>
                    <div className="w-full bg-black/20 rounded-full h-3 overflow-hidden border border-white/10">
                        <div 
                            className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full transition-all duration-1000 shadow-[0_0_10px_rgba(250,204,21,0.5)]" 
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {BADGE_DEFINITIONS.map((badge) => {
                const isUnlocked = earnedIds.includes(badge.id);
                return (
                    <div 
                        key={badge.id} 
                        className={`relative p-5 rounded-2xl border transition-all duration-300 group overflow-hidden flex flex-col gap-3
                            ${isUnlocked 
                                ? 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1' 
                                : 'bg-slate-50 border-slate-100 opacity-60 grayscale hover:opacity-80'
                            }`}
                    >
                        {!isUnlocked && (
                            <div className="absolute top-3 right-3 text-slate-300">
                                <Lock size={16}/>
                            </div>
                        )}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm text-xl ${isUnlocked ? badge.color : 'bg-slate-300'}`}>
                            {badge.icon}
                        </div>
                        <div>
                            <h3 className={`font-bold text-sm truncate ${isUnlocked ? 'text-slate-800' : 'text-slate-500'}`}>
                                {badge.title}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 leading-snug line-clamp-2">
                                {badge.desc}
                            </p>
                        </div>
                        {isUnlocked && (
                            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-gradient-to-br from-white/0 to-indigo-500/10 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
  );
}