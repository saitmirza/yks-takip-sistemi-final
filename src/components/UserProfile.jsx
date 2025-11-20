import React, { useState } from 'react';
import { User, Lock, Camera, AlertCircle, Quote } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { resizeAndCompressImage } from '../utils/helpers';

export default function UserProfile({ currentUser, setCurrentUser }) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
      username: currentUser.username,
      realName: currentUser.realName,
      s12Avg: currentUser.s12Avg,
      avatar: currentUser.avatar || "🎓",
      base64Avatar: currentUser.base64Avatar || "",
      statusMessage: currentUser.statusMessage || "", // Yeni
      newPassword: ""
  });

  const avatarOptions = ["🎓", "📚", "✏️", "🧠", "🚀", "🦁", "🦉", "🦄", "⚽", "🎵", "🎨", "💻", "🔥", "⚡", "👽", "👾"];

  const handleSave = async (e) => {
      e.preventDefault();
      if (currentUser.isDemo) { alert("Demo hesapta değişiklik yapılamaz."); return; }
      
      setIsLoading(true);
      try {
          const updateData = {
              username: formData.username,
              realName: formData.realName,
              s12Avg: Number(formData.s12Avg),
              avatar: formData.avatar,
              base64Avatar: formData.base64Avatar,
              statusMessage: formData.statusMessage
          };

          if (formData.newPassword && formData.newPassword.length >= 6) {
              updateData.password = formData.newPassword;
          }

          await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email), updateData);
          
          const updatedUser = { ...currentUser, ...updateData };
          setCurrentUser(updatedUser);
          localStorage.setItem('examApp_session', JSON.stringify(updatedUser));
          
          alert("Profil başarıyla güncellendi!");
          setFormData(p => ({ ...p, newPassword: "" }));
      } catch (error) {
          console.error(error);
          alert("Bir hata oluştu.");
      }
      setIsLoading(false);
  };

  const handleFileChange = async (e) => {
      const file = e.target.files[0];
      if (file) {
          const resized = await resizeAndCompressImage(file);
          setFormData(p => ({ ...p, base64Avatar: resized, avatar: "" }));
      }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-10">
        <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2"><User className="text-indigo-600"/> Profilini Düzenle</h2>
        <p className="text-slate-500 text-sm mb-8">Arkadaşların seni burada düzenlediğin gibi görecek.</p>

        {currentUser.isDemo && (
            <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl mb-6 flex items-center gap-3 border border-yellow-200 text-sm font-medium">
                <AlertCircle size={18}/> Demo hesapta yapılan değişiklikler kaydedilmez.
            </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
            {/* AVATAR SEÇİMİ */}
            <div className="flex flex-col items-center gap-6 border-b border-slate-100 pb-8">
                <div className="w-32 h-32 rounded-3xl bg-slate-50 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center text-5xl relative group cursor-pointer">
                    {formData.base64Avatar ? <img src={formData.base64Avatar} className="w-full h-full object-cover"/> : formData.avatar}
                    
                    {/* Overlay */}
                    <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 text-white">
                        <Camera size={28} className="mb-1"/>
                        <span className="text-[10px] font-bold uppercase tracking-wide">Değiştir</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={currentUser.isDemo}/>
                    </label>
                </div>
                
                {/* Emojiler */}
                <div className="flex flex-wrap justify-center gap-3 px-4">
                    {avatarOptions.map(emoji => (
                        <button
                            key={emoji}
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, avatar: emoji, base64Avatar: "" }))}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border transition-all hover:scale-110 hover:shadow-md ${formData.avatar === emoji && !formData.base64Avatar ? 'bg-indigo-100 border-indigo-500 shadow-indigo-100' : 'bg-white border-slate-200'}`}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            </div>

            {/* KİŞİSEL BİLGİLER */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kullanıcı Adı</label>
                    <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors font-medium"/>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gerçek Ad Soyad</label>
                    <input type="text" value={formData.realName} onChange={e => setFormData({...formData, realName: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors font-medium"/>
                </div>
                <div className="space-y-2 col-span-full">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Quote size={14}/> Durum Mesajı (Bio)</label>
                    <input type="text" placeholder="Örn: Hedef ODTÜ Bilgisayar 🚀" value={formData.statusMessage} onChange={e => setFormData({...formData, statusMessage: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"/>
                </div>
                <div className="space-y-2 col-span-full">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Lock size={14}/> Yeni Şifre</label>
                     <input type="password" placeholder="Değiştirmek istemiyorsanız boş bırakın" value={formData.newPassword} onChange={e => setFormData({...formData, newPassword: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"/>
                </div>
            </div>

            {/* OBP AYARLARI */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-700 text-sm">Okul Ortalamaları (OBP)</h3>
                </div>
                <div className="grid grid-cols-4 gap-3 text-center">
                    {[9,10,11].map((g) => (
                        <div key={g}>
                            <div className="text-[10px] text-slate-400 mb-1 font-bold uppercase">{g}. Sınıf</div>
                            <div className="p-3 bg-slate-200 rounded-xl text-slate-500 font-bold text-sm cursor-not-allowed opacity-70">
                                {currentUser[`s${g}Avg`]}
                            </div>
                        </div>
                    ))}
                    <div>
                        <div className="text-[10px] text-indigo-600 font-bold mb-1 uppercase">12. Sınıf</div>
                        <input 
                            type="number" 
                            className="w-full p-3 bg-white border-2 border-indigo-100 rounded-xl text-indigo-700 font-bold text-center outline-none focus:border-indigo-500 transition-colors"
                            value={formData.s12Avg}
                            onChange={e => setFormData({...formData, s12Avg: e.target.value})}
                            min="50" max="100"
                        />
                    </div>
                </div>
            </div>

            <button 
                disabled={isLoading || currentUser.isDemo}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
                {isLoading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
        </form>
    </div>
  );
}