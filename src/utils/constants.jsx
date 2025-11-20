import { AlertCircle, Flag, PartyPopper, Bookmark } from 'lucide-react';

export const APP_ID = 'yks-takip-sistemi-v1';
export const ADMIN_USERNAME = "esemcey"; 
export const ADMIN_PASSWORD = "103.5"; // Güvenlik notu: İleride bunu veritabanına taşıyacağız.

// Demo Verileri
export const DEMO_USERNAME = "demo_student";
export const DEMO_PASSWORD = "demo_password";
export const DEMO_INTERNAL_ID = "DEMO_ID_123456";
export const DEMO_OBP_BONUS = 53.25; 

export const DEMO_USER_DATA = {
    username: "Demo Öğrenci",
    email: DEMO_USERNAME,
    realName: "Ayşe Kaya (Demo)",
    internalId: DEMO_INTERNAL_ID,
    isAdmin: false,
    isDemo: true,
    avatar: "💡",
    base64Avatar: "",
    s9Avg: 85,
    s10Avg: 88,
    s11Avg: 90,
    s12Avg: 92,
};

export const DEMO_SCORES = [
    { 
        id: "demo-score-1", examName: "Deneme 1 (Eylül)", internalUserId: DEMO_INTERNAL_ID, finalScore: 350.50, placementScore: 350.50 + DEMO_OBP_BONUS,
        includeTYT: true, includeAYT: true, tyt: { score: 200, math: 15, turkish: 25, science: 5, social: 5 }, ayt: { score: 250, math: 20, science: 10 },
        timestamp: { seconds: Date.now() / 1000 - 86400 * 30 * 4, nanoseconds: 0 } 
    },
    // ... Diğer demo skorlarını buraya ekleyebilirsin, kod kısalığı için kestim.
];

// Takvim Renkleri ve Sabitler
export const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
export const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export const getEventStyle = (type) => {
    switch(type) {
        case 'exam': return { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: <AlertCircle size={14} /> };
        case 'deadline': return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: <Flag size={14} /> };
        case 'holiday': return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: <PartyPopper size={14} /> };
        default: return { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: <Bookmark size={14} /> };
    }
};

// Grafik Renkleri
export const getMetricConfig = (metric) => {
    switch(metric) {
      case 'tytMath': return { color: '#3b82f6', label: 'TYT Matematik' };
      case 'tytTurkish': return { color: '#ef4444', label: 'TYT Türkçe' };
      case 'tytScience': return { color: '#22c55e', label: 'TYT Fen' };
      case 'finalScore': return { color: '#111827', label: 'Ham Puan' };
      default: return { color: '#111827', label: 'Yerleştirme Puanı' };
    }
};