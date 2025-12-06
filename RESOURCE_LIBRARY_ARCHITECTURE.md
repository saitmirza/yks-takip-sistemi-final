# 📚 Kaynak Kütüphanesi Mimarisi

## 1. Firebase Storage Yapısı

```
storage/
└── artifacts/
    └── yks-takip-sistemi-vi1/
        └── resources/
            ├── tyt/
            │   ├── matematik/
            │   │   ├── ozel-kaynaklar/ (Admin)
            │   │   └── ogrenci-palas/ (Öğrenci uploads)
            │   ├── turkce/
            │   └── ...
            ├── ayt/
            │   ├── kimya/
            │   └── ...
            └── ydt/
                └── ingilizce/
```

**Adlandırma:**
- Dosya: `{timestamp}_{userId}_{orijinal_isim}` (Benzersizlik garantisi)
- Örn: `1733459200_user123_matematik-formuler.pdf`

---

## 2. Firestore Veritabanı Şema

### Collection: `artifacts/{APP_ID}/public/data/resources`

```javascript
{
  id: "doc-id-auto",
  
  // YÜKLEYİCİ BİLGİSİ
  uploaderId: "user123",
  uploaderName: "Ahmet K.",
  uploaderAvatar: "data:image/base64...",
  uploaderClass: "12-A",
  
  // TEMEL BİLGİLER
  title: "Matematikte Integral Formülleri",
  description: "TYT Matematik için 30 integral sorusu çözümü",
  
  // KATEGORİ BİLGİLERİ
  category: "TYT", // TYT, AYT, YDT
  subject: "Matematik", // Ders adı
  type: "Deneme", // Konu Özeti, Deneme, Çıkmış Soru, Hap Bilgi, Konu Anlatımı
  
  // DOSYA BİLGİLERİ
  fileName: "matematik-integral-formuler.pdf",
  fileSize: 2457600, // Bytes (2.4 MB)
  fileUrl: "gs://bucket/artifacts/yks-takip-sistemi-vi1/resources/tyt/matematik/...",
  fileType: "pdf", // pdf, jpg, png, doc, video/mp4 vb.
  
  // MODERASYON
  status: "approved", // pending, approved, rejected
  approvedBy: "admin@example.com", // Admin ID (Boş kalabilir)
  approvedAt: Timestamp,
  rejectionReason: "Telif hakkı ihlali", // Reddedilirse neden
  
  // KAYNAK TÜRÜ
  source: "official", // official, student, verified
  // official: Admin/Kurum
  // student: Öğrenci (onaylı)
  // verified: Özel kontrol geçmiş (yıldızlı ⭐)
  
  // ETKILEŞIM
  downloads: 347,
  likes: 89,
  reports: 2, // Hatalı rapor sayısı
  rating: 4.5, // 1-5 yıldız
  ratingCount: 23,
  
  // META
  tags: ["integral", "formüller", "hızlı-bak"],
  uploadedAt: Timestamp,
  updatedAt: Timestamp,
  
  // İSTATİSTİK
  views: 1200,
  lastDownloadedAt: Timestamp,
}
```

---

## 3. İlişkili Collections

### `artifacts/{APP_ID}/public/data/resource_downloads` (İndirmeler)
```javascript
{
  resourceId: "doc-id",
  userId: "user123",
  userName: "Ahmet K.",
  downloadedAt: Timestamp,
  timestamp: serverTimestamp()
}
```

### `artifacts/{APP_ID}/public/data/resource_likes` (Beğeniler)
```javascript
{
  resourceId: "doc-id",
  userId: "user123",
  likedAt: Timestamp,
  timestamp: serverTimestamp()
}
```

### `artifacts/{APP_ID}/public/data/resource_reports` (Raporlar)
```javascript
{
  resourceId: "doc-id",
  reportedBy: "user123",
  reason: "Bozuk dosya", // Bozuk Dosya, Hatalı İçerik, Telif, Uygunsuz
  description: "Dosya açılmıyor",
  reportedAt: Timestamp,
  status: "pending" // pending, reviewed, resolved
}
```

### `artifacts/{APP_ID}/public/data/user_contributions` (Katkı İstatistikleri)
```javascript
{
  userId: "user123",
  totalUploads: 15,
  approvedUploads: 12,
  rejectedUploads: 2,
  pendingUploads: 1,
  totalDownloads: 450, // Yüklenen dosyalar kaç kere indirildi
  totalLikes: 127,
  badges: ["Arşivci", "Bilgi Paylaşımcısı"], // Rozet isimleri
  contributionXP: 2450,
  lastUploadedAt: Timestamp
}
```

---

## 4. Firestore Security Rules

```javascript
// resources koleksiyonu
match /artifacts/{appId}/public/data/resources/{document=**} {
  // Admin yükleyebilir (direkt approved)
  allow create: if request.auth.uid in auth.adminUsers && 
                   request.resource.data.status == "approved";
  
  // Öğrenci yükleyebilir (pending)
  allow create: if request.auth.uid != null && 
                   request.resource.data.uploaderId == request.auth.uid &&
                   request.resource.data.status == "pending";
  
  // Herkese oku izni (approved sadece)
  allow read: if resource.data.status == "approved" || 
                 (request.auth.uid == resource.data.uploaderId);
  
  // Admin ve Yükleyici güncelleyebilir
  allow update: if request.auth.uid in auth.adminUsers || 
                   request.auth.uid == resource.data.uploaderId;
}

// Downloads collection
match /artifacts/{appId}/public/data/resource_downloads/{document=**} {
  allow create: if request.auth.uid != null;
  allow read: if true; // Stats için
}

// Likes collection
match /artifacts/{appId}/public/data/resource_likes/{document=**} {
  allow create: if request.auth.uid != null;
  allow read: if true;
}

// Reports collection
match /artifacts/{appId}/public/data/resource_reports/{document=**} {
  allow create: if request.auth.uid != null;
  allow read: if request.auth.uid in auth.adminUsers; // Admin-only
}
```

---

## 5. Dosya Tipi Açılım

| Tür | Açıklama | İkon |
|-----|----------|------|
| Deneme | Tam deneme sınavı | 📝 |
| Konu Özeti | Hap bilgi/formülür | 📌 |
| Çıkmış Soru | Geçmiş sınav soruları | 🎯 |
| Hap Bilgi | Quick reference | ⚡ |
| Konu Anlatımı | Video/PDF anlatım | 🎬 |
| Çalışma Notu | Öğrenci notları | 📓 |

---

## 6. Moderasyon Akışı

```
Öğrenci Yükleme
    ↓
[pending] → Admin Dashboard
    ↓
[Admin İnceleme]
    ├─ Uygunsa → status: "approved" → Kütüphanede Görünür
    ├─ Hatalıysa → status: "rejected" + rejectionReason → Bildirim
    └─ Kuşkuysa → Manual İnceleme
```

---

## 7. İndirme Akışı

```
1. Kullanıcı "İndir" Butonuna Tıklar
    ↓
2. Firestore'da Download Logu Oluştur
    ↓
3. Storage'dan Dosya İndir
    ↓
4. Resource.downloads Sayacını Artır
    ↓
5. User_Contributions.totalDownloads Güncelle
    ↓
6. Rozet Kontrolü (Popüler Yazar: 50+ İndirme)
```

---

## 8. Oyunlaştırma Rozetleri

| Rozet | Koşul | İkon |
|-------|-------|------|
| 🗂️ Arşivci | İlk onaylı not paylaşma | archive |
| 📚 Bilgi Paylaşımcısı | 10 onaylı not | books |
| ⭐ Popüler Yazar | 1 notu 50+ kez indirilmiş | star |
| 🔥 Trend Yaratan | 3 notu en çok indirilen 10'da | fire |
| 🎖️ Kuratorlu Kaynak | Admin tarafından "Verified" | medal |

---

## 9. Implementation Sırası

1. ✅ Firestore Şema Oluştur
2. ✅ Storage Yapısı Hazırla
3. Admin Dosya Yükleme Component'i
4. Admin Onay Paneli
5. Kütüphane Listeleme (Filtreleme)
6. Öğrenci Yükleme Sistemi
7. İndirme/Beğeni/Rapor Mekanizması
8. Rozet Sistemi Entegrasyonu

---

## 10. Sınırlamalar ve Kötüye Kullanım Önlemi

- **Dosya Boyutu**: Max 50 MB (Video hariç)
- **Yükleme Sıklığı**: Günde max 5 dosya (Spam önleme)
- **Sadece PDF/JPG/PNG** kabul edilir (Güvenlik)
- **Virus Scan**: Cloud Storage otomatik tarar
- **Telif Hakkı**: Raporlananlara "Telif Hakkı İhlali" yazılır

---

## 11. API Endpoints (Cloud Functions)

```
POST /api/resources/upload
  - Admin veya Öğrenci yükleme
  
GET /api/resources
  - Filtreleme: ?category=TYT&subject=Matematik&type=Deneme
  
GET /api/resources/{id}
  - Tek kaynak detayı
  
POST /api/resources/{id}/download
  - İndirme logu
  
POST /api/resources/{id}/like
  - Beğeni toggle
  
POST /api/resources/{id}/report
  - Sorun raporlama
  
GET /api/admin/pending-resources
  - Admin onay paneli
  
PATCH /api/admin/resources/{id}/approve
  - Onaylama
  
PATCH /api/admin/resources/{id}/reject
  - Reddetme
```

