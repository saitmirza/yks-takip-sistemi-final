import React, { useState, useEffect } from 'react';
import { Trophy, ShieldCheck, Calendar as CalendarIcon, User, BarChart3, List, MessageCircle, Settings, Search, LineChart as LineChartIcon, LogOut, HelpCircle, Timer, Medal, Calculator, UserCog, Map, PenTool, Flame, CalendarDays, PlayCircle, MessageSquarePlus, MessageSquare, Target, Brain, Library, ChevronDown, ChevronRight, LayoutDashboard, Menu, X, FileText, Compass, GraduationCap } from 'lucide-react';
import Countdown from './Countdown';

export default function Sidebar({ currentUser, activeTab, setActiveTab, handleLogout }) {
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({ general: false, exams: true, social: false, profile: false });

  const toggleGroup = (groupKey) => setOpenGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));

  // Sekme değişince mobilde menüyü kapat
  const handleTabClick = (id) => {
      setActiveTab(id);
      setIsMobileMenuOpen(false);
  };

  const AvatarDisplay = ({ user, size="w-10 h-10" }) => {
     const avatarData = user?.base64Avatar || user?.avatar;
     const isBase64 = avatarData && avatarData.startsWith('data:');
     const src = isBase64 ? avatarData : (avatarData ? `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="60">${avatarData}</text></svg>` : `https://placehold.co/100x100/334155/ffffff?text=👤`);
     return <img src={src} alt="Avatar" className={`${size} rounded-full object-cover border-2 border-slate-600 flex-shrink-0`} />;
  };

  const menuGroups = [
      {
          key: 'general', title: 'GENEL',
          items: [
              { id: 'calendar', icon: <CalendarIcon size={18}/>, label: 'Takvim', role: 'all' },
              { id: 'dashboard', icon: <LayoutDashboard size={18}/>, label: 'Komuta Merkezi', role: 'admin' },
              { id: 'leaderboard', icon: <BarChart3 size={18}/>, label: 'Sıralama', role: 'all' },
          ]
      },
      {
          key: 'planning', title: 'PLANLAMA & TAKİP',
          items: [
              { id: 'coach', icon: <Brain size={18}/>, label: 'Akıllı Koç', role: 'student' },
              { id: 'scheduler', icon: <CalendarDays size={18}/>, label: 'Programım', role: 'student' },
              { id: 'dreams', icon: <Target size={18}/>, label: 'Hedeflerim', role: 'student' },
              { id: 'subjects', icon: <Map size={18}/>, label: 'Konu Haritası', role: 'student' },
              { id: 'studylog', icon: <PenTool size={18}/>, label: 'Çalışma Günlüğü', role: 'student' },
          ]
      },
      {
          key: 'exams', title: 'SINAV & ANALİZ',
          items: [
              { id: 'exam_request', icon: <FileText size={18}/>, label: 'Sınav Ekle', role: 'student' },
              { id: 'my_exams', icon: <List size={18}/>, label: 'Deneme Notları', role: 'student' },
              { id: 'stats', icon: <LineChartIcon size={18}/>, label: 'Gelişim Grafiği', role: 'student' },
              { id: 'simulator', icon: <Calculator size={18}/>, label: 'Puan Hesapla', role: 'student' },
          ]
      },
      {
          key: 'education', title: 'EĞİTİM & KAYNAK',
          items: [
              { id: 'videos', icon: <PlayCircle size={18}/>, label: 'Video Dersler', role: 'student' },
              { id: 'library', icon: <Library size={18}/>, label: 'Kütüphane', role: 'all' },
          ]
      },
      {
          key: 'social', title: 'SOSYAL & ARAÇLAR',
          items: [
              { id: 'forum', icon: <MessageSquare size={18}/>, label: 'Meydan', role: 'all' },
              { id: 'chat', icon: <MessageCircle size={18}/>, label: 'Sohbet', role: 'all' },
              { id: 'questions', icon: <HelpCircle size={18}/>, label: 'Soru Duvarı', role: 'all' },
              { id: 'pomodoro', icon: <Timer size={18}/>, label: 'Sayaç', role: 'student' },
              { id: 'achievements', icon: <Medal size={18}/>, label: 'Rozetler', role: 'student' },
          ]
      },
      {
          key: 'profile', title: 'HESAP',
          items: [
              { id: 'admin_analysis', icon: <Search size={18}/>, label: 'Öğrenci Analizi', role: 'admin' },
              { id: 'profile', icon: <User size={18}/>, label: 'Profilim', role: 'student' },
              { id: 'settings', icon: <UserCog size={18}/>, label: 'Ayarlar', role: 'student' },
              { id: 'feedback', icon: <MessageSquarePlus size={18}/>, label: 'Destek', role: 'student' },
          ]
      }
  ];

  // ALT BAR YAPILANDIRMASI (Öğrenci ve Admin İçin Ayrı)
  const studentTabs = ['my_exams', 'exam_request', 'leaderboard', 'studylog'];
  const adminTabs = ['calendar', 'dashboard', 'library', 'forum'];
  
  // Aktif kullanıcının rolüne göre alt bar dizisini seç
  const currentBottomTabs = currentUser.isAdmin ? adminTabs : studentTabs;

  // ID'ye göre icon ve label bulma yardımcısı
  const findMenuItem = (id) => {
      for (const group of menuGroups) {
          const item = group.items.find(i => i.id === id);
          if (item) return item;
      }
      return { icon: <Compass/>, label: 'Bilinmeyen' };
  };

  const renderMenuContent = () => (
      <nav className="flex-1 px-4 pb-32 pt-2 space-y-4 overflow-y-auto custom-scrollbar">
          {menuGroups.map((group, gIndex) => {
              const visibleItems = group.items.filter(item => {
                  if (item.role === 'all') return true;
                  if (item.role === 'admin' && currentUser.isAdmin) return true;
                  if (item.role === 'student' && !currentUser.isAdmin) return true;
                  return false;
              });

              if (visibleItems.length === 0) return null;

              return (
                  <div key={group.key} className="animate-in slide-in-from-left-4 fade-in duration-500" style={{ animationDelay: `${gIndex * 50}ms` }}>
                      <button onClick={() => toggleGroup(group.key)} className="w-full flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-2 hover:text-slate-300 transition-colors">
                          <span>{group.title}</span>
                          <span className={`transition-transform duration-300 ${openGroups[group.key] ? 'rotate-180' : ''}`}><ChevronDown size={12}/></span>
                      </button>

                      <div className={`space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${openGroups[group.key] ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                          {visibleItems.map(item => {
                              const isActive = activeTab === item.id;
                              return (
                                  <button key={item.id} onClick={() => handleTabClick(item.id)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all duration-200 group relative ${isActive ? 'text-indigo-400 bg-indigo-500/10 font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'}`}>
                                      {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>}
                                      <span className={`transition-colors ${isActive ? 'text-indigo-400 drop-shadow-sm' : 'group-hover:text-white'}`}>{item.icon}</span>
                                      <span>{item.label}</span>
                                  </button>
                              );
                          })}
                      </div>
                  </div>
              );
          })}
      </nav>
  );

  return (
    <>
        {/* --- MASAÜSTÜ SIDEBAR --- */}
        <div className="hidden md:flex md:w-64 flex-col flex-shrink-0 h-full min-h-screen fixed left-0 top-0 z-50 bg-[#0f172a] border-r border-slate-800">
            <div className="p-6 pb-4">
                <h1 className="text-xl font-bold flex items-center gap-2 text-white tracking-tight">
                    {currentUser.isAdmin ? <ShieldCheck className="text-red-500"/> : <Trophy className="text-yellow-400"/>} 
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">YKS Hub</span>
                </h1>
                
                <div className="mt-6 flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => setActiveTab('profile')}>
                    <AvatarDisplay user={currentUser} />
                    <div className="overflow-hidden">
                        <div className="font-bold text-sm text-slate-200 truncate group-hover:text-white transition-colors">{currentUser.username}</div>
                        {!currentUser.isAdmin ? (
                            <div className="flex items-center gap-1.5 text-[10px] text-orange-400 font-medium">
                                <Flame size={12} fill="currentColor"/> {currentUser.streak || 0} Gün Zincir
                            </div>
                        ) : <span className="text-[10px] text-red-400 font-bold">YÖNETİCİ</span>}
                    </div>
                </div>
            </div>
            
            {!currentUser.isAdmin && <div className="px-6 mb-6"><Countdown /></div>}
            
            {renderMenuContent()}
            
            <div className="p-4 border-t border-slate-800 bg-[#0f172a]">
                <button onClick={handleLogout} className="flex items-center justify-center gap-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 text-sm transition-all w-full px-4 py-3 rounded-xl font-bold">
                    <LogOut size={18}/> <span>Çıkış Yap</span>
                </button>
            </div>
        </div>

        {/* --- MOBİL MENÜ (FULL SCREEN OVERLAY) --- */}
        {isMobileMenuOpen && (
            <div className="fixed inset-0 z-[100] bg-[#0f172a]/95 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom-[10%] duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-6 pt-safe-top border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Compass size={24} className="text-indigo-500"/> Menü
                    </h2>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X size={24}/>
                    </button>
                </div>
                
                {/* Menü İçerik (Scrollable) */}
                {renderMenuContent()}
                
                {/* Footer */}
                <div className="p-6 pb-safe-bottom border-t border-slate-800 bg-[#0f172a]">
                     <button onClick={handleLogout} className="flex items-center justify-center gap-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 w-full py-4 rounded-xl font-bold transition-all">
                        <LogOut size={20}/> Çıkış Yap
                    </button>
                </div>
            </div>
        )}

        {/* --- MOBİL ALT BAR --- */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 py-2 safe-area-bottom bg-[#0f172a]/90 backdrop-blur-xl border-t border-slate-800 flex justify-between items-center shadow-2xl">
            {/* Buton 1 */}
            <button onClick={() => handleTabClick(currentBottomTabs[0])} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95 ${activeTab === currentBottomTabs[0] ? 'text-indigo-400' : 'text-slate-500'}`}>
                {React.cloneElement(findMenuItem(currentBottomTabs[0]).icon, { size: 22, strokeWidth: activeTab === currentBottomTabs[0] ? 2.5 : 2 })}
            </button>

            {/* Buton 2 */}
            <button onClick={() => handleTabClick(currentBottomTabs[1])} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95 ${activeTab === currentBottomTabs[1] ? 'text-indigo-400' : 'text-slate-500'}`}>
                {React.cloneElement(findMenuItem(currentBottomTabs[1]).icon, { size: 22, strokeWidth: activeTab === currentBottomTabs[1] ? 2.5 : 2 })}
            </button>
            
            {/* ORTA: MENÜ BUTONU (VURGULU) */}
            <button onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center justify-center -mt-8 active:scale-95 transition-transform">
                <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 text-white p-4 rounded-full shadow-lg shadow-indigo-500/40 border-[6px] border-[#0f172a]">
                    <Menu size={24} strokeWidth={3} />
                </div>
            </button>

            {/* Buton 3 */}
            <button onClick={() => handleTabClick(currentBottomTabs[2])} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95 ${activeTab === currentBottomTabs[2] ? 'text-indigo-400' : 'text-slate-500'}`}>
                {React.cloneElement(findMenuItem(currentBottomTabs[2]).icon, { size: 22, strokeWidth: activeTab === currentBottomTabs[2] ? 2.5 : 2 })}
            </button>

            {/* Buton 4 */}
            <button onClick={() => handleTabClick(currentBottomTabs[3])} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95 ${activeTab === currentBottomTabs[3] ? 'text-indigo-400' : 'text-slate-500'}`}>
                {React.cloneElement(findMenuItem(currentBottomTabs[3]).icon, { size: 22, strokeWidth: activeTab === currentBottomTabs[3] ? 2.5 : 2 })}
            </button>
        </div>

        {/* --- MOBİL ÜST BAR --- */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 px-4 h-16 flex justify-between items-center bg-[#0f172a]/90 backdrop-blur-xl border-b border-slate-800">
             <h1 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
                {currentUser.isAdmin ? <ShieldCheck size={20} className="text-red-500"/> : <Trophy size={20} className="text-yellow-500"/>} YKS Hub
             </h1>
             <div className="flex items-center gap-3" onClick={() => setActiveTab('profile')}>
                 {!currentUser.isAdmin && (
                     <div className="text-right">
                        <div className="text-xs font-bold text-slate-200">{currentUser.username}</div>
                        <div className="text-[10px] text-indigo-400 font-bold flex justify-end items-center gap-1">{currentUser.streak || 0} Gün <Flame size={10} fill="currentColor"/></div>
                     </div>
                 )}
                 {currentUser.isAdmin && <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">ADMIN</span>}
                 <AvatarDisplay user={currentUser} size="w-9 h-9" />
             </div>
        </div>
    </>
  );
}