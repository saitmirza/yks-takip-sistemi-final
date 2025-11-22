import React, { useState } from 'react';
import { Lock, AlertCircle, Key, UserCog, Palette, Check } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID, COLOR_THEMES } from '../utils/constants';
import { Bell } from 'lucide-react';

export default function AccountSettings({ currentUser, setCurrentUser }) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
      username: currentUser.username,
      realName: currentUser.realName,
      s12Avg: currentUser.s12Avg,
      newPassword: "",
      themeColor: currentUser.themeColor || "indigo"
  });

  const handleSave = async (e) => {
      e.preventDefault();
      if (currentUser.isDemo) { alert("Demo hesapta değişiklik yapılamaz."); return; }
      
      setIsLoading(true);
      try {
          const updateData = {
              username: formData.username,
              realName: formData.realName,
              s12Avg: Number(formData.s12Avg),
              themeColor: formData.themeColor // Sadece renk teması güncelleniyor
          };

          if (formData.newPassword && formData.newPassword.length >= 6) {
              updateData.password = formData.newPassword;
          }

          await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email), updateData);
          
          const updatedUser = { ...currentUser, ...updateData };
          setCurrentUser(updatedUser);
          localStorage.setItem('examApp_session', JSON.stringify(updatedUser));
          
          alert("Ayarlar kaydedildi! 🎨");
          setFormData(p => ({ ...p, newPassword: "" }));
      } catch (error) {
          console.error(error);
          alert("Bir hata oluştu.");
      }
      setIsLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto bg-slate-800/50 backdrop-blur-md rounded-3xl shadow-lg border border-slate-700 p-8 mb-20">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><UserCog className="text-slate-300"/> Hesap ve Görünüm</h2>

        {currentUser.isDemo && (
            <div className="bg-yellow-900/30 text-yellow-200 p-4 rounded-xl mb-6 flex items-center gap-3 border border-yellow-700/50 text-sm font-medium">
                <AlertCircle size={18}/> Demo hesapta değişiklik yapılamaz.
            </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
            
            {/* GÖRÜNÜM */}
            <div className="space-y-4">
{/* Bildirim İzni */}
<div className="flex items-center justify-between bg-slate-50 dark:bg-gray-700 p-4 rounded-xl border border-slate-200 dark:border-gray-600 cursor-pointer mb-4" onClick={() => Notification.requestPermission().then(p => alert(p === 'granted' ? "Bildirimler açıldı! 🎉" : "Bildirim izni reddedildi."))}>
    <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
            <Bell size={20}/>
        </div>
        <div>
            <div className="text-sm font-bold text-slate-700 dark:text-white">Bildirim İzni</div>
            <div className="text-xs text-slate-400">Sınav ve sohbet bildirimlerini al</div>
        </div>
    </div>
    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
        {Notification.permission === 'granted' ? 'Açık' : 'Kapalı'}
    </div>
</div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700 pb-2">Görünüm</h3>
                <div>
                    <label className="text-xs font-bold text-slate-400 mb-3 block flex items-center gap-2"><Palette size={14}/> Tema Rengi</label>
                    <div className="flex flex-wrap gap-3">
                        {Object.entries(COLOR_THEMES).map(([key, theme]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setFormData({...formData, themeColor: key})}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-sm border-2 ${formData.themeColor === key ? 'border-white scale-110' : 'border-transparent'}`}
                                style={{ backgroundColor: theme.primary }}
                                title={theme.label}
                            >
                                {formData.themeColor === key && <Check size={16} className="text-white"/>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* KİŞİSEL BİLGİLER */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700 pb-2 mt-6">Kişisel Bilgiler</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400">Kullanıcı Adı</label>
                        <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-500 transition-colors text-white"/>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400">Gerçek Ad</label>
                        <input type="text" value={formData.realName} onChange={e => setFormData({...formData, realName: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-500 transition-colors text-white"/>
                    </div>
                </div>

                <div className="p-4 bg-slate-700/50 rounded-xl border border-slate-600 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-300">12. Sınıf OBP Ortalaması</span>
                    <input 
                        type="number" 
                        className="w-24 p-2 bg-slate-900 border-2 border-slate-600 rounded-lg text-white font-bold text-center outline-none focus:border-slate-400"
                        value={formData.s12Avg}
                        onChange={e => setFormData({...formData, s12Avg: e.target.value})}
                        min="50" max="100"
                    />
                </div>

                <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-400 flex items-center gap-2"><Key size={14}/> Şifre Değiştir</label>
                     <input type="password" placeholder="Değişmeyecekse boş bırakın" value={formData.newPassword} onChange={e => setFormData({...formData, newPassword: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-500 transition-colors text-white"/>
                </div>
            </div>

            <button 
                disabled={isLoading || currentUser.isDemo}
                className="w-full bg-black hover:bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed border border-slate-800"
            >
                {isLoading ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
            </button>
        </form>
    </div>
  );
}