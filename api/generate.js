import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Anahtarı sunucu ortam değişkenlerinden çekiyoruz (Güvenli)
const API_KEY = process.env.GOOGLE_AI_API_KEY;

export default async function handler(req, res) {
  // Sadece POST isteklerine izin ver
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt } = req.body;

  if (!API_KEY) {
    console.error("❌ Sunucu Hatası: API Key bulunamadı.");
    return res.status(500).json({ error: 'Sunucu tarafında API Key yapılandırılmamış.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    // Model ayarları (Hız ve maliyet için Flash model)
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
    });

    console.log("🤖 Backend: Yapay Zeka isteği işleniyor...");

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Temiz JSON döndür (Markdown backtick'lerini temizle)
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

    return res.status(200).json(JSON.parse(cleanText));

  } catch (error) {
    console.error("🚨 AI Backend Hatası:", error);
    return res.status(500).json({ error: error.message || 'Yapay zeka yanıt vermedi.' });
  }
}