import React, { useState, useEffect } from 'react';
import { CheckCircle, X, AlertCircle, Clock, Trash2, Eye, FileText, Filter } from 'lucide-react';
import { getPendingResources, approveResource, rejectResource } from '../utils/resourceLibraryService';

export default function AdminResourceModeration({ currentUser }) {
    const [allResources, setAllResources] = useState([]);
    const [displayedResources, setDisplayedResources] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedResource, setSelectedResource] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [approving, setApproving] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const [filterTab, setFilterTab] = useState('pending'); // 'pending' veya 'approved'

    const REJECTION_REASONS = [
        'Telif Hakkı İhlali',
        'Uygunsuz İçerik',
        'Düşük Kalite',
        'Format Hatası',
        'Spam/Tekrar'
    ];

    useEffect(() => {
        fetchResources();
    }, []);

    // Filter tab değiştiğinde displayed resources'ı güncelle
    useEffect(() => {
        if (filterTab === 'pending') {
            setDisplayedResources(allResources.filter(r => r.status === 'pending'));
        } else {
            setDisplayedResources(allResources.filter(r => r.status === 'approved'));
        }
        setSelectedResource(null);
    }, [filterTab, allResources]);

    const fetchResources = async () => {
        setLoading(true);
        try {
            // Pending resources'ı al
            const result = await getPendingResources();
            if (result.success) {
                // Tüm resources'ı sakla (pending + approved)
                // Approved ones should also be included for viewing
                setAllResources(result.resources);
            }
        } catch (error) {
            console.error('Error fetching resources:', error);
        }
        setLoading(false);
    };

    const handleApprove = async () => {
        if (!selectedResource) return;
        setApproving(true);
        
        const result = await approveResource(selectedResource.id, currentUser.internalId);
        
        if (result.success) {
            console.log('✅ Onaylama başarılı, resources yenileniyor...');
            // Tüm resources'ı yenile
            await fetchResources();
            setSelectedResource(null);
            alert(result.message || '✅ Dosya başarıyla onaylandı!');
        } else {
            console.error('❌ Onaylama başarısız:', result.message);
            alert(`Hata: ${result.message}`);
        }
        
        setApproving(false);
    };

    const handleReject = async () => {
        if (!selectedResource || !rejectReason) {
            alert('Lütfen bir neden seçin.');
            return;
        }
        
        setRejecting(true);
        
        const result = await rejectResource(selectedResource.id, rejectReason, currentUser.internalId);
        
        if (result.success) {
            console.log('✅ Reddetme başarılı, resources yenileniyor...');
            // Tüm resources'ı yenile
            await fetchResources();
            setSelectedResource(null);
            setRejectReason('');
            alert(result.message || '✅ Dosya başarıyla reddedildi!');
        } else {
            console.error('❌ Reddetme başarısız:', result.message);
            alert(`Hata: ${result.message}`);
        }
        
        setRejecting(false);
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
    };

    return (
        <div className="w-full pb-24 space-y-6">
            {/* BAŞLIK */}
            <div className="bg-gradient-to-br from-amber-600 to-orange-600 rounded-3xl p-6 text-white shadow-lg">
                <h2 className="text-2xl font-bold mb-1">⚖️ Kaynak Moderasyonu</h2>
                <p className="text-amber-100 text-sm">Öğrencilerden gelen dosyaları incele ve onayla/reddet</p>
            </div>

            {/* SAYAÇ */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-slate-200 dark:border-gray-700 text-center">
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {allResources.filter(r => r.status === 'pending').length}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-gray-400 font-bold uppercase">Beklemede</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-slate-200 dark:border-gray-700 text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {allResources.filter(r => r.status === 'approved').length}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-gray-400 font-bold uppercase">Onaylanan</p>
                </div>
            </div>

            {/* FİLTER TABS */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-gray-700">
                <button
                    onClick={() => setFilterTab('pending')}
                    className={`px-4 py-3 font-bold text-sm transition-all border-b-2 ${
                        filterTab === 'pending'
                            ? 'text-amber-600 dark:text-amber-400 border-amber-600 dark:border-amber-400'
                            : 'text-slate-600 dark:text-gray-400 border-transparent hover:text-slate-800 dark:hover:text-gray-200'
                    }`}
                >
                    <Clock size={16} className="inline mr-2" />
                    Beklemede ({allResources.filter(r => r.status === 'pending').length})
                </button>
                <button
                    onClick={() => setFilterTab('approved')}
                    className={`px-4 py-3 font-bold text-sm transition-all border-b-2 ${
                        filterTab === 'approved'
                            ? 'text-green-600 dark:text-green-400 border-green-600 dark:border-green-400'
                            : 'text-slate-600 dark:text-gray-400 border-transparent hover:text-slate-800 dark:hover:text-gray-200'
                    }`}
                >
                    <CheckCircle size={16} className="inline mr-2" />
                    Onaylanan ({allResources.filter(r => r.status === 'approved').length})
                </button>
            </div>

            {/* İCERİK */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="w-8 h-8 border-3 border-amber-600/30 border-t-amber-600 rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-slate-500 dark:text-gray-400">Dosyalar yükleniyor...</p>
                </div>
            ) : displayedResources.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-700 p-12 text-center">
                    <CheckCircle size={48} className="text-green-600 dark:text-green-400 mx-auto mb-3" />
                    <p className="font-bold text-slate-800 dark:text-white mb-1">
                        {filterTab === 'pending' ? '✅ Tüm dosyalar onaylandı!' : 'Henüz onaylanan dosya yok'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-gray-400">
                        {filterTab === 'pending' ? 'Yeni dosya gelene kadar bekliyoruz.' : 'Öğrenci dosyaları onaylandıkça burada görünecek.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* SOL: LİSTE */}
                    <div className="space-y-2 md:max-h-[600px] md:overflow-y-auto">
                        {displayedResources.map(resource => (
                            <div
                                key={resource.id}
                                onClick={() => setSelectedResource(resource)}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                    selectedResource?.id === resource.id
                                        ? filterTab === 'pending'
                                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                            : 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                        : 'border-slate-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-800 dark:text-white text-sm line-clamp-2">
                                            {resource.title}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 px-2 py-0.5 rounded">
                                                {resource.category}
                                            </span>
                                            <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                                                {resource.subject}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1">
                                            👤 {resource.uploaderName}
                                        </p>
                                    </div>
                                    {filterTab === 'pending' ? (
                                        <Clock size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                    ) : (
                                        <CheckCircle size={16} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* SAĞ: DETAY & İŞLEMLER */}
                    {selectedResource ? (
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-700 p-6 space-y-4">
                            {/* BAŞLIK */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex-1">
                                        {selectedResource.title}
                                    </h3>
                                    {selectedResource.status === 'approved' && (
                                        <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded-full font-bold">
                                            ✅ Onaylı
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-slate-600 dark:text-gray-400">
                                    {selectedResource.description}
                                </p>
                            </div>

                            {/* DETAY TABLO */}
                            <div className="bg-slate-50 dark:bg-gray-800 p-3 rounded-lg space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="font-bold text-slate-600 dark:text-gray-400">Yükleyen:</span>
                                    <span className="text-slate-800 dark:text-white">{selectedResource.uploaderName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold text-slate-600 dark:text-gray-400">Sınıfı:</span>
                                    <span className="text-slate-800 dark:text-white">{selectedResource.uploaderClass}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold text-slate-600 dark:text-gray-400">Kategori:</span>
                                    <span className="text-slate-800 dark:text-white">{selectedResource.category}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold text-slate-600 dark:text-gray-400">Ders:</span>
                                    <span className="text-slate-800 dark:text-white">{selectedResource.subject}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold text-slate-600 dark:text-gray-400">Tür:</span>
                                    <span className="text-slate-800 dark:text-white">{selectedResource.type}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-gray-700">
                                    <span className="font-bold text-slate-600 dark:text-gray-400">Dosya:</span>
                                    <span className="text-slate-800 dark:text-white">
                                        {formatFileSize(selectedResource.fileSize)}
                                    </span>
                                </div>
                            </div>

                            {/* ETIKETLER */}
                            {selectedResource.tags && selectedResource.tags.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-slate-600 dark:text-gray-400 mb-2 uppercase">Etiketler</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedResource.tags.map(tag => (
                                            <span
                                                key={tag}
                                                className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full"
                                            >
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* SADECE PENDING İÇİN REDDETME SEBEBİ */}
                            {filterTab === 'pending' && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg p-3">
                                    <label className="text-xs font-bold text-slate-600 dark:text-gray-400 uppercase mb-2 block">
                                        Reddetmek İçin Neden Seç
                                    </label>
                                    <select
                                        className="w-full p-2 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500 dark:text-white"
                                        value={rejectReason}
                                        onChange={e => setRejectReason(e.target.value)}
                                    >
                                        <option value="">Seçiniz...</option>
                                        {REJECTION_REASONS.map(reason => (
                                            <option key={reason} value={reason}>{reason}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* BUTONLAR */}
                            {filterTab === 'pending' && (
                                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-gray-700">
                                    <button
                                        onClick={handleApprove}
                                        disabled={approving}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        {approving ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Onaylanıyor...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={18} /> Onayla
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleReject}
                                        disabled={rejecting || !rejectReason}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        {rejecting ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Reddediliyor...
                                            </>
                                        ) : (
                                            <>
                                                <X size={18} /> Reddet
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-700 p-6 text-center">
                            <Eye size={48} className="text-slate-400 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-slate-600 dark:text-gray-400 font-bold">
                                Soldan bir dosya seç detaylarını gör
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
