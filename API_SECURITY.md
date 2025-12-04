# 🔒 API Güvenlik Ayarları

## ⚠️ ÖNEMLİ: API Key Exposure Düzeltildi

**Sorun:** Eski commit'lerde `aiService.js` dosyasında Google AI API keyi açıkta duruyordu.

**Çözüm Adımları:**

### 1️⃣ **GitHub'da Eski API Key'i Revoke Et**
- Google Cloud Console'a git: https://console.cloud.google.com
- Eski API keyi sil veya deaktif et
- Yeni bir API key oluştur

### 2️⃣ **Yeni API Key'i Güvenli Şekilde Ekle**
```bash
# .env.local dosyasında (git'e push edilmeyecek):
VITE_GOOGLE_AI_API_KEY=your_new_key_here
```

### 3️⃣ **Eski Commit'leri Temizle (Opsiyonel ama Önerilir)**
```bash
# Eğer GitHub'da hala açıkta duruyor görmek istemiyorsan:
git filter-branch --tree-filter 'rm -f src/utils/aiService.js' HEAD

# Veya BFG Repo-Cleaner kullan:
bfg --delete-files aiService.js
git push origin --force-with-lease
```

## ✅ Güvenlik Özellikleri

Artık aşağıdaki güvenlik özellikleri aktivedir:

- ✅ **Environment Variables** - API key `.env.local` dosyasında
- ✅ **Rate Limiting** - API istekleri sıralanıyor, aşırı kullanım engelleniyor
- ✅ **Error Handling** - Tüm API hataları yakalanıyor ve logglanıyor
- ✅ **Input Validation** - Gelen veri doğrulanıyor
- ✅ **Response Validation** - Dönen JSON yapısı kontrol ediliyor

## 🔐 Best Practices

1. **Local Development**
   - `.env.local` dosyasını kullan
   - `npm run dev` ile test et
   - Asla commit etme!

2. **Production Deployment**
   - Vercel, Netlify, vb. hosting'de env variables tanımla
   - Azure Key Vault / AWS Secrets Manager kullan

3. **Git Branches**
   ```bash
   # Güvenli checkout:
   git status  # Emin ol .env.local gitignore'da
   git log --oneline | head  # Eski commit'leri kontrol et
   ```

## 📊 API Limits

Google Generative AI Free Tier:
- **Requests per minute:** 60
- **Requests per day:** 1,500
- **Tokens per minute:** 32,000

Mevcut rate limiting: **1 request/second** (config'te ayarlanabilir)

---

**Sorular?** Ayarları `src/utils/aiService.js` dosyasında kontrol edebilirsin.
