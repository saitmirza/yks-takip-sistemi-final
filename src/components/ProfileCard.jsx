import React from 'react';
import { X, Medal, TrendingUp, BookOpen, Quote, Calendar, Check } from 'lucide-react';
import { calculateUserBadges, BADGE_DEFINITIONS } from '../utils/badges.jsx';
import { PROFILE_COVERS } from '../utils/constants';

export default function ProfileCard({ user, onClose, stats, userScores, questions }) {
  if (!user) return null;

  const coverImage = user.coverImage || PROFILE_COVERS[0];

  // Rozetleri Hesapla (User objesi gönderiliyor)
  const earnedBadges = calculateUserBadges(userScores || [], questions || [], user);
  
  const showcaseBadges = user.showcaseBadges && user.showcaseBadges.length > 0
      ? BADGE_DEFINITIONS.filter(b => user.showcaseBadges.includes(b.id))
      : earnedBadges.slice(0, 3);

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
            
            <button onClick={onClose} className="absolute top-4 right-4 z-20 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md transition-colors">
                <X size={20}/>
            </button>

            {/* Kapak Fotoğrafı */}
            <div className="h-32 bg-gray-200 relative">
                <img src={coverImage} className="w-full h-full object-cover opacity-100" alt="Kapak" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            </div>

            <div className="px-6 pb-8 -mt-12 relative">
                <div className="flex justify-between items-end">
                    <div className="w-24 h-24 rounded-3xl bg-white dark:bg-gray-900 p-1 shadow-lg">
                        <div className="w-full h-full bg-slate-100 dark:bg-gray-800 rounded-2xl overflow-hidden flex items-center justify-center text-4xl border border-slate-200 dark:border-gray-700">
                            {user.base64Avatar ? <img src={user.base64Avatar} className="w-full h-full object-cover"/> : user.avatar || "👤"}
                        </div>
                    </div>
                    <div className="mb-2 flex flex-col items-end gap-1">
                        {user.isAdmin && <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">YÖNETİCİ</span>}
                        {!user.isAdmin && (
                            <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1">
                                <Medal size={12}/> {earnedBadges.length} Başarım
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-3">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{user.realName || "İsimsiz"}</h2>
                    <p className="text-slate-500 dark:text-gray-400 font-medium text-sm">@{user.username || "kullanici"}</p>
                    
                    {user.statusMessage && (
                        <div className="mt-3 bg-slate-50 dark:bg-gray-800 p-3 rounded-xl border border-slate-100 dark:border-gray-700 text-sm text-slate-600 dark:text-gray-300 italic flex gap-2">
                            <Quote size={16} className="text-slate-400 flex-shrink-0"/>
                            {user.statusMessage}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-3 mt-6">
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-2xl text-center border border-orange-100 dark:border-orange-800">
                        <div className="text-orange-500 mb-1 flex justify-center"><TrendingUp size={20}/></div>
                        <div className="font-bold text-slate-800 dark:text-white text-sm">{stats?.bestRank || "-"}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">En İyi</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl text-center border border-blue-100 dark:border-blue-800">
                        <div className="text-blue-500 mb-1 flex justify-center"><BookOpen size={20}/></div>
                        <div className="font-bold text-slate-800 dark:text-white text-sm">{stats?.examCount || 0}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Deneme</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-2xl text-center border border-purple-100 dark:border-purple-800">
                        <div className="text-purple-500 mb-1 flex justify-center"><Calendar size={20}/></div>
                        <div className="font-bold text-slate-800 dark:text-white text-xs pt-1 truncate">{stats?.lastExamDate || "-"}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold mt-1">Son</div>
                    </div>
                </div>

                {showcaseBadges.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-1"><Medal size={14}/> Vitrin</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {showcaseBadges.map((badge, i) => (
                                <div key={i} className={`p-2 rounded-xl flex flex-col items-center gap-1 text-center shadow-sm border border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm text-sm ${badge.color}`}>
                                        {badge.icon}
                                    </div>
                                    <div className="text-[9px] font-bold text-slate-700 dark:text-gray-300 leading-tight truncate w-full">{badge.title}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}