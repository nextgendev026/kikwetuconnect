'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

export interface GuideStep {
  id: string
  title: string
  description: string
  target?: string
  position?: 'top' | 'bottom' | 'center'
  action?: { label: string; href?: string; onClick?: () => void }
}

interface GuideContextType {
  isGuideOpen: boolean
  currentStep: number
  startGuide: (steps: GuideStep[]) => void
  closeGuide: () => void
  nextStep: () => void
  prevStep: () => void
  skipGuide: () => void
}

const GuideContext = createContext<GuideContextType | undefined>(undefined)

export function useGuide() {
  const ctx = useContext(GuideContext)
  if (!ctx) throw new Error('useGuide must be used within GuideProvider')
  return ctx
}

interface GuideProviderProps {
  children: ReactNode
}

export function GuideProvider({ children }: GuideProviderProps) {
  const router = useRouter()
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [steps, setSteps] = useState<GuideStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const completed = localStorage.getItem('kikwetu_guide_completed')
    if (!completed) {
      const timer = setTimeout(() => setIsGuideOpen(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const startGuide = useCallback((guideSteps: GuideStep[]) => {
    setSteps(guideSteps)
    setCurrentStep(0)
    setIsGuideOpen(true)
  }, [])

  const closeGuide = useCallback(() => {
    setIsGuideOpen(false)
    setSteps([])
    setCurrentStep(0)
  }, [])

  const completeGuide = useCallback(() => {
    localStorage.setItem('kikwetu_guide_completed', 'true')
    closeGuide()
  }, [closeGuide])

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1)
    } else {
      completeGuide()
    }
  }, [currentStep, steps.length, completeGuide])

  const prevStep = useCallback(() => {
    setCurrentStep(s => Math.max(0, s - 1))
  }, [])

  const skipGuide = useCallback(() => {
    completeGuide()
  }, [completeGuide])

  const handleAction = useCallback(() => {
    const step = steps[currentStep]
    if (!step) return
    if (step.action?.href) {
      router.push(step.action.href)
    }
    if (step.action?.onClick) {
      step.action.onClick()
    }
  }, [steps, currentStep, router])

  const value: GuideContextType = {
    isGuideOpen,
    currentStep,
    startGuide,
    closeGuide,
    nextStep,
    prevStep,
    skipGuide,
  }

  return (
    <GuideContext.Provider value={value}>
      {children}
      {isGuideOpen && steps.length > 0 && (
        <GuideOverlay
          step={steps[currentStep]}
          currentStep={currentStep}
          totalSteps={steps.length}
          onNext={nextStep}
          onPrev={prevStep}
          onClose={closeGuide}
          onSkip={skipGuide}
          onAction={handleAction}
        />
      )}
    </GuideContext.Provider>
  )
}

function GuideOverlay({
  step,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onClose,
  onSkip,
  onAction,
}: {
  step: GuideStep
  currentStep: number
  totalSteps: number
  onNext: () => void
  onPrev: () => void
  onClose: () => void
  onSkip: () => void
  onAction: () => void
}) {
  const isCenter = step.position === 'center'

  const handleOverlayClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('guide-overlay')) {
      onClose()
    }
  }

  return (
    <div
      className="guide-overlay fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      {!isCenter && step.target && (
        <div
          className="pointer-events-none absolute rounded-xl"
          style={{
            border: '2px solid var(--gold)',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
            zIndex: 10,
          }}
        />
      )}
      <div
        className="relative z-[201] rounded-2xl border"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--line)',
          width: 'min(420px, 90vw)',
          boxShadow: 'var(--card-shadow-elevated)',
        }}
      >
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-bold text-sm" style={{ color: 'var(--ink)' }}>{step.title}</h3>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{step.description}</p>
            </div>
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
              style={{ background: 'var(--raised)', color: 'var(--muted)', border: '1px solid var(--line)' }}
              aria-label="Close guide"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === currentStep ? '24px' : '8px',
                    background: i === currentStep ? 'var(--gold)' : 'var(--line)',
                  }}
                />
              ))}
            </div>
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>Step {currentStep + 1} of {totalSteps}</span>
          </div>

          {step.action && (
            <button
              onClick={onAction}
              className="w-full h-9 rounded-xl font-bold text-xs flex items-center justify-center gap-2 mb-3"
              style={{
                background: 'var(--gold)',
                color: 'var(--night)',
              }}
            >
              {step.action.label}
            </button>
          )}

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onPrev}
              disabled={currentStep === 0}
              className="flex items-center gap-1 text-xs font-medium"
              style={{
                opacity: currentStep === 0 ? 0.3 : 1,
                color: 'var(--muted)',
              }}
            >
              <ChevronLeft className="w-3 h-3" /> Previous
            </button>
            <button
              onClick={currentStep === totalSteps - 1 ? onSkip : onNext}
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{
                background: 'var(--raised)',
                color: 'var(--ink)',
                border: '1px solid var(--line)',
              }}
            >
              {currentStep === totalSteps - 1 ? 'Skip tour' : 'Next'}
            </button>
            <button
              onClick={currentStep === totalSteps - 1 ? onSkip : onNext}
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: 'var(--gold)' }}
            >
              {currentStep === totalSteps - 1 ? 'Finish' : 'Next'} <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const FEED_GUIDE_STEPS: GuideStep[] = [
  {
    id: 'feed-intro',
    title: 'Your Baraza Feed',
    description: 'This is your main feed. Swipe or scroll to see posts from your community. Each post shows the author, content, and local context.',
    position: 'center',
  },
  {
    id: 'create-post',
    title: 'Create Content',
    description: 'Tap here to share a post, question, article, poll, or marketplace listing. Use formats to enrich your content.',
    position: 'center',
    target: '.create-btn',
  },
  {
    id: 'upvote',
    title: 'Upvote & Engage',
    description: 'Upvote useful posts to award Heshima points to the author. React with emojis and save posts for later.',
    position: 'center',
  },
  {
    id: 'polls',
    title: 'Polls',
    description: 'See polls in your feed? Tap an option to vote and see real-time results. Your vote helps the community decide!',
    position: 'center',
  },
  {
    id: 'quizzes',
    title: 'Quizzes & Learning',
    description: 'Take quizzes to test your knowledge and earn Heshima points. Climb the leaderboard and unlock badges!',
    position: 'center',
    action: { label: 'Take a quiz →', href: '/quizzes' },
  },
]
