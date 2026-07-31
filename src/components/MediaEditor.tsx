'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

interface MediaEditorProps {
  file: File
  type: 'image' | 'video' | 'audio'
  onComplete: (editedFile: File, cropData?: any) => void
  onCancel: () => void
  aspect?: 'square' | 'cover'
}

function constrainCrop(w: number, h: number, aspect: 'square' | 'cover', maxSide: number) {
  if (aspect === 'cover') {
    const ratio = 21 / 9
    let nw = w
    let nh = w / ratio
    if (nh > h) { nh = h; nw = h * ratio }
    const size = Math.max(50, Math.min(Math.min(nw, nh), maxSide))
    return { w: size, h: size / ratio }
  }
  const size = Math.max(50, Math.min(Math.min(w, h), maxSide))
  return { w: size, h: size }
}

const FILTERS: Record<string, string> = {
  Original: 'none',
  Warm: 'sepia(.28) saturate(1.35) contrast(1.02)',
  Cool: 'saturate(1.12) hue-rotate(14deg)',
  Vivid: 'saturate(1.5) contrast(1.1)',
  Mono: 'grayscale(1) contrast(1.06)',
  Sepia: 'sepia(.72) saturate(1.25)',
  Fade: 'contrast(.92) brightness(1.08) saturate(.85)',
}

export default function MediaEditor({ file, type, onComplete, onCancel }: MediaEditorProps) {
  if (type === 'image') return <ImageCropper file={file} type={type} onComplete={onComplete} onCancel={onCancel} />
  if (type === 'audio') return <AudioTrimmer file={file} type={type} onComplete={onComplete} onCancel={onCancel} />
  return <VideoTrimmer file={file} type={type} onComplete={onComplete} onCancel={onCancel} />
}

export { ImageCropper, VideoTrimmer, AudioTrimmer }

function ImageCropper({ file, onComplete, onCancel, aspect = 'square' }: MediaEditorProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imgSrc, setImgSrc] = useState('')
  const [zoom, setZoom] = useState(1)
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 300, h: 300 })
  const [dragging, setDragging] = useState<'tl' | 'tr' | 'bl' | 'br' | 'move' | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
  const [filter, setFilter] = useState('Original')

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImgSrc(url)
    const img = new Image()
    img.onload = () => {
      const maxLen = Math.min(window.innerWidth, 520) - 40
      const s = Math.min(img.width, img.height, maxLen)
      const { w: cw, h: ch } = constrainCrop(s, s, aspect, maxLen)
      setCrop({ x: (img.width - cw) / 2, y: (img.height - ch) / 2, w: cw, h: ch })
      setNaturalSize({ w: img.width, h: img.height })
    }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file, aspect])

  const handleMouseDown = (e: React.MouseEvent, handle: 'tl' | 'tr' | 'bl' | 'br' | 'move') => {
    e.preventDefault()
    setDragging(handle)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !naturalSize.w) return
    const dx = (e.clientX - dragStart.x) / zoom
    const dy = (e.clientY - dragStart.y) / zoom
    const maxSide = Math.min(window.innerWidth - 40, window.innerHeight - 200, 520)
    setCrop(prev => {
      let { x, y, w, h } = prev
      if (dragging === 'move') { x += dx; y += dy }
      else if (dragging === 'br') { w += dx; h += dy }
      else if (dragging === 'bl') { x += dx; w -= dx; h += dy }
      else if (dragging === 'tr') { y += dy; w += dx; h -= dy }
      else if (dragging === 'tl') { x += dx; y += dy; w -= dx; h -= dy }
      const { w: nw, h: nh } = constrainCrop(w, h, aspect, maxSide)
      x = Math.max(0, Math.min(x, naturalSize.w - nw))
      y = Math.max(0, Math.min(y, naturalSize.h - nh))
      return { x, y, w: nw, h: nh }
    })
    setDragStart({ x: e.clientX, y: e.clientY })
  }, [dragging, zoom, dragStart, naturalSize, aspect])

  useEffect(() => {
    if (!dragging) return
    const up = () => setDragging(null)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', up) }
  }, [dragging, handleMouseMove])

  const handleApply = () => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return
    const outW = aspect === 'cover' ? 1280 : 800
    const outH = aspect === 'cover' ? 548 : 800
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.filter = FILTERS[filter] || 'none'
    const size = Math.min(crop.w, crop.h)
    const drawW = aspect === 'cover' ? crop.w : size
    const drawH = aspect === 'cover' ? crop.h : size
    ctx.drawImage(img, crop.x, crop.y, drawW, drawH, 0, 0, outW, outH)
    canvas.toBlob(blob => {
      if (!blob) return
      const croppedFile = new File([blob], file.name.replace(/\.[^.]+$/, '_cropped.jpg'), { type: 'image/jpeg', lastModified: Date.now() })
      onComplete(croppedFile, { x: crop.x, y: crop.y, w: drawW, h: drawH, filter, aspect })
    }, 'image/jpeg', 0.92)
  }

  const displayW = naturalSize.w || 400
  const displayH = naturalSize.h || 400
  const maxEditor = Math.min(window.innerWidth - 40, window.innerHeight - 200, 520)
  const scale = Math.min(maxEditor / displayW, maxEditor / displayH, 1)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center modal-center-scroll" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="rounded-2xl p-4 max-w-[90vw] max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)' }}>
        <div className="flex justify-between items-center mb-3">
          <strong className="text-sm" style={{ color: 'var(--ink)' }}>{aspect === 'cover' ? 'Cover image' : 'Edit image'}</strong>
          <button onClick={onCancel} className="border-0 bg-none cursor-pointer text-lg" style={{ color: 'var(--muted)' }}>×</button>
        </div>
        <div ref={containerRef} className="relative mx-auto overflow-hidden rounded-xl" style={{ width: Math.min(displayW * scale, maxEditor), height: Math.min(displayH * scale, maxEditor), background: '#222' }}>
          <img ref={imgRef} src={imgSrc} alt="" className="max-w-none" style={{ width: displayW * scale, height: displayH * scale, transform: `scale(${zoom})`, transformOrigin: 'top left', filter: FILTERS[filter] || 'none' }} />
          <div className="absolute inset-0" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}>
            <div style={{
              position: 'absolute', left: crop.x * scale, top: crop.y * scale,
              width: crop.w * scale, height: crop.h * scale,
              boxShadow: '0 0 0 1px rgba(255,255,255,0.7)',
              cursor: 'move',
            }} onMouseDown={e => handleMouseDown(e, 'move')}>
              {['tl', 'tr', 'bl', 'br'].map(h => (
                <div key={h} onMouseDown={e => handleMouseDown(e, h as any)}
                  className="absolute w-[12px] h-[12px] rounded-sm cursor-nw-resize"
                  style={{ background: 'white', [h.includes('t') ? 'top' : 'bottom']: -6, [h.includes('l') ? 'left' : 'right']: -6 }} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
            {Object.keys(FILTERS).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-2.5 h-[30px] rounded-[9px] text-[10px] font-semibold border whitespace-nowrap cursor-pointer transition-all"
                style={{
                  borderColor: filter === f ? 'var(--gold)' : 'var(--line)',
                  background: filter === f ? 'color-mix(in oklab, var(--gold) 15%, var(--surface))' : 'none',
                  color: filter === f ? 'var(--gold)' : 'var(--muted)',
                }}>{f}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>Zoom</span>
            <input type="range" min="1" max="3" step="0.1" value={zoom} onChange={e => setZoom(Number(e.target.value))} className="w-[100px]" />
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{naturalSize.w ? Math.round((crop.w / naturalSize.w) * 100) : 0}%</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-4 h-[34px] rounded-[10px] text-xs border cursor-pointer" style={{ borderColor: 'var(--line)', background: 'none', color: 'var(--ink)' }}>Cancel</button>
            <button onClick={handleApply} className="px-4 h-[34px] rounded-[10px] text-xs font-bold border-0 cursor-pointer" style={{ background: 'var(--gold)', color: 'var(--night)' }}>Apply</button>
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  )
}

function formatTime(s: number) {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function pickMime(preferred: string[]) {
  return preferred.find(t => MediaRecorder.isTypeSupported(t)) || ''
}

async function recordSegment(
  el: HTMLMediaElement,
  startTime: number,
  endTime: number,
  mime: string,
  originalName: string,
  kind: 'video' | 'audio',
  fallback: (start: number, end: number) => File
): Promise<{ file: File; mime: string }> {
  const supportsCapture = typeof (el as any).captureStream === 'function'
  if (!supportsCapture) return { file: fallback(startTime, endTime), mime: '' }

  const stream = (el as any).captureStream(30) as MediaStream
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 5_000_000 } : undefined)
  const chunks: Blob[] = []
  rec.ondataavailable = (e: BlobEvent) => { if (e.data.size) chunks.push(e.data) }

  const done = new Promise<void>((resolve) => {
    rec.onstop = () => resolve()
    rec.onerror = () => resolve()
  })

  const playback = new Promise<void>((resolve) => {
    const check = () => {
      if (el.currentTime >= endTime || el.ended) { resolve(); return }
      requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
  })

  el.currentTime = startTime
  let started = false
  try {
    await el.play()
    rec.start(100)
    started = true
    await playback
  } catch {
    el.pause()
  }
  if (started && rec.state !== 'inactive') rec.stop()
  if (started) await done
  el.pause()

  const type = rec.mimeType || mime || (kind === 'video' ? 'video/webm' : 'audio/webm')
  const ext = type.includes('mp4') ? (kind === 'video' ? 'mp4' : 'm4a') : 'webm'
  const blob = new Blob(chunks, { type })
  if (blob.size === 0) return { file: fallback(startTime, endTime), mime: '' }
  const trimmedFile = new File([blob], originalName.replace(/\.[^.]+$/, `_trimmed.${ext}`), { type, lastModified: Date.now() })
  return { file: trimmedFile, mime: type }
}

function VideoTrimmer({ file, onComplete, onCancel }: MediaEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(30)
  const [duration, setDuration] = useState(0)
  const [previewUrl, setPreviewUrl] = useState('')
  const [trimming, setTrimming] = useState(false)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handleMetadata = () => {
    if (!videoRef.current) return
    const dur = videoRef.current.duration
    setDuration(dur)
    setEndTime(Math.min(30, dur))
  }

  const fallback = () => file

  const handleApply = async () => {
    const video = videoRef.current
    if (!video) return
    if (trimming) return
    setTrimming(true)
    const mime = pickMime(['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm'])
    const { file: trimmedFile, mime: usedMime } = await recordSegment(video, startTime, endTime, mime, file.name, 'video', fallback)
    setTrimming(false)
    onComplete(trimmedFile, { start: startTime, end: endTime, trimmed: !!usedMime, mime: usedMime })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center modal-center-scroll" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="rounded-2xl p-4 max-w-[90vw] max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)' }}>
        <div className="flex justify-between items-center mb-3">
          <strong className="text-sm" style={{ color: 'var(--ink)' }}>Trim video</strong>
          <button onClick={onCancel} className="border-0 bg-none cursor-pointer text-lg" style={{ color: 'var(--muted)' }}>×</button>
        </div>
        <video ref={videoRef} src={previewUrl} controls className="w-full max-h-[300px] rounded-xl mb-3" onLoadedMetadata={handleMetadata} />
        <div className="px-2">
          <div className="relative h-2 rounded-full mb-2" style={{ background: 'var(--raised)' }}>
            <div className="absolute h-full rounded-full" style={{ left: `${(startTime / (duration || 1)) * 100}%`, right: `${100 - (endTime / (duration || 1)) * 100}%`, background: 'var(--gold)' }} />
            <input type="range" min={0} max={duration || 1} step={0.1} value={startTime} onChange={e => setStartTime(Math.min(Number(e.target.value), endTime - 0.1))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer" aria-label="Start time" />
            <input type="range" min={0} max={duration || 1} step={0.1} value={endTime} onChange={e => setEndTime(Math.max(Number(e.target.value), startTime + 0.1))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer" aria-label="End time" />
          </div>
          <div className="flex justify-between text-[10px]" style={{ color: 'var(--muted)' }}>
            <span>{formatTime(startTime)}</span>
            <span>{formatTime(endTime)} ({formatTime(endTime - startTime)} selected)</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onCancel} className="px-4 h-[34px] rounded-[10px] text-xs border cursor-pointer" style={{ borderColor: 'var(--line)', background: 'none', color: 'var(--ink)' }}>Cancel</button>
          <button onClick={handleApply} disabled={trimming} className="px-4 h-[34px] rounded-[10px] text-xs font-bold border-0 cursor-pointer flex items-center gap-2" style={{ background: 'var(--gold)', color: 'var(--night)', opacity: trimming ? 0.6 : 1 }}>
            {trimming && <span className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--night)', borderTopColor: 'transparent' }} />}
            {trimming ? 'Trimming...' : 'Use this segment'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AudioTrimmer({ file, onComplete, onCancel }: MediaEditorProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(30)
  const [duration, setDuration] = useState(0)
  const [previewUrl, setPreviewUrl] = useState('')
  const [trimming, setTrimming] = useState(false)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handleMetadata = () => {
    if (!audioRef.current) return
    const dur = audioRef.current.duration
    setDuration(dur)
    setEndTime(Math.min(30, dur))
  }

  const handleApply = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (trimming) return
    setTrimming(true)
    const mime = pickMime(['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'])
    const fallback = () => file
    const { file: trimmedFile, mime: usedMime } = await recordSegment(audio, startTime, endTime, mime, file.name, 'audio', fallback)
    setTrimming(false)
    onComplete(trimmedFile, { start: startTime, end: endTime, trimmed: !!usedMime, mime: usedMime })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center modal-center-scroll" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="rounded-2xl p-4 max-w-[90vw] max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)' }}>
        <div className="flex justify-between items-center mb-3">
          <strong className="text-sm" style={{ color: 'var(--ink)' }}>Trim audio</strong>
          <button onClick={onCancel} className="border-0 bg-none cursor-pointer text-lg" style={{ color: 'var(--muted)' }}>×</button>
        </div>
        <div className="rounded-xl mb-3 flex items-center gap-3 px-4 py-5" style={{ background: 'var(--raised)' }}>
          <span className="w-11 h-11 rounded-full grid place-items-center flex-none" style={{ background: 'color-mix(in oklab, var(--gold) 18%, var(--surface))' }}>
            <span className="block w-5 h-5 rounded-[50%]" style={{ border: '2.5px solid var(--gold)', borderLeftColor: 'transparent', transform: 'rotate(-20deg)' }} />
          </span>
          <div className="min-w-0 flex-1">
            <b className="block text-xs truncate" style={{ color: 'var(--ink)' }}>{file.name}</b>
            <small className="block text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>{duration ? formatTime(duration) : 'Loading...'}</small>
          </div>
          <audio ref={audioRef} src={previewUrl} controls className="hidden" onLoadedMetadata={handleMetadata} />
          <button onClick={() => { if (audioRef.current?.paused) audioRef.current?.play(); else audioRef.current?.pause() }}
            className="w-11 h-11 rounded-full grid place-items-center border-0 cursor-pointer flex-none" style={{ background: 'var(--gold)', color: 'var(--night)' }}>
            <span className="block w-0 h-0 ml-0.5" style={{ borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: '9px solid var(--night)' }} />
          </button>
        </div>
        <div className="px-2">
          <div className="relative h-2 rounded-full mb-2" style={{ background: 'var(--raised)' }}>
            <div className="absolute h-full rounded-full" style={{ left: `${(startTime / (duration || 1)) * 100}%`, right: `${100 - (endTime / (duration || 1)) * 100}%`, background: 'var(--gold)' }} />
            <input type="range" min={0} max={duration || 1} step={0.1} value={startTime} onChange={e => setStartTime(Math.min(Number(e.target.value), endTime - 0.1))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer" aria-label="Start time" />
            <input type="range" min={0} max={duration || 1} step={0.1} value={endTime} onChange={e => setEndTime(Math.max(Number(e.target.value), startTime + 0.1))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer" aria-label="End time" />
          </div>
          <div className="flex justify-between text-[10px]" style={{ color: 'var(--muted)' }}>
            <span>{formatTime(startTime)}</span>
            <span>{formatTime(endTime)} ({formatTime(endTime - startTime)} selected)</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onCancel} className="px-4 h-[34px] rounded-[10px] text-xs border cursor-pointer" style={{ borderColor: 'var(--line)', background: 'none', color: 'var(--ink)' }}>Cancel</button>
          <button onClick={handleApply} disabled={trimming} className="px-4 h-[34px] rounded-[10px] text-xs font-bold border-0 cursor-pointer flex items-center gap-2" style={{ background: 'var(--gold)', color: 'var(--night)', opacity: trimming ? 0.6 : 1 }}>
            {trimming && <span className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--night)', borderTopColor: 'transparent' }} />}
            {trimming ? 'Trimming...' : 'Use this segment'}
          </button>
        </div>
      </div>
    </div>
  )
}
