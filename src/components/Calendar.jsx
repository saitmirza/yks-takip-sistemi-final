

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Clock, Calendar as CalIcon, AlertCircle, PartyPopper, Bookmark, Flag, Users, School } from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID, MONTHS, DAYS, getEventStyle } from '../utils/constants';

export default function Calendar({ currentUser }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  
  // YENİ: Target eklendi (Varsayılan 'school')
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
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'calendar_events'), { 
          ...newEvent, 
          date: dateStr, 
          createdBy: currentUser.username, 
          timestamp: serverTimestamp() 
      });
      setNewEvent({ title: "", type: "exam", time: "09:00", target: "school" }); alert("Etkinlik Eklendi!");
  };
  
  const handleDeleteEvent = async (id) => { if(confirm("Silmek istediğine emin misin?")) await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'calendar_events', id)); };
  
  // FİLTRELEME: Tarih + (Okul Geneli VEYA Benim Sınıfım)
  const getEventsForDay = (day) => { 
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; 
      return events.filter(e => 
          e.date === dateStr && (
              currentUser.isAdmin || // Admin hepsini görür
              e.target === 'school' || // Herkes okul genelini görür
              e.target === currentUser.classSection // Sadece benim sınıfım
          )
      ); 
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 h-[calc(100vh-6rem)]">
        {/* TAKVİM GRID (Aynı Kalacak) */}
        <div className="flex-1 bg-white dark:bg-gray-900/60 dark:backdrop-blur-md rounded-3xl shadow-xl border border-slate-200 dark:border-gray-700 p-6 flex flex-col transition-colors">
            {/* ... Header ve Grid yapısı aynı ... */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><CalIcon className="text-indigo-600 dark:text-indigo-400"/> {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                <div className="flex gap-2">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full text-slate-600 dark:text-gray-300"><ChevronLeft/></button>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full text-slate-600 dark:text-gray-300"><ChevronRight/></button>
                </div>
            </div>
            <div className="grid grid-cols-7 mb-2 text-center text-slate-400 font-bold text-xs uppercase">{DAYS.map(d => <div key={d}>{d}</div>)}</div>
            <div className="grid grid-cols-7 grid-rows-5 gap-2 flex-1">
                {Array.from({ length: getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()) }).map((_, i) => <div key={`empty-${i}`}></div>)}
                {Array.from({ length: getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth()) }).map((_, i) => {
                    const day = i + 1;
                    const dayEvents = getEventsForDay(day);
                    const isSelected = selectedDate === day;
                    const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth();
                    return (
                        <div key={day} onClick={() => setSelectedDate(day)} className={`relative border rounded-2xl p-2 cursor-pointer transition-all hover:shadow-md flex flex-col ${isSelected ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-100 dark:border-gray-700'} ${isToday ? 'bg-indigo-50/50 dark:bg-indigo-900/30' : 'bg-white dark:bg-gray-800/50 hover:bg-slate-50 dark:hover:bg-gray-700'}`}>
                            <span className={`text-sm font-bold ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-gray-300'}`}>{day}</span>
                            <div className="flex-1 flex flex-col justify-end gap-1 mt-1 overflow-hidden">{dayEvents.slice(0, 3).map((ev, idx) => <div key={idx} className={`h-1.5 w-full rounded-full ${getEventStyle(ev.type).bg.replace('50', '400')}`}></div>)}</div>
                        </div>
                    );
                })}
            </div>
        </div>
        
        {/* SAĞ PANEL */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
             <div className="bg-white dark:bg-gray-900/60 dark:backdrop-blur-md rounded-3xl shadow-xl border border-slate-200 dark:border-gray-700 p-6 flex-1 overflow-y-auto transition-colors">
                <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-4 border-b border-slate-100 dark:border-gray-700 pb-2">{selectedDate ? `${selectedDate} ${MONTHS[currentDate.getMonth()]}` : "Bir gün seçin"}</h3>
                {selectedDate ? (
                    <div className="space-y-3">{getEventsForDay(selectedDate).length > 0 ? getEventsForDay(selectedDate).map(ev => (
                        <div key={ev.id} className={`p-3 rounded-2xl border flex items-start gap-3 ${getEventStyle(ev.type).bg} ${getEventStyle(ev.type).border}`}>
                            <div className={`mt-1 ${getEventStyle(ev.type).text}`}>{getEventStyle(ev.type).icon}</div>
                            <div className="flex-1 min-w-0">
                                <div className={`font-bold text-sm truncate ${getEventStyle(ev.type).text}`}>{ev.title}</div>
                                <div className="text-xs opacity-70 dark:text-gray-600 flex justify-between">
                                    <span>{ev.time}</span>
                                    {/* Hedef Göstergesi */}
                                    <span className="font-bold uppercase text-[9px] border border-black/10 px-1 rounded">{ev.target === 'school' ? 'Tüm Okul' : ev.target}</span>
                                </div>
                            </div>
                            {currentUser.isAdmin && <button onClick={() => handleDeleteEvent(ev.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>}
                        </div>
                    )) : <div className="text-slate-400 text-sm text-center py-4">Etkinlik yok.</div>}</div>
                ) : <div className="text-slate-400 text-sm text-center py-4">Detayları görmek için takvimden bir güne tıklayın.</div>}
             </div>
             
             {/* ADMIN EKLEME FORMU (GÜNCELLENDİ) */}
             {currentUser.isAdmin && selectedDate && (
                 <div className="bg-indigo-600 text-white rounded-3xl shadow-lg p-6">
                     <h3 className="font-bold mb-4 flex items-center gap-2"><Plus size={20}/> Etkinlik Ekle</h3>
                     <form onSubmit={handleAddEvent} className="space-y-3">
                         <input type="text" placeholder="Başlık" className="w-full bg-white/10 border border-white/20 rounded-xl p-2 text-sm placeholder-indigo-200 outline-none focus:bg-white/20 text-white" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})}/>
                         <div className="flex gap-2">
                             <input type="time" className="bg-white/10 border border-white/20 rounded-xl p-2 text-sm outline-none text-white w-20" value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})}/>
                             <select className="flex-1 bg-white/10 border border-white/20 rounded-xl p-2 text-sm outline-none text-white [&>option]:text-black" value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})}><option value="exam">Sınav</option><option value="deadline">Teslim</option><option value="holiday">Tatil</option></select>
                         </div>
                         
                         {/* HEDEF SEÇİMİ */}
                         <div>
                             <label className="text-[10px] font-bold uppercase opacity-70 mb-1 block">Hedef Kitle</label>
                             <select className="w-full bg-white/10 border border-white/20 rounded-xl p-2 text-sm outline-none text-white [&>option]:text-black cursor-pointer" value={newEvent.target} onChange={e => setNewEvent({...newEvent, target: e.target.value})}>
                                 <option value="school">🏫 Tüm Okul</option>
                                 {classSections.map(c => <option key={c} value={c}>🎓 {c}</option>)}
                             </select>
                         </div>

                         <button className="w-full bg-white text-indigo-600 font-bold py-2 rounded-xl shadow mt-2 hover:bg-indigo-50">Kaydet</button>
                     </form>
                 </div>
             )}
        </div>
    </div>
  );
}
