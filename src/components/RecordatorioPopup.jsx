import { useState } from 'react'
import { hablar, detenerHabla, fraseRecordatorio } from '../utils/hablar'

export default function RecordatorioPopup({ r, onCerrar }) {
  const [hablando, setHablando] = useState(false)

  function escuchar() {
    setHablando(hablar(fraseRecordatorio(r), () => setHablando(false)))
  }

  function cerrar() {
    detenerHabla()
    onCerrar()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--card)] rounded-2xl p-6 w-full max-w-sm flex flex-col items-center gap-2 text-center">
        <p className="text-3xl">⏰</p>
        <h2 className="text-lg font-semibold">{r.titulo}</h2>
        {r.detalle && <p className="text-sm text-[var(--muted)]">{r.detalle}</p>}

        <div className="flex gap-3 mt-4 w-full">
          <button onClick={cerrar} className="flex-1 py-2 rounded-lg bg-[var(--bg2)] text-[var(--muted)]">
            📖 Solo leer
          </button>
          <button
            onClick={hablando ? cerrar : escuchar}
            className="flex-1 py-2 rounded-lg bg-[var(--accent)] text-white font-medium"
          >
            {hablando ? '🔇 Detener' : '🔊 Escuchar'}
          </button>
        </div>
      </div>
    </div>
  )
}
