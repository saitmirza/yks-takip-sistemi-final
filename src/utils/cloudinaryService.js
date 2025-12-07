/**
 * Cloudinary File Upload Service
 * Resimler ve belgeler için Cloudinary'e upload
 */

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'djbviifqx';
const CLOUDINARY_API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY || '533143555769526';

/**
 * Dosyayı Cloudinary'e upload et
 * @param {File} file - Yüklenecek dosya
 * @param {string} resourceTitle - Kaynak başlığı (tag olarak kullanılacak)
 * @returns {Promise<{success, url, publicId, message}>}
 */
export const uploadToCloudinary = async (file, resourceTitle = 'resource') => {
  try {
    // 1. FormData oluştur
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'yks_hub_resources'); // Cloudinary'de oluşturman gerekiyor
    formData.append('tags', `yks_hub,${resourceTitle.replace(/\s+/g, '_')}`);
    formData.append('resource_type', 'auto'); // Otomatik dosya tipi algıla

    // 2. Cloudinary API'sine POST et
    console.log(`📤 Uploading to Cloudinary: ${file.name} (${file.type})`);
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Cloudinary error response:', data);
      throw new Error(data.error?.message || `Cloudinary error: ${response.statusText}`);
    }

    console.log(`✅ Cloudinary upload successful: ${data.public_id}`);
    console.log(`📍 URL: ${data.secure_url}`);
    return {
      success: true,
      url: data.secure_url, // HTTPS URL
      publicId: data.public_id,
      fileSize: data.bytes,
      message: 'Dosya başarıyla Cloudinary\'ye yüklendi'
    };

  } catch (error) {
    console.error('❌ Cloudinary upload error:', error.message);
    console.error('   Full error:', error);
    return {
      success: false,
      message: `Cloudinary yükleme hatası: ${error.message}`
    };
  }
};

/**
 * Cloudinary'den dosya sil
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<{success, message}>}
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    // Not: Bu işlem API Secret gerekli, backend'de yapılmalı
    // Frontend'de security nedeniyle önerilmiyor
    console.warn('⚠️ Deletion requires backend implementation for security');
    return { success: false, message: 'Deletion must be done from backend' };
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error);
    return { success: false, message: error.message };
  }
};
