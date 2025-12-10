import React, { useState, useEffect } from 'react';
import { MessageSquare, Heart, MessageCircle, Send, Trash2, Shield, CheckCircle, Plus, X, Filter, BarChart2 } from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';

export default function Forum({ currentUser }) {
    const [activeTab, setActiveTab] = useState('school'); // 'school' | 'class'
    const [posts, setPosts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newPost, setNewPost] = useState({ title: '', content: '', type: 'discussion', options: ['', ''] });
    const [expandedComments, setExpandedComments] = useState({}); 
    const [commentInputs, setCommentInputs] = useState({});

    // ADMIN ÖZEL: Sınıf Seçimi
    const [adminSelectedClass, setAdminSelectedClass] = useState("12-A");
    const classSections = ["12-A", "12-B", "12-C", "12-D", "12-E", "12-F", "Mezun"];

    // VERİ ÇEKME
    useEffect(() => {
        let q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'forum_posts'), orderBy('timestamp', 'desc'));
        
        const unsub = onSnapshot(q, (snap) => {
            let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            
            if (activeTab === 'class') {
                const targetClass = currentUser.isAdmin ? adminSelectedClass : currentUser.classSection;
                data = data.filter(p => p.target === 'class' && p.classSection === targetClass);
            } else {
                data = data.filter(p => p.target === 'school');
            }
            setPosts(data);
        });
        return () => unsub();
    }, [activeTab, currentUser, adminSelectedClass]);

    // GÖNDERİ OLUŞTURMA
    const handleCreatePost = async () => {
        if (!newPost.title || !newPost.content) return alert("Başlık ve içerik giriniz.");
        if (newPost.type === 'poll' && newPost.options.some(o => !o.trim())) return alert("Anket seçeneklerini doldurun.");

        const targetClassSection = currentUser.isAdmin && activeTab === 'class' ? adminSelectedClass : currentUser.classSection;

        const postData = {
            userId: currentUser.internalId,
            username: currentUser.username,
            avatar: currentUser.base64Avatar || currentUser.avatar,
            classSection: targetClassSection, 
            isAdmin: currentUser.isAdmin || false,
            title: newPost.title,
            content: newPost.content,
            type: newPost.type,
            target: activeTab,
            likes: [],
            comments: [],
            timestamp: serverTimestamp()
        };

        if (newPost.type === 'poll') {
            postData.pollOptions = newPost.options.map(opt => ({ text: opt, votes: [] }));
        }

        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'forum_posts'), postData);
        setShowModal(false);
        setNewPost({ title: '', content: '', type: 'discussion', options: ['', ''] });
    };

    // İŞLEMLER
    const handleDelete = async (id) => { if(confirm("Silmek istediğine emin misin?")) await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'forum_posts', id)); };
    
    const toggleLike = async (post) => {
        const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'forum_posts', post.id);
        if (post.likes.includes(currentUser.internalId)) {
            await updateDoc(ref, { likes: arrayRemove(currentUser.internalId) });
        } else {
            await updateDoc(ref, { likes: arrayUnion(currentUser.internalId) });
        }
    };

    const handleVote = async (post, optionIdx) => {
        const hasVoted = post.pollOptions.some(opt => opt.votes.includes(currentUser.internalId));
        if (hasVoted) return alert("Zaten oy kullandınız.");
        const newOptions = [...post.pollOptions];
        newOptions[optionIdx].votes.push(currentUser.internalId);
        await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'forum_posts', post.id), { pollOptions: newOptions });
    };

    const sendComment = async (postId) => {
        const text = commentInputs[postId];
        if (!text?.trim()) return;
        const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'forum_posts', postId);
        await updateDoc(ref, { comments: arrayUnion({ userId: currentUser.internalId, username: currentUser.username, text, timestamp: Date.now() }) });
        setCommentInputs(p => ({ ...p, [postId]: "" }));
    };

    return (
        <div className="w-full pb-24">
            
            {/* ÜST BAR (GLASS FIX) */}
            <div className="flex flex-col md:flex-row items-center justify-between glass-box p-4 rounded-3xl shadow-sm mb-6 sticky top-0 z-30 transition-colors gap-4">
                
                {/* SOL: Sekmeler ve Admin Filtresi */}
                <div className="flex bg-black/20 p-1 rounded-xl w-full md:w-auto">
                    <button onClick={() => setActiveTab('school')} className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'school' ? 'bg-white text-indigo-900 shadow' : 'text-slate-400 hover:text-white'}`}>
                        🏫 Okul Meydanı
                    </button>
                    
                    {activeTab === 'class' && currentUser.isAdmin ? (
                        <div className="flex items-center bg-white shadow rounded-lg px-2 ml-1 flex-1 md:flex-none">
                            <Filter size={14} className="text-indigo-600 mr-2 flex-shrink-0"/>
                            <select 
                                value={adminSelectedClass} 
                                onChange={(e) => setAdminSelectedClass(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm font-bold text-indigo-900 py-2 cursor-pointer w-full"
                            >
                                {classSections.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
                            </select>
                        </div>
                    ) : (
                        <button onClick={() => setActiveTab('class')} className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'class' ? 'bg-white text-indigo-900 shadow' : 'text-slate-400 hover:text-white'}`}>
                            🎓 {currentUser.classSection || "Sınıfım"}
                        </button>
                    )}
                </div>

                {/* SAĞ: Konu Aç Butonu */}
                <button onClick={() => setShowModal(true)} className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95">
                    <Plus size={18}/> <span className="hidden sm:inline">Yeni Konu</span><span className="sm:hidden">Paylaş</span>
                </button>
            </div>

            {/* GÖNDERİ LİSTESİ (GLASS FIX) */}
            <div className="space-y-6">
                {posts.map(post => {
                    const isLiked = post.likes?.includes(currentUser.internalId);
                    const totalVotes = post.pollOptions?.reduce((acc, opt) => acc + opt.votes.length, 0) || 0;
                    const userVoted = post.pollOptions?.some(opt => opt.votes.includes(currentUser.internalId));

                    return (
                        <div key={post.id} className="glass-box rounded-3xl p-6 shadow-sm transition-colors">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-lg border border-indigo-500/30">{post.avatar}</div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white text-sm">{post.username}</span>
                                            {post.isAdmin && <span className="bg-red-500/20 text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 border border-red-500/30"><Shield size={10}/> ADMIN</span>}
                                            <span className="text-xs text-slate-400">• {post.timestamp ? new Date(post.timestamp.seconds * 1000).toLocaleDateString() : '...'}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-medium">
                                            {post.target === 'school' ? 'Tüm Okul' : post.classSection}
                                        </div>
                                    </div>
                                </div>
                                {(currentUser.internalId === post.userId || currentUser.isAdmin) && (
                                    <button onClick={() => handleDelete(post.id)} className="text-slate-500 hover:text-red-500 p-2 rounded-full hover:bg-white/10 transition-colors"><Trash2 size={18}/></button>
                                )}
                            </div>

                            {/* İçerik */}
                            <h3 className="text-lg font-bold text-white mb-2">{post.title}</h3>
                            <p className="text-sm text-slate-300 leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>

                            {/* ANKET ALANI (GLASS FIX) */}
                            {post.type === 'poll' && (
                                <div className="space-y-2 mb-4 bg-black/20 p-4 rounded-2xl border border-white/10">
                                    {post.pollOptions.map((opt, idx) => {
                                        const votes = opt.votes.length;
                                        const percent = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
                                        const isSelected = opt.votes.includes(currentUser.internalId);
                                        
                                        return (
                                            <div key={idx} onClick={() => !userVoted && handleVote(post, idx)} className={`relative h-10 rounded-xl overflow-hidden cursor-pointer transition-all border ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-white/10 hover:border-indigo-400/50'}`}>
                                                {/* Progress Bar */}
                                                <div className="absolute top-0 left-0 bottom-0 bg-indigo-500/20 transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                                                
                                                {/* Text Content */}
                                                <div className="absolute inset-0 flex justify-between items-center px-4 z-10">
                                                    <span className="text-sm font-bold text-white flex items-center gap-2">
                                                        {opt.text} {isSelected && <CheckCircle size={14} className="text-indigo-400"/>}
                                                    </span>
                                                    {totalVotes > 0 && <span className="text-xs font-bold text-slate-300">%{percent} ({votes})</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className="text-right text-[10px] text-slate-500 font-bold">{totalVotes} Oy Kullanıldı</div>
                                </div>
                            )}

                            {/* Action Bar */}
                            <div className="flex gap-6 border-t border-white/10 pt-4">
                                <button onClick={() => toggleLike(post)} className={`flex items-center gap-2 text-sm font-bold transition-colors ${isLiked ? 'text-red-500' : 'text-slate-400 hover:text-slate-200'}`}>
                                    <Heart size={20} fill={isLiked ? "currentColor" : "none"}/> {post.likes?.length || 0}
                                </button>
                                <button onClick={() => setExpandedComments(p => ({...p, [post.id]: !p[post.id]}))} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-200 transition-colors">
                                    <MessageCircle size={20}/> {post.comments?.length || 0}
                                </button>
                            </div>

                            {/* Yorumlar */}
                            {expandedComments[post.id] && (
                                <div className="mt-4 animate-in slide-in-from-top-2 pt-4 border-t border-white/10">
                                    <div className="space-y-3 mb-4 max-h-60 overflow-y-auto custom-scrollbar">
                                        {post.comments?.map((c, i) => (
                                            <div key={i} className="flex gap-2 text-sm bg-white/5 p-2 rounded-lg">
                                                <span className="font-bold text-white flex-shrink-0 text-xs">{c.username}:</span>
                                                <span className="text-slate-300 text-xs">{c.text}</span>
                                            </div>
                                        ))}
                                        {(!post.comments || post.comments.length === 0) && <p className="text-xs text-slate-500 italic">Henüz yorum yok.</p>}
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            placeholder="Yorum yaz..." 
                                            className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none text-white focus:border-indigo-500 transition-colors placeholder-slate-500"
                                            value={commentInputs[post.id] || ""}
                                            onChange={e => setCommentInputs({...commentInputs, [post.id]: e.target.value})}
                                            onKeyDown={e => e.key === 'Enter' && sendComment(post.id)}
                                        />
                                        <button onClick={() => sendComment(post.id)} className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-colors"><Send size={18}/></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                
                {posts.length === 0 && (
                    <div className="text-center py-20 text-slate-500 glass-box rounded-3xl">
                        <MessageSquare size={64} className="mx-auto mb-4 opacity-20"/>
                        <p className="text-lg font-bold opacity-70">Sessizlik...</p>
                        <p className="text-sm opacity-50">Burada henüz kimse konuşmamış.</p>
                    </div>
                )}
            </div>

            {/* MODAL: YENİ GÖNDERİ (GLASS FIX) */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
                    <div className="glass-box rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">
                                {activeTab === 'school' ? 'Okul Duyurusu' : `${currentUser.isAdmin ? adminSelectedClass : currentUser.classSection} İçin Paylaş`}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} className="text-slate-400 hover:text-white"/></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
                                <button onClick={() => setNewPost({...newPost, type: 'discussion'})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newPost.type === 'discussion' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>💬 Tartışma</button>
                                <button onClick={() => setNewPost({...newPost, type: 'poll'})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newPost.type === 'poll' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>📊 Anket</button>
                            </div>

                            <input 
                                type="text" 
                                placeholder="Başlık" 
                                className="w-full p-3 bg-black/30 border border-white/10 rounded-xl outline-none text-sm font-bold text-white focus:border-indigo-500 transition-colors placeholder-slate-500" 
                                value={newPost.title} 
                                onChange={e => setNewPost({...newPost, title: e.target.value})}
                            />
                            
                            <textarea 
                                placeholder={newPost.type === 'poll' ? "Anket sorusu veya açıklaması..." : "Ne düşünüyorsun?"} 
                                className="w-full p-3 bg-black/30 border border-white/10 rounded-xl outline-none text-sm resize-none h-32 text-white focus:border-indigo-500 transition-colors placeholder-slate-500" 
                                value={newPost.content} 
                                onChange={e => setNewPost({...newPost, content: e.target.value})}
                            ></textarea>

                            {newPost.type === 'poll' && (
                                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar bg-black/20 p-3 rounded-xl border border-white/5">
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Seçenekler</label>
                                    {newPost.options.map((opt, i) => (
                                        <div key={i} className="flex gap-2">
                                            <input 
                                                type="text" 
                                                placeholder={`Seçenek ${i+1}`} 
                                                className="flex-1 p-2 bg-black/40 border border-white/10 rounded-lg outline-none text-sm text-white focus:border-indigo-500" 
                                                value={opt} 
                                                onChange={e => {
                                                    const newOpts = [...newPost.options]; newOpts[i] = e.target.value; setNewPost({...newPost, options: newOpts});
                                                }}
                                            />
                                            {i > 1 && <button onClick={() => setNewPost(p => ({...p, options: p.options.filter((_, idx) => idx !== i)}))} className="text-red-500 hover:bg-red-500/20 p-2 rounded-lg"><Trash2 size={18}/></button>}
                                        </div>
                                    ))}
                                    <button onClick={() => setNewPost(p => ({...p, options: [...p.options, ""]}))} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 mt-2"><Plus size={14}/> Seçenek Ekle</button>
                                </div>
                            )}

                            <button onClick={handleCreatePost} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-transform active:scale-95">Paylaş</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}