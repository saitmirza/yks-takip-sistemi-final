import React, { useState } from 'react';
import { Play, BookOpen, Youtube, ChevronRight, MonitorPlay, X } from 'lucide-react';
import { VIDEO_CURRICULUM } from '../utils/videoData';

export default function VideoLessons() {
    const [activeExam, setActiveExam] = useState("TYT");
    const [activeSubject, setActiveSubject] = useState("Matematik");
    const [currentVideo, setCurrentVideo] = useState(null);

    // Seçili sınav ve derse göre videoları getir
    const subjects = VIDEO_CURRICULUM[activeExam] ? Object.keys(VIDEO_CURRICULUM[activeExam]) : [];
    const videos = (VIDEO_CURRICULUM[activeExam] && VIDEO_CURRICULUM[activeExam][activeSubject]) || [];

    // --- AKILLI PLAYLIST DÖNÜŞTÜRÜCÜ ---
    const getEmbedUrl = (videoData) => {
        if (!videoData) return "";
        
        const url = videoData.url;
        
        try {
            const urlObj = new URL(url);
            let listId = urlObj.searchParams.get("list");
            let videoId = urlObj.searchParams.get("v");
            // Eğer URL'de index belirtilmişse onu al, yoksa veri dosyasındaki index'i al
            let index = urlObj.searchParams.get("index") || videoData.index || 0;

            // 1. Hem Playlist Hem Video ID varsa (En Garantisi)
            if (listId && videoId) {
                return `https://www.youtube.com/embed/${videoId}?list=${listId}&index=${index}&autoplay=1&rel=0`;
            }
            // 2. Sadece Playlist ID varsa (Listeden sırayla açar)
            else if (listId) {
                return `https://www.youtube.com/embed?listType=playlist&list=${listId}&index=${index}&autoplay=1&rel=0`;
            }
            // 3. Sadece Video ID varsa (Tek video)
            else if (videoId) {
                return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
            }
        } catch (e) {
            console.error("URL Parse Hatası:", e);
        }
        
        return "";
    };

    return (
        <div className="max-w-7xl mx-auto h-auto lg:h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-6 overflow-hidden pb-20 lg:pb-0">
            
            {/* SOL MENÜ: DERS SEÇİMİ */}
            <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4 lg:h-full">
                {/* TYT / AYT */}
                <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl border border-slate-200 dark:border-gray-700 flex shadow-sm transition-colors flex-shrink-0">
                    {['TYT', 'AYT'].map(exam => (
                        <button 
                            key={exam}
                            onClick={() => { setActiveExam(exam); setActiveSubject(Object.keys(VIDEO_CURRICULUM[exam])[0]); }}
                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeExam === exam ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700'}`}
                        >
                            {exam}
                        </button>
                    ))}
                </div>

                {/* Ders Listesi */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 overflow-hidden flex flex-col shadow-sm transition-colors flex-1 min-h-0 lg:max-h-none max-h-48">
                    <div className="p-4 border-b border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/50">
                        <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2">
                            <BookOpen size={18} className="text-indigo-500"/> Dersler
                        </h3>
                    </div>
                    <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar flex-1">
                        {subjects.map(sub => (
                            <button
                                key={sub}
                                onClick={() => setActiveSubject(sub)}
                                className={`w-full p-3 rounded-xl text-left text-sm font-medium flex justify-between items-center transition-all ${activeSubject === sub ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800' : 'text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700'}`}
                            >
                                {sub}
                                {activeSubject === sub && <ChevronRight size={16}/>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* SAĞ PANEL: İÇERİK */}
            <div className="flex-1 flex flex-col gap-4 lg:h-full overflow-hidden min-h-[600px]">
                
                {/* OYNATICI (MODAL GİBİ AÇILIR) */}
                {currentVideo && (
                    <div className="flex-shrink-0 w-full bg-black dark:bg-gray-900 rounded-3xl border border-slate-700 shadow-2xl z-20 animate-in slide-in-from-top-10 relative overflow-hidden">
                        {/* Üst Bilgi ve Kapatma */}
                        <div className="flex justify-between items-center p-3 bg-slate-800 text-white border-b border-slate-700">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Youtube className="text-red-500" size={20}/>
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm truncate">{currentVideo.title}</span>
                                    <span className="text-[10px] text-slate-400">{currentVideo.channel}</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setCurrentVideo(null)} 
                                className="p-2 bg-slate-700 hover:bg-red-600 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Video */}
                        <div className="w-full aspect-video max-h-[40vh] md:max-h-[50vh] bg-black">
                            <iframe 
                                src={getEmbedUrl(currentVideo)} 
                                title="Video Player" 
                                className="w-full h-full" 
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                            ></iframe>
                        </div>
                    </div>
                )}

                {/* KONU LİSTESİ */}
                <div className={`bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 p-4 lg:p-6 shadow-sm flex-1 flex flex-col min-h-0 transition-colors overflow-hidden ${!currentVideo ? 'h-full' : ''}`}>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2 flex-shrink-0">
                        <MonitorPlay size={20} className="text-red-500"/> {activeSubject} Konuları
                    </h3>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                        {videos.length > 0 ? videos.map((video, idx) => (
                            <div 
                                key={idx}
                                onClick={() => setCurrentVideo(video)}
                                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-4 group 
                                    ${currentVideo?.title === video.title 
                                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
                                        : 'bg-slate-50 dark:bg-gray-700/50 border-slate-100 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${currentVideo?.title === video.title ? 'bg-white/20 text-white' : 'bg-white dark:bg-gray-800 text-indigo-600 shadow-sm'}`}>
                                    <Play size={18} fill="currentColor"/>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className={`font-bold text-sm truncate ${currentVideo?.title === video.title ? 'text-white' : 'text-slate-700 dark:text-white'}`}>
                                        {video.title}
                                    </div>
                                    <div className={`text-xs truncate ${currentVideo?.title === video.title ? 'text-indigo-200' : 'text-slate-500 dark:text-gray-400'}`}>
                                        {video.channel}
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-gray-500">
                                <Youtube size={48} className="mb-2 opacity-20"/>
                                <p>Bu derse ait video bulunamadı.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}