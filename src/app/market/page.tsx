'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import { Plus, MapPin, Star, Heart, Eye, Filter, SortAsc, Package, ShoppingBag, Wrench, Palette, Bird, Grid3X3, MessageCircle } from 'lucide-react'

interface Listing {
  id: string
  title: string
  description: string
  price: number
  category: string
  county: string
  status: 'active' | 'sold' | 'expired'
  images: string[] | null
  views_count: number
  created_at: string
  seller_id: string
  profiles: {
    id: string
    full_name: string
    username: string
    avatar_url: string | null
    county_hub: string | null
  } | null
}

type SortMode = 'curated' | 'newest' | 'price' | 'rating'
type ViewMode = 'grid' | 'list'

const CATEGORIES = ['All', 'Produce', 'Services', 'Crafts', 'Livestock', 'Tools', 'Other']
const CATEGORY_ICONS: Record<string, JSX.Element> = {
  Produce: <Package className="w-4 h-4" />,
  Services: <Wrench className="w-4 h-4" />,
  Crafts: <Palette className="w-4 h-4" />,
  Livestock: <Bird className="w-4 h-4" />,
  Tools: <Wrench className="w-4 h-4" />,
  Other: <Grid3X3 className="w-4 h-4" />,
}

const COUNTIES = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Eldoret', 'Kitale', 'Nakuru', 'Thika', 'Kericho',
  'Isiolo', 'Garissa', 'Lamu', 'Wajir', 'Mandera', 'Kilifi', 'Kwale', 'Taita-Taveta',
  'Makueni', 'Kajiado', 'Narok', 'Bomet', 'Nyamira', 'Kisii', 'Homa Bay', 'Siaya',
  'Bungoma', 'Busia', 'Kakamega', 'Vihiga', 'Nandi', 'Baringo', 'West Pokot', 'Samburu',
  'Laikipia', 'Embu', 'Meru', 'Tharaka-Nithi', 'Nyeri', 'Murang\'a', 'Kirinyaga', 'Machakos',
  'Kiambu', 'Turkana', 'Trans Nzoia', 'Uasin Gishu',
]

const statusStyles: Record<string, string> = {
  active: 'bg-green/20 text-green border border-green/30',
  sold: 'bg-red/20 text-red border border-red/30',
  expired: 'bg-[oklch(30%_.025_151)] text-muted border border-[oklch(35%_.025_151)]',
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

  useEffect(() => {
    fetchListings()
  }, [category, county, sort])

  useEffect(() => {
    if (!profile) return
    supabase
      .from('saved_listings')
      .select('listing_id')
      .eq('user_id', profile.id)
      .then(({ data }: { data: { listing_id: string }[] | null }) => {
        if (data) setSavedIds(new Set(data.map(s => s.listing_id)))
      })
      .catch(() => { /* saved_listings table may not exist yet */ })
  }, [profile, supabase])

  const fetchListings = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('marketplace_listings')
        .select(`
          *,
          profiles!seller_id (
            id, full_name, username, avatar_url, county_hub
          )
        `)

      if (category !== 'All') {
        query = query.eq('category', category)
      }
      if (county) {
        query = query.eq('county', county)
      }

      switch (sort) {
        case 'newest':
          query = query.order('created_at', { ascending: false })
          break
        case 'price':
          query = query.order('price', { ascending: true })
          break
        case 'rating':
          query = query.order('view_count', { ascending: false })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      const { data, error } = await query.limit(50)
      if (error) throw error
      setListings((data as Listing[]) || [])
    } catch (err) {
      console.error('Error fetching listings:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleSave = async (listingId: string) => {
    if (!profile) {
      toast('Sign in to save listings')
      return
    }
    try {
      if (savedIds.has(listingId)) {
        await supabase
          .from('saved_listings')
          .delete()
          .eq('user_id', profile.id)
          .eq('listing_id', listingId)
        setSavedIds(prev => { const n = new Set(prev); n.delete(listingId); return n })
        toast('Removed from saved')
      } else {
        await supabase
          .from('saved_listings')
          .insert({ user_id: profile.id, listing_id: listingId } as any)
        setSavedIds(prev => { const n = new Set(prev); n.add(listingId); return n })
        toast('Listing saved')

        await supabase
          .from('marketplace_listings')
          .update({ views_count: (listings.find(l => l.id === listingId)?.views_count || 0) + 1 } as any)
          .eq('id', listingId)
      }
    } catch {
      toast('Saving not available yet')
    }
  }

  const contactSeller = (listing: Listing) => {
    if (!profile) {
      toast('Sign in to contact sellers')
      return
    }
    const sellerName = listing.profiles?.full_name || listing.profiles?.username || 'Seller'
    toast(`📬 Message ${sellerName} about "${listing.title}"`)
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <>
      <section className="page-head flex items-center justify-between">
        <div>
          <h1 className="page-title">Mtaa Exchange</h1>
          <p className="text-muted text-sm">Buy & sell in your community</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
            className="btn btn-secondary btn-sm"
          >
            {view === 'grid' ? '≡' : '▦'}
          </button>
          <Link href="/create?type=listing" className="btn btn-primary btn-sm flex items-center gap-1">
            <Plus className="w-4 h-4" /> List
          </Link>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="card section mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-[10px] text-[11px] font-medium flex items-center gap-1.5 transition-colors ${showFilters ? 'bg-gold text-night' : 'bg-[oklch(21%_.03_151)] text-muted hover:text-cream'}`}
          >
            <Filter className="w-3.5 h-3.5" /> Filters
          </button>
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-2 rounded-[10px] text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                category === c
                  ? 'bg-green/20 text-green border border-green/30'
                  : 'bg-[oklch(21%_.03_151)] text-muted hover:text-cream'
              }`}
            >
              {CATEGORY_ICONS[c] || null} {c}
            </button>
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            <SortAsc className="w-3.5 h-3.5 text-muted" />
            {(['curated', 'newest', 'price', 'rating'] as SortMode[]).map(s => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-2.5 py-1.5 rounded-[8px] text-[10px] font-medium transition-colors ${
                  sort === s
                    ? 'bg-gold text-night'
                    : 'text-muted hover:text-cream'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-[oklch(28%_.025_151)] animate-rise">
            <label className="text-[10px] font-semibold text-muted block mb-2">County</label>
            <select
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              className="input text-sm w-full max-w-[250px]"
            >
              <option value="">All counties</option>
              {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
      </section>

      {/* Listings Grid */}
      <section>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card section p-0 overflow-hidden">
                <div className="skeleton h-[160px]" />
                <div className="p-[14px] space-y-2">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="card section text-center py-16">
            <ShoppingBag className="w-12 h-12 text-[oklch(30%_.025_151)] mx-auto mb-4" />
            <p className="text-muted font-medium mb-2">No listings found</p>
            <p className="text-xs text-[oklch(40%_.025_151)] mb-6">
              {category !== 'All' || county ? 'Try adjusting your filters' : 'Be the first to list an item in your area'}
            </p>
            <Link href="/create?type=listing" className="btn btn-primary">
              <Plus className="w-4 h-4" /> Create listing
            </Link>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {listings.map((item) => {
              const author = item.profiles
              return (
                <div key={item.id} className="card section p-0 overflow-hidden group animate-rise">
                  {/* Image */}
                  <div className="relative h-[160px] bg-[oklch(18%_.028_151)] flex items-center justify-center overflow-hidden">
                    {item.images && item.images.length > 0 ? (
                      <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-[oklch(30%_.025_151)] flex flex-col items-center gap-2">
                        <Package className="w-8 h-8" />
                        <span className="text-[9px]">No image</span>
                      </div>
                    )}
                    <button
                      onClick={(e) => { e.preventDefault(); toggleSave(item.id) }}
                      className={`absolute top-2 right-2 w-8 h-8 rounded-full grid place-items-center transition-all ${
                        savedIds.has(item.id) ? 'bg-red text-white' : 'bg-night/70 text-cream hover:bg-night'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${savedIds.has(item.id) ? 'fill-current' : ''}`} />
                    </button>
                    <span className={`absolute top-2 left-2 text-[9px] font-semibold px-2 py-0.5 rounded-full ${statusStyles[item.status] || statusStyles.active}`}>
                      {item.status}
                    </span>
                  </div>
                  {/* Details */}
                  <div className="p-[14px]">
                    <h3 className="text-[13px] font-bold truncate">{item.title}</h3>
                    <p className="text-[15px] font-extrabold text-gold mt-1">KSh {item.price.toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-muted">
                      {item.county && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {item.county}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {item.views_count || 0}
                      </span>
                    </div>
                    {author && (
                      <p className="text-[10px] text-[oklch(45%_.025_151)] mt-1.5 truncate">
                        by {author.full_name || author.username}
                      </p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => contactSeller(item)}
                        className="flex-1 text-[10px] font-semibold py-2 rounded-[8px] bg-green/20 text-green hover:bg-green/30 transition-colors"
                      >
                        Contact
                      </button>
                      <button
                        onClick={() => toggleSave(item.id)}
                        className={`text-[10px] font-semibold py-2 px-3 rounded-[8px] transition-colors ${
                          savedIds.has(item.id) ? 'bg-red/20 text-red' : 'bg-[oklch(21%_.03_151)] text-muted hover:text-cream'
                        }`}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* List View */
          <div className="space-y-3">
            {listings.map((item) => {
              const author = item.profiles
              return (
                <div key={item.id} className="card section p-[14px] flex gap-4 animate-rise">
                  <div className="w-[100px] h-[100px] rounded-[12px] bg-[oklch(18%_.028_151)] flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {item.images && item.images.length > 0 ? (
                      <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-[oklch(30%_.025_151)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-[14px] font-bold truncate">{item.title}</h3>
                        <p className="text-[17px] font-extrabold text-gold mt-0.5">KSh {item.price.toLocaleString()}</p>
                      </div>
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${statusStyles[item.status]}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted">
                      {item.county && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.county}</span>}
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {item.views_count || 0}</span>
                      {author && <span>by {author.full_name || author.username}</span>}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => contactSeller(item)} className="text-[10px] font-semibold py-1.5 px-3 rounded-[8px] bg-green/20 text-green hover:bg-green/30 transition-colors flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> Contact
                      </button>
                      <button onClick={() => toggleSave(item.id)} className={`text-[10px] font-semibold py-1.5 px-3 rounded-[8px] transition-colors flex items-center gap-1 ${savedIds.has(item.id) ? 'bg-red/20 text-red' : 'bg-[oklch(21%_.03_151)] text-muted hover:text-cream'}`}>
                        <Heart className={`w-3 h-3 ${savedIds.has(item.id) ? 'fill-current' : ''}`} /> {savedIds.has(item.id) ? 'Saved' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
