const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onValueWritten } = require('firebase-functions/v2/database')
const { onRequest } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions')
const { initializeApp } = require('firebase-admin/app')
const { getDatabase } = require('firebase-admin/database')
const { getMessaging } = require('firebase-admin/messaging')
const { getAuth } = require('firebase-admin/auth')

initializeApp()

const MINUTOS_ANTICIPACION = 15

function siguienteFecha(fecha, frecuencia) {
  const [y, m, d] = fecha.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  if (frecuencia === 'diario') dt.setDate(dt.getDate() + 1)
  else if (frecuencia === 'semanal') dt.setDate(dt.getDate() + 7)
  else if (frecuencia === 'mensual') {
    dt.setMonth(dt.getMonth() + 1, 1)
    const ultimoDiaMes = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate()
    dt.setDate(Math.min(d, ultimoDiaMes))
  }
  const pad = (n) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

// Convierte un instante UTC a fecha/hora de reloj en Argentina (UTC-3 fijo, sin horario de verano)
function fechaHoraArtDesde(ms) {
  const dt = new Date(ms - 3 * 3600000)
  const pad = (n) => String(n).padStart(2, '0')
  return {
    fecha: `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`,
    hora: `${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}`,
  }
}

function pendientesDe(recordatorios, ahora, rutaBase, actualizaciones) {
  const pendientes = []
  for (const [id, r] of Object.entries(recordatorios || {})) {
    if (!r.recurrente && r.completado) continue
    const notificadoEn = `${r.fecha}T${r.hora}`
    if (r.notificadoEn === notificadoEn) continue
    const fechaHora = new Date(`${r.fecha}T${r.hora || '00:00'}:00-03:00`).getTime()
    const horaAviso = fechaHora - MINUTOS_ANTICIPACION * 60000
    if (horaAviso > ahora) continue

    pendientes.push({ id, ...r })
    actualizaciones[`${rutaBase}/${id}/notificadoEn`] = notificadoEn
  }
  return pendientes
}

async function enviarA(pendientes, tokens, tokenAUid, db) {
  return Promise.all(
    pendientes.flatMap((r) =>
      tokens.map((token) =>
        getMessaging()
          .send({
            token,
            notification: {
              title: r.titulo,
              body: r.detalle
                ? `En ${MINUTOS_ANTICIPACION} minutos · ${r.detalle}`
                : `En ${MINUTOS_ANTICIPACION} minutos`,
            },
            data: { id: r.id, perfil: r.perfil || '' },
            android: { priority: 'high' },
            webpush: { headers: { Urgency: 'high' } },
          })
          .then(() => ({ titulo: r.titulo, token, ok: true }))
          .catch((err) => {
            if (err.code === 'messaging/registration-token-not-registered') {
              db.ref(`tokens/${tokenAUid[token]}/${token}`).remove()
            }
            return { titulo: r.titulo, token, ok: false, error: err.message }
          }),
      ),
    ),
  )
}

exports.checkRecordatorios = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: 'America/Argentina/Buenos_Aires',
    region: 'us-central1',
  },
  async () => {
    const db = getDatabase()
    const [recSnap, tokensSnap, compartidosSnap, miembrosSnap] = await Promise.all([
      db.ref('recordatorios').get(),
      db.ref('tokens').get(),
      db.ref('recordatorios_compartidos').get(),
      db.ref('config_compartido/miembros').get(),
    ])
    const recordatoriosPorUsuario = recSnap.val() || {}
    const tokensPorUsuario = tokensSnap.val() || {}
    const compartidos = compartidosSnap.val() || {}
    const miembros = Object.keys(miembrosSnap.val() || {})
    const ahora = Date.now()
    const actualizaciones = {}
    const resultados = []

    const tokenAUid = {}
    for (const [uid, tokens] of Object.entries(tokensPorUsuario)) {
      for (const token of Object.keys(tokens || {})) tokenAUid[token] = uid
    }

    for (const [uid, recordatorios] of Object.entries(recordatoriosPorUsuario)) {
      const tokens = Object.keys(tokensPorUsuario[uid] || {})
      if (tokens.length === 0) continue
      const pendientes = pendientesDe(recordatorios, ahora, `recordatorios/${uid}`, actualizaciones)
      if (pendientes.length === 0) continue
      resultados.push(...(await enviarA(pendientes, tokens, tokenAUid, db)))
    }

    const tokensCompartidos = [...new Set(miembros.flatMap((uid) => Object.keys(tokensPorUsuario[uid] || {})))]
    if (tokensCompartidos.length > 0) {
      const pendientesCompartidos = pendientesDe(compartidos, ahora, 'recordatorios_compartidos', actualizaciones)
      if (pendientesCompartidos.length > 0) {
        resultados.push(...(await enviarA(pendientesCompartidos, tokensCompartidos, tokenAUid, db)))
      }
    }

    logger.info(`resultados envío (${resultados.length})`, resultados)
    if (Object.keys(actualizaciones).length > 0) await db.ref().update(actualizaciones)
  },
)

async function nombreDe(uid) {
  if (!uid) return 'Alguien'
  try {
    const u = await getAuth().getUser(uid)
    return u.displayName || u.email || 'Alguien'
  } catch {
    return 'Alguien'
  }
}

exports.onCompartidoCambio = onValueWritten(
  { ref: '/recordatorios_compartidos/{id}', region: 'us-central1' },
  async (event) => {
    const antes = event.data.before.val()
    const despues = event.data.after.val()
    if (!despues) return // se borró, nada que avisar

    let actorUid = null
    let accion = null

    if (!antes) {
      actorUid = despues.creadoPor
      accion = 'agregó'
    } else if (!antes.completado && despues.completado) {
      actorUid = despues.completadoPor
      accion = 'completó'
    } else if (despues.recurrente && despues.ultimoCompletadoEn !== antes.ultimoCompletadoEn) {
      actorUid = despues.completadoPor
      accion = 'completó'
    }
    if (!accion) {
      logger.info(`onCompartidoCambio: sin acción para ${event.params.id}`)
      return
    }

    const db = getDatabase()
    const miembrosSnap = await db.ref('config_compartido/miembros').get()
    const destinatarios = Object.keys(miembrosSnap.val() || {}).filter((uid) => uid !== actorUid)
    logger.info(`onCompartidoCambio: accion=${accion} actor=${actorUid} destinatarios=${destinatarios.length}`)
    if (destinatarios.length === 0) return

    const tokensSnaps = await Promise.all(destinatarios.map((uid) => db.ref(`tokens/${uid}`).get()))
    const tokens = tokensSnaps.flatMap((snap) => Object.keys(snap.val() || {}))
    logger.info(`onCompartidoCambio: tokens=${tokens.length}`)
    if (tokens.length === 0) return

    const nombre = await nombreDe(actorUid)

    const resultados = await Promise.all(
      tokens.map((token) =>
        getMessaging()
          .send({
            token,
            notification: { title: `${nombre} ${accion} un recordatorio compartido`, body: despues.titulo },
            data: { id: event.params.id },
            android: { priority: 'high' },
            webpush: { headers: { Urgency: 'high' } },
          })
          .then(() => ({ token, ok: true }))
          .catch((err) => {
            logger.error('Error notificando cambio en compartido', { code: err.code })
            return { token, ok: false, error: err.code }
          }),
      ),
    )
    logger.info('onCompartidoCambio: resultados', resultados)
  },
)

// Acción rápida disparada desde los botones de la notificación push (Postergar 10 min / Hecho),
// sin necesidad de abrir la app. Verifica el ID token para saber quién llama de verdad (nunca
// confiar en un uid que mande el cliente) y aplica las mismas reglas de acceso que database.rules.json.
exports.accionRapida = onRequest({ region: 'us-central1', cors: true }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!idToken) return res.status(401).send('Falta el token de autenticación')

  let uid
  try {
    uid = (await getAuth().verifyIdToken(idToken)).uid
  } catch {
    return res.status(401).send('Token inválido')
  }

  const { id, perfil, accion } = req.body || {}
  if (!id || !accion) return res.status(400).send('Faltan parámetros')

  const db = getDatabase()
  let ruta
  if (perfil === 'compartido') {
    const miembrosSnap = await db.ref('config_compartido/miembros').get()
    if (!miembrosSnap.val()?.[uid]) return res.status(403).send('No sos miembro del perfil compartido')
    ruta = `recordatorios_compartidos/${id}`
  } else {
    ruta = `recordatorios/${uid}/${id}`
  }

  const snap = await db.ref(ruta).get()
  const r = snap.val()
  if (!r) return res.status(404).send('No se encontró el recordatorio')

  if (accion === 'postergar10') {
    const { fecha, hora } = fechaHoraArtDesde(Date.now() + 10 * 60000)
    await db.ref(ruta).update({ fecha, hora, notificadoEn: null, completado: false })
  } else if (accion === 'hecho') {
    if (r.recurrente) {
      await db.ref(ruta).update({
        fecha: siguienteFecha(r.fecha, r.frecuencia),
        completadoPor: uid,
        ultimoCompletadoEn: Date.now(),
      })
    } else if (perfil === 'compartido') {
      await db.ref(ruta).update({ completado: true, completadoPor: uid })
    } else {
      await db.ref(ruta).remove()
    }
  } else {
    return res.status(400).send('Acción desconocida')
  }

  res.status(200).send('OK')
})
