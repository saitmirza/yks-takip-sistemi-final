import React from 'react';
import { ShieldAlert, User, Lock, Mail, GraduationCap } from 'lucide-react';

const InputField = ({ icon: Icon, type, placeholder, value, onChange, colSpan = "col-span-1" }) => (
  <div className={`relative ${colSpan}`}>
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <Icon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
    </div>
    <input
      type={type}
      className="block w-full pl-10 pr-3 py-3 border border-slate-300 dark:border-slate-600 rounded-xl leading-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 sm:text-sm"
      placeholder={placeholder}
      value={value || ""}
      onChange={onChange}
    />
  </div>
);

export default function Auth({ authMode, setAuthMode, authInput, setAuthInput, authError, setAuthError, handleLogin, handleRegister }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      
      {/* KART: Daha belirgin, daha solid */}
      <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md relative z-10 border border-slate-200 dark:border-slate-700">
         
         <div className="text-center mb-8">
           <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-indigo-500/30">
                <GraduationCap size={32} />
           </div>
           <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight mb-2">YKS Ligi</h1>
           <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Sınıf içi rekabet ve analiz platformu</p>
         </div>
         
         <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-5">
           {authMode === 'login' && (
              <>
                <InputField icon={User} type="text" placeholder="Kullanıcı Adı veya E-posta" value={authInput.email} onChange={e => setAuthInput({...authInput, email: e.target.value})} colSpan="col-span-full"/>
                <InputField icon={Lock} type="password" placeholder="Şifre" value={authInput.password} onChange={e => setAuthInput({...authInput, password: e.target.value})} colSpan="col-span-full"/>
              </>
           )}
           
           {authMode === 'register' && (
             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <InputField icon={Mail} type="email" placeholder="E-posta" value={authInput.email} onChange={e => setAuthInput({...authInput, email: e.target.value})} />
                    <InputField icon={User} type="text" placeholder="Kullanıcı Adı" value={authInput.username} onChange={e => setAuthInput({...authInput, username: e.target.value})} />
                    <InputField icon={User} type="text" placeholder="Ad Soyad" value={authInput.realName} onChange={e => setAuthInput({...authInput, realName: e.target.value})} colSpan="col-span-2" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                     <InputField icon={Lock} type="password" placeholder="Şifre" value={authInput.password} onChange={e => setAuthInput({...authInput, password: e.target.value})} />
                     <InputField icon={Lock} type="password" placeholder="Tekrar" value={authInput.passwordConfirm} onChange={e => setAuthInput({...authInput, passwordConfirm: e.target.value})} />
                </div>
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Yıl Sonu Ortalamaları (OBP)</p>
                    <div className="grid grid-cols-4 gap-2">
                        {[9, 10, 11, 12].map(grade => (
                            <input key={grade} type="number" placeholder={`${grade}.`} className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg text-center text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 dark:text-white transition-colors" value={authInput[`s${grade}Avg`] || ""} onChange={e => setAuthInput({...authInput, [`s${grade}Avg`]: e.target.value})} />
                        ))}
                    </div>
                </div>
             </div>
           )}

           {authError && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl flex items-center gap-2 border border-red-200 dark:border-red-800 font-medium"><ShieldAlert size={16} /> {authError}</div>}
           
           <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-xl shadow-indigo-500/30 transition-all transform active:scale-[0.98]">
               {authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
           </button>
         </form>
         
         <div className="mt-6 text-center">
           <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(""); }} className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors">
              {authMode === 'login' ? 'Hesabın yok mu? Kayıt Ol' : 'Zaten hesabın var mı? Giriş Yap'}
           </button>
         </div>
      </div>
    </div>
  );
}