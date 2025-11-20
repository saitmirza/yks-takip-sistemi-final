import React from 'react';
import { Trophy, ShieldCheck, Calendar as CalendarIcon, User, BarChart3, List, MessageCircle, Settings, Search, LineChart as LineChartIcon, LogOut, HelpCircle, Timer, Medal, Calculator } from 'lucide-react';
import Countdown from './Countdown'; // Geri sayım bileşenini çağırdık

export default function Sidebar({ currentUser, activeTab, setActiveTab, handleLogout }) {
  const theme = currentUser?.isAdmin 
    ? { sidebar: "bg-gradient-to-b from-zinc-900 to-black", accent: "text-white" }
    : { sidebar: "bg-slate-900", accent: "text-yellow-400" };

  const AvatarDisplay = ({ user }) => {
     const avatarData = user?.base64Avatar || user?.avatar;
     const isBase64 = avatarData && avatarData.startsWith('data:');
     const src = isBase64 ? avatarData : (avatarData ? `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="60">${avatarData}</text></svg>` : `https://placehold.co/100x100/334155/ffffff?text=👤`);
     return <img src={src} alt="Avatar" className={`w-10 h-10 rounded-full object-cover border-2 border-slate-600`} />;
  };

  const NavButton = ({ id, icon, label }) => (
    <button onClick={() => setActiveTab(id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === id ? 'bg-white/10 shadow-inner text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
        {icon} <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className={`md:w-64 ${theme.sidebar} text-white flex flex-col flex-shrink-0 h-full min-h-screen transition-all duration-300`}>
      {/* ÜST KISIM: LOGO & PROFİL */}
      <div className="p-6 border-b border-white/10">
        <h1 className={`text-xl font-bold flex items-center gap-2 ${theme.accent}`}>
            {currentUser.isAdmin ? <ShieldCheck /> : <Trophy />} YKS Ligi
        </h1>
        <div className="text-xs opacity-60 mt-3 flex items-center gap-3 bg-white/5 p-2 rounded-xl">
           <AvatarDisplay user={currentUser} />
           <div className="overflow-hidden">
               <div className="font-bold truncate text-white">{currentUser.username}</div>
               {currentUser.isAdmin && <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold">YÖNETİCİ</span>}
               {currentUser.isDemo && <span className="text-[10px] bg-yellow-400 text-black px-1.5 py-0.5 rounded font-bold">DEMO</span>}
           </div>
        </div>
      </div>
      
      {/* GERİ SAYIM (Sadece Öğrenciler İçin) */}
      {!currentUser.isAdmin && <Countdown />}

      {/* MENÜ LİNKLERİ */}
      <nav className="flex-1 px-3 pb-4 space-y-1 overflow-y-auto custom-scrollbar mt-2">
         <div className="text-[10px] uppercase font-bold text-white/30 pl-4 pt-2 pb-1 tracking-wider">Genel</div>
         <NavButton id="calendar" icon={<CalendarIcon size={18}/>} label="Etkinlik Takvimi" />
         <NavButton id="dashboard" icon={<User size={18}/>} label={currentUser.isAdmin ? 'Veri Girişi' : 'Profilim'} />
         <NavButton id="leaderboard" icon={<BarChart3 size={18}/>} label="Sıralama" />
         
         {!currentUser.isAdmin && (
             <>
                <div className="text-[10px] uppercase font-bold text-white/30 pl-4 pt-4 pb-1 tracking-wider">Akademik</div>
                <NavButton id="my_exams" icon={<List size={18}/>} label="Deneme Listem" />
                <NavButton id="stats" icon={<LineChartIcon size={18}/>} label="İstatistikler" />
                <NavButton id="achievements" icon={<Medal size={18}/>} label="Başarı Rozetleri" />
                
                <div className="text-[10px] uppercase font-bold text-white/30 pl-4 pt-4 pb-1 tracking-wider">Sosyal & Araçlar</div>
                <NavButton id="chat" icon={<MessageCircle size={18}/>} label="Sohbet Odası" />
                <NavButton id="questions" icon={<HelpCircle size={18}/>} label="Soru Duvarı" />
                <NavButton id="simulator" icon={<Calculator size={18}/>} label="Puan Simülatörü" />
                <NavButton id="pomodoro" icon={<Timer size={18}/>} label="Kronometre" />
                
                <div className="text-[10px] uppercase font-bold text-white/30 pl-4 pt-4 pb-1 tracking-wider">Hesap</div>
                <NavButton id="profile" icon={<Settings size={18}/>} label="Ayarlar" />
             </>
         )}

         {currentUser.isAdmin && (
             <>
                 <div className="text-[10px] uppercase font-bold text-white/30 pl-4 pt-4 pb-1 tracking-wider">Yönetim</div>
                 <NavButton id="chat" icon={<MessageCircle size={18}/>} label="Sohbet Yönetimi" />
                 <NavButton id="questions" icon={<HelpCircle size={18}/>} label="Soru Duvarı" />
                 <NavButton id="admin_analysis" icon={<Search size={18}/>} label="Öğrenci Analizi" />
             </>
         )}
      </nav>
      
      {/* ALT KISIM: ÇIKIŞ */}
      <div className="p-4 border-t border-white/10">
          <button onClick={handleLogout} className="flex items-center gap-2 text-red-400 hover:text-white hover:bg-red-600/80 text-sm transition-all w-full px-4 py-3 rounded-xl font-bold">
              <LogOut size={18}/> Çıkış Yap
          </button>
      </div>
    </div>
  );
}