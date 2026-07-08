export function fechaHoraISO(fecha, hora) {
  return new Date(`${fecha}T${hora || '00:00'}:00`)
}

export function estaVencido(r) {
  if (r.completado && !r.recurrente) return false
  return fechaHoraISO(r.fecha, r.hora).getTime() < Date.now()
}

export function esHoy(r) {
  const hoy = new Date()
  const [y, m, d] = r.fecha.split('-').map(Number)
  return y === hoy.getFullYear() && m === hoy.getMonth() + 1 && d === hoy.getDate()
}

export function esFuturo(r) {
  const hoy = new Date()
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const [y, m, d] = r.fecha.split('-').map(Number)
  return new Date(y, m - 1, d) > inicioHoy
}

export function fechaLocalISO(dt = new Date()) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export function ordenarRecordatorios(lista) {
  return [...lista].sort((a, b) => {
    if (a.completado !== b.completado) return a.completado ? 1 : -1
    return fechaHoraISO(a.fecha, a.hora) - fechaHoraISO(b.fecha, b.hora)
  })
}

export function siguienteFecha(fecha, frecuencia) {
  const [y, m, d] = fecha.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  if (frecuencia === 'diario') dt.setDate(dt.getDate() + 1)
  else if (frecuencia === 'semanal') dt.setDate(dt.getDate() + 7)
  else if (frecuencia === 'mensual') dt.setMonth(dt.getMonth() + 1)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function formatearFecha(fecha) {
  const [y, m, d] = fecha.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}
