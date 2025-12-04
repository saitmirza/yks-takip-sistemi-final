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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)