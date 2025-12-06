import React, { useState } from 'react';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { uploadResource } from '../utils/resourceLibraryService';

export default function StudentResourceUpload({ currentUser, onSuccess }) {
    const [showModal, setShowModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null);
    
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'TYT',
        subject: 'Matematik',
        type: 'Deneme',
        file: null,
        tags: ''
    });

    const CATEGORIES = {
        'TYT': ['Matematik', 'Türkçe', 'Sosyal Bilgiler', 'Fen Bilimleri'],
        'AYT': ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Türkçe', 'Tarih', 'Coğrafya'],
        'YDT': ['İngilizce']
    };

    const TYPES = ['Deneme', 'Konu Özeti', 'Çıkmış Soru', 'Hap Bilgi', 'Konu Anlatımı', 'Çalışma Notu'];

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData({ ...formData, file });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.title || !formData.subject || !formData.type || !formData.file) {
            setUploadStatus({ type: 'error', message: 'Lütfen tüm alanları doldurun.' });
            return;
        }

        setIsUploading(true);
        setUploadStatus(null);

        const resourceData = {
            title: formData.title,
            description: formData.description,
            category: formData.category,
            subject: formData.subject,
            type: formData.type,
            tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
            userId: currentUser.internalId,
            userName: currentUser.username,
            userAvatar: currentUser.base64Avatar || currentUser.avatar,
            userClass: currentUser.classSection || 'Belirsiz',
            isAdmin: false // Öğrenci yüklemesi
        };

        const result = await uploadResource(formData.file, resourceData);
        setIsUploading(false);

        if (result.success) {
            setUploadStatus({ type: 'success', message: result.message });
            setFormData({
                title: '',
                description: '',
                category: 'TYT',
                subject: 'Matematik',
                type: 'Deneme',
                file: null,
                tags: ''
            });
            setTimeout(() => {
                setShowModal(false);
                if (onSuccess) onSuccess();
            }, 2000);
        } else {
            setUploadStatus({ type: 'error', message: result.message });
        }
    };

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition-colors"
            >
                <Upload size={18} /> Not Paylaş
            </button>

            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg p-6 border border-slate-200 dark:border-gray-700 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Upload size={20} className="text-green-600" /> Not Paylaş
                            </h3>
                            <button onClick={() => setShowModal(false)}>
                                <X size={24} className="text-slate-400" />
                            </button>
                        </div>

                        {uploadStatus && (
                            <div className={`p-3 rounded-lg mb-4 flex items-start gap-2 ${
                                uploadStatus.type === 'success'
                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                            }`}>
                                {uploadStatus.type === 'success' ? (
                                    <CheckCircle size={18} className="flex-shrink-0 mt-0.5" />
                                ) : (
                                    <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                                )}
                                <span className="text-sm font-medium">{uploadStatus.message}</span>
                            </div>
                        )}

                        {/* BİLGİ KUTUSU */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3 mb-4">
                            <p className="text-xs text-blue-700 dark:text-blue-300 font-bold leading-relaxed">
                                💡 Notlarını paylaştığında admin inceleyecek ve onaylarsa kütüphanede görünür. Diğer öğrenciler indirirse sen puan kazanacaksın!
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Başlık */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1 uppercase">Başlık *</label>
                                <input
                                    type="text"
                                    placeholder="Örn: Integral Formülleri Özeti"
                                    className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white text-sm"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            {/* Açıklama */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1 uppercase">Açıklama</label>
                                <textarea
                                    placeholder="Bu not hakkında kısa bir açıklama..."
                                    className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white text-sm h-20 resize-none"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            {/* Kategori */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1 uppercase">Kategori *</label>
                                    <select
                                        className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white text-sm"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value, subject: CATEGORIES[e.target.value]?.[0] || '' })}
                                    >
                                        {Object.keys(CATEGORIES).map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Ders */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1 uppercase">Ders *</label>
                                    <select
                                        className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white text-sm"
                                        value={formData.subject}
                                        onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                    >
                                        {CATEGORIES[formData.category]?.map(subject => (
                                            <option key={subject} value={subject}>{subject}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Tip */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1 uppercase">Kaynak Tipi *</label>
                                <select
                                    className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white text-sm"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                >
                                    {TYPES.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Etiketler */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1 uppercase">Etiketler (virgülle ayır)</label>
                                <input
                                    type="text"
                                    placeholder="integral, formüller, tyt"
                                    className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white text-sm"
                                    value={formData.tags}
                                    onChange={e => setFormData({ ...formData, tags: e.target.value })}
                                />
                            </div>

                            {/* Dosya */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-2 uppercase">Dosya Yükle *</label>
                                <div className="border-2 border-dashed border-green-300 dark:border-green-900 rounded-lg p-4 text-center hover:border-green-500 transition-colors">
                                    <input
                                        type="file"
                                        id="file-input"
                                        className="hidden"
                                        onChange={handleFileChange}
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    />
                                    <label htmlFor="file-input" className="cursor-pointer">
                                        <div className="text-green-600 dark:text-green-400 text-sm font-bold mb-1">Dosyayı sürükle veya tıkla</div>
                                        <div className="text-[12px] text-slate-500 dark:text-gray-400">
                                            {formData.file ? (
                                                <span className="text-green-600 dark:text-green-400">✓ {formData.file.name}</span>
                                            ) : (
                                                <span>PDF, JPG, PNG, DOC (Max: 50 MB)</span>
                                            )}
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* UYARI */}
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                    ⚠️ <strong>Telif Hakkı</strong>: Kendi notların veya kaynakların olduğundan emin ol. Başkasının içeriğini yükleyersen sorumlu olursun.
                                </p>
                            </div>

                            {/* Butonlar */}
                            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 text-slate-700 dark:text-gray-300 font-bold bg-slate-100 dark:bg-gray-800 rounded-lg hover:bg-slate-200 transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUploading}
                                    className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isUploading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Yükleniyor...
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={16} /> Paylaş
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
