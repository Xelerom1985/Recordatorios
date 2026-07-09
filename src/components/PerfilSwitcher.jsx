import { useRef } from 'react'

const PERFILES = ['compartido', 'personal', 'laboral']

const ESTILOS = {
  personal: {
    activo: 'bg-green-500 border-green-500 text-white',
    inactivo: 'border-green-500 text-green-500',
  },
  laboral: {
    activo: 'bg-blue-500 border-blue-500 text-white',
    inactivo: 'border-blue-500 text-blue-500',
  },
  compartido: {
    activo: 'bg-violet-500 border-violet-500 text-white',
    inactivo: 'border-violet-500 text-violet-500',
  },
}

export default function PerfilSwitcher({ perfil, nombres, onCambiar, onRenombrar }) {
  const timerRef = useRef(null)
  const presionoLargoRef = useRef(false)

  function iniciarPress(p) {
    if (p === 'compartido') return
    presionoLargoRef.current = false
    timerRef.current = setTimeout(() => {
      presionoLargoRef.current = true
      onRenombrar(p)
    }, 600)
  }

  function cancelarPress() {
    clearTimeout(timerRef.current)
  }

  function handleClick(p) {
    if (presionoLargoRef.current) {
      presionoLargoRef.current = false
      return
    }
    onCambiar(p)
  }

  return (
    <div className="pointer-events-auto flex gap-3">
      {PERFILES.map((p) => (
        <button
          key={p}
          onClick={() => handleClick(p)}
          onPointerDown={() => iniciarPress(p)}
          onPointerUp={cancelarPress}
          onPointerLeave={cancelarPress}
          className={`px-5 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors ${
            ESTILOS[p][perfil === p ? 'activo' : 'inactivo']
          }`}
        >
          {p === 'compartido' ? 'Compartido' : nombres[p]}
        </button>
      ))}
    </div>
  )
}
