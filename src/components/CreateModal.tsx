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
    const postType = type === 'question' ? 'inquiry' : 'baraza'
    const { error } = await supabase.from('posts').insert({
      user_id: user.id, post_type: postType, content: text, title: text.split('\n')[0].slice(0, 100),
    })
    if (error) { toast('Failed to publish'); return }
    setOpen(false); setText(''); toast('Published. Your circle can see it now.')
  }

  return (
    <div className={`modal-wrap${open ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
      <div className="modal">
        <div className="modal-head">
          <div>
            <h2>Put something useful into the circle.</h2>
            <p>Choose a format, add context, then share it.</p>
          </div>
          <button className="close" onClick={() => setOpen(false)}>×</button>
        </div>
        <div className="chips">
          {TYPES.map(t => (
            <button key={t.id} className="chip" style={{ borderColor: type === t.id ? 'var(--gold)' : undefined, background: type === t.id ? 'var(--gold-soft)' : undefined, color: type === t.id ? 'var(--ink)' : undefined }}
              onClick={() => setType(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="field">
          <label>{LABELS[type] || 'What is on your mind?'}</label>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Share a useful thought, update, or local insight..." />
        </div>
        <div className="field">
          <label>Topic</label>
          <select>
            <option>Biashara & Hustles</option>
            <option>Tech & Startups</option>
            <option>Agriculture & Farming</option>
            <option>Education</option>
          </select>
        </div>
        <div className="modal-foot">
          <button className="btn secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn primary" onClick={handlePublish}>Publish</button>
        </div>
      </div>
    </div>
  )
}
