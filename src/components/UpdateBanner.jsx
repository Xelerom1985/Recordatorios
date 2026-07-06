export default function UpdateBanner({ onUpdate }) {
  return (
    <div className="fixed bottom-24 left-3 right-3 bg-[var(--card)] border border-[var(--accent)]/50 rounded-xl px-4 py-3 flex items-center justify-between shadow-lg z-[180]">
      <p className="text-sm text-[var(--text)]">Nueva versión disponible</p>
      <button
        onClick={onUpdate}
        className="bg-[var(--accent)] text-white rounded-lg px-3.5 py-1.5 text-sm font-semibold"
      >
        Actualizar
      </button>
    </div>
  )
}
