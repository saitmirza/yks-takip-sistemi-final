import React, { useEffect, useRef, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';

export default function NotificationManager({ currentUser }) {
    // iOS GÜVENLİĞİ: Başlangıç state'ini güvenli ayarla
    const [permission, setPermission] = useState('default');
    const startTime = useRef(Date.now());

    // 1. İZİN KONTROLÜ (useEffect içinde güvenli)
    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
        } else {
            console.warn("Bu tarayıcı bildirimleri desteklemiyor (iOS 13?)");
        }
    }, []);

    const requestPermission = async () => {
        if (!("Notification" in window)) return;
        if (permission === "default") {
            const result = await Notification.requestPermission();
            setPermission(result);
        }
    };

    // İlk açılışta izin isteme (İsteğe bağlı, rahatsız etmemek için kaldırılabilir)
    // useEffect(() => { requestPermission(); }, []); 

    const sendNotification = (title, body) => {
        if (!("Notification" in window)) return;
        
        if (permission === "granted" && document.visibilityState === "hidden") {
            try {
                // Service Worker varsa onu kullan (PWA için daha iyi), yoksa normal
                if (navigator.serviceWorker && navigator.serviceWorker.ready) {
                    navigator.serviceWorker.ready.then(registration => {
                        registration.showNotification(title, {
                            body: body,
                            icon: "/pwa-192x192.png",
                            vibrate: [200, 100, 200]
                        });
                    });
                } else {
                    new Notification(title, {
                        body: body,
                        icon: "/pwa-192x192.png"
                    });
                }
            } catch (e) {
                console.error("Bildirim gönderme hatası:", e);
            }
        }
    };

    // ... (Sohbet ve Sınav Dinleyicileri AYNI KALACAK - Sadece sendNotification çağırıyorlar)
    useEffect(() => {
        if (!currentUser) return;
        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'chat_messages'), orderBy('timestamp', 'desc'), limit(1));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const msg = change.doc.data();
                    const msgTime = msg.timestamp ? msg.timestamp.seconds * 1000 : 0;
                    if (msgTime > startTime.current && msg.senderId !== currentUser.internalId) {
                        sendNotification(`💬 ${msg.senderName}`, msg.text);
                    }
                }
            });
        });
        return () => unsubscribe();
    }, [currentUser, permission]);

    useEffect(() => {
        if (!currentUser || currentUser.isAdmin) return;
        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'exam_scores_v3'), orderBy('timestamp', 'desc'), limit(1));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const score = change.doc.data();
                    const scoreTime = score.timestamp ? score.timestamp.seconds * 1000 : 0;
                    if (scoreTime > startTime.current && score.internalUserId === currentUser.internalId) {
                        sendNotification("📢 Sınav Sonucu!", `${score.examName} sonucun açıklandı.`);
                    }
                }
            });
        });
        return () => unsubscribe();
    }, [currentUser, permission]);

    return null;
}