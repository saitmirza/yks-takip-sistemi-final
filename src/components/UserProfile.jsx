import React, { useState } from 'react';
import { User, Camera, Quote, Check, Medal, Lock, Image as ImageIcon } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID, PROFILE_COVERS } from '../utils/constants';
import { resizeAndCompressImage } from '../utils/helpers';
import { BADGE_DEFINITIONS, calculateUserBadges } from '../utils/badges.jsx';

export default function UserProfile({ currentUser, setCurrentUser, myScores, questions }) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
      avatar: currentUser.avatar || "🎓",
      base64Avatar: currentUser.base64Avatar || "",
      statusMessage: currentUser.statusMessage || "",
      showcaseBadges: currentUser.showcaseBadges || [],
      coverImage: currentUser.coverImage || PROFILE_COVERS[0]
  });

  const earnedBadgesList = calculateUserBadges(myScores || [], questions || [], currentUser.internalId);
  const earnedIds = earnedBadgesList.map(b => b.id);
  const avatarOptions = ["🎓", "📚", "✏️", "🧠", "🚀", "🦁", "🦉", "🦄", "⚽", "🎵", "🎨", "💻", "🔥", "⚡"];

  const handleSave = async (e) => {
      e.preventDefault();
      if (currentUser.isDemo) { alert("Demo hesapta değişiklik yapılamaz."); return; }
      setIsLoading(true);
      try {
          const updateData = {
              avatar: formData.avatar, base64Avatar: formData.base64Avatar,
              statusMessage: formData.statusMessage, showcaseBadges: formData.showcaseBadges,
              coverImage: formData.coverImage
          };
          await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email), updateData);
          const updatedUser = { ...currentUser, ...updateData };
          setCurrentUser(updatedUser); localStorage.setItem('examApp_session', JSON.stringify(updatedUser));
          alert("Profilin güncellendi!");
      } catch (error) { console.error(error); alert("Hata oluştu."); }
      setIsLoading(false);
  };

  const handleFileChange = async (e) => {
      const file = e.target.files[0];
      if (file) { const resized = await resizeAndCompressImage(file); setFormData(p => ({ ...p, base64Avatar: resized, avatar: "" })); }
  };

  const toggleBadge = (badgeId) => {
      if (!earnedIds.includes(badgeId)) return;
      setFormData(prev => {
          const current = prev.showcaseBadges || [];
          if (current.includes(badgeId)) return { ...prev, showcaseBadges: current.filter(id => id !== badgeId) };
          else return (current.length >= 3) ? prev : { ...prev, showcaseBadges: [...current, badgeId] };
      });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 mb-20">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-slate-100 dark:border-gray-700 p-8 transition-colors">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><User className="text-indigo-600 dark:text-indigo-400"/> Profil Vitrini</h2>
            <form onSubmit={handleSave} className="space-y-8">
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2"><ImageIcon size={14}/> Kapak Fotoğrafı</label>
                    <div className="h-32 rounded-2xl overflow-hidden relative border border-slate-200 dark:border-gray-600">
                        <img src={formData.coverImage} className="w-full h-full object-cover" alt="Seçili Kapak" />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white font-bold text-sm backdrop-blur-[1px]">{formData.statusMessage || "Durum Mesajın Burada Görünecek"}</div>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {PROFILE_COVERS.map((cover, i) => (
                            <button key={i} type="button" onClick={() => setFormData(p => ({ ...p, coverImage: cover }))} className={`relative h-12 rounded-lg overflow-hidden transition-all hover:scale-105 ${formData.coverImage === cover ? 'ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-gray-800' : 'opacity-70 hover:opacity-100'}`}>
                                <img src={cover} className="w-full h-full object-cover" alt={`Kapak ${i}`} />
                                {formData.coverImage === cover && <div className="absolute inset-0 bg-indigo-500/40 flex items-center justify-center text-white"><Check size={16} /></div>}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col items-center gap-6 pb-6 border-b border-slate-100 dark:border-gray-700 pt-4">
                    <div className="w-24 h-24 rounded-3xl bg-slate-50 dark:bg-gray-700 border-4 border-white dark:border-gray-600 shadow-xl overflow-hidden flex items-center justify-center text-4xl relative group cursor-pointer">
                        {formData.base64Avatar ? <img src={formData.base64Avatar} className="w-full h-full object-cover"/> : formData.avatar}
                        <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white"><Camera size={24} className="mb-1"/><span className="text-[9px] font-bold uppercase">Değiştir</span><input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={currentUser.isDemo}/></label>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                        {avatarOptions.map(emoji => (<button key={emoji} type="button" onClick={() => setFormData(p => ({ ...p, avatar: emoji, base64Avatar: "" }))} className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border transition-all hover:scale-110 ${formData.avatar === emoji && !formData.base64Avatar ? 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-500' : 'bg-white dark:bg-gray-700 border-slate-200 dark:border-gray-600'}`}>{emoji}</button>))}
                    </div>
                </div>

                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2"><Quote size={14}/> Durum Mesajı</label><input type="text" placeholder="Örn: Hedef ODTÜ Bilgisayar 🚀" value={formData.statusMessage} onChange={e => setFormData({...formData, statusMessage: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors"/></div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center"><label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2"><Medal size={14}/> Vitrin Rozetleri (Max 3)</label><span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{formData.showcaseBadges?.length || 0}/3 Seçildi</span></div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {BADGE_DEFINITIONS.map(badge => {
                            const isEarned = earnedIds.includes(badge.id);
                            const isSelected = formData.showcaseBadges?.includes(badge.id);
                            return (
                                <button key={badge.id} type="button" onClick={() => toggleBadge(badge.id)} disabled={!isEarned} className={`p-3 rounded-xl border flex flex-col gap-2 transition-all text-left relative overflow-hidden h-full ${isEarned ? (isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white dark:bg-gray-700 border-slate-200 dark:border-gray-600 hover:border-indigo-300') : 'bg-slate-50 dark:bg-gray-800/50 border-slate-100 dark:border-gray-700 opacity-50 cursor-not-allowed grayscale'}`}>
                                    <div className="flex justify-between items-start w-full"><div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm ${isEarned ? badge.color : 'bg-slate-400 dark:bg-gray-600'}`}>{badge.icon}</div>{isSelected && <div className="text-indigo-600 dark:text-indigo-400"><Check size={16}/></div>}{!isEarned && <div className="text-slate-400 dark:text-gray-500"><Lock size={16}/></div>}</div>
                                    <div><div className="text-xs font-bold text-slate-700 dark:text-gray-200 truncate">{badge.title}</div><div className="text-[10px] text-slate-500 dark:text-gray-400 leading-tight mt-1">{badge.desc}</div></div>
                                </button>
                            )
                        })}
                    </div>
                </div>
                <button disabled={isLoading || currentUser.isDemo} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-xl shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98] disabled:opacity-50">{isLoading ? 'Kaydediliyor...' : 'Profilimi Güncelle'}</button>
            </form>
        </div>
    </div>
  );
}