# Firestore Index Kurulum Rehberi

## 🔴 Sorun
Console'da şu hata görülüyor:
```
FirebaseError: The query requires an index. You can create it here:
https://console.firebase.google.com/v1/r/project/yks-takip-sistemi/firestore-2Vt21uZQV4ZMvVxyXAgGpokBhNOYR1cxABGpqKCFi9flbmFtZ9FfAF
```

## ✅ Çözüm

### Seçenek 1: Otomatik Index Oluşturma (Önerilen)
1. Console'daki hata mesajında verilen linki tıkla
2. Sayfada "Create Index" butonuna tıkla
3. Firebase otomatik olarak gerekli index'i oluşturacak

### Seçenek 2: Manuel Index Oluşturma
1. https://console.firebase.google.com adresine git
2. Proje seç: **yks-takip-sistemi**
3. Sol menüden **Firestore Database** → **Indexes** seç
4. Aşağıdaki index'leri oluştur:

#### Index 1: Pending Resources
- **Collection ID:** `artifacts/{{APP_ID}}/public/data/resources`
- **Fields to index:**
  - `status` (Ascending)
  - `timestamp` (Ascending)
- **Query scope:** Collection

#### Index 2: Search Resources
- **Collection ID:** `artifacts/{{APP_ID}}/public/data/resources`
- **Fields to index:**
  - `status` (Ascending)
  - `category` (Ascending)
  - `subject` (Ascending)
  - `timestamp` (Descending)
- **Query scope:** Collection

#### Index 3: Downloads Sorting
- **Collection ID:** `artifacts/{{APP_ID}}/public/data/resources`
- **Fields to index:**
  - `status` (Ascending)
  - `downloads` (Descending)
- **Query scope:** Collection

## 📝 Not
- `{{APP_ID}}` kendi app ID'nle değiştir
- Index oluşturma 5-15 dakika alabilir
- Index oluşturulduktan sonra console hataları kaybolacak

## ✨ Alternativ
Kod zaten index olmadan çalışacak şekilde yazılmıştır (fallback sorting kullanır):
- Database'de arama yapılır
- Sonuçlar client-side'da sort'lanır
- Performance biraz daha düşük ama fonksiyonel
- Production'da index'ler oluşturman daha iyi performans sağlar
