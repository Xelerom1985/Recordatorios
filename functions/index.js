const { onSchedule } = require('firebase-functions/v2/scheduler')
const { initializeApp } = require('firebase-admin/app')
const { getDatabase } = require('firebase-admin/database')
const { getMessaging } = require('firebase-admin/messaging')

initializeApp()

exports.checkRecordatorios = onSchedule(
  {
    schedule: 'every 5 minutes',
    timeZone: 'America/Argentina/Buenos_Aires',
    region: 'us-central1',
  },
  async () => {
    const db = getDatabase()
    const [recSnap, tokensSnap] = await Promise.all([db.ref('recordatorios').get(), db.ref('tokens').get()])
    const recordatorios = recSnap.val() || {}
    const tokens = Object.keys(tokensSnap.val() || {})
    if (tokens.length === 0) return

    const ahora = Date.now()
    const pendientes = []
    const actualizaciones = {}

    for (const [id, r] of Object.entries(recordatorios)) {
      if (!r.recurrente && r.completado) continue
      if (r.notificadoFecha === r.fecha) continue
      const fechaHora = new Date(`${r.fecha}T${r.hora || '00:00'}:00`).getTime()
      if (fechaHora > ahora) continue

      pendientes.push(r)
      actualizaciones[`recordatorios/${id}/notificadoFecha`] = r.fecha
    }

    if (pendientes.length === 0) return

    await Promise.all(
      pendientes.flatMap((r) =>
        tokens.map((token) =>
          getMessaging()
            .send({
              token,
              notification: { title: r.titulo, body: r.detalle || 'Tenés un recordatorio pendiente' },
            })
            .catch((err) => {
              if (err.code === 'messaging/registration-token-not-registered') {
                return db.ref(`tokens/${token}`).remove()
              }
            }),
        ),
      ),
    )

    await db.ref().update(actualizaciones)
  },
)
