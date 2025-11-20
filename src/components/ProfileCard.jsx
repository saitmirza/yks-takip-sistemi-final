import React from 'react';
import { X, Medal, TrendingUp, BookOpen, Quote, Calendar } from 'lucide-react';

export default function ProfileCard({ user, onClose, stats, badges }) {
  if (!user) return null;

  // Rastgele bir kapak fotoğrafı seçelim (Sınıfına göre)
  const covers = [
      "https://images.unsplash.com/photo-1513258496098-43a3d2da3988?auto=format&fit=crop&w=800&q=80", // Uzay
      "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80", // Kitap
      "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=800&q=80", // Kütüphane
      "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80"  // Teknoloji
  ];
  const coverImage = covers[user.username.length % covers.length];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            
            {/* Kapatma Butonu */}
            <button onClick={onClose} className="absolute top-4 right-4 z-20 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md transition-colors">
                <X size={20}/>
            </button>

            {/* Kapak Fotoğrafı */}
            <div className="h-32 bg-gray-200 relative">
                <img src={coverImage} className="w-full h-full object-cover opacity-90" alt="Kapak" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            </div>

            {/* Profil Bilgileri */}
            <div className="px-6 pb-8 -mt-12 relative">
                {/* Avatar */}
                <div className="flex justify-between items-end">
                    <div className="w-24 h-24 rounded-3xl bg-white p-1 shadow-lg">
                        <div className="w-full h-full bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center text-4xl border border-slate-200">
                            {user.base64Avatar ? <img src={user.base64Avatar} className="w-full h-full object-cover"/> : user.avatar || "👤"}
                        </div>
                    </div>
                    {/* Admin/Demo Rozeti */}
                    <div className="mb-2">
                        {user.isAdmin && <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">YÖNETİCİ</span>}
                        {user.isDemo && <span className="bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-bold shadow-md">DEMO</span>}
                        {!user.isAdmin && !user.isDemo && <span className="bg-indigo-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">ÖĞRENCİ</span>}
                    </div>
                </div>

                {/* İsim & Durum */}
                <div className="mt-3">
                    <h2 className="text-2xl font-bold text-slate-800">{user.realName}</h2>
                    <p className="text-slate-500 font-medium text-sm">@{user.username}</p>
                    
                    {user.statusMessage && (
                        <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm text-slate-600 italic flex gap-2">
                            <Quote size={16} className="text-slate-400 flex-shrink-0"/>
                            {user.statusMessage}
                        </div>
                    )}
                </div>

                {/* İstatistikler */}
                <div className="grid grid-cols-3 gap-3 mt-6">
                    <div className="bg-orange-50 p-3 rounded-2xl text-center border border-orange-100">
                        <div className="text-orange-500 mb-1 flex justify-center"><TrendingUp size={20}/></div>
                        <div className="font-bold text-slate-800">{stats?.bestRank || "-"}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">En İyi Sıra</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-2xl text-center border border-blue-100">
                        <div className="text-blue-500 mb-1 flex justify-center"><BookOpen size={20}/></div>
                        <div className="font-bold text-slate-800">{stats?.examCount || 0}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Deneme</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-2xl text-center border border-purple-100">
                        <div className="text-purple-500 mb-1 flex justify-center"><Calendar size={20}/></div>
                        <div className="font-bold text-slate-800 text-xs pt-1">{stats?.lastExamDate || "-"}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold mt-1">Son Sınav</div>
                    </div>
                </div>

                {/* Rozetler */}
                {badges && badges.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-1"><Medal size={14}/> Rozet Koleksiyonu</h3>
                        <div className="flex flex-wrap gap-2">
                            {badges.map((badge, i) => (
                                <div key={i} className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm text-lg ${badge.color}`} title={badge.title}>
                                    {badge.icon}
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