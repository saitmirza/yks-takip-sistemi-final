// OBP Katsayısı (Diploma Notu * 0.6 = Ek Puan)
const OBP_KAT_SAYISI = 0.6; 

// --- OBP HESAPLAMA ---
export const calculateOBP = (s9, s10, s11, s12) => {
  const avg = (Number(s9) + Number(s10) + Number(s11) + Number(s12)) / 4;
  // Diploma notu 50'den düşük olamaz, 100'den büyük olamaz
  const diplomaNote = Math.min(Math.max(avg, 50), 100); 
  
  const placementBonus = diplomaNote * OBP_KAT_SAYISI;
  
  return {
    diplomaNote: diplomaNote.toFixed(2),
    OBPScore: (diplomaNote * 5).toFixed(2),
    placementBonus: placementBonus.toFixed(2),
  };
};

// --- RESİM SIKIŞTIRMA (Profil ve Soru Duvarı İçin) ---
export const resizeAndCompressImage = (file, maxWidth = 100, maxHeight = 100, quality = 0.7) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round(height * (maxWidth / width));
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round(width * (maxHeight / height));
                        height = maxHeight;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const resizedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(resizedBase64);
            };
        };
        reader.onerror = (error) => resolve('');
    });
};

// --- 2024 YKS SAYISAL (MF) HASSAS SIRALAMA ALGORİTMASI ---
// Lineer İnterpolasyon (Orantısal Hesaplama) Yöntemi
export const getEstimatedRank = async (score) => {
    const s = Number(score);
    let rank = 0;

    // TAM PUAN KONTROLÜ (500 Ham + 60 OBP = 560 Maksimum)
    if (s >= 555) {
        rank = 1; // Zirve
    }
    else if (s >= 540) {
        // İlk 1.000 (Çok sıkışık)
        // 555 puanda 1. ise, 540 puanda yaklaşık 1000.
        rank = 1 + (555 - s) * 66; 
    } 
    else if (s >= 520) {
        // 1.000 - 5.000 Bandı (Tıp Zirvesi)
        rank = 1000 + (540 - s) * 200;
    } 
    else if (s >= 500) {
        // 5.000 - 15.000 Bandı
        rank = 5000 + (520 - s) * 500;
    } 
    else if (s >= 480) {
        // 15.000 - 30.000 Bandı
        rank = 15000 + (500 - s) * 750;
    } 
    else if (s >= 460) {
        // 30.000 - 50.000 Bandı
        rank = 30000 + (480 - s) * 1000;
    } 
    else if (s >= 440) {
        // 50.000 - 80.000 Bandı
        rank = 50000 + (460 - s) * 1500;
    } 
    else if (s >= 400) {
        // 80.000 - 140.000 Bandı (Yığılma Artıyor)
        rank = 80000 + (440 - s) * 1500;
    } 
    else if (s >= 350) {
        // 140.000 - 250.000 Bandı
        rank = 140000 + (400 - s) * 2200;
    } 
    else if (s >= 300) {
        // 250.000 - 400.000 Bandı
        rank = 250000 + (350 - s) * 3000;
    } 
    else {
        // 400.000+ ve Baraj Altı
        rank = 400000 + (300 - s) * 4000;
    }

    // Negatif veya 0 çıkarsa 1 yap (Garanti)
    if (rank < 1) rank = 1;

    // Sıralamayı yuvarla (Küsuratlı insan olmaz)
    const exactRank = Math.floor(rank);
    
    // Binlik ayırıcı ile formatla (örn: 12.454)
    const formattedRank = new Intl.NumberFormat('tr-TR').format(exactRank);

    return `Sayısal: ${formattedRank}`;
};