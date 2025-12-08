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
// ... (Diğer sabitler yukarıda kalacak)

// --- PROFİL KAPAK FOTOĞRAFLARI KOLEKSİYONU ---
export const PROFILE_COVERS = [
    // 1. GRADYANLAR (Renk Geçişleri)
    "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=800&q=80", // Mor-Mavi
    "https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&w=800&q=80", // Pembe-Mor
    "https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&w=800&q=80", // Ateş Kırmızısı
    "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&w=800&q=80", // Somon-Gri

    // 2. DERS & MOTİVASYON (YENİLENDİ ✅)
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=800&q=80", // Kütüphane Rafları
    "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80", // Gece Lambası ve Kitap
    "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80", // Açık Kitaplar
    "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=800&q=80", // Modern Çalışma Masası

    // 3. SOYUT & DOĞA
    "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80", // Teknoloji Mavisi
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=800&q=80", // Renkli Duman
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80", // Sisli Orman
    "https://images.unsplash.com/photo-1536152470836-b943b246224c?auto=format&fit=crop&w=800&q=80", // Dijital Pikseller
];
// --- RENK TEMALARI (GENİŞLETİLMİŞ PAKET) ---
export const COLOR_THEMES = {
    // 1. KLASİKLER
    indigo: { 
        label: "Varsayılan (İndigo)", 
        primary: "#6366f1", 
        light: "#eef2ff", 
        dark: "#312e81",
        gradient: "linear-gradient(to bottom right, #0f172a, #1e1b4b, #312e81)" 
    },
    rose: { 
        label: "Gül Kırmızısı",       
        primary: "#f43f5e", 
        light: "#fff1f2", 
        dark: "#881337",
        gradient: "linear-gradient(to bottom right, #0f172a, #4c0519, #881337)"
    },
    emerald: { 
        label: "Zümrüt Ormanı",       
        primary: "#10b981", 
        light: "#ecfdf5", 
        dark: "#064e3b",
        gradient: "linear-gradient(to bottom right, #0f172a, #022c22, #065f46)"
    },

    // 2. MODERN / TRENDY
    violet: { 
        label: "Cyberpunk Moru",            
        primary: "#8b5cf6", 
        light: "#f5f3ff", 
        dark: "#4c1d95",
        gradient: "linear-gradient(to bottom right, #0f172a, #2e1065, #7c3aed)"
    },
    coral: { 
        label: "Mercan Resifi", 
        primary: "#fb7185", // Gül Kurusu/Mercan
        light: "#fff1f2", 
        dark: "#881337",
        gradient: "linear-gradient(to bottom right, #0f172a, #881337, #f43f5e)" 
    },

    cyan: { 
        label: "Buzul Mavisi",       
        primary: "#06b6d4", 
        light: "#ecfeff", 
        dark: "#164e63",
        gradient: "linear-gradient(to bottom right, #0f172a, #083344, #0e7490)"
    },

    // 3. DARK MODE ÖZEL (SİYAH AĞIRLIKLI)
    midnight: {
        label: "Gece Yarısı",
        primary: "#3b82f6", // Parlak mavi vurgu
        light: "#1e293b",
        dark: "#020617",
        gradient: "linear-gradient(to bottom right, #000000, #0f172a, #1e3a8a)"
    },
    lavender: {
        label: "Lavanta Bahçesi",
        primary: "#a78bfa", // Yumuşak Mor
        light: "#f5f3ff",
        dark: "#2e1065",
        gradient: "linear-gradient(to bottom right, #0f172a, #2e1065, #7c3aed)"
    },
        crimson: { 
        label: "Kızıl Ejder", 
        primary: "#dc2626", // Kırmızı
        light: "#fef2f2", 
        dark: "#450a0a",
        gradient: "linear-gradient(to bottom right, #0f172a, #450a0a, #7f1d1d)" 
    },
    teal: { 
        label: "Atlantis", 
        primary: "#0d9488", // Turkuaz
        light: "#f0fdfa", 
        dark: "#042f2e",
        gradient: "linear-gradient(to bottom right, #0f172a, #042f2e, #115e59)" 
    },
    neon: { 
        label: "Neon Cyber", 
        primary: "#d946ef", // Parlak Fuşya
        light: "#fdf4ff", 
        dark: "#4a044e",
        gradient: "linear-gradient(to bottom right, #020617, #2e1065, #c026d3)" 
    },
    gold: { 
        label: "Şampiyon", 
        primary: "#eab308", // Altın Sarısı
        light: "#fefce8", 
        dark: "#422006",
        gradient: "linear-gradient(to bottom right, #000000, #422006, #a16207)" 
    },
    acid: { 
        label: "Radyoaktif", 
        primary: "#84cc16", // Lime (Asit Yeşili)
        light: "#f7fee7", 
        dark: "#1a2e05",
        gradient: "linear-gradient(to bottom right, #000000, #14532d, #65a30d)" 
    },
    berry: { 
        label: "Yaban Mersini", 
        primary: "#7c3aed", // Derin Mor
        light: "#f5f3ff", 
        dark: "#2e1065",
        gradient: "linear-gradient(to bottom right, #0f172a, #1e1b4b, #5b21b6)" 
    },
    sunset: { 
        label: "Mars Kolonisi", 
        primary: "#ea580c", // Yanık Turuncu
        light: "#fff7ed", 
        dark: "#431407",
        gradient: "linear-gradient(to bottom right, #0f172a, #431407, #c2410c)" 
    },
    graphite: { 
        label: "Karanlık Madde", 
        primary: "#64748b", // Çelik Gri
        light: "#f8fafc", 
        dark: "#020617",
        gradient: "linear-gradient(to bottom right, #000000, #1e293b, #475569)" 
    },
    coffee: {
        label: "Türk Kahvesi",
        primary: "#d97706", // Kehribar/Kahve
        light: "#fffbeb",
        dark: "#451a03",
        gradient: "linear-gradient(to bottom right, #1a1003, #451a03, #92400e)"
    },
        hacker: {
        label: "Matrix",
        primary: "#22c55e", // Terminal Yeşili
        light: "#f0fdf4",
        dark: "#000000",
        gradient: "linear-gradient(to bottom right, #000000, #022c22, #15803d)"
    }
};