import React, { useState } from 'react';
import { Trophy, Medal, BarChart3, Trash2, School, Users } from 'lucide-react';
import { DEMO_INTERNAL_ID, APP_ID } from '../utils/constants';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Leaderboard({ allScores, usersList, currentUser, onUserClick }) {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [sortMetric, setSortMetric] = useState("placementScore");
  const [scope, setScope] = useState("class"); // 'school' veya 'class'

  const uniqueExamNames = [...new Set(allScores.map(s => s.examName))].sort();

  const handleDeleteScore = async (scoreId) => {
    if(!currentUser.isAdmin) return;
    if(confirm("Bu sonucu silmek istediğine emin misin?")) {
        try { await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'exam_scores_v3', scoreId)); } 
        catch (error) { console.error(error); }
    }
  };

  const getLeaderboardData = () => {
    let data = [...allScores];
    
    // 1. KULLANICI FİLTRESİ (Demo/Admin Gizle)
    if (!currentUser.isDemo) data = data.filter(s => s.internalUserId !== DEMO_INTERNAL_ID);

    // 2. KAPSAM FİLTRESİ (Okul vs Sınıf)
    if (scope === 'class' && !currentUser.isAdmin) {
        // Sadece benim sınıfımdaki kullanıcıların ID'lerini bul
        const classMatesIds = usersList
            .filter(u => u.classSection === currentUser.classSection)
            .map(u => u.internalId);
        
        // Skorları bu ID'lere göre filtrele
        data = data.filter(s => classMatesIds.includes(s.internalUserId));
    }

    // 3. SINAV FİLTRESİ (Genel vs Özel Sınav)
    if (selectedFilter === "all") {
       const stats = {};
       data.forEach(score => {
         const uid = score.internalUserId;
         if (!stats[uid]) stats[uid] = { ...score, totalP: 0, totalF: 0, count: 0 };
         stats[uid].totalP += score.placementScore;
         stats[uid].totalF += score.finalScore;
         stats[uid].count += 1;
       });
       return Object.values(stats).map(s => ({
         ...s,
         examName: "Genel Ortalama",
         placementScore: Number((s.totalP / s.count).toFixed(2)),
         finalScore: Number((s.totalF / s.count).toFixed(2)),
         detail: `${s.count} Sınav`,
         isAvg: true
       })).sort((a, b) => b[sortMetric] - a[sortMetric]);
    } else {
       return data.filter(s => s.examName === selectedFilter).sort((a, b) => b[sortMetric] - a[sortMetric]);
    }
  };

  const rankings = getLeaderboardData();

  const AvatarDisplay = ({ uid }) => {
    const user = usersList.find(u => u.internalId === uid);
    const avatarData = user?.base64Avatar || user?.avatar || "👤";
    const isBase64 = avatarData.startsWith('data:');
    return (
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 overflow-hidden flex items-center justify-center text-lg">
            {isBase64 ? <img src={avatarData} className="w-full h-full object-cover" /> : avatarData}
        </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
       
       {/* Üst Bar: Başlık ve Kapsam Seçici */}
       <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 bg-white dark:bg-slate-900/60 dark:backdrop-blur-md dark:border-slate-700 p-6 rounded-3xl shadow-sm border border-slate-100 transition-colors">
          <div>
             <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><Trophy className="text-yellow-500" /> Liderlik Tablosu</h2>
             <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Rekabet durumunu analiz et.</p>
          </div>
          
          {/* KAPSAM SEÇİCİ (Class / School) */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button 
                onClick={() => setScope('class')} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${scope === 'class' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-white' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700'}`}
              >
                  <Users size={16}/> Sınıfım
              </button>
              <button 
                onClick={() => setScope('school')} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${scope === 'school' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-white' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700'}`}
              >
                  <School size={16}/> Okul Geneli
              </button>
          </div>
       </div>

       {/* Filtreler */}
       <div className="flex gap-3 justify-end">
             <select className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-medium" value={selectedFilter} onChange={(e) => setSelectedFilter(e.target.value)}>
                <option value="all">🏆 Genel Başarı Ortalaması</option>
                <optgroup label="Denemeler">
                    {uniqueExamNames.map(n => <option key={n} value={n}>{n}</option>)}
                </optgroup>
             </select>
             <select className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-medium" value={sortMetric} onChange={(e) => setSortMetric(e.target.value)}>
                <option value="placementScore">Yerleştirme Puanı</option>
                <option value="finalScore">Ham Puan</option>
             </select>
       </div>

       {/* Tablo */}
       <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-md rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700 transition-colors">
          <table className="w-full text-left border-collapse">
             <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700 text-xs uppercase text-slate-400 dark:text-slate-500 font-bold tracking-wider">
                   <th className="p-5 w-16 text-center">#</th>
                   <th className="p-5">Öğrenci</th>
                   <th className="p-5 hidden md:table-cell">Detay</th>
                   <th className="p-5 text-right text-indigo-600 dark:text-indigo-400">Puan</th>
                   {currentUser.isAdmin && selectedFilter !== 'all' && <th className="p-5 text-right">İşlem</th>}
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {rankings.length > 0 ? rankings.map((item, index) => {
                    const isMe = item.internalUserId === currentUser.internalId;
                    return (
                        <tr key={index} className={`group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${isMe ? 'bg-indigo-50/30 dark:bg-indigo-900/20 hover:bg-indigo-50/50' : ''}`}>
                           <td className="p-5 text-center font-bold text-slate-600 dark:text-slate-400">
                              {index === 0 ? <Medal className="text-yellow-500 mx-auto" /> : index === 1 ? <Medal className="text-gray-400 mx-auto" /> : index === 2 ? <Medal className="text-orange-400 mx-auto" /> : index + 1}
                           </td>
                           <td className="p-5">
                              <div className="flex items-center gap-3 cursor-pointer" onClick={() => onUserClick && onUserClick(item.internalUserId)}>
                                 <AvatarDisplay uid={item.internalUserId} />
                                 <div>
                                    <div className={`font-bold ${isMe ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'} hover:underline`}>
                                        {item.realName || item.userName} {isMe && "(Sen)"}
                                    </div>
                                    <div className="text-xs text-slate-400 md:hidden">{item.detail || item.examName}</div>
                                 </div>
                              </div>
                           </td>
                           <td className="p-5 hidden md:table-cell text-sm text-slate-500 dark:text-slate-400 font-medium">
                              {item.detail ? <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-300">{item.detail}</span> : item.examName}
                           </td>
                           <td className="p-5 text-right">
                               <div className="text-lg font-bold text-slate-800 dark:text-white">{sortMetric === 'placementScore' ? item.placementScore : item.finalScore}</div>
                           </td>
                           {currentUser.isAdmin && selectedFilter !== 'all' && (
                               <td className="p-5 text-right">
                                   <button onClick={() => handleDeleteScore(item.id)} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 rounded-full transition-colors"><Trash2 size={18} /></button>
                               </td>
                           )}
                        </tr>
                    );
                }) : <tr><td colSpan="5" className="p-12 text-center text-slate-400"><BarChart3 size={48} className="opacity-20 mx-auto mb-2"/>Veri Yok</td></tr>}
             </tbody>
          </table>
       </div>
    </div>
  );
}