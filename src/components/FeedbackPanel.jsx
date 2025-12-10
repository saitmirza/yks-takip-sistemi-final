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
    const [mobileTab, setMobileTab] = useState('history'); // 'new' veya 'history'

    // Ortak Input Stili (Kesin Çözüm - Glass Fix)
    const inputStyle = {
        backgroundColor: '#1e293b', // Slate-800
        color: '#ffffff',
        border: '1px solid #334155', // Slate-700
        outline: 'none'
    };

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
            setMobileTab('history'); 
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
        if (status === 'resolved') return <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-green-500/30"><CheckCircle size={14}/> Çözüldü</span>;
        if (status === 'rejected') return <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-red-500/30"><XCircle size={14}/> Kapatıldı</span>;
        return <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-yellow-500/30"><Clock size={14}/> İnceleniyor</span>;
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
            
            {/* MOBİL SEKME MENÜSÜ */}
            <div className="md:hidden flex bg-black/20 p-1.5 rounded-2xl shadow-sm border border-white/10 sticky top-0 z-20 backdrop-blur-md">
                <button 
                    onClick={() => setMobileTab('history')} 
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${mobileTab === 'history' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    <List size={18}/> Taleplerim
                </button>
                <button 
                    onClick={() => setMobileTab('new')} 
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${mobileTab === 'new' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    <Plus size={18}/> Yeni Talep
                </button>
            </div>

            {/* --- SOL PANEL: YENİ TICKET FORMU (GLASS FIX) --- */}
            <div className={`w-full md:w-1/3 glass-box p-6 rounded-3xl shadow-sm h-fit transition-colors ${mobileTab === 'new' ? 'block' : 'hidden md:block'}`}>
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <MessageSquarePlus className="text-indigo-400"/> Yeni Destek Talebi
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
                        {['bug', 'feature', 'feedback'].map((t) => (
                            <button key={t} type="button" onClick={() => setType(t)} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all capitalize ${type === t ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                                {t === 'bug' ? 'Hata' : t === 'feature' ? 'İstek' : 'Görüş'}
                            </button>
                        ))}
                    </div>
                    
                    {/* TEXTAREA FIX */}
                    <textarea 
                        className="w-full p-4 rounded-xl h-40 resize-none text-sm leading-relaxed" 
                        style={inputStyle}
                        placeholder="Sorunu veya önerini detaylıca anlat..." 
                        value={initialMessage} 
                        onChange={e => setInitialMessage(e.target.value)}
                    ></textarea>
                    
                    <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-dashed transition-colors ${image ? 'bg-green-500/10 border-green-500/30' : 'bg-black/20 border-white/10 hover:bg-white/5'}`}>
                        <div className={`p-2 rounded-full shadow-sm ${image ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-slate-400'}`}>{image ? <CheckCircle size={18}/> : <ImageIcon size={18}/>}</div>
                        <div className="text-xs font-bold flex-1 text-slate-300">{image ? "Fotoğraf Eklendi" : "Ekran Görüntüsü (Opsiyonel)"}</div>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                    
                    <button disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 active:scale-95 border border-indigo-500/50">
                        {isSubmitting ? <Clock size={18} className="animate-spin"/> : <Send size={18}/>} 
                        {isSubmitting ? 'Gönderiliyor...' : 'Talebi Gönder'}
                    </button>
                </form>
            </div>

            {/* --- SAĞ PANEL: GEÇMİŞ VE SOHBETLER (GLASS FIX) --- */}
            <div className={`flex-1 glass-box rounded-3xl shadow-sm flex flex-col overflow-hidden min-h-[60vh] transition-colors ${mobileTab === 'history' ? 'block' : 'hidden md:flex'}`}>
                <div className="p-5 border-b border-white/10 bg-white/5 sticky top-0 z-10 backdrop-blur-md">
                    <h3 className="font-bold text-white flex items-center gap-2"><Info size={18} className="text-indigo-400"/> Taleplerim</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-6 custom-scrollbar bg-black/20">
                    {reports.length > 0 ? reports.map(report => {
                        const history = getDisplayHistory(report);
                        
                        return (
                            <div key={report.id} className="rounded-2xl border border-white/10 overflow-hidden shadow-sm bg-slate-900/80">
                                {/* Header */}
                                <div className="bg-white/5 p-3 flex justify-between items-center border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${report.type === 'bug' ? 'bg-red-500/20 text-red-400' : report.type === 'feature' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>{report.type}</span>
                                        <span className="text-xs text-slate-400 font-medium">{report.timestamp ? new Date(report.timestamp.seconds * 1000).toLocaleDateString() : '...'}</span>
                                    </div>
                                    {getStatusBadge(report.status)}
                                </div>

                                {/* Sohbet Alanı */}
                                <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: '300px' }}>
                                    {history.map((msg, idx) => {
                                        const isMe = msg.role === 'user';
                                        return (
                                            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`p-3.5 rounded-2xl text-sm max-w-[90%] md:max-w-[85%] relative shadow-sm leading-relaxed backdrop-blur-md border ${isMe ? 'bg-indigo-600/90 text-white rounded-tr-none border-indigo-500/50' : 'bg-slate-800/90 text-slate-200 rounded-tl-none border-slate-700/50'}`}>
                                                    {!isMe && <div className="text-[10px] font-bold text-orange-400 mb-1 flex items-center gap-1"><Shield size={10}/> Yönetici</div>}
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
                                    <div className="p-3 bg-slate-900 border-t border-white/10 flex gap-2 items-center">
                                        <input 
                                            type="text" 
                                            className="flex-1 rounded-xl px-4 py-3 text-sm transition-colors shadow-sm placeholder-slate-500"
                                            style={inputStyle}
                                            placeholder="Cevap yaz..."
                                            value={replyInputs[report.id] || ""}
                                            onChange={e => setReplyInputs({...replyInputs, [report.id]: e.target.value})}
                                            onKeyDown={e => e.key === 'Enter' && handleReply(report.id)}
                                        />
                                        <button onClick={() => handleReply(report.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl shadow-md transition-transform active:scale-95 flex-shrink-0"><Send size={18}/></button>
                                    </div>
                                )}
                                {report.status === 'resolved' && (
                                    <div className="p-3 bg-green-500/10 text-center text-xs font-bold text-green-400 border-t border-green-500/30">
                                        Bu destek talebi kapatılmıştır.
                                    </div>
                                )}
                            </div>
                        );
                    }) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 min-h-[300px]">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                                <AlertTriangle size={32} className="opacity-40"/>
                            </div>
                            <p className="font-medium">Henüz bir bildirim oluşturmadın.</p>
                            <button onClick={() => setMobileTab('new')} className="text-indigo-400 text-sm font-bold mt-2 hover:underline">Yeni Talep Oluştur</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}