'use client'
import { useState, useRef, useEffect } from 'react'

interface MediaEditorProps {
  file: File
  type: 'image' | 'video' | 'audio'
  onComplete: (editedFile: File, cropData?: any) => void
  onCancel: () => void
  aspect?: 'square' | 'cover'
  maxDuration?: number
}

export default function MediaEditor({ file, type, onComplete, onCancel, maxDuration = 30 }: MediaEditorProps) {
  if (type === 'image') return <ImageUploader file={file} type={type} onComplete={onComplete} onCancel={onCancel} />
  if (type === 'audio') return <AudioTrimmer file={file} type={type} onComplete={onComplete} onCancel={onCancel} />
  return <VideoTrimmer file={file} type={type} maxDuration={maxDuration} onComplete={onComplete} onCancel={onCancel} />
}

export { ImageUploader, VideoTrimmer, AudioTrimmer }

function ImageUploader({ file, onComplete, onCancel }: MediaEditorProps) {
  const [preview, setPreview] = useState('');
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center modal-center-scroll" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="rounded-2xl p-5 max-w-[95vw] max-h-[95vh] overflow-y-auto" style={{ background: 'var(--surface)', maxWidth: '500px' }}>
        <div className="flex justify-between items-center mb-4">
          <strong className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Confirm Photo</strong>
          <button onClick={onCancel} className="border-0 bg-none cursor-pointer text-2xl leading-none" style={{ color: 'var(--muted)' }}>×</button>
        </div>
        <img src={preview} alt="preview" className="max-w-full max-h-80 mb-4 rounded" />
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-5 h-[38px] rounded-[10px] text-sm border cursor-pointer" style={{ borderColor: 'var(--line)', background: 'none', color: 'var(--ink)' }}>Cancel</button>
          <button onClick={() => onComplete(file)} className="px-5 h-[38px] rounded-[10px] text-sm font-bold border-0 cursor-pointer" style={{ background: 'var(--gold)', color: 'var(--night)' }}>Use Photo</button>
        </div>
      </div>
    </div>
  );
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

function VideoTrimmer({ file, onComplete, onCancel, maxDuration = 30 }: MediaEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(maxDuration)
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
    setEndTime(Math.min(maxDuration, dur))
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
            <input type="range" min={0} max={Math.min(duration || 1, maxDuration) || 1} step={0.1} value={startTime} onChange={e => setStartTime(Math.min(Number(e.target.value), endTime - 0.1))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer" aria-label="Start time" />
            <input type="range" min={0} max={Math.min(duration || 1, maxDuration) || 1} step={0.1} value={endTime} onChange={e => setEndTime(Math.max(Number(e.target.value), startTime + 0.1))}
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
