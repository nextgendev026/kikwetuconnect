import AdminPageClient from './client'

export default async function AdminSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const VALID = ['activity', 'analytics', 'health', 'verification', 'users', 'spaces', 'marketplace', 'safety', 'payments', 'settings', 'audit']
  if (!VALID.includes(slug)) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Page not found</div>
  return <AdminPageClient slug={slug} />
}
