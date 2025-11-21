import React, { useState, useEffect } from 'react';
import { Save, Calendar, Type, CheckCircle, AlertCircle, Edit, PlusCircle, Search } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// Helper Component: Input Field
const TableInput = ({ value, onChange, placeholder, colorClass = "focus:border-indigo-500" }) => (
    <input 
        type="number" 
        className={`w-full text-center p-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium text-sm placeholder-slate-300 outline-none transition-all focus:ring-2 focus:ring-opacity-20 ${colorClass}`}
        placeholder={placeholder} 
        value={value} 
        onChange={onChange} 
    />
);

export default function AdminExcelView({ usersList, allScores, appId }) {
    const [mode, setMode] = useState('create'); // 'create' veya 'edit'
    const [examConfig, setExamConfig] = useState({ name: '', date: new Date().toISOString().split('T')[0], type: 'both' });
    const [rows, setRows] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedExamId, setSelectedExamId] = useState(""); // Düzenleme için seçilen sınav ismi

    // Benzersiz sınav isimlerini bul (Düzenleme listesi için)
    const uniqueExams = [...new Set(allScores.map(s => s.examName))].sort();

    // --- TABLOYU HAZIRLA ---
    useEffect(() => {
        let initialRows = [];

        // 1. ÖĞRENCİ LİSTESİNİ HAZIRLA (İskelet)
        const baseStudents = usersList.filter(u => !u.isAdmin && !u.isDemo);

        if (mode === 'create') {
            // --- YENİ GİRİŞ MODU ---
            initialRows = baseStudents.map(u => createEmptyRow(u));
        } else {
            // --- DÜZENLEME MODU ---
            if (!selectedExamId) {
                setRows([]); 
                return;
            }

            // Seçilen sınava ait mevcut verileri bul
            const existingScores = allScores.filter(s => s.examName === selectedExamId);
            
            // Eğer veri varsa, sınav tarihini ve tipini onlardan al
            if (existingScores.length > 0) {
                const sample = existingScores[0];
                setExamConfig({
                    name: sample.examName,
                    date: sample.examDate || new Date().toISOString().split('T')[0],
                    type: (sample.includeTYT && sample.includeAYT) ? 'both' : (sample.includeTYT ? 'tyt' : 'ayt')
                });
            }

            // Tabloyu doldur: Öğrencinin notu varsa doldur, yoksa boş bırak
            initialRows = baseStudents.map(u => {
                const scoreData = existingScores.find(s => s.internalUserId === u.internalId);
                if (scoreData) {
                    return {
                        uid: u.internalId,
                        docId: scoreData.id, // Güncelleme için belge ID'si şart!
                        name: u.realName || u.username,
                        tytMath: scoreData.tyt?.math || '',
                        tytTurk: scoreData.tyt?.turkish || '',
                        tytFen: scoreData.tyt?.science || '',
                        tytSos: scoreData.tyt?.social || '',
                        aytMath: scoreData.ayt?.math || '',
                        aytFen: scoreData.ayt?.science || '',
                        manualTytScore: scoreData.tyt?.score || '',
                        manualAytScore: scoreData.ayt?.score || '',
                        status: 'idle'
                    };
                } else {
                    return createEmptyRow(u); // Sınava girmemiş öğrenci için boş satır
                }
            });
        }

        setRows(initialRows);
    }, [usersList, mode, selectedExamId, allScores]);

    // Boş satır oluşturucu
    const createEmptyRow = (user) => ({
        uid: user.internalId,
        docId: null, // Yeni kayıt olacak
        name: user.realName || user.username,
        tytMath: '', tytTurk: '', tytFen: '', tytSos: '',
        aytMath: '', aytFen: '',
        manualTytScore: '', manualAytScore: '',
        status: 'idle'
    });

    const handleCellChange = (uid, field, value) => {
        setRows(prev => prev.map(row => row.uid === uid ? { ...row, [field]: value, status: 'pending' } : row));
    };

    // --- KAYDET / GÜNCELLE ---
    const handleSaveAll = async () => {
        if (!examConfig.name) { alert("Lütfen bir deneme adı girin!"); return; }
        
        // Sadece veri girilmiş veya değiştirilmiş satırları al
        const rowsToProcess = rows.filter(r => 
            (r.manualTytScore !== '' || r.manualAytScore !== '') && r.status !== 'saved'
        );

        if (rowsToProcess.length === 0) { alert("Kaydedilecek yeni veya değişen veri yok."); return; }
        if (!confirm(`${rowsToProcess.length} öğrenci için veriler işlenecek. Onaylıyor musun?`)) return;

        setIsSaving(true);
        
        for (const row of rowsToProcess) {
            try {
                const finalScore = examConfig.type === 'tyt' ? Number(row.manualTytScore) : 
                                   examConfig.type === 'ayt' ? Number(row.manualAytScore) :
                                   (Number(row.manualTytScore) * 0.4) + (Number(row.manualAytScore) * 0.6);

                const scoreData = {
                    internalUserId: row.uid,
                    userName: row.name,
                    examName: examConfig.name,
                    examDate: examConfig.date,
                    includeTYT: examConfig.type === 'tyt' || examConfig.type === 'both',
                    includeAYT: examConfig.type === 'ayt' || examConfig.type === 'both',
                    tyt: { 
                        math: Number(row.tytMath) || 0, turkish: Number(row.tytTurk) || 0, 
                        science: Number(row.tytFen) || 0, social: Number(row.tytSos) || 0,
                        score: Number(row.manualTytScore) || 0
                    },
                    ayt: { 
                        math: Number(row.aytMath) || 0, science: Number(row.aytFen) || 0,
                        score: Number(row.manualAytScore) || 0
                    },
                    finalScore: Number(finalScore.toFixed(2)), 
                    placementScore: Number(finalScore.toFixed(2)), 
                    timestamp: serverTimestamp() // Tarih güncellenir
                };

                if (row.docId) {
                    // GÜNCELLEME (UPDATE)
                    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'exam_scores_v3', row.docId);
                    // timestamp'i güncellemek istemiyorsan scoreData'dan çıkarabilirsin
                    await updateDoc(docRef, scoreData);
                } else {
                    // YENİ KAYIT (CREATE)
                    const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'exam_scores_v3'), scoreData);
                    // Yeni ID'yi satıra işle ki bir daha basarsa update yapsın
                    setRows(prev => prev.map(r => r.uid === row.uid ? { ...r, docId: docRef.id } : r));
                }

                setRows(prev => prev.map(r => r.uid === row.uid ? { ...r, status: 'saved' } : r));

            } catch (error) {
                console.error("Hata:", error);
                setRows(prev => prev.map(r => r.uid === row.uid ? { ...r, status: 'error' } : r));
            }
        }
        setIsSaving(false);
        alert("İşlem tamamlandı!");
    };

    return (
        <div className="max-w-[95%] mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 pb-20">
            
            {/* --- MOD SEÇİMİ (YENİ GİRİŞ vs DÜZENLE) --- */}
            <div className="flex border-b border-slate-100">
                <button 
                    onClick={() => { setMode('create'); setExamConfig({ name: '', date: new Date().toISOString().split('T')[0], type: 'both' }); setRows(rows.map(r => ({...r, status:'idle', docId: null, manualTytScore:'', manualAytScore:''}))); }}
                    className={`flex-1 p-4 flex items-center justify-center gap-2 font-bold transition-colors ${mode === 'create' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <PlusCircle size={20}/> Yeni Sınav Girişi
                </button>
                <button 
                    onClick={() => setMode('edit')}
                    className={`flex-1 p-4 flex items-center justify-center gap-2 font-bold transition-colors ${mode === 'edit' ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Edit size={20}/> Mevcut Sınavı Düzenle
                </button>
            </div>

            {/* --- ÜST PANEL --- */}
            <div className="p-8 bg-white border-b border-slate-100 grid md:grid-cols-3 gap-8 items-end">
                {mode === 'create' ? (
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deneme Adı</label>
                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                            <Type size={20} className="text-indigo-500"/>
                            <input type="text" placeholder="Örn: 3D Türkiye Geneli" className="w-full bg-transparent outline-none text-sm font-bold text-slate-700 placeholder-slate-400" value={examConfig.name} onChange={e => setExamConfig({...examConfig, name: e.target.value})} />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Düzenlenecek Sınavı Seç</label>
                        <div className="flex items-center gap-3 bg-orange-50 p-3 rounded-2xl border border-orange-200">
                            <Search size={20} className="text-orange-500"/>
                            <select 
                                className="w-full bg-transparent outline-none text-sm font-bold text-slate-700 cursor-pointer"
                                value={selectedExamId}
                                onChange={e => setSelectedExamId(e.target.value)}
                            >
                                <option value="">Seçiniz...</option>
                                {uniqueExams.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tarih</label>
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        <Calendar size={20} className="text-indigo-500"/>
                        <input type="date" className="w-full bg-transparent outline-none text-sm font-bold text-slate-700" value={examConfig.date} onChange={e => setExamConfig({...examConfig, date: e.target.value})} />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sınav Türü</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        {['tyt', 'ayt', 'both'].map((type) => (
                            <button key={type} onClick={() => setExamConfig({...examConfig, type})} className={`flex-1 text-xs font-bold py-2.5 rounded-lg transition-all duration-200 ${examConfig.type === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{type === 'both' ? 'TYT + AYT' : type.toUpperCase()}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- TABLO --- */}
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
                        {rows.length > 0 ? rows.map((row) => (
                            <tr key={row.uid} className={`hover:bg-slate-50/80 transition-colors group ${row.status === 'saved' ? 'bg-green-50/50' : ''}`}>
                                <td className="px-6 py-3 font-semibold text-slate-700 truncate max-w-[12rem]">
                                    {row.name}
                                    {/* Eğer daha önce girilmişse küçük bir işaret koy */}
                                    {row.docId && mode === 'edit' && <span className="ml-2 text-[9px] bg-blue-100 text-blue-600 px-1 rounded">KAYITLI</span>}
                                </td>
                                
                                {(examConfig.type === 'tyt' || examConfig.type === 'both') && (
                                    <>
                                        <td className="p-2"><TableInput value={row.tytMath} onChange={e => handleCellChange(row.uid, 'tytMath', e.target.value)} placeholder="-" /></td>
                                        <td className="p-2"><TableInput value={row.tytTurk} onChange={e => handleCellChange(row.uid, 'tytTurk', e.target.value)} placeholder="-" /></td>
                                        <td className="p-2"><TableInput value={row.tytFen} onChange={e => handleCellChange(row.uid, 'tytFen', e.target.value)} placeholder="-" /></td>
                                        <td className="p-2"><TableInput value={row.tytSos} onChange={e => handleCellChange(row.uid, 'tytSos', e.target.value)} placeholder="-" /></td>
                                        <td className="p-2 bg-indigo-50/30 border-x border-indigo-50">
                                            <input type="number" className="w-full text-center p-2.5 rounded-lg border-2 border-indigo-100 bg-white text-indigo-700 font-bold text-sm focus:border-indigo-500 outline-none transition-all shadow-sm" placeholder="0.00" value={row.manualTytScore} onChange={e => handleCellChange(row.uid, 'manualTytScore', e.target.value)} />
                                        </td>
                                    </>
                                )}

                                {(examConfig.type === 'ayt' || examConfig.type === 'both') && (
                                    <>
                                        <td className="p-2"><TableInput value={row.aytMath} onChange={e => handleCellChange(row.uid, 'aytMath', e.target.value)} placeholder="-" colorClass="focus:border-purple-500 focus:ring-purple-500" /></td>
                                        <td className="p-2"><TableInput value={row.aytFen} onChange={e => handleCellChange(row.uid, 'aytFen', e.target.value)} placeholder="-" colorClass="focus:border-purple-500 focus:ring-purple-500" /></td>
                                        <td className="p-2 bg-purple-50/30 border-x border-purple-50">
                                            <input type="number" className="w-full text-center p-2.5 rounded-lg border-2 border-purple-100 bg-white text-purple-700 font-bold text-sm focus:border-purple-500 outline-none transition-all shadow-sm" placeholder="0.00" value={row.manualAytScore} onChange={e => handleCellChange(row.uid, 'manualAytScore', e.target.value)} />
                                        </td>
                                    </>
                                )}

                                <td className="px-4 py-2 text-center">
                                    {row.status === 'saved' && <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 animate-in zoom-in"><CheckCircle size={18}/></div>}
                                    {row.status === 'error' && <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600"><AlertCircle size={18}/></div>}
                                    {row.status === 'pending' && <div className="w-2 h-2 bg-orange-400 rounded-full mx-auto animate-pulse"></div>}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="10" className="p-8 text-center text-slate-400">
                                    {mode === 'edit' ? 'Düzenlemek için yukarıdan bir sınav seçin.' : 'Öğrenci listesi yükleniyor...'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- ALT BAR --- */}
            <div className="p-6 bg-white border-t border-slate-100 flex justify-between items-center fixed bottom-0 right-0 left-0 md:left-64 z-40 shadow-lg-top">
                <div className="text-sm text-slate-500 font-medium">
                    {rows.filter(r => r.docId).length > 0 && mode === 'edit' ? 
                        <span className="text-indigo-600 font-bold">{rows.filter(r => r.docId).length} Kayıtlı Veri Yüklendi</span> : 
                        <span>Toplam <span className="font-bold text-slate-800">{rows.length}</span> öğrenci</span>
                    }
                </div>
                <button 
                    onClick={handleSaveAll} 
                    disabled={isSaving}
                    className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white shadow-xl shadow-indigo-200 transition-all transform hover:scale-[1.02] active:scale-95 ${isSaving ? 'bg-slate-300 cursor-not-allowed shadow-none' : mode === 'edit' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                    {isSaving ? 'İşleniyor...' : mode === 'edit' ? <><Edit size={20}/> Değişiklikleri Kaydet</> : <><Save size={20}/> Sonuçları Kaydet</>}
                </button>
            </div>
        </div>
    );
}