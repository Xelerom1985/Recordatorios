import { useState } from 'react'
import { iniciarSesionConGoogle } from '../firebase'
import { leerDebug, limpiarDebug } from '../debugAuth'

export default function LoginScreen() {
  const [error, setError] = useState(null)
  const [debug, setDebug] = useState(leerDebug())

  async function handleClick() {
    setError(null)
    try {
      await iniciarSesionConGoogle()
    } catch (err) {
      if (err.code !== 'auth/cancelled-popup-request' && err.code !== 'auth/popup-closed-by-user') {
        setError(err.message)
      }
    }
    setDebug(leerDebug())
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-4xl">⏰</p>
      <h1 className="text-2xl font-bold">Recordatorios</h1>
      <p className="text-sm text-[var(--muted)]">
        Iniciá sesión con Google para guardar tus recordatorios en tu cuenta y recuperarlos en
        cualquier equipo.
      </p>
      <button
        onClick={handleClick}
        className="flex items-center gap-3 bg-white text-[#1f1f1f] font-medium px-5 py-3 rounded-full shadow-lg"
      >
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path
            fill="#FFC107"
            d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
          />
          <path
            fill="#FF3D00"
            d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
          />
          <path
            fill="#4CAF50"
            d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.6 35.1 27 36 24 36c-5.2 0-9.6-3.3-11.2-8l-6.6 5.1C9.6 39.6 16.3 44 24 44z"
          />
          <path
            fill="#1976D2"
            d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.4 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"
          />
        </svg>
        Iniciar sesión con Google
      </button>
      {error && <p className="text-xs text-[var(--danger)] max-w-xs">{error}</p>}

      {debug.length > 0 && (
        <div className="w-full max-w-xs text-left bg-[var(--bg2)] rounded-lg p-3 mt-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-[var(--muted)] font-semibold">Diagnóstico</p>
            <button
              onClick={() => {
                limpiarDebug()
                setDebug([])
              }}
              className="text-xs text-[var(--muted)] underline"
            >
              Limpiar
            </button>
          </div>
          <pre className="text-[10px] leading-tight text-[var(--muted)] whitespace-pre-wrap break-all">
            {debug.join('\n')}
          </pre>
        </div>
      )}
    </div>
  )
}
