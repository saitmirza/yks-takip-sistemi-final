import React, { useState } from 'react';
import { LineChart as LineIcon, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getMetricConfig } from '../utils/constants';

export default function Stats({ myScores }) {
  const [metric, setMetric] = useState("placementScore");
  const chartData = [...myScores].sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
  const config = getMetricConfig(metric);

  if (myScores.length < 2) return <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 dark:text-slate-500"><TrendingUp size={64} className="mb-4 opacity-20"/><h3 className="text-xl font-bold text-slate-600 dark:text-slate-300">Yeterli Veri Yok</h3><p>Grafik oluşması için en az 2 deneme sonucu gerekiyor.</p></div>;

  return (
    <div className="max-w-5xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-gray-700 h-[600px] flex flex-col transition-colors">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><LineIcon className="text-indigo-600 dark:text-indigo-400"/> Gelişim Grafiği</h2>
                <p className="text-sm text-slate-500 dark:text-gray-400">Netlerini ve puanlarını zaman çizelgesinde gör.</p>
            </div>
            <select value={metric} onChange={(e) => setMetric(e.target.value)} className="bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-slate-700 dark:text-white text-sm rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-gray-600 transition-colors">
                <optgroup label="Genel Puanlar"><option value="placementScore">Yerleştirme Puanı</option><option value="finalScore">Ham Puan</option></optgroup>
                <optgroup label="TYT Netleri"><option value="tytScore">TYT Toplam</option><option value="tytMath">TYT Matematik</option><option value="tytTurkish">TYT Türkçe</option><option value="tytScience">TYT Fen</option><option value="tytSocial">TYT Sosyal</option></optgroup>
                <optgroup label="AYT Netleri"><option value="aytScore">AYT Toplam</option><option value="aytMath">AYT Matematik</option><option value="aytScience">AYT Fen</option></optgroup>
            </select>
        </div>
        <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} vertical={false} />
                    <XAxis dataKey="examName" tick={{fontSize: 10, fill: '#94a3b8'}} tickLine={false} axisLine={false} dy={10}/>
                    <YAxis domain={['auto', 'auto']} tick={{fontSize: 11, fill: '#94a3b8'}} tickLine={false} axisLine={false}/>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)', color: '#fff' }} itemStyle={{ color: config.color, fontWeight: 'bold' }} labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.8rem' }}/>
                    <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                    <Line type="monotone" dataKey={metric === 'tytMath' ? 'tyt.math' : metric === 'tytTurkish' ? 'tyt.turkish' : metric === 'tytScience' ? 'tyt.science' : metric === 'tytSocial' ? 'tyt.social' : metric === 'aytMath' ? 'ayt.math' : metric === 'aytScience' ? 'ayt.science' : metric === 'tytScore' ? 'tyt.score' : metric === 'aytScore' ? 'ayt.score' : metric} name={config.label} stroke={config.color} strokeWidth={4} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 7, fill: config.color }} animationDuration={1500}/>
                </LineChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
}