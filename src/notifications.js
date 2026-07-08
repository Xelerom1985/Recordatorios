import { getToken, onMessage } from 'firebase/messaging'
import { db, ref, set, getMessagingIfSupported } from './firebase'

const VAPID_KEY = 'BHN-TgWEPSGc5xl19Aj3ACQyKL8OO-lpb0CdSTWGirdNYHecTSWfbu4nz6uvvQ-DmPwD5bP_g7TOHY6a2Ti75hQ'

export async function activarNotificaciones() {
  const messaging = await getMessagingIfSupported()
  if (!messaging) throw new Error('Este navegador no soporta notificaciones push.')

  if (Notification.permission === 'denied') {
    throw new Error(
      'Los avisos están bloqueados. Andá a Ajustes del celular → Apps → Recordatorios → Notificaciones (o a la configuración del sitio en el navegador) y habilitalos manualmente.',
    )
  }

  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') throw new Error('No se otorgó el permiso de notificaciones.')

  const registration = await navigator.serviceWorker.ready
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })
  if (!token) throw new Error('No se pudo obtener el token de notificaciones.')

  await set(ref(db, `tokens/${token}`), { createdAt: Date.now() })

  onMessage(messaging, (payload) => {
    new Notification(payload.notification?.title || 'Recordatorio', {
      body: payload.notification?.body,
      icon: '/icon-192.png',
    })
  })

  return token
}
