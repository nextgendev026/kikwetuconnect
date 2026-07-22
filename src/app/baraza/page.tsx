'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MapPin, Users, TrendingUp, ArrowRight } from 'lucide-react'
import { useUser, useSupabase } from '@/providers/supabase-provider'

interface CountyHub {
  county: string
  postCount: number
  activeUsers: number
  topTopics: string[]
  trend: number
}

const COUNTIES_DATA: CountyHub[] = [
  {
    county: 'Nairobi',
    postCount: 2450,
    activeUsers: 8934,
    topTopics: ['Tech & Startups', 'Biashara', 'County Politics'],
    trend: 12,
  },
  {
    county: 'Mombasa',
    postCount: 1820,
    activeUsers: 6234,
    topTopics: ['Tourism', 'Biashara', 'Culture'],
    trend: 8,
  },
  {
    county: 'Kisumu',
    postCount: 1456,
    activeUsers: 4567,
    topTopics: ['Agriculture', 'Biashara', 'Culture'],
    trend: 15,
  },
  {
    county: 'Eldoret',
    postCount: 987,
    activeUsers: 3245,
    topTopics: ['Agriculture', 'Sports', 'Tech'],
    trend: 6,
  },
  {
    county: 'Nakuru',
    postCount: 856,
    activeUsers: 2890,
    topTopics: ['Agriculture', 'Tech', 'Biashara'],
    trend: 9,
  },
  {
    county: 'Kericho',
    postCount: 654,
    activeUsers: 2123,
    topTopics: ['Agriculture', 'Health', 'Culture'],
    trend: 5,
  },
  {
    county: 'Nyeri',
    postCount: 745,
    activeUsers: 2456,
    topTopics: ['Agriculture', 'Biashara', 'Education'],
    trend: 7,
  },
  {
    county: 'Kakamega',
    postCount: 823,
    activeUsers: 2876,
    topTopics: ['Agriculture', 'Culture', 'Education'],
    trend: 11,
  },
  {
    county: 'Kisii',
    postCount: 698,
    activeUsers: 2234,
    topTopics: ['Agriculture', 'Tech', 'Culture'],
    trend: 4,
  },
  {
    county: 'Machakos',
    postCount: 567,
    activeUsers: 1876,
    topTopics: ['Agriculture', 'Biashara', 'Health'],
    trend: 3,
  },
]

export default function BarazaPage() {
  const { profile, loading: userLoading } = useUser()
  const supabase = useSupabase()
  const [counties, setCounties] = useState<CountyHub[]>(COUNTIES_DATA)
  const [loading, setLoading] = useState(true)
  const [selectedCounty, setSelectedCounty] = useState<string | null>(
    profile?.county_hub || null
  )

  useEffect(() => {
    // In a real app, this would fetch actual data from the database
    setLoading(false)
  }, [])

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <>
      <section className="page-head">
        <h1 className="page-title">Baraza Hubs</h1>
        <p className="text-muted text-sm">Discover conversations from your region</p>
      </section>

      {profile?.county_hub && (
        <div className="card section mb-6 border-green/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green uppercase tracking-wide">
                Your County
              </p>
              <p className="text-xl font-bold mt-1">{profile.county_hub}</p>
            </div>
            <Link
              href={`/baraza/${profile.county_hub.toLowerCase().replace(/\s+/g, '-')}`}
              className="btn btn-primary"
            >
              View Hub
            </Link>
          </div>
        </div>
      )}

      {/* Featured Hubs */}
      <section className="mb-8">
        <h2 className="text-lg font-bold mb-4">Trending Hubs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {counties
            .sort((a, b) => b.trend - a.trend)
            .slice(0, 6)
            .map((hub) => (
              <Link
                key={hub.county}
                href={`/baraza/${hub.county.toLowerCase().replace(/\s+/g, '-')}`}
                className="card section hover:border-green/50 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-green font-medium uppercase tracking-wide">
                      County Hub
                    </p>
                    <h3 className="text-xl font-bold group-hover:text-green transition-colors">
                      {hub.county}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-bg text-green text-xs font-medium">
                    <TrendingUp className="w-3 h-3" />
                    +{hub.trend}%
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted mb-4 py-3 border-t border-line">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    {hub.postCount.toLocaleString()} posts
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {hub.activeUsers.toLocaleString()} active
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {hub.topTopics.map((topic) => (
                    <span key={topic} className="text-xs px-2 py-1 rounded-full bg-surface text-quiet">
                      {topic}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
        </div>
      </section>

      {/* All Hubs */}
      <section>
        <h2 className="text-lg font-bold mb-4">All Regional Hubs</h2>
        <div className="space-y-2">
          {counties.map((hub) => (
            <Link
              key={hub.county}
              href={`/baraza/${hub.county.toLowerCase().replace(/\s+/g, '-')}`}
              className="card section flex items-center justify-between hover:bg-surface-2 transition-colors group"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="text-2xl">📍</div>
                <div className="flex-1">
                  <h3 className="font-bold group-hover:text-green transition-colors">
                    {hub.county}
                  </h3>
                  <p className="text-xs text-quiet">
                    {hub.postCount.toLocaleString()} posts • {hub.activeUsers.toLocaleString()} active
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-quiet group-hover:text-green transition-colors" />
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
