import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';

export default function NotificationManager({ currentUser }) {
    const [lastMessageId, setLastMessageId] = useState(null);
    const [lastScoreId, setLastScoreId] = useState(null);
    const [permission, setPermission] = useState(Notification.permission);

    // 1. İZİN İSTE
    const requestPermission = async () => {
        if (!("Notification" in window)) return;
        const result = await Notification.requestPermission();
        setPermission(result);
    };

    // BİLDİRİM GÖNDERME FONKSİYONU
    const sendNotification = (title, body, icon = "/pwa-192x192.png") => {
        if (permission === "granted" && document.visibilityState === "hidden") {
            // Sadece kullanıcı sayfada değilse (başka sekmedeyse veya mobilde ana ekrandaysa) gönder
            const notif = new Notification(title, {
                body: body,
                icon: icon,
                vibrate: [200, 100, 200]
            });
            notif.onclick = () => window.focus();
        }
    };

    // 2. SOHBET DİNLEYİCİSİ
    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, 'artifacts', APP_ID, 'public', 'data', 'chat_messages'),
            orderBy('timestamp', 'desc'),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const msg = snapshot.docs[0].data();
                const msgId = snapshot.docs[0].id;

                // İlk yüklemede bildirim atma, sadece yeni mesajlarda at
                // Ve mesajı ben atmadıysam bildirim ver
                if (lastMessageId && lastMessageId !== msgId && msg.senderId !== currentUser.internalId) {
                    sendNotification(
                        `Yeni Mesaj: ${msg.senderName}`, 
                        msg.text
                    );
                }
                setLastMessageId(msgId);
            }
        });

        return () => unsubscribe();
    }, [currentUser, lastMessageId, permission]);

    // 3. SINAV SONUÇ DİNLEYİCİSİ
    useEffect(() => {
        if (!currentUser || currentUser.isAdmin) return; // Admin kendine bildirim atmasın

        // Sadece BANA ait son eklenen skoru dinle
        // Not: Firestore'da karmaşık query yerine tüm skorları dinleyip filtrelemek daha kolay olabilir bu yapıda
        // Ama performans için sadece son eklenenleri dinleyelim.
        
        const q = query(
            collection(db, 'artifacts', APP_ID, 'public', 'data', 'exam_scores_v3'),
            orderBy('timestamp', 'desc'),
            limit(5) // Son 5 işlemden birinde benim adım var mı?
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const score = change.doc.data();
                    // Eğer bu skor bana aitse ve yeni eklendiyse (sayfa yüklendikten sonra)
                    if (score.internalUserId === currentUser.internalId && lastScoreId && change.doc.id !== lastScoreId) {
                         sendNotification(
                            "📢 Sınav Sonucu Açıklandı!", 
                            `${score.examName} sonucun sisteme girildi. Hemen kontrol et!`
                        );
                    }
                    setLastScoreId(change.doc.id);
                }
            });
        });

        return () => unsubscribe();
    }, [currentUser, lastScoreId, permission]);

    // 4. "ÇALIŞMAYA DÖN" HATIRLATICISI (İnactivity)
    useEffect(() => {
        const interval = setInterval(() => {
            // Eğer kullanıcı sayfada değilse (arka plandaysa) ve 1 saattir ses çıkmadıysa
            if (document.visibilityState === "hidden" && permission === "granted") {
                 // Burası biraz agresif olabilir, o yüzden sadece çok uzun süre (örn 3 saat) sonra bir kere tetiklenebilir.
                 // Şimdilik basit tutalım:
                 // sendNotification("Mola çok uzadı!", "Rakiplerin çalışıyor, sen neredesin? 👀");
            }
        }, 1000 * 60 * 60 * 3); // 3 Saatte bir kontrol

        return () => clearInterval(interval);
    }, [permission]);

    // İlk açılışta izin iste (Eğer daha önce sorulmadıysa)
    useEffect(() => {
        if (Notification.permission === "default") {
            requestPermission();
        }
    }, []);

    return null; // Bu bileşen ekranda görünmez, sadece mantık çalıştırır.
}