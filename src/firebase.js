import { initializeApp } from 'firebase/app'
import { getDatabase, ref, onValue, get, set, update, push, remove } from 'firebase/database'
import { getMessaging, isSupported } from 'firebase/messaging'
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from 'firebase/auth'
import { logDebug } from './debugAuth'

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

export const auth = getAuth(app)
const googleProvider = new GoogleAuthProvider()

export async function iniciarSesionConGoogle() {
  logDebug('click iniciar sesión')
  try {
    const resultado = await signInWithPopup(auth, googleProvider)
    logDebug(`popup OK uid=${resultado.user?.uid?.slice(0, 6)}`)
    return resultado
  } catch (err) {
    logDebug(`popup error: ${err.code}`)
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment') {
      logDebug('fallback a redirect')
      return signInWithRedirect(auth, googleProvider)
    }
    throw err
  }
}

export { getRedirectResult, onAuthStateChanged }

export function cerrarSesion() {
  return signOut(auth)
}
