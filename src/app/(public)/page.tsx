import Link from 'next/link'
import { Button } from '@/components/ui/form'
import { ArrowRight, Users, MessageSquare, Shield, MapPin, Star, Zap } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Navigation */}
      <header className="topbar border-b border-line-soft">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-bg flex items-center justify-center">
              <span className="text-green font-bold">K</span>
            </div>
            <span className="font-bold text-xl">Kikwetu<b>Connect</b></span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-muted hover:text-text transition-colors">Features</Link>
            <Link href="#how-it-works" className="text-sm text-muted hover:text-text transition-colors">How it Works</Link>
            <Link href="#trust" className="text-sm text-muted hover:text-text transition-colors">Trust & Safety</Link>
            <Link href="/login" className="text-sm text-muted hover:text-text transition-colors">Sign in</Link>
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">
                Join KikwetuConnect
              </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-bg/50 rounded-full text-green text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-green rounded-full animate-pulse"></span>
            Now in Public Beta
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Your people. Your language.<br />
            <span className="text-green">Your Baraza.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted max-w-3xl mx-auto mb-10">
            Kenya's local knowledge network for trusted answers, regional conversations, 
            and multilingual discovery. Find answers that understand where you come from.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">
              Create Free Account
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="#demo" className="btn-secondary px-6 py-3 text-base">
              Explore Demo
            </Link>
          </div>

          <p className="text-sm text-quiet flex items-center justify-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green rounded-full"></span>
              English
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-gold rounded-full"></span>
              Kiswahili
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-brown rounded-full"></span>
              Sheng
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue rounded-full"></span>
              47+ Counties
            </span>
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-surface/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">One Baraza. Many ways to participate.</h2>
            <p className="text-muted max-w-2xl mx-auto">Borrow the best parts of social, Q&A, professional networks, and local community life.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<MessageSquare className="w-6 h-6" />}
              title="Baraza Posts"
              description="Short-form updates, local news, cultural debates, images, video, and audio that move at the speed of the community."
              color="green"
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Deep-Dive Inquiries"
              description="Ask better questions, attach token bounties, and get answers from people with the right local context."
              color="gold"
            />
            <FeatureCard
              icon={<MapPin className="w-6 h-6" />}
              title="Regional Hubs"
              description="Switch between national trends and county conversations in Nairobi, Mombasa, Kisumu, Eldoret, and beyond."
              color="blue"
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">From stranger to participant in under a minute.</h2>
            <p className="text-muted max-w-2xl mx-auto">Onboarding asks only what improves your feed: identity, interests, language, and lightweight verification.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <StepCard number="01" title="Join" description="Sign up with email or phone, choose your name and password." />
            <StepCard number="02" title="Choose" description="Pick topics, select your county, and set your preferred language." />
            <StepCard number="03" title="Belong" description="Your personalized feed is ready. Start reading, asking, and sharing." />
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section id="trust" className="py-20 bg-surface/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Trust is a product surface.</h2>
            <p className="text-muted max-w-2xl mx-auto">The best answer is not always the loudest. It's the one that understands the place.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <TrustCard
              icon={<Shield className="w-6 h-6" />}
              title="Verified Expertise"
              description="Credentials and professional identity reviewed and surfaced beside answers."
            />
            <TrustCard
              icon={<Star className="w-6 h-6" />}
              title="Community Jury"
              description="High-Heshima members help review harmful, misleading, or scam content."
            />
            <TrustCard
              icon={<Zap className="w-6 h-6" />}
              title="Context-Aware Translation"
              description="English, Kiswahili, Sheng, and regional nuance stay attached to conversations."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-green rounded-3xl p-12 md:p-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[oklch(10%_0.01_155)]">
              Make local knowledge easier to find.
            </h2>
            <p className="text-lg text-[oklch(10%_0.01_155)]/80 mb-8 max-w-2xl mx-auto">
              Join the early access list and help shape the first Baraza.
            </p>
            <Button variant="secondary" size="lg" className="bg-[oklch(10%_0.01_155)] text-green hover:bg-[oklch(10%_0.01_155)]/90">
              Join KikwetuConnect
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-ink text-bg border-t border-line-soft">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-green-bg flex items-center justify-center">
                  <span className="text-green font-bold">K</span>
                </div>
                <span className="font-bold text-xl">Kikwetu<b>Connect</b></span>
              </Link>
              <p className="text-muted max-w-sm">Local context, shared advantage.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted">
                <li><Link href="#features" className="hover:text-green transition-colors">Features</Link></li>
                <li><Link href="#trust" className="hover:text-green transition-colors">Trust & Safety</Link></li>
                <li><Link href="#demo" className="hover:text-green transition-colors">Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted">
                <li><Link href="/privacy" className="hover:text-green transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-green transition-colors">Terms</Link></li>
                <li><Link href="/community" className="hover:text-green transition-colors">Community Guidelines</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-line-soft text-center text-sm text-muted">
            © 2026 KikwetuConnect. Built for Kenya.
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: 'green' | 'gold' | 'blue' }) {
  const colors: Record<'green' | 'gold' | 'blue', string> = {
    green: 'bg-green-bg/50 text-green',
    gold: 'bg-gold-bg/50 text-gold',
    blue: 'bg-blue-bg/50 text-blue',
  }

  return (
    <div className="card h-full">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colors[color]}`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-muted">{description}</p>
    </div>
  )
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="card relative">
      <div className="absolute -top-4 left-6 w-10 h-10 rounded-full bg-green text-[oklch(10%_0.01_155)] flex items-center justify-center font-bold text-xl">
        {number}
      </div>
      <div className="pt-8">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-muted">{description}</p>
      </div>
    </div>
  )
}

function TrustCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="card">
      <div className="w-12 h-12 rounded-xl bg-green-bg/50 flex items-center justify-center mb-4 text-green">
        {icon}
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-muted">{description}</p>
    </div>
  )
}