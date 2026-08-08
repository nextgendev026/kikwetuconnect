'use client'
import dynamic from 'next/dynamic'

// Lazy-load the market client bundle so the heavy listing/order/checkout
// UI is split into its own chunk instead of bloating the shell's initial JS.
const MarketClient = dynamic(() => import('./market-client').then(m => m.default), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
      Loading market…
    </div>
  ),
})

export default function MarketPage() {
  return <MarketClient />
}
