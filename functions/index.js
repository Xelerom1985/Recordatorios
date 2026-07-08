const { onSchedule } = require('firebase-functions/v2/scheduler')
const { logger } = require('firebase-functions')
const { initializeApp } = require('firebase-admin/app')
const { getDatabase } = require('firebase-admin/database')
const { getMessaging } = require('firebase-admin/messaging')

initializeApp()

exports.checkRecordatorios = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: 'America/Argentina/Buenos_Aires',
    region: 'us-central1',
  },
  async () => {
    const db = getDatabase()
    const [recSnap, tokensSnap] = await Promise.all([db.ref('recordatorios').get(), db.ref('tokens').get()])
    const recordatorios = recSnap.val() || {}
    const tokens = Object.keys(tokensSnap.val() || {})
    logger.info(`recordatorios=${Object.keys(recordatorios).length} tokens=${tokens.length}`)
    if (tokens.length === 0) return

    const ahora = Date.now()
    const pendientes = []
    const actualizaciones = {}

    for (const [id, r] of Object.entries(recordatorios)) {
      if (!r.recurrente && r.completado) continue
      if (r.notificadoFecha === r.fecha) continue
      const fechaHora = new Date(`${r.fecha}T${r.hora || '00:00'}:00-03:00`).getTime()
      if (fechaHora > ahora) continue

      pendientes.push({ id, ...r })
      actualizaciones[`recordatorios/${id}/notificadoFecha`] = r.fecha
    }

    logger.info(`pendientes=${pendientes.length}`, pendientes.map((r) => r.titulo))
    if (pendientes.length === 0) return

    const resultados = await Promise.all(
      pendientes.flatMap((r) =>
        tokens.map((token) =>
          getMessaging()
            .send({
              token,
              notification: { title: r.titulo, body: r.detalle || 'Tenés un recordatorio pendiente' },
              data: { id: r.id },
            })
            .then(() => ({ titulo: r.titulo, token, ok: true }))
            .catch((err) => {
              if (err.code === 'messaging/registration-token-not-registered') {
                db.ref(`tokens/${token}`).remove()
              }
              return { titulo: r.titulo, token, ok: false, error: err.message }
            }),
        ),
      ),
    )
    logger.info('resultados envío', resultados)

    await db.ref().update(actualizaciones)
  },
)
