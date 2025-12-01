

import React, { useState, useEffect } from 'react';
import { Target, School, Plus, Trash2, TrendingUp, CheckCircle, Trophy, GraduationCap, Search, X } from 'lucide-react';
import { doc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { UNIVERSITY_DATA } from '../utils/universityData'; // YENİ VERİ DOSYASI

export default function DreamSchool({ currentUser, myScores }) {
    const [targets, setTargets] = useState([]);
    const [showForm, setShowForm] = useState(false);
    
    // ARAMA STATE'LERİ
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUni, setSelectedUni] = useState(null); // Seçilen okul objesi

    // 1. GÜNCEL ORTALAMA HESAPLAMA
    const validScores = myScores.filter(s => s.placementScore > 0);
    const currentAverage = validScores.length > 0 
        ? (validScores.reduce((acc, curr) => acc + curr.placementScore, 0) / validScores.length)
        : 0;

    // 2. HEDEFLERİ ÇEKME
    useEffect(() => {
        const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email);
        const unsub = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                setTargets(docSnap.data().dreamSchools || []);
            }
        });
        return () => unsub();
    }, [currentUser]);

    // 3. ARAMA MANTIĞI
    useEffect(() => {
        if (searchTerm.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase("tr");
        const results = UNIVERSITY_DATA.filter(item => 
            item.uni.toLowerCase("tr").includes(lowerTerm) || 
            item.dept.toLowerCase("tr").includes(lowerTerm)
        ).slice(0, 10); // Max 10 sonuç göster
        setSearchResults(results);
    }, [searchTerm]);

    // 4. HEDEF EKLEME
    const handleAddTarget = async (uniData) => {
        const targetData = {
            id: Date.now(),
            university: uniData.uni,
            department: uniData.dept,
            targetScore: uniData.score,
            targetRank: uniData.rank,
            type: uniData.type
        };

        const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email);
        await updateDoc(userRef, { dreamSchools: arrayUnion(targetData) });
        
        setShowForm(false);
        setSearchTerm("");
        setSearchResults([]);
    };

    const handleDelete = async (target) => {
        if(confirm("Bu hedefi silmek istiyor musun?")) {
            const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email);
            await updateDoc(userRef, { dreamSchools: arrayRemove(target) });
        }
    };

    const getProgressColor = (percent) => {
        if (percent >= 100) return "bg-green-500";
        if (percent >= 95) return "bg-emerald-400";
        if (percent >= 85) return "bg-yellow-400";
        if (percent >= 70) return "bg-orange-400";
        return "bg-red-500";
    };

    return (
        <div className="max-w-5xl mx-auto pb-24 space-y-6">
            
            {/* ÜST BİLGİ KARTI */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden border border-slate-700">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-bold flex items-center gap-3">
                            <Target className="text-red-500"/> Hedeflerim
                        </h2>
                        <p className="text-slate-400 mt-2">YÖK Atlas verileriyle hayallerine ne kadar yakınsın?</p>
                    </div>
                    
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl text-center min-w-[150px] border border-white/10">
                        <div className="text-xs text-slate-300 uppercase font-bold tracking-wider mb-1">Ortalaman</div>
                        <div className="text-3xl font-extrabold text-white">{currentAverage.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            {/* ARAMA VE EKLEME ALANI */}
            {!showForm ? (
                <button onClick={() => setShowForm(true)} className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-gray-700 text-slate-500 dark:text-gray-400 font-bold hover:bg-slate-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2">
                    <Plus size={20}/> Yeni Hedef Ekle
                </button>
            ) : (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-gray-700 animate-in fade-in relative">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Search size={20} className="text-indigo-500"/> Okul veya Bölüm Ara</h3>
                        <button onClick={() => {setShowForm(false); setSearchTerm("")}}><X size={20} className="text-slate-400"/></button>
                    </div>
                    
                    <div className="relative">
                        <input 
                            type="text" 
                            autoFocus
                            placeholder="Örn: ODTÜ, Bilgisayar, Tıp..." 
                            className="w-full p-4 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-600 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-lg font-medium"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        
                        {/* ARAMA SONUÇLARI LİSTESİ */}
                        {searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-gray-700 z-50 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                                {searchResults.map(item => (
                                    <button 
                                        key={item.id} 
                                        onClick={() => handleAddTarget(item)}
                                        className="w-full text-left p-4 hover:bg-indigo-50 dark:hover:bg-gray-700 border-b border-slate-50 dark:border-gray-700 last:border-0 transition-colors group"
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{item.uni}</div>
                                                <div className="text-xs text-slate-500 dark:text-gray-400">{item.dept}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-indigo-600 dark:text-indigo-400">{item.score} Puan</div>
                                                <div className="text-[10px] text-slate-400 font-bold">#{item.rank}</div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {searchTerm.length > 1 && searchResults.length === 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 p-4 text-center text-slate-400 text-sm rounded-2xl shadow-lg border border-slate-100 dark:border-gray-700 z-50">
                                Sonuç bulunamadı.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* HEDEF KARTLARI */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {targets.map(target => {
                    const gap = target.targetScore - currentAverage;
                    const percent = Math.min(100, Math.max(0, (currentAverage / target.targetScore) * 100));
                    const isReached = currentAverage >= target.targetScore;

                    return (
                        <div key={target.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-gray-700 relative overflow-hidden group transition-all hover:shadow-lg">
                            <div className={`absolute top-0 left-0 w-1.5 h-full ${isReached ? 'bg-green-500' : 'bg-indigo-500'}`}></div>
                            
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-white truncate">{target.university}</h3>
                                        {isReached && <CheckCircle size={18} className="text-green-500 flex-shrink-0"/>}
                                    </div>
                                    <p className="text-slate-500 dark:text-gray-400 text-sm flex items-center gap-1 truncate"><GraduationCap size={14}/> {target.department}</p>
                                    <div className="mt-2 flex gap-2">
                                        <span className="bg-slate-100 dark:bg-gray-700 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600 dark:text-gray-300">#{target.targetRank}</span>
                                        <span className="bg-slate-100 dark:bg-gray-700 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600 dark:text-gray-300">{target.type}</span>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className="text-2xl font-bold text-slate-800 dark:text-white">{target.targetScore}</div>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Taban Puan</div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-2">
                                <div className="flex justify-between text-xs font-bold mb-1 text-slate-600 dark:text-gray-300">
                                    <span>İlerleme</span>
                                    <span>%{percent.toFixed(1)}</span>
                                </div>
                                <div className="w-full h-3 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all duration-1000 ${getProgressColor(percent)}`} style={{ width: `${percent}%` }}></div>
                                </div>
                            </div>

                            {/* Durum Mesajı */}
                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-50 dark:border-gray-700">
                                <div className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${isReached ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300'}`}>
                                    {isReached ? (
                                        <><Trophy size={14}/> Hedefe Ulaştın!</>
                                    ) : (
                                        <><TrendingUp size={14}/> {gap.toFixed(2)} puan kaldı</>
                                    )}
                                </div>
                                <button onClick={() => handleDelete(target)} className="text-slate-300 hover:text-red-500 p-2 rounded-full hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors">
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {targets.length === 0 && !showForm && (
                <div className="text-center py-12 text-slate-400">
                    <School size={64} className="mx-auto mb-4 opacity-20"/>
                    <p className="text-lg font-bold opacity-50">Henüz hedef eklemedin.</p>
                    <p className="text-sm opacity-40">Hayalindeki okulu aratarak başla!</p>
                </div>
            )}
        </div>
    );
}
