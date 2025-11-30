import React, { useState, useEffect, useRef } from 'react';
import { MessageSquarePlus, Image as ImageIcon, Send, Clock, CheckCircle, XCircle, User, Shield, Info, AlertTriangle, Plus, List } from 'lucide-react';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { resizeAndCompressImage } from '../utils/helpers';

export default function FeedbackPanel({ currentUser }) {
    const [reports, setReports] = useState([]);
    const [type, setType] = useState("bug");
    const [initialMessage, setInitialMessage] = useState("");
    const [image, setImage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [replyInputs, setReplyInputs] = useState({});
    
    // MOBİL İÇİN SEKME YÖNETİMİ
    // Desktop'ta ikisi de görünür, mobilde sadece biri.
    const [mobileTab, setMobileTab] = useState('history'); // 'new' veya 'history'

    useEffect(() => {
        if (!currentUser) return;
        const q = query(
            collection(db, 'artifacts', APP_ID, 'public', 'data', 'feedback_reports'), 
            where("userId", "==", currentUser.internalId)
        );
        const unsub = onSnapshot(q, (snap) => { 
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            setReports(data); 
        });
        return () => unsub();
    }, [currentUser]);

    const handleImageUpload = async (e) => { 
        const file = e.target.files[0]; 
        if (file) { 
            const resized = await resizeAndCompressImage(file, 800, 800, 0.6); 
            setImage(resized); 
        } 
    };

    const handleSubmit = async (e) => { 
        e.preventDefault(); 
        if (!initialMessage) return alert("Lütfen bir mesaj yazın."); 
        
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'feedback_reports'), { 
                userId: currentUser.internalId, 
                username: currentUser.username, 
                avatar: currentUser.base64Avatar || currentUser.avatar, 
                type, 
                status: 'pending', 
                timestamp: serverTimestamp(),
                history: [{
                    role: 'user',
                    text: initialMessage,
                    image: image || null,
                    timestamp: Date.now()
                }]
            }); 
            setInitialMessage(""); 
            setImage(""); 
            alert("Destek talebi oluşturuldu!");
            setMobileTab('history'); // Mobilde hemen listeye dön
        } catch (error) { console.error(error); alert("Hata oluştu."); }
        setIsSubmitting(false);
    };

    const handleReply = async (reportId) => {
        const text = replyInputs[reportId];
        if (!text?.trim()) return;

        try {
            const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'feedback_reports', reportId);
            await updateDoc(ref, {
                status: 'pending',
                history: arrayUnion({
                    role: 'user',
                    text: text,
                    timestamp: Date.now()
                })
            });
            setReplyInputs(prev => ({ ...prev, [reportId]: "" }));
        } catch (error) { console.error(error); }
    };

    const getStatusBadge = (status) => {
        if (status === 'resolved') return <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><CheckCircle size={14}/> Çözüldü</span>;
        if (status === 'rejected') return <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><XCircle size={14}/> Kapatıldı</span>;
        return <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><Clock size={14}/> İnceleniyor</span>;
    };

    const getDisplayHistory = (report) => {
        if (report.history && report.history.length > 0) return report.history;
        const fakeHistory = [];
        if (report.message) fakeHistory.push({ role: 'user', text: report.message, image: report.image, timestamp: report.timestamp?.seconds * 1000 || Date.now() });
        if (report.adminReply) fakeHistory.push({ role: 'admin', text: report.adminReply, timestamp: Date.now() });
        return fakeHistory;
    };

    return (
        <div className="max-w-6xl mx-auto md:h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6 pb-24 md:pb-20">
            
            {/* MOBİL SEKME MENÜSÜ (Sadece Mobilde Görünür) */}
            <div className="md:hidden flex bg-white dark:bg-gray-800 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-700 sticky top-0 z-20">
                <button 
                    onClick={() => setMobileTab('history')} 
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${mobileTab === 'history' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-gray-400'}`}
                >
                    <List size={18}/> Taleplerim
                </button>
                <button 
                    onClick={() => setMobileTab('new')} 
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${mobileTab === 'new' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-gray-400'}`}
                >
                    <Plus size={18}/> Yeni Talep
                </button>
            </div>

            {/* --- SOL PANEL: YENİ TICKET FORMU --- */}
            {/* Mobilde 'new' sekmesi açıksa veya Desktopta her zaman görünür */}
            <div className={`w-full md:w-1/3 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-gray-700 h-fit transition-colors ${mobileTab === 'new' ? 'block' : 'hidden md:block'}`}>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <MessageSquarePlus className="text-indigo-600 dark:text-indigo-400"/> Yeni Destek Talebi
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex bg-slate-100 dark:bg-gray-700 p-1 rounded-xl">
                        {['bug', 'feature', 'feedback'].map((t) => (
                            <button key={t} type="button" onClick={() => setType(t)} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all capitalize ${type === t ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500 dark:text-gray-400'}`}>
                                {t === 'bug' ? 'Hata' : t === 'feature' ? 'İstek' : 'Görüş'}
                            </button>
                        ))}
                    </div>
                    <textarea 
                        className="w-full p-4 bg-slate-50 dark:bg-gray-900 dark:text-white border border-slate-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 h-40 resize-none text-sm leading-relaxed" 
                        placeholder="Sorunu veya önerini detaylıca anlat..." 
                        value={initialMessage} 
                        onChange={e => setInitialMessage(e.target.value)}
                    ></textarea>
                    
                    <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-dashed transition-colors ${image ? 'bg-green-50 dark:bg-green-900/10 border-green-300 dark:border-green-800' : 'bg-slate-50 dark:bg-gray-900 border-slate-300 dark:border-gray-600 hover:bg-slate-100 dark:hover:bg-gray-800'}`}>
                        <div className={`p-2 rounded-full shadow-sm ${image ? 'bg-green-100 text-green-600' : 'bg-white dark:bg-gray-700 text-slate-500'}`}>{image ? <CheckCircle size={18}/> : <ImageIcon size={18}/>}</div>
                        <div className="text-xs font-bold flex-1 text-slate-600 dark:text-gray-300">{image ? "Fotoğraf Eklendi" : "Ekran Görüntüsü (Opsiyonel)"}</div>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                    
                    <button disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 active:scale-95">
                        {isSubmitting ? <Clock size={18} className="animate-spin"/> : <Send size={18}/>} 
                        {isSubmitting ? 'Gönderiliyor...' : 'Talebi Gönder'}
                    </button>
                </form>
            </div>

            {/* --- SAĞ PANEL: GEÇMİŞ VE SOHBETLER --- */}
            {/* Mobilde 'history' sekmesi açıksa veya Desktopta her zaman görünür */}
            <div className={`flex-1 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-slate-100 dark:border-gray-700 flex flex-col overflow-hidden min-h-[60vh] transition-colors ${mobileTab === 'history' ? 'block' : 'hidden md:flex'}`}>
                <div className="p-5 border-b border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-900/20 sticky top-0 z-10 backdrop-blur-md">
                    <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2"><Info size={18}/> Taleplerim</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-6 custom-scrollbar bg-slate-50/30 dark:bg-[#0b141a]">
                    {reports.length > 0 ? reports.map(report => {
                        const history = getDisplayHistory(report);
                        
                        return (
                            <div key={report.id} className="rounded-2xl border border-slate-200 dark:border-gray-700 overflow-hidden shadow-sm bg-white dark:bg-gray-900">
                                {/* Header */}
                                <div className="bg-slate-50 dark:bg-gray-800 p-3 flex justify-between items-center border-b border-slate-100 dark:border-gray-700">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${report.type === 'bug' ? 'bg-red-100 text-red-600' : report.type === 'feature' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>{report.type}</span>
                                        <span className="text-xs text-slate-400 font-medium">{report.timestamp ? new Date(report.timestamp.seconds * 1000).toLocaleDateString() : '...'}</span>
                                    </div>
                                    {getStatusBadge(report.status)}
                                </div>

                                {/* Sohbet Alanı (Daha geniş ve okunaklı) */}
                                <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: '300px' }}>
                                    {history.map((msg, idx) => {
                                        const isMe = msg.role === 'user';
                                        return (
                                            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`p-3.5 rounded-2xl text-sm max-w-[90%] md:max-w-[85%] relative shadow-sm leading-relaxed ${isMe ? 'bg-[#005c4b] text-white rounded-tr-none' : 'bg-white dark:bg-[#1f2937] text-slate-800 dark:text-gray-100 rounded-tl-none border border-slate-200 dark:border-gray-700'}`}>
                                                    {!isMe && <div className="text-[10px] font-bold text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1"><Shield size={10}/> Yönetici</div>}
                                                    <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                                                    {msg.image && <a href={msg.image} target="_blank" className="block mt-3"><img src={msg.image} className="rounded-lg max-h-48 w-auto border border-white/20"/></a>}
                                                    <div className={`text-[9px] mt-1.5 text-right opacity-70 ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Cevap Yazma Inputu */}
                                {report.status !== 'resolved' && (
                                    <div className="p-3 bg-slate-50 dark:bg-gray-900 border-t border-slate-100 dark:border-gray-700 flex gap-2 items-center">
                                        <input 
                                            type="text" 
                                            className="flex-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm outline-none dark:text-white focus:border-indigo-500 transition-colors shadow-sm"
                                            placeholder="Cevap yaz..."
                                            value={replyInputs[report.id] || ""}
                                            onChange={e => setReplyInputs({...replyInputs, [report.id]: e.target.value})}
                                            onKeyDown={e => e.key === 'Enter' && handleReply(report.id)}
                                        />
                                        <button onClick={() => handleReply(report.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl shadow-md transition-transform active:scale-95 flex-shrink-0"><Send size={18}/></button>
                                    </div>
                                )}
                                {report.status === 'resolved' && (
                                    <div className="p-3 bg-green-50 dark:bg-green-900/10 text-center text-xs font-bold text-green-600 dark:text-green-400 border-t border-green-100 dark:border-green-900/30">
                                        Bu destek talebi kapatılmıştır.
                                    </div>
                                )}
                            </div>
                        );
                    }) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 min-h-[300px]">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle size={32} className="opacity-40"/>
                            </div>
                            <p className="font-medium">Henüz bir bildirim oluşturmadın.</p>
                            <button onClick={() => setMobileTab('new')} className="text-indigo-500 text-sm font-bold mt-2 hover:underline">Yeni Talep Oluştur</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
