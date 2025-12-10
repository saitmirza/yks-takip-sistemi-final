import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, CheckCircle2, Circle, Save, BookOpen, ChevronDown, Sparkles, Wand2, RefreshCw, X, HelpCircle, AlertTriangle, Mic, MicOff } from 'lucide-react';
import { doc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { TOPICS } from '../utils/topics';
import { generateWeeklySchedule } from '../utils/aiService';
import { useSpeechRecognition } from '../utils/speechService';

export default function StudyScheduler({ currentUser }) {
    const days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
    const initialSchedule = days.reduce((acc, day) => ({ ...acc, [day]: [] }), {});
    
    const [schedule, setSchedule] = useState(initialSchedule);
    const [isAdding, setIsAdding] = useState(null); 
    const [newTask, setNewTask] = useState({ type: 'TYT', subject: 'Matematik', topic: '', taskType: 'konu' });
    
    const [showAIModal, setShowAIModal] = useState(false);
    const [userRequest, setUserRequest] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isListening, setIsListening] = useState(false);
    
    const [logModal, setLogModal] = useState(null); 
    const [solvedCount, setSolvedCount] = useState("");

    const speechRecognition = useSpeechRecognition(
        (result) => {
            setUserRequest(prev => prev + (prev ? " " : "") + result);
            setIsListening(false);
        },
        (error) => { alert(error); setIsListening(false); }
    );

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
        saveSchedule(newSchedule); 
        setIsAdding(null); 
        setNewTask({ type: 'TYT', subject: 'Matematik', topic: '', taskType: 'konu' });
    };

    const handleTaskClick = (day, task) => {
        if (task.isCompleted) { toggleComplete(day, task.id, false); return; }
        if (task.taskType === 'soru') { setSolvedCount(task.count || ""); setLogModal({ day, task }); } 
        else { toggleComplete(day, task.id, true); }
    };

    const toggleComplete = (day, taskId, status) => {
        const updatedDay = schedule[day].map(t => t.id === taskId ? { ...t, isCompleted: status } : t);
        const newSchedule = { ...schedule, [day]: updatedDay };
        saveSchedule(newSchedule);
    };

    const confirmLog = async () => {
        if (!logModal || !solvedCount) return alert("Sayı giriniz.");
        const { day, task } = logModal;
        try {
            await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'study_logs'), {
                userId: currentUser.internalId, 
                username: currentUser.username, 
                avatar: currentUser.base64Avatar || currentUser.avatar,
                classSection: currentUser.classSection || "Belirsiz",
                logType: 'question', examType: task.type || "TYT", subject: task.subject, topic: task.topic,
                countValue: Number(solvedCount), duration: 0, timestamp: serverTimestamp(), source: "scheduler"
            });
            toggleComplete(day, task.id, true);
            alert(`Kaydedildi! ✅`); setLogModal(null); setSolvedCount("");
        } catch (e) { console.error(e); }
    };

    const handleAIGenerate = async () => {
        setIsGenerating(true);
        const profile = {
            focusArea: currentUser.coachPreferences?.focusArea || "Dengeli",
            dailyLimit: currentUser.coachPreferences?.dailyLimit || 3,
            mistakes: [] 
        };
        const aiSchedule = await generateWeeklySchedule(profile, userRequest, null);
        if (aiSchedule && !aiSchedule.error) {
            const formattedSchedule = {};
            Object.keys(aiSchedule).forEach(day => {
                formattedSchedule[day] = aiSchedule[day].map((t, i) => ({ id: Date.now() + i, isCompleted: false, ...t }));
            });
            saveSchedule(formattedSchedule);
            setShowAIModal(false); setUserRequest(""); alert("Program Hazır! 🚀");
        } else { alert("Yapay zeka yanıt vermedi."); }
        setIsGenerating(false);
    };

    const handleDeleteTask = (day, taskId) => { const updatedDay = schedule[day].filter(t => t.id !== taskId); saveSchedule({ ...schedule, [day]: updatedDay }); };
    
    const totalTasks = Object.values(schedule).flat().length;
    const completedTasks = Object.values(schedule).flat().filter(t => t.isCompleted).length;
    const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    return (
        <div className="max-w-7xl mx-auto pb-24 relative">
            
            {/* BAŞLIK & KONTROLLER (GLASS FIX) */}
            <div className="glass-box p-6 rounded-3xl shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-4 transition-colors">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Calendar className="text-indigo-400"/> Haftalık Program</h2>
                    <p className="text-slate-400 text-sm">Görevlerini planla ve takip et.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button onClick={() => { if(confirm("Tüm program silinecek?")) saveSchedule(initialSchedule); }} className="p-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors" title="Programı Sıfırla">
                        <RefreshCw size={20}/>
                    </button>
                    <button onClick={() => setShowAIModal(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-transform">
                        <Wand2 size={18}/> <span>AI ile Oluştur</span>
                    </button>
                </div>
            </div>

            {/* İLERLEME BARI (GLASS FIX) */}
            <div className="mb-6 glass-box p-4 rounded-2xl">
                <div className="flex justify-between text-xs font-bold mb-2 text-slate-300">
                    <span>Haftalık İlerleme</span>
                    <span>%{progress} ({completedTasks}/{totalTasks})</span>
                </div>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            {/* GÜNLER GRID (GLASS FIX) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {days.map(day => (
                    <div key={day} className="glass-box rounded-2xl shadow-sm flex flex-col min-h-[300px]">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-2xl">
                            <h3 className="font-bold text-white">{day}</h3>
                            <span className="text-[10px] font-bold bg-white/10 text-slate-300 px-2 py-1 rounded-md">{schedule[day]?.length || 0}</span>
                        </div>
                        
                        <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[400px] custom-scrollbar">
                            {schedule[day]?.map(task => (
                                <div key={task.id} className={`p-3 rounded-xl border flex items-start gap-3 group transition-all ${task.isCompleted ? 'bg-green-500/20 border-green-500/30 opacity-70' : 'bg-white/5 border-white/10 hover:border-indigo-500'}`}>
                                    <button onClick={() => handleTaskClick(day, task)} className={`mt-0.5 transition-colors ${task.isCompleted ? 'text-green-400' : 'text-slate-500 hover:text-indigo-400'}`}>
                                        {task.isCompleted ? <CheckCircle2 size={20}/> : <Circle size={20}/>}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className={`text-[10px] font-bold uppercase ${task.isCompleted ? 'text-green-400' : 'text-indigo-400'}`}>{task.subject}</span>
                                            {task.taskType === 'soru' && <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 rounded font-bold border border-orange-500/30">SORU</span>}
                                        </div>
                                        <div className={`text-sm font-medium truncate ${task.isCompleted ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                            {task.topic} {task.count ? `(${task.count})` : ''}
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteTask(day, task.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                </div>
                            ))}
                            {(!schedule[day] || schedule[day].length === 0) && !isAdding && <div className="text-center py-8 text-slate-500 text-sm italic">Boş gün.</div>}
                        </div>

                        {/* EKLEME BUTONU (GLASS FIX) */}
                        <div className="p-3 border-t border-white/10">
                            {isAdding === day ? (
                                <div className="space-y-2 bg-white/5 p-3 rounded-xl border border-white/10 animate-in slide-in-from-bottom-2">
                                    <div className="flex gap-2">
                                        <select className="flex-1 bg-black/30 border border-white/10 text-xs rounded-lg p-1.5 outline-none text-white" value={newTask.taskType} onChange={e => setNewTask({...newTask, taskType: e.target.value})}>
                                            <option value="konu">Konu</option><option value="soru">Soru</option>
                                        </select>
                                        <select className="flex-1 bg-black/30 border border-white/10 text-xs rounded-lg p-1.5 outline-none text-white" value={newTask.subject} onChange={e => setNewTask({...newTask, subject: e.target.value, topic: ''})}>
                                            {Object.keys(TOPICS[newTask.type]).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <select className="w-full bg-black/30 border border-white/10 text-xs rounded-lg p-1.5 outline-none text-white" value={newTask.topic} onChange={e => setNewTask({...newTask, topic: e.target.value})}>
                                        <option value="">Konu Seç...</option>{TOPICS[newTask.type][newTask.subject]?.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <div className="flex gap-2"><button onClick={() => setIsAdding(null)} className="flex-1 py-1.5 text-xs font-bold text-slate-400 bg-white/5 border border-white/10 rounded-lg">İptal</button><button onClick={() => handleAddTask(day)} className="flex-1 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg">Ekle</button></div>
                                </div>
                            ) : (
                                <button onClick={() => setIsAdding(day)} className="w-full py-2 rounded-xl border border-dashed border-slate-600 text-slate-400 text-sm font-bold hover:bg-white/5 hover:text-indigo-400 hover:border-indigo-500 transition-all flex items-center justify-center gap-2"><Plus size={16}/> Ekle</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* --- AI MODALI (GLASS FIX) --- */}
            {showAIModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
                    <div className="glass-box rounded-3xl shadow-2xl w-full max-w-lg p-6 border border-white/10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2"><Sparkles className="text-purple-500"/> AI Program Sihirbazı</h3>
                            <button onClick={() => setShowAIModal(false)}><X size={24} className="text-slate-400"/></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="bg-purple-500/20 p-4 rounded-2xl border border-purple-500/30 text-sm text-purple-300">
                                <p><strong>Nasıl çalışır?</strong> Yapay zeka, son analiz raporundaki eksiklerini ve çalışma kapasiteni baz alarak dengeli bir program oluşturur.</p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Özel İsteğin Var mı?</label>
                                <div className="flex gap-2 items-end">
                                    <textarea 
                                        className="flex-1 p-3 bg-black/30 border border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm text-white h-24 resize-none"
                                        placeholder="Örn: Çarşamba günü deneme sınavım var, o günü boş bırak. Matematiğe ağırlık ver."
                                        value={userRequest}
                                        onChange={e => setUserRequest(e.target.value)}
                                    ></textarea>
                                    <button 
                                        onClick={() => {
                                            if (!speechRecognition.isSupported) return alert("Tarayıcınız ses tanıma desteklemiyor.");
                                            if (isListening) { speechRecognition.stopListening(); setIsListening(false); } 
                                            else { speechRecognition.startListening(); setIsListening(true); }
                                        }}
                                        className={`p-3 rounded-xl font-bold transition-all flex-shrink-0 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                                    >
                                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                                    </button>
                                </div>
                            </div>

                            <button onClick={handleAIGenerate} disabled={isGenerating} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2">
                                {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Wand2 size={20}/>}
                                {isGenerating ? "Program Oluşturuluyor..." : "Sihirli Dokunuş Yap"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- LOG MODALI (GLASS FIX) --- */}
            {logModal && (
                <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in zoom-in-95">
                    <div className="glass-box rounded-3xl w-full max-w-sm p-6 text-center">
                        <h3 className="font-bold text-lg text-white mb-2">Kaç Soru Çözdün?</h3>
                        <p className="text-xs text-slate-400 mb-4">{logModal.task.subject} - {logModal.task.topic}</p>
                        <input type="number" autoFocus className="w-full p-4 text-center text-2xl font-bold bg-black/30 border border-white/10 rounded-2xl outline-none mb-6 focus:border-indigo-500 text-white" placeholder={logModal.task.count || "0"} value={solvedCount} onChange={e => setSolvedCount(e.target.value)} />
                        <div className="flex gap-3">
                            <button onClick={() => setLogModal(null)} className="flex-1 py-3 text-slate-400 font-bold bg-white/10 rounded-xl">İptal</button>
                            <button onClick={confirmLog} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700">Kaydet</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}