import React, { useState } from 'react';
import { Play, BookOpen, Youtube, ChevronRight, MonitorPlay } from 'lucide-react';
import { VIDEO_CURRICULUM } from '../utils/videoData';

export default function VideoLessons() {
    const [activeExam, setActiveExam] = useState("TYT");
    const [activeSubject, setActiveSubject] = useState("Matematik");
    const [currentVideo, setCurrentVideo] = useState(null);

    const subjects = Object.keys(VIDEO_CURRICULUM[activeExam]);
    const videos = VIDEO_CURRICULUM[activeExam][activeSubject] || [];

    // --- AKILLI LİNK DÖNÜŞTÜRÜCÜ ---
    const getEmbedUrl = (url) => {
        if (!url) return "";
        // Eğer zaten embed linki ise dokunma
        if (url.includes("/embed/")) return url;
        
        let videoId = "";
        
        // Kısa Link (youtu.be/VIDEO_ID)
        if (url.includes("youtu.be/")) {
            videoId = url.split("youtu.be/")[1]?.split("?")[0];
        } 
        // Uzun Link (youtube.com/watch?v=VIDEO_ID)
        else if (url.includes("watch?v=")) {
            videoId = url.split("v=")[1]?.split("&")[0];
        }

        return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : "";
    };

    return (
        <div className="max-w-7xl mx-auto h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-6 overflow-hidden">
            
            {/* SOL MENÜ */}
            <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4 h-full">
                <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl border border-slate-200 dark:border-gray-700 flex shadow-sm transition-colors">
                    {['TYT', 'AYT'].map(exam => (
                        <button key={exam} onClick={() => { setActiveExam(exam); setActiveSubject(Object.keys(VIDEO_CURRICULUM[exam])[0]); }} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeExam === exam ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700'}`}>{exam}</button>
                    ))}
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 overflow-hidden flex-1 flex flex-col shadow-sm transition-colors">
                    <div className="p-4 border-b border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/50">
                        <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2"><BookOpen size={18} className="text-indigo-500"/> Dersler</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {subjects.map(sub => (
                            <button key={sub} onClick={() => setActiveSubject(sub)} className={`w-full p-3 rounded-xl text-left text-sm font-medium flex justify-between items-center transition-all ${activeSubject === sub ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800' : 'text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700'}`}>
                                {sub} {activeSubject === sub && <ChevronRight size={16}/>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* SAĞ PANEL */}
            <div className="flex-1 flex flex-col gap-4 h-full overflow-hidden">
                {currentVideo ? (
                    <div className="w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 flex-shrink-0 animate-in slide-in-from-top-4">
                        <iframe src={getEmbedUrl(currentVideo.url)} title="Video Player" className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                    </div>
                ) : (
                    <div className="w-full aspect-video bg-slate-100 dark:bg-gray-800 rounded-3xl border-2 border-dashed border-slate-300 dark:border-gray-600 flex flex-col items-center justify-center text-slate-400 dark:text-gray-500 transition-colors">
                        <Youtube size={64} className="mb-4 opacity-50"/>
                        <p className="text-lg font-medium">Ders seçimi yap ve videoyu başlat.</p>
                    </div>
                )}

                <div className={`bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 p-6 shadow-sm flex-1 flex flex-col min-h-0 transition-colors ${!currentVideo ? 'h-full' : ''}`}>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2 flex-shrink-0"><MonitorPlay size={20} className="text-red-500"/> {activeSubject} Videoları</h3>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                        {videos.length > 0 ? videos.map((video, idx) => (
                            <div key={idx} onClick={() => setCurrentVideo(video)} className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-4 group ${currentVideo?.title === video.title ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg transform scale-[1.01]' : 'bg-slate-50 dark:bg-gray-700/50 border-slate-100 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${currentVideo?.title === video.title ? 'bg-white/20 text-white' : 'bg-white dark:bg-gray-800 text-indigo-600 shadow-sm'}`}><Play size={18} fill="currentColor"/></div>
                                <div className="flex-1"><div className={`font-bold text-sm ${currentVideo?.title === video.title ? 'text-white' : 'text-slate-700 dark:text-white'}`}>{video.title}</div><div className={`text-xs ${currentVideo?.title === video.title ? 'text-indigo-200' : 'text-slate-400'}`}>{video.channel}</div></div>
                            </div>
                        )) : <div className="flex flex-col items-center justify-center h-full text-slate-400"><Youtube size={48} className="mb-2 opacity-20"/><p>Video bulunamadı.</p></div>}
                    </div>
                </div>
            </div>
        </div>
    );
}