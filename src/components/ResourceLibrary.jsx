import React, { useState, useEffect } from 'react';
import { Download, Heart, Flag, Search, Filter, X } from 'lucide-react';
import { searchResources, downloadResource, toggleLike, reportResource } from '../utils/resourceLibraryService';

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

    // İlk yükleme
    useEffect(() => {
        fetchResources();
    }, []);

    const fetchResources = async (filterObj = filters) => {
        setLoading(true);
        const result = await searchResources(filterObj);
        if (result.success) {
            setResources(result.resources);
        }
        setLoading(false);
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
        await downloadResource(resource.id, currentUser.internalId);
        alert(`📥 ${resource.title} indirildi!`);
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
        if (!reportData.reason) {
            alert("Lütfen bir neden seçin.");
            return;
        }

        const result = await reportResource(
            reportModal.id,
            currentUser.internalId,
            reportData.reason,
            reportData.description
        );

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
        if (source === 'official') return <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">🏛️ KURUMSAL</span>;
        return <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">✓ ONAYLANMIŞ</span>;
    };

    return (
        <div className="w-full pb-24 space-y-4">
            {/* BAŞLIK */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-6 text-white shadow-lg">
                <h2 className="text-2xl font-bold mb-1">📚 Kaynak Kütüphanesi</h2>
                <p className="text-indigo-200 text-sm">Binlerce not, deneme ve çıkmış soru...</p>
            </div>

            {/* FİLTRELER */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-slate-200 dark:border-gray-700 space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2">
                        <Filter size={18} /> Filtrele
                    </h3>
                    <button onClick={() => setShowFilters(!showFilters)} className="text-indigo-600 font-bold text-sm">
                        {showFilters ? 'Gizle' : 'Göster'}
                    </button>
                </div>

                {showFilters && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-200 dark:border-gray-700">
                        {/* Kategori */}
                        <select
                            className="p-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                            value={filters.category}
                            onChange={e => handleFilterChange('category', e.target.value)}
                        >
                            {Object.keys(CATEGORIES).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>

                        {/* Ders */}
                        <select
                            className="p-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                            value={filters.subject}
                            onChange={e => handleFilterChange('subject', e.target.value)}
                        >
                            <option value="">Tüm Dersler</option>
                            {CATEGORIES[filters.category]?.map(subject => (
                                <option key={subject} value={subject}>{subject}</option>
                            ))}
                        </select>

                        {/* Tür */}
                        <select
                            className="p-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                            value={filters.type}
                            onChange={e => handleFilterChange('type', e.target.value)}
                        >
                            <option value="">Tüm Türler</option>
                            {TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>

                        {/* Sıralama */}
                        <select
                            className="p-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                            value={filters.sortBy}
                            onChange={e => handleFilterChange('sortBy', e.target.value)}
                        >
                            <option value="newest">Yeni Sırası</option>
                            <option value="popular">Popüler</option>
                            <option value="rating">En Beğenilen</option>
                        </select>
                    </div>
                )}
            </div>

            {/* KAYNAK LİSTESİ */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-slate-500 dark:text-gray-400">Kaynaklar yükleniyor...</p>
                </div>
            ) : resources.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-slate-500 dark:text-gray-400">Bu filtreyle eşleşen kaynak bulunamadı.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {resources.map(resource => (
                        <div
                            key={resource.id}
                            className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
                        >
                            {/* BAŞLIK & KAYNAK TÜRÜ */}
                            <div className="p-4 border-b border-slate-200 dark:border-gray-700">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <h3 className="font-bold text-slate-800 dark:text-white text-sm line-clamp-2 flex-1">
                                        {resource.title}
                                    </h3>
                                    {getSourceBadge(resource.source)}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-gray-400 line-clamp-2">
                                    {resource.description}
                                </p>
                            </div>

                            {/* METADATA */}
                            <div className="px-4 py-3 bg-slate-50 dark:bg-gray-800/50 space-y-2">
                                <div className="grid grid-cols-2 text-[11px] gap-2">
                                    <div>
                                        <span className="font-bold text-slate-600 dark:text-gray-400">Ders:</span>
                                        <p className="text-indigo-600 dark:text-indigo-400 font-bold">{resource.subject}</p>
                                    </div>
                                    <div>
                                        <span className="font-bold text-slate-600 dark:text-gray-400">Tür:</span>
                                        <p className="text-slate-700 dark:text-gray-300 font-bold">{resource.type}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-gray-400 pt-2 border-t border-slate-200 dark:border-gray-700">
                                    <span>📏 {formatFileSize(resource.fileSize)}</span>
                                    <span>👤 {resource.uploaderName}</span>
                                </div>
                            </div>

                            {/* İSTATİSTİKLER */}
                            <div className="px-4 py-3 flex items-center justify-around text-xs font-bold border-t border-slate-200 dark:border-gray-700">
                                <div className="text-center">
                                    <p className="text-slate-500 dark:text-gray-400">İndir</p>
                                    <p className="text-slate-800 dark:text-white text-lg">{resource.downloads}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-slate-500 dark:text-gray-400">Beğeni</p>
                                    <p className="text-slate-800 dark:text-white text-lg">{resource.likes}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-slate-500 dark:text-gray-400">Görüntüleme</p>
                                    <p className="text-slate-800 dark:text-white text-lg">{resource.views}</p>
                                </div>
                            </div>

                            {/* BUTONLAR */}
                            <div className="p-3 border-t border-slate-200 dark:border-gray-700 flex gap-2">
                                <button
                                    onClick={() => handleDownload(resource)}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-1 text-sm transition-colors"
                                >
                                    <Download size={16} /> İndir
                                </button>
                                <button
                                    onClick={() => handleLike(resource)}
                                    className={`flex-1 font-bold py-2 rounded-lg flex items-center justify-center gap-1 text-sm transition-colors ${
                                        likedResources.has(resource.id)
                                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                            : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-200'
                                    }`}
                                >
                                    <Heart size={16} fill={likedResources.has(resource.id) ? 'currentColor' : 'none'} />
                                </button>
                                <button
                                    onClick={() => setReportModal(resource)}
                                    className="flex-1 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-200 font-bold py-2 rounded-lg flex items-center justify-center gap-1 text-sm transition-colors"
                                    title="Sorunu bildir"
                                >
                                    <Flag size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* RAPOR MODALI */}
            {reportModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-gray-700 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Flag size={20} className="text-red-600" /> Sorun Bildir
                            </h3>
                            <button onClick={() => setReportModal(null)}>
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">
                            "{reportModal.title}" dosyası hakkında sorun bildir.
                        </p>

                        <div className="space-y-3">
                            <select
                                className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-red-500 dark:text-white text-sm"
                                value={reportData.reason}
                                onChange={e => setReportData({ ...reportData, reason: e.target.value })}
                            >
                                <option value="">Neden Seçin...</option>
                                {REPORT_REASONS.map(reason => (
                                    <option key={reason} value={reason}>{reason}</option>
                                ))}
                            </select>

                            <textarea
                                placeholder="Detaylı açıklama (isteğe bağlı)..."
                                className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-red-500 dark:text-white text-sm h-20 resize-none"
                                value={reportData.description}
                                onChange={e => setReportData({ ...reportData, description: e.target.value })}
                            />

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setReportModal(null)}
                                    className="flex-1 py-2 text-slate-700 dark:text-gray-300 font-bold bg-slate-100 dark:bg-gray-800 rounded-lg hover:bg-slate-200 transition-colors text-sm"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleReport}
                                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors text-sm"
                                >
                                    Gönder
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
