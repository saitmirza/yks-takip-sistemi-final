import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, MessageCircle, Trash2, MoreVertical, Smile } from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';

export default function Chat({ currentUser, usersList, onUserClick }) {
  const [chatMode, setChatMode] = useState("public");
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef(null);

  const emojis = ["😀", "😂", "😍", "😎", "😭", "😡", "👍", "👎", "🔥", "❤️", "🎉", "💯", "🧠", "📚", "✏️", "✅", "❌", "🤔", "😱", "👋"];

  const isUserOnline = (lastSeen) => {
      if (!lastSeen) return false;
      const now = Date.now();
      const seen = lastSeen.seconds * 1000;
      return (now - seen) < 5 * 60 * 1000;
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
    });
    return () => unsubscribe();
  }, [chatMode, selectedPartner, currentUser]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, showEmoji]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const msgData = {
      text: inputText,
      senderId: currentUser.internalId,
      senderName: currentUser.username,
      senderAvatar: currentUser.base64Avatar || currentUser.avatar || "👤",
      timestamp: serverTimestamp(),
      type: chatMode,
      participants: chatMode === 'private' ? [currentUser.internalId, selectedPartner.internalId] : []
    };
    try { await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'chat_messages'), msgData); setInputText(""); setShowEmoji(false); } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => { if(confirm("Mesajı silmek istiyor musun?")) await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chat_messages', id)); };
  const addEmoji = (emoji) => setInputText(prev => prev + emoji);

  const Avatar = ({ url, size = "w-10 h-10", text="?", isOnline=false, onClick }) => {
      const isBase64 = url && url.startsWith('data:');
      return (
          <div className="relative cursor-pointer" onClick={onClick}>
              <div className={`${size} rounded-full bg-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center border border-slate-100`}>
                  {isBase64 ? <img src={url} className="w-full h-full object-cover" /> : <span className="text-xl">{url || text}</span>}
              </div>
              {isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>}
          </div>
      );
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
      <div className="w-80 bg-slate-50 border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-slate-200"><h2 className="font-bold text-slate-700 text-lg">Sohbetler</h2></div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            <button onClick={() => { setChatMode('public'); setSelectedPartner(null); }} className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all ${chatMode === 'public' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-200 text-slate-700'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${chatMode === 'public' ? 'bg-white/20' : 'bg-indigo-100 text-indigo-600'}`}><Users size={20}/></div>
                <div className="font-bold text-sm">Sınıf Grubu</div>
            </button>
            <div className="text-xs font-bold text-slate-400 uppercase mt-4 mb-2 px-2">Öğrenciler</div>
            {usersList.filter(u => u.internalId !== currentUser.internalId && !u.isAdmin).map(user => (
                <button key={user.internalId} onClick={() => { setChatMode('private'); setSelectedPartner(user); }} className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all ${selectedPartner?.internalId === user.internalId ? 'bg-white shadow-md border border-indigo-100' : 'hover:bg-slate-200'}`}>
                    <Avatar url={user.base64Avatar || user.avatar} isOnline={isUserOnline(user.lastSeen)} />
                    <div className="text-left flex-1 min-w-0">
                        <div className="font-bold text-sm text-slate-700 flex justify-between"><span className="truncate">{user.username}</span></div>
                        <div className="text-xs text-slate-400 truncate">{user.realName}</div>
                    </div>
                </button>
            ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[#efeae2] relative">
         <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
            <div className="flex items-center gap-3">
                <div className="md:hidden p-2 bg-slate-100 rounded-full"><MessageCircle size={20}/></div>
                <div>
                    <h3 className="font-bold text-slate-800 cursor-pointer hover:underline" onClick={() => selectedPartner && onUserClick && onUserClick(selectedPartner.internalId)}>
                        {chatMode === 'public' ? '🏫 Sınıf Grubu' : selectedPartner?.username}
                    </h3>
                    <p className="text-xs text-slate-500">{chatMode === 'public' ? <span>{usersList.length} Üye</span> : (isUserOnline(selectedPartner?.lastSeen) ? <span className="text-green-600 font-bold">Çevrimiçi</span> : 'Son görülme yok')}</p>
                </div>
            </div>
            <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={20}/></button>
         </div>

         <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: '400px' }}>
            {messages.map((msg) => {
                const isMe = msg.senderId === currentUser.internalId;
                return (
                    <div key={msg.id} className={`flex items-end gap-2 mb-2 ${isMe ? 'flex-row-reverse' : ''} group`}>
                        {!isMe && <Avatar url={msg.senderAvatar} size="w-8 h-8" onClick={() => onUserClick && onUserClick(msg.senderId)} />}
                        <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-sm relative leading-relaxed ${isMe ? 'bg-[#d9fdd3] text-slate-800 rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none'}`}>
                            {!isMe && chatMode === 'public' && <div className="text-[10px] font-bold text-orange-600 mb-0.5 cursor-pointer hover:underline" onClick={() => onUserClick && onUserClick(msg.senderId)}>{msg.senderName}</div>}
                            {msg.text}
                            <div className={`text-[9px] mt-1 text-right opacity-50 flex justify-end items-center gap-1`}>
                                {msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                                {isMe && <span>✓✓</span>}
                            </div>
                            {(isMe || currentUser.isAdmin) && <button onClick={() => handleDelete(msg.id)} className="absolute -top-2 -right-2 bg-white text-red-500 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md border border-slate-100"><Trash2 size={12}/></button>}
                        </div>
                    </div>
                )
            })}
            <div ref={messagesEndRef} />
         </div>

         <form onSubmit={handleSend} className="p-3 bg-[#f0f2f5] flex gap-2 items-center relative">
             <button type="button" onClick={() => setShowEmoji(!showEmoji)} className={`p-3 rounded-full transition-colors ${showEmoji ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-200'}`}><Smile size={24} /></button>
             {showEmoji && (
                 <div className="absolute bottom-20 left-4 bg-white p-3 rounded-2xl shadow-2xl border border-slate-200 grid grid-cols-5 gap-2 animate-in slide-in-from-bottom-5 z-20 w-64">
                     {emojis.map(e => <button key={e} type="button" onClick={() => addEmoji(e)} className="text-2xl hover:bg-slate-100 p-2 rounded-lg transition-colors">{e}</button>)}
                 </div>
             )}
             <input type="text" className="flex-1 bg-white border-0 rounded-xl px-4 py-3 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-sm placeholder-slate-400" placeholder="Bir mesaj yazın" value={inputText} onChange={(e) => setInputText(e.target.value)}/>
             <button type="submit" className="text-slate-500 hover:bg-slate-200 p-3 rounded-full transition-colors"><Send size={24} /></button>
         </form>
      </div>
    </div>
  );
}