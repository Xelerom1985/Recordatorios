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
