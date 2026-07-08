import { useState } from 'react'
import { useDictado } from '../utils/useDictado'
import { parseVoz } from '../utils/parseVoz'

function fechaLocalISO(dt) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

const HOY = fechaLocalISO(new Date())

export default function RecordatorioForm({ onGuardar, onCerrar, inicial }) {
  const [titulo, setTitulo] = useState(inicial?.titulo || '')
  const [detalle, setDetalle] = useState(inicial?.detalle || '')
  const [fecha, setFecha] = useState(inicial?.fecha || HOY)
  const [hora, setHora] = useState(inicial?.hora || '09:00')
  const [recurrente, setRecurrente] = useState(inicial?.recurrente || false)
  const [frecuencia, setFrecuencia] = useState(inicial?.frecuencia || 'diario')
  const { escuchando, soportado, iniciar } = useDictado()

  function handleDictado() {
    iniciar((texto) => {
      const parsed = parseVoz(texto)
      if (parsed.titulo) setTitulo(parsed.titulo)
      if (parsed.fecha) setFecha(parsed.fecha)
      if (parsed.hora) setHora(parsed.hora)
      if (parsed.recurrente) {
        setRecurrente(true)
        setFrecuencia(parsed.frecuencia)
      }
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!titulo.trim()) return
    onGuardar({
      titulo: titulo.trim(),
      detalle: detalle.trim() || null,
      fecha,
      hora,
      recurrente,
      frecuencia: recurrente ? frecuencia : null,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-[var(--card)] w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-5 flex flex-col gap-4"
      >
        <h2 className="text-lg font-semibold">{inicial ? 'Editar recordatorio' : 'Nuevo recordatorio'}</h2>

        <div className="flex gap-2">
          <input
            autoFocus
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="¿Qué querés recordar?"
            className="flex-1 min-w-0 bg-[var(--bg2)] rounded-lg px-3 py-2 outline-none focus:ring-2 ring-[var(--accent)]"
          />
          {soportado && (
            <button
              type="button"
              onClick={handleDictado}
              aria-label="Dictar por voz"
              className={`w-11 h-11 flex-shrink-0 rounded-lg flex items-center justify-center text-lg ${
                escuchando ? 'bg-[var(--danger)] animate-pulse' : 'bg-[var(--bg2)]'
              }`}
            >
              🎤
            </button>
          )}
        </div>
        {escuchando && <p className="text-xs text-[var(--accent2)] -mt-2">Escuchando…</p>}
        {!inicial && (
          <p className="text-xs text-[var(--muted)] -mt-2">
            Ej: "recordame mañana a las 5 llamar al dentista"
          </p>
        )}

        <textarea
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          placeholder="Detalle (opcional)"
          rows={2}
          className="bg-[var(--bg2)] rounded-lg px-3 py-2 outline-none focus:ring-2 ring-[var(--accent)] resize-none"
        />

        <div className="flex gap-3">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="flex-1 bg-[var(--bg2)] rounded-lg px-3 py-2 outline-none focus:ring-2 ring-[var(--accent)]"
          />
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="flex-1 bg-[var(--bg2)] rounded-lg px-3 py-2 outline-none focus:ring-2 ring-[var(--accent)]"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <input
            type="checkbox"
            checked={recurrente}
            onChange={(e) => setRecurrente(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Se repite
        </label>

        {recurrente && (
          <select
            value={frecuencia}
            onChange={(e) => setFrecuencia(e.target.value)}
            className="bg-[var(--bg2)] rounded-lg px-3 py-2 outline-none focus:ring-2 ring-[var(--accent)]"
          >
            <option value="diario">Todos los días</option>
            <option value="semanal">Todas las semanas</option>
            <option value="mensual">Todos los meses</option>
          </select>
        )}

        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={onCerrar}
            className="flex-1 py-2 rounded-lg bg-[var(--bg2)] text-[var(--muted)]"
          >
            Cancelar
          </button>
          <button type="submit" className="flex-1 py-2 rounded-lg bg-[var(--accent)] text-white font-medium">
            Guardar
          </button>
        </div>
      </form>
    </div>
  )
}
