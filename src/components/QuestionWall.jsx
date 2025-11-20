import React, { useState, useEffect } from 'react';
import { Camera, Send, MessageSquare, CheckCircle, HelpCircle, X, Image as ImageIcon } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, onSnapshot, serverTimestamp, query, orderBy, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { resizeAndCompressImage } from '../utils/helpers';

export default function QuestionWall({ currentUser }) {
    const [questions, setQuestions] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newQuestion, setNewQuestion] = useState({ text: "", subject: "Matematik", image: "" });
    const [commentInput, setCommentInput] = useState({}); // Her soru için ayrı yorum inputu

    // Soruları Çek
    useEffect(() => {
        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'questions'), orderBy('timestamp', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const resized = await resizeAndCompressImage(file, 800, 800, 0.6); // Biraz daha büyük kalite
            setNewQuestion({ ...newQuestion, image: resized });
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
        if (!text?.trim()) return;

        const commentData = {
            text,
            senderName: currentUser.username,
            senderId: currentUser.internalId,
            timestamp: Date.now()
        };

        const qRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'questions', qId);
        await updateDoc(qRef, {
            comments: arrayUnion(commentData)
        });

        setCommentInput(p => ({ ...p, [qId]: "" }));
    };

    const toggleSolved = async (qId, currentStatus) => {
        await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'questions', qId), {
            isSolved: !currentStatus
        });
    };

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] flex flex-col">
            {/* Üst Başlık ve Buton */}
            <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <HelpCircle className="text-orange-500"/> Soru Duvarı
                    </h2>
                    <p className="text-xs text-slate-500">Yapamadığın soruları paylaş, birlikte çözelim.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95">
                    <Camera size={18}/> Soru Sor
                </button>
            </div>

            {/* Soru Listesi */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-2 pb-20">
                {questions.map(q => (
                    <div key={q.id} className={`bg-white rounded-3xl shadow-sm border p-6 transition-all ${q.isSolved ? 'border-green-200 bg-green-50/30' : 'border-slate-100'}`}>
                        {/* Soru Başlığı */}
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center text-lg">
                                    {q.askerAvatar?.startsWith('data:') ? <img src={q.askerAvatar} className="w-full h-full object-cover"/> : q.askerAvatar}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-700">{q.askerName}</div>
                                    <div className="text-xs text-slate-400 flex gap-2 items-center">
                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-medium">{q.subject}</span>
                                        <span>•</span>
                                        <span>{new Date(q.timestamp?.seconds * 1000).toLocaleDateString('tr-TR')}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Çözüldü İşaretleme (Sadece soran kişi veya Admin) */}
                            {(q.askerId === currentUser.internalId || currentUser.isAdmin) && (
                                <button 
                                    onClick={() => toggleSolved(q.id, q.isSolved)}
                                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-colors ${q.isSolved ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                >
                                    <CheckCircle size={14}/> {q.isSolved ? 'Çözüldü' : 'Çözülmedi'}
                                </button>
                            )}
                        </div>

                        {/* Soru İçeriği */}
                        <div className="mb-4">
                            <p className="text-slate-700 mb-3">{q.text}</p>
                            {q.image && (
                                <div className="rounded-2xl overflow-hidden border border-slate-100 max-h-96 bg-slate-50 flex justify-center">
                                    <img src={q.image} alt="Soru" className="max-w-full object-contain" />
                                </div>
                            )}
                        </div>

                        {/* Yorumlar */}
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <div className="space-y-3 mb-4 max-h-40 overflow-y-auto custom-scrollbar">
                                {q.comments?.length > 0 ? q.comments.map((c, i) => (
                                    <div key={i} className="flex gap-2 text-sm">
                                        <span className="font-bold text-slate-700">{c.senderName}:</span>
                                        <span className="text-slate-600">{c.text}</span>
                                    </div>
                                )) : <div className="text-xs text-slate-400 italic">Henüz yorum yok. İlk çözen sen ol!</div>}
                            </div>

                            {/* Yorum Yaz */}
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Cevabını yaz..." 
                                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500"
                                    value={commentInput[q.id] || ""}
                                    onChange={e => setCommentInput({...commentInput, [q.id]: e.target.value})}
                                    onKeyDown={e => e.key === 'Enter' && handleSendComment(q.id)}
                                />
                                <button onClick={() => handleSendComment(q.id)} className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700"><Send size={16}/></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Soru Sorma Modalı */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Yeni Soru Sor</h3>
                            <button onClick={() => setShowModal(false)}><X className="text-slate-400"/></button>
                        </div>
                        
                        <div className="space-y-4">
                            <textarea 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-32"
                                placeholder="Sorunu buraya yazabilirsin..."
                                value={newQuestion.text}
                                onChange={e => setNewQuestion({...newQuestion, text: e.target.value})}
                            ></textarea>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <select 
                                    className="bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none"
                                    value={newQuestion.subject}
                                    onChange={e => setNewQuestion({...newQuestion, subject: e.target.value})}
                                >
                                    <option>Matematik</option>
                                    <option>Geometri</option>
                                    <option>Fizik</option>
                                    <option>Kimya</option>
                                    <option>Biyoloji</option>
                                    <option>Türkçe</option>
                                    <option>Tarih</option>
                                    <option>Coğrafya</option>
                                </select>
                                
                                <label className="bg-slate-100 border border-slate-200 border-dashed rounded-xl flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors text-slate-500 gap-2 text-sm">
                                    <ImageIcon size={18}/> 
                                    {newQuestion.image ? "Fotoğraf Seçildi" : "Fotoğraf Ekle"}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload}/>
                                </label>
                            </div>

                            <button onClick={handleSubmit} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all">
                                Paylaş
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}