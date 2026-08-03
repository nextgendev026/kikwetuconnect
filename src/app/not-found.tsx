import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center" style={{ background: 'var(--bg)' }}>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted mb-3">404</p>
      <h1 className="text-2xl font-extrabold text-cream mb-2" style={{ fontFamily: "'Plus Jakarta Sans'" }}>
        Page not found
      </h1>
      <p className="text-sm text-muted mb-6">This post or page doesn&apos;t exist or has been removed.</p>
      <Link href="/feed" className="btn btn-primary">
        Back to feed
      </Link>
    </div>
  )
}
