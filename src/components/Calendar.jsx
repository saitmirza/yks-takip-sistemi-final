import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Clock, Calendar as CalIcon, AlertCircle, PartyPopper, Bookmark, Flag } from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID, MONTHS, DAYS, getEventStyle } from '../utils/constants';

export default function Calendar({ currentUser }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Yeni Etkinlik Formu
  const [newEvent, setNewEvent] = useState({ title: "", type: "exam", time: "09:00" });

  useEffect(() => {
      const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'calendar_events'), orderBy('date', 'asc'));
      const unsub = onSnapshot(q, (snap) => {
          setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
  }, []);

  // Takvim Hesaplamaları
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => {
      const day = new Date(year, month, 1).getDay();
      return day === 0 ? 6 : day - 1; // Pazartesi başlangıç
  };

  const changeMonth = (val) => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + val, 1));

  const handleAddEvent = async (e) => {
      e.preventDefault();
      if(!newEvent.title || !selectedDate) return;
      
      // Seçili tarihi YYYY-MM-DD formatına çevir
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;

      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'calendar_events'), {
          ...newEvent,
          date: dateStr,
          createdBy: currentUser.username,
          timestamp: serverTimestamp()
      });
      setNewEvent({ title: "", type: "exam", time: "09:00" });
      alert("Etkinlik Eklendi!");
  };

  const handleDeleteEvent = async (id) => {
      if(confirm("Silmek istediğine emin misin?")) {
          await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'calendar_events', id));
      }
  };

  const getEventsForDay = (day) => {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return events.filter(e => e.date === dateStr);
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 h-[calc(100vh-6rem)]">
        {/* TAKVİM GRID */}
        <div className="flex-1 bg-white rounded-3xl shadow-xl border border-slate-200 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <CalIcon className="text-indigo-600"/> {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <div className="flex gap-2">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft/></button>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-full"><ChevronRight/></button>
                </div>
            </div>

            <div className="grid grid-cols-7 mb-2 text-center text-slate-400 font-bold text-xs uppercase">
                {DAYS.map(d => <div key={d}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7 grid-rows-5 gap-2 flex-1">
                {/* Boşluklar */}
                {Array.from({ length: getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()) }).map((_, i) => (
                    <div key={`empty-${i}`}></div>
                ))}

                {/* Günler */}
                {Array.from({ length: getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth()) }).map((_, i) => {
                    const day = i + 1;
                    const dayEvents = getEventsForDay(day);
                    const isSelected = selectedDate === day;
                    const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth();

                    return (
                        <div 
                            key={day}
                            onClick={() => setSelectedDate(day)}
                            className={`relative border rounded-2xl p-2 cursor-pointer transition-all hover:shadow-md flex flex-col ${isSelected ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-100'} ${isToday ? 'bg-indigo-50/50' : 'bg-white'}`}
                        >
                            <span className={`text-sm font-bold ${isToday ? 'text-indigo-600' : 'text-slate-700'}`}>{day}</span>
                            <div className="flex-1 flex flex-col justify-end gap-1 mt-1 overflow-hidden">
                                {dayEvents.slice(0, 3).map((ev, idx) => {
                                    const style = getEventStyle(ev.type);
                                    return (
                                        <div key={idx} className={`h-1.5 w-full rounded-full ${style.bg.replace('50', '400')}`}></div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* SAĞ PANEL: DETAY & EKLEME */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
             {/* Gün Detayı */}
             <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 flex-1 overflow-y-auto">
                <h3 className="font-bold text-slate-800 text-lg mb-4 border-b pb-2">
                    {selectedDate ? `${selectedDate} ${MONTHS[currentDate.getMonth()]}` : "Bir gün seçin"}
                </h3>
                
                {selectedDate ? (
                    <div className="space-y-3">
                        {getEventsForDay(selectedDate).length > 0 ? getEventsForDay(selectedDate).map(ev => {
                            const style = getEventStyle(ev.type);
                            return (
                                <div key={ev.id} className={`p-3 rounded-2xl border flex items-start gap-3 ${style.bg} ${style.border}`}>
                                    <div className={`mt-1 ${style.text}`}>{style.icon}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`font-bold text-sm truncate ${style.text}`}>{ev.title}</div>
                                        <div className="text-xs opacity-70">{ev.time}</div>
                                    </div>
                                    {currentUser.isAdmin && (
                                        <button onClick={() => handleDeleteEvent(ev.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                                    )}
                                </div>
                            );
                        }) : <div className="text-slate-400 text-sm text-center py-4">Etkinlik yok.</div>}
                    </div>
                ) : <div className="text-slate-400 text-sm text-center py-4">Detayları görmek için takvimden bir güne tıklayın.</div>}
             </div>

             {/* Admin Ekleme Paneli */}
             {currentUser.isAdmin && selectedDate && (
                 <div className="bg-indigo-600 text-white rounded-3xl shadow-lg p-6">
                     <h3 className="font-bold mb-4 flex items-center gap-2"><Plus size={20}/> Etkinlik Ekle</h3>
                     <form onSubmit={handleAddEvent} className="space-y-3">
                         <input type="text" placeholder="Başlık (Örn: Deneme)" className="w-full bg-white/10 border border-white/20 rounded-xl p-2 text-sm placeholder-indigo-200 outline-none focus:bg-white/20" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})}/>
                         <div className="flex gap-2">
                             <input type="time" className="bg-white/10 border border-white/20 rounded-xl p-2 text-sm outline-none" value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})}/>
                             <select className="flex-1 bg-white/10 border border-white/20 rounded-xl p-2 text-sm outline-none text-white [&>option]:text-black" value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})}>
                                 <option value="exam">Sınav</option>
                                 <option value="deadline">Teslim</option>
                                 <option value="holiday">Tatil</option>
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