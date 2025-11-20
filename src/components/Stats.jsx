import React, { useState } from 'react';
import { LineChart as LineIcon, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getMetricConfig } from '../utils/constants';

export default function Stats({ myScores }) {
  const [metric, setMetric] = useState("placementScore");

  // Grafiği tersten (eskiden yeniye) sıralayalım ki çizgi soldan sağa gitsin
  const chartData = [...myScores].sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
  
  const config = getMetricConfig(metric);

  if (myScores.length < 2) {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
              <TrendingUp size={64} className="mb-4 opacity-20"/>
              <h3 className="text-xl font-bold text-slate-600">Yeterli Veri Yok</h3>
              <p>Grafik oluşması için en az 2 deneme sonucu gerekiyor.</p>
          </div>
      );
  }

  return (
    <div className="max-w-5xl mx-auto bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-[600px] flex flex-col">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <LineIcon className="text-indigo-600"/> Gelişim Grafiği
                </h2>
                <p className="text-sm text-slate-500">Netlerini ve puanlarını zaman çizelgesinde gör.</p>
            </div>
            
            <select 
                value={metric} 
                onChange={(e) => setMetric(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer hover:bg-slate-100 transition-colors"
            >
                <optgroup label="Genel Puanlar">
                    <option value="placementScore">Yerleştirme Puanı (Y-Puan)</option>
                    <option value="finalScore">Ham Puan</option>
                </optgroup>
                <optgroup label="TYT Netleri">
                    <option value="tytScore">TYT Toplam Puan</option>
                    <option value="tytMath">TYT Matematik</option>
                    <option value="tytTurkish">TYT Türkçe</option>
                    <option value="tytScience">TYT Fen</option>
                    <option value="tytSocial">TYT Sosyal</option>
                </optgroup>
                <optgroup label="AYT Netleri">
                    <option value="aytScore">AYT Toplam Puan</option>
                    <option value="aytMath">AYT Matematik</option>
                    <option value="aytScience">AYT Fen</option>
                </optgroup>
            </select>
        </div>

        <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                        dataKey="examName" 
                        tick={{fontSize: 10, fill: '#64748b'}} 
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                    />
                    <YAxis 
                        domain={['auto', 'auto']} 
                        tick={{fontSize: 11, fill: '#64748b'}} 
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: config.color, fontWeight: 'bold' }}
                        labelStyle={{ color: '#64748b', marginBottom: '0.5rem', fontSize: '0.8rem' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                    <Line 
                        type="monotone" 
                        dataKey={metric === 'tytMath' ? 'tyt.math' : 
                                 metric === 'tytTurkish' ? 'tyt.turkish' : 
                                 metric === 'tytScience' ? 'tyt.science' : 
                                 metric === 'tytSocial' ? 'tyt.social' :
                                 metric === 'aytMath' ? 'ayt.math' :
                                 metric === 'aytScience' ? 'ayt.science' :
                                 metric === 'tytScore' ? 'tyt.score' :
                                 metric === 'aytScore' ? 'ayt.score' :
                                 metric} 
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