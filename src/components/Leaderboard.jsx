import React, { useState } from 'react';
import { Trophy, Medal, BarChart3, Trash2 } from 'lucide-react';
import { DEMO_INTERNAL_ID, APP_ID } from '../utils/constants';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Leaderboard({ allScores, usersList, currentUser, onUserClick }) {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [sortMetric, setSortMetric] = useState("placementScore");

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
    if (!currentUser.isDemo) data = data.filter(s => s.internalUserId !== DEMO_INTERNAL_ID);
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
        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-lg">
            {isBase64 ? <img src={avatarData} className="w-full h-full object-cover" /> : avatarData}
        </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div>
             <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Trophy className="text-yellow-500" /> Liderlik Tablosu</h2>
             <p className="text-slate-500 text-sm mt-1">Sınıfındaki rekabet durumunu gör.</p>
          </div>
          <div className="flex gap-3">
             <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-medium" value={selectedFilter} onChange={(e) => setSelectedFilter(e.target.value)}>
                <option value="all">🏆 Genel Başarı</option>
                <optgroup label="Denemeler">
                    {uniqueExamNames.map(n => <option key={n} value={n}>{n}</option>)}
                </optgroup>
             </select>
             <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-medium" value={sortMetric} onChange={(e) => setSortMetric(e.target.value)}>
                <option value="placementScore">Yerleştirme Puanı</option>
                <option value="finalScore">Ham Puan</option>
             </select>
          </div>
       </div>

       <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          <table className="w-full text-left border-collapse">
             <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-xs uppercase text-slate-400 font-bold tracking-wider">
                   <th className="p-5 w-16 text-center">#</th>
                   <th className="p-5">Öğrenci</th>
                   <th className="p-5 hidden md:table-cell">Detay</th>
                   <th className="p-5 text-right text-indigo-600">Puan</th>
                   {currentUser.isAdmin && selectedFilter !== 'all' && <th className="p-5 text-right">İşlem</th>}
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
                {rankings.length > 0 ? rankings.map((item, index) => {
                    const isMe = item.internalUserId === currentUser.internalId;
                    return (
                        <tr key={index} className={`group transition-colors hover:bg-slate-50/80 ${isMe ? 'bg-indigo-50/30 hover:bg-indigo-50/50' : ''}`}>
                           <td className="p-5 text-center font-bold text-slate-600">
                              {index === 0 ? <Medal className="text-yellow-500 mx-auto" /> : index === 1 ? <Medal className="text-gray-400 mx-auto" /> : index === 2 ? <Medal className="text-orange-400 mx-auto" /> : index + 1}
                           </td>
                           <td className="p-5">
                              {/* TIKLANABİLİR ALAN */}
                              <div 
                                className="flex items-center gap-3 cursor-pointer" 
                                onClick={() => onUserClick && onUserClick(item.internalUserId)}
                              >
                                 <AvatarDisplay uid={item.internalUserId} />
                                 <div>
                                    <div className={`font-bold ${isMe ? 'text-indigo-700' : 'text-slate-700'} hover:underline`}>
                                        {item.realName || item.userName} {isMe && "(Sen)"}
                                    </div>
                                    <div className="text-xs text-slate-400 md:hidden">{item.detail || item.examName}</div>
                                 </div>
                              </div>
                           </td>
                           <td className="p-5 hidden md:table-cell text-sm text-slate-500 font-medium">
                              {item.detail ? <span className="bg-slate-100 px-2 py-1 rounded text-slate-600">{item.detail}</span> : item.examName}
                           </td>
                           <td className="p-5 text-right">
                               <div className="text-lg font-bold text-slate-800">{sortMetric === 'placementScore' ? item.placementScore : item.finalScore}</div>
                           </td>
                           {currentUser.isAdmin && selectedFilter !== 'all' && (
                               <td className="p-5 text-right">
                                   <button onClick={() => handleDeleteScore(item.id)} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"><Trash2 size={18} /></button>
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