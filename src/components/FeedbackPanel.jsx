import React, { useState, useEffect } from 'react';
import { MessageSquarePlus, Image as ImageIcon, Send, Clock, CheckCircle, XCircle, AlertCircle, MessageCircle } from 'lucide-react';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { resizeAndCompressImage } from '../utils/helpers';

export default function FeedbackPanel({ currentUser }) {
    const [reports, setReports] = useState([]);
    const [type, setType] = useState("bug");
    const [message, setMessage] = useState("");
    const [image, setImage] = useState("");

    useEffect(() => {
        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'feedback_reports'), where("userId", "==", currentUser.internalId), orderBy('timestamp', 'desc'));
        const unsub = onSnapshot(q, (snap) => { setReports(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
        return () => unsub();
    }, [currentUser]);

    const handleImageUpload = async (e) => { const file = e.target.files[0]; if (file) { const resized = await resizeAndCompressImage(file, 800, 800, 0.6); setImage(resized); } };
    const handleSubmit = async (e) => { e.preventDefault(); if (!message) return alert("Mesaj yazın."); await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'feedback_reports'), { userId: currentUser.internalId, username: currentUser.username, avatar: currentUser.base64Avatar || currentUser.avatar, type, message, image, status: 'pending', adminReply: "", timestamp: serverTimestamp() }); alert("İletildi!"); setMessage(""); setImage(""); };

    const getStatusBadge = (status) => {
        if (status === 'resolved') return <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> Çözüldü</span>;
        if (status === 'rejected') return <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><XCircle size={12}/> Reddedildi</span>;
        return <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><Clock size={12}/> İnceleniyor</span>;
    };

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-gray-700 transition-colors">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><MessageSquarePlus className="text-indigo-600 dark:text-indigo-400"/> Bildirim Oluştur</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Tür</label><div className="flex bg-slate-100 dark:bg-gray-700 p-1 rounded-xl"><button type="button" onClick={() => setType('bug')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === 'bug' ? 'bg-white dark:bg-gray-600 text-red-500 shadow-sm' : 'text-slate-500 dark:text-gray-400'}`}>Hata</button><button type="button" onClick={() => setType('feature')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === 'feature' ? 'bg-white dark:bg-gray-600 text-blue-500 shadow-sm' : 'text-slate-500 dark:text-gray-400'}`}>İstek</button><button type="button" onClick={() => setType('feedback')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === 'feedback' ? 'bg-white dark:bg-gray-600 text-green-500 shadow-sm' : 'text-slate-500 dark:text-gray-400'}`}>Görüş</button></div></div>
                    <div><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Mesaj</label><textarea className="w-full p-3 bg-slate-50 dark:bg-gray-900 dark:text-white border border-slate-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 h-32 resize-none text-sm" placeholder="Detay yazın..." value={message} onChange={e => setMessage(e.target.value)}></textarea></div>
                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-gray-900 p-3 rounded-xl border border-dashed border-slate-300 dark:border-gray-600 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"><div className="bg-white dark:bg-gray-700 p-2 rounded-full shadow-sm text-slate-500 dark:text-gray-300"><ImageIcon size={18}/></div><div className="text-xs text-slate-500 dark:text-gray-400 font-medium flex-1">{image ? "Fotoğraf Seçildi ✅" : "Görsel Ekle (Opsiyonel)"}</div><input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} /></label>
                    <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"><Send size={18}/> Gönder</button>
                </form>
            </div>

            <div className="flex-1 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-slate-100 dark:border-gray-700 flex flex-col overflow-hidden transition-colors">
                <div className="p-4 border-b border-slate-100 dark:border-gray-700"><h3 className="font-bold text-slate-700 dark:text-white">Geçmiş</h3></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {reports.length > 0 ? reports.map(report => (
                        <div key={report.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-700/30 border border-slate-100 dark:border-gray-600">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${report.type === 'bug' ? 'bg-red-500/20 text-red-400' : report.type === 'feature' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>{report.type}</span>
                                    <span className="text-[10px] text-slate-400">{report.timestamp ? new Date(report.timestamp.seconds * 1000).toLocaleDateString() : 'Az önce'}</span>
                                </div>
                                {getStatusBadge(report.status)}
                            </div>
                            <p className="text-sm text-slate-700 dark:text-gray-200 mb-3">{report.message}</p>
                            {report.image && <div className="mb-3"><a href={report.image} target="_blank" rel="noreferrer"><img src={report.image} className="h-24 rounded-lg border border-slate-200 dark:border-gray-600 hover:opacity-90" /></a></div>}
                            
                            {/* CEVAP KISMI (DÜZELTİLDİ) */}
                            {report.adminReply && (
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800 flex gap-3 mt-2 animate-in fade-in">
                                    <div className="bg-indigo-600 text-white p-1.5 rounded-full h-fit"><MessageCircle size={14}/></div>
                                    <div>
                                        <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1">Yönetici Cevabı</div>
                                        <p className="text-xs text-slate-600 dark:text-gray-300">{report.adminReply}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )) : <div className="flex flex-col items-center justify-center h-64 text-slate-400"><AlertCircle size={48} className="mb-2 opacity-20"/><p>Henüz bildirim yok.</p></div>}
                </div>
            </div>
        </div>
    );
}