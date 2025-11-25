import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, MessageCircle, Trash2, MoreVertical, Smile, ArrowLeft, Reply, X, Image as ImageIcon, Paperclip, CheckCheck } from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { resizeAndCompressImage } from '../utils/helpers';

export default function Chat({ currentUser, usersList, onUserClick }) {
  const [chatMode, setChatMode] = useState("public");
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showChatScreen, setShowChatScreen] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [sortedUsers, setSortedUsers] = useState([]);
  const messagesEndRef = useRef(null);

  const emojis = ["😀", "😂", "🥹", "😍", "😎", "🤔", "🫡", "😭", "😡", "🤡", "🥳", "🤯", "👍", "👎", "👋", "🙏", "💪", "🔥", "✨", "💯", "❤️", "💔"];

  const getLastSeenLabel = (lastSeen) => {
      if (!lastSeen) return "";
      const diff = Date.now() - (lastSeen.seconds * 1000);
      const minutes = Math.floor(diff / 60000);
      if (minutes < 2) return "Çevrimiçi";
      if (minutes < 60) return `${minutes} dk`;
      const hours = Math.floor(diff / 3600000);
      if (hours < 24) return `${hours} sa`;
      return `${Math.floor(diff / 86400000)} gün`;
  };

  const isOnline = (lastSeen) => {
      if (!lastSeen) return false;
      return (Date.now() - lastSeen.seconds * 1000) < 2 * 60 * 1000;
  };

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'chat_messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMsgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      let filtered = [];
      if (chatMode === 'public') filtered = allMsgs.filter(m => m.type === 'public');
      else if (chatMode === 'private' && selectedPartner) {
        filtered = allMsgs.filter(m => m.type === 'private' && m.participants.includes(currentUser.internalId) && m.participants.includes(selectedPartner.internalId));
      }
      setMessages(filtered);

      const usersWithMeta = usersList
        .filter(u => u.internalId !== currentUser.internalId && !u.isAdmin)
        .map(user => {
            const lastMsg = allMsgs.filter(m => m.type === 'private' && m.participants.includes(currentUser.internalId) && m.participants.includes(user.internalId)).pop();
            return { ...user, lastMsgTime: lastMsg ? (lastMsg.timestamp?.seconds || 0) : 0, lastMsgText: lastMsg ? (lastMsg.text.startsWith('data:image') ? '📷 Fotoğraf' : lastMsg.text) : '' };
        });
      usersWithMeta.sort((a, b) => b.lastMsgTime - a.lastMsgTime);
      setSortedUsers(usersWithMeta);
    });
    return () => unsubscribe();
  }, [chatMode, selectedPartner, currentUser, usersList]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, showEmoji, showChatScreen, replyTo]);

  const handleSelectChat = (mode, partner) => { setChatMode(mode); setSelectedPartner(partner); setShowChatScreen(true); };
  const handleBackToList = () => { setShowChatScreen(false); };
  
  const handleSend = async (e) => {
    e.preventDefault(); if (!inputText.trim()) return;
    sendMessage(inputText);
  };

  const handleImageUpload = async (e) => {
      const file = e.target.files[0];
      if (file) { const resized = await resizeAndCompressImage(file, 600, 600, 0.7); sendMessage(resized); }
  };

  const sendMessage = async (content) => {
    const msgData = { 
        text: content, 
        senderId: currentUser.internalId, 
        senderName: currentUser.username, 
        senderAvatar: currentUser.base64Avatar || currentUser.avatar || "👤", 
        timestamp: serverTimestamp(), 
        type: chatMode, 
        participants: chatMode === 'private' ? [currentUser.internalId, selectedPartner.internalId] : [], 
        replyTo: replyTo 
    };
    try { await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'chat_messages'), msgData); setInputText(""); setShowEmoji(false); setReplyTo(null); } catch (err) { console.error(err); }
  };
  
  const handleDelete = async (id) => { if(confirm("Mesajı silmek istiyor musun?")) await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chat_messages', id)); };
  const addEmoji = (emoji) => setInputText(prev => prev + emoji);
  const formatDateLabel = (timestamp) => { if (!timestamp) return ""; const date = new Date(timestamp.seconds * 1000); const today = new Date(); return date.toDateString() === today.toDateString() ? "Bugün" : date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }); };
  const isImageUrl = (url) => (url.startsWith('data:image') || url.match(/\.(jpeg|jpg|gif|png)$/) != null);

  return (
    <div className="flex h-[calc(100dvh-9rem)] md:h-[calc(100vh-6rem)] bg-white dark:bg-slate-900/90 dark:backdrop-blur-md rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative transition-colors">
      
      {/* SOL PANEL */}
      <div className={`w-full md:w-80 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700 flex flex-col ${showChatScreen ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700"><h2 className="font-bold text-slate-700 dark:text-gray-200 text-lg">Sohbetler</h2></div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            <button onClick={() => handleSelectChat('public', null)} className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all ${chatMode === 'public' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${chatMode === 'public' ? 'bg-white/20' : 'bg-indigo-100 text-indigo-600'}`}><Users size={24}/></div>
                <div className="text-left flex-1"><div className="font-bold text-sm">Sınıf Grubu</div><div className="text-xs opacity-70 truncate">Genel sohbet</div></div>
            </button>
            <div className="text-[10px] font-bold text-slate-400 uppercase mt-4 mb-1 px-2">Son Mesajlar</div>
            {sortedUsers.map(user => (
                <button key={user.internalId} onClick={() => handleSelectChat('private', user)} className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all ${selectedPartner?.internalId === user.internalId ? 'bg-white dark:bg-slate-600 shadow-md border border-indigo-100 dark:border-slate-500' : 'hover:bg-slate-200 dark:hover:bg-slate-700/50'}`}>
                    <div className="relative"><div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden flex items-center justify-center border border-slate-100 dark:border-slate-500">{user.base64Avatar ? <img src={user.base64Avatar} className="w-full h-full object-cover" /> : <span className="text-xl">{user.avatar}</span>}</div>{isOnline(user.lastSeen) && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>}</div>
                    <div className="text-left flex-1 min-w-0"><div className="flex justify-between items-center"><span className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate">{user.username}</span><span className="text-[10px] text-slate-400">{user.lastMsgTime > 0 ? new Date(user.lastMsgTime * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}</span></div><div className="text-xs text-slate-400 truncate mt-0.5">{user.lastMsgText}</div></div>
                </button>
            ))}
        </div>
      </div>

      {/* SAĞ PANEL */}
      <div className={`flex-1 flex flex-col relative ${!showChatScreen ? 'hidden md:flex' : 'flex'} bg-[#efeae2] dark:bg-[#0b141a]`}>
         <div className="p-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm z-10">
            <div className="flex items-center gap-2">
                <button onClick={handleBackToList} className="md:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><ArrowLeft size={20}/></button>
                <div className="flex items-center gap-3 overflow-hidden">
                    {chatMode === 'private' && selectedPartner && <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200">{selectedPartner.base64Avatar ? <img src={selectedPartner.base64Avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xl">{selectedPartner.avatar}</div>}</div>}
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white cursor-pointer hover:underline truncate max-w-[150px] sm:max-w-md" onClick={() => selectedPartner && onUserClick && onUserClick(selectedPartner.internalId)}>{chatMode === 'public' ? '🏫 Sınıf Grubu' : selectedPartner?.username}</h3>
                        <p className={`text-xs ${isOnline(selectedPartner?.lastSeen) && chatMode === 'private' ? 'text-green-600 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>{chatMode === 'public' ? <span>{usersList.length} Üye</span> : (isOnline(selectedPartner?.lastSeen) ? 'Çevrimiçi' : getLastSeenLabel(selectedPartner?.lastSeen))}</p>
                    </div>
                </div>
            </div>
            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200"><MoreVertical size={20}/></button>
         </div>

         {/* MESAJ ALANI - ARKA PLAN DÜZELTİLDİ */}
         <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar" 
              style={{ 
                  backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', 
                  backgroundSize: '400px',
                  opacity: 1 
              }}>
            {messages.map((msg, index) => {
                const isMe = msg.senderId === currentUser.internalId;
                const prevMsg = messages[index - 1];
                const showDate = !prevMsg || formatDateLabel(msg.timestamp) !== formatDateLabel(prevMsg.timestamp);
                return (
                    <div key={msg.id}>
                        {showDate && <div className="flex justify-center my-4"><span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm uppercase tracking-wider border border-slate-300 dark:border-slate-700">{formatDateLabel(msg.timestamp)}</span></div>}
                        <div className={`flex items-end gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''} group`}>
                            {!isMe && <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden flex items-center justify-center border border-slate-100 dark:border-slate-600 cursor-pointer" onClick={() => onUserClick && onUserClick(msg.senderId)}>{msg.senderAvatar?.startsWith('data:') ? <img src={msg.senderAvatar} className="w-full h-full object-cover" /> : msg.senderAvatar}</div>}
                            
                            {/* MESAJ BALONU - RENKLER SABİTLENDİ */}
                            <div className={`max-w-[85%] md:max-w-[75%] px-3 py-2 rounded-2xl text-sm shadow-sm relative leading-relaxed 
                                ${isMe 
                                    ? 'bg-[#005c4b] text-white rounded-tr-none' 
                                    : 'bg-white dark:bg-[#1f2937] text-slate-800 dark:text-white rounded-tl-none'
                                }`}>
                                
                                {!isMe && chatMode === 'public' && <div className="text-[10px] font-bold text-orange-600 dark:text-orange-400 mb-0.5 cursor-pointer hover:underline" onClick={() => onUserClick && onUserClick(msg.senderId)}>{msg.senderName}</div>}
                                {msg.replyTo && <div className="bg-black/10 dark:bg-black/30 border-l-4 border-indigo-500 p-1.5 rounded mb-1 text-[10px]"><div className="font-bold opacity-80">{msg.replyTo.senderName}</div><div className="truncate">{msg.replyTo.text}</div></div>}
                                
                                {isImageUrl(msg.text) ? <img src={msg.text} className="rounded-lg max-w-full h-auto cursor-pointer mt-1" onClick={() => window.open(msg.text, '_blank')} /> : msg.text}
                                
                                <div className={`text-[9px] mt-1 text-right opacity-60 flex justify-end items-center gap-1 ${isMe ? 'text-green-100' : 'text-slate-400'}`}>
                                    {msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                                    {isMe && <CheckCheck size={12} className="text-blue-200"/>}
                                </div>
                                <div className={`absolute top-1 ${isMe ? '-left-16' : '-right-16'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-1`}>
                                    <button onClick={() => setReplyTo(msg)} className="p-1.5 bg-white dark:bg-slate-700 rounded-full shadow text-slate-500 dark:text-slate-300"><Reply size={14}/></button>
                                    {(isMe || currentUser.isAdmin) && <button onClick={() => handleDelete(msg.id)} className="p-1.5 bg-white dark:bg-slate-700 rounded-full shadow text-red-500"><Trash2 size={14}/></button>}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
            <div ref={messagesEndRef} />
         </div>

         {replyTo && <div className="bg-slate-100 dark:bg-slate-800 p-2 flex justify-between items-center border-t border-slate-200 dark:border-slate-700"><div className="text-xs border-l-4 border-indigo-500 pl-2"><div className="font-bold text-indigo-600 dark:text-indigo-400">Cevap: {replyTo.senderName}</div><div className="text-slate-500 dark:text-slate-400 truncate max-w-xs">{replyTo.text}</div></div><button onClick={() => setReplyTo(null)}><X size={16} className="text-slate-400"/></button></div>}

         <form onSubmit={handleSend} className="p-2 bg-[#f0f2f5] dark:bg-[#1f2937] flex gap-2 items-center relative safe-area-bottom pb-4 md:pb-2">
             <label className="p-2 rounded-full transition-colors text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"><Paperclip size={22} /><input type="file" className="hidden" accept="image/*" onChange={handleImageUpload}/></label>
             <button type="button" onClick={() => setShowEmoji(!showEmoji)} className="p-2 rounded-full transition-colors text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"><Smile size={24} /></button>
             {showEmoji && <div className="absolute bottom-16 left-10 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-600 grid grid-cols-6 gap-2 animate-in slide-in-from-bottom-5 z-20 w-80 max-h-60 overflow-y-auto custom-scrollbar">{emojis.map(e => <button key={e} type="button" onClick={() => addEmoji(e)} className="text-2xl hover:bg-slate-100 dark:hover:bg-slate-700 p-1 rounded-lg transition-colors">{e}</button>)}</div>}
             <input type="text" className="flex-1 bg-white dark:bg-slate-700 dark:text-white border-0 rounded-xl px-4 py-3 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-sm placeholder-slate-400 text-sm" placeholder="Mesaj..." value={inputText} onChange={(e) => setInputText(e.target.value)}/>
             <button type="submit" className="text-white bg-indigo-600 hover:bg-indigo-700 p-3 rounded-full transition-colors shadow-md"><Send size={20} /></button>
         </form>
      </div>
    </div>
  );
}