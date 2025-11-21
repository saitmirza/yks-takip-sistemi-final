import React, { useState } from 'react';
import { Camera, Send, CheckCircle, HelpCircle, X, Image as ImageIcon, Filter } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { resizeAndCompressImage } from '../utils/helpers';

export default function QuestionWall({ currentUser, initialQuestions = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [newQuestion, setNewQuestion] = useState({ text: "", subject: "Matematik", image: "" });
    const [commentInput, setCommentInput] = useState({});
    const [activeFilter, setActiveFilter] = useState("Tümü");

    const subjects = ["Tümü", "Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji", "Türkçe", "Tarih", "Coğrafya", "Felsefe"];

    const filteredQuestions = activeFilter === "Tümü" 
        ? initialQuestions 
        : initialQuestions.filter(q => q.subject === activeFilter);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const resized = await resizeAndCompressImage(file, 800, 800, 0.6);
            setNewQuestion({ ...newQuestion, image: resized });
        }
    };

    const handleSubmit = async () => {
        if (!newQuestion.text && !newQuestion.image) return alert("Lütfen bir yazı veya fotoğraf ekle.");
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'questions'), {
            ...newQuestion, askerId: currentUser.internalId, askerName: currentUser.username, askerAvatar: currentUser.base64Avatar || currentUser.avatar, isSolved: false, comments: [], timestamp: serverTimestamp()
        });
        setShowModal(false); setNewQuestion({ text: "", subject: "Matematik", image: "" });
    };

    const handleSendComment = async (qId) => {
        const text = commentInput[qId];
        if (!text?.trim()) return;
        const qRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'questions', qId);
        await updateDoc(qRef, { comments: arrayUnion({ text, senderName: currentUser.username, senderId: currentUser.internalId, timestamp: Date.now() }) });
        setCommentInput(p => ({ ...p, [qId]: "" }));
    };

    const toggleSolved = async (qId, currentStatus) => {
        await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'questions', qId), { isSolved: !currentStatus });
    };

    return (
        <div className="max-w-4xl mx-auto flex flex-col h-full">
            
            {/* --- ÜST KISIM (HEADER & FİLTRELER) --- */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 mb-4 flex-shrink-0">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <HelpCircle className="text-orange-500"/> Soru Duvarı
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">Takıldığın soruları paylaş.</p>
                    </div>
                    {/* MOBİL UYUMLU BUTON: Mobilde sadece ikon, PC'de ikon+yazı */}
                    <button onClick={() => setShowModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white p-3 md:px-4 md:py-2 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-orange-200 transition-transform active:scale-95">
                        <Camera size={20}/> <span className="hidden md:inline">Soru Sor</span>
                    </button>
                </div>

                {/* FİLTRE BUTONLARI (Kaydırılabilir & Ferah) */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 -mx-2 px-2">
                    <div className="flex items-center text-slate-300 pr-2 border-r border-slate-100 flex-shrink-0">
                        <Filter size={18}/>
                    </div>
                    {subjects.map(sub => (
                        <button 
                            key={sub} 
                            onClick={() => setActiveFilter(sub)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 border ${activeFilter === sub ? 'bg-orange-50 text-orange-600 border-orange-200 ring-2 ring-orange-100' : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'}`}
                        >
                            {sub}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- SORU LİSTESİ --- */}
            <div className="flex-1 overflow-y-auto space-y-4 pb-24 custom-scrollbar px-1">
                {filteredQuestions.length > 0 ? filteredQuestions.map(q => (
                    <div key={q.id} className={`bg-white rounded-3xl shadow-sm border p-5 transition-all ${q.isSolved ? 'border-green-200 bg-green-50/30' : 'border-slate-100'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center text-lg border border-slate-200 flex-shrink-0">
                                    {q.askerAvatar?.startsWith('data:') ? <img src={q.askerAvatar} className="w-full h-full object-cover"/> : q.askerAvatar}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-bold text-slate-700 truncate">{q.askerName}</div>
                                    <div className="text-xs text-slate-400 flex flex-wrap gap-2 items-center mt-0.5">
                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-medium">{q.subject}</span>
                                        <span>•</span>
                                        <span>{q.timestamp ? new Date(q.timestamp.seconds * 1000).toLocaleDateString('tr-TR') : 'Az önce'}</span>
                                    </div>
                                </div>
                            </div>
                            {(q.askerId === currentUser.internalId || currentUser.isAdmin) && (
                                <button onClick={() => toggleSolved(q.id, q.isSolved)} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex-shrink-0 ${q.isSolved ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                    <CheckCircle size={14}/> <span className="hidden sm:inline">{q.isSolved ? 'Çözüldü' : 'İşaretle'}</span>
                                </button>
                            )}
                        </div>

                        <div className="mb-4">
                            <p className="text-slate-700 mb-3 whitespace-pre-wrap text-sm leading-relaxed">{q.text}</p>
                            {q.image && (
                                <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 flex justify-center cursor-pointer" onClick={() => window.open(q.image, '_blank')}>
                                    <img src={q.image} alt="Soru" className="max-h-80 w-auto object-contain" />
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto custom-scrollbar">
                                {q.comments?.length > 0 ? q.comments.map((c, i) => (
                                    <div key={i} className="flex gap-2 text-sm bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                                        <span className="font-bold text-indigo-600 flex-shrink-0 text-xs">{c.senderName}:</span>
                                        <span className="text-slate-600 break-words text-xs">{c.text}</span>
                                    </div>
                                )) : <div className="text-xs text-slate-400 italic text-center py-1">Henüz cevap yok.</div>}
                            </div>
                            <div className="flex gap-2">
                                <input type="text" placeholder="Cevap yaz..." className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500 transition-colors" value={commentInput[q.id] || ""} onChange={e => setCommentInput({...commentInput, [q.id]: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleSendComment(q.id)}/>
                                <button onClick={() => handleSendComment(q.id)} className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 shadow-md"><Send size={18}/></button>
                            </div>
                        </div>
                    </div>
                )) : <div className="flex flex-col items-center justify-center h-64 text-slate-400"><Filter size={48} className="mb-2 opacity-20"/><p>Bu ders için soru yok.</p></div>}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Soru Sor</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 bg-slate-100 rounded-full"><X size={20} className="text-slate-500"/></button>
                        </div>
                        <div className="space-y-4">
                            <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-32" placeholder="Sorunu buraya yazabilirsin..." value={newQuestion.text} onChange={e => setNewQuestion({...newQuestion, text: e.target.value})}></textarea>
                            <div className="grid grid-cols-2 gap-4">
                                <select className="bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none text-sm" value={newQuestion.subject} onChange={e => setNewQuestion({...newQuestion, subject: e.target.value})}>
                                    {subjects.filter(s => s !== "Tümü").map(s => <option key={s}>{s}</option>)}
                                </select>
                                <label className="bg-slate-100 border border-slate-200 border-dashed rounded-xl flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors text-slate-500 gap-2 text-sm p-2 text-center"><ImageIcon size={18}/> <span className="truncate">{newQuestion.image ? "Seçildi" : "Foto"}</span><input type="file" className="hidden" accept="image/*" onChange={handleImageUpload}/></label>
                            </div>
                            <button onClick={handleSubmit} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all">Paylaş</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}