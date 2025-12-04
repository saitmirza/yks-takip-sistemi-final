import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, CheckCircle2, Circle, Save, BookOpen, ChevronDown, Sparkles, Wand2, RefreshCw, X, HelpCircle, AlertTriangle } from 'lucide-react';
import { doc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { TOPICS } from '../utils/topics';
import { generateWeeklySchedule } from '../utils/aiService';

export default function StudyScheduler({ currentUser }) {
    const days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
    const initialSchedule = days.reduce((acc, day) => ({ ...acc, [day]: [] }), {});
    
    const [schedule, setSchedule] = useState(initialSchedule);
    const [isAdding, setIsAdding] = useState(null); 
    const [newTask, setNewTask] = useState({ type: 'TYT', subject: 'Matematik', topic: '', taskType: 'konu' }); // taskType: 'konu' | 'soru'
    
    // AI STATE'LERİ
    const [showAIModal, setShowAIModal] = useState(false);
    const [userRequest, setUserRequest] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    
    // LOGLAMA İÇİN STATE'LER
    const [logModal, setLogModal] = useState(null); // { day, task }
    const [solvedCount, setSolvedCount] = useState("");

    // PROGRAMI ÇEK
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

    // --- MANUEL GÖREV EKLEME ---
    const handleAddTask = (day) => {
        if (!newTask.topic) return alert("Lütfen bir konu seçin.");
        const updatedDay = [...(schedule[day] || []), { 
            id: Date.now(), 
            ...newTask, 
            isCompleted: false 
        }];
        const newSchedule = { ...schedule, [day]: updatedDay };
        saveSchedule(newSchedule); 
        setIsAdding(null); 
        setNewTask({ type: 'TYT', subject: 'Matematik', topic: '', taskType: 'konu' });
    };

    // --- GÖREV TAMAMLAMA MANTIĞI ---
    const handleTaskClick = (day, task) => {
        // Eğer görev zaten tamamlanmışsa -> Geri al
        if (task.isCompleted) {
            toggleComplete(day, task.id, false);
            return;
        }

        // Eğer görev "Soru" ise ve tamamlanmamışsa -> Modal Aç
        if (task.taskType === 'soru') {
            setSolvedCount(task.count || ""); 
            setLogModal({ day, task });
        } else {
            // Konu çalışmasıysa direkt tamamla
            toggleComplete(day, task.id, true);
        }
    };

    const toggleComplete = (day, taskId, status) => {
        const updatedDay = schedule[day].map(t => t.id === taskId ? { ...t, isCompleted: status } : t);
        const newSchedule = { ...schedule, [day]: updatedDay };
        saveSchedule(newSchedule);
    };

    // LOGLAMA VE BİTİRME
    const confirmLog = async () => {
        if (!logModal || !solvedCount) return alert("Soru sayısı giriniz.");
        
        const { day, task } = logModal;
        
        try {
            // 1. Günlüğe Ekle
            await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'study_logs'), {
                userId: currentUser.internalId, 
                username: currentUser.username, 
                avatar: currentUser.base64Avatar || currentUser.avatar,
                classSection: currentUser.classSection || "Belirsiz",
                logType: 'question',
                examType: task.type || "TYT", 
                subject: task.subject,
                topic: task.topic,
                countValue: Number(solvedCount), 
                duration: 0, 
                timestamp: serverTimestamp(),
                source: "scheduler"
            });

            // 2. Görevi Tamamlandı Yap
            toggleComplete(day, task.id, true);
            alert(`Harika! ${solvedCount} soru günlüğe eklendi. ✅`);
            setLogModal(null);
            setSolvedCount("");

        } catch (e) { console.error(e); }
    };

    // --- AI PROGRAM OLUŞTURMA ---
    const handleAIGenerate = async () => {
        setIsGenerating(true);
        
        // 1. Son Analiz Raporunu Çek (DEVRE DIŞI - Firebase index sorunu)
        let recentAnalysis = null;
        // Şimdilik coach_archives kullanmıyoruz - index gerektiği için
        // İleride: currentUser'dan achievements/badges veri çek

        // 2. Profil Verisini Hazırla
        // (Gerçek projede MyExams'dan eksikleri çekebiliriz, burada basitleştiriyoruz)
        const profile = {
            focusArea: currentUser.coachPreferences?.focusArea || "Dengeli",
            dailyLimit: currentUser.coachPreferences?.dailyLimit || 3,
            mistakes: [] // Buraya currentUser.mistakes eklenebilir eğer kaydediliyorsa
        };

        // 3. AI Servisini Çağır
        const aiSchedule = await generateWeeklySchedule(profile, userRequest, recentAnalysis);

        if (aiSchedule && !aiSchedule.error) {
            const formattedSchedule = {};
            Object.keys(aiSchedule).forEach(day => {
                formattedSchedule[day] = aiSchedule[day].map((t, i) => ({
                    id: Date.now() + i,
                    isCompleted: false,
                    ...t
                }));
            });
            
            saveSchedule(formattedSchedule);
            setShowAIModal(false);
            setUserRequest("");
            alert("Programın hazır! 🚀");
        } else {
            alert("Yapay zeka şu an cevap veremiyor. Lütfen tekrar dene.");
        }
        setIsGenerating(false);
    };

    const handleDeleteTask = (day, taskId) => { const updatedDay = schedule[day].filter(t => t.id !== taskId); saveSchedule({ ...schedule, [day]: updatedDay }); };
    
    // İlerleme Barı
    const totalTasks = Object.values(schedule).flat().length;
    const completedTasks = Object.values(schedule).flat().filter(t => t.isCompleted).length;
    const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    return (
        <div className="max-w-7xl mx-auto pb-24 relative">
            
            {/* BAŞLIK & KONTROLLER */}
            <div className="bg-white dark:bg-gray-900/60 dark:backdrop-blur-md p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-gray-700 mb-6 flex flex-col md:flex-row justify-between items-center gap-4 transition-colors">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><Calendar className="text-indigo-600 dark:text-indigo-400"/> Haftalık Program</h2>
                    <p className="text-slate-500 dark:text-gray-400 text-sm">Görevlerini planla ve takip et.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button onClick={() => { if(confirm("Tüm program silinecek?")) saveSchedule(initialSchedule); }} className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 transition-colors" title="Programı Sıfırla">
                        <RefreshCw size={20}/>
                    </button>
                    <button onClick={() => setShowAIModal(true)} className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:scale-105 transition-transform">
                        <Wand2 size={18}/> <span>AI ile Oluştur</span>
                    </button>
                </div>
            </div>

            {/* İLERLEME BARI */}
            <div className="mb-6 bg-slate-50 dark:bg-gray-800 p-4 rounded-2xl border border-slate-200 dark:border-gray-700">
                <div className="flex justify-between text-xs font-bold mb-2 text-slate-600 dark:text-gray-300">
                    <span>Haftalık İlerleme</span>
                    <span>%{progress} ({completedTasks}/{totalTasks})</span>
                </div>
                <div className="w-full h-3 bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            {/* GÜNLER GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {days.map(day => (
                    <div key={day} className="bg-white dark:bg-gray-900/60 dark:backdrop-blur-md rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm flex flex-col transition-colors min-h-[300px]">
                        <div className="p-4 border-b border-slate-100 dark:border-gray-700 flex justify-between items-center bg-slate-50/50 dark:bg-gray-800/30 rounded-t-2xl">
                            <h3 className="font-bold text-slate-700 dark:text-white">{day}</h3>
                            <span className="text-[10px] font-bold bg-slate-200 dark:bg-gray-700 text-slate-600 dark:text-gray-300 px-2 py-1 rounded-md">{schedule[day]?.length || 0}</span>
                        </div>
                        
                        <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[400px] custom-scrollbar">
                            {schedule[day]?.map(task => (
                                <div key={task.id} className={`p-3 rounded-xl border flex items-start gap-3 group transition-all ${task.isCompleted ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30 opacity-70' : 'bg-white dark:bg-gray-700/50 border-slate-100 dark:border-gray-600 hover:border-indigo-200 dark:hover:border-indigo-500'}`}>
                                    <button onClick={() => handleTaskClick(day, task)} className={`mt-0.5 transition-colors ${task.isCompleted ? 'text-green-600 dark:text-green-400' : 'text-slate-300 dark:text-gray-500 hover:text-indigo-500'}`}>
                                        {task.isCompleted ? <CheckCircle2 size={20}/> : <Circle size={20}/>}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className={`text-[10px] font-bold uppercase ${task.isCompleted ? 'text-green-700' : 'text-indigo-600 dark:text-indigo-400'}`}>{task.subject}</span>
                                            {task.taskType === 'soru' && <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 rounded font-bold border border-orange-200">SORU</span>}
                                        </div>
                                        <div className={`text-sm font-medium truncate ${task.isCompleted ? 'text-slate-500 line-through' : 'text-slate-700 dark:text-gray-200'}`}>
                                            {task.topic} {task.count ? `(${task.count})` : ''}
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteTask(day, task.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                </div>
                            ))}
                            {(!schedule[day] || schedule[day].length === 0) && !isAdding && <div className="text-center py-8 text-slate-400 dark:text-gray-600 text-sm italic">Boş gün.</div>}
                        </div>

                        {/* EKLEME BUTONU */}
                        <div className="p-3 border-t border-slate-100 dark:border-gray-700">
                            {isAdding === day ? (
                                <div className="space-y-2 bg-slate-50 dark:bg-gray-800 p-3 rounded-xl border border-indigo-100 dark:border-gray-600 animate-in slide-in-from-bottom-2">
                                    <div className="flex gap-2">
                                        <select className="flex-1 bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-xs rounded-lg p-1.5 outline-none dark:text-white" value={newTask.taskType} onChange={e => setNewTask({...newTask, taskType: e.target.value})}>
                                            <option value="konu">Konu</option><option value="soru">Soru</option>
                                        </select>
                                        <select className="flex-1 bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-xs rounded-lg p-1.5 outline-none dark:text-white" value={newTask.subject} onChange={e => setNewTask({...newTask, subject: e.target.value, topic: ''})}>
                                            {Object.keys(TOPICS[newTask.type]).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <select className="w-full bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-xs rounded-lg p-1.5 outline-none dark:text-white" value={newTask.topic} onChange={e => setNewTask({...newTask, topic: e.target.value})}>
                                        <option value="">Konu Seç...</option>{TOPICS[newTask.type][newTask.subject]?.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <div className="flex gap-2"><button onClick={() => setIsAdding(null)} className="flex-1 py-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg">İptal</button><button onClick={() => handleAddTask(day)} className="flex-1 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg">Ekle</button></div>
                                </div>
                            ) : (
                                <button onClick={() => setIsAdding(day)} className="w-full py-2 rounded-xl border border-dashed border-slate-300 dark:border-gray-600 text-slate-500 dark:text-gray-400 text-sm font-bold hover:bg-indigo-50 dark:hover:bg-gray-800 hover:text-indigo-600 hover:border-indigo-300 transition-all flex items-center justify-center gap-2"><Plus size={16}/> Ekle</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* --- AI MODALI --- */}
            {showAIModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg p-6 border border-slate-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><Sparkles className="text-purple-500"/> AI Program Sihirbazı</h3>
                            <button onClick={() => setShowAIModal(false)}><X size={24} className="text-slate-400"/></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl border border-purple-100 dark:border-purple-800 text-sm text-purple-700 dark:text-purple-300">
                                <p><strong>Nasıl çalışır?</strong> Yapay zeka, son analiz raporundaki eksiklerini ve çalışma kapasiteni baz alarak dengeli bir program oluşturur.</p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-2 block">Özel İsteğin Var mı?</label>
                                <textarea 
                                    className="w-full p-3 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm dark:text-white h-24 resize-none"
                                    placeholder="Örn: Çarşamba günü deneme sınavım var, o günü boş bırak. Matematiğe ağırlık ver."
                                    value={userRequest}
                                    onChange={e => setUserRequest(e.target.value)}
                                ></textarea>
                            </div>

                            <button 
                                onClick={handleAIGenerate} 
                                disabled={isGenerating}
                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Wand2 size={20}/>}
                                {isGenerating ? "Program Oluşturuluyor..." : "Sihirli Dokunuş Yap"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- LOG MODALI --- */}
            {logModal && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in-95">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 border dark:border-gray-700 text-center">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2">Kaç Soru Çözdün?</h3>
                        <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">{logModal.task.subject} - {logModal.task.topic}</p>
                        
                        <input 
                            type="number" 
                            autoFocus
                            className="w-full p-4 text-center text-2xl font-bold bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-600 rounded-2xl outline-none mb-6 focus:border-indigo-500 dark:text-white"
                            placeholder={logModal.task.count || "0"}
                            value={solvedCount}
                            onChange={e => setSolvedCount(e.target.value)}
                        />
                        
                        <div className="flex gap-3">
                            <button onClick={() => setLogModal(null)} className="flex-1 py-3 text-slate-500 font-bold bg-slate-100 dark:bg-gray-700 rounded-xl">İptal</button>
                            <button onClick={confirmLog} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700">Kaydet</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}