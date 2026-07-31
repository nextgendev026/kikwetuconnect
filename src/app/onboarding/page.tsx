'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase, useUser, toast } from '@/app/providers'

const COUNTIES = ['Nairobi','Mombasa','Kisumu','Eldoret','Kitale','Nakuru','Thika','Kericho','Isiolo','Garissa','Lamu','Wajir','Mandera','Kilifi','Kwale','Taita-Taveta','Makueni','Kajiado','Narok','Bomet','Nyamira','Kisii','Homa Bay','Siaya','Bungoma','Busia','Kakamega','Vihiga','Nandi','Baringo','West Pokot','Samburu','Laikipia','Embu','Meru','Tharaka-Nithi','Nyeri',"Murang'a",'Kirinyaga','Machakos','Kiambu','Turkana','Trans Nzoia','Uasin Gishu']
const INTERESTS = ['Agriculture','Technology','Biashara','Education','Legal Rights','Culture','Health','Environment','Sports','Politics']
const ROLES = ['student','professional','parent','general']

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { profile, refreshProfile } = useUser()
  const [step, setStep] = useState(1)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [county, setCounty] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [role, setRole] = useState('')
  const [language, setLanguage] = useState('en')
  const [loading, setLoading] = useState(false)

  const totalSteps = 5

  const toggleInterest = (i: string) => setInterests(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i])

  const handleNext = async () => {
    if (step === 1 && (!fullName || !username)) { toast('Please enter your name and username'); return }
    if (step === 2 && !county) { toast('Please select your county'); return }
    if (step === 3 && interests.length === 0) { toast('Please select at least one interest'); return }
    if (step === 4 && !role) { toast('Please select your role'); return }
    if (step < totalSteps) { setStep(s => s + 1); return }

    setLoading(true)
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: profile?.id,
        full_name: fullName,
        username,
        county_hub: county,
        interests,
        user_type: role === 'general' ? null : role,
        preferred_language: language,
      } as any)
      if (error) throw error
      await refreshProfile()
      toast('Welcome to KikwetuConnect!')
      router.push('/feed')
    } catch (e: any) {
      toast(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const stepIndicator = (s: number) => (
    <div className="flex gap-[6px] mb-[27px]">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div key={i} className="h-[4px] flex-1 rounded-[99px] overflow-hidden bg-[oklch(21%_.03_151)]">
          <div className="h-full transition-all duration-300" style={{ width: i < s ? '100%' : '0%', background: 'oklch(75% .14 84)' }} />
        </div>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-night text-cream flex items-center justify-center p-[22px]">
      <div className="w-full max-w-[480px] bg-[oklch(18%_.028_151)] border border-[oklch(30%_.025_151)] rounded-[25px] p-[27px]">
        <div className="flex items-center gap-[10px] mb-[17px]">
          <div className="w-[36px] h-[36px] rounded-[12px] bg-gold grid place-items-center font-extrabold text-night -rotate-[8deg]">K</div>
          <div><b style={{ fontFamily: "'Plus Jakarta Sans'", letterSpacing: '-.05em' }}>KikwetuConnect</b><small className="block text-[9px] tracking-[.14em] uppercase text-[oklch(65%_.028_151)]">Tuko pamoja</small></div>
        </div>
        {stepIndicator(step)}
        <div className="text-[10px] tracking-[.14em] uppercase font-extrabold text-gold mb-[8px]">Step {step} of {totalSteps}</div>

        {step === 1 && (
          <>
            <h1 className="text-[35px] font-bold leading-[1.04] text-cream mb-[10px]" style={{ fontFamily: "'Plus Jakarta Sans'", letterSpacing: '-.07em' }}>What should we call you?</h1>
            <p className="text-[13px] text-[oklch(65%_.028_151)] mb-[23px]">Your name and username help people find and trust you.</p>
            <div className="grid gap-[7px] mb-[14px]">
              <label className="text-[11px] text-[oklch(65%_.028_151)]">Full name</label>
              <input className="h-[48px] bg-[oklch(21%_.03_151)] border border-[oklch(32%_.025_151)] rounded-[11px] px-[13px] text-cream text-[13px] outline-none focus:border-gold" placeholder="e.g. Akinyi Otieno" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div className="grid gap-[7px] mb-[14px]">
              <label className="text-[11px] text-[oklch(65%_.028_151)]">Username</label>
              <input className="h-[48px] bg-[oklch(21%_.03_151)] border border-[oklch(32%_.025_151)] rounded-[11px] px-[13px] text-cream text-[13px] outline-none focus:border-gold" placeholder="@username" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-[35px] font-bold leading-[1.04] text-cream mb-[10px]" style={{ fontFamily: "'Plus Jakarta Sans'", letterSpacing: '-.07em' }}>Where is your circle?</h1>
            <p className="text-[13px] text-[oklch(65%_.028_151)] mb-[23px]">This helps us tune your feed to local conversations.</p>
            <select className="w-full h-[48px] bg-[oklch(21%_.03_151)] border border-[oklch(32%_.025_151)] rounded-[11px] px-[13px] text-cream text-[13px] outline-none focus:border-gold" value={county} onChange={e => setCounty(e.target.value)}>
              <option value="">Select your county</option>
              {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-[35px] font-bold leading-[1.04] text-cream mb-[10px]" style={{ fontFamily: "'Plus Jakarta Sans'", letterSpacing: '-.07em' }}>What interests you?</h1>
            <p className="text-[13px] text-[oklch(65%_.028_151)] mb-[23px]">Pick a few topics. Your feed will feel better for it.</p>
            <div className="grid grid-cols-2 gap-[9px]">
              {INTERESTS.map(i => (
                <button key={i} onClick={() => toggleInterest(i)} className={`min-h-[71px] text-left bg-[oklch(21%_.03_151)] border ${interests.includes(i) ? 'border-gold bg-[oklch(29%_.045_84)]' : 'border-[oklch(32%_.025_151)]'} rounded-[13px] p-[11px] text-cream transition-colors`}>
                  <strong className="block text-[12px]">{i}</strong>
                  <small className="block text-[10px] text-[oklch(65%_.028_151)] mt-[4px]">Explore conversations</small>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="text-[35px] font-bold leading-[1.04] text-cream mb-[10px]" style={{ fontFamily: "'Plus Jakarta Sans'", letterSpacing: '-.07em' }}>What brings you here?</h1>
            <p className="text-[13px] text-[oklch(65%_.028_151)] mb-[23px]">Choose your role so we can show the right tools.</p>
            <div className="grid grid-cols-2 gap-[9px]">
              {ROLES.map(r => (
                <button key={r} onClick={() => setRole(r)} className={`min-h-[71px] text-left bg-[oklch(21%_.03_151)] border ${role === r ? 'border-gold bg-[oklch(29%_.045_84)]' : 'border-[oklch(32%_.025_151)]'} rounded-[13px] p-[11px] text-cream transition-colors capitalize`}>
                  <strong className="block text-[12px]">{r === 'general' ? 'General Member' : r}</strong>
                  <small className="block text-[10px] text-[oklch(65%_.028_151)] mt-[4px]">{r === 'student' ? 'Ask questions and learn' : r === 'professional' ? 'Offer guidance and earn' : r === 'parent' ? 'Support your child\'s learning' : 'Explore and participate'}</small>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h1 className="text-[35px] font-bold leading-[1.04] text-cream mb-[10px]" style={{ fontFamily: "'Plus Jakarta Sans'", letterSpacing: '-.07em' }}>Your language preference</h1>
            <p className="text-[13px] text-[oklch(65%_.028_151)] mb-[23px]">Choose your preferred language for the interface.</p>
            <div className="grid grid-cols-2 gap-[9px]">
              {[{ id: 'en', label: 'English' }, { id: 'sw', label: 'Kiswahili' }].map(l => (
                <button key={l.id} onClick={() => setLanguage(l.id)} className={`min-h-[71px] text-left bg-[oklch(21%_.03_151)] border ${language === l.id ? 'border-gold bg-[oklch(29%_.045_84)]' : 'border-[oklch(32%_.025_151)]'} rounded-[13px] p-[11px] text-cream transition-colors`}>
                  <strong className="block text-[12px]">{l.label}</strong>
                </button>
              ))}
            </div>
          </>
        )}

        <button onClick={handleNext} disabled={loading} className="w-full h-[46px] rounded-[12px] bg-gold text-night font-bold text-[13px] mt-[17px] flex items-center justify-center gap-[8px] transition-transform hover:translate-y-[-2px] disabled:opacity-50">
          {loading ? <span className="w-[16px] h-[16px] border-2 border-night border-t-transparent rounded-full animate-spin" /> : step === totalSteps ? 'Take me to Baraza ↗' : 'Continue ↗'}
        </button>
      </div>
    </div>
  )
}
