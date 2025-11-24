import React, { useState } from 'react';
import { Play, BookOpen, Youtube, ChevronRight } from 'lucide-react';
import { VIDEO_CURRICULUM } from '../utils/videoData';

export default function VideoLessons() {
    const [activeExam, setActiveExam] = useState("TYT");
    const [activeSubject, setActiveSubject] = useState("Matematik");
    const [currentVideo, setCurrentVideo] = useState(null);

    const subjects = Object.keys(VIDEO_CURRICULUM[activeExam]);
    const videos = VIDEO_CURRICULUM[activeExam][activeSubject] || [];

    return (
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
            
            {/* SOL MENÜ: DERS SEÇİMİ */}
            <div className="w-full lg:w-80 flex flex-col gap-4">
                {/* TYT / AYT Seçimi */}
                <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl border border-slate-200 dark:border-gray-700 flex shadow-sm">
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
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 overflow-hidden flex-1 flex flex-col shadow-sm">
                    <div className="p-4 border-b border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/50">
                        <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2">
                            <BookOpen size={18} className="text-indigo-500"/> Dersler
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {subjects.map(sub => (
                            <button
                                key={sub}
                                onClick={() => setActiveSubject(sub)}
                                className={`w-full p-3 rounded-xl text-left text-sm font-medium flex justify-between items-center transition-all ${activeSubject === sub ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800' : 'text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700'}`}
                            >
                                {sub}
                                {activeSubject === sub && <ChevronRight size={16}/>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* SAĞ PANEL: VİDEO LİSTESİ & OYNATICI */}
            <div className="flex-1 flex flex-col gap-6">
                {/* Oynatıcı */}
                <div className="w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800 relative group">
                    {currentVideo ? (
                        <iframe 
                            src={`${currentVideo.url}?autoplay=1`} 
                            title="Video Player" 
                            className="w-full h-full" 
                            frameBorder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen
                        ></iframe>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 bg-slate-900">
                            <Youtube size={64} className="mb-4 opacity-50"/>
                            <p className="text-lg font-medium">Listeden bir konu seç ve dersi başlat.</p>
                        </div>
                    )}
                </div>

                {/* Konu Listesi */}
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 p-6 overflow-y-auto shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Play size={20} className="text-red-500"/> {activeSubject} Videoları
                    </h3>
                    <div className="space-y-3">
                        {videos.map((video, idx) => (
                            <div 
                                key={idx}
                                onClick={() => setCurrentVideo(video)}
                                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-4 group ${currentVideo?.title === video.title ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg transform scale-[1.01]' : 'bg-slate-50 dark:bg-gray-700/50 border-slate-100 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500'}`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${currentVideo?.title === video.title ? 'bg-white/20 text-white' : 'bg-white dark:bg-gray-800 text-indigo-600 shadow-sm'}`}>
                                    <Play size={18} fill="currentColor"/>
                                </div>
                                <div className="flex-1">
                                    <div className={`font-bold text-sm ${currentVideo?.title === video.title ? 'text-white' : 'text-slate-700 dark:text-white'}`}>
                                        {video.title}
                                    </div>
                                    <div className={`text-xs ${currentVideo?.title === video.title ? 'text-indigo-200' : 'text-slate-400'}`}>
                                        {video.channel}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}