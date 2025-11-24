import React, { useEffect, useRef, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';

export default function NotificationManager({ currentUser }) {
    const [permission, setPermission] = useState(Notification.permission);
    
    // KRİTİK DÜZELTME: Siteye giriş anını kaydediyoruz.
    // Bu zamandan ÖNCE atılmış hiçbir mesaj için bildirim göndermeyeceğiz.
    const startTime = useRef(Date.now());

    // İzin İste
    const requestPermission = async () => {
        if (!("Notification" in window)) return;
        if (permission === "default") {
            const result = await Notification.requestPermission();
            setPermission(result);
        }
    };

    useEffect(() => {
        requestPermission();
    }, []);

    // Bildirim Gönderici
    const sendNotification = (title, body) => {
        // Sadece izin varsa ve sayfa gizliyse (veya her durumda istersen bu kontrolü kaldır) gönder
        if (permission === "granted" && document.visibilityState === "hidden") {
            new Notification(title, {
                body: body,
                icon: "/pwa-192x192.png", // İkonun public klasöründe olduğundan emin ol
                vibrate: [200, 100, 200]
            });
        }
    };

    // --- SOHBET DİNLEYİCİSİ ---
    useEffect(() => {
        if (!currentUser) return;

        // Son 1 mesajı dinle
        const q = query(
            collection(db, 'artifacts', APP_ID, 'public', 'data', 'chat_messages'),
            orderBy('timestamp', 'desc'),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                // Sadece yeni eklenenler
                if (change.type === "added") {
                    const msg = change.doc.data();
                    
                    // Timestamp kontrolü (Firebase Timestamp -> Milisaniye)
                    const msgTime = msg.timestamp ? msg.timestamp.seconds * 1000 : 0;

                    // KRİTİK KONTROL:
                    // 1. Mesaj ben siteye girdikten SONRA mı atıldı? (Eskileri engelle)
                    // 2. Mesajı ben mi attım? (Kendi mesajıma bildirim gelmesin)
                    if (msgTime > startTime.current && msg.senderId !== currentUser.internalId) {
                        sendNotification(`💬 ${msg.senderName}`, msg.text);
                    }
                }
            });
        });

        return () => unsubscribe();
    }, [currentUser, permission]);

    // --- SINAV SONUÇ DİNLEYİCİSİ ---
    useEffect(() => {
        if (!currentUser || currentUser.isAdmin) return;

        const q = query(
            collection(db, 'artifacts', APP_ID, 'public', 'data', 'exam_scores_v3'),
            orderBy('timestamp', 'desc'),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const score = change.doc.data();
                    const scoreTime = score.timestamp ? score.timestamp.seconds * 1000 : 0;

                    // Yine zaman kontrolü: Ben siteye girdikten sonra mı eklendi?
                    if (scoreTime > startTime.current && score.internalUserId === currentUser.internalId) {
                        sendNotification(
                            "📢 Sınav Sonucu!", 
                            `${score.examName} sonucun açıklandı. Hemen kontrol et!`
                        );
                    }
                }
            });
        });

        return () => unsubscribe();
    }, [currentUser, permission]);

    return null; // Görünmez bileşen
}