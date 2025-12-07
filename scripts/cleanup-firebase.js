/**
 * 🔧 Firebase Firestore Cleanup Script
 * Eski Base64 dosya verilerini kaldırır
 * 
 * KULLANIM:
 * 1. Node.js kuruludur (npm install -g firebase-cli)
 * 2. Firebase'de admin token al (Service Account Key)
 * 3. Aşağıdaki kodu Node.js ortamında çalıştır
 */

const admin = require('firebase-admin');

// Firebase'i başlat (Service Account JSON'unu yükle)
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://yks-takip-sistemi.firebaseapp.com'
});

const db = admin.firestore();

async function cleanupOldBaseFiles() {
  console.log('🔄 Başlıyor: Eski Base64 dosyaları temizleniyor...');

  const APP_ID = 'yks-takip-sistemi-v1';
  const resourcesRef = db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('resources');

  try {
    // fileData alanı olan tüm documents'ı bul
    const snapshot = await resourcesRef.where('fileData', '!=', null).get();

    console.log(`📊 ${snapshot.size} adet Base64 dosya bulundu`);

    if (snapshot.size === 0) {
      console.log('✅ Temizlenecek eski dosya yok!');
      return;
    }

    // Batch delete (Firestore limit: max 500 per batch)
    let count = 0;
    let batch = db.batch();
    const batchSize = 100;

    for (const doc of snapshot.docs) {
      batch.update(doc.ref, { fileData: admin.firestore.FieldValue.delete() });
      count++;

      if (count % batchSize === 0) {
        await batch.commit();
        batch = db.batch();
        console.log(`✅ ${count} adet işlendi...`);
      }
    }

    // Son batch'i commit et
    if (count % batchSize !== 0) {
      await batch.commit();
    }

    console.log(`✅ Tamamlandı! Toplamda ${count} adet Base64 alanı kaldırıldı`);

  } catch (error) {
    console.error('❌ Hata oluştu:', error);
  }

  // Admin'i kapat
  await admin.app().delete();
}

// Başlat
cleanupOldBaseFiles();
