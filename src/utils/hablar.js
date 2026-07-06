import { esHoy } from './recordatorios'

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function fechaHablada(fecha) {
  if (esHoy({ fecha })) return 'hoy'
  const [y, m, d] = fecha.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `el ${DIAS[dt.getDay()]} ${dt.getDate()} de ${MESES[dt.getMonth()]}`
}

function horaHablada(hora) {
  const [h, m] = hora.split(':').map(Number)
  return m === 0 ? `a las ${h} horas` : `a las ${h} y ${m} minutos`
}

export function fraseRecordatorio(r) {
  let frase = `Recordá ${r.titulo}. ${fechaHablada(r.fecha)}. ${horaHablada(r.hora)}.`
  if (r.detalle) frase += ` ${r.detalle}.`
  return frase
}

export function hablar(texto, onEnd) {
  if (!('speechSynthesis' in window)) return false
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(texto)
  utterance.lang = 'es-AR'
  if (onEnd) utterance.onend = onEnd
  window.speechSynthesis.speak(utterance)
  return true
}

export function detenerHabla() {
  window.speechSynthesis?.cancel()
}
