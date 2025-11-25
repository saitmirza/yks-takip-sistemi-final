import React, { useState, useEffect } from 'react';
import { Map, CheckCircle2, Circle, Clock, ChevronDown, ChevronRight, AlertTriangle, Filter } from 'lucide-react';
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
            {/* BAŞLIK */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-gray-700 mb-6 transition-colors">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><Map className="text-indigo-600 dark:text-indigo-400"/> Konu Haritası</h2>
                    <button onClick={() => setShowMissingOnly(!showMissingOnly)} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${showMissingOnly ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 ring-1 ring-orange-400' : 'bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400 hover:bg-slate-200'}`}><Filter size={14}/> {showMissingOnly ? 'Tümü' : 'Eksikler'}</button>
                </div>
                <div className="flex bg-slate-100 dark:bg-gray-700 p-1 rounded-xl">
                    {['TYT', 'AYT'].map(tab => <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700'}`}>{tab} Konuları</button>)}
                </div>
            </div>

            {/* LİSTE */}
            <div className="space-y-4">
                {Object.keys(TOPICS[activeTab]).map((subject) => {
                    const percent = calculatePercentage(subject);
                    const isExpanded = expandedSubjects[subject];
                    return (
                        <div key={subject} className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 overflow-hidden shadow-sm transition-all">
                            <div onClick={() => setExpandedSubjects(p => ({ ...p, [subject]: !p[subject] }))} className="p-4 flex items-center justify-between cursor-pointer bg-slate-50 dark:bg-gray-700/50 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
                                <div className="flex items-center gap-3 flex-1">
                                    {isExpanded ? <ChevronDown size={20} className="text-slate-400"/> : <ChevronRight size={20} className="text-slate-400"/>}
                                    <div className="font-bold text-slate-700 dark:text-white">{subject}</div>
                                </div>
                                <div className="flex items-center gap-3"><div className="w-24 md:w-40 h-2 bg-slate-200 dark:bg-gray-600 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${percent}%` }}></div></div><span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 w-8 text-right">%{percent}</span></div>
                            </div>
                            {isExpanded && (
                                <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-2 bg-white dark:bg-gray-800">
                                    {TOPICS[activeTab][subject].map(topic => {
                                        const item = progress[`${subject}_${topic}`] || { status: 0 };
                                        if (showMissingOnly && item.status === 2) return null;
                                        return (
                                            <div key={topic} onClick={() => handleToggle(subject, topic)} className={`p-3 rounded-xl flex items-center justify-between cursor-pointer border transition-all select-none 
                                                ${item.status === 0 ? 'bg-white dark:bg-gray-800 border-slate-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-500 text-slate-500 dark:text-gray-400' : ''} 
                                                ${item.status === 1 ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400' : ''} 
                                                ${item.status === 2 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' : ''}`}>
                                                <div className="flex items-center gap-3">
                                                    {item.status === 0 && <Circle size={18} className="text-slate-300 dark:text-gray-600"/>}
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