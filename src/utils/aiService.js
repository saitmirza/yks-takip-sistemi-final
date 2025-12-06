

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// API KEY: Runtime injection - ASLA hardcode ETME
const isLocalhost = () => {
  if (typeof window === 'undefined') return false;
  if (!window.location) return false;
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

const isDev = isLocalhost();

const getAPIKey = () => {
  // Production: Vercel'den window variable'ı oku
  if (typeof window !== 'undefined' && window.__API_KEY__) {
    return window.__API_KEY__;
  }
  // Development: localStorage veya manual configuration
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedKey = window.localStorage.getItem('VITE_GOOGLE_AI_API_KEY');
    if (storedKey) return storedKey;
  }
  return '';
};

const API_KEY = getAPIKey();
let genAI = null;

if (!API_KEY) {
  console.warn("⚠️ Google AI API key not configured.");
  console.warn("AI features will be unavailable.");
  if (isDev) {
    console.warn("📍 Development: Set VITE_GOOGLE_AI_API_KEY in .env.local");
  } else {
    console.warn("📍 Production: Set VITE_GOOGLE_AI_API_KEY in Vercel environment variables");
  }
} else {
  try {
    genAI = new GoogleGenerativeAI(API_KEY);
    console.log("✅ Google AI initialized successfully");
  } catch (err) {
    console.error("❌ Google AI initialization error:", err.message);
  }
}

// Rate limiting için basit bir queue sistemi
const requestQueue = [];
let isProcessing = false;
const RATE_LIMIT_MS = 1000; // Her istek arasında 1 saniye

const addToQueue = async (fn) => {
  return new Promise((resolve, reject) => {
    requestQueue.push({ fn, resolve, reject });
    processQueue();
  });
};

const processQueue = async () => {
  if (isProcessing || requestQueue.length === 0) return;

  isProcessing = true;
  const { fn, resolve, reject } = requestQueue.shift();

  try {
    const result = await fn();
    resolve(result);
  } catch (error) {
    reject(error);
  }

  setTimeout(() => {
    isProcessing = false;
    processQueue();
  }, RATE_LIMIT_MS);
};

const getModel = () => {
  if (!genAI) {
    throw new Error(
      "Google AI API not initialized. API key may not be configured."
    );
  }
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ],
  });
};

// Güvenli error handling
const handleAIError = (error, context) => {
  // Don't spam console with errors
  if (process.env.NODE_ENV === 'development') {
    console.error(`AI Error (${context}):`, error);
  }

  // Handle specific error cases
  if (error.message?.includes("API") || error.message?.includes("not initialized")) {
    return {
      error: true,
      message: "AI özelliği şu an kullanılamıyor. Lütfen daha sonra dene.",
      code: "CONFIG_ERROR",
    };
  }

  if (error.message?.includes("429") || error.message?.includes("quota")) {
    return {
      error: true,
      message:
        "API çok fazla istek aldı. Lütfen biraz sonra tekrar dene.",
      code: "RATE_LIMIT",
    };
  }

  if (error.message?.includes("timeout")) {
    return {
      error: true,
      message: "Bağlantı zaman aşımı. İnternet bağlantını kontrol et.",
      code: "TIMEOUT",
    };
  }

  return {
    error: true,
    message: "AI servisi şu an kullanılamıyor. Lütfen biraz sonra dene.",
    code: "UNKNOWN_ERROR",
  };
};

// 1. ANALİZ FONKSİYONU
export const getAIAnalysis = async (studentData) => {
  // Input validasyonu
  if (!studentData || !studentData.name) {
    return {
      error: true,
      message: "Geçersiz öğrenci verisi",
      code: "INVALID_INPUT",
    };
  }

  return addToQueue(async () => {
    try {
      const model = getModel();

      if (!API_KEY) {
        throw new Error("API KEY not configured");
      }

      const prompt = `
            Sen "YKS Komutanı" adında, veri odaklı ve taktiksel bir eğitim koçusun.
            Aşağıdaki öğrenci verilerini analiz et ve sadece geçerli bir JSON objesi döndür.
            Düz metin veya markdown bloğu (backticks) kullanma.

            ÖĞRENCİ PROFİLİ:
            - İsim: ${studentData.name}
            - Hedef Okul: ${studentData.targetUni} (${studentData.targetScore} Puan)
            - Mevcut Ortalama: ${studentData.currentScore} Puan
            - Puan Farkı: ${studentData.gap}
            - KAPASİTE (GÜNLÜK): Max ${studentData.capacity?.dailyLimit || 4} saat, Max ${studentData.capacity?.questionCapacity || 100} soru.
            - ODAK ALANI: ${studentData.capacity?.focusArea || "Dengeli"}
            - SON HAFTA PERFORMANSI: ${studentData.weeklySolved} Soru, ${Math.floor(studentData.weeklyMinutes / 60)} Saat çalışma.
            - EKSİK KONULAR: ${studentData.mistakes.join(", ")}

            GÖREV:
            Öğrencinin kapasitesini ASLA aşmayacak şekilde, gerçekçi ve uygulanabilir bir haftalık plan yap.
            Eğer "Hedef Girilmemiş" ise ona önce hedef belirlemesini söyle.
            Eğer eksik konu yoksa, genel tekrar ve deneme öner.
            Verilecek görevleri kısa ve net yaz sanki bir programa eklenecekmiş gibi.

            İSTENEN JSON FORMATI:
            {
                "analysis_summary": "Durumu özetleyen 2-3 cümlelik, sert ve gerçekçi bir yorum.",
                "weekly_focus_topics": ["Konu 1", "Konu 2", "Konu 3 (Eğer varsa)"],
                "action_plan": [
                    "Görev 1 (Örn: Fonksiyonlardan 30 soru çöz - Kapasiteye uygun)",
                    "Görev 2",
                    "Görev 3"
                ],
                "motivation_quote": "Kısa, gaza getirici bir kapanış cümlesi."
            }
        `;

      const result = await model.generateContent(prompt);
      const text = result.response
        .text()
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(text);

      // Sonuç validasyonu
      if (!parsed.analysis_summary || !parsed.action_plan) {
        throw new Error("Invalid AI response format");
      }

      return parsed;
    } catch (error) {
      return handleAIError(error, "getAIAnalysis");
    }
  });
};

// 2. HAFTALIK PROGRAM OLUŞTURMA FONKSİYONU
export const generateWeeklySchedule = async (profile, userRequest, recentAnalysis) => {
  // Input validasyonu
  if (!profile || !profile.focusArea) {
    return {
      error: true,
      message: "Geçersiz profil verisi",
      code: "INVALID_INPUT",
    };
  }

  if (userRequest && typeof userRequest !== "string") {
    return {
      error: true,
      message: "Geçersiz istek formatı",
      code: "INVALID_INPUT",
    };
  }

  return addToQueue(async () => {
    try {
      const model = getModel();

      if (!API_KEY) {
        throw new Error("API KEY not configured");
      }

      // Alanına göre ders kısıtlaması (Strict Mode)
      let allowedSubjects = "";
      if (profile.focusArea === "Sayısal")
        allowedSubjects =
          "SADECE Matematik, Geometri, Fizik, Kimya, Biyoloji, Türkçe";
      else if (profile.focusArea === "Eşit Ağırlık")
        allowedSubjects =
          "SADECE Matematik, Geometri, Edebiyat, Tarih, Coğrafya, Türkçe";
      else if (profile.focusArea === "Sözel")
        allowedSubjects =
          "SADECE Edebiyat, Tarih, Coğrafya, Felsefe, Din, Türkçe";
      else allowedSubjects = "Tüm dersler serbest";

      const prompt = `
            SİSTEM ROLÜ:
Sen profesyonel, katı kurallara sahip ve sadece JSON çıktısı üreten bir YKS (Türkiye Üniversite Sınavı) Koçusun.
Görevin, öğrenci verilerini analiz ederek hatasız bir JSON formatında 7 günlük çalışma programı oluşturmaktır.

GİRDİ VERİLERİ:
- Öğrenci Alanı: "${profile.focusArea}"
- İzin Verilen Dersler (WHITELIST): "${allowedSubjects}" (SADECE bu listedeki dersleri kullanabilirsin. Başka ders eklemek YASAKTIR.)
- Günlük Maksimum Çalışma Süresi: ${profile.dailyLimit} saat
- Öncelikli Eksik Konular: ${profile.mistakes.join(", ")}
- Önceki Analiz Tavsiyeleri: ${JSON.stringify(recentAnalysis?.weekly_focus_topics || [])}
- KULLANICI ÖZEL İSTEĞİ (KESİN UYULACAK): "${userRequest}"

ALGORİTMA ADIMLARI (Bunu uygula ama çıktıya yazma):
1. Önce "Kullanıcı Özel İsteği"ni analiz et. Eğer bir günün boş olmasını istiyorsa o günün array'ini boş bırak.
2. Öğrencinin "Öğrenci Alanı"nı kontrol et. 
   - Sayısal ise: Tarih, Coğrafya, Felsefe, Din ASLA ekleme.
   - Sözel ise: Fizik, Kimya, Biyoloji ASLA ekleme.
   - Eşit Ağırlık ise: Fizik, Kimya, Biyoloji ASLA ekleme.
   - Sadece "İzin Verilen Dersler" listesinden seçim yap.
3. "Eksik Konular"ı günlere dağıt. Her eksik konu için bir "konu" çalışması ve ardından bir "soru" çözümü görevi ekle.
4. Günlük kapasiteyi (Max ${profile.dailyLimit} saat) aşma. (Ortalama: Konu çalışması 1 saat, Soru çözümü 45 dk sayılabilir).
5. Eğer eksik konular biterse, öğrencinin alanına uygun "Genel Tekrar" veya "Branş Denemesi" ekle.

ÇIKTI FORMATI KURALLARI:
- Sadece ve sadece saf JSON döndür. 
- Markdown blokları (\`\`\`json) KULLANMA.
- Açıklama, önsöz veya sonsöz YAZMA.
- JSON anahtarları Türkçe gün isimleri olmalıdır: "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar".

ÖRNEK JSON YAPISI:
{
  "Pazartesi": [
    { "type": "TYT", "subject": "Matematik", "topic": "Üslü Sayılar", "taskType": "konu", "duration_min": 60 },
    { "type": "AYT", "subject": "Fizik", "topic": "Vektörler", "taskType": "soru", "count": 25, "duration_min": 40 }
  ],
  "Salı": []
}

Şimdi, yukarıdaki kurallara ve verilere göre JSON çıktısını üret:
        `;

      const result = await model.generateContent(prompt);
      const text = result.response
        .text()
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(text);

      // Sonuç validasyonu - gün isimleri kontrol et
      const validDays = [
        "Pazartesi",
        "Salı",
        "Çarşamba",
        "Perşembe",
        "Cuma",
        "Cumartesi",
        "Pazar",
      ];
      for (const day of validDays) {
        if (!(day in parsed)) {
          throw new Error(`Invalid response: Missing day ${day}`);
        }
      }

      return parsed;
    } catch (error) {
      return handleAIError(error, "generateWeeklySchedule");
    }
  });
};
