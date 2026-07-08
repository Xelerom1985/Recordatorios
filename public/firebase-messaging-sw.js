importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyBVHv3KrABiUf0sdKG7v5URZQIAxbFJfe0',
  authDomain: 'recordatorios-faf.firebaseapp.com',
  databaseURL: 'https://recordatorios-faf-default-rtdb.firebaseio.com',
  projectId: 'recordatorios-faf',
  storageBucket: 'recordatorios-faf.firebasestorage.app',
  messagingSenderId: '196425944800',
  appId: '1:196425944800:web:e7917d79abd55bad9b0a85',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification?.title || 'Recordatorio', {
    body: payload.notification?.body,
    icon: '/icon-192.png',
    data: { id: payload.data?.id },
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const id = event.notification.data?.id
  const url = id ? `/?r=${id}` : '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const cliente of lista) {
        if ('focus' in cliente) {
          cliente.postMessage({ tipo: 'abrir-recordatorio', id })
          return cliente.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
