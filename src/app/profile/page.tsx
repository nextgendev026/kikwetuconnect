'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import { useRouter } from 'next/navigation'
import {
  ThumbsUp, MessageSquare, Bookmark, Award, Shield, LogOut,
  TrendingUp, Edit3, Settings, BarChart3, Users, Star, MapPin
} from 'lucide-react'
import { ProfileHeader } from '@/components/profile'

type Tab = 'overview' | 'posts' | 'answers' | 'badges'

interface Badge {
  id: string; name: string; description: string; icon: string; awarded_at: string
}

interface RecentPost {
  id: string; title: string | null; content: string; post_type: string
  created_at: string; upvotes_count: number; answers_count: number
}

interface SavedItem {
  id: string; target_id: string; target_type: string; created_at: string
  posts?: { id: string; title: string | null; content: string; post_type: string } | null
}

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
  const [postCount, setPostCount] = useState(0)

  const fetchAllData = useCallback(async () => {
    if (!profile) return
    setLoadingData(true)
    try {
      const [answersRes, questionsRes, tokensRes, badgesRes, postsRes, savesRes, countRes] = await Promise.all([
        supabase.from('answers').select('id').eq('user_id', profile.id),
        supabase.from('posts').select('id').eq('user_id', profile.id).eq('post_type', 'inquiry'),
        supabase.from('tokens').select('amount').eq('user_id', profile.id),
        supabase.from('user_badges').select('badge_id, awarded_at, badges:badge_id(id, name, description, icon)').eq('user_id', profile.id),
        supabase.from('posts').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('saves').select('id, target_id, target_type, created_at, posts:target_id!left(id, title, content, post_type)').eq('user_id', profile.id).eq('target_type', 'post').order('created_at', { ascending: false }).limit(5),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
      ])

      setStats({
        answers: answersRes.data?.length || 0,
        questions: questionsRes.data?.length || 0,
        tokens: tokensRes.data?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0,
        heshima: profile.heshima_rating || 0,
      })
      setPostCount(countRes.count || 0)

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
  }, [profile, supabase])

  useEffect(() => {
    if (!profile) return
    fetchAllData()
  }, [profile, fetchAllData])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
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

  return (
    <div className="animate-fade-in-up">
      {/* Profile Header */}
      <ProfileHeader
        profile={profile}
        isOwn={true}
        postCount={postCount}
      />

      {/* Heshima Points */}
      <section className="card section mb-6">
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--line)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none" stroke="var(--green)" strokeWidth="8"
                strokeDasharray={263.89} strokeDashoffset={263.89 - (263.89 * Math.min(profile.heshima_rating ?? 0, 5000)) / 5000}
                strokeLinecap="round" className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-green">{profile.heshima_rating || 0}</span>
              <span className="text-[10px] text-muted">/ 5000</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm">Heshima Points</h3>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-xs text-muted">Balance: <strong className="text-green">{profile.heshima_balance || 0}</strong></p>
              <p className="text-xs text-muted">Streak: <strong className="text-gold">{profile.streak_days || 0}d</strong></p>
            </div>
            {profile.heshima_rating >= 1000 && (
              <div className="flex items-center gap-1.5 mt-2">
                <Award className="w-4 h-4 text-gold" />
                <span className="text-xs font-medium text-gold">Community Sage</span>
              </div>
            )}
            {profile.is_expert && (
              <div className="flex items-center gap-1.5 mt-1">
                <Shield className="w-4 h-4 text-green" />
                <span className="text-xs font-medium text-green">
                  Verified Expert {profile.expert_since ? `since ${new Date(profile.expert_since).toLocaleDateString()}` : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Badges Display */}
      {badges.length > 0 && (
        <section className="card section mb-6">
          <h3 className="font-bold text-sm mb-3">Badges</h3>
          <div className="flex flex-wrap gap-3">
            {badges.map(badge => (
              <div key={badge.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-night2 border border-[var(--line)]">
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
        <div className="flex border-b border-[var(--line)] mb-4">
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

        {loadingData ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-green border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Recent Posts</h4>
                  {recentPosts.length === 0 ? (
                    <p className="text-sm text-muted">No posts yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {recentPosts.map(post => (
                        <Link key={post.id} href={`/posts/${post.id}`}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-night2 transition-colors">
                          <span className="text-lg mt-0.5">
                            {post.post_type === 'baraza' ? '💬' : post.post_type === 'inquiry' ? '❓' : '📄'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{post.title || post.content.slice(0, 60)}</p>
                            <div className="flex items-center gap-3 text-xs text-muted mt-1">
                              <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{post.upvotes_count}</span>
                              <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.answers_count}</span>
                              <span>{new Date(post.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Saved Content</h4>
                  {savedItems.length === 0 ? (
                    <p className="text-sm text-muted">No saved items yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {savedItems.map(item => (
                        <Link key={item.id} href={`/posts/${item.target_id}`}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-night2 transition-colors">
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
                      <Link key={post.id} href={`/posts/${post.id}`}
                        className="block p-3 rounded-lg hover:bg-night2 transition-colors">
                        <p className="text-sm font-medium">{post.title || post.content.slice(0, 80)}</p>
                        <div className="flex items-center gap-3 text-xs text-muted mt-1">
                          <span className="capitalize text-[10px] px-2 py-0.5 rounded-full bg-night2 border border-[var(--line)]">
                            {post.post_type}
                          </span>
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
                      <div key={badge.id} className="text-center p-4 rounded-lg bg-night2 border border-[var(--line)]">
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
          {[
            { icon: <Edit3 className="w-5 h-5" />, label: 'Edit Profile', href: '/profile/edit' },
            { icon: <Shield className="w-5 h-5" />, label: 'Expert Verification', href: '#' },
            { icon: <BarChart3 className="w-5 h-5" />, label: 'Analytics', href: '#' },
            { icon: <Award className="w-5 h-5" />, label: 'Badges', href: '#' },
            { icon: <Users className="w-5 h-5" />, label: 'Followers', href: '#' },
            { icon: <Settings className="w-5 h-5" />, label: 'Settings', href: '/settings' },
          ].map(item => (
            <Link key={item.label} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-night2 transition-colors text-sm">
              <span className="text-muted">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Sign Out */}
      <section className="card section">
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-night2 transition-colors text-red text-sm">
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
      </section>
    </div>
  )
}
