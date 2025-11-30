import React, { useState } from 'react';
import { Users, CheckCircle, AlertCircle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';

export default function ClassSelectionModal({ currentUser, setCurrentUser }) {
    const [selectedClass, setSelectedClass] = useState("");
    const [loading, setLoading] = useState(false);

    const classes = ["12-A", "12-B", "12-C", "12-D", "12-E", "12-F", "Mezun"];

    const handleSave = async () => {
        if (!selectedClass) return alert("Lütfen sınıfını seç.");
        setLoading(true);
        
        try {
            const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_accounts', currentUser.email);
            await updateDoc(userRef, { classSection: selectedClass });

            // Yerel state'i güncelle ki modal kapansın
            setCurrentUser(prev => ({ ...prev, classSection: selectedClass }));
            localStorage.setItem('examApp_session', JSON.stringify({ ...currentUser, classSection: selectedClass }));
            
            // Sayfayı yenilemeye gerek yok, state değişince modal gider.
        } catch (error) {
            console.error("Sınıf kayıt hatası:", error);
            alert("Bir hata oluştu.");
        }
        setLoading(false);
    };

    // Eğer kullanıcının zaten sınıfı varsa veya Admin/Demo ise bu modalı gösterme
    if (currentUser.classSection || currentUser.isAdmin || currentUser.isDemo) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl max-w-md w-full border-2 border-indigo-500 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500"></div>
                
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-white">
                        <Users size={32}/>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Hangi Sınıftasın?</h2>
                    <p className="text-slate-500 dark:text-gray-400 mt-2 text-sm">
                        Sohbet odaları ve sıralamalar artık sınıflara göre ayrılıyor. Lütfen sınıfını seç. 
                        <br/><span className="text-red-500 font-bold block mt-1">(Bu işlem sadece bir kez yapılır!)</span>
                    </p>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                    {classes.map(cls => (
                        <button
                            key={cls}
                            onClick={() => setSelectedClass(cls)}
                            className={`py-3 rounded-xl text-sm font-bold transition-all border-2 
                                ${selectedClass === cls 
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-white shadow-md scale-105' 
                                    : 'border-slate-200 dark:border-gray-600 text-slate-500 dark:text-gray-400 hover:border-indigo-300'}`}
                        >
                            {cls}
                        </button>
                    ))}
                </div>

                <button 
                    onClick={handleSave} 
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? "Kaydediliyor..." : <><CheckCircle size={20}/> Onayla ve Devam Et</>}
                </button>
            </div>
        </div>
    );
}