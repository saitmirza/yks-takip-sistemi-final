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
    
    // YENİ STATE'LER (Veritabanından taze çekilecek)
    const [liveUser, setLiveUser] = useState(currentUser);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [preferences, setPreferences] = useState({
        dailyLimit: 2, questionCapacity: 50, focusArea: 'Dengeli'
    });

    // SES TANIMA HOOK'U
    const speechRecognition = useSpeechRecognition(
        (result) => {
            setPreferences(prev => ({ ...prev, focusArea: prev.focusArea + " " + result }));
            setIsListening(false);
        },
        (error) => {
            alert(error);
            setIsListening(false);
        }
    );

    // 1. KULLANICI VERİSİNİ CANLI TAKİP ET (Hedef Hatasını Çözer)
    useEffect(() => {
        const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email);
        const unsub = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setLiveUser(data);
                if (data.coachPreferences) {
                    setPreferences(data.coachPreferences);
                } else {
                    setShowOnboarding(true); // Tercih yoksa anket aç
                }
            }
        });
        return () => unsub();
    }, [currentUser]);

    // 2. GEÇMİŞ RAPORLARI ÇEK
    useEffect(() => {
        try {
            const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'coach_archives'), where("userId", "==", currentUser.internalId));
            const unsub = onSnapshot(q, (snap) => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                setHistory(data);
                if (data.length > 0 && !latestReport) setLatestReport(data[0]);
            }, (error) => {
                console.warn("Coach archive yüklenemedi:", error.message);
                setHistory([]);
            });
            return () => unsub();
        } catch (err) {
            console.warn("Coach archive query hatası:", err.message);
            setHistory([]);
        }
    }, [currentUser]);

    // 3. PREFERENCES KAYDET
    const savePreferences = async () => {
        await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email), { coachPreferences: preferences });
        setShowOnboarding(false);
        alert("Bilgiler kaydedildi! 🧠");
    };

    // 4. VERİ HAZIRLAMA (LiveUser kullanılıyor)
    const prepareData = async () => {
        // Hedef Okul (Artık liveUser'dan geliyor, kesin veri)
        let targetUni = "Hedef Girilmemiş";
        let targetScore = 500;
        if (liveUser.dreamSchools && liveUser.dreamSchools.length > 0) {
            targetUni = liveUser.dreamSchools[0].university;
            targetScore = liveUser.dreamSchools[0].targetScore;
        }

        // Haftalık Loglar - Index sorunu olmadan userId'ye göre çek, sonra JavaScript'te filter et
        const currentWeek = getWeekId();
        const logsQ = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'study_logs'), where("userId", "==", currentUser.internalId));
        const logsSnap = await getDocs(logsQ);
        let weeklySolved = 0; let weeklyMinutes = 0;
        logsSnap.forEach(doc => { 
            const d = doc.data(); 
            // JavaScript'te currentWeek'e göre filter et
            if (d.weekId === currentWeek) {
                weeklySolved += Number(d.countValue || 0); 
                weeklyMinutes += Number(d.duration || 0); 
            }
        });

        // Denemeler
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
            capacity: preferences // Kişisel Tercihler
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

    // --- TAVSIYELERI UYGULAMAK IÇIN FONKSIYON ---
    const applyRecommendations = async () => {
        if (!latestReport?.data?.weekly_focus_topics || !latestReport?.data?.action_plan) {
            return alert("Uygulanacak tavsiye yok.");
        }

        // Email validation
        const userEmail = liveUser?.email || currentUser?.email;
        if (!userEmail) {
            return alert("Kullanıcı email bulunamadı. Sayfayı yenile.");
        }

        setApplyingTips(true);
        try {
            // Action plan'ı parse et
            const tasks = latestReport.data.action_plan;
            const days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
            
            // Mevcut schedule'ı çek
            const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', userEmail);
            const userSnap = await getDoc(userRef);
            const currentSchedule = userSnap.data()?.studySchedule || days.reduce((acc, day) => ({ ...acc, [day]: [] }), {});

            // Görevleri haftanın günlerine dağıt
            let taskIndex = 0;
            const newSchedule = { ...currentSchedule };

            for (let i = 0; i < days.length && taskIndex < tasks.length; i++) {
                const day = days[i];
                const task = tasks[taskIndex];
                
                // Görev stringini parse et (örn: "Fonksiyonlardan 30 soru çöz")
                const match = task.match(/(\d+)/); // Sayı bul
                const count = match ? match[0] : "20";
                
                // Görev türü belirle
                let subject = "Matematik";
                let topic = "Genel Tekrar";
                let taskType = "konu";
                
                // Anahtar kelimelere göre konu belirle
                if (task.toLowerCase().includes("soru")) {
                    taskType = "soru";
                } else {
                    taskType = "konu";
                }
                
                if (task.toLowerCase().includes("fonksiyon")) topic = "Fonksiyonlar";
                else if (task.toLowerCase().includes("trigonometri")) topic = "Trigonometri";
                else if (task.toLowerCase().includes("logaritma")) topic = "Logaritma";
                else if (task.toLowerCase().includes("türkçe") || task.toLowerCase().includes("edebiyat")) { subject = "Türkçe"; topic = "Edebiyat"; }
                else if (task.toLowerCase().includes("tarih")) { subject = "Tarih"; topic = "Tarihsel Olaylar"; }
                else if (task.toLowerCase().includes("coğrafya")) { subject = "Coğrafya"; topic = "Fiziki Coğrafya"; }
                else if (task.toLowerCase().includes("fizik")) { subject = "Fizik"; topic = "Mekanik"; }
                else if (task.toLowerCase().includes("kimya")) { subject = "Kimya"; topic = "Genel Kimya"; }
                else if (task.toLowerCase().includes("biyoloji")) { subject = "Biyoloji"; topic = "Hücre Biyolojisi"; }
                else topic = task.substring(0, 30); // İlk 30 karakteri topic olarak al

                // Görevi schedule'a ekle
                if (!newSchedule[day]) newSchedule[day] = [];
                const taskObj = {
                    id: Date.now() + i,
                    type: "TYT",
                    subject,
                    topic,
                    taskType,
                    isCompleted: false
                };
                // Eğer soru tipi ise count ekle, değilse ekleme
                if (taskType === "soru") {
                    taskObj.count = count;
                }
                newSchedule[day].push(taskObj);

                taskIndex++;
            }

            // Firebase'e kaydet
            await updateDoc(userRef, { studySchedule: newSchedule });
            
            alert("✅ Tavsiyeleri uygulandı! StudyScheduler'a bakabilirsin.");
            setApplyingTips(false);
        } catch (err) {
            console.error("Tavsiye uygulanırken hata:", err);
            alert("Hata oluştu. Tekrar dene.");
            setApplyingTips(false);
        }
    };

    // --- ANKET EKRANI ---
    if (showOnboarding) {
        return (
            <div className="max-w-2xl mx-auto py-10 px-4">
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl border border-indigo-500/30 text-center">
                    <div className="bg-indigo-100 dark:bg-indigo-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🤖</div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Seni Tanımam Lazım!</h2>
                    
                    <div className="space-y-6 text-left">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-2">Günde ortalama kaç saat çalışabilirsin?</label>
                            <input type="range" min="1" max="10" step="0.5" className="w-full accent-indigo-600" value={preferences.dailyLimit} onChange={e => setPreferences({...preferences, dailyLimit: e.target.value})} />
                            <div className="text-center font-bold text-indigo-600 dark:text-indigo-400 mt-1">{preferences.dailyLimit} Saat</div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-2">Günde maksimum kaç soru çözebilirsin? (Gerçekçi ol)</label>
                            <input type="number" className="w-full p-3 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-600 rounded-xl outline-none dark:text-white" value={preferences.questionCapacity} onChange={e => setPreferences({...preferences, questionCapacity: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-2">Odak Alanı</label>
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    {['Sayısal', 'Eşit Ağırlık', 'Sözel', 'Dil', 'Dengeli'].map(area => (
                                        <button key={area} onClick={() => setPreferences({...preferences, focusArea: area})} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${preferences.focusArea === area ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 dark:bg-gray-700 text-slate-500 dark:text-gray-400 border-slate-200 dark:border-gray-600'}`}>{area}</button>
                                    ))}
                                </div>
                                <div className="flex gap-2 items-center">
                                    <input 
                                        type="text" 
                                        className="flex-1 p-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-600 rounded-lg outline-none text-sm dark:text-white"
                                        placeholder="Örn: Kimya ağırlıklı olsun"
                                        value={preferences.focusArea}
                                        onChange={e => setPreferences({...preferences, focusArea: e.target.value})}
                                    />
                                    <button 
                                        onClick={() => {
                                            if (!speechRecognition.isSupported) return alert("Tarayıcınız ses tanıma desteklemiyor.");
                                            if (isListening) {
                                                speechRecognition.stopListening();
                                                setIsListening(false);
                                            } else {
                                                speechRecognition.startListening();
                                                setIsListening(true);
                                            }
                                        }}
                                        className={`p-2 rounded-lg font-bold transition-all flex-shrink-0 ${
                                            isListening 
                                                ? 'bg-red-500 text-white animate-pulse' 
                                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                                        }`}
                                        title={isListening ? "Dinliyor..." : "Sesi metne çevir"}
                                    >
                                        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                                    </button>
                                </div>
                                {isListening && <p className="text-xs text-blue-600 dark:text-blue-400 animate-pulse">🎤 Dinliyor...</p>}
                            </div>
                        </div>
                        <button onClick={savePreferences} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"><Save size={20}/> <span>Kaydet ve Başla</span></button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full pb-24 space-y-6">
            {/* BAŞLIK & AYARLAR */}
            <div className="relative bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 md:p-8 overflow-hidden shadow-2xl border border-indigo-500/30 text-white flex flex-col md:flex-row justify-between items-center gap-4">
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
                    {/* Veri Özeti */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                        <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm">
                            <div className="text-[10px] md:text-xs text-slate-400 uppercase font-bold mb-1 flex items-center gap-1"><Target size={12}/> Hedef</div>
                            <div className="text-sm md:text-lg font-bold text-slate-800 dark:text-white truncate">{liveUser.dreamSchools?.[0]?.university || "Hedef Yok"}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm">
                            <div className="text-[10px] md:text-xs text-slate-400 uppercase font-bold mb-1 flex items-center gap-1"><Zap size={12}/> Efor</div>
                            <div className="text-sm md:text-lg font-bold text-yellow-500">{Math.floor((liveUser.totalStudyMinutes || 0) / 60)} Saat</div>
                        </div>
                        <div className="col-span-2">
                            <button onClick={() => handleAnalyze(false)} disabled={loading} className="w-full h-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 py-3 md:py-0 text-sm md:text-base">
                                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Sparkles size={18}/>}
                                {loading ? "Strateji Kuruluyor..." : "Yeni Analiz Başlat"}
                            </button>
                        </div>
                    </div>

                    {/* Rapor Kartı */}
                    {latestReport && latestReport.data ? (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-xl border border-slate-100 dark:border-gray-700">
                            <div className="bg-slate-50 dark:bg-gray-900 p-5 border-b border-slate-100 dark:border-gray-700">
                                <div className="flex justify-between items-start mb-3">
                                    <div><h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white">Haftalık Rapor</h3><p className="text-[10px] md:text-xs text-slate-500 mt-0.5">{new Date(latestReport.timestamp?.seconds * 1000).toLocaleDateString()} • {latestReport.weekId}</p></div>
                                    <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1"><Bell size={12}/> Güncel</div>
                                </div>
                                <div className="text-sm text-slate-600 dark:text-gray-300 leading-relaxed italic border-l-4 border-indigo-500 pl-3 md:pl-4">"{latestReport.data.analysis_summary}"</div>
                            </div>
                            <div className="p-5 grid md:grid-cols-2 gap-6 md:gap-8">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><Activity size={14}/> Odak Konuları</h4>
                                    <div className="flex flex-wrap gap-2">{latestReport.data.weekly_focus_topics?.map((topic, i) => (<span key={i} className="px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold border border-red-100 dark:border-red-800">{topic}</span>))}</div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><CheckSquare size={14}/> Görev Listesi</h4>
                                    <div className="space-y-2">
                                        {latestReport.data.action_plan?.map((task, i) => (
                                            <label key={i} className="flex items-start gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-700/30 cursor-pointer hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
                                                <input type="checkbox" className="mt-0.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"/>
                                                <span className="text-xs md:text-sm text-slate-700 dark:text-gray-200 leading-snug">{task}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 border-t border-slate-100 dark:border-gray-700 flex gap-3">
                                <button onClick={applyRecommendations} disabled={applyingTips} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2">
                                    {applyingTips ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Uygulanıyor...
                                        </>
                                    ) : (
                                        <>
                                            <Download size={18} />
                                            Tavsiyeleri Uyguла
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : !loading && <div className="text-center py-12 text-slate-400"><Brain size={48} className="mx-auto mb-3 opacity-20"/><p>Henüz bir rapor oluşturulmadı.</p></div>}
                </div>
            )}

            {/* 2. GEÇMİŞ */}
            {activeTab === 'history' && (
                <div className="space-y-3 animate-in slide-in-from-right">
                    {history.map((report) => (
                        <div key={report.id} onClick={() => { setLatestReport(report); setActiveTab('current'); }} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm flex justify-between items-center cursor-pointer hover:border-indigo-500 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="bg-slate-100 dark:bg-gray-700 p-2.5 rounded-full text-slate-500"><History size={18}/></div>
                                <div><div className="font-bold text-slate-800 dark:text-white text-sm">{report.weekId || "Eski Rapor"}</div><div className="text-[10px] text-slate-500 dark:text-gray-400">{new Date(report.timestamp?.seconds * 1000).toLocaleDateString()}</div></div>
                            </div>
                            <ChevronRight size={18} className="text-slate-300"/>
                        </div>
                    ))}
                    {history.length === 0 && <div className="text-center text-slate-400 py-10">Arşiv boş.</div>}
                </div>
            )}
        </div>
    );
}