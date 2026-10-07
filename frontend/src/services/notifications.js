import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp, firebaseWebConfig } from '../firebase/config';
import { db } from '../firebase/firestore';

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

async function getBrowserMessaging() {
  if (!firebaseApp) throw new Error('Firebase is not configured for this app.');
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    throw new Error('This browser does not support background push notifications.');
  }
  if (!vapidKey) throw new Error('Add VITE_FIREBASE_VAPID_KEY from Firebase Project settings → Cloud Messaging.');
  if (!await isSupported()) throw new Error('Firebase Cloud Messaging is not supported by this browser.');
  const config = encodeURIComponent(JSON.stringify(firebaseWebConfig));
  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?config=${config}`);
  await navigator.serviceWorker.ready;
  return { messaging: getMessaging(firebaseApp), registration };
}

function tokenDocumentId(token) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    .then((digest) => Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join(''));
}

export async function enableDeviceNotifications(uid) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted in your browser.');
  const { messaging, registration } = await getBrowserMessaging();
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error('Firebase did not issue a notification token for this device.');
  const id = await tokenDocumentId(token);
  const deviceRef = doc(db, 'users', uid, 'devices', id);
  await setDoc(deviceRef, {
    token,
    name: `${navigator.platform || 'Device'} · ${navigator.userAgent.includes('Edg/') ? 'Edge' : navigator.userAgent.includes('Chrome/') ? 'Chrome' : 'Browser'}`,
    userAgent: navigator.userAgent.slice(0, 240),
    lastSeenAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, { merge: true });
  return { deviceRef, messaging, registration };
}

export async function removeNotificationDevice(device) {
  await deleteDoc(device.ref);
}

export function subscribeToNotificationDevices(uid, onDevices, onError) {
  return onSnapshot(collection(db, 'users', uid, 'devices'), (snapshot) => {
    onDevices(snapshot.docs.map((item) => ({ id: item.id, ref: item.ref, ...item.data() })));
  }, onError);
}

export function subscribeToForegroundNotifications(messaging, registration) {
  return onMessage(messaging, ({ data }) => {
    if (!data?.title) return;
    registration.showNotification(data.title, {
      body: `${data.body || ''}${data.dueLabel ? `\n${data.dueLabel}` : ''}`,
      icon: '/icons/notification-192.png',
      badge: '/icons/notification-badge-72.png',
      tag: data.reminderId || 'daymark-notification',
      data,
      actions: data.taskId ? [
        { action: 'complete', title: 'Mark completed' },
        { action: 'snooze-5', title: 'Snooze 5 min' },
        { action: 'snooze-15', title: 'Snooze 15 min' },
      ] : [],
    });
  });
}

export async function disableDeviceNotifications(device) {
  if (firebaseApp && await isSupported()) {
    try {
      const { messaging, registration } = await getBrowserMessaging();
      const currentToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
      if (currentToken && await tokenDocumentId(currentToken) === device.id) await deleteToken(messaging);
    } catch (error) {
      await deleteDoc(device.ref);
      throw error;
    }
  }
  await deleteDoc(device.ref);
}

export async function sendTestNotification() {
  if (!firebaseApp) throw new Error('Firebase is not configured for this app.');
  const sendTest = httpsCallable(getFunctions(firebaseApp, 'us-central1'), 'sendTestNotification');
  return sendTest();
}
