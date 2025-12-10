import React, { useState, useEffect } from 'react';
import { Brain, Sparkles, AlertTriangle, Target, Activity, Zap, CheckSquare, Calendar, History, ChevronRight, Bell, Settings, Clock, Save, Lock, Download, Mic, MicOff } from 'lucide-react';
import { getAIAnalysis } from '../utils/aiService';
import { useSpeechRecognition } from '../utils/speechService';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';

const getWeekId = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNo}`;
};

export default function SmartCoach({ currentUser, myScores }) {
    const [loading, setLoading] = useState(false);
    const [latestReport, setLatestReport] = useState(null);
    const [history, setHistory] = useState([]); 
    const [activeTab, setActiveTab] = useState("current"); 
    const [applyingTips, setApplyingTips] = useState(false); 
    const [isListening, setIsListening] = useState(false);
    
    const [liveUser, setLiveUser] = useState(currentUser);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [preferences, setPreferences] = useState({
        dailyLimit: 2, questionCapacity: 50, focusArea: 'Dengeli'
    });

    const speechRecognition = useSpeechRecognition(
        (result) => {
            setPreferences(prev => ({ ...prev, focusArea: prev.focusArea + " " + result }));
            setIsListening(false);
        },
        (error) => { alert(error); setIsListening(false); }
    );

    useEffect(() => {
        const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email);
        const unsub = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setLiveUser(data);
                if (data.coachPreferences) setPreferences(data.coachPreferences);
                else setShowOnboarding(true);
            }
        });
        return () => unsub();
    }, [currentUser]);

    useEffect(() => {
        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'coach_archives'), where("userId", "==", currentUser.internalId));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            setHistory(data);
            if (data.length > 0 && !latestReport) setLatestReport(data[0]);
        });
        return () => unsub();
    }, [currentUser]);

    const savePreferences = async () => {
        await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email), { coachPreferences: preferences });
        setShowOnboarding(false);
        alert("Bilgiler kaydedildi! 🧠");
    };

    const prepareData = async () => {
        let targetUni = "Hedef Girilmemiş";
        let targetScore = 500;
        if (liveUser.dreamSchools && liveUser.dreamSchools.length > 0) {
            targetUni = liveUser.dreamSchools[0].university;
            targetScore = liveUser.dreamSchools[0].targetScore;
        }

        const currentWeek = getWeekId();
        const logsQ = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'study_logs'), where("userId", "==", currentUser.internalId));
        const logsSnap = await getDocs(logsQ);
        let weeklySolved = 0; let weeklyMinutes = 0;
        logsSnap.forEach(doc => { 
            const d = doc.data(); 
            if (d.weekId === currentWeek) {
                weeklySolved += Number(d.countValue || 0); 
                weeklyMinutes += Number(d.duration || 0); 
            }
        });

        const recentExams = myScores.slice(0, 3).map(s => ({ name: s.examName, total: s.placementScore }));
        const avgScore = myScores.length > 0 ? (myScores.reduce((a, b) => a + b.placementScore, 0) / myScores.length) : 0;
        const allMistakes = myScores.flatMap(s => s.mistakes || []);
        const uniqueMistakes = [...new Set(allMistakes)].slice(0, 5);

        return {
            name: liveUser.realName || liveUser.username,
            targetUni, targetScore,
            currentScore: avgScore.toFixed(2),
            gap: (targetScore - avgScore).toFixed(2),
            recentNets: recentExams,
            mistakes: uniqueMistakes.length > 0 ? uniqueMistakes : ["Eksik konu yok"],
            weeklySolved, weeklyMinutes,
            capacity: preferences 
        };
    };

    const handleAnalyze = async (isAuto = false) => {
        if (myScores.length === 0 && !isAuto) return alert("Analiz için en az 1 deneme sonucu girmelisin.");
        if (myScores.length === 0) return;
        
        setLoading(true);
        const data = await prepareData(); 
        const resultJson = await getAIAnalysis(data);

        if (resultJson) {
            const reportData = { userId: currentUser.internalId, timestamp: serverTimestamp(), weekId: getWeekId(), data: resultJson };
            await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'coach_archives'), reportData);
            setLatestReport({ ...reportData, timestamp: { seconds: Date.now() / 1000 } });
            setActiveTab("current");
        } else if (!isAuto) {
            alert("Bağlantı hatası. Tekrar dene.");
        }
        setLoading(false);
    };

    const applyRecommendations = async () => {
        if (!latestReport?.data?.action_plan) return alert("Uygulanacak tavsiye yok.");
        setApplyingTips(true);
        try {
            const tasks = latestReport.data.action_plan;
            const days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
            const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email);
            const userSnap = await getDoc(userRef);
            const currentSchedule = userSnap.data()?.studySchedule || days.reduce((acc, day) => ({ ...acc, [day]: [] }), {});
            const newSchedule = { ...currentSchedule };

            let taskIndex = 0;
            for (let i = 0; i < days.length && taskIndex < tasks.length; i++) {
                const taskStr = tasks[taskIndex];
                const match = taskStr.match(/(\d+)/); 
                const count = match ? match[0] : "20";
                
                let subject = "Matematik";
                let topic = "Genel Tekrar";
                let taskType = "konu";
                
                if (taskStr.toLowerCase().includes("soru")) taskType = "soru";
                else taskType = "konu";
                
                if (taskStr.toLowerCase().includes("fizik")) subject = "Fizik"; 
                else topic = taskStr.substring(0, 30); 

                if (!newSchedule[days[i]]) newSchedule[days[i]] = [];
                newSchedule[days[i]].push({
                    id: Date.now() + i, type: "TYT", subject, topic, taskType, isCompleted: false, count: taskType === "soru" ? count : ""
                });
                taskIndex++;
            }

            await updateDoc(userRef, { studySchedule: newSchedule });
            alert("✅ Tavsiyeler Programa Eklendi!");
            setApplyingTips(false);
        } catch (err) { console.error(err); alert("Hata."); setApplyingTips(false); }
    };

    if (showOnboarding) {
        return (
            <div className="max-w-2xl mx-auto py-10 px-4">
                {/* GLASS MODAL FIX */}
                <div className="glass-box rounded-3xl p-8 shadow-2xl text-center">
                    <div className="bg-white/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🤖</div>
                    <h2 className="text-2xl font-bold text-white mb-6">Seni Tanımam Lazım!</h2>
                    
                    <div className="space-y-6 text-left">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">Günde ortalama kaç saat çalışabilirsin?</label>
                            <input type="range" min="1" max="10" step="0.5" className="w-full accent-indigo-500" value={preferences.dailyLimit} onChange={e => setPreferences({...preferences, dailyLimit: e.target.value})} />
                            <div className="text-center font-bold text-indigo-400 mt-1">{preferences.dailyLimit} Saat</div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">Günde maksimum kaç soru çözebilirsin?</label>
                            <input type="number" className="w-full p-3 bg-black/20 border border-white/10 rounded-xl outline-none text-white focus:border-indigo-500" value={preferences.questionCapacity} onChange={e => setPreferences({...preferences, questionCapacity: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">Odak Alanı</label>
                            <div className="flex gap-2 flex-wrap">
                                {['Sayısal', 'Eşit Ağırlık', 'Sözel', 'Dil', 'Dengeli'].map(area => (
                                    <button key={area} onClick={() => setPreferences({...preferences, focusArea: area})} className={`flex-1 py-2 px-1 rounded-lg text-xs font-bold border transition-all ${preferences.focusArea === area ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white/5 text-slate-400 border-white/10'}`}>{area}</button>
                                ))}
                            </div>
                        </div>
                        <button onClick={savePreferences} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2"><Save size={20}/> <span>Kaydet ve Başla</span></button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full pb-24 space-y-6">
            {/* BAŞLIK (Gradyan olduğu için glass-box gerekmez ama border ekledim) */}
            <div className="relative bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 md:p-8 overflow-hidden shadow-2xl border border-white/10 text-white flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative z-10 text-center md:text-left">
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1 flex items-center justify-center md:justify-start gap-2"><Brain className="text-purple-400"/> YKS Komutanı <span className="bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded">AI v2.1</span></h2>
                    <p className="text-indigo-200 text-xs md:text-sm">Kapasitene göre kişiselleştirilmiş strateji.</p>
                </div>
                <div className="flex items-center gap-2 relative z-10">
                    <button onClick={() => setShowOnboarding(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"><Settings size={20}/></button>
                    <div className="flex bg-white/10 p-1 rounded-xl backdrop-blur-md">
                        <button onClick={() => setActiveTab('current')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'current' ? 'bg-white text-indigo-900 shadow' : 'text-white/70 hover:text-white'}`}>Mevcut</button>
                        <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'history' ? 'bg-white text-indigo-900 shadow' : 'text-white/70 hover:text-white'}`}>Arşiv</button>
                    </div>
                </div>
            </div>

            {/* 1. MEVCUT PLAN */}
            {activeTab === 'current' && (
                <div className="space-y-6 animate-in fade-in">
                    
                    {/* VERİ ÖZETİ (GLASS FIX) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                        <div className="glass-box p-3 md:p-4 rounded-2xl shadow-sm">
                            <div className="text-[10px] md:text-xs text-slate-400 uppercase font-bold mb-1 flex items-center gap-1"><Target size={12}/> Hedef</div>
                            <div className="text-sm md:text-lg font-bold text-white truncate">{liveUser.dreamSchools?.[0]?.university || "Hedef Yok"}</div>
                        </div>
                        <div className="glass-box p-3 md:p-4 rounded-2xl shadow-sm">
                            <div className="text-[10px] md:text-xs text-slate-400 uppercase font-bold mb-1 flex items-center gap-1"><Zap size={12}/> Efor</div>
                            <div className="text-sm md:text-lg font-bold text-yellow-400">{Math.floor((liveUser.totalStudyMinutes || 0) / 60)} Saat</div>
                        </div>
                        <div className="col-span-2">
                            <button onClick={() => handleAnalyze(false)} disabled={loading} className="w-full h-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 py-3 md:py-0 text-sm md:text-base">
                                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Sparkles size={18}/>}
                                {loading ? "Strateji Kuruluyor..." : "Yeni Analiz Başlat"}
                            </button>
                        </div>
                    </div>

                    {/* RAPOR KARTI (GLASS FIX) */}
                    {latestReport && latestReport.data ? (
                        <div className="glass-box rounded-3xl overflow-hidden shadow-xl">
                            <div className="p-5 border-b border-white/10 bg-white/5">
                                <div className="flex justify-between items-start mb-3">
                                    <div><h3 className="text-lg md:text-xl font-bold text-white">Haftalık Rapor</h3><p className="text-[10px] md:text-xs text-slate-400 mt-0.5">{new Date(latestReport.timestamp?.seconds * 1000).toLocaleDateString()} • {latestReport.weekId}</p></div>
                                    <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-green-500/30"><Bell size={12}/> Güncel</div>
                                </div>
                                <div className="text-sm text-slate-300 leading-relaxed italic border-l-4 border-indigo-500 pl-3 md:pl-4">"{latestReport.data.analysis_summary}"</div>
                            </div>
                            <div className="p-5 grid md:grid-cols-2 gap-6 md:gap-8">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><Activity size={14}/> Odak Konuları</h4>
                                    <div className="flex flex-wrap gap-2">{latestReport.data.weekly_focus_topics?.map((topic, i) => (<span key={i} className="px-2.5 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-xs font-bold border border-red-500/30">{topic}</span>))}</div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><CheckSquare size={14}/> Görev Listesi</h4>
                                    <div className="space-y-2">
                                        {latestReport.data.action_plan?.map((task, i) => (
                                            <label key={i} className="flex items-start gap-3 p-2.5 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                                                <input type="checkbox" className="mt-0.5 w-4 h-4 text-indigo-500 rounded focus:ring-indigo-500 border-gray-600 bg-black/30"/>
                                                <span className="text-xs md:text-sm text-slate-200 leading-snug">{task}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 border-t border-white/10 flex gap-3">
                                <button onClick={applyRecommendations} disabled={applyingTips} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2">
                                    {applyingTips ? "Uygulanıyor..." : <><Download size={18}/> Tavsiyeleri Uygula</>}
                                </button>
                            </div>
                        </div>
                    ) : !loading && <div className="text-center py-12 text-slate-400"><Brain size={48} className="mx-auto mb-3 opacity-20"/><p>Henüz bir rapor oluşturulmadı.</p></div>}
                </div>
            )}

            {/* 2. GEÇMİŞ (GLASS FIX) */}
            {activeTab === 'history' && (
                <div className="space-y-3 animate-in slide-in-from-right">
                    {history.map((report) => (
                        <div key={report.id} onClick={() => { setLatestReport(report); setActiveTab('current'); }} className="glass-box p-4 rounded-xl shadow-sm flex justify-between items-center cursor-pointer hover:border-indigo-500 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/10 p-2.5 rounded-full text-slate-400"><History size={18}/></div>
                                <div><div className="font-bold text-white text-sm">{report.weekId || "Eski Rapor"}</div><div className="text-[10px] text-slate-400">{new Date(report.timestamp?.seconds * 1000).toLocaleDateString()}</div></div>
                            </div>
                            <ChevronRight size={18} className="text-slate-500"/>
                        </div>
                    ))}
                    {history.length === 0 && <div className="text-center text-slate-400 py-10">Arşiv boş.</div>}
                </div>
            )}
        </div>
    );
}