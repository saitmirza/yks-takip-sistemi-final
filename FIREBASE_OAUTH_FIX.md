# 🔧 Firebase OAuth Domain - Quick Fix

## Sorun
Firebase'de `ykshub.vercel.app` domain'i authorize edilmemişse OAuth hatası alırsın.

## Çözüm (5 dakika)

### Step 1: Firebase Console'a Git
https://console.firebase.google.com/project/ykshub-8c76f/authentication/settings

### Step 2: "Authorized domains" bölümüne gir
1. Console'da sol menüden "Authentication" → "Settings"
2. "Authorized domains" sekmesine tıkla
3. "Add domain" butonunu tıkla

### Step 3: Tüm domainleri ekle
Aşağıdaki domainleri sırası ile ekle:

```
localhost:5173          (Dev)
localhost:3000          (Alternatif dev)
127.0.0.1:5173          (Dev IP)
ykshub-8c76f.web.app    (Firebase Hosting)
ykshub.vercel.app       (Vercel - HATA DÜZELTMEK İÇİN)
yourdomain.com          (Production - sonra ekleyeceksin)
```

### Step 4: Save et
- "Add" butonuna tıkla
- Tüm domainleri ekledikten sonra değişiklikler otomatik kaydedilir

---

## Şu An İçin (Test)
Eğer hemen test etmek istersen:

```bash
# Firebase Hosting'de test et (zaten authorized)
https://ykshub-8c76f.web.app

# Localhost'da test et
npm run dev
# http://localhost:5173
```

---

## Hatı Mesajları Açıklaması

### "API KEY not configured"
```
Nedeni: import.meta.env.VITE_GOOGLE_AI_API_KEY boş
Çözüm: .env.local dosyasında key set edilmiş olmalı
Status: ✅ FIXED
```

### "OAuth domain not authorized"
```
Nedeni: Deployment domain Firebase'de eklenmemiş
Çözüm: Firebase Console'dan domain ekle
Status: ⏳ Yukarıdaki adımları takip et
```

### "Failed to load resource: 404"
```
Nedeni: Screenshot PNG dosyaları yok
Çözüm: Gerekli değil, PWA manifest için opsiyonel
Status: ⚠️ Ignore (sadece manifest iconları)
```

---

## ✅ Verification Checklist

Domainleri ekledikten sonra:

```bash
# 1. Local test
npm run dev
# Gir: http://localhost:5173
# Login yap - hata olmayacak

# 2. Firebase Hosting test
# Gir: https://ykshub-8c76f.web.app
# Tüm özellikler çalışmalı

# 3. Vercel test (eğer deploy ettiysen)
# Gir: https://ykshub.vercel.app
# Login hata vermemeli
```

---

## 📞 Hala Problem Varsa

1. **Hard refresh yap**: Cmd+Shift+R (cache clear)
2. **Dev tools console'u kontrol et**: Yeni hata var mı?
3. **Firebase logs kontrol et**: Console.firebase.google.com
4. **Debug dashboard**: https://yourdomain.com/iphone-debug.html

---

**Tahmini çözüm süresi**: 2 dakika  
**Impact**: Zero - sadece domain konfigürasyonu  
**Rollback**: Gerekli değil
