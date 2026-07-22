import { SidebarNav, TopBar, BottomNav } from '@/components/navigation'
import { HeshimaMeter, StatCard } from '@/components/ui/avatar'
import { Button } from '@/components/ui/form'
import { Plus, Globe } from 'lucide-react'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="app">
      {/* Left Sidebar - Desktop */}
      <aside className="left">
        <div className="brand">
          <svg
            viewBox="0 0 27 27"
            fill="none"
            className="w-7 h-7"
          >
            <path
              d="M13.5 1.5 3 7.5v11l10.5 6L24 18.5v-11l-10.5-6Z"
              fill="oklch(72% 0.16 155)"
              fillOpacity=".12"
              stroke="oklch(72% 0.16 155)"
              strokeWidth="1.2"
            />
            <path
              d="m8 13 3.5 3.5L18.5 10"
              stroke="oklch(72% 0.16 155)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="brand-name">
            Kikwetu<b>Connect</b>
          </span>
        </div>
        <SidebarNav />
        <div className="heshima">
          <div className="label">Heshima Rating</div>
          <div className="rating flex items-center gap-3">
            <HeshimaMeter rating={762} size="sm" showRank={false} />
            <div>
              <div className="score text-2xl font-bold text-green">762</div>
              <div className="rank text-xs text-faint">Top 8% · Jury Unlocked</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Center Content */}
      <main className="center">
        <TopBar />
        {children}
      </main>

      {/* Right Sidebar - Desktop */}
      <aside className="right">
        <RightSidebar />
      </aside>

      {/* Bottom Nav - Mobile */}
      <BottomNav />
    </div>
  )
}

function RightSidebar() {
  return (
    <>
      <section className="rp-section">
        <h2 className="rp-title">Trending Hubs</h2>
        <div className="rp-item">
          <div className="rp-icon bg-green-bg text-green">📍</div>
          <div className="rp-info">
            <div className="rp-name">Uasin Gishu</div>
            <div className="rp-sub">Agriculture innovation in the breadbasket</div>
          </div>
          <div className="rp-arrow">›</div>
        </div>
        <div className="rp-item">
          <div className="rp-icon bg-gold-bg text-gold">🏙️</div>
          <div className="rp-info">
            <div className="rp-name">Nairobi Business</div>
            <div className="rp-sub">Startup ecosystem, fintech, corporate</div>
          </div>
          <div className="rp-arrow">›</div>
        </div>
        <div className="rp-item">
          <div className="rp-icon bg-blue-bg text-blue">🌊</div>
          <div className="rp-info">
            <div className="rp-name">Mombasa Coast</div>
            <div className="rp-sub">Tourism, blue economy, port trade</div>
          </div>
          <div className="rp-arrow">›</div>
        </div>
        <div className="rp-item">
          <div className="rp-icon bg-brown-bg text-brown">🐟</div>
          <div className="rp-info">
            <div className="rp-name">Kisumu Lakeside</div>
            <div className="rp-sub">Fishing, trade, county development</div>
          </div>
          <div className="rp-arrow">›</div>
        </div>
      </section>

      <section className="rp-section">
        <h2 className="rp-title">Top Experts</h2>
        <div className="expert">
          <div className="eavatar bg-green-bg text-green">AK</div>
          <div className="einfo">
            <div className="ename">Amina K.</div>
            <div className="efield">Fintech · Nairobi</div>
          </div>
          <span className="escore">706</span>
        </div>
        <div className="expert">
          <div className="eavatar bg-gold-bg text-gold">DO</div>
          <div className="einfo">
            <div className="ename">Dr. Ouma</div>
            <div className="efield">Agriculture · Kisumu</div>
          </div>
          <span className="escore">689</span>
        </div>
        <div className="expert">
          <div className="eavatar bg-brown-bg text-brown">WM</div>
          <div className="einfo">
            <div className="ename">Wanjiku M.</div>
            <div className="efield">Legal · Nairobi</div>
          </div>
          <span className="escore">654</span>
        </div>
        <div className="expert">
          <div className="eavatar bg-blue-bg text-blue">KN</div>
          <div className="einfo">
            <div className="ename">Kevin N.</div>
            <div className="efield">Software Dev · Eldoret</div>
          </div>
          <span className="escore">612</span>
        </div>
      </section>

      <section className="rp-section">
        <h2 className="rp-title">Your Stats</h2>
        <div className="stats">
          <StatCard label="Upvotes" value="765" variant="green" />
          <StatCard label="Tokens" value="705" variant="gold" />
        </div>
      </section>

      <section className="rp-section">
        <h2 className="rp-title">Saved Insights</h2>
        <div className="rp-item">
          <div className="rp-icon bg-gold-bg text-gold">💡</div>
          <div className="rp-info">
            <div className="rp-name">M-Pesa API V3 Guide</div>
            <div className="rp-sub">Integration walkthrough</div>
          </div>
          <div className="rp-arrow">›</div>
        </div>
        <div className="rp-item">
          <div className="rp-icon bg-green-bg text-green">🌱</div>
          <div className="rp-info">
            <div className="rp-name">Drip Irrigation 101</div>
            <div className="rp-sub">Western Kenya setup</div>
          </div>
          <div className="rp-arrow">›</div>
        </div>
        <div className="rp-item">
          <div className="rp-icon bg-brown-bg text-brown">📋</div>
          <div className="rp-info">
            <div className="rp-name">KRA iTax Filing Tips</div>
            <div className="rp-sub">2026 updates</div>
          </div>
          <div className="rp-arrow">›</div>
        </div>
      </section>
    </>
  )
}