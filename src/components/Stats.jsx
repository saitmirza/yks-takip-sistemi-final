import React, { useState } from 'react';
import { LineChart as LineIcon, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getMetricConfig } from '../utils/constants';

export default function Stats({ myScores }) {
  const [metric, setMetric] = useState("placementScore");
  const chartData = [...myScores].sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
  const config = getMetricConfig(metric);

  // YETERLİ VERİ YOKSA (BOŞ DURUM - GLASS FIX)
  if (myScores.length < 2) return (
    <div className="max-w-5xl mx-auto glass-box p-6 rounded-3xl flex flex-col items-center justify-center h-[60vh] text-slate-400 text-center">
        <TrendingUp size={64} className="mb-4 opacity-20"/>
        <h3 className="text-xl font-bold text-white">Yeterli Veri Yok</h3>
        <p>Grafik oluşması için en az 2 deneme sonucu gerekiyor.</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto glass-box p-6 rounded-3xl shadow-sm h-[600px] flex flex-col transition-colors">
        
        {/* ÜST KISIM */}
        <div className="flex justify-between items-center mb-8">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <LineIcon className="text-indigo-400"/> Gelişim Grafiği
                </h2>
                <p className="text-sm text-slate-400">Netlerini ve puanlarını zaman çizelgesinde gör.</p>
            </div>
            
            {/* DROPDOWN FIX */}
            <select 
                value={metric} 
                onChange={(e) => setMetric(e.target.value)} 
                className="bg-black/20 border border-white/10 text-white text-sm rounded-xl p-3 outline-none focus:border-indigo-500 font-medium cursor-pointer [&>optgroup]:text-black [&>option]:text-black"
            >
                <optgroup label="Genel Puanlar">
                    <option value="placementScore">Yerleştirme Puanı</option>
                    <option value="finalScore">Ham Puan</option>
                </optgroup>
                <optgroup label="TYT Netleri">
                    <option value="tytScore">TYT Toplam</option>
                    <option value="tytMath">TYT Matematik</option>
                    <option value="tytTurkish">TYT Türkçe</option>
                    <option value="tytScience">TYT Fen</option>
                    <option value="tytSocial">TYT Sosyal</option>
                </optgroup>
                <optgroup label="AYT Netleri">
                    <option value="aytScore">AYT Toplam</option>
                    <option value="aytMath">AYT Matematik</option>
                    <option value="aytScience">AYT Fen</option>
                </optgroup>
            </select>
        </div>

        {/* GRAFİK ALANI */}
        <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis 
                        dataKey="examName" 
                        tick={{fontSize: 10, fill: '#94a3b8'}} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={10}
                    />
                    <YAxis 
                        domain={['auto', 'auto']} 
                        tick={{fontSize: 11, fill: '#94a3b8'}} 
                        tickLine={false} 
                        axisLine={false}
                    />
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: '#0f172a', // Slate-900
                            borderRadius: '12px', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)', 
                            color: '#fff' 
                        }} 
                        itemStyle={{ color: config.color, fontWeight: 'bold' }} 
                        labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.8rem' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                    <Line 
                        type="monotone" 
                        dataKey={metric === 'tytMath' ? 'tyt.math' : metric === 'tytTurkish' ? 'tyt.turkish' : metric === 'tytScience' ? 'tyt.science' : metric === 'tytSocial' ? 'tyt.social' : metric === 'aytMath' ? 'ayt.math' : metric === 'aytScience' ? 'ayt.science' : metric === 'tytScore' ? 'tyt.score' : metric === 'aytScore' ? 'ayt.score' : metric} 
                        name={config.label} 
                        stroke={config.color} 
                        strokeWidth={4} 
                        dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} 
                        activeDot={{ r: 7, fill: config.color }} 
                        animationDuration={1500}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
}