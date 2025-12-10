// YARDIMCI: Backend'e istek atan fonksiyon
const callBackendAI = async (prompt) => {
    try {
        console.log("📡 Frontend: Sunucuya istek gönderiliyor...");
        
        // Dinamik URL Belirleme
        // Eğer localhosttaysak yerel sunucuya, canlıdaysak site adresine istek at
        const baseUrl = window.location.origin; 
        const endpoint = `${baseUrl}/api/generate`;

        console.log("Hedef Adres:", endpoint);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt }),
        });

        // Hata durumunu detaylı yakala
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Backend Hatası:", response.status, errorText);
            
            // Eğer 404 ise backend dosyası bulunamadı demektir (Klasör yeri yanlış)
            if (response.status === 404) {
                throw new Error("Backend servisi bulunamadı. (api/generate.js dosyasının yerini kontrol et)");
            }
            
            // Eğer 500 ise sunucu içi hata (API Key eksik olabilir)
            if (response.status === 500) {
                throw new Error("Sunucu hatası. (Vercel Environment Variables kontrol et)");
            }

            throw new Error(`Hata: ${response.status}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error("❌ AI Servis Hatası:", error);
        alert(`Bağlantı Hatası: ${error.message}`); // Kullanıcıya hatayı göster
        return null;
    }
};

// 1. ANALİZ FONKSİYONU
export const getAIAnalysis = async (studentData) => {
    const prompt = `
        Sen "YKS Komutanı" adında, veri odaklı ve taktiksel bir eğitim koçusun.
        Aşağıdaki öğrenci verilerini analiz et ve sadece geçerli bir JSON objesi döndür.
        
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

    return await callBackendAI(prompt);
};

// 2. HAFTALIK PROGRAM OLUŞTURMA FONKSİYONU
export const generateWeeklySchedule = async (profile, userRequest, recentAnalysis) => {
    
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
        - KULLANICI ÖZEL İSTEĞİ (Buna kesinlikle uy): "${userRequest}"

        KURALLAR:
        1. Görevler "Konu Çalışması" veya "Soru Çözümü" olarak net ayrılmalı.
        2. Eksik konulara öncelik ver. Eğer eksik konu azsa "Branş Denemesi" veya "Genel Tekrar" yaz. Rastgele konu uydurma.
        3. Sayısalcıya Tarih/Coğrafya, Sözelciye Fizik/Kimya ASLA yazma.
        4. Kullanıcının özel isteği (örn: Çarşamba boş olsun) varsa mutlaka uygula.
        5. Sadece geçerli JSON formatı döndür.

        İSTENEN JSON FORMATI (Array değil, Gün Objeleri):
        {
            "Pazartesi": [
                { "type": "TYT", "subject": "Matematik", "topic": "Üslü Sayılar", "taskType": "konu", "count": 0 },
                { "type": "AYT", "subject": "Fizik", "topic": "Vektörler", "taskType": "soru", "count": 20 }
            ],
            "Salı": [],
            ... (Çarşamba, Perşembe, Cuma, Cumartesi, Pazar)
        }
    `;

    return await callBackendAI(prompt);
};