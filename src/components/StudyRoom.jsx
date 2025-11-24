import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { User, Clock, BookOpen } from 'lucide-react';

export default function StudyRoom() {
    const [activeStudents, setActiveStudents] = useState([]);

    useEffect(() => {
        // Şu an "isStudying" durumu true olan öğrencileri çek
        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts'), where("isStudying", "==", true));
        
        const unsub = onSnapshot(q, (snap) => {
            setActiveStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

    // 12 Masalık bir sınıf oluşturuyoruz
    const desks = Array.from({ length: 12 });

    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
            <div className="bg-indigo-900 rounded-3xl p-8 shadow-2xl relative overflow-hidden flex-1 border-4 border-indigo-800">
                {/* Zemin Deseni */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                
                <div className="relative z-10 text-center mb-8">
                    <h2 className="text-3xl font-bold text-white flex justify-center items-center gap-3"><Clock className="animate-pulse text-green-400"/> Sanal Etüt Odası</h2>
                    <p className="text-indigo-200 mt-2">Şu an {activeStudents.length} kişi odaklanmış ders çalışıyor. Sessizlik! 🤫</p>
                </div>

                {/* Masalar Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 relative z-10">
                    {desks.map((_, i) => {
                        const student = activeStudents[i]; // Masaya oturan öğrenci
                        return (
                            <div key={i} className="flex flex-col items-center group perspective">
                                {/* Masa Lambası Efekti */}
                                <div className={`w-24 h-24 rounded-full flex items-center justify-center relative transition-all duration-500 ${student ? 'bg-indigo-600 shadow-[0_0_40px_rgba(79,70,229,0.6)] scale-110' : 'bg-slate-800/50 border-2 border-dashed border-slate-600'}`}>
                                    {student ? (
                                        <div className="relative">
                                            {student.avatar?.startsWith('data:') ? 
                                                <img src={student.avatar} className="w-20 h-20 rounded-full object-cover border-4 border-white/20"/> : 
                                                <span className="text-4xl">{student.avatar}</span>
                                            }
                                            <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-4 border-indigo-900 animate-bounce"></div>
                                        </div>
                                    ) : (
                                        <User className="text-slate-600 opacity-50" size={32}/>
                                    )}
                                </div>

                                {/* Masa Bilgisi (Tooltip) */}
                                <div className="mt-4 text-center">
                                    {student ? (
                                        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 animate-in slide-in-from-bottom-2">
                                            <div className="font-bold text-white text-sm">{student.username}</div>
                                            <div className="text-[10px] text-indigo-200 flex items-center justify-center gap-1 mt-1">
                                                <BookOpen size={10}/> {student.currentStudyTopic || "Ders Çalışıyor"}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-slate-600 text-xs font-bold uppercase tracking-widest">Boş Masa</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}