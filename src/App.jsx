import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { db, ref, onValue, get, push, update, remove, auth, onAuthStateChanged, getRedirectResult, cerrarSesion } from './firebase'
import { activarNotificaciones } from './notifications'
import { estaVencido, esHoy, esFuturo, fechaLocalISO, ordenarRecordatorios, siguienteFecha } from './utils/recordatorios'
import { useDictado } from './utils/useDictado'
import { parseVoz } from './utils/parseVoz'
import RecordatorioForm from './components/RecordatorioForm'
import RecordatorioItem from './components/RecordatorioItem'
import RecordatorioPopup from './components/RecordatorioPopup'
import ResumenCards, { FILTROS } from './components/ResumenCards'
import PostergarSheet from './components/PostergarSheet'
import PerfilSwitcher from './components/PerfilSwitcher'
import UpdateBanner from './components/UpdateBanner'
import LoginScreen from './components/LoginScreen'
import { logDebug } from './debugAuth'

const claveAviso = (r) => `${r.id}:${r.fecha}`
const NOMBRES_POR_DEFECTO = { personal: 'Personal', laboral: 'Laboral' }

function App() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  const [usuario, setUsuario] = useState(undefined)
  const [recordatorios, setRecordatorios] = useState([])
  const [nombresPerfiles, setNombresPerfiles] = useState(NOMBRES_POR_DEFECTO)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [notifPermitidas, setNotifPermitidas] = useState(Notification?.permission === 'granted')
  const [colaAvisos, setColaAvisos] = useState([])
  const [vista, setVista] = useState(null)
  const [postergando, setPostergando] = useState(null)
  const [avisoGuardado, setAvisoGuardado] = useState(false)
  const [perfilActivo, setPerfilActivoState] = useState(() => localStorage.getItem('perfilActivo') || 'personal')
  const { escuchando: grabandoRapido, soportado: dictadoSoportado, iniciar: iniciarDictadoRapido } = useDictado()
  const recordatoriosRef = useRef([])
  const avisadosRef = useRef(new Set())
  const inicializadoRef = useRef(false)

  useEffect(() => {
    logDebug(`app cargada, standalone=${window.matchMedia('(display-mode: standalone)').matches}`)
    getRedirectResult(auth)
      .then((res) => logDebug(`getRedirectResult: uid=${res?.user?.uid?.slice(0, 6) || 'null'}`))
      .catch((err) => logDebug(`getRedirectResult error: ${err.code}`))
    const unsub = onAuthStateChanged(auth, (u) => {
      logDebug(`onAuthStateChanged: uid=${u?.uid?.slice(0, 6) || 'null'}`)
      setUsuario(u)
    })
    return () => unsub()
  }, [])

  const uid = usuario?.uid

  useEffect(() => {
    if (!uid) return
    inicializadoRef.current = false
    const unsub = onValue(ref(db, `recordatorios/${uid}`), (snap) => {
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
  }, [uid])

  useEffect(() => {
    if (!uid) return
    const unsub = onValue(ref(db, `config/${uid}/perfiles`), (snap) => {
      setNombresPerfiles({ ...NOMBRES_POR_DEFECTO, ...(snap.val() || {}) })
    })
    return () => unsub()
  }, [uid])

  function cambiarPerfil(p) {
    setPerfilActivoState(p)
    localStorage.setItem('perfilActivo', p)
  }

  function renombrarPerfil(p) {
    const actual = nombresPerfiles[p]
    const nuevo = window.prompt('Nuevo nombre para este perfil:', actual)
    if (nuevo && nuevo.trim()) {
      update(ref(db, `config/${uid}/perfiles`), { [p]: nuevo.trim() })
    }
  }

  function mostrarPopupPara(id) {
    const r = recordatoriosRef.current.find((x) => x.id === id)
    if (r) setColaAvisos((cola) => [...cola, r])
  }

  useEffect(() => {
    if (!uid) return
    if (Notification?.permission === 'granted') {
      activarNotificaciones(uid, mostrarPopupPara)
        .then((token) => {
          if (token) setNotifPermitidas(true)
        })
        .catch((err) => console.error('No se pudo registrar el token de notificaciones:', err))
    }
  }, [uid])

  useEffect(() => {
    function onMensajeSW(event) {
      if (event.data?.tipo === 'abrir-recordatorio' && event.data.id) mostrarPopupPara(event.data.id)
    }
    navigator.serviceWorker?.addEventListener('message', onMensajeSW)
    return () => navigator.serviceWorker?.removeEventListener('message', onMensajeSW)
  }, [])

  useEffect(() => {
    if (!uid) return
    const id = new URLSearchParams(window.location.search).get('r')
    if (!id) return
    window.history.replaceState(null, '', window.location.pathname)
    get(ref(db, `recordatorios/${uid}/${id}`)).then((snap) => {
      if (snap.exists()) setColaAvisos((cola) => [...cola, { id, ...snap.val() }])
    })
  }, [uid])

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
      const token = await activarNotificaciones(uid, mostrarPopupPara)
      if (token) setNotifPermitidas(true)
    } catch (err) {
      console.error(err)
      alert(err.message)
    }
  }

  function handleGuardar(datos) {
    if (editando) {
      update(ref(db, `recordatorios/${uid}/${editando.id}`), datos)
    } else {
      push(ref(db, `recordatorios/${uid}`), { ...datos, perfil: perfilActivo, completado: false, createdAt: Date.now() })
    }
    setMostrarForm(false)
    setEditando(null)
  }

  function handleHecho(r) {
    if (r.recurrente) {
      update(ref(db, `recordatorios/${uid}/${r.id}`), { fecha: siguienteFecha(r.fecha, r.frecuencia) })
      return
    }
    if (confirm(`¿Marcar "${r.titulo}" como hecho? Se va a eliminar.`)) {
      remove(ref(db, `recordatorios/${uid}/${r.id}`))
    }
  }

  function handlePostergar(tipo, valor) {
    const r = postergando
    if (tipo === 'editar') {
      setPostergando(null)
      handleEditar(r)
      return
    }

    let fecha, hora
    if (tipo === 'minutos') {
      const futuro = new Date(Date.now() + valor * 60000)
      fecha = fechaLocalISO(futuro)
      hora = `${String(futuro.getHours()).padStart(2, '0')}:${String(futuro.getMinutes()).padStart(2, '0')}`
    } else {
      const manana = new Date()
      manana.setDate(manana.getDate() + 1)
      fecha = fechaLocalISO(manana)
      hora = r.hora
    }

    update(ref(db, `recordatorios/${uid}/${r.id}`), { fecha, hora, notificadoEn: null, completado: false })
    setPostergando(null)
  }

  function handleEditar(r) {
    setEditando(r)
    setMostrarForm(true)
  }

  function handleGuardarPorVoz(texto) {
    const parsed = parseVoz(texto)
    if (!parsed.titulo) return
    push(ref(db, `recordatorios/${uid}`), {
      titulo: parsed.titulo,
      detalle: null,
      fecha: parsed.fecha || fechaLocalISO(),
      hora: parsed.hora || '09:00',
      recurrente: !!parsed.recurrente,
      frecuencia: parsed.recurrente ? parsed.frecuencia : null,
      perfil: perfilActivo,
      completado: false,
      createdAt: Date.now(),
    })
    setAvisoGuardado(true)
    setTimeout(() => setAvisoGuardado(false), 2000)
  }

  function handleMicPress() {
    if (!dictadoSoportado) {
      alert('Tu navegador no soporta dictado por voz.')
      return
    }
    iniciarDictadoRapido(handleGuardarPorVoz)
  }

  function handleEliminar(r) {
    if (confirm(`¿Eliminar "${r.titulo}"?`)) remove(ref(db, `recordatorios/${uid}/${r.id}`))
  }

  if (usuario === undefined) return null
  if (usuario === null) return <LoginScreen />

  const activos = recordatorios.filter((r) => !r.completado && (r.perfil || 'laboral') === perfilActivo)
  const conteos = {
    hoy: activos.filter(esHoy).length,
    programados: activos.filter(esFuturo).length,
    todos: activos.length,
    recurrentes: activos.filter((r) => r.recurrente).length,
  }
  const filtrados =
    vista === 'hoy'
      ? activos.filter(esHoy)
      : vista === 'programados'
        ? activos.filter(esFuturo)
        : vista === 'recurrentes'
          ? activos.filter((r) => r.recurrente)
          : activos
  const lista = ordenarRecordatorios(filtrados)
  const tituloVista = FILTROS.find((f) => f.id === vista)?.label

  return (
    <div className="flex-1 flex flex-col px-4 pt-6 pb-24" data-perfil={perfilActivo}>
      <header className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Recordatorios</h1>
        <div className="flex items-center gap-3">
          {!notifPermitidas && (
            <button onClick={handleActivarNotif} className="text-sm text-[var(--accent2)]">
              🔔 Activar avisos
            </button>
          )}
          <button onClick={cerrarSesion} className="text-sm text-[var(--muted)]" aria-label="Cerrar sesión">
            Salir
          </button>
        </div>
      </header>
      <p className="text-sm text-[var(--muted)] mb-5">
        {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      {vista === null ? (
        <ResumenCards conteos={conteos} onSeleccionar={setVista} />
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setVista(null)} aria-label="Volver" className="text-xl px-1 -ml-1">
              ←
            </button>
            <h2 className="text-lg font-semibold">{tituloVista}</h2>
          </div>

          {lista.length === 0 && (
            <p className="text-[var(--muted)] text-center mt-12">No tenés recordatorios acá.</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {lista.map((r) => (
              <RecordatorioItem
                key={r.id}
                r={r}
                onHecho={handleHecho}
                onPostergar={setPostergando}
                onEditar={handleEditar}
                onEliminar={handleEliminar}
              />
            ))}
          </div>
        </>
      )}

      <div className="fixed bottom-0 inset-x-0 pb-6 pointer-events-none flex flex-col items-center gap-3">
        <PerfilSwitcher
          perfil={perfilActivo}
          nombres={nombresPerfiles}
          onCambiar={cambiarPerfil}
          onRenombrar={renombrarPerfil}
        />
        <div className="relative w-full max-w-[480px] mx-auto px-6 h-16 flex items-center justify-end">
          {grabandoRapido && (
            <p className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 text-xs text-[var(--danger)] whitespace-nowrap">
              🎙️ Escuchando…
            </p>
          )}
          {avisoGuardado && (
            <p className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 text-xs text-[var(--success)] whitespace-nowrap">
              ✓ Guardado
            </p>
          )}
          <button
            onPointerDown={handleMicPress}
            aria-label="Grabar recordatorio por voz"
            className={`pointer-events-auto absolute left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-[var(--danger)] text-white text-2xl shadow-lg shadow-black/40 flex items-center justify-center transition-transform ${
              grabandoRapido ? 'scale-110 animate-pulse' : ''
            }`}
          >
            🎤
          </button>
          <button
            onClick={() => {
              setEditando(null)
              setMostrarForm(true)
            }}
            className="pointer-events-auto w-12 h-12 rounded-full bg-[var(--card)] border border-white/10 text-lg shadow-lg shadow-black/40 flex items-center justify-center"
            aria-label="Nuevo recordatorio escrito"
          >
            📝
          </button>
        </div>
      </div>

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

      {postergando && (
        <PostergarSheet r={postergando} onPostergar={handlePostergar} onCerrar={() => setPostergando(null)} />
      )}

      {needRefresh && <UpdateBanner onUpdate={() => updateServiceWorker(true)} />}
    </div>
  )
}

export default App
