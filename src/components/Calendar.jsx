import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalIcon } from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID, MONTHS, DAYS, getEventStyle } from '../utils/constants';

export default function Calendar({ currentUser }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [newEvent, setNewEvent] = useState({ title: "", type: "exam", time: "09:00", target: "school" });
  const classSections = ["12-A", "12-B", "12-C", "12-D", "12-E", "12-F", "Mezun"];

  useEffect(() => {
      const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'calendar_events'), orderBy('date', 'asc'));
      const unsub = onSnapshot(q, (snap) => { setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
      return () => unsub();
  }, []);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => { const day = new Date(year, month, 1).getDay(); return day === 0 ? 6 : day - 1; };
  const changeMonth = (val) => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + val, 1));
  
  const handleAddEvent = async (e) => {
      e.preventDefault(); if(!newEvent.title || !selectedDate) return;
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'calendar_events'), { ...newEvent, date: dateStr, createdBy: currentUser.username, timestamp: serverTimestamp() });
      setNewEvent({ title: "", type: "exam", time: "09:00", target: "school" }); alert("Etkinlik Eklendi!");
  };
  
  const handleDeleteEvent = async (id) => { if(confirm("Silmek istediğine emin misin?")) await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'calendar_events', id)); };
  
  const getEventsForDay = (day) => { 
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; 
      return events.filter(e => e.date === dateStr && (currentUser.isAdmin || e.target === 'school' || e.target === currentUser.classSection)); 
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col xl:flex-row gap-6">
        
        {/* SOL: TAKVİM GRID (Yükseklik Ayarlandı) */}
        <div className="flex-1 glass-box rounded-3xl shadow-xl p-6 flex flex-col xl:min-h-[600px]">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                    <CalIcon className="text-indigo-400"/> {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <div className="flex gap-2">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/10 rounded-full text-slate-300"><ChevronLeft/></button>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/10 rounded-full text-slate-300"><ChevronRight/></button>
                </div>
            </div>
            
            <div className="grid grid-cols-7 mb-4 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                {DAYS.map(d => <div key={d}>{d}</div>)}
            </div>
            
            {/* Grid Alanı: h-full ile kalanı doldur */}
            <div className="grid grid-cols-7 grid-rows-5 gap-3 flex-1 h-full">
                {Array.from({ length: getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()) }).map((_, i) => <div key={`empty-${i}`}></div>)}
                {Array.from({ length: getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth()) }).map((_, i) => {
                    const day = i + 1;
                    const dayEvents = getEventsForDay(day);
                    const isSelected = selectedDate === day;
                    const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth();
                    
                    return (
                        <div key={day} onClick={() => setSelectedDate(day)} 
                            className={`relative border rounded-2xl p-2 cursor-pointer transition-all hover:bg-white/10 flex flex-col min-h-[80px]
                            ${isSelected ? 'ring-2 ring-indigo-500 border-indigo-500 bg-white/5' : 'border-white/5'} 
                            ${isToday ? 'bg-indigo-600/20 border-indigo-500/50' : ''}`}
                        >
                            <span className={`text-sm font-bold ${isToday ? 'text-indigo-400' : 'text-slate-300'}`}>{day}</span>
                            <div className="flex-1 flex flex-col justify-end gap-1 mt-1 overflow-hidden">
                                {dayEvents.slice(0, 3).map((ev, idx) => <div key={idx} className={`h-1.5 w-full rounded-full ${getEventStyle(ev.type).bg.replace('50', '400')}`}></div>)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
        
        {/* SAĞ PANEL (Yükseklik Ayarlandı) */}
        <div className="w-full xl:w-96 flex flex-col gap-6">
             <div className="glass-box rounded-3xl shadow-xl p-6 flex-1 xl:min-h-[400px] flex flex-col">
                <h3 className="font-bold text-white text-lg mb-4 border-b border-white/10 pb-3">
                    {selectedDate ? `${selectedDate} ${MONTHS[currentDate.getMonth()]}` : "Bir gün seçin"}
                </h3>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                    {selectedDate ? (
                        getEventsForDay(selectedDate).length > 0 ? getEventsForDay(selectedDate).map(ev => (
                            <div key={ev.id} className="p-4 rounded-2xl border border-white/5 bg-white/5 flex items-start gap-3 transition-colors hover:bg-white/10">
                                <div className={`mt-1 ${getEventStyle(ev.type).text}`}>{getEventStyle(ev.type).icon}</div>
                                <div className="flex-1 min-w-0">
                                    <div className={`font-bold text-sm truncate text-slate-200`}>{ev.title}</div>
                                    <div className="text-xs text-slate-400 flex justify-between mt-1">
                                        <span>{ev.time}</span>
                                        <span className="font-bold uppercase text-[9px] border border-white/10 px-1.5 rounded bg-black/20">
                                            {ev.target === 'school' ? 'Tüm Okul' : ev.target}
                                        </span>
                                    </div>
                                </div>
                                {currentUser.isAdmin && <button onClick={() => handleDeleteEvent(ev.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={16}/></button>}
                            </div>
                        )) : <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2"><Clock size={32} className="opacity-20"/><p>Etkinlik yok.</p></div>
                    ) : <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2"><CalIcon size={32} className="opacity-20"/><p>Detaylar için bir güne tıklayın.</p></div>}
                </div>
             </div>
             
             {/* ADMIN EKLEME FORMU */}
             {currentUser.isAdmin && selectedDate && (
                 <div className="bg-indigo-600 text-white rounded-3xl shadow-lg p-6 border border-white/10">
                     {/* ... (Bu kısım aynı kalabilir, sadece input stillerini kontrol et) */}
                     {/* Inputlara bg-black/20 text-white border-white/20 eklemeyi unutma */}
                     <h3 className="font-bold mb-4 flex items-center gap-2"><Plus size={20}/> Etkinlik Ekle</h3>
                     <form onSubmit={handleAddEvent} className="space-y-3">
                         <input type="text" placeholder="Başlık" className="w-full bg-black/20 border border-white/20 rounded-xl p-3 text-sm placeholder-indigo-200 outline-none focus:bg-black/30 text-white" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})}/>
                         <div className="flex gap-2">
                             <input type="time" className="bg-black/20 border border-white/20 rounded-xl p-3 text-sm outline-none text-white w-24" value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})}/>
                             <select className="flex-1 bg-black/20 border border-white/20 rounded-xl p-3 text-sm outline-none text-white [&>option]:text-black" value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})}><option value="exam">Sınav</option><option value="deadline">Teslim</option><option value="holiday">Tatil</option></select>
                         </div>
                         <select className="w-full bg-black/20 border border-white/20 rounded-xl p-3 text-sm outline-none text-white [&>option]:text-black cursor-pointer" value={newEvent.target} onChange={e => setNewEvent({...newEvent, target: e.target.value})}><option value="school">🏫 Tüm Okul</option>{classSections.map(c => <option key={c} value={c}>🎓 {c}</option>)}</select>
                         <button className="w-full bg-white text-indigo-600 font-bold py-3 rounded-xl shadow mt-2 hover:bg-indigo-50 transition-colors">Kaydet</button>
                     </form>
                 </div>
             )}
        </div>
    </div>
  );
}