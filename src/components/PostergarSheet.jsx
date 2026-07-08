const OPCIONES = [
  { tipo: 'minutos', valor: 5, label: '5 minutos' },
  { tipo: 'minutos', valor: 10, label: '10 minutos' },
  { tipo: 'minutos', valor: 15, label: '15 minutos' },
  { tipo: 'manana', label: 'Mañana, misma hora' },
  { tipo: 'editar', label: 'Elegir día y horario' },
]

export default function PostergarSheet({ r, onPostergar, onCerrar }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50" onClick={onCerrar}>
      <div
        className="bg-[var(--card)] w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-5 flex flex-col gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-1 truncate">Postergar "{r.titulo}"</h2>
        {OPCIONES.map((op) => (
          <button
            key={op.label}
            onClick={() => onPostergar(op.tipo, op.valor)}
            className="text-left px-4 py-3 rounded-xl bg-[var(--bg2)] hover:bg-white/5"
          >
            {op.label}
          </button>
        ))}
        <button onClick={onCerrar} className="mt-2 py-2 rounded-lg text-[var(--muted)]">
          Cancelar
        </button>
      </div>
    </div>
  )
}
