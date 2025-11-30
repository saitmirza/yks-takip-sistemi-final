

import React, { useState, useEffect } from 'react';
import { Users, MessageCircle, AlertTriangle, Trash2, Shield, Activity, FileText, Search, Key, Ban, CheckCircle, MessageSquarePlus, Send, XCircle, FileInput, Edit, X, Zap} from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, deleteDoc, doc, updateDoc, where, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import AdminExcelView from './AdminExcelView';

export default function AdminDashboard({ usersList, allScores, appId }) {
    const [activeTab, setActiveTab] = useState('requests'); 
    
    // Veri State'leri
    const [moderationData, setModerationData] = useState({ chats: [], questions: [] });
    
    // Anomali verisi
    const [suspiciousData, setSuspiciousData] = useState({ scores: [], logs: [] });
    
    const [feedbacks, setFeedbacks] = useState([]);
    const [examRequests, setExamRequests] = useState([]); 
    
    const [examDataToEdit, setExamDataToEdit] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [selectedFeedbackId, setSelectedFeedbackId] = useState(null);

    // VERİ ÇEKME TETİKLEYİCİLERİ
    useEffect(() => {
        if (activeTab === 'moderation') fetchModerationData();
        else if (activeTab === 'logs') fetchLogs();
        else if (activeTab === 'feedback') fetchFeedbacks();
        else if (activeTab === 'requests') fetchExamRequests();
    }, [activeTab]);

    // --- 1. TALEPLERİ ÇEK ---
    const fetchExamRequests = async () => {
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'exam_requests'), orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        setExamRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    // --- 2. MODERASYON VERİSİ ---
    const fetchModerationData = async () => {
        const chatQ = query(collection(db, 'artifacts', appId, 'public', 'data', 'chat_messages'), orderBy('timestamp', 'desc'), limit(20));
        const questionQ = query(collection(db, 'artifacts', appId, 'public', 'data', 'questions'), orderBy('timestamp', 'desc'), limit(20));
        
        const [chatSnap, qSnap] = await Promise.all([getDocs(chatQ), getDocs(questionQ)]);
        
        setModerationData({
            chats: chatSnap.docs.map(d => ({ id: d.id, ...d.data(), type: 'chat' })),
            questions: qSnap.docs.map(d => ({ id: d.id, ...d.data(), type: 'question' }))
        });
    };

    // --- 3. ANOMALİ LOGLARI (DÜZELTİLDİ: SÜRE KONTROLÜ) ---
    const fetchLogs = async () => {
        // A. Şüpheli Skorlar (485+ Puan)
        const highScores = allScores.filter(s => s.finalScore > 485).slice(0, 20);

        // B. Şüpheli Çalışma Kayıtları
        const logQ = query(collection(db, 'artifacts', appId, 'public', 'data', 'study_logs'), orderBy('timestamp', 'desc'), limit(100));
        const logSnap = await getDocs(logQ);
        const rawLogs = logSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const suspiciousLogs = rawLogs.filter(log => {
            const count = Number(log.questionCount) || 0;
            const duration = Number(log.duration) || 0; // Dakika cinsinden

            // KURAL 1: Dakika bilgisi yoksa veya 0 ise SORGULAMA (Kullanıcı İsteği)
            if (duration <= 0) return false;

            // KURAL 2: İnsanüstü Hız (Dakikada 6 sorudan fazla ve toplam soru > 20)
            // Örn: 5 dakikada 50 soru (10 soru/dk) -> Şüpheli
            if ((count / duration) > 6 && count > 20) return true;

            return false;
        });

        setSuspiciousData({ scores: highScores, logs: suspiciousLogs });
    };

    // --- 4. DESTEK TALEPLERİ ---
    const fetchFeedbacks = async () => {
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'feedback_reports'), orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        setFeedbacks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    // --- İŞLEMLER ---

    const handleRequestAction = async (id, status) => {
        const message = prompt(status === 'approved' ? "Onay Mesajı (İsteğe bağlı):" : "Red Sebebi:");
        if (status === 'rejected' && !message) return alert("Reddederken sebep belirtmelisin.");

        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exam_requests', id), { 
            status,
            adminMessage: message || (status === 'approved' ? "Onaylandı. Veri girebilirsin." : "Reddedildi.")
        });
        fetchExamRequests(); 
    };

    const handleDeleteContent = async (collectionName, id) => {
        if(confirm("Bu içeriği kalıcı olarak silmek istiyor musun?")) {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, id));
            if (activeTab === 'moderation') fetchModerationData();
            if (activeTab === 'logs') fetchLogs();
        }
    };

    const handleBanUser = async (user) => {
        if(user.isAdmin || user.isDemo) return alert("Bu kullanıcı banlanamaz.");
        const newStatus = !user.isBanned;
        if(confirm(`${user.username} kullanıcısını ${newStatus ? 'BANLAMAK' : 'BANINI AÇMAK'} istiyor musun?`)) {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_accounts', user.email), { isBanned: newStatus });
            alert("İşlem tamamlandı.");
        }
    };

    // --- FEEDBACK CEVAPLAMA (DÜZELTİLDİ: ANINDA GÜNCELLEME) ---
const handleReplyFeedback = async (id, isResolving = false) => {
    if (!replyText && !isResolving) return alert("Mesaj yazın.");
    
    const updates = {};
    if (replyText) {
        updates.history = arrayUnion({
            role: 'admin',
            text: replyText,
            timestamp: Date.now()
        });
    }
    if (isResolving) {
        updates.status = 'resolved';
    } else {
        updates.status = 'pending'; // Cevap verince "İnceleniyor" durumunda kalsın
    }

    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'feedback_reports', id), updates);
    
    // Optimistic Update (Arayüzü anında güncelle)
    setFeedbacks(prev => prev.map(f => {
        if (f.id === id) {
            const newHistory = f.history ? [...f.history] : [];
            if (replyText) newHistory.push({ role: 'admin', text: replyText, timestamp: Date.now() });
            return { ...f, history: newHistory, status: isResolving ? 'resolved' : 'pending' };
        }
        return f;
    }));

    setReplyText("");
    // isResolving değilse sohbet açık kalsın
};    const handleOpenBatchEdit = (examName) => {
        const scores = allScores.filter(s => s.examName === examName);
        if (scores.length === 0) return alert("Veri bulunamadı.");
        const sample = scores[0];
        setExamDataToEdit({
            examName: examName,
            isEditing: true,
            examType: (sample.includeTYT && sample.includeAYT) ? 'BOTH' : (sample.includeTYT ? 'TYT' : 'AYT'),
            initialScores: scores
        });
        setActiveTab('exams');
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-32 px-2 md:px-0">
            {/* BAŞLIK KARTI */}
            <div className="bg-slate-900 p-6 md:p-8 rounded-3xl shadow-lg relative overflow-hidden border border-slate-700">
                <div className="relative z-10">
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3 text-white">
                        <Shield size={32} className="text-indigo-400"/> Komuta Merkezi
                    </h1>
                    <p className="text-slate-400 mt-2 text-sm md:text-base">Sistemin güvenliği ve düzeni senden sorulur.</p>
                </div>
                
                <div className="flex overflow-x-auto gap-2 mt-6 pb-2 no-scrollbar">
                    {[
                        { id: 'requests', icon: <FileText size={18}/>, label: 'Talepler' },
                        { id: 'exams', icon: <Edit size={18}/>, label: 'Sınav Girişi' },
                        { id: 'users', icon: <Users size={18}/>, label: 'Kullanıcılar' },
                        { id: 'moderation', icon: <MessageCircle size={18}/>, label: 'İçerik' },
                        { id: 'logs', icon: <Activity size={18}/>, label: 'Anomali' },
                        { id: 'feedback', icon: <MessageSquarePlus size={18}/>, label: 'Destek' },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex-shrink-0 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- 1. SINAV GİRİŞ --- */}
            {activeTab === 'exams' && <AdminExcelView usersList={usersList} allScores={allScores} appId={appId} dataToEdit={examDataToEdit} />}

{activeTab === 'requests' && (
    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Sınav Talepleri</h3>
        <div className="space-y-3">
            {examRequests.map(req => (
                <div key={req.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-700/50 border border-slate-100 dark:border-gray-600 flex flex-col md:flex-row justify-between items-center gap-4 group">
                    <div className="text-center md:text-left">
                        <div className="font-bold text-slate-800 dark:text-white">{req.examName} <span className="text-[10px] bg-slate-200 dark:bg-gray-600 px-2 py-0.5 rounded">{req.examType}</span></div>
                        <div className="text-xs text-indigo-500 dark:text-indigo-300 font-bold">{req.realName} ({req.classSection})</div>
                        <div className="text-[10px] text-slate-400 mt-1">{new Date(req.timestamp?.seconds*1000).toLocaleString()}</div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {req.status === 'pending' ? (
                            <>
                                <button onClick={() => handleRequestAction(req.id, 'approved')} className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-green-700 transition-colors">Onayla</button>
                                <button onClick={() => handleRequestAction(req.id, 'rejected')} className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-red-700 transition-colors">Reddet</button>
                            </>
                        ) : (
                            <>
                                {(req.status === 'approved' || req.status === 'submitted') && (
                                    <button onClick={() => handleOpenBatchEdit(req.examName)} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-blue-700 transition-colors"><Edit size={14}/> Düzenle</button>
                                )}
                                <span className={`text-xs font-bold px-3 py-1 rounded-lg uppercase border ${req.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' : req.status === 'submitted' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                    {req.status === 'approved' ? 'Onaylandı' : req.status === 'submitted' ? 'Girildi' : 'Red'}
                                </span>
                            </>
                        )}
                        
                        {/* --- YENİ: TAM SİLME BUTONU --- */}
                        <button 
                            onClick={() => handleDeleteContent('exam_requests', req.id)} 
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all ml-2" 
                            title="Talebi Kalıcı Sil"
                        >
                            <Trash2 size={18}/>
                        </button>
                    </div>
                </div>
            ))}
            {examRequests.length === 0 && <p className="text-slate-400 text-center py-4">Talep yok.</p>}
        </div>
    </div>
)}            {/* --- 3. KULLANICILAR --- */}
            {activeTab === 'users' && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-gray-700 text-slate-500 dark:text-gray-300 text-xs uppercase font-bold">
                            <tr><th className="p-4">Kullanıcı</th><th className="p-4">Sınıf</th><th className="p-4 text-right">İşlem</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                            {usersList.map(u => (
                                <tr key={u.internalId} className="hover:bg-slate-50 dark:hover:bg-gray-700/50">
                                    <td className="p-4 font-medium text-slate-800 dark:text-white flex items-center gap-2">
                                        {u.base64Avatar ? <img src={u.base64Avatar} className="w-8 h-8 rounded-full object-cover"/> : <span className="text-xl">{u.avatar}</span>}
                                        {u.username} {u.isAdmin && <Shield size={14} className="text-red-500"/>}
                                    </td>
                                    <td className="p-4 text-slate-600 dark:text-gray-300">{u.classSection}</td>
                                    <td className="p-4 text-right">
                                        {!u.isAdmin && !u.isDemo && (
                                            <button onClick={() => handleBanUser(u)} className={`px-3 py-1 rounded-lg text-xs font-bold ${u.isBanned ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {u.isBanned ? 'Ban Aç' : 'Banla'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* --- 4. İÇERİK --- */}
            {activeTab === 'moderation' && (
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 p-4">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><MessageCircle size={18}/> Son Mesajlar</h3>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {moderationData.chats.map(chat => (
                                <div key={chat.id} className="p-3 bg-slate-50 dark:bg-gray-700/30 rounded-xl flex justify-between items-start text-sm">
                                    <div><span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">{chat.senderName}:</span> <span className="text-slate-600 dark:text-gray-300">{chat.text}</span></div>
                                    <button onClick={() => handleDeleteContent('chat_messages', chat.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 p-4">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><AlertTriangle size={18}/> Son Sorular</h3>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {moderationData.questions.map(q => (
                                <div key={q.id} className="p-3 bg-slate-50 dark:bg-gray-700/30 rounded-xl flex justify-between items-start text-sm">
                                    <div>
                                        <div className="font-bold text-slate-800 dark:text-white text-xs">{q.askerName} ({q.subject})</div>
                                        <div className="text-slate-500 dark:text-gray-400 text-xs truncate max-w-[200px]">{q.text}</div>
                                    </div>
                                    <button onClick={() => handleDeleteContent('questions', q.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* --- 5. ANOMALİ (LOGS) GÜNCELLENDİ --- */}
            {activeTab === 'logs' && (
                <div className="grid md:grid-cols-2 gap-6">
                    {/* SOL: YÜKSEK SKORLAR */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 p-6">
                        <h3 className="font-bold text-red-500 mb-4 flex items-center gap-2"><Activity/> Şüpheli Yüksek Skorlar (485+)</h3>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {suspiciousData.scores.map(s => (
                                <div key={s.id} className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-slate-800 dark:text-white">{s.userName || "Bilinmeyen"}</div>
                                        <div className="text-xs text-red-500">{s.examName}</div>
                                    </div>
                                    <div className="text-xl font-bold text-red-600">{s.finalScore}</div>
                                </div>
                            ))}
                            {suspiciousData.scores.length === 0 && <p className="text-slate-400 text-xs text-center py-2">Şüpheli skor yok.</p>}
                        </div>
                    </div>

                    {/* SAĞ: ŞÜPHELİ LOGLAR (Dakikasız veri sorgulanmaz) */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 p-6">
                        <h3 className="font-bold text-orange-500 mb-4 flex items-center gap-2"><Zap/> İnsanüstü Hız / Spam Loglar</h3>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {suspiciousData.logs.map(log => {
                                const speed = log.duration > 0 ? (log.questionCount / log.duration).toFixed(1) : "∞";
                                return (
                                    <div key={log.id} className="p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-xl flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-slate-800 dark:text-white text-sm">{log.username}</div>
                                            <div className="text-[10px] text-slate-500 dark:text-gray-400">{log.subject} - {log.topic}</div>
                                            <div className="text-xs font-bold text-orange-600 mt-1">
                                                {log.questionCount} Soru / {log.duration} Dk
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-gray-700 px-2 py-1 rounded">{speed} Soru/Dk</div>
                                            <button onClick={() => handleDeleteContent('study_logs', log.id)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 p-1.5 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                );
                            })}
                            {suspiciousData.logs.length === 0 && <p className="text-green-500 text-xs font-bold text-center py-2">Temiz. ✅</p>}
                        </div>
                    </div>
                </div>
            )}

{/* --- 6. DESTEK (FEEDBACK) GÜNCELLENMİŞ VERSİYON --- */}
{activeTab === 'feedback' && (
    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 p-6">
        <h3 className="font-bold text-slate-800 dark:text-white mb-4">Gelen Bildirimler</h3>
        <div className="space-y-4">
            {feedbacks.map(f => (
                <div key={f.id} className="p-4 bg-slate-50 dark:bg-gray-700/30 rounded-2xl border border-slate-100 dark:border-gray-600">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${f.type === 'bug' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{f.type}</span>
                            <span className="font-bold text-sm text-slate-800 dark:text-white">{f.username}</span>
                        </div>
                        <div className="text-xs text-slate-400">{new Date(f.timestamp?.seconds*1000).toLocaleDateString()}</div>
                    </div>
                    
                    {/* SOHBET GEÇMİŞİ */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-slate-200 dark:border-gray-600 max-h-60 overflow-y-auto custom-scrollbar mb-3 space-y-3">
                         {/* Eski veri desteği */}
                         {(!f.history || f.history.length === 0) && (
                            <>
                                <div className="text-sm text-slate-700 dark:text-gray-300">{f.message}</div>
                                {f.image && <a href={f.image} target="_blank" className="text-blue-500 text-xs underline block mt-1">Görsel</a>}
                                {f.adminReply && <div className="text-sm text-indigo-600 font-bold border-l-2 border-indigo-500 pl-2 mt-2">{f.adminReply}</div>}
                            </>
                         )}

                         {/* Yeni history desteği */}
                         {f.history && f.history.map((msg, idx) => (
                             <div key={idx} className={`flex ${msg.role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                 <div className={`px-3 py-2 rounded-xl text-sm max-w-[85%] ${msg.role === 'admin' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-100 dark:bg-gray-700 text-slate-800 dark:text-white rounded-bl-none'}`}>
                                     <div className="whitespace-pre-wrap">{msg.text}</div>
                                     {msg.image && <a href={msg.image} target="_blank" className="text-blue-300 text-xs underline block mt-1">Görsel Eki</a>}
                                     <div className="text-[9px] opacity-70 text-right mt-1">{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                 </div>
                             </div>
                         ))}
                    </div>

                    {/* CEVAP ALANI */}
                    {f.status !== 'resolved' ? (
                        <div className="flex flex-col gap-2">
                            {selectedFeedbackId === f.id ? (
                                <>
                                    <textarea className="w-full border dark:border-gray-600 dark:bg-gray-800 rounded-xl p-2 text-sm dark:text-white outline-none resize-none" rows="2" placeholder="Cevap yaz..." value={replyText} onChange={e => setReplyText(e.target.value)}></textarea>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setSelectedFeedbackId(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold px-3">İptal</button>
                                        <button onClick={() => handleReplyFeedback(f.id, true)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> Çözüldü & Kapat</button>
                                        <button onClick={() => handleReplyFeedback(f.id, false)} className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Send size={12}/> Gönder</button>
                                    </div>
                                </>
                            ) : (
                                <button onClick={() => setSelectedFeedbackId(f.id)} className="w-full bg-slate-50 dark:bg-gray-700/50 hover:bg-slate-100 text-slate-500 dark:text-gray-300 py-2 rounded-xl text-xs font-bold transition-colors">Cevapla</button>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-2 bg-green-50 dark:bg-green-900/20 py-2 rounded-xl text-green-600 dark:text-green-400 text-xs font-bold">
                            <CheckCircle size={14}/> Bu talep çözüldü.
                        </div>
                    )}
                </div>
            ))}
        </div>
    </div>
)}

        </div>
    );
}
