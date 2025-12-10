import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, MessageCircle, Trash2, MoreVertical, Smile, ArrowLeft, Reply, X, Image as ImageIcon, Paperclip, CheckCheck, Mic, StopCircle, Settings, Palette } from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { resizeAndCompressImage } from '../utils/helpers';

const WALLPAPERS = [
    { id: 'default', url: 'https://i.pinimg.com/originals/97/c0/07/97c00759d90d786d9b6096d274ad3e07.png', name: 'WhatsApp Klasik' },
    { id: 'dark_gradient', url: 'https://images.pexels.com/photos/4004375/pexels-photo-4004375.jpeg', name: 'Karanlık Sade' },
    { id: 'calm_nature', url: 'https://images.pexels.com/photos/34968719/pexels-photo-34968719.jpeg', name: 'Sakin Doğa' },
    { id: 'abstract_shapes', url: 'https://images.pexels.com/photos/9404662/pexels-photo-9404662.jpeg', name: 'Neon Soyut' },
    { id: 'minimal_grey', url: 'https://images.pexels.com/photos/1368382/pexels-photo-1368382.jpeg', name: 'Kamp Ateşi' },
    { id: 'warm_sunset', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80', name: 'Sıcak Kumsal' },
];

export default function Chat({ currentUser, usersList, onUserClick }) {
  const [adminSelectedClass, setAdminSelectedClass] = useState("12-A");
  const userClass = currentUser.isAdmin ? adminSelectedClass : (currentUser.classSection || "12-D");
  const allClassSections = ["12-A", "12-B", "12-C", "12-D", "12-E", "12-F", "Mezun"];

  const [chatMode, setChatMode] = useState("public");
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showChatScreen, setShowChatScreen] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [currentWallpaper, setCurrentWallpaper] = useState(() => localStorage.getItem('chat_wallpaper') || WALLPAPERS[0].url);

  const emojis = ["😀", "😂", "🥹", "😍", "😎", "🤔", "🫡", "😭", "😡", "🤡", "🥳", "🤯", "👍", "👎", "👋", "🙏", "💪", "🔥", "✨", "💯", "❤️", "💔"];
  const getLastSeenLabel = (lastSeen) => { if (!lastSeen) return ""; const diff = Date.now() - (lastSeen.seconds * 1000); const minutes = Math.floor(diff / 60000); if (minutes < 2) return "Çevrimiçi"; if (minutes < 60) return `${minutes} dk`; const hours = Math.floor(diff / 3600000); if (hours < 24) return `${hours} sa`; return `${Math.floor(diff / 86400000)} gün`; };
  const isOnline = (lastSeen) => { if (!lastSeen) return false; return (Date.now() - lastSeen.seconds * 1000) < 2 * 60 * 1000; };

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'chat_messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMsgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      let filtered = [];
      if (chatMode === 'public') {
          filtered = allMsgs.filter(m => m.type === 'public' && (m.classSection === userClass || (!m.classSection && userClass === '12-D')));
      } else if (chatMode === 'private' && selectedPartner) {
        filtered = allMsgs.filter(m => m.type === 'private' && m.participants.includes(currentUser.internalId) && m.participants.includes(selectedPartner.internalId));
      }
      setMessages(filtered);
    });
    return () => unsubscribe();
  }, [chatMode, selectedPartner, currentUser, userClass]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, showEmoji, showChatScreen, replyTo, isRecording]);

  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const recorder = new MediaRecorder(stream);
          setMediaRecorder(recorder);
          const chunks = [];
          recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
          recorder.onstop = () => {
              const blob = new Blob(chunks, { type: 'audio/webm' });
              const reader = new FileReader();
              reader.readAsDataURL(blob);
              reader.onloadend = () => { sendMessage(reader.result, 'audio'); };
          };
          recorder.start();
          setIsRecording(true);
      } catch (err) { alert("Mikrofona erişilemedi."); }
  };

  const stopRecording = () => {
      if (mediaRecorder && isRecording) {
          mediaRecorder.stop();
          setIsRecording(false);
          mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
  };

  const handleSelectChat = (mode, partner) => { setChatMode(mode); setSelectedPartner(partner); setShowChatScreen(true); };
  
  const sendMessage = async (content, type = 'text') => {
    const msgData = { 
        text: content, msgType: type, senderId: currentUser.internalId, 
        senderName: currentUser.username, senderAvatar: currentUser.base64Avatar || currentUser.avatar || "👤", 
        timestamp: serverTimestamp(), type: chatMode, classSection: userClass, 
        participants: chatMode === 'private' ? [currentUser.internalId, selectedPartner.internalId] : [], replyTo: replyTo 
    };
    try { await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'chat_messages'), msgData); setInputText(""); setShowEmoji(false); setReplyTo(null); } catch (err) { console.error(err); }
  };

  const handleSendText = (e) => { e.preventDefault(); if(!inputText.trim()) return; sendMessage(inputText, 'text'); };
  const handleImageUpload = async (e) => { const file = e.target.files[0]; if (file) { const resized = await resizeAndCompressImage(file, 600, 600, 0.7); sendMessage(resized, 'image'); } };
  const handleDelete = async (id) => { if(confirm("Mesajı silmek istiyor musun?")) await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chat_messages', id)); };
  const formatDateLabel = (timestamp) => { if (!timestamp) return ""; const date = new Date(timestamp.seconds * 1000); const today = new Date(); return date.toDateString() === today.toDateString() ? "Bugün" : date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }); };
  const changeWallpaper = (url) => { setCurrentWallpaper(url); localStorage.setItem('chat_wallpaper', url); setShowSettings(false); };

  return (
    <div className="flex h-[calc(100dvh-9rem)] md:h-[calc(100vh-6rem)] bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden relative">
      
      {/* SOL PANEL (LİSTE - GLASS FIX) */}
      <div className={`w-full md:w-80 bg-slate-800/50 border-r border-slate-700 flex flex-col ${showChatScreen ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-700">
            <div className="flex justify-between items-center mb-2">
                <h2 className="font-bold text-white text-lg">Sohbetler</h2>
                {currentUser.isAdmin ? (
                    <select className="text-xs bg-red-500/20 text-red-300 font-bold px-2 py-1 rounded border border-red-500/30 outline-none cursor-pointer" value={adminSelectedClass} onChange={(e) => setAdminSelectedClass(e.target.value)}>
                        {allClassSections.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
                    </select>
                ) : <span className="text-xs font-bold bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-lg border border-indigo-500/30">{userClass}</span>}
            </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            <button onClick={() => handleSelectChat('public', null)} className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all ${chatMode === 'public' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/5 hover:bg-white/10 text-slate-300'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${chatMode === 'public' ? 'bg-white/20' : 'bg-indigo-500/20 text-indigo-400'}`}><Users size={24}/></div>
                <div className="text-left flex-1"><div className="font-bold text-sm">{userClass} Sınıf Grubu</div><div className="text-xs opacity-70 truncate">Genel sohbet</div></div>
            </button>
            <div className="text-[10px] font-bold text-slate-500 uppercase mt-4 mb-1 px-2">Sınıf Arkadaşların</div>
            {usersList.filter(u => u.internalId !== currentUser.internalId && !u.isAdmin && u.classSection === userClass).map(user => (
                <button key={user.internalId} onClick={() => handleSelectChat('private', user)} className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all ${selectedPartner?.internalId === user.internalId ? 'bg-white/10 border border-indigo-500/30 text-white' : 'hover:bg-white/5 text-slate-300'}`}>
                    <div className="relative"><div className="w-12 h-12 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center border border-slate-600">{user.base64Avatar ? <img src={user.base64Avatar} className="w-full h-full object-cover" /> : <span className="text-xl">{user.avatar}</span>}</div>{isOnline(user.lastSeen) && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-slate-800 rounded-full"></div>}</div>
                    <div className="text-left flex-1 min-w-0"><div className="font-bold text-sm flex justify-between"><span className="truncate">{user.username}</span></div><div className="text-xs opacity-60 truncate">{user.realName}</div></div>
                </button>
            ))}
        </div>
      </div>

      {/* SAĞ PANEL (SOHBET EKRANI - GLASS FIX) */}
      <div className={`flex-1 flex flex-col relative ${!showChatScreen ? 'hidden md:flex' : 'flex'}`}>
         
         {/* HEADER */}
         <div className="p-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-700 flex items-center justify-between shadow-sm z-30 relative">
            <div className="flex items-center gap-2">
                <button onClick={() => setShowChatScreen(false)} className="md:hidden p-2 -ml-2 text-slate-300 hover:bg-slate-800 rounded-full"><ArrowLeft size={20}/></button>
                <div className="flex items-center gap-3 overflow-hidden">
                    {chatMode === 'private' && selectedPartner && <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700">{selectedPartner.base64Avatar ? <img src={selectedPartner.base64Avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xl">{selectedPartner.avatar}</div>}</div>}
                    <div>
                        <h3 className="font-bold text-white cursor-pointer hover:underline truncate max-w-[150px] sm:max-w-md" onClick={() => selectedPartner && onUserClick && onUserClick(selectedPartner.internalId)}>{chatMode === 'public' ? `${userClass} Sınıf Grubu` : selectedPartner?.username}</h3>
                        <p className={`text-xs ${isOnline(selectedPartner?.lastSeen) && chatMode === 'private' ? 'text-green-400 font-bold' : 'text-slate-400'}`}>{chatMode === 'public' ? <span>{currentUser.isAdmin ? 'Admin Modu' : 'Sınıf Sohbeti'}</span> : (isOnline(selectedPartner?.lastSeen) ? 'Çevrimiçi' : getLastSeenLabel(selectedPartner?.lastSeen))}</p>
                    </div>
                </div>
            </div>
            <button onClick={() => setShowSettings(!showSettings)} className="text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-slate-800"><Settings size={20}/></button>
         </div>

         {/* AYARLAR MENÜSÜ */}
         {showSettings && (
             <div className="absolute top-16 right-4 z-40 bg-slate-800 p-4 rounded-2xl shadow-2xl border border-slate-600 animate-in fade-in zoom-in-95 w-64">
                 <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><Palette size={14}/> Sohbet Arka Planı</h4>
                 <div className="grid grid-cols-2 gap-2">
                     {WALLPAPERS.map(wp => (
                         <button key={wp.id} onClick={() => changeWallpaper(wp.url)} className={`relative h-16 rounded-lg overflow-hidden border-2 transition-all ${currentWallpaper === wp.url ? 'border-indigo-500 scale-105' : 'border-transparent hover:scale-105'}`}>
                             <img src={wp.url} className="w-full h-full object-cover" alt={wp.name} />
                             <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-white p-0.5 text-center truncate">{wp.name}</div>
                         </button>
                     ))}
                 </div>
             </div>
         )}

         {/* MESAJ ALANI */}
         <div className="flex-1 relative overflow-hidden">
            <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url("${currentWallpaper}")` }} />
            <div className="absolute inset-0 z-0 bg-black/60" /> {/* Karartma artırıldı */}
            
            <div className="relative z-10 h-full overflow-y-auto p-4 custom-scrollbar">
                {messages.map((msg, index) => {
                    const isMe = msg.senderId === currentUser.internalId;
                    const prevMsg = messages[index - 1];
                    const showDate = !prevMsg || formatDateLabel(msg.timestamp) !== formatDateLabel(prevMsg.timestamp);
                    return (
                        <div key={msg.id}>
                            {showDate && <div className="flex justify-center my-4"><span className="bg-black/40 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm uppercase tracking-wider">{formatDateLabel(msg.timestamp)}</span></div>}
                            <div className={`flex items-end gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''} group`}>
                                {!isMe && <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center border border-slate-600 shadow-sm flex-shrink-0 cursor-pointer" onClick={() => onUserClick && onUserClick(msg.senderId)}>{msg.senderAvatar?.startsWith('data:') ? <img src={msg.senderAvatar} className="w-full h-full object-cover" /> : msg.senderAvatar}</div>}
                                <div className={`max-w-[80%] md:max-w-[70%] px-3 py-2 rounded-2xl text-sm shadow-md relative leading-relaxed backdrop-blur-md border ${isMe ? 'bg-indigo-600/90 text-white rounded-tr-none border-indigo-500/50' : 'bg-slate-800/80 text-slate-200 rounded-tl-none border-slate-700/50'}`}>
                                    {!isMe && chatMode === 'public' && <div className="text-[10px] font-bold text-orange-400 mb-0.5 cursor-pointer hover:underline" onClick={() => onUserClick && onUserClick(msg.senderId)}>{msg.senderName}</div>}
                                    {msg.replyTo && <div className="bg-black/20 border-l-4 border-white/20 p-1.5 rounded mb-1 text-[10px]"><div className="font-bold opacity-80">{msg.replyTo.senderName}</div><div className="truncate">{msg.replyTo.msgType === 'audio' ? 'Sesli Mesaj' : (msg.replyTo.msgType === 'image' ? 'Görsel' : msg.replyTo.text)}</div></div>}
                                    
                                    {msg.msgType === 'image' || (msg.text.startsWith('data:image')) ? (
                                        <img src={msg.text} className="rounded-lg max-w-full h-auto cursor-pointer mt-1 border border-white/10" onClick={() => window.open(msg.text, '_blank')} />
                                    ) : msg.msgType === 'audio' ? (
                                        <audio controls src={msg.text} className="mt-1 h-8 max-w-[200px]" />
                                    ) : (
                                        msg.text
                                    )}

                                    <div className={`text-[9px] mt-1 text-right opacity-60 flex justify-end items-center gap-1`}>{msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}{isMe && <CheckCheck size={12} className="text-blue-200"/>}</div>
                                    <div className={`absolute top-1 ${isMe ? '-left-16' : '-right-16'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-1`}><button onClick={() => setReplyTo(msg)} className="p-1.5 bg-slate-800 rounded-full shadow text-slate-300"><Reply size={14}/></button>{(isMe || currentUser.isAdmin) && <button onClick={() => handleDelete(msg.id)} className="p-1.5 bg-slate-800 rounded-full shadow text-red-400"><Trash2 size={14}/></button>}</div>
                                </div>
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>
         </div>

         {/* REPLY PREVIEW */}
         {replyTo && <div className="bg-slate-800 p-2 flex justify-between items-center border-t border-slate-700 relative z-20"><div className="text-xs border-l-4 border-indigo-500 pl-2"><div className="font-bold text-indigo-400">Cevap: {replyTo.senderName}</div><div className="text-slate-400 truncate max-w-xs">{replyTo.msgType === 'audio' ? 'Sesli Mesaj' : (replyTo.msgType === 'image' ? 'Görsel' : replyTo.text)}</div></div><button onClick={() => setReplyTo(null)}><X size={16} className="text-slate-400 hover:text-white"/></button></div>}
         
         {/* INPUT ALANI (GLASS FIX) */}
         <form onSubmit={handleSendText} className="p-2 bg-slate-900 border-t border-slate-700 flex gap-2 items-center relative safe-area-bottom pb-4 md:pb-2 z-20 shadow-lg">
             <label className="p-2 rounded-full transition-colors text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"><Paperclip size={22} /><input type="file" className="hidden" accept="image/*" onChange={handleImageUpload}/></label>
             <button type="button" onClick={() => setShowEmoji(!showEmoji)} className="p-2 rounded-full transition-colors text-slate-400 hover:text-white hover:bg-slate-800"><Smile size={24} /></button>
             {showEmoji && <div className="absolute bottom-16 left-10 bg-slate-800 p-3 rounded-2xl shadow-2xl border border-slate-600 grid grid-cols-6 gap-2 animate-in slide-in-from-bottom-5 z-20 w-80 max-h-60 overflow-y-auto custom-scrollbar">{emojis.map(e => <button key={e} type="button" onClick={() => setInputText(p => p + e)} className="text-2xl hover:bg-slate-700 p-1 rounded-lg transition-colors">{e}</button>)}</div>}
             
             {/* INPUT FIX */}
             <input 
                type="text" 
                className="flex-1 bg-black/40 text-white border border-slate-700 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none transition-all shadow-inner placeholder-slate-500 text-sm" 
                placeholder="Mesaj..." 
                value={inputText} 
                onChange={(e) => setInputText(e.target.value)}
             />
             
             {inputText.trim() ? (
                 <button type="submit" className="text-white bg-indigo-600 hover:bg-indigo-700 p-3 rounded-full transition-colors shadow-md animate-in zoom-in"><Send size={20} /></button>
             ) : (
                 <button type="button" onClick={isRecording ? stopRecording : startRecording} className={`p-3 rounded-full transition-all shadow-md flex items-center justify-center ${isRecording ? 'bg-red-500 text-white animate-pulse scale-110' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                     {isRecording ? <StopCircle size={24} /> : <Mic size={20} />}
                 </button>
             )}
         </form>
      </div>
    </div>
  );
}