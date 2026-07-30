'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

interface MediaEditorProps {
  file: File
  type: 'image' | 'video'
  onComplete: (editedFile: File, cropData?: any) => void
  onCancel: () => void
}

export default function MediaEditor({ file, type, onComplete, onCancel }: MediaEditorProps) {
  if (type === 'image') return <ImageCropper file={file} type={type} onComplete={onComplete} onCancel={onCancel} />
  return <VideoTrimmer file={file} type={type} onComplete={onComplete} onCancel={onCancel} />
}

function ImageCropper({ file, onComplete, onCancel }: MediaEditorProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imgSrc, setImgSrc] = useState('')
  const [zoom, setZoom] = useState(1)
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 300, h: 300 })
  const [dragging, setDragging] = useState<'tl' | 'tr' | 'bl' | 'br' | 'move' | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImgSrc(url)
    const img = new Image()
    img.onload = () => {
      const s = Math.min(img.width, img.height, 500)
      setCrop({ x: (img.width - s) / 2, y: (img.height - s) / 2, w: s, h: s })
      setNaturalSize({ w: img.width, h: img.height })
    }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handleMouseDown = (e: React.MouseEvent, handle: 'tl' | 'tr' | 'bl' | 'br' | 'move') => {
    e.preventDefault()
    setDragging(handle)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !naturalSize.w) return
    const dx = (e.clientX - dragStart.x) / zoom
    const dy = (e.clientY - dragStart.y) / zoom
    setCrop(prev => {
      let { x, y, w, h } = prev
      if (dragging === 'move') { x += dx; y += dy }
      else if (dragging === 'br') { w += dx; h += dy }
      else if (dragging === 'bl') { x += dx; w -= dx; h += dy }
      else if (dragging === 'tr') { y += dy; w += dx; h -= dy }
      else if (dragging === 'tl') { x += dx; y += dy; w -= dx; h -= dy }
      const size = Math.max(50, Math.min(Math.min(w, h), naturalSize.w))
      x = Math.max(0, Math.min(x, naturalSize.w - size))
      y = Math.max(0, Math.min(y, naturalSize.h - size))
      return { x, y, w: size, h: size }
    })
    setDragStart({ x: e.clientX, y: e.clientY })
  }, [dragging, zoom, dragStart, naturalSize])

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
    const size = Math.min(crop.w, crop.h)
    canvas.width = 800
    canvas.height = 800
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, crop.x, crop.y, size, size, 0, 0, 800, 800)
    canvas.toBlob(blob => {
      if (!blob) return
      const croppedFile = new File([blob], file.name.replace(/\.[^.]+$/, '_cropped.jpg'), { type: 'image/jpeg', lastModified: Date.now() })
      onComplete(croppedFile, { x: crop.x, y: crop.y, w: size, h: size })
    }, 'image/jpeg', 0.92)
  }

  const displayW = naturalSize.w || 400
  const displayH = naturalSize.h || 400
  const scale = Math.min(400 / displayW, 400 / displayH, 1)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="rounded-2xl p-4 max-w-[90vw] max-h-[90vh]" style={{ background: 'var(--surface)' }}>
        <div className="flex justify-between items-center mb-3">
          <strong className="text-sm" style={{ color: 'var(--ink)' }}>Crop image</strong>
          <button onClick={onCancel} className="border-0 bg-none cursor-pointer text-lg" style={{ color: 'var(--muted)' }}>×</button>
        </div>
        <div ref={containerRef} className="relative mx-auto overflow-hidden rounded-xl" style={{ width: Math.min(displayW * scale, 400), height: Math.min(displayH * scale, 400), background: '#222' }}>
          <img ref={imgRef} src={imgSrc} alt="" className="max-w-none" style={{ width: displayW * scale, height: displayH * scale, transform: `scale(${zoom})`, transformOrigin: 'top left' }} />
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
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>Zoom</span>
            <input type="range" min="1" max="3" step="0.1" value={zoom} onChange={e => setZoom(Number(e.target.value))} className="w-[100px]" />
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{((crop.w / naturalSize.w) * 100).toFixed(0)}%</span>
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

function VideoTrimmer({ file, onComplete, onCancel }: MediaEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(30)
  const [duration, setDuration] = useState(0)
  const [previewUrl, setPreviewUrl] = useState('')

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

  const handleApply = () => {
    onComplete(file, { start: startTime, end: endTime })
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="rounded-2xl p-4 max-w-[90vw] max-h-[90vh]" style={{ background: 'var(--surface)' }}>
        <div className="flex justify-between items-center mb-3">
          <strong className="text-sm" style={{ color: 'var(--ink)' }}>Trim video</strong>
          <button onClick={onCancel} className="border-0 bg-none cursor-pointer text-lg" style={{ color: 'var(--muted)' }}>×</button>
        </div>
        <video ref={videoRef} src={previewUrl} controls className="w-full max-h-[300px] rounded-xl mb-3" onLoadedMetadata={handleMetadata} />
        <div className="px-2">
          <div className="relative h-2 rounded-full mb-2" style={{ background: 'var(--raised)' }}>
            <div className="absolute h-full rounded-full" style={{ left: `${(startTime / (duration || 1)) * 100}%`, right: `${100 - (endTime / (duration || 1)) * 100}%`, background: 'var(--gold)' }} />
            <input type="range" min={0} max={duration || 1} step={0.1} value={startTime} onChange={e => setStartTime(Math.min(Number(e.target.value), endTime - 1))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer" />
            <input type="range" min={0} max={duration || 1} step={0.1} value={endTime} onChange={e => setEndTime(Math.max(Number(e.target.value), startTime + 1))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer" />
          </div>
          <div className="flex justify-between text-[10px]" style={{ color: 'var(--muted)' }}>
            <span>{formatTime(startTime)}</span>
            <span>{formatTime(endTime)} ({formatTime(endTime - startTime)} selected)</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onCancel} className="px-4 h-[34px] rounded-[10px] text-xs border cursor-pointer" style={{ borderColor: 'var(--line)', background: 'none', color: 'var(--ink)' }}>Cancel</button>
          <button onClick={handleApply} className="px-4 h-[34px] rounded-[10px] text-xs font-bold border-0 cursor-pointer" style={{ background: 'var(--gold)', color: 'var(--night)' }}>Use this segment</button>
        </div>
      </div>
    </div>
  )
}
