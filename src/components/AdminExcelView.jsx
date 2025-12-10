import React, { useState, useEffect } from 'react';
import { Save, Calendar, Type, CheckCircle, AlertCircle, Edit, PlusCircle, Search, Trash2, Filter } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, deleteDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { calculateScoreSAY } from '../utils/helpers';

// Ortak Input Stili
const inputStyle = {
    backgroundColor: '#1e293b', 
    color: '#ffffff',
    border: '1px solid #334155',
    outline: 'none'
};

// Tablo İçi Input Bileşeni
const TableInput = ({ value, onChange, placeholder, colorClass = "focus:border-indigo-500" }) => (
    <input 
        type="number" 
        className={`w-full text-center p-2 rounded-lg text-white font-bold text-sm placeholder-slate-500 transition-all focus:border-indigo-500`}
        style={inputStyle}
        placeholder={placeholder} 
        value={value} 
        onChange={onChange} 
    />
);

export default function AdminExcelView({ usersList, allScores, appId, dataToEdit }) {
    const [mode, setMode] = useState('create'); 
    const [examConfig, setExamConfig] = useState({ name: '', date: new Date().toISOString().split('T')[0], type: 'both' });
    const [rows, setRows] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedExamId, setSelectedExamId] = useState(""); 
    const [classFilter, setClassFilter] = useState("ALL");
    
    const classSections = ["12-A", "12-B", "12-C", "12-D", "12-E", "12-F", "Mezun"];
    const uniqueExams = [...new Set(allScores.map(s => s.examName))].sort();

    useEffect(() => {
        let filteredUsers = usersList.filter(u => !u.isAdmin && !u.isDemo);
        if (classFilter !== "ALL") {
            filteredUsers = filteredUsers.filter(u => u.classSection === classFilter);
        }

        if (dataToEdit && dataToEdit.isEditing) {
            setMode('edit');
            setExamConfig({ name: dataToEdit.examName, date: new Date().toISOString().split('T')[0], type: dataToEdit.examType });
            setSelectedExamId(dataToEdit.examName); 
            
            const initialRows = filteredUsers.map(u => {
                const scoreData = dataToEdit.initialScores.find(s => s.internalUserId === u.internalId);
                if (scoreData) {
                    return {
                        uid: u.internalId, docId: scoreData.id, name: u.realName || u.username,
                        tytMath: scoreData.tyt?.math || '', tytTurk: scoreData.tyt?.turkish || '', tytFen: scoreData.tyt?.science || '', tytSos: scoreData.tyt?.social || '',
                        aytMath: scoreData.ayt?.math || '', aytFen: scoreData.ayt?.science || '',
                        manualTytScore: scoreData.tyt?.score || '', manualAytScore: scoreData.ayt?.score || '',
                        status: 'idle'
                    };
                } else {
                    return createEmptyRow(u);
                }
            });
            setRows(initialRows);
            return; 
        }

        if (mode === 'create') {
            setRows(filteredUsers.map(u => createEmptyRow(u)));
        } else {
            if (!selectedExamId) { setRows([]); return; }
            const existingScores = allScores.filter(s => s.examName === selectedExamId);
            if (existingScores.length > 0) {
                const sample = existingScores[0];
                setExamConfig({
                    name: sample.examName,
                    date: sample.examDate || new Date().toISOString().split('T')[0],
                    type: (sample.includeTYT && sample.includeAYT) ? 'both' : (sample.includeTYT ? 'tyt' : 'ayt')
                });
            }
            setRows(filteredUsers.map(u => {
                const scoreData = existingScores.find(s => s.internalUserId === u.internalId);
                if (scoreData) {
                    return {
                        uid: u.internalId, docId: scoreData.id, name: u.realName || u.username,
                        tytMath: scoreData.tyt?.math || '', tytTurk: scoreData.tyt?.turkish || '', tytFen: scoreData.tyt?.science || '', tytSos: scoreData.tyt?.social || '',
                        aytMath: scoreData.ayt?.math || '', aytFen: scoreData.ayt?.science || '',
                        manualTytScore: scoreData.tyt?.score || '', manualAytScore: scoreData.ayt?.score || '',
                        status: 'idle'
                    };
                } else { return createEmptyRow(u); }
            }));
        }
    }, [usersList, mode, selectedExamId, allScores, dataToEdit, classFilter]);

    const createEmptyRow = (user) => ({ uid: user.internalId, docId: null, name: user.realName || user.username, tytMath: '', tytTurk: '', tytFen: '', tytSos: '', aytMath: '', aytFen: '', manualTytScore: '', manualAytScore: '', status: 'idle' });
    const handleCellChange = (uid, field, value) => { setRows(prev => prev.map(row => row.uid === uid ? { ...row, [field]: value, status: 'pending' } : row)); };

    const handleDeleteExam = async () => {
        if (!selectedExamId || mode !== 'edit') return;
        if (!confirm(`DİKKAT! "${selectedExamId}" sınavına ait TÜM ÖĞRENCİ KAYITLARI silinecek. Onaylıyor musun?`)) return;
        setIsSaving(true);
        try {
            const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'exam_scores_v3'), where("examName", "==", selectedExamId));
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            snapshot.docs.forEach((doc) => { batch.delete(doc.ref); });
            await batch.commit();
            alert("Sınav silindi.");
            setMode('create'); setSelectedExamId(""); setExamConfig({ name: '', date: new Date().toISOString().split('T')[0], type: 'both' });
        } catch (error) { console.error(error); alert("Hata oluştu."); }
        setIsSaving(false);
    };

    const handleSaveAll = async () => {
        if (!examConfig.name) { alert("Lütfen bir deneme adı girin!"); return; }
        const rowsToProcess = rows.filter(r => (r.manualTytScore !== '' || r.manualAytScore !== '' || r.tytMath !== '' || r.aytMath !== '') && r.status !== 'saved');
        if (rowsToProcess.length === 0) { alert("Kaydedilecek veri yok."); return; }
        if (!confirm(`${rowsToProcess.length} öğrenci kaydedilecek. Onaylıyor musun?`)) return;
        
        setIsSaving(true);
        for (const row of rowsToProcess) {
            try {
                let calcFinal = 0;
                if (!row.manualTytScore && !row.manualAytScore) {
                    const nets = { 
                        tytMath: Number(row.tytMath), tytTurk: Number(row.tytTurk), tytFen: Number(row.tytFen), tytSos: Number(row.tytSos), 
                        aytMath: examConfig.type !== 'tyt' ? Number(row.aytMath) : 0, aytFen: examConfig.type !== 'tyt' ? Number(row.aytFen) : 0 
                    };
                    const calculated = calculateScoreSAY(nets);
                    calcFinal = examConfig.type === 'tyt' ? calculated.tyt : calculated.say;
                } else { 
                    if (examConfig.type === 'tyt') calcFinal = Number(row.manualTytScore);
                    else if (examConfig.type === 'ayt') calcFinal = Number(row.manualAytScore);
                    else calcFinal = (Number(row.manualTytScore) * 0.4) + (Number(row.manualAytScore) * 0.6); 
                }
                const scoreData = {
                    internalUserId: row.uid, userName: row.name, examName: examConfig.name, examDate: examConfig.date,
                    includeTYT: examConfig.type !== 'ayt', includeAYT: examConfig.type !== 'tyt',
                    tyt: { math: Number(row.tytMath), turkish: Number(row.tytTurk), science: Number(row.tytFen), social: Number(row.tytSos), score: Number(row.manualTytScore) || 0 },
                    ayt: { math: Number(row.aytMath), science: Number(row.aytFen), score: Number(row.manualAytScore) || 0 },
                    finalScore: Number(calcFinal.toFixed(2)), placementScore: Number(calcFinal.toFixed(2)), timestamp: serverTimestamp()
                };
                if (row.docId) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exam_scores_v3', row.docId), scoreData);
                else { const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'exam_scores_v3'), scoreData); setRows(prev => prev.map(r => r.uid === row.uid ? { ...r, docId: docRef.id } : r)); }
                setRows(prev => prev.map(r => r.uid === row.uid ? { ...r, status: 'saved' } : r));
            } catch (error) { console.error(error); setRows(prev => prev.map(r => r.uid === row.uid ? { ...r, status: 'error' } : r)); }
        }
        setIsSaving(false); alert("Tamamlandı!");
    };

    return (
        <div className="max-w-[98%] mx-auto glass-box rounded-3xl shadow-xl overflow-hidden pb-32 relative transition-colors">
            
            {/* ÜST BAR (GLASS FIX) */}
            <div className="flex flex-col md:flex-row border-b border-white/10 justify-between items-center pr-4 bg-white/5">
                <div className="flex flex-1 w-full">
                    <button onClick={() => { setMode('create'); setExamConfig({ name: '', date: new Date().toISOString().split('T')[0], type: 'both' }); }} className={`flex-1 p-4 flex items-center justify-center gap-2 font-bold transition-colors ${mode === 'create' ? 'bg-indigo-600/20 text-indigo-300 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><PlusCircle size={20}/> Yeni Sınav</button>
                    <button onClick={() => setMode('edit')} className={`flex-1 p-4 flex items-center justify-center gap-2 font-bold transition-colors ${mode === 'edit' ? 'bg-orange-500/20 text-orange-300 border-b-2 border-orange-500' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><Edit size={20}/> Düzenle</button>
                </div>
                
                {/* SINIF FİLTRESİ */}
                <div className="flex items-center gap-2 p-2 w-full md:w-auto border-t md:border-t-0 md:border-l border-white/10">
                    <Filter size={16} className="text-slate-400"/>
                    <select 
                        value={classFilter} 
                        onChange={(e) => setClassFilter(e.target.value)}
                        className="bg-black/20 text-white border border-white/10 text-xs font-bold rounded-lg py-2 px-3 outline-none cursor-pointer hover:bg-white/5"
                    >
                        <option value="ALL" className="text-black">Tüm Okul</option>
                        {classSections.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
                    </select>
                </div>

                {mode === 'edit' && selectedExamId && (
                    <button onClick={handleDeleteExam} className="hidden md:flex bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-xl text-xs font-bold items-center gap-2 transition-colors border border-red-500/30 ml-4"><Trash2 size={16}/> Sınavı Sil</button>
                )}
            </div>
            
            {/* AYARLAR BAR (GLASS FIX) */}
            <div className="p-4 md:p-8 bg-black/20 border-b border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                {mode === 'create' ? (
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deneme Adı</label>
                        <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 p-3 rounded-2xl focus-within:border-indigo-500 transition-all">
                            <Type size={20} className="text-indigo-500"/>
                            <input type="text" placeholder="Örn: 3D Türkiye Geneli" className="w-full bg-transparent outline-none text-sm font-bold text-white placeholder-slate-500" value={examConfig.name} onChange={e => setExamConfig({...examConfig, name: e.target.value})} />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sınav Seç</label>
                        <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 p-3 rounded-2xl">
                            <Search size={20} className="text-orange-500"/>
                            <select className="w-full bg-transparent outline-none text-sm font-bold text-white cursor-pointer [&>option]:text-black" value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}>
                                <option value="">Seçiniz...</option>{uniqueExams.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                        </div>
                    </div>
                )}
                
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tarih</label>
                    <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 p-3 rounded-2xl">
                        <Calendar size={20} className="text-indigo-500"/>
                        <input type="date" className="w-full bg-transparent outline-none text-sm font-bold text-white" value={examConfig.date} onChange={e => setExamConfig({...examConfig, date: e.target.value})} />
                    </div>
                </div>
                
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tür</label>
                    <div className="flex bg-black/30 p-1 rounded-xl border border-white/5">
                        {['tyt', 'ayt', 'both'].map((type) => (
                            <button key={type} onClick={() => setExamConfig({...examConfig, type})} className={`flex-1 text-xs font-bold py-2.5 rounded-lg transition-all ${examConfig.type === type ? 'bg-white text-indigo-900 shadow' : 'text-slate-400 hover:text-white'}`}>
                                {type === 'both' ? 'TYT + AYT' : type.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* TABLO (GLASS FIX) */}
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-400 uppercase bg-white/5 border-b border-white/10">
                        <tr>
                            <th className="px-6 py-4 font-bold w-48 sticky left-0 bg-slate-900 z-10 border-r border-white/10">Öğrenci</th>
                            {(examConfig.type !== 'ayt') && <><th className="px-2 text-center text-indigo-400 font-bold min-w-[60px]">Mat</th><th className="px-2 text-center text-indigo-400 font-bold min-w-[60px]">Turk</th><th className="px-2 text-center text-indigo-400 font-bold min-w-[60px]">Fen</th><th className="px-2 text-center text-indigo-400 font-bold min-w-[60px]">Sos</th><th className="px-2 text-center w-24 bg-indigo-500/20 text-indigo-300 font-extrabold border-l border-r border-white/5">TYT P</th></>}
                            {(examConfig.type !== 'tyt') && <><th className="px-2 text-center text-purple-400 font-bold min-w-[60px]">Mat</th><th className="px-2 text-center text-purple-400 font-bold min-w-[60px]">Fen</th><th className="px-2 text-center w-24 bg-purple-500/20 text-purple-300 font-extrabold border-l border-r border-white/5">AYT P</th></>}
                            <th className="px-4 py-3 text-center w-16">D</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {rows.length > 0 ? rows.map((row) => (
                            <tr key={row.uid} className={`hover:bg-white/5 transition-colors group ${row.status === 'saved' ? 'bg-green-500/10' : ''}`}>
                                <td className="px-6 py-3 font-semibold text-white truncate max-w-[12rem] sticky left-0 bg-slate-900 z-10 border-r border-white/10 shadow-[2px_0_10px_rgba(0,0,0,0.3)]">
                                    {row.name}{row.docId && mode === 'edit' && <span className="ml-2 text-[9px] bg-blue-500/20 text-blue-300 px-1 rounded">✓</span>}
                                </td>
                                {(examConfig.type !== 'ayt') && <><td className="p-2"><TableInput value={row.tytMath} onChange={e => handleCellChange(row.uid, 'tytMath', e.target.value)} placeholder="-" /></td><td className="p-2"><TableInput value={row.tytTurk} onChange={e => handleCellChange(row.uid, 'tytTurk', e.target.value)} placeholder="-" /></td><td className="p-2"><TableInput value={row.tytFen} onChange={e => handleCellChange(row.uid, 'tytFen', e.target.value)} placeholder="-" /></td><td className="p-2"><TableInput value={row.tytSos} onChange={e => handleCellChange(row.uid, 'tytSos', e.target.value)} placeholder="-" /></td><td className="p-2 bg-indigo-500/10 border-l border-r border-white/5"><input type="number" className="w-full text-center p-2 rounded-lg bg-slate-900 border border-indigo-500/50 text-indigo-300 font-bold text-sm outline-none focus:border-indigo-400" placeholder="0.00" value={row.manualTytScore} onChange={e => handleCellChange(row.uid, 'manualTytScore', e.target.value)} /></td></>}
                                {(examConfig.type !== 'tyt') && <><td className="p-2"><TableInput value={row.aytMath} onChange={e => handleCellChange(row.uid, 'aytMath', e.target.value)} placeholder="-" colorClass="focus:border-purple-500"/></td><td className="p-2"><TableInput value={row.aytFen} onChange={e => handleCellChange(row.uid, 'aytFen', e.target.value)} placeholder="-" colorClass="focus:border-purple-500"/></td><td className="p-2 bg-purple-500/10 border-l border-r border-white/5"><input type="number" className="w-full text-center p-2 rounded-lg bg-slate-900 border border-purple-500/50 text-purple-300 font-bold text-sm outline-none focus:border-purple-400" placeholder="0.00" value={row.manualAytScore} onChange={e => handleCellChange(row.uid, 'manualAytScore', e.target.value)} /></td></>}
                                <td className="px-4 py-2 text-center">{row.status === 'saved' && <CheckCircle size={18} className="text-green-500 mx-auto"/>}{row.status === 'error' && <AlertCircle size={18} className="text-red-500 mx-auto"/>}</td>
                            </tr>
                        )) : <tr><td colSpan="10" className="p-8 text-center text-slate-500">{classFilter !== 'ALL' ? `${classFilter} sınıfında öğrenci yok.` : 'Liste yükleniyor...'}</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* KAYDET BAR (GLASS FIX) */}
            <div className="p-4 md:p-6 bg-slate-900/95 backdrop-blur border-t border-white/10 flex justify-between items-center fixed bottom-20 md:bottom-0 right-0 left-0 md:left-64 z-40 shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
                <div className="text-sm text-slate-400 font-medium">Toplam <span className="font-bold text-white">{rows.length}</span> öğrenci ({classFilter === 'ALL' ? 'Tümü' : classFilter})</div>
                <button onClick={handleSaveAll} disabled={isSaving} className="flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSaving ? 'İşleniyor...' : <><Save size={20}/> Kaydet</>}
                </button>
            </div>
        </div>
    );
}