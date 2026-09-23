/**
 * Alertas del cronómetro de descanso: pitidos con Web Audio (sin archivos de
 * audio) y vibración. iOS solo permite sonar si el AudioContext se "desbloqueó"
 * durante un gesto del usuario, por eso `unlockAudio()` se llama al tocar ✓.
 */
let audioContext: AudioContext | null = null

export function unlockAudio(): void {
  try {
    audioContext ??= new AudioContext()
    if (audioContext.state !== 'running') void audioContext.resume()
  } catch {
    // Sin Web Audio: la alerta será solo visual/vibración.
  }
}

/** Tres pitidos cortos, el último más agudo. */
export function playRestFinishedSound(): void {
  const ctx = audioContext
  if (!ctx) return
  if (ctx.state !== 'running') void ctx.resume()
  const start = ctx.currentTime + 0.05
  const tones = [880, 880, 1320]
  tones.forEach((frequency, i) => {
    const t = start + i * 0.28
    const duration = i === tones.length - 1 ? 0.45 : 0.16
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + duration + 0.05)
  })
}

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // iOS Safari no implementa la Vibration API.
  }
}
