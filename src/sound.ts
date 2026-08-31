/** Small synthesised sound effects — no audio assets to download. */

type Effect = 'miss' | 'hit' | 'sunk' | 'win' | 'lose'

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(
  context: AudioContext,
  { from, to, start, duration, type = 'sine', gain = 0.12 }:
    { from: number; to: number; start: number; duration: number; type?: OscillatorType; gain?: number },
) {
  const osc = context.createOscillator()
  const amp = context.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, start)
  osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), start + duration)
  amp.gain.setValueAtTime(0.0001, start)
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.01)
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(amp).connect(context.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

/** Filtered white noise: the splash of a miss and the blast of a hit. */
function noise(
  context: AudioContext,
  { start, duration, frequency, gain = 0.2, type = 'lowpass' }:
    { start: number; duration: number; frequency: number; gain?: number; type?: BiquadFilterType },
) {
  const frames = Math.floor(context.sampleRate * duration)
  const buffer = context.createBuffer(1, frames, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames)
  const source = context.createBufferSource()
  source.buffer = buffer
  const filter = context.createBiquadFilter()
  filter.type = type
  filter.frequency.setValueAtTime(frequency, start)
  const amp = context.createGain()
  amp.gain.setValueAtTime(gain, start)
  source.connect(filter).connect(amp).connect(context.destination)
  source.start(start)
}

export function playEffect(effect: Effect) {
  const context = audio()
  if (!context) return
  const now = context.currentTime

  switch (effect) {
    case 'miss':
      noise(context, { start: now, duration: 0.35, frequency: 900, gain: 0.12 })
      tone(context, { from: 420, to: 160, start: now, duration: 0.2, type: 'sine', gain: 0.05 })
      break
    case 'hit':
      noise(context, { start: now, duration: 0.5, frequency: 500, gain: 0.28 })
      tone(context, { from: 180, to: 45, start: now, duration: 0.4, type: 'square', gain: 0.1 })
      break
    case 'sunk':
      noise(context, { start: now, duration: 0.9, frequency: 320, gain: 0.32 })
      tone(context, { from: 140, to: 35, start: now, duration: 0.8, type: 'sawtooth', gain: 0.12 })
      tone(context, { from: 90, to: 30, start: now + 0.15, duration: 0.7, type: 'square', gain: 0.08 })
      break
    case 'win':
      ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone(context, { from: f, to: f, start: now + i * 0.12, duration: 0.22, type: 'triangle', gain: 0.1 }),
      )
      break
    case 'lose':
      ;[392, 329.63, 261.63, 196].forEach((f, i) =>
        tone(context, { from: f, to: f, start: now + i * 0.16, duration: 0.3, type: 'triangle', gain: 0.1 }),
      )
      break
  }
}

const STORAGE_KEY = 'battleship:muted'
const RULES_KEY = 'battleship:rules-dismissed'

export function loadMuted(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

export function saveMuted(muted: boolean) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, String(muted))
}

export function loadRulesDismissed(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(RULES_KEY) === 'true'
}

export function saveRulesDismissed(dismissed: boolean) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(RULES_KEY, String(dismissed))
}
