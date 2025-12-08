import React, { useState } from 'react';
import { Lock, AlertCircle, Key, UserCog, Palette, Check, Plus, Trash2, Paintbrush } from 'lucide-react';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID, COLOR_THEMES } from '../utils/constants';
import { Bell } from 'lucide-react';

export default function AccountSettings({ currentUser, setCurrentUser }) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'custom'
  
  // Custom Theme State
  const [customName, setCustomName] = useState("");
  const [customPrimary, setCustomPrimary] = useState("#6366f1");
  const [customStart, setCustomStart] = useState("#0f172a");
  const [customEnd, setCustomEnd] = useState("#312e81");

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
              themeColor: formData.themeColor 
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
      } catch (error) { console.error(error); alert("Bir hata oluştu."); }
      setIsLoading(false);
  };

  // ÖZEL TEMA KAYDETME
  const handleSaveCustomTheme = async () => {
      if (!customName.trim()) return alert("Tema adı giriniz.");
      
      const newTheme = {
          id: `custom_${Date.now()}`,
          label: customName,
          primary: customPrimary,
          light: customPrimary + '20', // %20 opacity
          dark: customPrimary,
          gradient: `linear-gradient(to bottom right, ${customStart}, ${customEnd})`
      };

      try {
          const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email);
          await updateDoc(userRef, {
              customThemes: arrayUnion(newTheme),
              themeColor: newTheme.id // Oluşturunca direkt seç
          });

          // Local state güncelle
          const updatedUser = { 
              ...currentUser, 
              customThemes: [...(currentUser.customThemes || []), newTheme],
              themeColor: newTheme.id 
          };
          setCurrentUser(updatedUser);
          setFormData(p => ({ ...p, themeColor: newTheme.id }));
          
          setCustomName("");
          alert("Teman oluşturuldu ve uygulandı! 🎨");
      } catch (e) { console.error(e); }
  };

  // ÖZEL TEMA SİLME
  const handleDeleteTheme = async (theme) => {
      if(!confirm("Bu temayı silmek istiyor musun?")) return;
      try {
          const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email);
          await updateDoc(userRef, {
              customThemes: arrayRemove(theme)
          });
           // Eğer silinen tema seçiliyse varsayılana dön
           if (currentUser.themeColor === theme.id) {
               await updateDoc(userRef, { themeColor: 'indigo' });
               setCurrentUser(p => ({ ...p, themeColor: 'indigo', customThemes: p.customThemes.filter(t => t.id !== theme.id) }));
               setFormData(p => ({ ...p, themeColor: 'indigo' }));
           } else {
               setCurrentUser(p => ({ ...p, customThemes: p.customThemes.filter(t => t.id !== theme.id) }));
           }
      } catch (e) { console.error(e); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 mb-20">
        
        {currentUser.isDemo && (
            <div className="bg-yellow-900/30 text-yellow-200 p-4 rounded-xl flex items-center gap-3 border border-yellow-700/50 text-sm font-medium">
                <AlertCircle size={18}/> Demo hesapta değişiklik yapılamaz.
            </div>
        )}

        <form onSubmit={handleSave} className="bg-slate-800/50 backdrop-blur-md rounded-3xl shadow-lg border border-slate-700 p-8 space-y-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><UserCog className="text-slate-300"/> Hesap Ayarları</h2>
            
            {/* TEMA SEÇİCİ */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Palette size={14}/> Tema Seçimi</label>
                    <div className="flex bg-slate-700 rounded-lg p-1">
                        <button type="button" onClick={() => setActiveTab('catalog')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${activeTab === 'catalog' ? 'bg-slate-500 text-white' : 'text-slate-400'}`}>Katalog</button>
                        <button type="button" onClick={() => setActiveTab('custom')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${activeTab === 'custom' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Atölye ✨</button>
                    </div>
                </div>

                {activeTab === 'catalog' ? (
                    <div className="space-y-4">
                        {/* HAZIR TEMALAR */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {Object.entries(COLOR_THEMES).map(([key, theme]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setFormData({...formData, themeColor: key})}
                                    className={`relative h-16 rounded-xl overflow-hidden border-2 transition-all ${formData.themeColor === key ? 'border-white scale-105 shadow-xl' : 'border-transparent opacity-70 hover:opacity-100 hover:scale-105'}`}
                                    style={{ background: theme.gradient }}
                                    title={theme.label}
                                >
                                    <div className="absolute inset-0 flex items-center justify-center font-bold text-[10px] text-white/90 drop-shadow-md">{theme.label}</div>
                                    {formData.themeColor === key && <div className="absolute top-1 right-1 bg-white text-black rounded-full p-0.5"><Check size={10}/></div>}
                                </button>
                            ))}
                        </div>

                        {/* KULLANICININ ÖZEL TEMALARI */}
                        {currentUser.customThemes?.length > 0 && (
                            <>
                                <div className="text-xs font-bold text-slate-500 mt-4 mb-2">SENİN TASARIMLARIN</div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {currentUser.customThemes.map(theme => (
                                        <div key={theme.id} className="relative group">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({...formData, themeColor: theme.id})}
                                                className={`w-full h-16 rounded-xl overflow-hidden border-2 transition-all ${formData.themeColor === theme.id ? 'border-white scale-105 shadow-xl' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                                style={{ background: theme.gradient }}
                                            >
                                                <div className="absolute inset-0 flex items-center justify-center font-bold text-[10px] text-white/90 drop-shadow-md">{theme.label}</div>
                                                {formData.themeColor === theme.id && <div className="absolute top-1 right-1 bg-white text-black rounded-full p-0.5"><Check size={10}/></div>}
                                            </button>
                                            <button type="button" onClick={() => handleDeleteTheme(theme)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"><Trash2 size={12}/></button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    /* ÖZEL TEMA OLUŞTURUCU */
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-600 space-y-4">
                        <div className="h-24 rounded-xl flex items-center justify-center shadow-lg transition-all" style={{ background: `linear-gradient(to bottom right, ${customStart}, ${customEnd})` }}>
                            <button type="button" className="px-4 py-2 rounded-lg font-bold text-white shadow-lg" style={{ backgroundColor: customPrimary }}>Önizleme Butonu</button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Buton Rengi</label><div className="flex gap-2"><input type="color" value={customPrimary} onChange={e => setCustomPrimary(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"/><input type="text" value={customPrimary} onChange={e => setCustomPrimary(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded text-xs px-2 text-white"/></div></div>
                            <div><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Gradyan Başlangıç</label><div className="flex gap-2"><input type="color" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"/><input type="text" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded text-xs px-2 text-white"/></div></div>
                            <div><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Gradyan Bitiş</label><div className="flex gap-2"><input type="color" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"/><input type="text" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded text-xs px-2 text-white"/></div></div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <input type="text" placeholder="Tema Adı (Örn: Uzay Macerası)" value={customName} onChange={e => setCustomName(e.target.value)} className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"/>
                            <button type="button" onClick={handleSaveCustomTheme} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"><Plus size={16}/> Oluştur</button>
                        </div>
                    </div>
                )}
            </div>

            {/* KİŞİSEL BİLGİLER (Aynı) */}
            <div className="space-y-4 pt-4 border-t border-slate-700">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider pb-2">Kişisel Bilgiler</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-400">Kullanıcı Adı</label><input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-500 text-white"/></div>
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-400">Gerçek Ad</label><input type="text" value={formData.realName} onChange={e => setFormData({...formData, realName: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-500 text-white"/></div>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-xl border border-slate-600 flex justify-between items-center"><span className="text-sm font-bold text-slate-300">12. Sınıf OBP Ortalaması</span><input type="number" className="w-24 p-2 bg-slate-900 border-2 border-slate-600 rounded-lg text-white font-bold text-center outline-none focus:border-slate-400" value={formData.s12Avg} onChange={e => setFormData({...formData, s12Avg: e.target.value})} min="50" max="100"/></div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-400 flex items-center gap-2"><Key size={14}/> Şifre Değiştir</label><input type="password" placeholder="Değişmeyecekse boş bırakın" value={formData.newPassword} onChange={e => setFormData({...formData, newPassword: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-500 text-white"/></div>
            </div>

            <button disabled={isLoading || currentUser.isDemo} className="w-full bg-slate-100 hover:bg-white text-slate-900 font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed border-none">{isLoading ? 'Kaydediliyor...' : 'Tüm Ayarları Kaydet'}</button>
        </form>

        {/* Bildirim İzni */}
        <div className="flex items-center justify-between bg-slate-800/50 backdrop-blur-md p-4 rounded-xl border border-slate-700 cursor-pointer" onClick={() => Notification.requestPermission().then(p => alert(p === 'granted' ? "Bildirimler açıldı! 🎉" : "Bildirim izni reddedildi."))}>
            <div className="flex items-center gap-3"><div className="p-2 rounded-full bg-blue-900 text-blue-300"><Bell size={20}/></div><div><div className="text-sm font-bold text-white">Bildirim İzni</div><div className="text-xs text-slate-400">Sınav ve sohbet bildirimlerini al</div></div></div>
            <div className="text-xs font-bold text-indigo-400">{Notification.permission === 'granted' ? 'Açık' : 'Kapalı'}</div>
        </div>
    </div>
  );
}
