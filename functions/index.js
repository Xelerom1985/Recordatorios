const { onSchedule } = require('firebase-functions/v2/scheduler')
const { logger } = require('firebase-functions')
const { initializeApp } = require('firebase-admin/app')
const { getDatabase } = require('firebase-admin/database')
const { getMessaging } = require('firebase-admin/messaging')

initializeApp()

const MINUTOS_ANTICIPACION = 15

exports.checkRecordatorios = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: 'America/Argentina/Buenos_Aires',
    region: 'us-central1',
  },
  async () => {
    const db = getDatabase()
    const [recSnap, tokensSnap] = await Promise.all([db.ref('recordatorios').get(), db.ref('tokens').get()])
    const recordatoriosPorUsuario = recSnap.val() || {}
    const tokensPorUsuario = tokensSnap.val() || {}
    const ahora = Date.now()
    const actualizaciones = {}
    const resultados = []

    for (const [uid, recordatorios] of Object.entries(recordatoriosPorUsuario)) {
      const tokens = Object.keys(tokensPorUsuario[uid] || {})
      if (tokens.length === 0) continue

      const pendientes = []
      for (const [id, r] of Object.entries(recordatorios)) {
        if (!r.recurrente && r.completado) continue
        const notificadoEn = `${r.fecha}T${r.hora}`
        if (r.notificadoEn === notificadoEn) continue
        const fechaHora = new Date(`${r.fecha}T${r.hora || '00:00'}:00-03:00`).getTime()
        const horaAviso = fechaHora - MINUTOS_ANTICIPACION * 60000
        if (horaAviso > ahora) continue

        pendientes.push({ id, ...r })
        actualizaciones[`recordatorios/${uid}/${id}/notificadoEn`] = notificadoEn
      }
      if (pendientes.length === 0) continue

      const enviados = await Promise.all(
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
              .then(() => ({ uid, titulo: r.titulo, token, ok: true }))
              .catch((err) => {
                if (err.code === 'messaging/registration-token-not-registered') {
                  db.ref(`tokens/${uid}/${token}`).remove()
                }
                return { uid, titulo: r.titulo, token, ok: false, error: err.message }
              }),
          ),
        ),
      )
      resultados.push(...enviados)
    }

    logger.info(`resultados envío (${resultados.length})`, resultados)
    if (Object.keys(actualizaciones).length > 0) await db.ref().update(actualizaciones)
  },
)
