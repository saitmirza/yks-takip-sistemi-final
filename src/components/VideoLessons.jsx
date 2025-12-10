import React, { useState } from 'react';
import { Play, BookOpen, Youtube, ChevronRight, ChevronDown, MonitorPlay, X, Folder, FolderOpen } from 'lucide-react';
import { VIDEO_CURRICULUM } from '../utils/videoData';

export default function VideoLessons() {
    const [activeExam, setActiveExam] = useState("AYT"); 
    const [activeSubject, setActiveSubject] = useState("Kimya");
    const [currentVideo, setCurrentVideo] = useState(null);
    const [expandedUnit, setExpandedUnit] = useState(null);

    const subjects = Object.keys(VIDEO_CURRICULUM[activeExam]);
    const units = VIDEO_CURRICULUM[activeExam][activeSubject] || [];

    const toggleUnit = (index) => {
        if (expandedUnit === index) setExpandedUnit(null);
        else setExpandedUnit(index);
    };

    const playVideo = (playlistUrl, index, title) => {
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
        <div className="max-w-7xl mx-auto flex flex-col h-full overflow-hidden relative pb-20">
            
            {/* --- OYNATICI (SABİT ÜST) --- */}
            {currentVideo && (
                <div className="flex-shrink-0 w-full bg-black border-b border-white/10 shadow-2xl z-20 animate-in slide-in-from-top-10 relative rounded-b-3xl overflow-hidden mb-4">
                    <div className="flex justify-between items-center p-3 bg-white/10 backdrop-blur-md text-white border-b border-white/5">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <Youtube className="text-red-500" size={20}/>
                            <div className="flex flex-col">
                                <span className="font-bold text-sm truncate">{currentVideo.title}</span>
                                <span className="text-[10px] text-slate-300">{currentVideo.subject} Dersi</span>
                            </div>
                        </div>
                        <button onClick={() => setCurrentVideo(null)} className="p-2 bg-white/10 hover:bg-red-600 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="w-full aspect-video max-h-[40vh] md:max-h-[50vh] bg-black">
                        <iframe src={currentVideo.url} title="Video Player" className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                    </div>
                </div>
            )}

            {/* --- İÇERİK ALANI --- */}
            <div className={`flex flex-col lg:flex-row gap-6 overflow-hidden flex-1 ${currentVideo ? 'mt-0' : 'mt-2'}`}>
                
                {/* SOL MENÜ: DERSLER */}
                <div className={`w-full lg:w-72 flex-shrink-0 flex flex-col gap-4 ${currentVideo ? 'hidden lg:flex' : 'flex'} h-full lg:h-auto`}>
                    
                    {/* TYT / AYT SEÇİMİ (GLASS FIX) */}
                    <div className="flex bg-black/20 p-1 rounded-xl shadow-sm border border-white/5 flex-shrink-0">
                        {['TYT', 'AYT'].map(exam => (
                            <button key={exam} onClick={() => { setActiveExam(exam); setActiveSubject(Object.keys(VIDEO_CURRICULUM[exam])[0]); setExpandedUnit(null); }} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeExam === exam ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                {exam}
                            </button>
                        ))}
                    </div>

                    {/* DERS LİSTESİ (GLASS FIX) */}
                    <div className="glass-box rounded-3xl overflow-hidden flex flex-col shadow-sm transition-colors flex-1 lg:flex-none lg:h-[calc(100vh-14rem)]">
                        <div className="p-4 border-b border-white/10 bg-white/5 flex-shrink-0">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <BookOpen size={18} className="text-indigo-400"/> Dersler
                            </h3>
                        </div>
                        <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar flex-1">
                            {subjects.map(sub => (
                                <button key={sub} onClick={() => { setActiveSubject(sub); setExpandedUnit(null); }} className={`w-full p-3 rounded-xl text-left text-sm font-medium flex justify-between items-center transition-all ${activeSubject === sub ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                    {sub} {activeSubject === sub && <ChevronRight size={16}/>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* SAĞ PANEL: ÜNİTELER ve VİDEOLAR (GLASS FIX) */}
                <div className={`glass-box rounded-3xl p-4 lg:p-6 shadow-sm flex-1 flex flex-col min-h-0 transition-colors overflow-hidden ${!currentVideo ? 'h-full' : ''}`}>
                    <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2 flex-shrink-0">
                        <MonitorPlay size={20} className="text-red-500"/> {activeSubject} Üniteleri
                    </h3>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 pb-4">
                        {units.length > 0 ? units.map((unit, uIdx) => (
                            <div key={uIdx} className="border border-white/10 rounded-2xl overflow-hidden transition-all bg-white/5">
                                {/* Ünite Başlığı */}
                                <button 
                                    onClick={() => toggleUnit(uIdx)}
                                    className={`w-full p-4 flex justify-between items-center text-left transition-colors ${expandedUnit === uIdx ? 'bg-indigo-500/10 text-indigo-300' : 'text-slate-300 hover:bg-white/5'}`}
                                >
                                    <div className="flex items-center gap-3 font-bold text-sm">
                                        {expandedUnit === uIdx ? <FolderOpen size={18}/> : <Folder size={18}/>}
                                        {unit.unitTitle}
                                    </div>
                                    {expandedUnit === uIdx ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                                </button>

                                {/* Videolar (Açılır Kısım - Koyu Arka Plan) */}
                                {expandedUnit === uIdx && (
                                    <div className="bg-black/20 p-2 space-y-1 animate-in slide-in-from-top-2 border-t border-white/5">
                                        {unit.videos.map((vid, vIdx) => (
                                            <button 
                                                key={vIdx}
                                                onClick={() => playVideo(unit.playlistUrl, vid.index, vid.title)}
                                                className="w-full p-3 rounded-xl flex items-center gap-3 text-left hover:bg-white/10 group transition-all"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                                    <Play size={14} fill="currentColor"/>
                                                </div>
                                                <div className="text-sm text-slate-300 font-medium group-hover:text-white">{vid.title}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
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