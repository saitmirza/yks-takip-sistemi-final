import React, { useState } from 'react';
import { Lock, Save, AlertCircle, Key, UserCog } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';

export default function AccountSettings({ currentUser, setCurrentUser }) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
      username: currentUser.username,
      realName: currentUser.realName,
      s12Avg: currentUser.s12Avg,
      newPassword: ""
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
          };

          if (formData.newPassword && formData.newPassword.length >= 6) {
              updateData.password = formData.newPassword;
          }

          await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email), updateData);
          
          const updatedUser = { ...currentUser, ...updateData };
          setCurrentUser(updatedUser);
          localStorage.setItem('examApp_session', JSON.stringify(updatedUser));
          
          alert("Hesap ayarları güncellendi!");
          setFormData(p => ({ ...p, newPassword: "" }));
      } catch (error) {
          console.error(error);
          alert("Bir hata oluştu.");
      }
      setIsLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2"><UserCog className="text-slate-600"/> Hesap Ayarları</h2>

        {currentUser.isDemo && (
            <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl mb-6 flex items-center gap-3 border border-yellow-200 text-sm font-medium">
                <AlertCircle size={18}/> Demo hesapta değişiklik yapılamaz.
            </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kullanıcı Adı</label>
                <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"/>
            </div>
            
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gerçek Ad Soyad</label>
                <input type="text" value={formData.realName} onChange={e => setFormData({...formData, realName: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"/>
            </div>

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

            <div className="space-y-2 pt-4 border-t border-slate-100">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Key size={14}/> Şifre Değiştir</label>
                 <input type="password" placeholder="Değiştirmek istemiyorsanız boş bırakın" value={formData.newPassword} onChange={e => setFormData({...formData, newPassword: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"/>
            </div>

            <button 
                disabled={isLoading || currentUser.isDemo}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? 'Kaydediliyor...' : 'Ayarları Güncelle'}
            </button>
        </form>
    </div>
  );
}