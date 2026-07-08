import { initializeApp } from 'firebase/app'
import { getDatabase, ref, onValue, get, set, update, push, remove } from 'firebase/database'
import { getMessaging, isSupported } from 'firebase/messaging'

// PENDIENTE: completar databaseURL cuando se cree la Realtime Database
// en la consola de Firebase (Build > Realtime Database > Crear base de datos)
const firebaseConfig = {
  apiKey: "AIzaSyBVHv3KrABiUf0sdKG7v5URZQIAxbFJfe0",
  authDomain: "recordatorios-faf.firebaseapp.com",
  databaseURL: "https://recordatorios-faf-default-rtdb.firebaseio.com",
  projectId: "recordatorios-faf",
  storageBucket: "recordatorios-faf.firebasestorage.app",
  messagingSenderId: "196425944800",
  appId: "1:196425944800:web:e7917d79abd55bad9b0a85",
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
export { ref, onValue, get, set, update, push, remove }

export async function getMessagingIfSupported() {
  if (await isSupported()) return getMessaging(app)
  return null
}
