// OBP Katsayısı (Diploma * 0.6)
const OBP_KAT_SAYISI = 0.6; 

// --- 1. OBP HESAPLAMA ---
export const calculateOBP = (s9, s10, s11, s12) => {
  const avg = (Number(s9) + Number(s10) + Number(s11) + Number(s12)) / 4;
  const diplomaNote = Math.min(Math.max(avg, 50), 100); 
  const placementBonus = diplomaNote * OBP_KAT_SAYISI;
  
  return {
    diplomaNote: diplomaNote.toFixed(2),
    OBPScore: (diplomaNote * 5).toFixed(2),
    placementBonus: placementBonus.toFixed(2),
  };
};

// --- 2. RESİM SIKIŞTIRMA ---
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

// --- 3. SAYISAL PUAN HESAPLAMA (2024/2025 KATSAYILARI) ---
// Admin panelinde AYT Fen tek girildiği için ortalama katsayı kullanılır.
// Simülatörde detaylı girildiği için hassas hesaplanır.
export const calculateScoreSAY = (nets) => {
    // TYT Katsayıları (Yaklaşık)
    const c_tyt_mat = 1.32;
    const c_tyt_turk = 1.32;
    const c_tyt_fen = 1.36;
    const c_tyt_sos = 1.36;

    // AYT Katsayıları (Sayısal)
    const c_ayt_mat = 3.00;
    const c_ayt_fiz = 2.85;
    const c_ayt_kim = 3.07;
    const c_ayt_biyo = 3.07;
    
    // Eğer AYT Fen tek parça geldiyse (Admin panelinden) ortalama katsayı al (3.0)
    const aytFenTotal = nets.aytFen || 0;
    const aytFiz = nets.aytFiz || 0;
    const aytKim = nets.aytKim || 0;
    const aytBiyo = nets.aytBiyo || 0;

    // Puan Hesapla
    const scoreFromNet = 
        (nets.tytMath * c_tyt_mat) +
        (nets.tytTurk * c_tyt_turk) +
        (nets.tytFen * c_tyt_fen) +
        (nets.tytSos * c_tyt_sos) +
        (nets.aytMath * c_ayt_mat) +
        (aytFiz * c_ayt_fiz) +
        (aytKim * c_ayt_kim) +
        (aytBiyo * c_ayt_biyo) +
        (aytFenTotal * 3.00); // Detay yoksa toplu fen puanı

    let finalScore = 100 + scoreFromNet;
    if (finalScore > 500) finalScore = 500; // Maksimum 500

    return {
        say: finalScore
    };
};

// --- 4. GELİŞMİŞ SIRALAMA (İNTERPOLASYON YÖNTEMİ) ---
// 2024 YKS Sayısal Yığılma Verileri (Referans Noktaları)
// Sol: Puan, Sağ: Sıralama
const RANK_DATA = [
    { s: 560, r: 1 },
    { s: 550, r: 200 },
    { s: 540, r: 900 },
    { s: 530, r: 2400 },
    { s: 520, r: 8000 },
    { s: 510, r: 13000 },
    { s: 500, r: 20000  },
    { s: 490, r: 29500 },
    { s: 480, r: 40000 },
    { s: 470, r: 52000 },
    { s: 460, r: 65000 },
    { s: 450, r: 80000 },
    { s: 440, r: 100000 },
    { s: 430, r: 120000 },
    { s: 420, r: 140000 },
    { s: 410, r: 165000 },
    { s: 400, r: 190000 },
    { s: 380, r: 250000 },
    { s: 360, r: 350000 },
    { s: 340, r: 470000 },
    { s: 320, r: 660000 },
    { s: 300, r: 900000 },
    { s: 250, r: 1200000 },
    { s: 200, r: 1900000 },
    { s: 0,   r: 3000000 }
];

export const getEstimatedRank = async (score) => {
    const s = Number(score);
    
    // Puan hangi aralıkta?
    let upper = RANK_DATA[0];
    let lower = RANK_DATA[RANK_DATA.length - 1];

    for (let i = 0; i < RANK_DATA.length - 1; i++) {
        if (s <= RANK_DATA[i].s && s > RANK_DATA[i+1].s) {
            upper = RANK_DATA[i];
            lower = RANK_DATA[i+1];
            break;
        }
    }

    if (s >= 560) return "Sayısal: 1"; // Zirve

    // Matematiksel Orantı (Interpolasyon)
    const scoreRange = upper.s - lower.s;
    const rankRange = lower.r - upper.r;
    const scoreDiff = upper.s - s;
    
    const exactRank = upper.r + (rankRange * (scoreDiff / scoreRange));
    
    // Yuvarla ve Formatla
    const finalRank = Math.floor(exactRank);
    const formatted = new Intl.NumberFormat('tr-TR').format(finalRank);

    return `Sayısal: ${formatted}`;
};