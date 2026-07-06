import { useEffect, useState } from 'react'
import { db, ref, onValue, push, update, remove } from './firebase'
import { activarNotificaciones } from './notifications'
import { ordenarRecordatorios, siguienteFecha } from './utils/recordatorios'
import RecordatorioForm from './components/RecordatorioForm'
import RecordatorioItem from './components/RecordatorioItem'

function App() {
  const [recordatorios, setRecordatorios] = useState([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [notifPermitidas, setNotifPermitidas] = useState(Notification?.permission === 'granted')

  useEffect(() => {
    const unsub = onValue(ref(db, 'recordatorios'), (snap) => {
      const data = snap.val() || {}
      setRecordatorios(Object.entries(data).map(([id, r]) => ({ id, ...r })))
    })
    return () => unsub()
  }, [])

  async function handleActivarNotif() {
    const token = await activarNotificaciones()
    if (token) setNotifPermitidas(true)
  }

  function handleGuardar(datos) {
    if (editando) {
      update(ref(db, `recordatorios/${editando.id}`), datos)
    } else {
      push(ref(db, 'recordatorios'), { ...datos, completado: false, createdAt: Date.now() })
    }
    setMostrarForm(false)
    setEditando(null)
  }

  function handleCompletar(r) {
    if (r.recurrente) {
      update(ref(db, `recordatorios/${r.id}`), { fecha: siguienteFecha(r.fecha, r.frecuencia) })
    } else {
      update(ref(db, `recordatorios/${r.id}`), { completado: !r.completado })
    }
  }

  function handleEditar(r) {
    setEditando(r)
    setMostrarForm(true)
  }

  function handleEliminar(r) {
    if (confirm(`¿Eliminar "${r.titulo}"?`)) remove(ref(db, `recordatorios/${r.id}`))
  }

  const lista = ordenarRecordatorios(recordatorios)

  return (
    <div className="flex-1 flex flex-col px-4 pt-6 pb-24">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Recordatorios</h1>
        {!notifPermitidas && (
          <button onClick={handleActivarNotif} className="text-sm text-[var(--accent2)]">
            🔔 Activar avisos
          </button>
        )}
      </header>

      {lista.length === 0 && (
        <p className="text-[var(--muted)] text-center mt-12">No tenés recordatorios todavía.</p>
      )}

      <div className="flex flex-col gap-2">
        {lista.map((r) => (
          <RecordatorioItem
            key={r.id}
            r={r}
            onCompletar={handleCompletar}
            onEditar={handleEditar}
            onEliminar={handleEliminar}
          />
        ))}
      </div>

      <button
        onClick={() => {
          setEditando(null)
          setMostrarForm(true)
        }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[var(--accent)] text-white text-2xl shadow-lg"
        aria-label="Nuevo recordatorio"
      >
        +
      </button>

      {mostrarForm && (
        <RecordatorioForm
          inicial={editando}
          onGuardar={handleGuardar}
          onCerrar={() => {
            setMostrarForm(false)
            setEditando(null)
          }}
        />
      )}
    </div>
  )
}

export default App
