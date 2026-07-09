const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onValueWritten } = require('firebase-functions/v2/database')
const { logger } = require('firebase-functions')
const { initializeApp } = require('firebase-admin/app')
const { getDatabase } = require('firebase-admin/database')
const { getMessaging } = require('firebase-admin/messaging')
const { getAuth } = require('firebase-admin/auth')

initializeApp()

const MINUTOS_ANTICIPACION = 15

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
            data: { id: r.id },
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
