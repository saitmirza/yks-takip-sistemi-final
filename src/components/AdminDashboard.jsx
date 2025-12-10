import React, { useState, useEffect } from 'react';
import { Users, MessageCircle, AlertTriangle, Trash2, Shield, Activity, FileText, Search, Key, Ban, CheckCircle, MessageSquarePlus, Send, XCircle, FileInput, Edit, X, Zap, BookOpen, Download} from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, deleteDoc, doc, updateDoc, where, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import AdminExcelView from './AdminExcelView';
import { approveResource, rejectResource, getPendingResources } from '../utils/resourceLibraryService';

export default function AdminDashboard({ usersList, allScores, appId, currentUser }) {
    const [activeTab, setActiveTab] = useState('requests'); 
    
    // Veri State'leri
    const [moderationData, setModerationData] = useState({ chats: [], questions: [] });
    const [suspiciousData, setSuspiciousData] = useState({ scores: [], logs: [] });
    const [feedbacks, setFeedbacks] = useState([]);
    const [examRequests, setExamRequests] = useState([]);
    const [pendingResources, setPendingResources] = useState([]);
    const [selectedResource, setSelectedResource] = useState(null);
    const [examDataToEdit, setExamDataToEdit] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [selectedFeedbackId, setSelectedFeedbackId] = useState(null);

    // Ortak Input Stili
    const inputStyle = {
        backgroundColor: '#1e293b', 
        color: '#ffffff',
        border: '1px solid #334155',
        outline: 'none'
    };

    useEffect(() => {
        if (activeTab === 'moderation') fetchModerationData();
        else if (activeTab === 'logs') fetchLogs();
        else if (activeTab === 'feedback') fetchFeedbacks();
        else if (activeTab === 'requests') fetchExamRequests();
        else if (activeTab === 'resources') fetchPendingResources();
    }, [activeTab]);

    const fetchExamRequests = async () => {
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'exam_requests'), orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        setExamRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    const fetchPendingResources = async () => {
        try {
            const result = await getPendingResources(appId);
            if (result && result.resources) {
                setPendingResources(result.resources);
                if (result.resources.length > 0) setSelectedResource(result.resources[0]);
            } else { setPendingResources([]); }
        } catch (error) { console.error("Hata:", error); setPendingResources([]); }
    };

    const handleResourceApproval = async (resourceId, approved, rejectionReason = null) => {
        try {
            const adminId = currentUser?.internalId || "ADMIN_ID";
            if (approved) await approveResource(resourceId, adminId);
            else await rejectResource(resourceId, rejectionReason || "Reddedildi", adminId);
            fetchPendingResources(); setSelectedResource(null);
        } catch (error) { console.error("Hata:", error); }
    };

    const fetchModerationData = async () => {
        const chatQ = query(collection(db, 'artifacts', appId, 'public', 'data', 'chat_messages'), orderBy('timestamp', 'desc'), limit(20));
        const questionQ = query(collection(db, 'artifacts', appId, 'public', 'data', 'questions'), orderBy('timestamp', 'desc'), limit(20));
        const [chatSnap, qSnap] = await Promise.all([getDocs(chatQ), getDocs(questionQ)]);
        setModerationData({ chats: chatSnap.docs.map(d => ({ id: d.id, ...d.data(), type: 'chat' })), questions: qSnap.docs.map(d => ({ id: d.id, ...d.data(), type: 'question' })) });
    };

    const fetchLogs = async () => {
        const highScores = allScores.filter(s => s.finalScore > 485).slice(0, 20);
        const logQ = query(collection(db, 'artifacts', appId, 'public', 'data', 'study_logs'), orderBy('timestamp', 'desc'), limit(100));
        const logSnap = await getDocs(logQ);
        const rawLogs = logSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const suspiciousLogs = rawLogs.filter(log => {
            const count = Number(log.questionCount) || 0;
            const duration = Number(log.duration) || 0; 
            if (duration <= 0) return false;
            if ((count / duration) > 6 && count > 20) return true;
            return false;
        });
        setSuspiciousData({ scores: highScores, logs: suspiciousLogs });
    };

    const fetchFeedbacks = async () => {
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'feedback_reports'), orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        setFeedbacks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    const handleRequestAction = async (id, status) => {
        const message = prompt(status === 'approved' ? "Onay Mesajı:" : "Red Sebebi:");
        if (status === 'rejected' && !message) return alert("Sebep belirtmelisin.");
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exam_requests', id), { status, adminMessage: message || (status === 'approved' ? "Onaylandı." : "Reddedildi.") });
        fetchExamRequests(); 
    };

    const handleDeleteContent = async (collectionName, id) => {
        if(confirm("Silmek istiyor musun?")) {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, id));
            if (activeTab === 'moderation') fetchModerationData();
            if (activeTab === 'logs') fetchLogs();
        }
    };

    const handleBanUser = async (user) => {
        if(user.isAdmin || user.isDemo) return alert("Yasaklanamaz.");
        const newStatus = !user.isBanned;
        if(confirm(`${user.username} kullanıcısını ${newStatus ? 'BANLAMAK' : 'BANINI AÇMAK'} istiyor musun?`)) {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_accounts', user.email), { isBanned: newStatus });
            alert("İşlem tamamlandı.");
        }
    };

    const handleReplyFeedback = async (id, isResolving = false) => {
        if (!replyText && !isResolving) return alert("Mesaj yazın.");
        const updates = {};
        if (replyText) updates.history = arrayUnion({ role: 'admin', text: replyText, timestamp: Date.now() });
        updates.status = isResolving ? 'resolved' : 'pending';
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'feedback_reports', id), updates);
        setFeedbacks(prev => prev.map(f => {
            if (f.id === id) {
                const newHistory = f.history ? [...f.history] : [];
                if (replyText) newHistory.push({ role: 'admin', text: replyText, timestamp: Date.now() });
                return { ...f, history: newHistory, status: isResolving ? 'resolved' : 'pending' };
            }
            return f;
        }));
        setReplyText("");
    };    

    const handleOpenBatchEdit = (examName) => {
        const scores = allScores.filter(s => s.examName === examName);
        if (scores.length === 0) return alert("Veri bulunamadı.");
        const sample = scores[0];
        setExamDataToEdit({ examName: examName, isEditing: true, examType: (sample.includeTYT && sample.includeAYT) ? 'BOTH' : (sample.includeTYT ? 'TYT' : 'AYT'), initialScores: scores });
        setActiveTab('exams');
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-32 px-2 md:px-0">
            {/* BAŞLIK KARTI (GLASS FIX) */}
            <div className="glass-box p-6 md:p-8 rounded-3xl shadow-lg relative overflow-hidden transition-colors">
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
                        { id: 'resources', icon: <BookOpen size={18}/>, label: 'Kaynaklar' },
                        { id: 'moderation', icon: <MessageCircle size={18}/>, label: 'İçerik' },
                        { id: 'logs', icon: <Activity size={18}/>, label: 'Anomali' },
                        { id: 'feedback', icon: <MessageSquarePlus size={18}/>, label: 'Destek' },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex-shrink-0 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-black/20 text-slate-300 hover:bg-white/10'}`}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- 1. SINAV GİRİŞ --- */}
            {activeTab === 'exams' && <AdminExcelView usersList={usersList} allScores={allScores} appId={appId} dataToEdit={examDataToEdit} />}

            {/* --- 1B. KAYNAK MODERASYONU (GLASS FIX) --- */}
            {activeTab === 'resources' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Sol Panel */}
                    <div className="lg:col-span-1 glass-box rounded-3xl overflow-hidden shadow-sm">
                        <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4 text-white font-bold flex items-center gap-2">
                            <BookOpen size={20}/> Beklemede ({pendingResources.length})
                        </div>
                        <div className="divide-y divide-white/10 max-h-96 overflow-y-auto">
                            {pendingResources.length === 0 ? (
                                <p className="p-4 text-slate-500 text-center">Beklemede kaynak yok ✨</p>
                            ) : (
                                pendingResources.map(res => (
                                    <div key={res.id} onClick={() => setSelectedResource(res)} className={`p-3 cursor-pointer transition-colors border-l-4 ${selectedResource?.id === res.id ? 'bg-amber-500/20 border-l-amber-500' : 'hover:bg-white/5 border-l-transparent'}`}>
                                        <div className="font-bold text-sm text-white truncate">{res.title}</div>
                                        <div className="text-xs text-slate-400 mt-1">{res.category} / {res.subject}</div>
                                        <div className="text-[10px] text-slate-500 mt-1">{res.uploaderName}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Sağ Panel */}
                    {selectedResource && (
                        <div className="lg:col-span-2 glass-box rounded-3xl p-6 shadow-sm transition-colors">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-bold text-lg text-white">{selectedResource.title}</h3>
                                    <p className="text-sm text-slate-300 mt-2">{selectedResource.description}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="bg-white/5 p-3 rounded-lg"><span className="text-slate-400">Kategori</span><div className="font-bold text-white">{selectedResource.category}</div></div>
                                    <div className="bg-white/5 p-3 rounded-lg"><span className="text-slate-400">Konu</span><div className="font-bold text-white">{selectedResource.subject}</div></div>
                                    <div className="bg-white/5 p-3 rounded-lg"><span className="text-slate-400">Tür</span><div className="font-bold text-white">{selectedResource.type}</div></div>
                                    <div className="bg-white/5 p-3 rounded-lg"><span className="text-slate-400">Boyut</span><div className="font-bold text-white">{(selectedResource.fileSize / 1024 / 1024).toFixed(2)} MB</div></div>
                                </div>

                                <div className="bg-blue-500/20 p-3 rounded-lg border border-blue-500/30">
                                    <div className="text-sm text-blue-300 font-bold">Yükleyen</div>
                                    <div className="text-sm text-blue-200 mt-1">{selectedResource.uploaderName}</div>
                                    <div className="text-xs text-blue-400 mt-1">{new Date(selectedResource.uploadDate?.seconds * 1000).toLocaleString()}</div>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-white/10">
                                    <button onClick={() => handleResourceApproval(selectedResource.id, true)} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"><CheckCircle size={18}/> Onayla</button>
                                    <button onClick={() => handleResourceApproval(selectedResource.id, false)} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"><XCircle size={18}/> Reddet</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- 2. TALEPLER (GLASS FIX) --- */}
            {activeTab === 'requests' && (
                <div className="glass-box rounded-3xl p-6 shadow-sm transition-colors">
                    <h3 className="font-bold text-lg text-white mb-4">Sınav Talepleri</h3>
                    <div className="space-y-3">
                        {examRequests.map(req => (
                            <div key={req.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 group">
                                <div className="text-center md:text-left">
                                    <div className="font-bold text-white">{req.examName} <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-300">{req.examType}</span></div>
                                    <div className="text-xs text-indigo-400 font-bold">{req.realName} ({req.classSection})</div>
                                    <div className="text-[10px] text-slate-500 mt-1">{new Date(req.timestamp?.seconds*1000).toLocaleString()}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {req.status === 'pending' ? (
                                        <>
                                            <button onClick={() => handleRequestAction(req.id, 'approved')} className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-green-700">Onayla</button>
                                            <button onClick={() => handleRequestAction(req.id, 'rejected')} className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-red-700">Reddet</button>
                                        </>
                                    ) : (
                                        <>
                                            {(req.status === 'approved' || req.status === 'submitted') && <button onClick={() => handleOpenBatchEdit(req.examName)} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-blue-700"><Edit size={14}/> Düzenle</button>}
                                            <span className={`text-xs font-bold px-3 py-1 rounded-lg uppercase border ${req.status === 'approved' ? 'bg-green-500/20 text-green-400 border-green-500/30' : req.status === 'submitted' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-white/10 text-slate-400 border-white/20'}`}>{req.status}</span>
                                        </>
                                    )}
                                    <button onClick={() => handleDeleteContent('exam_requests', req.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-white/10 rounded-full transition-all ml-2" title="Sil"><Trash2 size={18}/></button>
                                </div>
                            </div>
                        ))}
                        {examRequests.length === 0 && <p className="text-slate-400 text-center py-4">Talep yok.</p>}
                    </div>
                </div>
            )}

            {/* --- 3. KULLANICILAR (GLASS FIX) --- */}
            {activeTab === 'users' && (
                <div className="glass-box rounded-3xl overflow-hidden transition-colors">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-slate-400 text-xs uppercase font-bold border-b border-white/10"><tr><th className="p-4">Kullanıcı</th><th className="p-4">Sınıf</th><th className="p-4 text-right">İşlem</th></tr></thead>
                        <tbody className="divide-y divide-white/5">
                            {usersList.map(u => (
                                <tr key={u.internalId} className="hover:bg-white/5">
                                    <td className="p-4 font-medium text-white flex items-center gap-2">
                                        {u.base64Avatar ? <img src={u.base64Avatar} className="w-8 h-8 rounded-full object-cover"/> : <span className="text-xl">{u.avatar}</span>}
                                        {u.username} {u.isAdmin && <Shield size={14} className="text-red-500"/>}
                                    </td>
                                    <td className="p-4 text-slate-300">{u.classSection}</td>
                                    <td className="p-4 text-right">
                                        {!u.isAdmin && !u.isDemo && <button onClick={() => handleBanUser(u)} className={`px-3 py-1 rounded-lg text-xs font-bold ${u.isBanned ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{u.isBanned ? 'Ban Aç' : 'Banla'}</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* --- 4. İÇERİK (GLASS FIX) --- */}
            {activeTab === 'moderation' && (
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="glass-box rounded-3xl p-4 transition-colors">
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2"><MessageCircle size={18}/> Son Mesajlar</h3>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {moderationData.chats.map(chat => (
                                <div key={chat.id} className="p-3 bg-white/5 rounded-xl flex justify-between items-start text-sm border border-white/5">
                                    <div><span className="font-bold text-indigo-400 text-xs">{chat.senderName}:</span> <span className="text-slate-300">{chat.text}</span></div>
                                    <button onClick={() => handleDeleteContent('chat_messages', chat.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={14}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="glass-box rounded-3xl p-4 transition-colors">
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2"><AlertTriangle size={18}/> Son Sorular</h3>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {moderationData.questions.map(q => (
                                <div key={q.id} className="p-3 bg-white/5 rounded-xl flex justify-between items-start text-sm border border-white/5">
                                    <div><div className="font-bold text-white text-xs">{q.askerName} ({q.subject})</div><div className="text-slate-400 text-xs truncate max-w-[200px]">{q.text}</div></div>
                                    <button onClick={() => handleDeleteContent('questions', q.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={14}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* --- 5. ANOMALİ (GLASS FIX) --- */}
            {activeTab === 'logs' && (
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="glass-box rounded-3xl p-6 transition-colors border border-red-500/30">
                        <h3 className="font-bold text-red-500 mb-4 flex items-center gap-2"><Activity/> Şüpheli Yüksek Skorlar (485+)</h3>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {suspiciousData.scores.map(s => (
                                <div key={s.id} className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex justify-between items-center">
                                    <div><div className="font-bold text-white">{s.userName || "Bilinmeyen"}</div><div className="text-xs text-red-400">{s.examName}</div></div>
                                    <div className="text-xl font-bold text-red-500">{s.finalScore}</div>
                                </div>
                            ))}
                            {suspiciousData.scores.length === 0 && <p className="text-slate-500 text-xs text-center py-2">Şüpheli skor yok.</p>}
                        </div>
                    </div>
                    <div className="glass-box rounded-3xl p-6 transition-colors border border-orange-500/30">
                        <h3 className="font-bold text-orange-500 mb-4 flex items-center gap-2"><Zap/> İnsanüstü Hız / Spam Loglar</h3>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {suspiciousData.logs.map(log => {
                                const speed = log.duration > 0 ? (log.questionCount / log.duration).toFixed(1) : "∞";
                                return (
                                    <div key={log.id} className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-white text-sm">{log.username}</div>
                                            <div className="text-[10px] text-slate-400">{log.subject} - {log.topic}</div>
                                            <div className="text-xs font-bold text-orange-400 mt-1">{log.questionCount} Soru / {log.duration} Dk</div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="text-xs font-bold text-slate-400 bg-white/5 px-2 py-1 rounded">{speed} Soru/Dk</div>
                                            <button onClick={() => handleDeleteContent('study_logs', log.id)} className="text-red-500 hover:bg-white/10 p-1.5 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                );
                            })}
                            {suspiciousData.logs.length === 0 && <p className="text-green-500 text-xs font-bold text-center py-2">Temiz. ✅</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* --- 6. DESTEK (GLASS FIX & INPUT FIX) --- */}
            {activeTab === 'feedback' && (
                <div className="glass-box rounded-3xl p-6 transition-colors">
                    <h3 className="font-bold text-white mb-4">Gelen Bildirimler</h3>
                    <div className="space-y-4">
                        {feedbacks.map(f => (
                            <div key={f.id} className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${f.type === 'bug' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>{f.type}</span>
                                        <span className="font-bold text-sm text-white">{f.username}</span>
                                    </div>
                                    <div className="text-xs text-slate-400">{new Date(f.timestamp?.seconds*1000).toLocaleDateString()}</div>
                                </div>
                                
                                <div className="bg-black/20 rounded-xl p-3 border border-white/5 max-h-60 overflow-y-auto custom-scrollbar mb-3 space-y-3">
                                     {(!f.history || f.history.length === 0) && (
                                        <>
                                            <div className="text-sm text-slate-300">{f.message}</div>
                                            {f.image && <a href={f.image} target="_blank" className="text-blue-400 text-xs underline block mt-1">Görsel</a>}
                                            {f.adminReply && <div className="text-sm text-indigo-400 font-bold border-l-2 border-indigo-500 pl-2 mt-2">{f.adminReply}</div>}
                                        </>
                                     )}
                                     {f.history && f.history.map((msg, idx) => (
                                         <div key={idx} className={`flex ${msg.role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                             <div className={`px-3 py-2 rounded-xl text-sm max-w-[85%] ${msg.role === 'admin' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                                                 <div className="whitespace-pre-wrap">{msg.text}</div>
                                                 {msg.image && <a href={msg.image} target="_blank" className="text-blue-300 text-xs underline block mt-1">Görsel Eki</a>}
                                                 <div className="text-[9px] opacity-70 text-right mt-1">{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                             </div>
                                         </div>
                                     ))}
                                </div>

                                {f.status !== 'resolved' ? (
                                    <div className="flex flex-col gap-2">
                                        {selectedFeedbackId === f.id ? (
                                            <>
                                                <textarea className="w-full rounded-xl p-2 text-sm resize-none" style={inputStyle} rows="2" placeholder="Cevap yaz..." value={replyText} onChange={e => setReplyText(e.target.value)}></textarea>
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setSelectedFeedbackId(null)} className="text-slate-400 hover:text-white text-xs font-bold px-3">İptal</button>
                                                    <button onClick={() => handleReplyFeedback(f.id, true)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> Çözüldü & Kapat</button>
                                                    <button onClick={() => handleReplyFeedback(f.id, false)} className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Send size={12}/> Gönder</button>
                                                </div>
                                            </>
                                        ) : <button onClick={() => setSelectedFeedbackId(f.id)} className="w-full bg-white/5 hover:bg-white/10 text-slate-300 py-2 rounded-xl text-xs font-bold transition-colors">Cevapla</button>}
                                    </div>
                                ) : <div className="flex items-center justify-center gap-2 bg-green-500/10 py-2 rounded-xl text-green-400 text-xs font-bold"><CheckCircle size={14}/> Bu talep çözüldü.</div>}
                            </div>
                        ))}
                        {feedbacks.length === 0 && <p className="text-center text-slate-500">Bildirim yok.</p>}
                    </div>
                </div>
            )}
        </div>
    );
}