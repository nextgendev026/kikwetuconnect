'use client'
import dynamic from 'next/dynamic'

// Lazy-load the messages bundle (chat threads, media, Virtuoso list) so the
// shell's initial JS stays lean and the thread UI only loads when needed.
const MessagesClient = dynamic(() => import('./messages-client').then(m => m.default), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
      Loading messages…
    </div>
  ),
})

export default function MessagesPage() {
  return <MessagesClient />
}
