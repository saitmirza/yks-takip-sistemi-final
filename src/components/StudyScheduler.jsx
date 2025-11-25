import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, CheckCircle2, Circle, Save, BookOpen, ChevronDown } from 'lucide-react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { TOPICS } from '../utils/topics';

export default function StudyScheduler({ currentUser }) {
    const days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
    const initialSchedule = days.reduce((acc, day) => ({ ...acc, [day]: [] }), {});
    const [schedule, setSchedule] = useState(initialSchedule);
    const [isAdding, setIsAdding] = useState(null); 
    const [newTask, setNewTask] = useState({ type: 'TYT', subject: 'Matematik', topic: '' });

    useEffect(() => {
        const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email);
        const unsub = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().studySchedule) {
                setSchedule(docSnap.data().studySchedule);
            }
        });
        return () => unsub();
    }, [currentUser]);

    const saveSchedule = async (newSchedule) => {
        setSchedule(newSchedule);
        await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email), {
            studySchedule: newSchedule
        });
    };

    const handleAddTask = (day) => {
        if (!newTask.topic) return alert("Lütfen bir konu seçin.");
        const updatedDay = [...(schedule[day] || []), { id: Date.now(), ...newTask, isCompleted: false }];
        const newSchedule = { ...schedule, [day]: updatedDay };
        saveSchedule(newSchedule); setIsAdding(null); setNewTask({ type: 'TYT', subject: 'Matematik', topic: '' });
    };

    const handleDeleteTask = (day, taskId) => { const updatedDay = schedule[day].filter(t => t.id !== taskId); saveSchedule({ ...schedule, [day]: updatedDay }); };
    const toggleComplete = (day, taskId) => { const updatedDay = schedule[day].map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t); saveSchedule({ ...schedule, [day]: updatedDay }); };

    const totalTasks = Object.values(schedule).flat().length;
    const completedTasks = Object.values(schedule).flat().filter(t => t.isCompleted).length;
    const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    return (
        <div className="max-w-7xl mx-auto pb-20">
            <div className="bg-white dark:bg-gray-900/60 dark:backdrop-blur-md p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-gray-700 mb-6 flex flex-col md:flex-row justify-between items-center gap-4 transition-colors">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><Calendar className="text-indigo-600 dark:text-indigo-400"/> Haftalık Program</h2>
                    <p className="text-slate-500 dark:text-gray-400 text-sm">Planlı çalış, hedefine ulaş.</p>
                </div>
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-gray-800 p-3 rounded-2xl border border-slate-200 dark:border-gray-700 w-full md:w-auto">
                    <div className="flex-1 md:w-48">
                        <div className="flex justify-between text-xs font-bold mb-1 text-slate-600 dark:text-gray-300"><span>Haftalık Hedef</span><span>%{progress}</span></div>
                        <div className="w-full h-2 bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${progress}%` }}></div></div>
                    </div>
                    <div className="text-right border-l border-slate-200 dark:border-gray-700 pl-4"><div className="text-xl font-bold text-slate-800 dark:text-white">{completedTasks}/{totalTasks}</div><div className="text-[10px] text-slate-400 uppercase font-bold">Görev</div></div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {days.map(day => (
                    <div key={day} className="bg-white dark:bg-gray-900/60 dark:backdrop-blur-md rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm flex flex-col transition-colors h-full min-h-[300px]">
                        <div className="p-4 border-b border-slate-100 dark:border-gray-700 flex justify-between items-center bg-slate-50/50 dark:bg-gray-800/30 rounded-t-2xl">
                            <h3 className="font-bold text-slate-700 dark:text-white">{day}</h3>
                            <span className="text-xs font-bold bg-slate-200 dark:bg-gray-700 text-slate-600 dark:text-gray-300 px-2 py-1 rounded-md">{schedule[day]?.length || 0} Görev</span>
                        </div>
                        <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[400px] custom-scrollbar">
                            {schedule[day]?.map(task => (
                                <div key={task.id} className={`p-3 rounded-xl border flex items-start gap-3 group transition-all ${task.isCompleted ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30 opacity-70' : 'bg-white dark:bg-gray-700/50 border-slate-100 dark:border-gray-600 hover:border-indigo-200 dark:hover:border-indigo-500'}`}>
                                    <button onClick={() => toggleComplete(day, task.id)} className={`mt-0.5 transition-colors ${task.isCompleted ? 'text-green-600 dark:text-green-400' : 'text-slate-300 dark:text-gray-500 hover:text-indigo-500'}`}>{task.isCompleted ? <CheckCircle2 size={20}/> : <Circle size={20}/>}</button>
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-xs font-bold uppercase mb-0.5 ${task.isCompleted ? 'text-green-700 dark:text-green-500 line-through' : 'text-indigo-600 dark:text-indigo-400'}`}>{task.type} • {task.subject}</div>
                                        <div className={`text-sm font-medium truncate ${task.isCompleted ? 'text-slate-500 dark:text-gray-500 line-through' : 'text-slate-700 dark:text-gray-200'}`}>{task.topic}</div>
                                    </div>
                                    <button onClick={() => handleDeleteTask(day, task.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                </div>
                            ))}
                            {(!schedule[day] || schedule[day].length === 0) && !isAdding && <div className="text-center py-8 text-slate-400 dark:text-gray-600 text-sm italic">Boş gün. 😴</div>}
                        </div>
                        <div className="p-3 border-t border-slate-100 dark:border-gray-700">
                            {isAdding === day ? (
                                <div className="space-y-2 bg-slate-50 dark:bg-gray-800 p-3 rounded-xl border border-indigo-100 dark:border-gray-600 animate-in slide-in-from-bottom-2">
                                    <div className="flex gap-2"><select className="flex-1 bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-xs rounded-lg p-1.5 outline-none dark:text-white" value={newTask.type} onChange={e => setNewTask({...newTask, type: e.target.value})}><option>TYT</option><option>AYT</option></select><select className="flex-1 bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-xs rounded-lg p-1.5 outline-none dark:text-white" value={newTask.subject} onChange={e => setNewTask({...newTask, subject: e.target.value, topic: ''})}>{Object.keys(TOPICS[newTask.type]).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                    <select className="w-full bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-xs rounded-lg p-1.5 outline-none dark:text-white" value={newTask.topic} onChange={e => setNewTask({...newTask, topic: e.target.value})}><option value="">Konu Seç...</option>{TOPICS[newTask.type][newTask.subject]?.map(t => <option key={t} value={t}>{t}</option>)}</select>
                                    <div className="flex gap-2"><button onClick={() => setIsAdding(null)} className="flex-1 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg">İptal</button><button onClick={() => handleAddTask(day)} className="flex-1 py-1.5 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg">Ekle</button></div>
                                </div>
                            ) : (
                                <button onClick={() => setIsAdding(day)} className="w-full py-2 rounded-xl border border-dashed border-slate-300 dark:border-gray-600 text-slate-500 dark:text-gray-400 text-sm font-bold hover:bg-indigo-50 dark:hover:bg-gray-800 hover:text-indigo-600 hover:border-indigo-300 transition-all flex items-center justify-center gap-2"><Plus size={16}/> Görev Ekle</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}