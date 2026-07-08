const ESTILOS = {
  personal: {
    activo: 'bg-green-500 border-green-500 text-white',
    inactivo: 'border-green-500 text-green-500',
  },
  laboral: {
    activo: 'bg-blue-500 border-blue-500 text-white',
    inactivo: 'border-blue-500 text-blue-500',
  },
}

export default function PerfilSwitcher({ perfil, onCambiar }) {
  return (
    <div className="pointer-events-auto flex gap-3">
      {['personal', 'laboral'].map((p) => (
        <button
          key={p}
          onClick={() => onCambiar(p)}
          className={`px-5 py-1.5 rounded-full text-sm font-semibold border-2 capitalize transition-colors ${
            ESTILOS[p][perfil === p ? 'activo' : 'inactivo']
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  )
}
