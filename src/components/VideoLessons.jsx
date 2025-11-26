import React, { useState } from 'react';
import { Play, BookOpen, Youtube, ChevronRight, ChevronDown, MonitorPlay, X, Folder, FolderOpen } from 'lucide-react';
import { VIDEO_CURRICULUM } from '../utils/videoData';

export default function VideoLessons() {
    const [activeExam, setActiveExam] = useState("AYT"); // Varsayılan AYT (Kimya testi için)
    const [activeSubject, setActiveSubject] = useState("Kimya");
    const [currentVideo, setCurrentVideo] = useState(null);
    
    // Akordiyon State'i (Hangi ünite açık?)
    const [expandedUnit, setExpandedUnit] = useState(null);

    const subjects = Object.keys(VIDEO_CURRICULUM[activeExam]);
    const units = VIDEO_CURRICULUM[activeExam][activeSubject] || [];

    const toggleUnit = (index) => {
        if (expandedUnit === index) setExpandedUnit(null);
        else setExpandedUnit(index);
    };

    const playVideo = (playlistUrl, index, title) => {
        // Playlist ID'sini ayıkla
        let listId = "";
        try {
            const urlObj = new URL(playlistUrl);
            listId = urlObj.searchParams.get("list");
        } catch (e) { console.error("URL Hatası", e); }

        if (listId) {
            const embedUrl = `https://www.youtube.com/embed?listType=playlist&list=${listId}&index=${index}&autoplay=1&rel=0`;
            setCurrentVideo({ url: embedUrl, title: title, subject: activeSubject });
        }
    };

    return (
        <div className="max-w-7xl mx-auto flex flex-col h-full overflow-hidden relative">
            
            {/* --- OYNATICI (MODAL) --- */}
            {currentVideo && (
                <div className="flex-shrink-0 w-full bg-black dark:bg-gray-900 border-b border-slate-700 shadow-2xl z-20 animate-in slide-in-from-top-10 relative">
                    <div className="flex justify-between items-center p-3 bg-slate-800 text-white">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <Youtube className="text-red-500" size={20}/>
                            <div className="flex flex-col">
                                <span className="font-bold text-sm truncate">{currentVideo.title}</span>
                                <span className="text-[10px] text-slate-400">{currentVideo.subject} Dersi</span>
                            </div>
                        </div>
                        <button onClick={() => setCurrentVideo(null)} className="p-2 bg-slate-700 hover:bg-red-600 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="w-full aspect-video max-h-[40vh] md:max-h-[50vh] bg-black">
                        <iframe src={currentVideo.url} title="Video Player" className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                    </div>
                </div>
            )}

            {/* --- İÇERİK ALANI --- */}
            <div className="flex flex-col lg:flex-row gap-6 p-1 overflow-hidden flex-1 mt-2">
                
                {/* SOL MENÜ: DERSLER */}
                <div className={`w-full lg:w-72 flex-shrink-0 flex flex-col gap-4 ${currentVideo ? 'hidden lg:flex' : 'flex'} h-full lg:h-auto`}>
                    {/* TYT / AYT */}
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl border border-slate-200 dark:border-gray-700 flex shadow-sm transition-colors flex-shrink-0">
                        {['TYT', 'AYT'].map(exam => (
                            <button key={exam} onClick={() => { setActiveExam(exam); setActiveSubject(Object.keys(VIDEO_CURRICULUM[exam])[0]); setExpandedUnit(null); }} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeExam === exam ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700'}`}>
                                {exam}
                            </button>
                        ))}
                    </div>

                    {/* Ders Listesi */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 overflow-hidden flex flex-col shadow-sm transition-colors flex-1 lg:flex-none lg:h-[calc(100vh-12rem)]">
                        <div className="p-4 border-b border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/50 flex-shrink-0">
                            <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2">
                                <BookOpen size={18} className="text-indigo-500"/> Dersler
                            </h3>
                        </div>
                        <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar flex-1">
                            {subjects.map(sub => (
                                <button key={sub} onClick={() => { setActiveSubject(sub); setExpandedUnit(null); }} className={`w-full p-3 rounded-xl text-left text-sm font-medium flex justify-between items-center transition-all ${activeSubject === sub ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800' : 'text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700'}`}>
                                    {sub} {activeSubject === sub && <ChevronRight size={16}/>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* SAĞ PANEL: ÜNİTELER ve VİDEOLAR */}
                <div className={`bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 p-4 lg:p-6 shadow-sm flex-1 flex flex-col min-h-0 transition-colors overflow-hidden ${!currentVideo ? 'h-full' : ''}`}>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2 flex-shrink-0">
                        <MonitorPlay size={20} className="text-red-500"/> {activeSubject} Üniteleri
                    </h3>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 pb-20">
                        {units.length > 0 ? units.map((unit, uIdx) => (
                            <div key={uIdx} className="border border-slate-200 dark:border-gray-700 rounded-2xl overflow-hidden transition-all">
                                {/* Ünite Başlığı (Tıklanabilir) */}
                                <button 
                                    onClick={() => toggleUnit(uIdx)}
                                    className={`w-full p-4 flex justify-between items-center text-left transition-colors ${expandedUnit === uIdx ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'bg-slate-50 dark:bg-gray-700/30 text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700'}`}
                                >
                                    <div className="flex items-center gap-3 font-bold text-sm">
                                        {expandedUnit === uIdx ? <FolderOpen size={18}/> : <Folder size={18}/>}
                                        {unit.unitTitle}
                                    </div>
                                    {expandedUnit === uIdx ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                                </button>

                                {/* Videolar (Açılır Kısım) */}
                                {expandedUnit === uIdx && (
                                    <div className="bg-white dark:bg-gray-800 p-2 space-y-1 animate-in slide-in-from-top-2">
                                        {unit.videos.map((vid, vIdx) => (
                                            <button 
                                                key={vIdx}
                                                onClick={() => playVideo(unit.playlistUrl, vid.index, vid.title)}
                                                className="w-full p-3 rounded-xl flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-gray-700 group transition-all"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                                    <Play size={14} fill="currentColor"/>
                                                </div>
                                                <div className="text-sm text-slate-600 dark:text-gray-300 font-medium">{vid.title}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <Youtube size={48} className="mb-2 opacity-20"/>
                                <p>İçerik yakında eklenecek.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}