import React, { useState } from 'react';
import { Calculator, Target, Zap } from 'lucide-react';
import { calculateOBP, getEstimatedRank, calculateScoreSAY } from '../utils/helpers';

const InputGroup = ({ label, value, onChange, max = 40, color = "focus:ring-indigo-500" }) => (
    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</label>
        <input 
          type="number" 
          className={`w-full bg-white border border-slate-200 rounded-lg p-2 text-center font-bold text-slate-700 outline-none focus:ring-2 ${color}`}
          value={value}
          onChange={e => onChange(e.target.value)}
          min="0" max={max}
        />
    </div>
);

export default function Simulator({ currentUser }) {
  const [nets, setNets] = useState({
      tytMath: 30, tytTurk: 30, tytFen: 15, tytSos: 10,
      aytMath: 30, aytFiz: 10, aytKim: 10, aytBiyo: 10
  });
  const [result, setResult] = useState(null);

  const obpData = calculateOBP(currentUser.s9Avg, currentUser.s10Avg, currentUser.s11Avg, currentUser.s12Avg);

  const handleCalculate = async () => {
      // Hesapla
      const scores = calculateScoreSAY(nets);
      
      // OBP Ekle
      const placementScore = scores.say + Number(obpData.placementBonus);
      
      // Sıralama Bul
      const rank = await getEstimatedRank(placementScore);

      setResult({
          ham: scores.say.toFixed(2),
          placement: placementScore.toFixed(2),
          rank: rank
      });
  };

  const handleChange = (field, val) => {
      let v = Number(val);
      if (field.includes('tyt') && v > 40) v = 40;
      if (field === 'tytFen' && v > 20) v = 20;
      if (field === 'tytSos' && v > 20) v = 20;
      if (field === 'aytFiz' && v > 14) v = 14;
      if (field === 'aytKim' && v > 13) v = 13;
      if (field === 'aytBiyo' && v > 13) v = 13;
      setNets(p => ({ ...p, [field]: v }));
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 pb-20">
        <div className="flex-1 bg-white p-6 rounded-3xl shadow-xl border border-slate-100">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Calculator className="text-indigo-600"/> Sayısal Puan Hesapla
            </h2>
            <div className="space-y-6">
                <div>
                    <h3 className="text-xs font-bold text-indigo-600 mb-3 uppercase tracking-wider border-b border-indigo-100 pb-1 flex items-center gap-2"><Zap size={14}/> TYT Netleri</h3>
                    <div className="grid grid-cols-4 gap-2">
                        <InputGroup label="Mat (40)" value={nets.tytMath} onChange={v => handleChange('tytMath', v)} />
                        <InputGroup label="Türk (40)" value={nets.tytTurk} onChange={v => handleChange('tytTurk', v)} />
                        <InputGroup label="Fen (20)" value={nets.tytFen} onChange={v => handleChange('tytFen', v)} max={20} />
                        <InputGroup label="Sos (20)" value={nets.tytSos} onChange={v => handleChange('tytSos', v)} max={20} />
                    </div>
                </div>
                <div>
                    <h3 className="text-xs font-bold text-purple-600 mb-3 uppercase tracking-wider border-b border-purple-100 pb-1 flex items-center gap-2"><Target size={14}/> AYT Sayısal Netleri</h3>
                    <div className="grid grid-cols-4 gap-2">
                        <InputGroup label="Mat (40)" value={nets.aytMath} onChange={v => handleChange('aytMath', v)} color="focus:ring-purple-500"/>
                        <InputGroup label="Fizik (14)" value={nets.aytFiz} onChange={v => handleChange('aytFiz', v)} max={14} color="focus:ring-purple-500"/>
                        <InputGroup label="Kimya (13)" value={nets.aytKim} onChange={v => handleChange('aytKim', v)} max={13} color="focus:ring-purple-500"/>
                        <InputGroup label="Biyo (13)" value={nets.aytBiyo} onChange={v => handleChange('aytBiyo', v)} max={13} color="focus:ring-purple-500"/>
                    </div>
                </div>
                <button onClick={handleCalculate} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                    Hesapla & Sıralamamı Gör
                </button>
            </div>
        </div>
        <div className="w-full md:w-80 flex flex-col gap-4">
            <div className="bg-slate-800 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden min-h-[200px] flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
                <div>
                    <h3 className="font-bold text-slate-300 text-xs uppercase mb-1">Yerleştirme Puanı (SAY)</h3>
                    <div className="text-4xl font-bold text-white tracking-tight">{result ? result.placement : "---"}</div>
                    <div className="text-[10px] text-indigo-300 mt-1 font-medium bg-indigo-500/20 inline-block px-2 py-0.5 rounded">OBP: +{obpData.placementBonus} Eklendi</div>
                </div>
                <div className="pt-4 border-t border-white/10">
                    <div className="text-xs text-slate-400 mb-1 uppercase font-bold">Tahmini Sıralama</div>
                    <div className="text-xl font-bold text-green-400 leading-tight">{result ? result.rank : "Hesaplanmadı"}</div>
                </div>
            </div>
            {result && (
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2 text-sm">
                    <div className="flex justify-between items-center pt-2"><span className="font-bold text-slate-800">Ham Puan</span><span className="font-bold text-indigo-600 text-lg">{result.ham}</span></div>
                    <div className="text-xs text-slate-400 text-center mt-2 bg-slate-50 p-2 rounded">*2024 YKS Sayısal yığılma verilerine göre hesaplanmıştır.</div>
                </div>
            )}
        </div>
    </div>
  );
}