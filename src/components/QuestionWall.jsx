import React, { useState } from 'react';
import { Camera, Send, CheckCircle, HelpCircle, X, Image as ImageIcon, Filter, Trash2, Paperclip } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, arrayUnion, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { resizeAndCompressImage } from '../utils/helpers';

export default function QuestionWall({ currentUser, initialQuestions = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [newQuestion, setNewQuestion] = useState({ text: "", subject: "Matematik", image: "" });
    const [commentInput, setCommentInput] = useState({});
    const [commentImage, setCommentImage] = useState({});
    
    const [activeSubject, setActiveSubject] = useState("Tümü");
    const [statusFilter, setStatusFilter] = useState("all"); 

    const subjects = ["Tümü", "Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji", "Türkçe", "Tarih", "Coğrafya", "Felsefe"];

    const filteredQuestions = initialQuestions.filter(q => {
        const subjectMatch = activeSubject === "Tümü" || q.subject === activeSubject;
        const statusMatch = statusFilter === "all" || (statusFilter === "solved" ? q.isSolved : !q.isSolved);
        return subjectMatch && statusMatch;
    });

    const handleImageUpload = async (e) => { 
        const file = e.target.files[0]; 
        if (file) { 
            const resized = await resizeAndCompressImage(file, 800, 800, 0.6); 
            setNewQuestion({ ...newQuestion, image: resized }); 
        } 
    };

    const handleCommentImageUpload = async (e, qId) => {
        const file = e.target.files[0];
        if (file) {
            const resized = await resizeAndCompressImage(file, 600, 600, 0.6);
            setCommentImage({ ...commentImage, [qId]: resized });
        }
    };

    const handleSubmit = async () => { 
        if (!newQuestion.text && !newQuestion.image) return alert("Lütfen bir yazı veya fotoğraf ekle."); 
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'questions'), { 
            ...newQuestion, 
            askerId: currentUser.internalId, 
            askerName: currentUser.username, 
            askerAvatar: currentUser.base64Avatar || currentUser.avatar, 
            isSolved: false, 
            comments: [], 
            timestamp: serverTimestamp() 
        }); 
        setShowModal(false); 
        setNewQuestion({ text: "", subject: "Matematik", image: "" }); 
    };

    const handleSendComment = async (qId) => { 
        const text = commentInput[qId]; 
        const image = commentImage[qId];
        if (!text?.trim() && !image) return; 

        const qRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'questions', qId); 
        await updateDoc(qRef, { 
            comments: arrayUnion({ 
                text: text || "", image: image || null, senderName: currentUser.username, 
                senderId: currentUser.internalId, timestamp: Date.now() 
            }) 
        }); 
        setCommentInput(p => ({ ...p, [qId]: "" })); 
        setCommentImage(p => ({ ...p, [qId]: null }));
    };

    const toggleSolved = async (qId, currentStatus) => { 
        await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'questions', qId), { isSolved: !currentStatus }); 
    };

    const handleDeleteQuestion = async (qId) => {
        if (confirm("Bu soruyu silmek istiyor musun?")) {
            await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'questions', qId));
        }
    };

    return (
        <div className="max-w-4xl mx-auto flex flex-col h-full pb-24">
            
            {/* ÜST PANEL */}
            <div className="glass-box p-5 rounded-3xl shadow-sm mb-4 flex-shrink-0">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2"><HelpCircle className="text-orange-400"/> Soru Duvarı</h2>
                        <p className="text-xs text-slate-400 mt-1">Takıldığın soruları paylaş.</p>
                    </div>
                    <button onClick={() => setShowModal(true)} className="bg-orange-600 hover:bg-orange-700 text-white p-3 md:px-5 md:py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg active:scale-95 transition-transform"><Camera size={20}/> <span className="hidden md:inline">Soru Sor</span></button>
                </div>
                
                {/* FİLTRELER */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                        <div className="flex items-center text-slate-500 pr-2 border-r border-white/10 flex-shrink-0"><Filter size={18}/></div>
                        {subjects.map(sub => (
                            <button key={sub} onClick={() => setActiveSubject(sub)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 border ${activeSubject === sub ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'}`}>{sub}</button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        {[{id:'all', l:'Tümü'}, {id:'pending', l:'Bekleyenler'}, {id:'solved', l:'Çözülenler'}].map(s => (
                            <button key={s.id} onClick={() => setStatusFilter(s.id)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${statusFilter === s.id ? 'bg-white text-indigo-900 shadow' : 'bg-white/5 text-slate-500'}`}>{s.l}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* SORU LİSTESİ */}
            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar px-1">
                {filteredQuestions.length > 0 ? filteredQuestions.map(q => (
                    <div key={q.id} className={`glass-box rounded-3xl p-5 transition-all relative ${q.isSolved ? 'border-green-500/30 bg-green-900/20' : ''}`}>
                        
                        {/* HEADER */}
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-lg border border-indigo-500/30 flex-shrink-0">
                                    {q.askerAvatar?.startsWith('data:') ? <img src={q.askerAvatar} className="w-full h-full object-cover rounded-full"/> : q.askerAvatar}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-bold text-white truncate">{q.askerName}</div>
                                    <div className="text-xs text-slate-400 flex flex-wrap gap-2 items-center mt-0.5">
                                        <span className="bg-white/10 px-2 py-0.5 rounded text-slate-300 font-medium">{q.subject}</span>
                                        <span>•</span>
                                        <span>{q.timestamp ? new Date(q.timestamp.seconds * 1000).toLocaleDateString('tr-TR') : 'Az önce'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {(q.askerId === currentUser.internalId || currentUser.isAdmin) && (
                                    <>
                                        <button onClick={() => toggleSolved(q.id, q.isSolved)} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${q.isSolved ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-slate-400 hover:bg-white/20'}`}>
                                            <CheckCircle size={14}/> <span className="hidden sm:inline">{q.isSolved ? 'Çözüldü' : 'İşaretle'}</span>
                                        </button>
                                        <button onClick={() => handleDeleteQuestion(q.id)} className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-full"><Trash2 size={16}/></button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* İÇERİK */}
                        <div className="mb-4">
                            <p className="text-slate-200 mb-3 whitespace-pre-wrap text-sm leading-relaxed">{q.text}</p>
                            {q.image && (
                                <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40 flex justify-center cursor-pointer" onClick={() => window.open(q.image, '_blank')}>
                                    <img src={q.image} alt="Soru" className="max-h-80 w-auto object-contain" />
                                </div>
                            )}
                        </div>

                        {/* YORUMLAR */}
                        <div className="bg-black/30 rounded-2xl p-3 border border-white/5">
                            <div className="space-y-3 mb-3 max-h-60 overflow-y-auto custom-scrollbar">
                                {q.comments?.length > 0 ? q.comments.map((c, i) => (
                                    <div key={i} className="flex gap-2 text-sm bg-white/5 p-2.5 rounded-xl border border-white/5">
                                        <span className="font-bold text-indigo-400 flex-shrink-0 text-xs">{c.senderName}:</span>
                                        <div className="flex-1">
                                            <span className="text-slate-300 break-words text-xs">{c.text}</span>
                                            {c.image && <img src={c.image} className="mt-2 rounded-lg max-h-32 border border-white/10 cursor-pointer" onClick={() => window.open(c.image, '_blank')}/>}
                                        </div>
                                    </div>
                                )) : <div className="text-xs text-slate-500 italic text-center py-1">Henüz cevap yok.</div>}
                            </div>
                            
                            <div className="flex gap-2 items-center">
                                <label className={`p-2.5 rounded-xl cursor-pointer transition-colors ${commentImage[q.id] ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                                    <Paperclip size={18}/>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleCommentImageUpload(e, q.id)}/>
                                </label>
                                
                                {/* INPUT DÜZELTİLDİ: glass-input SINIFI KULLANILDI */}
                                <input 
                                    type="text" 
                                    placeholder="Cevap yaz..." 
                                    className="glass-input" 
                                    value={commentInput[q.id] || ""} 
                                    onChange={e => setCommentInput({...commentInput, [q.id]: e.target.value})} 
                                    onKeyDown={e => e.key === 'Enter' && handleSendComment(q.id)}
                                />
                                <button onClick={() => handleSendComment(q.id)} className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 shadow-md"><Send size={18}/></button>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                        <Filter size={48} className="mb-2 opacity-20"/>
                        <p>Kriterlere uygun soru yok.</p>
                    </div>
                )}
            </div>

            {/* SORU SORMA MODALI (GLASS FIX) */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
                    <div className="glass-box rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto border border-white/10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-white">Soru Sor</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} className="text-slate-400"/></button>
                        </div>
                        <div className="space-y-4">
                            {/* TEXTAREA DÜZELTİLDİ */}
                            <textarea 
                                className="glass-input h-32 resize-none"
                                placeholder="Sorunu buraya yazabilirsin..." 
                                value={newQuestion.text} 
                                onChange={e => setNewQuestion({...newQuestion, text: e.target.value})}
                            ></textarea>
                            
                            <div className="grid grid-cols-2 gap-4">
                                {/* SELECT DÜZELTİLDİ */}
                                <select 
                                    className="glass-input" 
                                    value={newQuestion.subject} 
                                    onChange={e => setNewQuestion({...newQuestion, subject: e.target.value})}
                                >
                                    {subjects.filter(s => s !== "Tümü").map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                
                                <label className="bg-white/5 border border-white/10 border-dashed rounded-xl flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors text-slate-400 gap-2 text-sm p-2 text-center h-[46px]">
                                    <ImageIcon size={18}/> 
                                    <span className="truncate">{newQuestion.image ? "Foto Seçildi" : "Fotoğraf"}</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload}/>
                                </label>
                            </div>
                            <button onClick={handleSubmit} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95">Paylaş</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}