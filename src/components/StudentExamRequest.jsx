import React, { useState, useEffect } from 'react';
import { FileText, Plus, CheckCircle, Clock, XCircle, Lock, Unlock, Save, Activity, MessageSquare, Calculator, Trash2, AlertTriangle } from 'lucide-react';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { calculateScoreSAY } from '../utils/helpers';

const ScoreInput = ({ label, value, onChange, max = 40 }) => (
    <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase truncate">{label}</label>
        <input 
            type="number" 
            className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg p-2 text-center font-bold text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={value}
            onChange={(e) => {
                let val = Number(e.target.value);
                if (val > max) val = max;
                if (val < 0) val = 0;
                onChange(val.toString());
            }}
            placeholder="-"
            min="0" max={max}
        />
    </div>
);

export default function StudentExamRequest({ currentUser, allScores }) {
    const [activeTab, setActiveTab] = useState('entry'); 
    const [requests, setRequests] = useState([]);
    const existingExams = [...new Set(allScores.map(s => s.examName))].sort();
    
    // Talep Formu State'leri
    const [requestMode, setRequestMode] = useState('existing');
    const [selectedExistingExam, setSelectedExistingExam] = useState("");
    const [newExamName, setNewExamName] = useState("");
    const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
    const [examType, setExamType] = useState("TYT");

    // Veri Girişi Formu State'leri
    const [targetRequest, setTargetRequest] = useState(null);
    const [nets, setNets] = useState({ tytMath: '', tytTurk: '', tytFen: '', tytSos: '', aytMath: '', aytFen: '' });
    const [manualScore, setManualScore] = useState("");
    const [liveScore, setLiveScore] = useState(0);

    // --- 1. TALEPLERİ ÇEKME ---
    useEffect(() => {
        const q = query(
            collection(db, 'artifacts', APP_ID, 'public', 'data', 'exam_requests'), 
            where("userId", "==", currentUser.internalId)
        );
        
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            setRequests(data);
        });
        return () => unsub();
    }, [currentUser]);

    // --- 2. CANLI PUAN HESAPLAMA ---
    useEffect(() => {
        const netValues = { 
            tytMath: Number(nets.tytMath), tytTurk: Number(nets.tytTurk), 
            tytFen: Number(nets.tytFen), tytSos: Number(nets.tytSos), 
            aytMath: Number(nets.aytMath), aytFen: Number(nets.aytFen) 
        };
        const calculated = calculateScoreSAY(netValues);
        // Eğer sınav tipi sadece TYT ise sadece TYT puanını, AYT ise AYT puanını, ikisi ise Sayısal puanı göster
        if (targetRequest?.examType === 'TYT') setLiveScore(calculated.tyt?.toFixed(2) || 0);
        else setLiveScore(calculated.say.toFixed(2));
    }, [nets, targetRequest]);

    // --- TALEP GÖNDER ---
    const handleRequest = async (e) => {
        e.preventDefault();
        const finalName = requestMode === 'existing' ? selectedExistingExam : newExamName;
        
        if (!finalName) return alert("Lütfen bir sınav seçin veya adını yazın.");
        const alreadyPending = requests.some(r => r.examName === finalName && r.status === 'pending');
        if (alreadyPending) return alert("Bu sınav için beklemede olan bir talebiniz zaten var.");

        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'exam_requests'), {
            userId: currentUser.internalId, username: currentUser.username, realName: currentUser.realName, classSection: currentUser.classSection || "Belirsiz",
            examName: finalName, examDate, examType, status: 'pending', adminMessage: "", timestamp: serverTimestamp()
        });
        alert("Talep gönderildi! Onay bekleniyor.");
        setNewExamName(""); setSelectedExistingExam(""); setActiveTab('request');
    };

    // --- VERİ KAYDET ---
    const handleSaveScore = async () => {
        if (!targetRequest) return;
        
        const finalScoreVal = manualScore ? Number(manualScore) : Number(liveScore);

        const scoreData = {
            internalUserId: currentUser.internalId, userName: currentUser.username, realName: currentUser.realName,
            examName: targetRequest.examName, examDate: targetRequest.examDate,
            includeTYT: targetRequest.examType !== 'AYT', includeAYT: targetRequest.examType !== 'TYT',
            tyt: { math: Number(nets.tytMath), turkish: Number(nets.tytTurk), science: Number(nets.tytFen), social: Number(nets.tytSos), score: 0 },
            ayt: { math: Number(nets.aytMath), science: Number(nets.aytFen), score: 0 },
            finalScore: finalScoreVal, 
            placementScore: finalScoreVal, 
            timestamp: serverTimestamp()
        };

        try {
            await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'exam_scores_v3'), scoreData);
            await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'exam_requests', targetRequest.id), { status: 'submitted' });
            alert("Netlerin Başarıyla Kaydedildi! 🎯");
            setTargetRequest(null);
            setNets({ tytMath: '', tytTurk: '', tytFen: '', tytSos: '', aytMath: '', aytFen: '' });
            setManualScore("");
        } catch (error) {
            console.error("Kayıt Hatası:", error);
            alert("Veritabanı bağlantı hatası oluştu.");
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* TABLAR */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <button onClick={() => { setActiveTab('entry'); setTargetRequest(null); }} className={`flex-1 p-4 rounded-2xl border transition-all font-bold flex items-center justify-center gap-2 ${activeTab === 'entry' ? 'bg-green-600 text-white border-green-600 shadow-lg' : 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-gray-700'}`}><Activity size={20}/> Veri Girişi (Onaylananlar)</button>
                <button onClick={() => { setActiveTab('request'); setTargetRequest(null); }} className={`flex-1 p-4 rounded-2xl border transition-all font-bold flex items-center justify-center gap-2 ${activeTab === 'request' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-gray-700'}`}><FileText size={20}/> Taleplerim & Durum</button>
            </div>

            {/* --- SEKME 1: LİSTE VE FORM (Aynı Kalacak) --- */}
            {activeTab === 'request' && (
                <div className="grid md:grid-cols-2 gap-6">
                    {/* ... (Bu kısım önceki kodla birebir aynı, yer kaplamaması için kısalttım) ... */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-gray-700 h-fit">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Sınav İzni İste</h3>
                        <form onSubmit={handleRequest} className="space-y-4">
                            {requestMode === 'existing' ? (
                                <div><label className="text-xs font-bold text-slate-400">Mevcut Sınavlar</label><select className="w-full p-3 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-600 dark:text-white outline-none cursor-pointer" value={selectedExistingExam} onChange={e => setSelectedExistingExam(e.target.value)}><option value="">Seçiniz...</option>{existingExams.map(ex => <option key={ex} value={ex}>{ex}</option>)}</select></div>
                            ) : (
                                <div><label className="text-xs font-bold text-slate-400">Sınav Adı</label><input type="text" className="w-full p-3 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-600 dark:text-white outline-none" placeholder="Örn: 3D Türkiye Geneli - 1" value={newExamName} onChange={e => setNewExamName(e.target.value)}/></div>
                            )}
                            <div className="flex gap-2"><div className="flex-1"><label className="text-xs font-bold text-slate-400">Tarih</label><input type="date" className="w-full p-3 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-600 dark:text-white outline-none" value={examDate} onChange={e => setExamDate(e.target.value)}/></div><div className="flex-1"><label className="text-xs font-bold text-slate-400">Tür</label><select className="w-full p-3 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-600 dark:text-white outline-none cursor-pointer" value={examType} onChange={e => setExamType(e.target.value)}><option>TYT</option><option>AYT</option><option value="BOTH">TYT + AYT</option></select></div></div>
                            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95">İstek Gönder</button>
                        </form>
                        <div className="flex justify-center mt-3"><button onClick={() => setRequestMode(requestMode === 'existing' ? 'new' : 'existing')} className="text-xs font-bold text-indigo-500 hover:underline">{requestMode === 'existing' ? 'Listede yok mu? Yeni Öner' : 'Listeden Seç'}</button></div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-gray-700 overflow-hidden">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Taleplerim</h3>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                            {requests.map(req => (
                                <div key={req.id} className="p-4 rounded-xl bg-slate-50 dark:bg-gray-700/30 border border-slate-100 dark:border-gray-600 hover:border-indigo-200 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div><div className="font-bold text-sm text-slate-700 dark:text-white">{req.examName}</div><div className="text-xs text-slate-400">{new Date(req.timestamp?.seconds*1000).toLocaleDateString()} • {req.examType}</div></div>
                                        <div>{req.status === 'pending' && <span className="text-yellow-500 flex items-center gap-1 text-xs font-bold bg-yellow-500/10 px-2 py-1 rounded"><Clock size={14}/> Bekliyor</span>}{req.status === 'approved' && <span className="text-green-500 flex items-center gap-1 text-xs font-bold bg-green-500/10 px-2 py-1 rounded"><CheckCircle size={14}/> Onaylandı</span>}{req.status === 'rejected' && <span className="text-red-500 flex items-center gap-1 text-xs font-bold bg-red-500/10 px-2 py-1 rounded"><XCircle size={14}/> Red</span>}{req.status === 'submitted' && <span className="text-blue-500 flex items-center gap-1 text-xs font-bold bg-blue-500/10 px-2 py-1 rounded"><Lock size={14}/> Girildi</span>}</div>
                                    </div>
                                    {req.adminMessage && <div className="mt-2 bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-lg border border-indigo-100 dark:border-indigo-800 flex gap-2 text-xs"><MessageSquare size={14} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5"/><span className="text-slate-600 dark:text-slate-300"><span className="font-bold">Admin:</span> {req.adminMessage}</span></div>}
                                </div>
                            ))}
                            {requests.length === 0 && <div className="text-center text-slate-400 py-10">Henüz talep yok.</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* --- SEKME 2: VERİ GİRİŞİ (HİNT DÜZELTİLDİ) --- */}
            {activeTab === 'entry' && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-gray-700 min-h-[400px]">
                    {!targetRequest ? (
                        <div className="animate-in fade-in">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Unlock className="text-green-500"/> Giriş Yapılabilir Sınavlar</h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                {requests.filter(r => r.status === 'approved').length > 0 ? requests.filter(r => r.status === 'approved').map(req => (
                                    <button key={req.id} onClick={() => { setTargetRequest(req); setNets({ tytMath: '', tytTurk: '', tytFen: '', tytSos: '', aytMath: '', aytFen: '' }); setManualScore(""); }} className="p-5 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex justify-between items-center hover:scale-[1.02] hover:shadow-lg transition-all text-left group">
                                        <div><div className="font-bold text-green-800 dark:text-green-300 group-hover:underline text-lg">{req.examName}</div><div className="text-xs text-green-600 dark:text-green-500 font-bold mt-1">{req.examType} • Veri Girmek İçin Tıkla</div></div><div className="bg-white dark:bg-green-800 p-2 rounded-full shadow-sm text-green-600 dark:text-green-300"><Plus size={24}/></div>
                                    </button>
                                )) : <div className="col-span-2 flex flex-col items-center justify-center py-12 text-slate-400"><AlertTriangle size={48} className="mb-2 opacity-20"/><p>Onaylanmış sınavın yok.</p></div>}
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in slide-in-from-right max-w-2xl mx-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-2xl text-slate-800 dark:text-white">{targetRequest.examName}</h3>
                                <button onClick={() => setTargetRequest(null)} className="text-slate-400 hover:text-red-500 font-bold text-sm px-3 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">İptal</button>
                            </div>
                            
                            <div className="space-y-6">
                                {targetRequest.examType !== 'AYT' && (
                                    <div className="bg-slate-50 dark:bg-gray-900 p-5 rounded-3xl border border-slate-100 dark:border-gray-700">
                                        <div className="text-xs font-bold text-indigo-500 mb-4 uppercase tracking-wider border-b border-slate-200 dark:border-gray-700 pb-2">TYT Netleri</div>
                                        <div className="grid grid-cols-4 gap-4">
                                            <ScoreInput label="Matematik" value={nets.tytMath} onChange={v => setNets({...nets, tytMath: v})} max={40}/>
                                            <ScoreInput label="Türkçe" value={nets.tytTurk} onChange={v => setNets({...nets, tytTurk: v})} max={40}/>
                                            <ScoreInput label="Fen" value={nets.tytFen} onChange={v => setNets({...nets, tytFen: v})} max={20}/>
                                            <ScoreInput label="Sosyal" value={nets.tytSos} onChange={v => setNets({...nets, tytSos: v})} max={20}/>
                                        </div>
                                    </div>
                                )}
                                
                                {targetRequest.examType !== 'TYT' && (
                                    <div className="bg-slate-50 dark:bg-gray-900 p-5 rounded-3xl border border-slate-100 dark:border-gray-700">
                                        <div className="text-xs font-bold text-purple-500 mb-4 uppercase tracking-wider border-b border-slate-200 dark:border-gray-700 pb-2">AYT Netleri (Sayısal)</div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <ScoreInput label="Matematik" value={nets.aytMath} onChange={v => setNets({...nets, aytMath: v})} max={40}/>
                                            <ScoreInput label="Fen Bilimleri" value={nets.aytFen} onChange={v => setNets({...nets, aytFen: v})} max={40}/>
                                        </div>
                                    </div>
                                )}

                                {/* DÜZELTİLMİŞ PUAN ALANI (HİNT PLACEHOLDER İLE) */}
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-800 flex flex-col items-center gap-4">
                                    <div className="w-full">
                                        <label className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase mb-2 block text-center">Puan (Opsiyonel)</label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                className="w-full p-4 text-3xl font-bold text-center rounded-2xl border-2 border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-900 text-indigo-900 dark:text-white outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-300 dark:placeholder:text-gray-700"
                                                // HATA ÇÖZÜMÜ: Placeholder olarak gösteriyoruz, üst üste bindirmiyoruz.
                                                placeholder={liveScore > 0 ? liveScore : "0.00"}
                                                value={manualScore}
                                                onChange={e => setManualScore(e.target.value)}
                                            />
                                        </div>
                                        {liveScore > 0 && !manualScore && (
                                            <button onClick={() => setManualScore(liveScore)} className="mt-3 mx-auto px-4 py-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors">
                                                <Calculator size={14}/> Hesaplanan Puanı ({liveScore}) Kullan
                                            </button>
                                        )}
                                    </div>
                                    
                                    <button onClick={handleSaveScore} className="w-full px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-xl shadow-green-200 dark:shadow-none transition-transform active:scale-95 flex items-center justify-center gap-2 mt-2">
                                        <Save size={20}/> <span>Kaydet ve Bitir</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}