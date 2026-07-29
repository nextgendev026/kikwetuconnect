'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import { Plus, MapPin, Heart, Eye, Filter, SortAsc, Package, ShoppingBag, Wrench, Palette, Bird, Grid3X3, MessageCircle, Store } from 'lucide-react'

interface Listing {
  id: string; title: string; description: string; price: number; category: string; county: string; status: 'active' | 'sold' | 'expired'; images: string[] | null; views_count: number; created_at: string; seller_id: string
  profiles: { id: string; full_name: string; username: string; avatar_url: string | null; county_hub: string | null } | null
}

type SortMode = 'curated' | 'newest' | 'price'
type ViewMode = 'grid' | 'list'

const CATEGORIES = ['All', 'Produce', 'Services', 'Crafts', 'Livestock', 'Tools', 'Other']
const CATEGORY_ICONS: Record<string, JSX.Element> = {
  Produce: <Package className="w-4 h-4" />, Services: <Wrench className="w-4 h-4" />, Crafts: <Palette className="w-4 h-4" />,
  Livestock: <Bird className="w-4 h-4" />, Tools: <Wrench className="w-4 h-4" />, Other: <Grid3X3 className="w-4 h-4" />,
}

const COUNTIES = ['Nairobi', 'Mombasa', 'Kisumu', 'Eldoret', 'Kitale', 'Nakuru', 'Thika', 'Kericho', 'Isiolo', 'Kilifi', 'Kwale', 'Machakos', 'Kajiado', 'Narok', 'Kisii', 'Bungoma', 'Busia', 'Kakamega', 'Nyeri', 'Embu', 'Meru', 'Kiambu', 'Makueni']

const style = {
  card: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, boxShadow: 'var(--card-shadow)' },
  chip: { padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all .2s var(--ease)', display: 'inline-flex', alignItems: 'center', gap: 6 },
  chipInactive: { background: 'var(--raised)', color: 'var(--muted)', border: '1px solid var(--line)' },
  chipActive: { background: 'var(--green)', color: 'var(--night)', border: '1px solid var(--green)' },
  chipSort: { padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 500, cursor: 'pointer', transition: 'all .2s var(--ease)' },
  chipSortActive: { background: 'var(--gold)', color: 'var(--night)' },
  chipSortInactive: { color: 'var(--muted)' },
}

export default function MarketPage() {
  const supabase = useSupabase()
  const { profile, loading: userLoading } = useUser()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [county, setCounty] = useState('')
  const [sort, setSort] = useState<SortMode>('curated')
  const [view, setView] = useState<ViewMode>('grid')
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => { fetchListings() }, [category, county, sort])

  useEffect(() => {
    if (!profile) return
    supabase.from('saved_listings').select('listing_id').eq('user_id', profile.id).then(({ data }: { data: { listing_id: string }[] | null }) => {
      if (data) setSavedIds(new Set(data.map(s => s.listing_id)))
    }).catch(() => {})
  }, [profile, supabase])

  const fetchListings = async () => {
    setLoading(true)
    try {
      let query = supabase.from('marketplace_listings').select(`*, profiles!seller_id (id, full_name, username, avatar_url, county_hub)`)
      if (category !== 'All') query = query.eq('category', category)
      if (county) query = query.eq('county', county)
      switch (sort) {
        case 'newest': query = query.order('created_at', { ascending: false }); break
        case 'price': query = query.order('price', { ascending: true }); break
        default: query = query.order('created_at', { ascending: false })
      }
      const { data } = await query.limit(50)
      setListings((data as Listing[]) || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const toggleSave = async (listingId: string) => {
    if (!profile) { toast('Sign in to save listings'); return }
    try {
      if (savedIds.has(listingId)) {
        await supabase.from('saved_listings').delete().eq('user_id', profile.id).eq('listing_id', listingId)
        setSavedIds(prev => { const n = new Set(prev); n.delete(listingId); return n }); toast('Removed from saved')
      } else {
        await supabase.from('saved_listings').insert({ user_id: profile.id, listing_id: listingId } as any)
        setSavedIds(prev => { const n = new Set(prev); n.add(listingId); return n }); toast('Listing saved')
        await supabase.from('marketplace_listings').update({ views_count: (listings.find(l => l.id === listingId)?.views_count || 0) + 1 } as any).eq('id', listingId)
      }
    } catch { toast('Saving not available yet') }
  }

  const contactSeller = (listing: Listing) => {
    if (!profile) { toast('Sign in to contact sellers'); return }
    toast(`Message ${listing.profiles?.full_name || listing.profiles?.username || 'Seller'} about "${listing.title}"`)
  }

  if (userLoading) return <div className="flex items-center justify-center min-h-[80vh]"><div className="animate-spin w-8 h-8 border-2" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent', borderRadius: '50%' }} /></div>

  return (
    <div className="pb-8 animate-fade-in-up">
      <section className="page-head flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Store className="w-7 h-7" style={{ color: 'var(--gold)' }} />
            Mtaa Exchange
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Buy & sell in your community</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView(view === 'grid' ? 'list' : 'grid')} style={{ ...style.chip, ...style.chipInactive }}>{view === 'grid' ? '≡' : '▦'}</button>
          <Link href="/create?type=listing" className="inline-flex items-center gap-1 px-3 py-2 rounded-[10px] text-[11px] font-bold transition-opacity" style={{ background: 'var(--gold)', color: 'var(--night)' }}>
            <Plus className="w-4 h-4" /> List
          </Link>
        </div>
      </section>

      {/* Filter Bar */}
      <section style={style.card} className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)}
            style={{ ...style.chip, ...(showFilters ? { background: 'var(--gold)', color: 'var(--night)', border: '1px solid var(--gold)' } : style.chipInactive) }}>
            <Filter className="w-3.5 h-3.5" /> Filters
          </button>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              style={{ ...style.chip, ...(category === c ? style.chipActive : style.chipInactive) }}>
              {CATEGORY_ICONS[c] || null} {c}
            </button>
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <SortAsc className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
            {(['curated', 'newest', 'price'] as SortMode[]).map(s => (
              <button key={s} onClick={() => setSort(s)}
                style={{ ...style.chipSort, ...(sort === s ? style.chipSortActive : style.chipSortInactive) }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {showFilters && (
          <div className="mt-4 pt-4 animate-rise" style={{ borderTop: '1px solid var(--line)' }}>
            <label className="text-[10px] font-semibold block mb-2" style={{ color: 'var(--muted)' }}>County</label>
            <select value={county} onChange={e => setCounty(e.target.value)}
              style={{ background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 11, padding: '8px 12px', fontSize: 13, color: 'var(--ink)', outline: 'none', width: '100%', maxWidth: 250 }}>
              <option value="">All counties</option>
              {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
      </section>

      {/* Listings */}
      <section>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ ...style.card, padding: 0, overflow: 'hidden' }}>
                <div className="skeleton h-[160px]" />
                <div className="p-[14px] space-y-2"><div className="skeleton h-4 w-3/4" /><div className="skeleton h-3 w-1/2" /></div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div style={style.card} className="text-center py-16">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--muted)', opacity: 0.3 }} />
            <p className="font-medium mb-2" style={{ color: 'var(--ink)' }}>No listings found</p>
            <p className="text-xs mb-6" style={{ color: 'var(--muted)' }}>{category !== 'All' || county ? 'Try adjusting your filters' : 'Be the first to list an item in your area'}</p>
            <Link href="/create?type=listing" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[11px] font-bold text-sm" style={{ background: 'var(--gold)', color: 'var(--night)' }}>
              <Plus className="w-4 h-4" /> Create listing
            </Link>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {listings.map(item => {
              const author = item.profiles
              const isSaved = savedIds.has(item.id)
              return (
                <div key={item.id} style={{ ...style.card, padding: 0, overflow: 'hidden' }} className="card-hover">
                  <div className="relative h-[160px] flex items-center justify-center overflow-hidden" style={{ background: 'var(--raised)' }}>
                    {item.images && item.images.length > 0 ? (
                      <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2" style={{ color: 'var(--muted)', opacity: 0.4 }}>
                        <Package className="w-8 h-8" />
                        <span className="text-[9px]">No image</span>
                      </div>
                    )}
                    <button onClick={e => { e.preventDefault(); toggleSave(item.id) }}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full grid place-items-center transition-all"
                      style={{ background: isSaved ? 'var(--red)' : 'color-mix(in oklab, var(--night) 70%, transparent)', color: isSaved ? '#fff' : 'var(--ink)' }}>
                      <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                    </button>
                    <span className="absolute top-2 left-2 text-[9px] font-semibold px-2 py-0.5 rounded-full" 
                      style={{ background: item.status === 'active' ? 'color-mix(in oklab, var(--green) 20%, transparent)' : 'color-mix(in oklab, var(--red) 20%, transparent)', color: item.status === 'active' ? 'var(--green)' : 'var(--red)', border: '1px solid', borderColor: item.status === 'active' ? 'color-mix(in oklab, var(--green) 30%, transparent)' : 'color-mix(in oklab, var(--red) 30%, transparent)' }}>
                      {item.status}
                    </span>
                  </div>
                  <div className="p-[14px]">
                    <h3 className="text-[13px] font-bold truncate" style={{ color: 'var(--ink)' }}>{item.title}</h3>
                    <p className="text-[15px] font-extrabold mt-1" style={{ color: 'var(--gold)' }}>KSh {item.price.toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-2 text-[10px]" style={{ color: 'var(--muted)' }}>
                      {item.county && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.county}</span>}
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {item.views_count || 0}</span>
                    </div>
                    {author && <p className="text-[10px] mt-1.5 truncate" style={{ color: 'var(--muted)' }}>by {author.full_name || author.username}</p>}
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => contactSeller(item)}
                        className="flex-1 text-[10px] font-semibold py-2 rounded-[8px] transition-colors"
                        style={{ background: 'color-mix(in oklab, var(--green) 20%, transparent)', color: 'var(--green)' }}>Contact</button>
                      <button onClick={() => toggleSave(item.id)}
                        style={{ background: isSaved ? 'color-mix(in oklab, var(--red) 20%, transparent)' : 'var(--raised)', color: isSaved ? 'var(--red)' : 'var(--muted)' }}
                        className="text-[10px] font-semibold py-2 px-3 rounded-[8px] transition-colors">Save</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map(item => {
              const author = item.profiles
              const isSaved = savedIds.has(item.id)
              return (
                <div key={item.id} style={style.card} className="flex gap-4 card-hover">
                  <div className="w-[100px] h-[100px] rounded-[12px] flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ background: 'var(--raised)' }}>
                    {item.images && item.images.length > 0 ? <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" /> : <Package className="w-6 h-6" style={{ color: 'var(--muted)', opacity: 0.4 }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-[14px] font-bold truncate" style={{ color: 'var(--ink)' }}>{item.title}</h3>
                        <p className="text-[17px] font-extrabold mt-0.5" style={{ color: 'var(--gold)' }}>KSh {item.price.toLocaleString()}</p>
                      </div>
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: item.status === 'active' ? 'color-mix(in oklab, var(--green) 20%, transparent)' : 'color-mix(in oklab, var(--red) 20%, transparent)', color: item.status === 'active' ? 'var(--green)' : 'var(--red)' }}>{item.status}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px]" style={{ color: 'var(--muted)' }}>
                      {item.county && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.county}</span>}
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {item.views_count || 0}</span>
                      {author && <span>by {author.full_name || author.username}</span>}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => contactSeller(item)} className="text-[10px] font-semibold py-1.5 px-3 rounded-[8px] flex items-center gap-1" style={{ background: 'color-mix(in oklab, var(--green) 20%, transparent)', color: 'var(--green)' }}>
                        <MessageCircle className="w-3 h-3" /> Contact
                      </button>
                      <button onClick={() => toggleSave(item.id)} className="text-[10px] font-semibold py-1.5 px-3 rounded-[8px] flex items-center gap-1 transition-colors"
                        style={{ background: isSaved ? 'color-mix(in oklab, var(--red) 20%, transparent)' : 'var(--raised)', color: isSaved ? 'var(--red)' : 'var(--muted)' }}>
                        <Heart className={`w-3 h-3 ${isSaved ? 'fill-current' : ''}`} /> {isSaved ? 'Saved' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
