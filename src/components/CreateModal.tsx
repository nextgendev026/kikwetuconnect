'use client'
import { useEffect, useState } from 'react'
import { useSupabase, useUser, toast } from '@/app/providers'

const TYPES = [
  { id: 'post', label: 'Post', icon: '✍️' },
  { id: 'question', label: 'Question', icon: '❓' },
  { id: 'poll', label: 'Poll', icon: '📊' },
  { id: 'listing', label: 'Mtaa listing', icon: '🛍️' },
  { id: 'alert', label: 'Safety update', icon: '🛡️' },
]

const LABELS: Record<string, string> = {
  post: 'What is on your mind?',
  question: 'What do you want to learn?',
  poll: 'What should the community weigh in on?',
  listing: 'What are you offering?',
  alert: 'What useful update should neighbours know?',
}

export default function CreateModal() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('post')
  const [text, setText] = useState('')
  const supabase = useSupabase()
  const { user } = useUser()

  useEffect(() => {
    const handler = () => setOpen(true)
    document.addEventListener('open-create-modal', handler)
    return () => document.removeEventListener('open-create-modal', handler)
  }, [])

  const handlePublish = async () => {
    if (!text.trim()) { toast('Add a little context first'); return }
    if (!user) { toast('Please sign in first'); return }

    const postType = type === 'question' ? 'inquiry' : type === 'listing' || type === 'alert' ? 'baraza' : 'baraza'

    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      post_type: postType,
      content: text,
      title: text.split('\n')[0].slice(0, 100),
    })

    if (error) { toast('Failed to publish'); return }
    setOpen(false)
    setText('')
    toast('Published. Your circle can see it now.')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-[oklch(5%_.02_151_/.78)] z-20 flex items-end md:items-center md:justify-center" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
      <div className="bg-night2 w-full md:w-[min(560px,100%)] border border-[oklch(30%_.025_151)] rounded-[23px_23px_0_0] md:rounded-[23px] p-[20px_16px_28px] animate-sheet">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-[20px] tracking-[-.05em] m-0" style={{ fontFamily: "'Plus Jakarta Sans'" }}>Put something useful into the circle.</h2>
            <p className="text-muted text-[11px] my-[6px_17px]">Choose a format, add context, then share it.</p>
          </div>
          <button onClick={() => setOpen(false)} className="bg-none text-muted text-[24px]">×</button>
        </div>
        <div className="flex gap-[7px] flex-wrap mb-[15px]">
          {TYPES.map(t => (
            <button key={t.id} onClick={() => setType(t.id)}
              className="rounded-[99px] py-[7px] px-[10px] text-[10px]"
              style={{ border: `1px solid ${type === t.id ? 'var(--gold)' : 'oklch(32% .025 151)'}`, background: type === t.id ? 'oklch(29% .045 84)' : 'var(--deep)', color: type === t.id ? 'var(--gold)' : 'var(--muted)' }}
            >{t.icon} {t.label}</button>
          ))}
        </div>
        <div className="grid gap-[7px] my-[15px]">
          <label className="text-muted text-[10px]">{LABELS[type] || 'What is on your mind?'}</label>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Share a useful thought, update, or local insight..." className="w-full bg-deep text-cream border border-[oklch(32%_.025_151)] rounded-[11px] p-[12px] min-h-[96px] resize-vertical" />
        </div>
        <div className="grid grid-cols-2 gap-[8px] mt-[18px]">
          <button onClick={() => setOpen(false)} className="btn min-h-[46px] rounded-[12px] px-[17px] font-bold text-[13px] bg-transparent text-cream border border-[oklch(30%_.025_151)]">Cancel</button>
          <button onClick={handlePublish} className="btn min-h-[46px] rounded-[12px] px-[17px] font-bold text-[13px] bg-gold text-night">Publish</button>
        </div>
      </div>
    </div>
  )
}
