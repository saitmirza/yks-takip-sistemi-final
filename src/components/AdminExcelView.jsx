import React, { useState, useEffect } from 'react';
import { Save, Calendar, Type, CheckCircle, AlertCircle, Edit, PlusCircle, Search } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { calculateScoreSAY } from '../utils/helpers';

const TableInput = ({ value, onChange, placeholder, colorClass = "focus:border-indigo-500" }) => (
    <input 
        type="number" 
        className={`w-full text-center p-2.5 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-700 dark:text-white font-medium text-sm placeholder-slate-300 outline-none transition-all focus:ring-2 focus:ring-opacity-20 ${colorClass}`}
        placeholder={placeholder} 
        value={value} 
        onChange={onChange} 
    />
);

export default function AdminExcelView({ usersList, allScores, appId }) {
    const [mode, setMode] = useState('create'); 
    const [examConfig, setExamConfig] = useState({ name: '', date: new Date().toISOString().split('T')[0], type: 'both' });
    const [rows, setRows] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedExamId, setSelectedExamId] = useState(""); 

    const uniqueExams = [...new Set(allScores.map(s => s.examName))].sort();

    useEffect(() => {
        let initialRows = [];
        const baseStudents = usersList.filter(u => !u.isAdmin && !u.isDemo);

        if (mode === 'create') {
            initialRows = baseStudents.map(u => createEmptyRow(u));
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
            initialRows = baseStudents.map(u => {
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
            });
        }
        setRows(initialRows);
    }, [usersList, mode, selectedExamId, allScores]);

    const createEmptyRow = (user) => ({ uid: user.internalId, docId: null, name: user.realName || user.username, tytMath: '', tytTurk: '', tytFen: '', tytSos: '', aytMath: '', aytFen: '', manualTytScore: '', manualAytScore: '', status: 'idle' });
    const handleCellChange = (uid, field, value) => { setRows(prev => prev.map(row => row.uid === uid ? { ...row, [field]: value, status: 'pending' } : row)); };

    const handleSaveAll = async () => {
        if (!examConfig.name) { alert("Lütfen bir deneme adı girin!"); return; }
        const rowsToProcess = rows.filter(r => (r.manualTytScore !== '' || r.manualAytScore !== '') && r.status !== 'saved');
        if (rowsToProcess.length === 0) { alert("Kaydedilecek veri yok."); return; }
        if (!confirm(`${rowsToProcess.length} öğrenci kaydedilecek. Onaylıyor musun?`)) return;
        setIsSaving(true);
        for (const row of rowsToProcess) {
            try {
                let calcFinal = 0;
                if (!row.manualTytScore && !row.manualAytScore) {
                    const nets = { tytMath: Number(row.tytMath), tytTurk: Number(row.tytTurk), tytFen: Number(row.tytFen), tytSos: Number(row.tytSos), aytMath: Number(row.aytMath), aytFen: Number(row.aytFen) };
                    const calculated = calculateScoreSAY(nets);
                    calcFinal = calculated.say;
                } else { calcFinal = (Number(row.manualTytScore) * 0.4) + (Number(row.manualAytScore) * 0.6); }
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
        <div className="max-w-[95%] mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-gray-700 pb-20 transition-colors">
            <div className="flex border-b border-slate-100 dark:border-gray-700">
                <button onClick={() => { setMode('create'); setExamConfig({ name: '', date: new Date().toISOString().split('T')[0], type: 'both' }); setRows(rows.map(r => ({...r, status:'idle', docId: null, manualTytScore:'', manualAytScore:''}))); }} className={`flex-1 p-4 flex items-center justify-center gap-2 font-bold transition-colors ${mode === 'create' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700'}`}><PlusCircle size={20}/> Yeni Sınav</button>
                <button onClick={() => setMode('edit')} className={`flex-1 p-4 flex items-center justify-center gap-2 font-bold transition-colors ${mode === 'edit' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-b-2 border-orange-600' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700'}`}><Edit size={20}/> Düzenle</button>
            </div>
            <div className="p-8 bg-white dark:bg-gray-800 border-b border-slate-100 dark:border-gray-700 grid md:grid-cols-3 gap-8 items-end">
                {mode === 'create' ? (
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deneme Adı</label><div className="flex items-center gap-3 bg-slate-50 dark:bg-gray-700 p-3 rounded-2xl border border-slate-200 dark:border-gray-600 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all"><Type size={20} className="text-indigo-500"/><input type="text" placeholder="Örn: 3D Türkiye Geneli" className="w-full bg-transparent outline-none text-sm font-bold text-slate-700 dark:text-white placeholder-slate-400" value={examConfig.name} onChange={e => setExamConfig({...examConfig, name: e.target.value})} /></div></div>
                ) : (
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sınav Seç</label><div className="flex items-center gap-3 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-2xl border border-orange-200 dark:border-orange-800"><Search size={20} className="text-orange-500"/><select className="w-full bg-transparent outline-none text-sm font-bold text-slate-700 dark:text-white cursor-pointer" value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}><option value="">Seçiniz...</option>{uniqueExams.map(name => <option key={name} value={name}>{name}</option>)}</select></div></div>
                )}
                <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tarih</label><div className="flex items-center gap-3 bg-slate-50 dark:bg-gray-700 p-3 rounded-2xl border border-slate-200 dark:border-gray-600"><Calendar size={20} className="text-indigo-500"/><input type="date" className="w-full bg-transparent outline-none text-sm font-bold text-slate-700 dark:text-white" value={examConfig.date} onChange={e => setExamConfig({...examConfig, date: e.target.value})} /></div></div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tür</label><div className="flex bg-slate-100 dark:bg-gray-700 p-1 rounded-xl">{['tyt', 'ayt', 'both'].map((type) => (<button key={type} onClick={() => setExamConfig({...examConfig, type})} className={`flex-1 text-xs font-bold py-2.5 rounded-lg transition-all duration-200 ${examConfig.type === type ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700'}`}>{type === 'both' ? 'TYT + AYT' : type.toUpperCase()}</button>))}</div></div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 dark:bg-gray-800/50 border-b border-slate-100 dark:border-gray-700">
                        <tr>
                            <th className="px-6 py-4 font-bold w-48 text-slate-400">Öğrenci</th>
                            {(examConfig.type !== 'ayt') && <><th className="px-2 text-center text-indigo-400 font-bold">Mat</th><th className="px-2 text-center text-indigo-400 font-bold">Turk</th><th className="px-2 text-center text-indigo-400 font-bold">Fen</th><th className="px-2 text-center text-indigo-400 font-bold">Sos</th><th className="px-2 text-center w-24 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-extrabold">TYT P</th></>}
                            {(examConfig.type !== 'tyt') && <><th className="px-2 text-center text-purple-400 font-bold">Mat</th><th className="px-2 text-center text-purple-400 font-bold">Fen</th><th className="px-2 text-center w-24 bg-purple-50/50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-extrabold">AYT P</th></>}
                            <th className="px-4 py-3 text-center w-16">D</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-gray-700">
                        {rows.length > 0 ? rows.map((row) => (
                            <tr key={row.uid} className={`hover:bg-slate-50/80 dark:hover:bg-gray-700/50 transition-colors group ${row.status === 'saved' ? 'bg-green-50/50 dark:bg-green-900/20' : ''}`}>
                                <td className="px-6 py-3 font-semibold text-slate-700 dark:text-white truncate max-w-[12rem]">{row.name}{row.docId && mode === 'edit' && <span className="ml-2 text-[9px] bg-blue-100 text-blue-600 px-1 rounded">✓</span>}</td>
                                {(examConfig.type !== 'ayt') && <><td className="p-2"><TableInput value={row.tytMath} onChange={e => handleCellChange(row.uid, 'tytMath', e.target.value)} placeholder="-" /></td><td className="p-2"><TableInput value={row.tytTurk} onChange={e => handleCellChange(row.uid, 'tytTurk', e.target.value)} placeholder="-" /></td><td className="p-2"><TableInput value={row.tytFen} onChange={e => handleCellChange(row.uid, 'tytFen', e.target.value)} placeholder="-" /></td><td className="p-2"><TableInput value={row.tytSos} onChange={e => handleCellChange(row.uid, 'tytSos', e.target.value)} placeholder="-" /></td><td className="p-2 bg-indigo-50/30 dark:bg-indigo-900/10"><input type="number" className="w-full text-center p-2.5 rounded-lg border-2 border-indigo-100 dark:border-indigo-800 bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 font-bold text-sm outline-none" placeholder="0.00" value={row.manualTytScore} onChange={e => handleCellChange(row.uid, 'manualTytScore', e.target.value)} /></td></>}
                                {(examConfig.type !== 'tyt') && <><td className="p-2"><TableInput value={row.aytMath} onChange={e => handleCellChange(row.uid, 'aytMath', e.target.value)} placeholder="-" colorClass="focus:border-purple-500"/></td><td className="p-2"><TableInput value={row.aytFen} onChange={e => handleCellChange(row.uid, 'aytFen', e.target.value)} placeholder="-" colorClass="focus:border-purple-500"/></td><td className="p-2 bg-purple-50/30 dark:bg-purple-900/10"><input type="number" className="w-full text-center p-2.5 rounded-lg border-2 border-purple-100 dark:border-purple-800 bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 font-bold text-sm outline-none" placeholder="0.00" value={row.manualAytScore} onChange={e => handleCellChange(row.uid, 'manualAytScore', e.target.value)} /></td></>}
                                <td className="px-4 py-2 text-center">{row.status === 'saved' && <CheckCircle size={18} className="text-green-600 mx-auto"/>}{row.status === 'error' && <AlertCircle size={18} className="text-red-600 mx-auto"/>}</td>
                            </tr>
                        )) : <tr><td colSpan="10" className="p-8 text-center text-slate-400">{mode === 'edit' ? 'Sınav seçin.' : 'Liste yükleniyor...'}</td></tr>}
                    </tbody>
                </table>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 border-t border-slate-100 dark:border-gray-700 flex justify-between items-center fixed bottom-0 right-0 left-0 md:left-64 z-40 shadow-lg-top"><div className="text-sm text-slate-500 dark:text-gray-400 font-medium">Toplam <span className="font-bold text-slate-800 dark:text-white">{rows.length}</span> öğrenci</div><button onClick={handleSaveAll} disabled={isSaving} className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl transition-all">{isSaving ? 'İşleniyor...' : <><Save size={20}/> Kaydet</>}</button></div>
        </div>
    );
}