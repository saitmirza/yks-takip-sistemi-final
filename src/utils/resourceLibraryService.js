/**
 * 📚 Kaynak Kütüphanesi Yardımcı Fonksiyonları
 * Upload, Download, Like, Report işlemleri
 */

import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  increment,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from './constants';
import { uploadToCloudinary } from './cloudinaryService';

// ============================================
// 1. DOSYA YÜKLEME (Upload)
// ============================================

export const uploadResource = async (file, resourceData) => {
  /**
   * @param {File} file - Yüklenecek dosya
   * @param {Object} resourceData - Kaynak metadata
   *   - title: Başlık
   *   - description: Açıklama
   *   - category: TYT/AYT/YDT
   *   - subject: Ders adı
   *   - type: Dosya tipi
   *   - userId: Yükleyen user ID
   *   - userName: Yükleyen adı
   *   - userAvatar: Yükleyen avatarı
   *   - userClass: Yükleyen sınıfı
   *   - isAdmin: Admin mi?
   * @returns {Promise<{success, resourceId, message}>}
   */
  
  try {
    // 1. Dosya doğrulaması
    const MAX_SIZE = 100 * 1024 * 1024; // 100 MB (Cloudinary limiti)
    if (file.size > MAX_SIZE) {
      return { success: false, message: "Dosya çok büyük (Max: 100 MB)" };
    }

    const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { success: false, message: "Desteklenmeyen dosya tipi (PDF, JPG, PNG, DOC)" };
    }

    // 2. Dosyayı Cloudinary'e upload et
    console.log(`📤 Cloudinary'ye yükleniyor: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    const uploadResult = await uploadToCloudinary(file, resourceData.title);
    
    if (!uploadResult.success) {
      console.error(`❌ Cloudinary upload hatası: ${uploadResult.message}`);
      return { success: false, message: uploadResult.message };
    }
    console.log(`✅ Cloudinary'ye başarıyla yüklendi: ${uploadResult.url}`);

    // 3. Firestore'a metadata ve Cloudinary URL'sini kaydet
    const resourceRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'resources');
    
    const fileExt = file.name.split('.').pop();
    
    const resourceDoc = {
      // Yükleyici bilgisi
      uploaderId: resourceData.userId,
      uploaderName: resourceData.userName,
      uploaderAvatar: resourceData.userAvatar || '',
      uploaderClass: resourceData.userClass || 'Belirsiz',

      // Temel bilgiler
      title: resourceData.title,
      description: resourceData.description || '',

      // Kategori
      category: resourceData.category,
      subject: resourceData.subject,
      type: resourceData.type,

      // Dosya (Cloudinary URL)
      fileName: file.name,
      fileSize: uploadResult.fileSize,
      fileUrl: uploadResult.url, // Cloudinary secure URL
      cloudinaryPublicId: uploadResult.publicId, // Silme için gerekli
      fileType: file.type,
      fileExtension: fileExt,

      // Moderasyon (Admin direkt onaylı, öğrenci pending)
      status: resourceData.isAdmin ? 'approved' : 'pending',
      source: resourceData.isAdmin ? 'official' : 'student',
      approvedBy: resourceData.isAdmin ? resourceData.userId : null,
      approvedAt: resourceData.isAdmin ? serverTimestamp() : null,
      rejectedBy: null,
      rejectionReason: null,

      // İstatistikler
      views: 0,
      downloads: 0,
      likes: 0,
      reports: 0,

      // Etiketler
      tags: resourceData.tags || [],

      // Tarihler
      timestamp: Date.now(), // Indexlenebilir
      uploadedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(resourceRef, resourceDoc);

    console.log(`✅ Resource uploaded successfully: ${docRef.id}`);
    return { 
      success: true, 
      resourceId: docRef.id, 
      message: resourceData.isAdmin 
        ? "✅ Kaynak başarıyla yüklendi ve onaylandı!" 
        : "⏳ Kaynağınız yüklendi. Admin tarafından incelendikten sonra görünecektir."
    };

  } catch (error) {
    console.error("❌ Upload error:", error);
    return { success: false, message: `Yükleme hatası: ${error.message}` };
  }
};

// ============================================
// 2. DOSYA İNDİRME & LOGLAMA
// ============================================

export const downloadResource = async (resourceId, userId) => {
  /**
   * İndirme logu oluştur ve sayacı artır
   */
  try {
    // 1. Download logu oluştur
    const logsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'resource_downloads');
    await addDoc(logsRef, {
      resourceId,
      userId,
      downloadedAt: serverTimestamp(),
      timestamp: serverTimestamp()
    });

    // 2. Resource downloads sayacını artır
    const resourceRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'resources', resourceId);
    await updateDoc(resourceRef, {
      downloads: increment(1)
    });

    // 3. Kullanıcı kontribüsyon istatistiğini güncelle
    const userContribRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_contributions', userId);
    const userContribSnap = await getDoc(userContribRef);
    
    if (userContribSnap.exists()) {
      await updateDoc(userContribRef, {
        totalDownloads: increment(1)
      });
    }

    console.log(`📥 Download logged for resource: ${resourceId}`);
    return { success: true };

  } catch (error) {
    console.error("Download logging error:", error);
    return { success: false, message: error.message };
  }
};

// ============================================
// 3. BEĞENI (LIKE)
// ============================================

export const toggleLike = async (resourceId, userId) => {
  /**
   * Beğeni toggle et (Like ekle veya kaldır)
   */
  try {
    const likesRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'resource_likes');
    const likeQuery = query(likesRef, where('resourceId', '==', resourceId), where('userId', '==', userId));
    
    const likeSnap = await getDocs(likeQuery);

    if (likeSnap.empty) {
      // Beğeni ekle
      await addDoc(likesRef, {
        resourceId,
        userId,
        likedAt: serverTimestamp(),
        timestamp: serverTimestamp()
      });

      // Counter artır
      const resourceRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'resources', resourceId);
      await updateDoc(resourceRef, {
        likes: increment(1)
      });

      return { success: true, liked: true };
    } else {
      // Beğeni kaldır
      await deleteDoc(likeSnap.docs[0].ref);

      // Counter azalt
      const resourceRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'resources', resourceId);
      await updateDoc(resourceRef, {
        likes: increment(-1)
      });

      return { success: true, liked: false };
    }

  } catch (error) {
    console.error("Like error:", error);
    return { success: false, message: error.message };
  }
};

// ============================================
// 4. SORUN RAPORLAMA
// ============================================

export const reportResource = async (resourceId, userId, reason, description) => {
  /**
   * Kaynak hakkında sorun raporla
   * @param {string} reason - Bozuk Dosya, Hatalı İçerik, Telif Hakkı, Uygunsuz
   */
  try {
    const reportsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'resource_reports');
    await addDoc(reportsRef, {
      resourceId,
      reportedBy: userId,
      reason,
      description,
      reportedAt: serverTimestamp(),
      status: 'pending',
      timestamp: serverTimestamp()
    });

    // Resource reports counter artır
    const resourceRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'resources', resourceId);
    await updateDoc(resourceRef, {
      reports: increment(1)
    });

    console.log(`⚠️ Report filed for resource: ${resourceId}`);
    return { success: true, message: "Raporun kaydedildi. İncelemeler daha sonra yapılacak." };

  } catch (error) {
    console.error("Report error:", error);
    return { success: false, message: error.message };
  }
};

// ============================================
// 5. FİLTRELİ ARAMA
// ============================================

export const searchResources = async (filters) => {
  /**
   * @param {Object} filters
   *   - category: TYT/AYT/YDT
   *   - subject: Ders adı (optional)
   *   - type: Dosya tipi (optional)
   *   - sortBy: 'newest', 'popular', 'rating' (default: newest)
   *   - limit: Kaç kayıt (default: 20)
   */
  try {
    const constraints = [where('status', '==', 'approved')];

    if (filters.category) {
      constraints.push(where('category', '==', filters.category));
    }
    if (filters.subject) {
      constraints.push(where('subject', '==', filters.subject));
    }
    if (filters.type) {
      constraints.push(where('type', '==', filters.type));
    }

    // Sıralama alanı
    let orderByField = 'timestamp';
    if (filters.sortBy === 'popular') {
      orderByField = 'downloads';
    } else if (filters.sortBy === 'rating') {
      orderByField = 'likes';
    }

    const resourcesRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'resources');
    
    try {
      // Birinci deneme: orderBy ile
      const q = query(
        resourcesRef,
        ...constraints,
        orderBy(orderByField, 'desc'),
        limit(filters.limit || 20)
      );
      const snapshot = await getDocs(q);
      const resources = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, resources };
    } catch (orderByError) {
      // Index yoksa fallback
      if (orderByError.code === 'failed-precondition') {
        console.log('⚠️  Firestore index gerekli - in-memory sort yapılıyor');
        
        const q = query(
          resourcesRef,
          ...constraints,
          limit(100)
        );
        const snapshot = await getDocs(q);
        
        const resources = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .sort((a, b) => {
            if (orderByField === 'downloads') {
              return (b.downloads || 0) - (a.downloads || 0);
            } else if (orderByField === 'likes') {
              return (b.likes || 0) - (a.likes || 0);
            } else {
              return (b.timestamp || 0) - (a.timestamp || 0);
            }
          })
          .slice(0, filters.limit || 20);
        
        return { success: true, resources };
      } else {
        throw orderByError;
      }
    }

  } catch (error) {
    console.error("❌ Search error:", error.message);
    return { success: false, message: error.message, resources: [] };
  }
};

// ============================================
// 6. ADMIN PANELİ - ONAY İŞLEMLERİ
// ============================================

export const getPendingResources = async () => {
  /**
   * Admin paneli için bekleme kuyruğu
   * Hem pending hem approved resources'ları getir
   */
  try {
    const resourcesRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'resources');
    
    try {
      // Pending resources
      const pendingQ = query(
        resourcesRef,
        where('status', '==', 'pending'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
      const pendingSnap = await getDocs(pendingQ);
      
      // Approved resources
      const approvedQ = query(
        resourcesRef,
        where('status', '==', 'approved'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
      const approvedSnap = await getDocs(approvedQ);
      
      const allDocs = [...pendingSnap.docs, ...approvedSnap.docs];
      console.log(`✅ Pending+Approved (ordered): ${allDocs.length} tane`);
      
      const resources = allDocs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('📋 Loaded resources:', resources.slice(0, 2).map(r => ({ id: r.id, title: r.title, status: r.status })));
      
      return { success: true, resources };
    } catch (orderByError) {
      // Fallback
      if (orderByError.code === 'failed-precondition') {
        console.log('⚠️  Firestore index gerekli - fallback query kullanılıyor');
        
        const pendingQ = query(
          resourcesRef,
          where('status', '==', 'pending'),
          limit(100)
        );
        const pendingSnap = await getDocs(pendingQ);
        
        const approvedQ = query(
          resourcesRef,
          where('status', '==', 'approved'),
          limit(100)
        );
        const approvedSnap = await getDocs(approvedQ);
        
        const allDocs = [...pendingSnap.docs, ...approvedSnap.docs];
        console.log(`✅ Pending+Approved (no order): ${allDocs.length} tane`);
        
        const resources = allDocs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        console.log('📋 Loaded resources:', resources.slice(0, 2).map(r => ({ id: r.id, title: r.title, status: r.status })));
        
        return { success: true, resources };
      } else {
        throw orderByError;
      }
    }

  } catch (error) {
    console.error("❌ Resources error:", error.message);
    return { success: false, message: error.message, resources: [] };
  }
};

export const approveResource = async (resourceId, adminId) => {
  /**
   * Kaynağı onaylı yap
   */
  try {
    const resourceRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'resources', resourceId);
    
    // Kaynağı getir
    const resourceSnap = await getDoc(resourceRef);
    if (!resourceSnap.exists()) {
      console.error(`❌ Kaynak bulunamadı: ${resourceId}`);
      return { success: false, message: "Kaynak bulunamadı!" };
    }

    // Kaynağı onayla
    await updateDoc(resourceRef, {
      status: 'approved',
      approvedBy: adminId,
      approvedAt: serverTimestamp(),
      source: 'student'
    });

    console.log(`✅ Kaynak onaylandı: ${resourceId}`);

    // Yükleyici kontribüsyon istatistiğini güncelle
    const uploaderId = resourceSnap.data().uploaderId;
    const userContribRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_contributions', uploaderId);
    
    try {
      const contribSnap = await getDoc(userContribRef);
      if (contribSnap.exists()) {
        await updateDoc(userContribRef, {
          approvedUploads: increment(1),
          pendingUploads: increment(-1),
          contributionXP: increment(50)
        });
        console.log(`✅ User contribution updated: ${uploaderId}`);
      }
      await checkAndAwardBadges(uploaderId);
    } catch (contribError) {
      console.warn(`⚠️  Contribution update skipped:`, contribError.message);
    }

    return { success: true, message: "✅ Kaynak onaylandı!" };

  } catch (error) {
    console.error("❌ Approve error:", error.message);
    return { success: false, message: error.message };
  }
};

export const rejectResource = async (resourceId, reason, adminId) => {
  /**
   * Kaynağı reddet
   */
  try {
    const resourceRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'resources', resourceId);
    
    // Kaynağı getir
    const resourceSnap = await getDoc(resourceRef);
    if (!resourceSnap.exists()) {
      console.error(`❌ Kaynak bulunamadı: ${resourceId}`);
      return { success: false, message: "Kaynak bulunamadı!" };
    }

    // Kaynağı reddet
    await updateDoc(resourceRef, {
      status: 'rejected',
      rejectionReason: reason,
      rejectedBy: adminId,
      rejectedAt: serverTimestamp()
    });

    console.log(`❌ Kaynak reddedildi: ${resourceId}`);

    // Yükleyici kontribüsyon istatistiğini güncelle
    const uploaderId = resourceSnap.data().uploaderId;
    const userContribRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_contributions', uploaderId);
    
    try {
      const contribSnap = await getDoc(userContribRef);
      if (contribSnap.exists()) {
        await updateDoc(userContribRef, {
          rejectedUploads: increment(1),
          pendingUploads: increment(-1)
        });
        console.log(`✅ User contribution updated: ${uploaderId}`);
      }
    } catch (contribError) {
      console.warn(`⚠️  Contribution update skipped:`, contribError.message);
    }

    return { success: true, message: "✅ Kaynak reddedildi!" };

  } catch (error) {
    console.error("❌ Reject error:", error.message);
    return { success: false, message: error.message };
  }
};

// ============================================
// 7. ROZET SİSTEMİ
// ============================================

export const checkAndAwardBadges = async (userId) => {
  /**
   * Otomatik rozet kontrolü ve ödüllemesi
   */
  try {
    const userContribRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_contributions', userId);
    const userSnap = await getDoc(userContribRef);

    if (!userSnap.exists()) return;

    const data = userSnap.data();
    const newBadges = data.badges || [];

    // 🗂️ Arşivci: İlk onaylı not
    if (data.approvedUploads === 1 && !newBadges.includes('Arşivci')) {
      newBadges.push('Arşivci');
    }

    // 📚 Bilgi Paylaşımcısı: 10 onaylı not
    if (data.approvedUploads >= 10 && !newBadges.includes('Bilgi Paylaşımcısı')) {
      newBadges.push('Bilgi Paylaşımcısı');
    }

    // ⭐ Popüler Yazar: 1 notu 50+ kez indirilmiş
    const userResourcesRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'resources');
    const userResourcesQuery = query(
      userResourcesRef,
      where('uploaderId', '==', userId),
      where('status', '==', 'approved')
    );
    const resourcesSnap = await getDocs(userResourcesQuery);
    
    const hasPopularResource = resourcesSnap.docs.some(doc => doc.data().downloads >= 50);
    if (hasPopularResource && !newBadges.includes('Popüler Yazar')) {
      newBadges.push('Popüler Yazar');
    }

    // Rozet değişirse güncelle
    if (newBadges.length !== (data.badges || []).length) {
      await updateDoc(userContribRef, { badges: newBadges });
      console.log(`🎖️ Badges awarded to ${userId}:`, newBadges);
    }

  } catch (error) {
    console.error("Badge error:", error);
  }
};

// ============================================
// 8. İSTATİSTİKLER
// ============================================

export const getUserContributions = async (userId) => {
  /**
   * Kullanıcının katkı istatistikleri
   */
  try {
    const userContribRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_contributions', userId);
    const snap = await getDoc(userContribRef);

    if (snap.exists()) {
      return { success: true, data: snap.data() };
    } else {
      return { success: true, data: null };
    }

  } catch (error) {
    console.error("User contributions error:", error);
    return { success: false, message: error.message };
  }
};

// ============================================
// 9. DOSYA SİLME (Admin/Yükleyici)
// ============================================

export const deleteResource = async (resourceId, userId, isAdmin) => {
  /**
   * Kaynağı sil (Storage + Firestore)
   */
  try {
    const resourceRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'resources', resourceId);
    const resourceSnap = await getDoc(resourceRef);

    if (!resourceSnap.exists()) {
      return { success: false, message: "Kaynak bulunamadı." };
    }

    const resource = resourceSnap.data();

    // Yetki kontrolü
    if (!isAdmin && resource.uploaderId !== userId) {
      return { success: false, message: "Yetkiniz yok." };
    }

    // Firestore'dan sil (Base64 verisi yayılımı olmadığı için Storage silme gerekmez)
    await deleteDoc(resourceRef);

    console.log(`🗑️ Resource deleted: ${resourceId}`);
    return { success: true, message: "Kaynak silindi." };

  } catch (error) {
    console.error("Delete error:", error);
    return { success: false, message: error.message };
  }
};
