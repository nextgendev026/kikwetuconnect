'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import { useRouter } from 'next/navigation'
import {
  Edit3, Settings, Shield, Award, BarChart3, Users, MessageCircle, LogOut,
  Bookmark, Clock, ThumbsUp, MessageSquare, FileText, Star, MapPin
} from 'lucide-react'

type Tab = 'overview' | 'posts' | 'answers' | 'badges'

interface Badge {
  id: string
  name: string
  description: string
  icon: string
  awarded_at: string
}

interface RecentPost {
  id: string
  title: string | null
  content: string
  post_type: string
  created_at: string
  upvotes_count: number
  answers_count: number
}

interface SavedItem {
  id: string
  target_id: string
  target_type: string
  created_at: string
  posts?: { id: string; title: string | null; content: string; post_type: string } | null
}

const menuItems = [
  { icon: <Edit3 className="w-5 h-5" />, label: 'Edit Profile', href: '/profile/edit' },
  { icon: <Shield className="w-5 h-5" />, label: 'Expert Verification', href: '#' },
  { icon: <BarChart3 className="w-5 h-5" />, label: 'Analytics', href: '#' },
  { icon: <Award className="w-5 h-5" />, label: 'Badges', href: '#' },
  { icon: <Users className="w-5 h-5" />, label: 'Followers', href: '#' },
  { icon: <Settings className="w-5 h-5" />, label: 'Settings', href: '/settings' },
]

export default function ProfilePage() {
  const { user, profile, loading: userLoading, refreshProfile } = useUser()
  const supabase = useSupabase()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [stats, setStats] = useState({ answers: 0, questions: 0, tokens: 0, heshima: 0 })
  const [badges, setBadges] = useState<Badge[]>([])
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([])
  const [savedItems, setSavedItems] = useState<SavedItem[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!profile) return
    fetchAllData()
  }, [profile])

  const fetchAllData = async () => {
    setLoadingData(true)
    try {
      const [answersRes, questionsRes, tokensRes, badgesRes, postsRes, savesRes] = await Promise.all([
        supabase.from('answers').select('id').eq('user_id', profile.id),
        supabase.from('posts').select('id').eq('user_id', profile.id).eq('post_type', 'inquiry'),
        supabase.from('tokens').select('amount').eq('user_id', profile.id),
        supabase.from('user_badges').select('badge_id, awarded_at, badges:badge_id(id, name, description, icon)').eq('user_id', profile.id),
        supabase.from('posts').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('saves').select('id, target_id, target_type, created_at, posts:target_id!left(id, title, content, post_type)').eq('user_id', profile.id).eq('target_type', 'post').order('created_at', { ascending: false }).limit(5),
      ])

      setStats({
        answers: answersRes.data?.length || 0,
        questions: questionsRes.data?.length || 0,
        tokens: tokensRes.data?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0,
        heshima: profile.heshima_rating || 0,
      })

      if (badgesRes.data) {
        setBadges(badgesRes.data.map((b: any) => ({
          id: b.badges?.id || b.badge_id,
          name: b.badges?.name || 'Unknown',
          description: b.badges?.description || '',
          icon: b.badges?.icon || '🏅',
          awarded_at: b.awarded_at,
        })))
      }

      setRecentPosts((postsRes.data as RecentPost[]) || [])
      setSavedItems((savesRes.data as SavedItem[]) || [])
    } catch (err) {
      console.error('Error fetching profile data:', err)
    } finally {
      setLoadingData(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-muted mb-4">Profile not found</p>
        <Link href="/login" className="btn btn-primary">Sign in</Link>
      </div>
    )
  }

  const initials = profile.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'KK'

  return (
    <>
      <section className="page-head">
        <h1 className="page-title">Profile</h1>
        <p className="text-muted text-sm">Your Kikwetu identity</p>
      </section>

      {/* Profile Header */}
      <section className="card section mb-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green to-gold flex items-center justify-center text-2xl font-bold text-night flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold truncate">{profile.full_name}</h2>
              {profile.is_verified_expert && (
                <Shield className="w-5 h-5 text-green flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-muted">@{profile.username}</p>
            {profile.county_hub && (
              <p className="text-xs text-muted mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {profile.county_hub}
              </p>
            )}
            {profile.bio && (
              <p className="text-sm text-muted mt-2 line-clamp-2">{profile.bio}</p>
            )}
          </div>
          <Link href="/profile/edit" className="btn btn-secondary btn-sm flex-shrink-0">
            <Edit3 className="w-4 h-4" /> Edit
          </Link>
        </div>
      </section>

      {/* Heshima Rating with Circular Gauge */}
      <section className="card section mb-6">
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="oklch(29%_.025_151)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none" stroke="oklch(55%_.13_151)" strokeWidth="8"
                strokeDasharray={263.89} strokeDashoffset={263.89 - (263.89 * Math.min(profile.heshima_rating, 1000)) / 1000}
                strokeLinecap="round" className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-green">{profile.heshima_rating}</span>
              <span className="text-[10px] text-muted">/ 1000</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm">Heshima Rating</h3>
            <p className="text-xs text-muted mt-1">
              Top {Math.max(1, 100 - Math.floor(profile.heshima_rating / 10))}% contributor
            </p>
            {profile.is_verified_expert && (
              <div className="flex items-center gap-1.5 mt-2">
                <Shield className="w-4 h-4 text-green" />
                <span className="text-xs font-medium text-green">Verified Expert</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="card section mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-green">{stats.answers}</div>
            <div className="text-xs text-muted">Answers</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gold">{stats.tokens}</div>
            <div className="text-xs text-muted">Tokens</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue">{stats.questions}</div>
            <div className="text-xs text-muted">Questions</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green">{stats.heshima}</div>
            <div className="text-xs text-muted">Heshima</div>
          </div>
        </div>
      </section>

      {/* Badges Display */}
      {badges.length > 0 && (
        <section className="card section mb-6">
          <h3 className="font-bold text-sm mb-3">Badges</h3>
          <div className="flex flex-wrap gap-3">
            {badges.map(badge => (
              <div key={badge.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-night2 border border-[oklch(29%_.025_151)]">
                <span className="text-xl">{badge.icon}</span>
                <div>
                  <p className="text-xs font-medium">{badge.name}</p>
                  <p className="text-[10px] text-muted">{new Date(badge.awarded_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tabs */}
      <section className="card section mb-6">
        <div className="flex border-b border-[oklch(29%_.025_151)] mb-4">
          {(['overview', 'posts', 'answers', 'badges'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab ? 'border-green text-green' : 'border-transparent text-muted hover:text-cream'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {loadingData ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-green border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Recent Posts */}
                <div>
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Recent Posts</h4>
                  {recentPosts.length === 0 ? (
                    <p className="text-sm text-muted">No posts yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {recentPosts.map(post => {
                        const typeIcon = post.post_type === 'baraza' ? '💬' : post.post_type === 'inquiry' ? '❓' : '📄'
                        return (
                          <Link key={post.id} href={`/posts/${post.id}`} className="flex items-start gap-3 p-3 rounded-lg hover:bg-night2 transition-colors">
                            <span className="text-lg mt-0.5">{typeIcon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{post.title || post.content.slice(0, 60)}</p>
                              <div className="flex items-center gap-3 text-xs text-muted mt-1">
                                <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{post.upvotes_count}</span>
                                <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.answers_count}</span>
                                <span>{new Date(post.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Saved Content */}
                <div>
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Saved Content</h4>
                  {savedItems.length === 0 ? (
                    <p className="text-sm text-muted">No saved items yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {savedItems.map(item => (
                        <Link
                          key={item.id}
                          href={`/posts/${item.target_id}`}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-night2 transition-colors"
                        >
                          <Bookmark className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {item.posts?.title || (item.posts?.content?.slice(0, 60) || 'Saved post')}
                            </p>
                            <p className="text-xs text-muted mt-1">
                              Saved {new Date(item.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'posts' && (
              <div>
                {recentPosts.length === 0 ? (
                  <p className="text-sm text-muted text-center py-6">No posts yet.</p>
                ) : (
                  <div className="space-y-2">
                    {recentPosts.map(post => (
                      <Link key={post.id} href={`/posts/${post.id}`} className="block p-3 rounded-lg hover:bg-night2 transition-colors">
                        <p className="text-sm font-medium">{post.title || post.content.slice(0, 80)}</p>
                        <div className="flex items-center gap-3 text-xs text-muted mt-1">
                          <span className="capitalize text-[10px] px-2 py-0.5 rounded-full bg-night2 border border-[oklch(29%_.025_151)]">{post.post_type}</span>
                          <span>{new Date(post.created_at).toLocaleDateString()}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'answers' && (
              <div>
                <p className="text-sm text-muted text-center py-6">
                  <Link href="/profile?tab=answers" className="text-green hover:underline">View all answers</Link>
                </p>
              </div>
            )}

            {activeTab === 'badges' && (
              <div>
                {badges.length === 0 ? (
                  <p className="text-sm text-muted text-center py-6">No badges earned yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {badges.map(badge => (
                      <div key={badge.id} className="text-center p-4 rounded-lg bg-night2 border border-[oklch(29%_.025_151)]">
                        <span className="text-3xl block mb-2">{badge.icon}</span>
                        <p className="text-xs font-medium">{badge.name}</p>
                        <p className="text-[10px] text-muted mt-1">{badge.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* Account Menu */}
      <section className="card section mb-6">
        <h3 className="font-bold text-sm mb-3">Account</h3>
        <div className="space-y-1">
          {menuItems.map(item => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-night2 transition-colors text-sm"
            >
              <span className="text-muted">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Sign Out */}
      <section className="card section">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-night2 transition-colors text-red text-sm"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
      </section>
    </>
  )
}
