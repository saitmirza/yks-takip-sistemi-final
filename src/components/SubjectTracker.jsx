import React, { useState, useEffect } from 'react';
import { Map, CheckCircle2, Circle, Clock, ChevronDown, ChevronRight, Filter } from 'lucide-react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { TOPICS } from '../utils/topics';

export default function SubjectTracker({ currentUser }) {
    const [activeTab, setActiveTab] = useState("TYT");
    const [progress, setProgress] = useState({});
    const [expandedSubjects, setExpandedSubjects] = useState({});
    const [showMissingOnly, setShowMissingOnly] = useState(false);

    useEffect(() => {
        const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email);
        const unsub = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) setProgress(docSnap.data().subjectProgress || {});
        });
        return () => unsub();
    }, [currentUser]);

    const handleToggle = async (subject, topic) => {
        const key = `${subject}_${topic}`;
        const current = progress[key] || { status: 0, date: null };
        let nextStatus = current.status === 2 ? 0 : current.status + 1;
        const newProgress = { ...progress, [key]: { status: nextStatus, date: nextStatus === 2 ? Date.now() : null } };
        await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email), { subjectProgress: newProgress });
    };

    const calculatePercentage = (subject) => {
        const topics = TOPICS[activeTab][subject];
        const completed = topics.filter(t => progress[`${subject}_${t}`]?.status === 2).length;
        return Math.round((completed / topics.length) * 100);
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* BAŞLIK (GLASS FIX) */}
            <div className="glass-box p-6 rounded-3xl shadow-sm mb-6 transition-colors">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Map className="text-indigo-400"/> Konu Haritası</h2>
                    <button onClick={() => setShowMissingOnly(!showMissingOnly)} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${showMissingOnly ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}><Filter size={14}/> {showMissingOnly ? 'Tümü' : 'Eksikler'}</button>
                </div>
                <div className="flex bg-black/20 p-1 rounded-xl">
                    {['TYT', 'AYT'].map(tab => <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>{tab} Konuları</button>)}
                </div>
            </div>

            {/* LİSTE */}
            <div className="space-y-4">
                {Object.keys(TOPICS[activeTab]).map((subject) => {
                    const percent = calculatePercentage(subject);
                    const isExpanded = expandedSubjects[subject];
                    return (
                        <div key={subject} className="glass-box rounded-2xl overflow-hidden shadow-sm transition-all">
                            <div onClick={() => setExpandedSubjects(p => ({ ...p, [subject]: !p[subject] }))} className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3 flex-1">
                                    {isExpanded ? <ChevronDown size={20} className="text-slate-400"/> : <ChevronRight size={20} className="text-slate-400"/>}
                                    <div className="font-bold text-white">{subject}</div>
                                </div>
                                <div className="flex items-center gap-3"><div className="w-24 md:w-40 h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${percent}%` }}></div></div><span className="text-xs font-bold text-indigo-400 w-8 text-right">%{percent}</span></div>
                            </div>
                            {isExpanded && (
                                <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-2 bg-black/20">
                                    {TOPICS[activeTab][subject].map(topic => {
                                        const item = progress[`${subject}_${topic}`] || { status: 0 };
                                        if (showMissingOnly && item.status === 2) return null;
                                        return (
                                            <div key={topic} onClick={() => handleToggle(subject, topic)} className={`p-3 rounded-xl flex items-center justify-between cursor-pointer border transition-all select-none 
                                                ${item.status === 0 ? 'bg-white/5 border-white/5 hover:border-indigo-500/50 text-slate-400' : ''} 
                                                ${item.status === 1 ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : ''} 
                                                ${item.status === 2 ? 'bg-green-500/10 border-green-500/30 text-green-400' : ''}`}>
                                                <div className="flex items-center gap-3">
                                                    {item.status === 0 && <Circle size={18} className="text-slate-500"/>}
                                                    {item.status === 1 && <Clock size={18} className="text-yellow-500 animate-pulse"/>}
                                                    {item.status === 2 && <CheckCircle2 size={18} className="text-green-500"/>}
                                                    <span className="text-sm font-medium">{topic}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}