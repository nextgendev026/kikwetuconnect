'use client'

// Lightweight WebAudio notification sounds — no audio assets required.
// Sounds are synthesized so they work offline and never fail to load.

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (!AC) return null
    try { audioCtx = new AC() } catch { return null }
  }
  if (audioCtx.state === 'suspended') { audioCtx.resume().catch(() => {}) }
  return audioCtx
}

function tone(c: AudioContext, freq: number, delay: number, dur: number, type: OscillatorType, volume: number) {
  const osc = c.createOscillator()
  const g = c.createGain()
  const t0 = c.currentTime + delay
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.linearRampToValueAtTime(volume, t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

/** Soft two-tone "ding" for incoming messages. */
export function playMessageSound() {
  const c = getCtx()
  if (!c) return
  try {
    tone(c, 830, 0, 0.18, 'sine', 0.10)
    tone(c, 1244, 0.13, 0.24, 'sine', 0.09)
  } catch { /* audio is non-critical */ }
}

/** Single soft chime for generic notifications (likes, heshima, badges...). */
export function playNotificationSound() {
  const c = getCtx()
  if (!c) return
  try {
    tone(c, 1046, 0, 0.16, 'sine', 0.09)
    tone(c, 1567, 0.1, 0.2, 'sine', 0.06)
  } catch { /* audio is non-critical */ }
}
