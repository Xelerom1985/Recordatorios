import { getToken, onMessage } from 'firebase/messaging'
import { db, ref, set, getMessagingIfSupported } from './firebase'

const VAPID_KEY = 'BHN-TgWEPSGc5xl19Aj3ACQyKL8OO-lpb0CdSTWGirdNYHecTSWfbu4nz6uvvQ-DmPwD5bP_g7TOHY6a2Ti75hQ'

export async function activarNotificaciones() {
  const messaging = await getMessagingIfSupported()
  if (!messaging) return null

  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') return null

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })
  if (token) {
    await set(ref(db, `tokens/${token}`), { createdAt: Date.now() })
  }

  onMessage(messaging, (payload) => {
    new Notification(payload.notification?.title || 'Recordatorio', {
      body: payload.notification?.body,
      icon: '/icon-192.png',
    })
  })

  return token
}
