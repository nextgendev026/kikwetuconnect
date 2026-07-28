'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const items = [
  { href: '/feed', label: 'Home', icon: '⌂' },
  { href: '/explore', label: 'Explore', icon: '⌕' },
  { href: '#create', label: '', icon: '+', isPlus: true },
  { href: '/messages', label: 'Inbox', icon: '◍' },
  { href: '/profile', label: 'You', icon: '◉' },
]

export default function MobileNav() {
  const path = usePathname()
  const isActive = (href: string) => {
    if (href === '/feed') return path === '/feed'
    return path.startsWith(href)
  }

  return (
    <nav className="fixed z-10 bottom-[10px] left-[10px] right-[10px] h-[65px] bg-[oklch(18%_.028_151_/.98)] border border-[oklch(30%_.025_151)] rounded-[20px] flex items-center justify-around shadow-[0_18px_50px_oklch(5%_.02_151_/.45)] md:hidden">
      {items.map(i => {
        if (i.isPlus) {
          return (
            <button key={i.href} id="mobile-create-btn" className="grid place-items-center h-[46px] w-[46px] min-w-[46px] rounded-[15px] bg-gold text-night text-[22px] font-bold" onClick={() => {
              document.dispatchEvent(new CustomEvent('open-create-modal'))
            }}>+</button>
          )
        }
        return (
          <Link key={i.href} href={i.href} className={`grid place-items-center gap-[4px] text-[9px] min-w-[45px] no-underline ${isActive(i.href) ? 'text-gold' : 'text-[oklch(65%_.028_151)]'}`}>
            <span className="text-[17px]">{i.icon}</span>
            <span>{i.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
