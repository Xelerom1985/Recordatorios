const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'setiembre', 'octubre', 'noviembre', 'diciembre',
]

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

const NUM_PALABRAS = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8,
  nueve: 9, diez: 10, once: 11, doce: 12, quince: 15, veinte: 20, veinticinco: 25, treinta: 30,
  cuarenta: 40, cincuenta: 50, sesenta: 60,
}

const ACENTOS = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' }

function sinAcentos(s) {
  return s.replace(/[áéíóú]/g, (c) => ACENTOS[c])
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function fechaISO(dt) {
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`
}

function horaISO(h, m) {
  return `${pad2(h)}:${pad2(m)}`
}

// Convierte un texto dictado en español a { titulo, fecha?, hora?, recurrente?, frecuencia? }
export function parseVoz(textoOriginal) {
  let texto = ` ${textoOriginal.trim().toLowerCase()} `
  const resultado = {}
  const ahora = new Date()

  // --- Recurrencia ---
  if (/\btodos los d[ií]as\b|\bcada d[ií]a\b|\bdiariamente\b/.test(texto)) {
    resultado.recurrente = true
    resultado.frecuencia = 'diario'
    texto = texto.replace(/\btodos los d[ií]as\b|\bcada d[ií]a\b|\bdiariamente\b/g, ' ')
  } else if (/\btodas las semanas\b|\bcada semana\b|\bsemanalmente\b/.test(texto)) {
    resultado.recurrente = true
    resultado.frecuencia = 'semanal'
    texto = texto.replace(/\btodas las semanas\b|\bcada semana\b|\bsemanalmente\b/g, ' ')
  } else if (/\btodos los meses\b|\bcada mes\b|\bmensualmente\b/.test(texto)) {
    resultado.recurrente = true
    resultado.frecuencia = 'mensual'
    texto = texto.replace(/\btodos los meses\b|\bcada mes\b|\bmensualmente\b/g, ' ')
  } else {
    const diaRecurrenteMatch = texto.match(/\btodos los (lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bados|domingos)\b/)
    if (diaRecurrenteMatch) {
      resultado.recurrente = true
      resultado.frecuencia = 'semanal'
      texto = texto.replace(diaRecurrenteMatch[0], ' ')
    }
  }

  // --- Hora relativa: "en X minutos/horas" ---
  const relativoMatch = texto.match(/\ben\s+(media\s+hora|un\s+cuarto\s+de\s+hora|\d+|[a-záéíóú]+)\s*(minutos?|horas?)\b/)
  if (relativoMatch) {
    let cantidad
    if (/^media/.test(relativoMatch[1])) cantidad = 30
    else if (/^un\s+cuarto/.test(relativoMatch[1])) cantidad = 15
    else cantidad = /^\d+$/.test(relativoMatch[1]) ? parseInt(relativoMatch[1], 10) : NUM_PALABRAS[relativoMatch[1]]

    if (cantidad != null) {
      const ms = /minutos?/.test(relativoMatch[2]) ? cantidad * 60000 : cantidad * 3600000
      const futuro = new Date(ahora.getTime() + ms)
      resultado.fecha = fechaISO(futuro)
      resultado.hora = horaISO(futuro.getHours(), futuro.getMinutes())
      texto = texto.replace(relativoMatch[0], ' ')
    }
  }

  // --- Hora explícita: "a las 5", "a las 17:30", "a las 5 y media de la tarde" ---
  if (!resultado.hora) {
    const horaConLasMatch = texto.match(
      /\ba las?\s+(\d{1,2})(?::(\d{2})|\s+y\s+media)?\s*(de la ma[ñn]ana|de la tarde|de la noche|am|pm)?\s*(?:hs\.?|horas?)?/,
    )
    const horaConSufijoMatch = !horaConLasMatch && texto.match(/\b(\d{1,2})(?::(\d{2}))?\s*(?:hs\.?|horas?)\b/)
    const horaMatch = horaConLasMatch || horaConSufijoMatch

    if (horaMatch) {
      let h = parseInt(horaMatch[1], 10)
      let m = horaMatch[2] ? parseInt(horaMatch[2], 10) : /y\s+media/.test(horaMatch[0]) ? 30 : 0
      const periodo = horaConLasMatch?.[3]
      if (periodo && /(tarde|noche|pm)/.test(periodo) && h < 12) h += 12
      if (periodo && /(ma[ñn]ana|am)/.test(periodo) && h === 12) h = 0
      resultado.hora = horaISO(h, m)
      texto = texto.replace(horaMatch[0], ' ')
    } else if (/\bal?\s+mediod[ií]a\b/.test(texto)) {
      resultado.hora = '12:00'
      texto = texto.replace(/\bal?\s+mediod[ií]a\b/, ' ')
    } else if (/\ba\s+medianoche\b/.test(texto)) {
      resultado.hora = '00:00'
      texto = texto.replace(/\ba\s+medianoche\b/, ' ')
    } else {
      const franjaMatch = texto.match(/\ba\s+la\s+(ma[ñn]ana|tarde|noche)\b/)
      if (franjaMatch) {
        resultado.hora = { mañana: '09:00', manana: '09:00', tarde: '16:00', noche: '21:00' }[franjaMatch[1]]
        texto = texto.replace(franjaMatch[0], ' ')
      }
    }
  }

  // --- Fecha ---
  if (!resultado.fecha) {
    if (/\bpasado\s+ma[ñn]ana\b/.test(texto)) {
      const dt = new Date(ahora)
      dt.setDate(dt.getDate() + 2)
      resultado.fecha = fechaISO(dt)
      texto = texto.replace(/\bpasado\s+ma[ñn]ana\b/, ' ')
    } else if (/\bhoy\b/.test(texto)) {
      resultado.fecha = fechaISO(ahora)
      texto = texto.replace(/\bhoy\b/, ' ')
    } else if (/(?<!de la\s)\bma[ñn]ana\b/.test(texto)) {
      const dt = new Date(ahora)
      dt.setDate(dt.getDate() + 1)
      resultado.fecha = fechaISO(dt)
      texto = texto.replace(/\bma[ñn]ana\b/, ' ')
    } else {
      const enDiasMatch = texto.match(/\ben\s+(\d+|[a-záéíóú]+)\s+d[ií]as\b/)
      if (enDiasMatch) {
        const cantidad = /^\d+$/.test(enDiasMatch[1]) ? parseInt(enDiasMatch[1], 10) : NUM_PALABRAS[enDiasMatch[1]]
        if (cantidad != null) {
          const dt = new Date(ahora)
          dt.setDate(dt.getDate() + cantidad)
          resultado.fecha = fechaISO(dt)
          texto = texto.replace(enDiasMatch[0], ' ')
        }
      } else {
        const diaSemanaMatch = texto.match(
          /\b(?:el|este|pr[óo]ximo)\s+(domingo|lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado)\b/,
        )
        if (diaSemanaMatch) {
          const objetivo = DIAS_SEMANA.indexOf(sinAcentos(diaSemanaMatch[1]))
          const dt = new Date(ahora)
          const actual = dt.getDay()
          let delta = (objetivo - actual + 7) % 7
          if (/pr[óo]ximo/.test(diaSemanaMatch[0]) && delta === 0) delta = 7
          dt.setDate(dt.getDate() + delta)
          resultado.fecha = fechaISO(dt)
          texto = texto.replace(diaSemanaMatch[0], ' ')
        } else {
          const fechaExplicitaMatch = texto.match(
            new RegExp(`\\bel\\s+(\\d{1,2})(?:\\s+de\\s+(${MESES.join('|')}))?\\b`),
          )
          if (fechaExplicitaMatch) {
            const dia = parseInt(fechaExplicitaMatch[1], 10)
            const mes = fechaExplicitaMatch[2] ? MESES.indexOf(fechaExplicitaMatch[2]) % 12 : ahora.getMonth()
            const dt = new Date(ahora.getFullYear(), mes, dia)
            if (dt < ahora && !fechaExplicitaMatch[2]) dt.setMonth(dt.getMonth() + 1)
            else if (dt < ahora) dt.setFullYear(dt.getFullYear() + 1)
            resultado.fecha = fechaISO(dt)
            texto = texto.replace(fechaExplicitaMatch[0], ' ')
          }
        }
      }
    }
  }

  // --- Limpieza del título ---
  texto = texto.replace(
    /^\s*(recordame|record[aá] que|record[aá]|recordatorio de|recordatorio para|agregar recordatorio de|poner recordatorio de|anotar que|anot[aá])\s*(que\s+)?/,
    ' ',
  )
  texto = texto
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(que|de|para|a)\s+/, '')

  resultado.titulo = texto.charAt(0).toUpperCase() + texto.slice(1)

  return resultado
}
