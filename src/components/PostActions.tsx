'use client'
import { useState } from 'react'
import { toast } from '@/app/providers'
import { MoreHorizontal, Edit3, EyeOff, Eye, Trash2, X } from 'lucide-react'

interface PostActionsProps {
  postId: string
  currentUserId: string
  authorId: string
  isHidden?: boolean
  onUpdate?: (updates: { title?: string; content?: string; is_hidden?: boolean; deleted?: boolean }) => void
}

export default function PostActions({ postId, currentUserId, authorId, isHidden, onUpdate }: PostActionsProps) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (currentUserId !== authorId) return null

  const handleEditSave = async () => {
    if (!editContent.trim()) { toast('Content required'); return }
    setSaving(true)
    const res = await fetch(`/api/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle || null, content: editContent }),
    })
    if (!res.ok) { toast('Failed to save'); setSaving(false); return }
    toast('Post updated')
    setEditing(false); setSaving(false); setOpen(false)
    onUpdate?.({ title: editTitle, content: editContent })
  }

  const handleDelete = async () => {
    setDeleting(true)
    const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
    if (!res.ok) { toast('Failed to delete'); setDeleting(false); return }
    toast('Post deleted')
    setConfirmDelete(false); setDeleting(false); setOpen(false)
    onUpdate?.({ deleted: true })
  }

  const handleHide = async () => {
    const res = await fetch(`/api/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_hidden: !isHidden }),
    })
    if (!res.ok) { toast('Failed to update'); return }
    toast(isHidden ? 'Post unhidden' : 'Post hidden')
    setOpen(false)
    onUpdate?.({ is_hidden: !isHidden })
  }

  const menuStyle: React.CSSProperties = {
    position: 'absolute', right: 0, top: '100%', zIndex: 20, minWidth: 160,
    background: 'var(--surface)', border: '1px solid var(--line)',
    borderRadius: 12, padding: 4, boxShadow: 'var(--card-shadow-elevated)',
  }
  const itemStyle = (danger = false): React.CSSProperties => ({
    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
    background: 'none', color: danger ? 'var(--red)' : 'var(--ink)',
    border: 0, cursor: 'pointer', transition: 'background .15s',
  })
  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 30,
    background: 'color-mix(in oklab, var(--night) 60%, transparent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  }
  const modalStyle: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--line)',
    borderRadius: 18, padding: 24, width: 'min(480px, 100%)',
    boxShadow: 'var(--card-shadow-elevated)',
  }

  return (
    <>
      <div style={{ position: 'relative' }}>
        <button onClick={() => setOpen(p => !p)}
          style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)', padding: 4, borderRadius: 6, display: 'grid', placeItems: 'center' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--raised)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {open && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} />
            <div style={menuStyle}>
              <button style={itemStyle()} onClick={() => { setEditTitle(''); setEditContent(''); setEditing(true); setOpen(false) }}>
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
              <button style={itemStyle()} onClick={handleHide}>
                {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {isHidden ? 'Unhide' : 'Hide'}
              </button>
              <button style={itemStyle(true)} onClick={() => { setConfirmDelete(true); setOpen(false) }}>
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </>
        )}
      </div>

      {editing && (
        <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) setEditing(false) }}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)', margin: 0 }}>Edit post</h2>
              <button onClick={() => setEditing(false)} style={{ background: 'var(--raised)', border: 0, borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Title (optional)</label>
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Post title..."
                  style={{ width: '100%', padding: '10px 14px', background: 'var(--raised)', border: '1.5px solid var(--line)', borderRadius: 11, fontSize: 13, color: 'var(--ink)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Content</label>
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} placeholder="Write your post..."
                  style={{ width: '100%', minHeight: 120, padding: '10px 14px', background: 'var(--raised)', border: '1.5px solid var(--line)', borderRadius: 11, fontSize: 13, color: 'var(--ink)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
              <button onClick={() => setEditing(false)} style={{ minHeight: 38, padding: '0 16px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: 'var(--raised)', color: 'var(--muted)', border: '1px solid var(--line)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleEditSave} disabled={saving}
                style={{ minHeight: 38, padding: '0 16px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: 'var(--gold)', color: 'var(--night)', border: 0, cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(false) }}>
          <div style={modalStyle}>
            <h2 style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)', margin: '0 0 8px' }}>Delete post?</h2>
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>This action cannot be undone. The post and all its data will be permanently removed.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ minHeight: 38, padding: '0 16px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: 'var(--raised)', color: 'var(--muted)', border: '1px solid var(--line)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ minHeight: 38, padding: '0 16px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: 'var(--red)', color: '#fff', border: 0, cursor: 'pointer' }}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
