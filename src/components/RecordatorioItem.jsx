import { estaVencido, formatearFecha } from '../utils/recordatorios'
import { hablar } from '../utils/hablar'

export default function RecordatorioItem({ r, onCompletar, onEditar, onEliminar }) {
  const vencido = estaVencido(r)

  function escuchar(e) {
    e.stopPropagation()
    hablar(r.detalle ? `${r.titulo}. ${r.detalle}` : r.titulo)
  }

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl bg-[var(--card)] border ${
        vencido ? 'border-[var(--danger)]/50' : 'border-transparent'
      }`}
    >
      <button
        onClick={() => onCompletar(r)}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 ${
          r.completado ? 'bg-[var(--success)] border-[var(--success)]' : 'border-[var(--muted)]'
        }`}
        aria-label="Completar"
      />

      <button className="flex-1 text-left" onClick={() => onEditar(r)}>
        <p className={`font-medium ${r.completado ? 'line-through text-[var(--muted)]' : ''}`}>{r.titulo}</p>
        {r.detalle && <p className="text-sm text-[var(--muted)]">{r.detalle}</p>}
        <p className={`text-xs mt-1 ${vencido ? 'text-[var(--danger)]' : 'text-[var(--muted)]'}`}>
          {formatearFecha(r.fecha)} · {r.hora}
          {r.recurrente && ` · 🔁 ${r.frecuencia}`}
        </p>
      </button>

      <button onClick={escuchar} className="text-[var(--muted)] px-1" aria-label="Escuchar">
        🔊
      </button>

      <button onClick={() => onEliminar(r)} className="text-[var(--muted)] px-1" aria-label="Eliminar">
        ✕
      </button>
    </div>
  )
}
