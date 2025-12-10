import React, { useState } from 'react';
import { List, FileText, X, Calculator, TrendingUp, Calendar, Search, Save, AlertCircle, BookOpen } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { TOPICS } from '../utils/topics';
import { calculateOBP } from '../utils/helpers';

export default function MyExams({ myScores, currentUser, rankings }) {
    const [selectedScore, setSelectedScore] = useState(null);
    const [analyzeMode, setAnalyzeMode] = useState(null); 
    const [selectedMistakes, setSelectedMistakes] = useState([]);
    const [activeExamType, setActiveExamType] = useState("TYT"); 
    const [activeSubject, setActiveSubject] = useState("Matematik");

    const obpData = calculateOBP(currentUser.s9Avg, currentUser.s10Avg, currentUser.s11Avg, currentUser.s12Avg);

    const openAnalyzeModal = (score) => {
        setAnalyzeMode(score);
        setSelectedMistakes(score.mistakes || []);
        if (score.includeTYT) setActiveExamType("TYT"); else setActiveExamType("AYT");
        setActiveSubject("Matematik");
    };

    const handleSaveMistakes = async () => {
        if (!analyzeMode) return;
        try {
            const scoreRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'exam_scores_v3', analyzeMode.id);
            await updateDoc(scoreRef, { mistakes: selectedMistakes });
            alert("Eksik konular kaydedildi! 🧠"); setAnalyzeMode(null); setSelectedMistakes([]);
        } catch (error) { console.error(error); alert("Hata oluştu."); }
    };

    const toggleMistake = (topic) => {
        if (selectedMistakes.includes(topic)) setSelectedMistakes(prev => prev.filter(t => t !== topic));
        else setSelectedMistakes(prev => [...prev, topic]);
    };

    const getSubjects = () => {
        if (!analyzeMode) return [];
        if (!TOPICS[activeExamType]) return [];
        return Object.keys(TOPICS[activeExamType]);
    };

    const DetailModal = ({ score, onClose }) => {
        if (!score) return null;
        return (
            <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
                <div className="glass-box rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-white/10 flex flex-col">
                    <div className="bg-white/5 backdrop-blur border-b border-white/10 p-4 md:p-6 flex justify-between items-center flex-shrink-0">
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-white truncate max-w-[200px] md:max-w-md">{score.examName}</h2>
                            <p className="text-[10px] md:text-xs text-slate-400 mt-0.5 flex items-center gap-1"><Calendar size={12}/> {new Date(score.timestamp?.seconds * 1000).toLocaleDateString('tr-TR')}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"><X size={20}/></button>
                    </div>
                    <div className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto custom-scrollbar flex-1">
                        <div className="grid grid-cols-3 gap-2 md:gap-4">
                            <div className="bg-white/5 p-2 md:p-4 rounded-xl text-center border border-white/10">
                                <div className="text-[9px] md:text-xs text-slate-400 font-bold uppercase truncate">Ham Puan</div>
                                <div className="text-lg md:text-2xl font-bold text-white truncate">{score.finalScore}</div>
                            </div>
                            <div className="bg-indigo-500/20 p-2 md:p-4 rounded-xl text-center border border-indigo-500/30">
                                <div className="text-[9px] md:text-xs text-indigo-300 font-bold uppercase truncate">Yerleştirme</div>
                                <div className="text-lg md:text-2xl font-bold text-indigo-400 truncate">{score.placementScore}</div>
                            </div>
                            <div className="bg-green-500/20 p-2 md:p-4 rounded-xl text-center border border-green-500/30">
                                <div className="text-[9px] md:text-xs text-green-400 font-bold uppercase truncate">Sıralama</div>
                                <div className="text-sm md:text-lg font-bold text-green-300 truncate">{rankings[score.id] || "-"}</div>
                            </div>
                        </div>
                        {score.mistakes && score.mistakes.length > 0 && (
                            <div className="bg-red-500/10 p-3 md:p-4 rounded-xl border border-red-500/30">
                                <h4 className="text-[10px] md:text-xs font-bold text-red-400 uppercase mb-2 flex items-center gap-1"><AlertCircle size={12}/> Eksikler</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {score.mistakes.map((m, i) => (<span key={i} className="text-[9px] md:text-xs bg-red-500/20 text-red-300 px-1.5 py-0.5 md:px-2 md:py-1 rounded border border-red-500/30">{m}</span>))}
                                </div>
                            </div>
                        )}
                        {score.includeTYT && (
                            <div className="border border-white/10 rounded-xl overflow-hidden">
                                <div className="bg-indigo-600 text-white p-2 md:p-3 text-xs md:text-sm font-bold flex justify-between"><span>TYT Sonuçları</span><span>{score.tyt?.score} P.</span></div>
                                <div className="grid grid-cols-4 gap-px bg-white/10">
                                    {[{ l: 'Mat', v: score.tyt?.math }, { l: 'Trk', v: score.tyt?.turkish }, { l: 'Fen', v: score.tyt?.science }, { l: 'Sos', v: score.tyt?.social }].map((item, i) => (
                                        <div key={i} className="bg-slate-900/80 p-2 text-center">
                                            <div className="text-[9px] md:text-xs text-slate-400 mb-0.5">{item.l}</div>
                                            <div className="font-bold text-white text-sm md:text-lg">{item.v || 0}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {score.includeAYT && (
                            <div className="border border-white/10 rounded-xl overflow-hidden">
                                <div className="bg-purple-600 text-white p-2 md:p-3 text-xs md:text-sm font-bold flex justify-between"><span>AYT Sonuçları</span><span>{score.ayt?.score} P.</span></div>
                                <div className="grid grid-cols-2 gap-px bg-white/10">
                                    {[{ l: 'Matematik', v: score.ayt?.math }, { l: 'Fen Bil.', v: score.ayt?.science }].map((item, i) => (
                                        <div key={i} className="bg-slate-900/80 p-2 text-center">
                                            <div className="text-[9px] md:text-xs text-slate-400 mb-0.5">{item.l}</div>
                                            <div className="font-bold text-white text-sm md:text-lg">{item.v || 0}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-24">
            {selectedScore && <DetailModal score={selectedScore} onClose={() => setSelectedScore(null)} />}
            
            {/* ANALİZ MODALI (GLASS FIX) */}
            {analyzeMode && (
                <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
                    <div className="glass-box rounded-3xl shadow-2xl w-full max-w-lg h-[80vh] border border-white/10 flex flex-col overflow-hidden">
                        <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center flex-shrink-0">
                            <div><h3 className="font-bold text-white">Eksiklerini Seç</h3><p className="text-xs text-slate-400">Hangi sorularda takıldın?</p></div>
                            <button onClick={() => setAnalyzeMode(null)}><X size={20} className="text-slate-400 hover:text-white"/></button>
                        </div>
                        <div className="flex-shrink-0 bg-white/5 border-b border-white/10">
                            {analyzeMode.includeTYT && analyzeMode.includeAYT && (
                                <div className="flex border-b border-white/10">
                                    <button onClick={() => setActiveExamType('TYT')} className={`flex-1 py-3 text-xs font-bold transition-colors ${activeExamType === 'TYT' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/10' : 'text-slate-400 hover:bg-white/5'}`}>TYT</button>
                                    <button onClick={() => setActiveExamType('AYT')} className={`flex-1 py-3 text-xs font-bold transition-colors ${activeExamType === 'AYT' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/10' : 'text-slate-400 hover:bg-white/5'}`}>AYT</button>
                                </div>
                            )}
                            <div className="p-2 flex gap-2 overflow-x-auto no-scrollbar">
                                {getSubjects().map(sub => (
                                    <button key={sub} onClick={() => setActiveSubject(sub)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${activeSubject === sub ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white/5 text-slate-300 border-white/10 hover:border-indigo-400'}`}>{sub}</button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-black/20">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {TOPICS[activeExamType] && TOPICS[activeExamType][activeSubject] ? (
                                    TOPICS[activeExamType][activeSubject].map((topic, i) => (
                                        <button key={i} onClick={() => toggleMistake(topic)} className={`p-3 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between group ${selectedMistakes.includes(topic) ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-white/5 border-white/10 text-slate-300 hover:border-indigo-500/50'}`}>
                                            <span className="truncate">{topic}</span>
                                            {selectedMistakes.includes(topic) && <div className="w-2 h-2 rounded-full bg-red-500"></div>}
                                        </button>
                                    ))
                                ) : <p className="text-center text-slate-500 text-xs py-10 col-span-2">Konu listesi yüklenemedi.</p>}
                            </div>
                        </div>
                        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-between items-center flex-shrink-0">
                            <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><BookOpen size={14}/> {selectedMistakes.length}</span>
                            <button onClick={handleSaveMistakes} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg active:scale-95">Kaydet</button>
                        </div>
                    </div>
                </div>
            )}

            {/* OBP KARTI (Aynı) */}
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-indigo-500/30">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                    <div><h2 className="text-2xl font-bold flex items-center gap-2"><Calculator className="opacity-80"/> OBP</h2><p className="text-indigo-200 text-sm mt-1">Okul Başarı Puanı</p></div>
                    <div className="flex gap-4 text-center">
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 min-w-[80px]"><div className="text-[10px] text-indigo-300 uppercase font-bold">Diploma</div><div className="text-lg font-bold">{obpData.diplomaNote}</div></div>
                        <div className="bg-indigo-600 text-white rounded-2xl p-3 min-w-[90px] shadow-lg"><div className="text-[10px] text-indigo-200 uppercase font-bold">Ek Puan</div><div className="text-xl font-extrabold">+{obpData.placementBonus}</div></div>
                    </div>
                </div>
            </div>

            {/* DENEME LİSTESİ (GLASS FIX) */}
            <div className="glass-box rounded-3xl shadow-sm overflow-hidden transition-colors">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center gap-2"><List size={20}/> Deneme Geçmişi</h3>
                    <span className="text-xs font-bold bg-white/10 text-slate-300 px-2 py-1 rounded-lg">{myScores.length} Sınav</span>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-xs uppercase text-slate-400 font-bold border-b border-white/10">
                        <tr><th className="p-4 pl-6">Deneme</th><th className="p-4 text-right hidden sm:table-cell">Ham</th><th className="p-4 text-right text-indigo-400">Y-Puan</th><th className="p-4 text-center">İşlem</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {myScores.length > 0 ? myScores.map((score) => (
                            <tr key={score.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-4 pl-6"><div className="font-bold text-white truncate max-w-[120px] md:max-w-[200px] text-sm md:text-base">{score.examName}</div><div className="text-[10px] md:text-xs text-slate-400">{new Date(score.timestamp?.seconds * 1000).toLocaleDateString('tr-TR')}</div></td>
                                <td className="p-4 text-right font-medium text-slate-300 hidden sm:table-cell">{score.finalScore}</td>
                                <td className="p-4 text-right font-bold text-indigo-400 text-sm md:text-lg">{score.placementScore}</td>
                                <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => openAnalyzeModal(score)} className={`p-2 rounded-full transition-all ${score.mistakes?.length > 0 ? 'text-orange-400 bg-orange-500/20' : 'text-slate-400 hover:text-orange-400 hover:bg-orange-500/20'}`} title="Analiz Et"><Search size={18}/></button>
                                        <button onClick={() => setSelectedScore(score)} className="p-2 rounded-full text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/20 transition-all"><FileText size={18}/></button>
                                    </div>
                                </td>
                            </tr>
                        )) : <tr><td colSpan="5" className="p-12 text-center text-slate-400 flex flex-col items-center gap-2"><TrendingUp size={48} className="opacity-20"/><span>Veri yok.</span></td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}