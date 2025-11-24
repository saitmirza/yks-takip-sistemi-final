import React, { useState, useEffect } from 'react';
import { Users, MessageCircle, AlertTriangle, Trash2, Shield, Activity, FileText, Search, Key, Ban, CheckCircle, MessageSquarePlus, Send, XCircle, Check } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, deleteDoc, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import AdminExcelView from './AdminExcelView';

export default function AdminDashboard({ usersList, allScores, appId }) {
    const [activeTab, setActiveTab] = useState('exams'); 
    const [suspiciousLogs, setSuspiciousLogs] = useState([]);
    const [recentMessages, setRecentMessages] = useState([]);
    const [recentQuestions, setRecentQuestions] = useState([]);
    const [feedbackReports, setFeedbackReports] = useState([]); // YENİ
    const [searchTerm, setSearchTerm] = useState("");
    
    // Cevaplama State'i
    const [replyText, setReplyText] = useState({}); 

    useEffect(() => {
        if (activeTab === 'moderation') fetchModerationData();
        else if (activeTab === 'logs') fetchLogs();
        else if (activeTab === 'feedback') fetchFeedbacks(); // YENİ
    }, [activeTab]);

    const fetchModerationData = async () => {
        const msgQ = query(collection(db, 'artifacts', appId, 'public', 'data', 'chat_messages'), orderBy('timestamp', 'desc'), limit(50));
        const msgSnap = await getDocs(msgQ);
        setRecentMessages(msgSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const qQ = query(collection(db, 'artifacts', appId, 'public', 'data', 'questions'), orderBy('timestamp', 'desc'), limit(20));
        const qSnap = await getDocs(qQ);
        setRecentQuestions(qSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    const fetchLogs = async () => {
        const logQ = query(collection(db, 'artifacts', appId, 'public', 'data', 'study_logs'), orderBy('timestamp', 'desc'), limit(100));
        const logSnap = await getDocs(logQ);
        const logs = logSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const suspicious = logs.filter(log => {
            const q = Number(log.questionCount); const d = Number(log.duration);
            if (q > 500) return true; if (d > 0 && (q / d) > 5) return true;
            return false;
        });
        setSuspiciousLogs(suspicious);
    };

    // YENİ: Feedbackleri Çek
    const fetchFeedbacks = async () => {
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'feedback_reports'), orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        setFeedbackReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    // YENİ: Feedback Cevaplama ve Durum Güncelleme
    const handleFeedbackUpdate = async (id, status, reply = null) => {
        const updateData = { status };
        if (reply !== null) updateData.adminReply = reply;

        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'feedback_reports', id), updateData);
        
        // Listeyi güncelle
        setFeedbackReports(prev => prev.map(r => r.id === id ? { ...r, ...updateData } : r));
        if (reply) setReplyText(p => ({ ...p, [id]: "" })); // Inputu temizle
        alert("Güncellendi!");
    };

    const handleDeleteItem = async (collectionName, id) => {
        if (confirm("Silmek istiyor musun?")) {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, id));
            if (collectionName === 'chat_messages') setRecentMessages(prev => prev.filter(m => m.id !== id));
            if (collectionName === 'questions') setRecentQuestions(prev => prev.filter(q => q.id !== id));
            if (collectionName === 'study_logs') setSuspiciousLogs(prev => prev.filter(l => l.id !== id));
            if (collectionName === 'feedback_reports') setFeedbackReports(prev => prev.filter(r => r.id !== id));
        }
    };

    const handleUserAction = async (userId, action) => {
        const targetUser = usersList.find(u => u.internalId === userId); if(!targetUser) return; const docId = targetUser.email; 
        if (action === 'delete') { if (confirm("Kullanıcı silinecek! Emin misin?")) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_accounts', docId)); alert("Silindi."); } } 
        else if (action === 'reset_pass') { const newPass = prompt("Yeni şifre:", "123456"); if (newPass) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_accounts', docId), { password: newPass }); alert("Şifre güncellendi."); } }
    };

    const filteredUsers = usersList.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()) || u.realName.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            <div className="bg-white dark:bg-gray-800 text-slate-800 dark:text-white p-8 rounded-3xl shadow-lg relative overflow-hidden border border-slate-200 dark:border-gray-700 transition-colors">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold flex items-center gap-3"><Shield size={32} className="text-indigo-600 dark:text-indigo-400"/> Komuta Merkezi</h1>
                    <p className="text-slate-500 dark:text-gray-400 mt-2">Sistemin güvenliği ve düzeni senden sorulur.</p>
                </div>
                <div className="flex flex-wrap gap-2 mt-6">
                    {[
                        { id: 'exams', icon: <FileText/>, label: 'Sınav Girişi' },
                        { id: 'users', icon: <Users/>, label: 'Kullanıcılar' },
                        { id: 'moderation', icon: <MessageCircle/>, label: 'İçerik' },
                        { id: 'logs', icon: <Activity/>, label: 'Anomali' },
                        { id: 'feedback', icon: <MessageSquarePlus/>, label: 'Talepler' }, // YENİ
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600'}`}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'exams' && <AdminExcelView usersList={usersList} allScores={allScores} appId={appId} />}

            {activeTab === 'users' && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 p-6 shadow-sm transition-colors">
                    <div className="flex justify-between items-center mb-4"><h2 className="font-bold text-lg text-slate-700 dark:text-white">Öğrenci Listesi ({usersList.length})</h2><div className="flex items-center gap-2 bg-slate-100 dark:bg-gray-700 px-3 py-2 rounded-xl"><Search size={16} className="text-slate-400"/><input type="text" placeholder="Ara..." className="bg-transparent outline-none text-sm w-32 md:w-48 dark:text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div></div>
                    <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 dark:bg-gray-900 text-slate-500 dark:text-gray-400 uppercase text-xs"><tr><th className="p-3">Kullanıcı</th><th className="p-3">E-posta</th><th className="p-3">Rol</th><th className="p-3 text-right">İşlemler</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-gray-700">{filteredUsers.map(user => (<tr key={user.internalId} className="hover:bg-slate-50 dark:hover:bg-gray-700/50"><td className="p-3 font-bold flex items-center gap-2 text-slate-800 dark:text-white">{user.avatar?.startsWith('data:') ? <img src={user.avatar} className="w-6 h-6 rounded-full"/> : <span>{user.avatar}</span>} {user.username}</td><td className="p-3 text-slate-500 dark:text-gray-400">{user.email}</td><td className="p-3">{user.isAdmin ? <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">Admin</span> : <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-bold">Öğrenci</span>}</td><td className="p-3 text-right flex justify-end gap-2"><button onClick={() => handleUserAction(user.internalId, 'reset_pass')} className="p-2 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg"><Key size={16}/></button>{!user.isAdmin && <button onClick={() => handleUserAction(user.internalId, 'delete')} className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg"><Ban size={16}/></button>}</td></tr>))}</tbody></table></div>
                </div>
            )}

            {activeTab === 'moderation' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-slate-200 dark:border-gray-700 transition-colors"><h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-700 dark:text-white"><MessageCircle className="text-indigo-500"/> Son Mesajlar</h3><div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">{recentMessages.map(msg => (<div key={msg.id} className="p-3 bg-slate-50 dark:bg-gray-700 rounded-xl flex justify-between items-start"><div><div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{msg.senderName}</div><div className="text-sm text-slate-600 dark:text-gray-300 break-all">{msg.text}</div></div><button onClick={() => handleDeleteItem('chat_messages', msg.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></div>))}</div></div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-slate-200 dark:border-gray-700 transition-colors"><h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-700 dark:text-white"><FileText className="text-orange-500"/> Son Sorular</h3><div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">{recentQuestions.map(q => (<div key={q.id} className="p-3 bg-slate-50 dark:bg-gray-700 rounded-xl flex justify-between items-start"><div className="flex-1 min-w-0"><div className="text-xs font-bold text-orange-600 dark:text-orange-400">{q.askerName} • {q.subject}</div><div className="text-sm text-slate-600 dark:text-gray-300 truncate">{q.text || "Fotoğraflı"}</div></div><button onClick={() => handleDeleteItem('questions', q.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></div>))}</div></div>
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-slate-200 dark:border-gray-700 transition-colors">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-red-600"><Activity/> Şüpheli Aktiviteler</h3>
                    {suspiciousLogs.length > 0 ? (<div className="space-y-3">{suspiciousLogs.map(log => (<div key={log.id} className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-xl flex justify-between items-center"><div className="flex items-center gap-4"><div className="bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-200 w-10 h-10 rounded-full flex items-center justify-center font-bold">!</div><div><div className="font-bold text-slate-800 dark:text-white">{log.username}</div><div className="text-sm text-red-600 dark:text-red-400 font-medium">{log.questionCount} Soru / {log.duration} Dk</div></div></div><button onClick={() => handleDeleteItem('study_logs', log.id)} className="px-4 py-2 bg-white dark:bg-gray-800 text-red-600 border border-red-200 dark:border-gray-600 rounded-lg text-xs font-bold">Sil</button></div>))}</div>) : <div className="text-center py-10 text-green-500 flex flex-col items-center gap-2"><CheckCircle size={48} className="opacity-20"/><span className="font-bold">Temiz!</span></div>}
                </div>
            )}

            {/* --- YENİ: TALEP YÖNETİMİ --- */}
            {activeTab === 'feedback' && (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    {feedbackReports.map(report => (
                        <div key={report.id} className={`bg-white dark:bg-gray-800 p-5 rounded-2xl border transition-colors ${report.status === 'resolved' ? 'border-green-200 dark:border-green-900' : report.status === 'rejected' ? 'border-red-200 dark:border-red-900' : 'border-slate-200 dark:border-gray-700'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${report.type === 'bug' ? 'bg-red-100 text-red-600' : report.type === 'feature' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>{report.type}</span>
                                    <span className="text-xs font-bold text-slate-700 dark:text-white">{report.username}</span>
                                </div>
                                <div className="text-[10px] text-slate-400">{report.timestamp ? new Date(report.timestamp.seconds * 1000).toLocaleDateString() : '-'}</div>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-gray-300 mb-3 bg-slate-50 dark:bg-gray-900 p-3 rounded-xl">{report.message}</p>
                            {report.image && <a href={report.image} target="_blank" className="text-xs text-blue-500 underline mb-3 block">Görseli İncele</a>}
                            
                            <div className="flex gap-2 mt-2">
                                <input type="text" placeholder="Cevap yaz..." className="flex-1 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-600 rounded-lg px-3 text-xs outline-none dark:text-white" value={replyText[report.id] || ""} onChange={e => setReplyText({...replyText, [report.id]: e.target.value})}/>
                                <button onClick={() => handleFeedbackUpdate(report.id, report.status, replyText[report.id])} className="bg-indigo-600 text-white p-2 rounded-lg"><Send size={14}/></button>
                            </div>
                            <div className="flex gap-2 mt-3 border-t border-slate-100 dark:border-gray-700 pt-3">
                                <button onClick={() => handleFeedbackUpdate(report.id, 'resolved')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 ${report.status === 'resolved' ? 'bg-green-600 text-white' : 'bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400'}`}><CheckCircle size={14}/> Çözüldü</button>
                                <button onClick={() => handleFeedbackUpdate(report.id, 'rejected')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 ${report.status === 'rejected' ? 'bg-red-600 text-white' : 'bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400'}`}><XCircle size={14}/> Reddet</button>
                                <button onClick={() => handleDeleteItem('feedback_reports', report.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    ))}
                    {feedbackReports.length === 0 && <div className="col-span-full text-center py-10 text-slate-400">Henüz bildirim yok.</div>}
                </div>
            )}
        </div>
    );
}