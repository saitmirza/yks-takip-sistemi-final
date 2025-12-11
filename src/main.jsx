import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // Yerel Tailwind stillerini içeri aktarır

// iOS Safari optimizasyonları
if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
  // iOS'ta viewport-fit ve display standby'ı optimize et
  const meta = document.createElement('meta');
  meta.name = 'viewport-fit';
  meta.content = 'cover';
  document.head.appendChild(meta);

  // iOS Safari'de body scroll lock sorununu çöz
  document.body.addEventListener('touchmove', function(e) {
    if (e.target.closest('.modal, .dialog, [data-scrollable]')) {
      return;
    }
  }, { passive: false });

  // iOS'ta minimal-ui ayarı (URL bar gizle)
  window.scrollTo(0, 1);
}

// Global error handler - iPhone'da tüm hataları yakala
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
});
// --- VERSİYON KONTROLÜ VE TEMİZLİK ---
const APP_VERSION = '1.0.3'; // Her güncellemede bunu değiştir!

const clearCacheAndReload = () => {
  console.log("🧹 Yeni sürüm tespit edildi. Temizlik yapılıyor...");
  
  // 1. LocalStorage Temizle (Kritik olmayanlar)
  localStorage.clear();
  sessionStorage.clear();

  // 2. Service Worker'ları Öldür (PWA Cache Sorunu İçin)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister();
      }
    });
  }

  // 3. Versiyonu Kaydet
  localStorage.setItem('app_version', APP_VERSION);
  
  // 4. Sayfayı Zorla Yenile
  window.location.reload();
};

// Başlangıçta Kontrol Et
const currentVersion = localStorage.getItem('app_version');
if (currentVersion !== APP_VERSION) {
  // Eğer versiyon farklıysa temizlik yap (Bu sadece 1 kere çalışır)
  clearCacheAndReload();
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)