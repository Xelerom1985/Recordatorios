import { useCallback, useState } from 'react'

export function useDictado() {
  const [escuchando, setEscuchando] = useState(false)

  const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
  const soportado = !!SpeechRecognition

  const iniciar = useCallback(
    (onResultado) => {
      if (!SpeechRecognition) return
      const recognition = new SpeechRecognition()
      recognition.lang = 'es-AR'
      recognition.interimResults = false
      recognition.maxAlternatives = 1
      recognition.onstart = () => setEscuchando(true)
      recognition.onend = () => setEscuchando(false)
      recognition.onerror = () => setEscuchando(false)
      recognition.onresult = (event) => onResultado(event.results[0][0].transcript)
      recognition.start()
    },
    [SpeechRecognition],
  )

  return { escuchando, soportado, iniciar }
}
