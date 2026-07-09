export function logDebug(msg) {
  const log = JSON.parse(localStorage.getItem('debugAuth') || '[]')
  log.push(`${new Date().toISOString().slice(11, 19)} ${msg}`)
  localStorage.setItem('debugAuth', JSON.stringify(log.slice(-25)))
}

export function leerDebug() {
  return JSON.parse(localStorage.getItem('debugAuth') || '[]')
}

export function limpiarDebug() {
  localStorage.removeItem('debugAuth')
}
