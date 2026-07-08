import { estaVencido, formatearFecha } from '../utils/recordatorios'
import { hablar, fraseRecordatorio } from '../utils/hablar'

export default function RecordatorioItem({ r, onHecho, onPostergar, onEditar, onEliminar }) {
  const vencido = estaVencido(r)

  function escuchar(e) {
    e.stopPropagation()
    hablar(fraseRecordatorio(r))
  }

  return (
    <div
      className={`flex flex-col gap-2 p-3 rounded-2xl bg-[var(--card)] border shadow-lg shadow-black/20 ${
        vencido ? 'border-[var(--danger)]/50' : 'border-white/5'
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <button className="flex-1 min-w-0 text-left" onClick={() => onEditar(r)}>
          <p className="font-semibold text-sm leading-snug line-clamp-2">{r.titulo}</p>
        </button>
        <button onClick={() => onEliminar(r)} className="text-[var(--muted)] shrink-0 text-xs px-1" aria-label="Eliminar">
          ✕
        </button>
      </div>

      {r.detalle && <p className="text-xs text-[var(--muted)] line-clamp-2">{r.detalle}</p>}

      <p className={`text-xs ${vencido ? 'text-[var(--danger)]' : 'text-[var(--muted)]'}`}>
        {formatearFecha(r.fecha)} · {r.hora}
        {r.recurrente && ' · 🔁'}
      </p>

      <div className="flex items-center gap-1.5 mt-1">
        <button
          onClick={escuchar}
          aria-label="Escuchar"
          className="flex-1 text-xs font-medium py-1.5 rounded-full bg-red-500 text-white"
        >
          🔊 Escuchar
        </button>
        <button
          onClick={() => onPostergar(r)}
          className="flex-1 text-xs font-medium py-1.5 rounded-full bg-yellow-400 text-black"
        >
          Postergar
        </button>
      </div>

      <button
        onClick={() => onHecho(r)}
        className="w-full text-xs font-semibold py-1.5 rounded-full bg-[var(--success)] text-white"
      >
        Hecho
      </button>
    </div>
  )
}
