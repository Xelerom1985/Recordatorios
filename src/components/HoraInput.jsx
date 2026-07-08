import { useRef } from 'react'

function clamp(valor, max) {
  const limpio = valor.replace(/\D/g, '')
  if (limpio === '') return '00'
  return String(Math.min(parseInt(limpio, 10), max)).padStart(2, '0')
}

export default function HoraInput({ value, onChange }) {
  const [h, m] = (value || '09:00').split(':')
  const minutoRef = useRef(null)

  function handleH(e) {
    const v = e.target.value.replace(/\D/g, '').slice(0, 2)
    onChange(`${v}:${m}`)
    if (v.length === 2) minutoRef.current?.focus()
  }

  function handleM(e) {
    const v = e.target.value.replace(/\D/g, '').slice(0, 2)
    onChange(`${h}:${v}`)
  }

  return (
    <div className="flex items-center gap-1 bg-[var(--bg2)] rounded-lg px-3 py-2 focus-within:ring-2 ring-[var(--accent)]">
      <input
        type="text"
        inputMode="numeric"
        value={h}
        onChange={handleH}
        onFocus={(e) => e.target.select()}
        onBlur={(e) => onChange(`${clamp(e.target.value, 23)}:${m}`)}
        aria-label="Hora"
        className="w-6 bg-transparent outline-none text-center"
      />
      <span className="text-[var(--muted)]">:</span>
      <input
        ref={minutoRef}
        type="text"
        inputMode="numeric"
        value={m}
        onChange={handleM}
        onFocus={(e) => e.target.select()}
        onBlur={(e) => onChange(`${h}:${clamp(e.target.value, 59)}`)}
        aria-label="Minutos"
        className="w-6 bg-transparent outline-none text-center"
      />
    </div>
  )
}
