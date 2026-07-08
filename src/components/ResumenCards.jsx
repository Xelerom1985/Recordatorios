const FILTROS = [
  { id: 'hoy', label: 'Hoy', icono: '📅' },
  { id: 'programados', label: 'Programados', icono: '🗓️' },
  { id: 'todos', label: 'Todos', icono: '📋' },
  { id: 'recurrentes', label: 'Recurrentes', icono: '🔁' },
]

export { FILTROS }

export default function ResumenCards({ conteos, onSeleccionar }) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-5">
      {FILTROS.map((f) => (
        <button
          key={f.id}
          onClick={() => onSeleccionar(f.id)}
          className="rounded-2xl p-3.5 text-left bg-[var(--card)] border border-white/5 transition-colors shadow-lg shadow-black/20 active:border-[var(--accent)]"
        >
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-[var(--accent)]">
              {f.icono}
            </span>
            <span className="text-2xl font-bold tabular-nums">{conteos[f.id]}</span>
          </div>
          <p className="text-sm text-[var(--muted)] mt-2.5">{f.label}</p>
        </button>
      ))}
    </div>
  )
}
