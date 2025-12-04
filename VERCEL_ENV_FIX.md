# 🔴 VERCEL - Environment Variables Setup

## Sorun
Vercel'de deploy edildikten sonra API KEY hatası alıyorsun çünkü environment variables yüklenmemiş.

## Çözüm (3 dakika)

### Step 1: Vercel Dashboard'a Git
https://vercel.com/dashboard

### Step 2: Proje'ni Seç
- `yks-takip-sistemi` veya benzeri adlı proje'yi bul ve tıkla

### Step 3: Settings Tab'ine Git
Sol menüden: **Settings** → **Environment Variables**

### Step 4: Variable Ekle
**Name**: `VITE_GOOGLE_AI_API_KEY`  
**Value**: `AIzaSyBmjqecYWGf8b8Erwpsq16yKwHf3ss0QuI`

Sonra seç:
- ✅ Production
- ✅ Preview  
- ✅ Development

**Add** butonuna tıkla.

### Step 5: Redeploy
1. Vercel dashboard'a dön
2. Proje'nin üstündeki "Deployments" tab'ı tıkla
3. En son deployment'ın sağında "..." → "Redeploy" seç
4. "Redeploy" butonuna tıkla

Yaklaşık 2 dakika beklersek yeniden deploy olacak.

---

## Aynı Zamanda Firebase Domain'i Ekle

### Step 1: Firebase Console'a Git
https://console.firebase.google.com/project/ykshub-8c76f/authentication/settings

### Step 2: Authorized Domains
**Authentication** → **Settings** → **Authorized domains** 

### Step 3: `ykshub.vercel.app` Ekle
1. "Add domain" butonuna tıkla
2. `ykshub.vercel.app` yaz
3. Add et

---

## ✅ Test Et (5 dakika sonra)

```
1. https://ykshub.vercel.app aç
2. DevTools Console'u açtığında hata olmayacak
3. Login formu çalışacak
4. AI features working
```

---

## İkinci Sorun: Icon 404 Hatası

Manifest'teki icon PNG dosyaları yok. Şimdi ekle:

### Quick Fix:
1. Herhangi bir PNG resim indir (192x192 ve 512x512)
2. `public/icon-192.png` ve `public/icon-512.png` olarak kaydet
3. Redeploy (Vercel otomatik çeker)

**VEYA** manifest'deki icon references'ı comment'le (opsiyonel):

`public/manifest.json`'da:
```json
// "icons": [ ... ] kısmını yorum yap
```

---

## Tüm Adımlar Özet

| Adım | Zaman |
|------|-------|
| Vercel env var ekle | 1 dk |
| Firebase domain ekle | 1 dk |
| Vercel redeploy | 2 dk |
| Test et | 1 dk |
| **TOPLAM** | **~5 dakika** |

---

## Eğer Sorun Devam Ederse

1. **Hard refresh**: Cmd+Shift+R
2. **Cache temizle**: Ctrl+Shift+Delete
3. **Private mode**: Başka tarayıcıda test et
4. **Console'u kontrol et**: Yeni error var mı?

Sorun devam ederse konsol hatasını bildir!

