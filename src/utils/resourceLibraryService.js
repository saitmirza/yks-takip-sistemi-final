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
import { ref, uploadBytes, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { APP_ID } from './constants';

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
    const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
    if (file.size > MAX_SIZE) {
      return { success: false, message: "Dosya çok büyük (Max: 50 MB)" };
    }

    const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { success: false, message: "Desteklenmeyen dosya tipi (PDF, JPG, PNG, DOC)" };
    }

    // 2. Storage'a yükle
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const cleanFileName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    const uniqueFileName = `${timestamp}_${resourceData.userId}_${cleanFileName}.${fileExt}`;
    
    const storagePath = `artifacts/${APP_ID}/resources/${resourceData.category.toLowerCase()}/${resourceData.subject.toLowerCase().replace(/\s+/g, '-')}/${uniqueFileName}`;
    const storageRef = ref(storage, storagePath);

    console.log(`📤 Uploading to: ${storagePath}`);
    const snapshot = await uploadBytes(storageRef, file);
    const fileUrl = `gs://${snapshot.bucket}/${snapshot.fullPath}`;

    // 3. Firestore'a metadata kaydet
    const resourceRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'resources');
    
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

      // Dosya
      fileName: file.name,
      fileSize: file.size,
      fileUrl: fileUrl,
      fileType: fileExt,

      // Moderasyon (Admin direkt onaylı, öğrenci pending)
      status: resourceData.isAdmin ? 'approved' : 'pending',
      source: resourceData.isAdmin ? 'official' : 'student',
      approvedBy: resourceData.isAdmin ? resourceData.userId : null,
      approvedAt: resourceData.isAdmin ? serverTimestamp() : null,

      // Etkileşim
      downloads: 0,
      likes: 0,
      reports: 0,
      rating: 0,
      ratingCount: 0,
      views: 0,

      // Meta
      tags: resourceData.tags || [],
      uploadedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(resourceRef, resourceDoc);
    console.log(`✅ Resource created: ${docRef.id}`);

    // 4. Admin İse Direkt Onaylı, Öğrenci İse Pending
    const statusMsg = resourceData.isAdmin 
      ? "✅ Dosya onaylandı ve kütüphanede yayında!"
      : "⏳ Dosyan inceleniyor. Admin onayı sonrası görünür.";

    return { 
      success: true, 
      resourceId: docRef.id,
      message: statusMsg
    };

  } catch (error) {
    console.error("Upload error:", error);
    return { success: false, message: `Hata: ${error.message}` };
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
    let q;
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

    // Sıralama
    let orderByField = 'uploadedAt';
    if (filters.sortBy === 'popular') {
      orderByField = 'downloads';
    } else if (filters.sortBy === 'rating') {
      orderByField = 'rating';
    }

    const resourcesRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'resources');
    q = query(
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

  } catch (error) {
    console.error("Search error:", error);
    return { success: false, message: error.message, resources: [] };
  }
};

// ============================================
// 6. ADMIN PANELİ - ONAY İŞLEMLERİ
// ============================================

export const getPendingResources = async () => {
  /**
   * Admin paneli için bekleme kuyruğu
   */
  try {
    const resourcesRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'resources');
    const q = query(
      resourcesRef,
      where('status', '==', 'pending'),
      orderBy('uploadedAt', 'asc'),
      limit(50)
    );

    const snapshot = await getDocs(q);
    const resources = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, resources };

  } catch (error) {
    console.error("Pending resources error:", error);
    return { success: false, message: error.message, resources: [] };
  }
};

export const approveResource = async (resourceId, adminId) => {
  /**
   * Kaynağı onaylı yap
   */
  try {
    const resourceRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'resources', resourceId);
    await updateDoc(resourceRef, {
      status: 'approved',
      approvedBy: adminId,
      approvedAt: serverTimestamp(),
      source: 'student' // Onaylanan öğrenci kaynağı
    });

    // Yükleyici kontribüsyon istatistiğini güncelle
    const resourceSnap = await getDoc(resourceRef);
    if (resourceSnap.exists()) {
      const uploaderId = resourceSnap.data().uploaderId;
      const userContribRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_contributions', uploaderId);
      
      await updateDoc(userContribRef, {
        approvedUploads: increment(1),
        pendingUploads: increment(-1),
        contributionXP: increment(50) // 50 XP per approved upload
      });

      // Rozet kontrolü
      await checkAndAwardBadges(uploaderId);
    }

    console.log(`✅ Resource approved: ${resourceId}`);
    return { success: true, message: "Kaynak onaylandı!" };

  } catch (error) {
    console.error("Approve error:", error);
    return { success: false, message: error.message };
  }
};

export const rejectResource = async (resourceId, reason, adminId) => {
  /**
   * Kaynağı reddet
   */
  try {
    const resourceRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'resources', resourceId);
    await updateDoc(resourceRef, {
      status: 'rejected',
      rejectionReason: reason,
      approvedBy: adminId,
      approvedAt: serverTimestamp()
    });

    // Yükleyici kontribüsyon istatistiğini güncelle
    const resourceSnap = await getDoc(resourceRef);
    if (resourceSnap.exists()) {
      const uploaderId = resourceSnap.data().uploaderId;
      const userContribRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_contributions', uploaderId);
      
      await updateDoc(userContribRef, {
        rejectedUploads: increment(1),
        pendingUploads: increment(-1)
      });
    }

    console.log(`❌ Resource rejected: ${resourceId}`);
    return { success: true, message: "Kaynak reddedildi." };

  } catch (error) {
    console.error("Reject error:", error);
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

    // Storage'dan sil
    const fileUrl = resource.fileUrl;
    if (fileUrl) {
      const fileRef = ref(storage, fileUrl);
      await deleteObject(fileRef).catch(err => console.warn("Storage delete error:", err));
    }

    // Firestore'dan sil
    await deleteDoc(resourceRef);

    console.log(`🗑️ Resource deleted: ${resourceId}`);
    return { success: true, message: "Kaynak silindi." };

  } catch (error) {
    console.error("Delete error:", error);
    return { success: false, message: error.message };
  }
};
