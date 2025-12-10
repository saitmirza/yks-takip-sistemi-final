import React, { useState, useEffect } from 'react';
import { Download, Heart, Flag, Search, Filter, X, ExternalLink } from 'lucide-react';
import { searchResources, downloadResource, toggleLike, reportResource } from '../utils/resourceLibraryService';
import StudentResourceUpload from './StudentResourceUpload';

export default function ResourceLibrary({ currentUser }) {
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [likedResources, setLikedResources] = useState(new Set());
    const [reportModal, setReportModal] = useState(null);
    const [reportData, setReportData] = useState({ reason: '', description: '' });

    const [filters, setFilters] = useState({
        category: 'TYT',
        subject: '',
        type: '',
        sortBy: 'newest'
    });

    const CATEGORIES = {
        'TYT': ['Matematik', 'Türkçe', 'Sosyal Bilgiler', 'Fen Bilimleri'],
        'AYT': ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Türkçe', 'Tarih', 'Coğrafya'],
        'YDT': ['İngilizce']
    };

    const TYPES = ['Deneme', 'Konu Özeti', 'Çıkmış Soru', 'Hap Bilgi', 'Konu Anlatımı', 'Çalışma Notu'];
    const REPORT_REASONS = ['Bozuk Dosya', 'Hatalı İçerik', 'Telif Hakkı', 'Uygunsuz'];

    useEffect(() => {
        fetchResources();
    }, []);

    const fetchResources = async (filterObj = filters) => {
        setLoading(true);
        try {
            const result = await searchResources(filterObj);
            if (result.success) {
                setResources(result.resources);
            }
        } catch (error) {
            console.error("Kaynak çekme hatası:", error);
        }
        setLoading(false);
    };

    // Yükleme Sonrası Yenileme (Fix)
    const handleUploadSuccess = () => {
        fetchResources(); // Listeyi yenile
    };

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        if (key === 'category') {
            newFilters.subject = '';
        }
        setFilters(newFilters);
        fetchResources(newFilters);
    };

    const handleDownload = async (resource) => {
        try {
            await downloadResource(resource.id, currentUser.internalId);
            
            let url = resource.fileUrl;
            if (!url) return alert("Dosya bağlantısı bulunamadı.");

            if (url.includes("cloudinary.com") && !url.includes("fl_attachment")) {
                url = url.replace("/upload/", "/upload/fl_attachment/");
            }

            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', resource.fileName || 'dosya');
            link.setAttribute('target', '_blank'); 
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("İndirme hatası:", error);
            window.open(resource.fileUrl, '_blank');
        }
    };

    const handleLike = async (resource) => {
        const result = await toggleLike(resource.id, currentUser.internalId);
        if (result.success) {
            if (result.liked) {
                setLikedResources(prev => new Set(prev).add(resource.id));
            } else {
                const newLiked = new Set(likedResources);
                newLiked.delete(resource.id);
                setLikedResources(newLiked);
            }
        }
    };

    const handleReport = async () => {
        if (!reportData.reason) return alert("Neden seçin.");
        const result = await reportResource(reportModal.id, currentUser.internalId, reportData.reason, reportData.description);
        if (result.success) {
            alert(result.message);
            setReportModal(null);
            setReportData({ reason: '', description: '' });
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
    };

    const getSourceBadge = (source) => {
        if (source === 'official') return <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/30">🏛️ KURUMSAL</span>;
        return <span className="text-[10px] font-bold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">✓ ONAYLANMIŞ</span>;
    };

    // Ortak Input Stili (Glass içinde görünür olması için)
    const inputStyle = {
        backgroundColor: '#1e293b', 
        color: 'white', 
        border: '1px solid #334155'
    };

    return (
        <div className="w-full pb-24 space-y-4">
            {/* BAŞLIK (GLASS FIX) */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold mb-1">📚 Kaynak Kütüphanesi</h2>
                    <p className="text-indigo-200 text-sm">Binlerce not, deneme ve çıkmış soru...</p>
                </div>
                {/* Upload bileşenine success callback'i geçiriyoruz */}
                <StudentResourceUpload currentUser={currentUser} onSuccess={handleUploadSuccess} />
            </div>

            {/* FİLTRELER (GLASS FIX) */}
            <div className="glass-box rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Filter size={18} className="text-indigo-400"/> Filtrele
                    </h3>
                    <button onClick={() => setShowFilters(!showFilters)} className="text-indigo-400 font-bold text-sm hover:text-white transition-colors">
                        {showFilters ? 'Gizle' : 'Göster'}
                    </button>
                </div>

                {showFilters && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-white/10">
                        <select className="p-2 rounded-lg text-sm outline-none" style={inputStyle} value={filters.category} onChange={e => handleFilterChange('category', e.target.value)}>
                            {Object.keys(CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <select className="p-2 rounded-lg text-sm outline-none" style={inputStyle} value={filters.subject} onChange={e => handleFilterChange('subject', e.target.value)}>
                            <option value="">Tüm Dersler</option>{CATEGORIES[filters.category]?.map(subject => <option key={subject} value={subject}>{subject}</option>)}
                        </select>
                        <select className="p-2 rounded-lg text-sm outline-none" style={inputStyle} value={filters.type} onChange={e => handleFilterChange('type', e.target.value)}>
                            <option value="">Tüm Türler</option>{TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                        <select className="p-2 rounded-lg text-sm outline-none" style={inputStyle} value={filters.sortBy} onChange={e => handleFilterChange('sortBy', e.target.value)}>
                            <option value="newest">Yeni Sırası</option><option value="popular">Popüler</option><option value="rating">En Beğenilen</option>
                        </select>
                    </div>
                )}
            </div>

            {/* LİSTE (GLASS FIX) */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-slate-400">Kaynaklar yükleniyor...</p>
                </div>
            ) : resources.length === 0 ? (
                <div className="text-center py-12 glass-box rounded-2xl">
                    <p className="text-slate-400">Bu filtreyle eşleşen kaynak bulunamadı.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {resources.map(resource => (
                        <div key={resource.id} className="glass-box rounded-2xl overflow-hidden hover:shadow-lg transition-all hover:border-indigo-500/50 flex flex-col group">
                            
                            <div className="p-4 border-b border-white/10 bg-white/5">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <h3 className="font-bold text-white text-sm line-clamp-2 flex-1 group-hover:text-indigo-400 transition-colors">{resource.title}</h3>
                                    {getSourceBadge(resource.source)}
                                </div>
                                <p className="text-xs text-slate-400 line-clamp-2">{resource.description}</p>
                            </div>

                            <div className="px-4 py-3 bg-black/20 space-y-2 flex-1">
                                <div className="grid grid-cols-2 text-[11px] gap-2">
                                    <div><span className="font-bold text-slate-400">Ders:</span> <span className="text-indigo-400 font-bold">{resource.subject}</span></div>
                                    <div><span className="font-bold text-slate-400">Tür:</span> <span className="text-slate-200 font-bold">{resource.type}</span></div>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-white/5">
                                    <span>📏 {formatFileSize(resource.fileSize)}</span>
                                    <span>👤 {resource.uploaderName}</span>
                                </div>
                            </div>

                            <div className="px-4 py-3 flex items-center justify-around text-xs font-bold border-t border-white/10 bg-white/5">
                                <div className="text-center"><p className="text-slate-500">İndir</p><p className="text-white text-lg">{resource.downloads}</p></div>
                                <div className="text-center"><p className="text-slate-500">Beğeni</p><p className="text-white text-lg">{resource.likes}</p></div>
                                <div className="text-center"><p className="text-slate-500">Gör.</p><p className="text-white text-lg">{resource.views}</p></div>
                            </div>

                            <div className="p-3 border-t border-white/10 flex gap-2 bg-black/20">
                                <button onClick={() => handleDownload(resource)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-1 text-sm transition-colors shadow-lg"><Download size={16} /> İndir</button>
                                <button onClick={() => handleLike(resource)} className={`flex-1 font-bold py-2 rounded-lg flex items-center justify-center gap-1 text-sm transition-colors ${likedResources.has(resource.id) ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-white/10 text-slate-400 hover:bg-white/20 hover:text-white'}`}><Heart size={16} fill={likedResources.has(resource.id) ? 'currentColor' : 'none'} /></button>
                                <button onClick={() => setReportModal(resource)} className="flex-1 bg-white/10 text-slate-400 hover:bg-white/20 hover:text-white font-bold py-2 rounded-lg flex items-center justify-center gap-1 text-sm transition-colors"><Flag size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* RAPOR MODALI (GLASS FIX) */}
            {reportModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
                    <div className="glass-box rounded-2xl shadow-2xl w-full max-w-md p-6 border border-white/10 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-white flex items-center gap-2"><Flag size={20} className="text-red-500" /> Sorun Bildir</h3>
                            <button onClick={() => setReportModal(null)}><X size={20} className="text-slate-400 hover:text-white" /></button>
                        </div>
                        <p className="text-xs text-slate-400 mb-4">"{reportModal.title}" dosyası hakkında sorun bildir.</p>
                        <div className="space-y-3">
                            <select className="w-full p-3 rounded-lg text-sm" style={inputStyle} value={reportData.reason} onChange={e => setReportData({ ...reportData, reason: e.target.value })}><option value="">Neden Seçin...</option>{REPORT_REASONS.map(reason => <option key={reason} value={reason}>{reason}</option>)}</select>
                            <textarea placeholder="Detaylı açıklama..." className="w-full p-3 rounded-lg text-sm h-24 resize-none" style={inputStyle} value={reportData.description} onChange={e => setReportData({ ...reportData, description: e.target.value })}/>
                            <div className="flex gap-2">
                                <button onClick={() => setReportModal(null)} className="flex-1 py-2 text-slate-400 font-bold bg-white/10 rounded-lg hover:bg-white/20">İptal</button>
                                <button onClick={handleReport} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg">Gönder</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}