

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";


const API_KEY = "AIzaSyBxAKesDTq4LOJ2uZCQkwsmSm5uNgrXTnQ"; 

const genAI = new GoogleGenerativeAI(API_KEY);

const getModel = () => {
    return genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
    });
};

// 1. ANALİZ FONKSİYONU
export const getAIAnalysis = async (studentData) => {
    try {
        const model = getModel();
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
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);

    } catch (error) {
        console.error("AI Analiz Hatası:", error);
        return null; 
    }
};

// 2. HAFTALIK PROGRAM OLUŞTURMA FONKSİYONU
export const generateWeeklySchedule = async (profile, userRequest, recentAnalysis) => {
    try {
        const model = getModel();

        // Alanına göre ders kısıtlaması (Strict Mode)
        let allowedSubjects = "";
        if (profile.focusArea === 'Sayısal') allowedSubjects = "SADECE Matematik, Geometri, Fizik, Kimya, Biyoloji, Türkçe";
        else if (profile.focusArea === 'Eşit Ağırlık') allowedSubjects = "SADECE Matematik, Geometri, Edebiyat, Tarih, Coğrafya, Türkçe";
        else if (profile.focusArea === 'Sözel') allowedSubjects = "SADECE Edebiyat, Tarih, Coğrafya, Felsefe, Din, Türkçe";
        else allowedSubjects = "Tüm dersler serbest";

        const prompt = `
            Sen profesyonel bir YKS öğrenci koçusun.
            Aşağıdaki öğrenci profiline ve ÖZEL İSTEĞİNE göre 7 günlük (Pazartesi-Pazar) detaylı bir çalışma programı oluştur.
            
            ÖĞRENCİ PROFİLİ:
            - Alan: ${profile.focusArea} (${allowedSubjects}) -> BU ALAN DIŞINDA DERS YAZMA!
            - Günlük Kapasite: Max ${profile.dailyLimit} saat
            - Tespit Edilen Eksik Konular: ${profile.mistakes.join(", ")}
            - Son Analizden Tavsiyeler: ${JSON.stringify(recentAnalysis?.weekly_focus_topics || [])}

            KULLANICININ ÖZEL İSTEĞİ (Buna kesinlikle uy):
            "${userRequest}"

            KURALLAR:
            1. Görevler "Konu Çalışması" veya "Soru Çözümü" olarak net ayrılmalı.
            2. Eksik konulara öncelik ver. Bunları bitirdikten sonra genel tekrar ve deneme ekle. ASLA AMA ASLA boş yere yeni konu ekleme ve öğrencinin alanına her zaman dikkat et.
            3. Sayısal öğrencisine Tarih/Coğrafya/Felsefe/Din, Sözel öğrencisine Fizik/Kimya/Biyoloji ASLA yazma. Bu yapman gerekenler arasından en önemli olanı.
            4. Kullanıcının özel isteği (örn: Çarşamba boş olsun) varsa mutlaka uygula.
            5. Sadece geçerli JSON formatı döndür.

            İSTENEN JSON FORMATI (Array değil, Gün Objeleri):
            {
                "Pazartesi": [
                    { "type": "TYT", "subject": "Matematik", "topic": "Üslü Sayılar", "taskType": "konu" },
                    { "type": "AYT", "subject": "Fizik", "topic": "Branş Denemesi", "taskType": "soru", "count": 20 }
                ],
                "Salı": [],
                ... (Çarşamba, Perşembe, Cuma, Cumartesi, Pazar)
            }
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);

    } catch (error) {
        console.error("AI Schedule Hatası:", error);
        return null;
    }
};
