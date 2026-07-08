import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { db, ref, onValue, get, push, update, remove } from './firebase'
import { activarNotificaciones } from './notifications'
import { estaVencido, ordenarRecordatorios, siguienteFecha } from './utils/recordatorios'
import RecordatorioForm from './components/RecordatorioForm'
import RecordatorioItem from './components/RecordatorioItem'
import RecordatorioPopup from './components/RecordatorioPopup'
import UpdateBanner from './components/UpdateBanner'

const claveAviso = (r) => `${r.id}:${r.fecha}`

function App() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  const [recordatorios, setRecordatorios] = useState([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [notifPermitidas, setNotifPermitidas] = useState(Notification?.permission === 'granted')
  const [colaAvisos, setColaAvisos] = useState([])
  const recordatoriosRef = useRef([])
  const avisadosRef = useRef(new Set())
  const inicializadoRef = useRef(false)

  useEffect(() => {
    const unsub = onValue(ref(db, 'recordatorios'), (snap) => {
      const data = snap.val() || {}
      const lista = Object.entries(data).map(([id, r]) => ({ id, ...r }))
      setRecordatorios(lista)
      recordatoriosRef.current = lista
      if (!inicializadoRef.current) {
        avisadosRef.current = new Set(lista.filter(estaVencido).map(claveAviso))
        inicializadoRef.current = true
      }
    })
    return () => unsub()
  }, [])

  function mostrarPopupPara(id) {
    const r = recordatoriosRef.current.find((x) => x.id === id)
    if (r) setColaAvisos((cola) => [...cola, r])
  }

  useEffect(() => {
    if (Notification?.permission === 'granted') {
      activarNotificaciones(mostrarPopupPara)
        .then((token) => {
          if (token) setNotifPermitidas(true)
        })
        .catch((err) => console.error('No se pudo registrar el token de notificaciones:', err))
    }
  }, [])

  useEffect(() => {
    function onMensajeSW(event) {
      if (event.data?.tipo === 'abrir-recordatorio' && event.data.id) mostrarPopupPara(event.data.id)
    }
    navigator.serviceWorker?.addEventListener('message', onMensajeSW)
    return () => navigator.serviceWorker?.removeEventListener('message', onMensajeSW)
  }, [])

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('r')
    if (!id) return
    window.history.replaceState(null, '', window.location.pathname)
    get(ref(db, `recordatorios/${id}`)).then((snap) => {
      if (snap.exists()) setColaAvisos((cola) => [...cola, { id, ...snap.val() }])
    })
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      const nuevos = recordatoriosRef.current.filter(
        (r) => (!r.completado || r.recurrente) && estaVencido(r) && !avisadosRef.current.has(claveAviso(r)),
      )
      if (nuevos.length > 0) {
        nuevos.forEach((r) => avisadosRef.current.add(claveAviso(r)))
        setColaAvisos((cola) => [...cola, ...nuevos])
      }
    }, 15000)
    return () => clearInterval(id)
  }, [])

  async function handleActivarNotif() {
    try {
      const token = await activarNotificaciones(mostrarPopupPara)
      if (token) setNotifPermitidas(true)
    } catch (err) {
      console.error(err)
      alert(err.message)
    }
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

      {colaAvisos.length > 0 && (
        <RecordatorioPopup r={colaAvisos[0]} onCerrar={() => setColaAvisos((cola) => cola.slice(1))} />
      )}

      {needRefresh && <UpdateBanner onUpdate={() => updateServiceWorker(true)} />}
    </div>
  )
}

export default App
