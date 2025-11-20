import React, { useState } from 'react';
import { List, FileText, X, Calculator, TrendingUp, Calendar } from 'lucide-react';
import { calculateOBP } from '../utils/helpers';

export default function MyExams({ myScores, currentUser, rankings }) {
    const [selectedScore, setSelectedScore] = useState(null);

    // OBP Hesaplaması
    const obpData = calculateOBP(currentUser.s9Avg, currentUser.s10Avg, currentUser.s11Avg, currentUser.s12Avg);

    // --- DETAY MODALI ---
    const DetailModal = ({ score, onClose }) => {
        if (!score) return null;
        return (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-100 scale-100 animate-in zoom-in-95 duration-200">
                    <div className="sticky top-0 bg-white/80 backdrop-blur border-b border-slate-100 p-6 flex justify-between items-center z-10">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{score.examName}</h2>
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                <Calendar size={12}/> {new Date(score.timestamp?.seconds * 1000).toLocaleDateString('tr-TR')}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500"><X size={24}/></button>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        {/* Özet Kartları */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-slate-50 p-4 rounded-2xl text-center border border-slate-100">
                                <div className="text-xs text-slate-500 font-bold uppercase">Ham Puan</div>
                                <div className="text-2xl font-bold text-slate-800">{score.finalScore}</div>
                            </div>
                            <div className="bg-indigo-50 p-4 rounded-2xl text-center border border-indigo-100">
                                <div className="text-xs text-indigo-500 font-bold uppercase">Yerleştirme</div>
                                <div className="text-2xl font-bold text-indigo-600">{score.placementScore}</div>
                            </div>
                            <div className="bg-green-50 p-4 rounded-2xl text-center border border-green-100">
                                <div className="text-xs text-green-600 font-bold uppercase">Sıralama</div>
                                <div className="text-lg font-bold text-green-700 truncate">
                                    {rankings[score.id] || "-"}
                                </div>
                            </div>
                        </div>

                        {/* TYT Detayları */}
                        {score.includeTYT && (
                            <div className="border border-slate-100 rounded-2xl overflow-hidden">
                                <div className="bg-blue-600 text-white p-3 text-sm font-bold flex justify-between">
                                    <span>TYT Sonuçları</span>
                                    <span>{score.tyt?.score} Puan</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-100">
                                    {[
                                        { l: 'Matematik', v: score.tyt?.math },
                                        { l: 'Türkçe', v: score.tyt?.turkish },
                                        { l: 'Fen', v: score.tyt?.science },
                                        { l: 'Sosyal', v: score.tyt?.social }
                                    ].map((item, i) => (
                                        <div key={i} className="bg-white p-3 text-center">
                                            <div className="text-xs text-slate-400 mb-1">{item.l}</div>
                                            <div className="font-bold text-slate-700 text-lg">{item.v || 0}</div>
                                            <div className="text-[10px] text-slate-300">Net</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* AYT Detayları */}
                        {score.includeAYT && (
                            <div className="border border-slate-100 rounded-2xl overflow-hidden">
                                <div className="bg-purple-600 text-white p-3 text-sm font-bold flex justify-between">
                                    <span>AYT Sonuçları</span>
                                    <span>{score.ayt?.score} Puan</span>
                                </div>
                                <div className="grid grid-cols-2 gap-px bg-slate-100">
                                    {[
                                        { l: 'Matematik', v: score.ayt?.math },
                                        { l: 'Fen Bilimleri', v: score.ayt?.science }
                                    ].map((item, i) => (
                                        <div key={i} className="bg-white p-3 text-center">
                                            <div className="text-xs text-slate-400 mb-1">{item.l}</div>
                                            <div className="font-bold text-slate-700 text-lg">{item.v || 0}</div>
                                            <div className="text-[10px] text-slate-300">Net</div>
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
        <div className="max-w-5xl mx-auto space-y-6">
            {selectedScore && <DetailModal score={selectedScore} onClose={() => setSelectedScore(null)} />}

            {/* OBP Bilgi Kartı */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Calculator className="opacity-80"/> Okul Başarı Puanı (OBP)
                        </h2>
                        <p className="text-indigo-100 text-sm mt-1">Sınav puanına eklenecek bonus.</p>
                    </div>
                    <div className="flex gap-4 text-center">
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 min-w-[90px]">
                            <div className="text-xs text-indigo-200 uppercase font-bold">Diploma</div>
                            <div className="text-xl font-bold">{obpData.diplomaNote}</div>
                        </div>
                        <div className="bg-white text-indigo-900 rounded-2xl p-3 min-w-[110px] shadow-lg">
                            <div className="text-xs text-indigo-600 uppercase font-bold">Ek Puan</div>
                            <div className="text-xl font-extrabold">+{obpData.placementBonus}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Deneme Listesi */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><List size={20}/> Deneme Geçmişi</h3>
                    <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">{myScores.length} Sınav</span>
                </div>
                
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-xs uppercase text-slate-400 font-bold">
                        <tr>
                            <th className="p-4 pl-6">Deneme Adı</th>
                            <th className="p-4 text-right">Ham Puan</th>
                            <th className="p-4 text-right text-indigo-600">Y-Puan</th>
                            <th className="p-4 text-right text-green-600">Sıralama</th>
                            <th className="p-4 text-center w-20">Detay</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {myScores.length > 0 ? myScores.map((score) => (
                            <tr key={score.id} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="p-4 pl-6">
                                    <div className="font-bold text-slate-700">{score.examName}</div>
                                    <div className="text-xs text-slate-400">
                                        {new Date(score.timestamp?.seconds * 1000).toLocaleDateString('tr-TR')}
                                    </div>
                                </td>
                                <td className="p-4 text-right font-medium text-slate-600">{score.finalScore}</td>
                                <td className="p-4 text-right font-bold text-indigo-600 text-lg">{score.placementScore}</td>
                                <td className="p-4 text-right font-bold text-green-600">
                                    {rankings[score.id] ? (
                                        <span className="bg-green-50 px-2 py-1 rounded text-green-700 text-xs border border-green-100">
                                            {rankings[score.id]}
                                        </span>
                                    ) : <span className="text-slate-300 text-xs">...</span>}
                                </td>
                                <td className="p-4 text-center">
                                    <button 
                                        onClick={() => setSelectedScore(score)}
                                        className="p-2 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                    >
                                        <FileText size={18}/>
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="5" className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                                    <TrendingUp size={48} className="opacity-20"/>
                                    <span>Henüz girilmiş bir deneme sonucu yok.</span>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}