import React, { useState, useEffect } from 'react';
import { Save, Calendar, Type, CheckCircle, AlertCircle } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminExcelView({ usersList, appId }) {
    const [examConfig, setExamConfig] = useState({ name: '', date: new Date().toISOString().split('T')[0], type: 'both' });
    const [rows, setRows] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const initialRows = usersList
            .filter(u => !u.isAdmin && !u.isDemo)
            .map(u => ({
                uid: u.internalId,
                name: u.realName || u.username,
                tytMath: '', tytTurk: '', tytFen: '', tytSos: '',
                aytMath: '', aytFen: '',
                manualTytScore: '', // Elle girilecek TYT Puanı
                manualAytScore: '', // Elle girilecek AYT Puanı
                status: 'idle'
            }));
        setRows(initialRows);
    }, [usersList]);

    const handleCellChange = (uid, field, value) => {
        setRows(prev => prev.map(row => {
            if (row.uid === uid) {
                return { ...row, [field]: value };
            }
            return row;
        }));
    };

    const handleSaveAll = async () => {
        if (!examConfig.name) { alert("Lütfen bir deneme adı girin!"); return; }
        
        // Puan kontrolü: En azından puan girilmiş mi?
        const filledRows = rows.filter(r => 
            r.manualTytScore !== '' || r.manualAytScore !== ''
        );

        if (filledRows.length === 0) { alert("Henüz kimseye puan girmediniz."); return; }
        if (!confirm(`${filledRows.length} öğrenci için notlar kaydedilecek. Onaylıyor musun?`)) return;

        setIsSaving(true);
        
        for (const row of filledRows) {
            try {
                // Eğer kullanıcı sadece puan girip net girmezse sistem hata vermemeli, 0 kabul etmeli.
                const finalScore = examConfig.type === 'tyt' ? Number(row.manualTytScore) : 
                                   examConfig.type === 'ayt' ? Number(row.manualAytScore) :
                                   (Number(row.manualTytScore) * 0.4) + (Number(row.manualAytScore) * 0.6); // TYT %40 + AYT %60 (Standart)

                const scoreData = {
                    internalUserId: row.uid,
                    userName: row.name,
                    examName: examConfig.name,
                    examDate: examConfig.date, // Tarihi de kaydediyoruz artık
                    includeTYT: examConfig.type === 'tyt' || examConfig.type === 'both',
                    includeAYT: examConfig.type === 'ayt' || examConfig.type === 'both',
                    tyt: { 
                        math: Number(row.tytMath) || 0, turkish: Number(row.tytTurk) || 0, 
                        science: Number(row.tytFen) || 0, social: Number(row.tytSos) || 0,
                        score: Number(row.manualTytScore) || 0 // Elle girilen puan
                    },
                    ayt: { 
                        math: Number(row.aytMath) || 0, science: Number(row.aytFen) || 0,
                        score: Number(row.manualAytScore) || 0 // Elle girilen puan
                    },
                    finalScore: Number(finalScore.toFixed(2)), 
                    placementScore: Number(finalScore.toFixed(2)), 
                    timestamp: serverTimestamp()
                };

                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'exam_scores_v3'), scoreData);
                setRows(prev => prev.map(r => r.uid === row.uid ? { ...r, status: 'saved' } : r));

            } catch (error) {
                console.error("Hata:", error);
                setRows(prev => prev.map(r => r.uid === row.uid ? { ...r, status: 'error' } : r));
            }
        }
        setIsSaving(false);
        alert("İşlem tamamlandı!");
    };

    // Modern Input Bileşeni (Kod tekrarını azaltmak için)
    const TableInput = ({ value, onChange, placeholder, colorClass = "focus:border-indigo-500" }) => (
        <input 
            type="number" 
            className={`w-full text-center p-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium text-sm placeholder-slate-300 outline-none transition-all focus:ring-2 focus:ring-opacity-20 ${colorClass}`}
            placeholder={placeholder} 
            value={value} 
            onChange={onChange} 
        />
    );

    return (
        <div className="max-w-[95%] mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
            {/* --- Modern Üst Panel --- */}
            <div className="p-8 bg-white border-b border-slate-100 grid md:grid-cols-3 gap-8">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deneme Adı</label>
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                        <Type size={20} className="text-indigo-500"/>
                        <input 
                            type="text" 
                            placeholder="Örn: 3D Türkiye Geneli" 
                            className="w-full bg-transparent outline-none text-sm font-bold text-slate-700 placeholder-slate-400"
                            value={examConfig.name}
                            onChange={e => setExamConfig({...examConfig, name: e.target.value})}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tarih</label>
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                        <Calendar size={20} className="text-indigo-500"/>
                        <input 
                            type="date" 
                            className="w-full bg-transparent outline-none text-sm font-bold text-slate-700"
                            value={examConfig.date}
                            onChange={e => setExamConfig({...examConfig, date: e.target.value})}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sınav Türü</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        {['tyt', 'ayt', 'both'].map((type) => (
                            <button 
                                key={type}
                                onClick={() => setExamConfig({...examConfig, type})} 
                                className={`flex-1 text-xs font-bold py-2.5 rounded-lg transition-all duration-200 ${examConfig.type === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {type === 'both' ? 'TYT + AYT' : type.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- Excel Tablosu --- */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 font-bold w-48 text-slate-400">Öğrenci</th>
                            {(examConfig.type === 'tyt' || examConfig.type === 'both') && (
                                <>
                                    <th className="px-2 py-3 text-center text-indigo-400 font-bold">Mat</th>
                                    <th className="px-2 py-3 text-center text-indigo-400 font-bold">Turk</th>
                                    <th className="px-2 py-3 text-center text-indigo-400 font-bold">Fen</th>
                                    <th className="px-2 py-3 text-center text-indigo-400 font-bold">Sos</th>
                                    <th className="px-2 py-3 text-center w-24 bg-indigo-50/50 text-indigo-700 border-x border-indigo-100 font-extrabold">TYT PUAN</th>
                                </>
                            )}
                            {(examConfig.type === 'ayt' || examConfig.type === 'both') && (
                                <>
                                    <th className="px-2 py-3 text-center text-purple-400 font-bold">Mat</th>
                                    <th className="px-2 py-3 text-center text-purple-400 font-bold">Fen</th>
                                    <th className="px-2 py-3 text-center w-24 bg-purple-50/50 text-purple-700 border-x border-purple-100 font-extrabold">AYT PUAN</th>
                                </>
                            )}
                            <th className="px-4 py-3 text-center w-16">Durum</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {rows.map((row) => (
                            <tr key={row.uid} className={`hover:bg-slate-50/80 transition-colors group ${row.status === 'saved' ? 'bg-green-50/50' : ''}`}>
                                <td className="px-6 py-3 font-semibold text-slate-700 truncate max-w-[12rem]">{row.name}</td>
                                
                                {(examConfig.type === 'tyt' || examConfig.type === 'both') && (
                                    <>
                                        <td className="p-2"><TableInput value={row.tytMath} onChange={e => handleCellChange(row.uid, 'tytMath', e.target.value)} placeholder="-" /></td>
                                        <td className="p-2"><TableInput value={row.tytTurk} onChange={e => handleCellChange(row.uid, 'tytTurk', e.target.value)} placeholder="-" /></td>
                                        <td className="p-2"><TableInput value={row.tytFen} onChange={e => handleCellChange(row.uid, 'tytFen', e.target.value)} placeholder="-" /></td>
                                        <td className="p-2"><TableInput value={row.tytSos} onChange={e => handleCellChange(row.uid, 'tytSos', e.target.value)} placeholder="-" /></td>
                                        <td className="p-2 bg-indigo-50/30 border-x border-indigo-50">
                                            <input 
                                                type="number" 
                                                className="w-full text-center p-2.5 rounded-lg border-2 border-indigo-100 bg-white text-indigo-700 font-bold text-sm focus:border-indigo-500 outline-none transition-all shadow-sm"
                                                placeholder="0.00" 
                                                value={row.manualTytScore} 
                                                onChange={e => handleCellChange(row.uid, 'manualTytScore', e.target.value)} 
                                            />
                                        </td>
                                    </>
                                )}

                                {(examConfig.type === 'ayt' || examConfig.type === 'both') && (
                                    <>
                                        <td className="p-2"><TableInput value={row.aytMath} onChange={e => handleCellChange(row.uid, 'aytMath', e.target.value)} placeholder="-" colorClass="focus:border-purple-500 focus:ring-purple-500" /></td>
                                        <td className="p-2"><TableInput value={row.aytFen} onChange={e => handleCellChange(row.uid, 'aytFen', e.target.value)} placeholder="-" colorClass="focus:border-purple-500 focus:ring-purple-500" /></td>
                                        <td className="p-2 bg-purple-50/30 border-x border-purple-50">
                                            <input 
                                                type="number" 
                                                className="w-full text-center p-2.5 rounded-lg border-2 border-purple-100 bg-white text-purple-700 font-bold text-sm focus:border-purple-500 outline-none transition-all shadow-sm"
                                                placeholder="0.00" 
                                                value={row.manualAytScore} 
                                                onChange={e => handleCellChange(row.uid, 'manualAytScore', e.target.value)} 
                                            />
                                        </td>
                                    </>
                                )}

                                <td className="px-4 py-2 text-center">
                                    {row.status === 'saved' && <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 animate-in zoom-in"><CheckCircle size={18}/></div>}
                                    {row.status === 'error' && <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600"><AlertCircle size={18}/></div>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- Alt Bar --- */}
            <div className="p-6 bg-white border-t border-slate-100 flex justify-between items-center">
                <div className="text-sm text-slate-500 font-medium">
                    Toplam <span className="font-bold text-slate-800">{rows.length}</span> öğrenci
                </div>
                <button 
                    onClick={handleSaveAll} 
                    disabled={isSaving}
                    className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white shadow-xl shadow-indigo-200 transition-all transform hover:scale-[1.02] active:scale-95 ${isSaving ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                    {isSaving ? 'Kaydediliyor...' : <><Save size={20}/> Sonuçları Kaydet</>}
                </button>
            </div>
        </div>
    );
}