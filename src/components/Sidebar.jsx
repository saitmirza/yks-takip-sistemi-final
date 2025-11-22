import React from 'react';
import { Trophy, ShieldCheck, Calendar as CalendarIcon, User, BarChart3, List, MessageCircle, Settings, Search, LineChart as LineChartIcon, LogOut, HelpCircle, Timer, Medal, Calculator, UserCog, Map, PenTool, Flame, CalendarDays } from 'lucide-react';
import Countdown from './Countdown';

export default function Sidebar({ currentUser, activeTab, setActiveTab, handleLogout }) {
  const theme = currentUser?.isAdmin 
    ? { sidebar: "bg-gradient-to-b from-zinc-900 to-black", accent: "text-white" }
    : { sidebar: "bg-slate-900", accent: "text-yellow-400" };

  const AvatarDisplay = ({ user, size="w-10 h-10" }) => {
     const avatarData = user?.base64Avatar || user?.avatar;
     const isBase64 = avatarData && avatarData.startsWith('data:');
     const src = isBase64 ? avatarData : (avatarData ? `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="60">${avatarData}</text></svg>` : `https://placehold.co/100x100/334155/ffffff?text=👤`);
     return <img src={src} alt="Avatar" className={`${size} rounded-full object-cover border-2 border-slate-600 flex-shrink-0`} />;
  };

  const menuItems = [
      { id: 'calendar', icon: <CalendarIcon size={20}/>, label: 'Takvim', role: 'all' },
      { id: 'dashboard', icon: <User size={20}/>, label: 'Veri', role: 'admin' },
      { id: 'leaderboard', icon: <BarChart3 size={20}/>, label: 'Sıralama', role: 'all' },
      { id: 'scheduler', icon: <CalendarDays size={20}/>, label: 'Programım', role: 'student' },
      { id: 'subjects', icon: <Map size={20}/>, label: 'Harita', role: 'student' },
      { id: 'studylog', icon: <PenTool size={20}/>, label: 'Günlük', role: 'student' },
      { id: 'my_exams', icon: <List size={20}/>, label: 'Notlar', role: 'student' },
      { id: 'stats', icon: <LineChartIcon size={20}/>, label: 'Analiz', role: 'student' },
      { id: 'chat', icon: <MessageCircle size={20}/>, label: 'Sohbet', role: 'all' },
      { id: 'questions', icon: <HelpCircle size={20}/>, label: 'Sorular', role: 'all' },
      { id: 'pomodoro', icon: <Timer size={20}/>, label: 'Sayaç', role: 'student' },
      { id: 'achievements', icon: <Medal size={20}/>, label: 'Rozet', role: 'student' },
      { id: 'simulator', icon: <Calculator size={20}/>, label: 'Hesap', role: 'student' },
      { id: 'admin_analysis', icon: <Search size={20}/>, label: 'Analiz', role: 'admin' },
      { id: 'profile', icon: <User size={20}/>, label: 'Profil', role: 'student' },
      { id: 'settings', icon: <UserCog size={20}/>, label: 'Ayarlar', role: 'student' },
  ];

  const filteredMenu = menuItems.filter(item => {
      if (item.role === 'all') return true;
      if (item.role === 'admin' && currentUser.isAdmin) return true;
      if (item.role === 'student' && !currentUser.isAdmin) return true;
      return false;
  });

  return (
    <>
        {/* MASAÜSTÜ SIDEBAR (DEĞİŞMEDİ) */}
        <div className={`hidden md:flex md:w-64 ${theme.sidebar} text-white flex-col flex-shrink-0 h-full min-h-screen fixed left-0 top-0 z-50 border-r border-white/10`}>
            <div className="p-6 border-b border-white/10">
                <h1 className={`text-xl font-bold flex items-center gap-2 ${theme.accent}`}>
                    {currentUser.isAdmin ? <ShieldCheck /> : <Trophy />} YKS Ligi
                </h1>
                <div className="text-xs opacity-60 mt-3 flex items-center gap-3 bg-white/5 p-2 rounded-xl">
                    <AvatarDisplay user={currentUser} />
                    <div className="overflow-hidden w-full">
                        <div className="font-bold truncate text-white">{currentUser.username}</div>
                        {!currentUser.isAdmin && (
                            <div className="flex items-center gap-1 text-[10px] mt-1 text-orange-200 animate-pulse">
                                <Flame size={12} className="text-orange-500 fill-orange-500"/>
                                <span className="font-bold">{currentUser.streak || 0} Day Streak</span>
                            </div>
                        )}
                        {currentUser.isAdmin && <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold">YÖNETİCİ</span>}
                    </div>
                </div>
            </div>
            {!currentUser.isAdmin && <div className="px-2"><Countdown /></div>}
            <nav className="flex-1 px-3 pb-4 space-y-1 overflow-y-auto custom-scrollbar mt-2">
                {filteredMenu.map(item => (
                    <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm ${activeTab === item.id ? 'bg-white/10 shadow-inner text-white font-bold' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                        {item.icon} <span>{item.label}</span>
                    </button>
                ))}
            </nav>
            <div className="p-4 border-t border-white/10">
                <button onClick={handleLogout} className="flex items-center gap-2 text-red-400 hover:text-white hover:bg-red-600/80 text-sm transition-all w-full px-4 py-3 rounded-xl font-bold"><LogOut size={18}/> Çıkış Yap</button>
            </div>
        </div>

        {/* MOBİL BOTTOM BAR (DÜZELTİLDİ 🛠️) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#111827] border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 px-1 py-1 safe-area-bottom transition-colors duration-300">
            <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1 px-2">
                {filteredMenu.map(item => (
                    <button 
                        key={item.id} 
                        onClick={() => setActiveTab(item.id)} 
                        className={`flex flex-col items-center justify-center min-w-[4rem] p-2 rounded-xl transition-all flex-shrink-0 
                            ${activeTab === item.id 
                                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' 
                                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                    >
                        {item.icon}
                        <span className="text-[9px] font-bold mt-1 truncate w-full text-center">{item.label}</span>
                    </button>
                ))}
                <button onClick={handleLogout} className="flex flex-col items-center justify-center min-w-[4rem] p-2 rounded-xl text-red-400 dark:text-red-500 flex-shrink-0">
                    <LogOut size={20}/> <span className="text-[9px] font-bold mt-1">Çıkış</span>
                </button>
            </div>
        </div>

        {/* MOBİL ÜST BAR (DÜZELTİLDİ 🛠️) */}
        <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-[#111827] border-b border-slate-100 dark:border-slate-800 z-40 px-4 py-3 flex justify-between items-center shadow-sm h-16 transition-colors duration-300">
             <h1 className="text-lg font-bold text-indigo-900 dark:text-white flex items-center gap-2">
                {currentUser.isAdmin ? <ShieldCheck size={20}/> : <Trophy size={20} className="text-yellow-500"/>} YKS Ligi
             </h1>
             <div className="flex items-center gap-2" onClick={() => setActiveTab(currentUser.isAdmin ? 'dashboard' : 'profile')}>
                 <span className="text-xs font-bold text-slate-600 dark:text-slate-300 max-w-[100px] truncate">{currentUser.username}</span>
                 <AvatarDisplay user={currentUser} size="w-8 h-8" />
             </div>
        </div>
    </>
  );
}