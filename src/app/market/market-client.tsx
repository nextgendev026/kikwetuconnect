'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import { Plus, MapPin, Heart, Eye, Filter, SortAsc, Package, ShoppingBag, Wrench, Palette, Bird, Grid3X3, MessageCircle, Store, Star, X, ChevronDown, CreditCard, Truck, Check, Clock, AlertCircle, Upload, ImageIcon } from 'lucide-react'
import imageCompress from 'browser-image-compression'

interface Listing {
  id: string; title: string; description: string; price: number; category: string; county: string; status: 'active' | 'sold' | 'expired'; images: string[] | null; views_count: number; seller_rating: number; orders_count: number; created_at: string; seller_id: string
  profiles: { id: string; full_name: string; username: string; avatar_url: string | null; county_hub: string | null } | null
}

interface Order {
  id: string; listing_id: string; buyer_id: string; seller_id: string; quantity: number; total_price: number; status: string; delivery_address: string; delivery_notes: string; contact_phone: string; created_at: string
  listings: { title: string; price: number; images: string[] | null } | null
  buyer: { id: string; full_name: string; username: string } | null
  seller: { id: string; full_name: string; username: string } | null
}

interface Review { id: string; order_id: string; reviewer_id: string; rating: number; comment: string; created_at: string; reviewer: { full_name: string; username: string } | null }

type SortMode = 'curated' | 'newest' | 'price'
type ViewMode = 'grid' | 'list'
type TabType = 'browse' | 'my-orders' | 'my-listings'

const CATEGORIES = ['All', 'Produce', 'Services', 'Crafts', 'Livestock', 'Tools', 'Other']
const CATEGORY_ICONS: Record<string, JSX.Element> = { Produce: <Package className="w-4 h-4" />, Services: <Wrench className="w-4 h-4" />, Crafts: <Palette className="w-4 h-4" />, Livestock: <Bird className="w-4 h-4" />, Tools: <Wrench className="w-4 h-4" />, Other: <Grid3X3 className="w-4 h-4" /> }
const COUNTIES = ['Nairobi', 'Mombasa', 'Kisumu', 'Eldoret', 'Kitale', 'Nakuru', 'Thika', 'Kericho', 'Isiolo', 'Kilifi', 'Kwale', 'Machakos', 'Kajiado', 'Narok', 'Kisii', 'Bungoma', 'Busia', 'Kakamega', 'Nyeri', 'Embu', 'Meru', 'Kiambu', 'Makueni']
const ORDER_STATUSES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'var(--gold)' }, confirmed: { label: 'Confirmed', color: 'var(--blue)' },
  shipped: { label: 'Shipped', color: 'var(--earth)' }, delivered: { label: 'Delivered', color: 'var(--green)' },
  cancelled: { label: 'Cancelled', color: 'var(--red)' }, refunded: { label: 'Refunded', color: 'var(--muted)' },
}

const s = {
  card: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, boxShadow: 'var(--card-shadow)' },
  chip: { padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all .2s var(--ease)', display: 'inline-flex', alignItems: 'center', gap: 6 },
  chipInactive: { background: 'var(--raised)', color: 'var(--muted)', border: '1px solid var(--line)' },
  chipActive: { background: 'var(--green)', color: 'var(--night)', border: '1px solid var(--green)' },
  chipSort: { padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 500, cursor: 'pointer', transition: 'all .2s var(--ease)' },
  chipSortActive: { background: 'var(--gold)', color: 'var(--night)' },
  chipSortInactive: { color: 'var(--muted)' },
  input: { width: '100%', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 11, padding: '10px 14px', fontSize: 13, color: 'var(--ink)', outline: 'none' },
  btn: { padding: '10px 20px', borderRadius: 11, fontWeight: 700, fontSize: 12, border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all .2s var(--ease)' },
  primaryBtn: { background: 'var(--gold)', color: 'var(--night)' },
  secondaryBtn: { background: 'var(--raised)', color: 'var(--ink)', border: '1px solid var(--line)' },
}

export default function MarketPage() {
  const supabase = useSupabase()
  const { profile, loading: userLoading } = useUser()
  const [listings, setListings] = useState<Listing[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [myListings, setMyListings] = useState<Listing[]>([])
  const [reviews, setReviews] = useState<Record<string, Review[]>>({})
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [county, setCounty] = useState('')
  const [sort, setSort] = useState<SortMode>('curated')
  const [view, setView] = useState<ViewMode>('grid')
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [tab, setTab] = useState<TabType>('browse')

  // Create listing modal
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ title: '', description: '', price: '', category: 'Produce', county: '', imageFile: null as File | null, imagePreview: '' })
  const [creating, setCreating] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Buy modal
  const [buyItem, setBuyItem] = useState<Listing | null>(null)
  const [buyForm, setBuyForm] = useState({ quantity: 1, phone: '', address: '', notes: '' })
  const [buying, setBuying] = useState(false)

  // Review modal
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')

  // Listing detail modal
  const [detailItem, setDetailItem] = useState<Listing | null>(null)

  // Edit listing modal
  const editFileInputRef = useRef<HTMLInputElement>(null)
  const [editItem, setEditItem] = useState<Listing | null>(null)
  const [editForm, setEditForm] = useState({ title: '', description: '', price: '', category: 'Produce', county: '', status: 'active' })
  const [editImages, setEditImages] = useState<string[]>([])
  const [newPhotos, setNewPhotos] = useState<{ file: File; preview: string }[]>([])
  const [savingEdit, setSavingEdit] = useState(false)
  const [editImageFiles, setEditImageFiles] = useState<File[]>([])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchListings() }, [category, county, sort])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (profile) { fetchSaved(); fetchOrders(); fetchMyListings() } }, [profile])

  const fetchListings = async () => {
    setLoading(true)
    try {
      let query = supabase.from('marketplace_listings').select(`*, profiles!seller_id (id, full_name, username, avatar_url, county_hub)`).eq('status', 'active')
      if (category !== 'All') query = query.eq('category', category)
      if (county) query = query.eq('county', county)
      switch (sort) { case 'newest': query = query.order('created_at', { ascending: false }); break; case 'price': query = query.order('price', { ascending: true }); break; default: query = query.order('created_at', { ascending: false }) }
      const { data } = await query.limit(50)
      setListings((data as Listing[]) || [])
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const fetchSaved = async () => {
    if (!profile) return
    const { data } = await supabase.from('saved_listings').select('listing_id').eq('user_id', profile.id)
    if (data) setSavedIds(new Set(data.map((s: { listing_id: string }) => s.listing_id)))
  }

  const fetchOrders = async () => {
    if (!profile) return
    const { data } = await supabase.from('marketplace_orders').select(`*, listings:listing_id (title, price, images), buyer:buyer_id (id, full_name, username), seller:seller_id (id, full_name, username)`).or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`).order('created_at', { ascending: false })
    if (data) setOrders(data as unknown as Order[])
  }

  const fetchMyListings = async () => {
    if (!profile) return
    const { data } = await supabase.from('marketplace_listings').select(`*, profiles!seller_id (id, full_name, username, avatar_url, county_hub)`).eq('seller_id', profile.id).order('created_at', { ascending: false })
    if (data) setMyListings(data as Listing[])
  }

  const fetchReviews = async (listingId: string) => {
    const { data } = await supabase.from('marketplace_reviews').select(`*, reviewer:reviewer_id (full_name, username)`).eq('listing_id', listingId)
    if (data) setReviews(prev => ({ ...prev, [listingId]: data as Review[] }))
  }

  const toggleSave = async (listingId: string) => {
    if (!profile) { toast('Sign in to save'); return }
    try {
      const res = await fetch('/api/saves', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_type: 'listing', target_id: listingId }),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.saved) { setSavedIds(prev => { const n = new Set(prev); n.add(listingId); return n }); toast('Saved') }
        else { setSavedIds(prev => { const n = new Set(prev); n.delete(listingId); return n }); toast('Removed') }
      } else throw new Error(data.error)
    } catch { toast('Failed to save') }
  }

  const handleCreateListing = async () => {
    if (!profile) { toast('Sign in to list'); return }
    if (!createForm.title.trim() || !createForm.price) { toast('Title and price required'); return }
    if (parseFloat(createForm.price) <= 0) { toast('Price must be greater than 0'); return }
    setCreating(true)
    setUploadProgress(0)
    try {
      let imageUrls: string[] = []
      if (createForm.imageFile) {
        setUploadProgress(10)
        const ext = createForm.imageFile.name.split('.').pop() || 'jpg'
        const path = `marketplace/${profile.id}-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('public-media').upload(path, createForm.imageFile, { upsert: true })
        if (upErr) throw upErr
        setUploadProgress(70)
        const { data: { publicUrl } } = supabase.storage.from('public-media').getPublicUrl(path)
        imageUrls = [publicUrl]
        setUploadProgress(100)
      }
      const { error } = await supabase.from('marketplace_listings').insert({
        seller_id: profile.id, title: createForm.title.trim(), description: createForm.description.trim(),
        price: parseFloat(createForm.price), category: createForm.category, county: createForm.county || '',
        images: imageUrls.length > 0 ? imageUrls : null, is_active: true,
      })
      if (error) throw error
      toast('Listing created!'); setShowCreate(false)
      if (createForm.imagePreview) URL.revokeObjectURL(createForm.imagePreview)
      setCreateForm({ title: '', description: '', price: '', category: 'Produce', county: '', imageFile: null, imagePreview: '' })
      setUploadProgress(0)
      fetchListings()
    } catch (err: any) { toast(err.message || 'Failed to create') } finally { setCreating(false) }
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast('Image too large (max 10MB)'); return }
    if (!file.type.startsWith('image/')) { toast('Please select an image'); return }
    try {
      file = await imageCompress(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true })
    } catch { /* use original */ }
    const preview = URL.createObjectURL(file)
    setCreateForm(p => ({ ...p, imageFile: file, imagePreview: preview }))
    e.target.value = ''
  }

  const openEdit = (item: Listing) => {
    setEditItem(item)
    setEditForm({ title: item.title, description: item.description, price: String(item.price), category: item.category, county: item.county || '', status: item.status })
    setEditImages(item.images || [])
    setNewPhotos([])
    setEditImageFiles([])
  }

  const handleEditImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const valid = files.filter(f => f.size <= 10 * 1024 * 1024 && f.type.startsWith('image/'))
    if (valid.length === 0) { toast('Select valid images (max 10MB each)'); e.target.value = ''; return }
    const compressed = await Promise.all(valid.map(async f => {
      try { return await imageCompress(f, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true }) } catch { return f }
    }))
    const photos = compressed.map(f => ({ file: f, preview: URL.createObjectURL(f) }))
    setNewPhotos(prev => [...prev, ...photos])
    setEditImageFiles(prev => [...prev, ...compressed])
    e.target.value = ''
  }

  const removeExistingPhoto = (url: string) => {
    setEditImages(prev => prev.filter(u => u !== url))
  }

  const removeNewPhoto = (idx: number) => {
    setNewPhotos(prev => {
      URL.revokeObjectURL(prev[idx].preview)
      const next = [...prev]; next.splice(idx, 1); return next
    })
    setEditImageFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSaveEdit = async () => {
    if (!profile || !editItem) return
    if (!editForm.title.trim() || !editForm.price) { toast('Title and price required'); return }
    setSavingEdit(true)
    try {
      const allImages = [...editImages]
      for (const f of editImageFiles) {
        const ext = f.name.split('.').pop() || 'jpg'
        const path = `marketplace/${profile.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: upErr } = await supabase.storage.from('public-media').upload(path, f, { upsert: true })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('public-media').getPublicUrl(path)
        allImages.push(publicUrl)
      }
      const { error } = await supabase.from('marketplace_listings').update({
        title: editForm.title.trim(), description: editForm.description.trim(),
        price: parseFloat(editForm.price), category: editForm.category,
        county: editForm.county || undefined, status: editForm.status,
        images: allImages.length > 0 ? allImages : null,
      }).eq('id', editItem.id)
      if (error) throw error
      toast('Listing updated!')
      setEditItem(null)
      newPhotos.forEach(p => URL.revokeObjectURL(p.preview))
      fetchMyListings(); fetchListings()
      if (detailItem?.id === editItem.id) setDetailItem({ ...detailItem, ...editForm, status: editForm.status as Listing['status'], price: parseFloat(editForm.price), images: allImages.length > 0 ? allImages : null })
    } catch (err: any) { toast(err.message || 'Failed to update') } finally { setSavingEdit(false) }
  }

  const handleBuy = async () => {
    if (!profile || !buyItem) return
    if (!buyForm.phone.trim() || !buyForm.address.trim()) { toast('Phone and address required'); return }
    setBuying(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: buyItem.id, quantity: buyForm.quantity,
          delivery_address: buyForm.address.trim(), contact_phone: buyForm.phone.trim(),
          delivery_notes: buyForm.notes.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to order')
      toast('Order placed!')
      // Initiate STK push payment
      const payRes = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stk-push', order_id: data.order_id, phone: buyForm.phone.trim() }),
      })
      const payData = await payRes.json()
      if (payRes.ok) {
        toast('Check your phone to complete M-PESA payment')
      } else {
        toast('Order created. Pay on delivery or contact seller.')
      }
      setBuyItem(null)
      setBuyForm({ quantity: 1, phone: '', address: '', notes: '' }); fetchOrders()
    } catch (err: any) { toast(err.message || 'Failed to order') } finally { setBuying(false) }
  }

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    if (!profile) return
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')
      toast(`Order ${status}`); fetchOrders()
      if (status === 'delivered') {
        const o = orders.find(o => o.id === orderId)
        if (o && o.buyer_id === profile.id) setReviewOrder(o)
      }
    } catch (err: any) { toast(err.message) }
  }

  const handleSubmitReview = async () => {
    if (!profile || !reviewOrder) return
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: reviewOrder.id, listing_id: reviewOrder.listing_id, rating: reviewRating, comment: reviewComment.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast('Review submitted!'); setReviewOrder(null); setReviewRating(5); setReviewComment('')
    } catch (err: any) { toast(err.message || 'Failed to submit review') }
  }

  const openDetail = (item: Listing) => { setDetailItem(item); fetchReviews(item.id) }

  if (userLoading) return <div className="flex items-center justify-center min-h-[80vh]"><div className="animate-spin w-8 h-8 border-2" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent', borderRadius: '50%' }} /></div>

  return (
    <div className="pb-8 animate-fade-in-up">
      <section className="page-head flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="page-title flex items-center gap-3" style={{ margin: 0 }}>
            <Store className="w-7 h-7" style={{ color: 'var(--gold)' }} />
            Mtaa Market
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>The local marketplace — buy, sell, trade in your community</p>
        </div>
        <div className="flex gap-2">
          {profile && <button onClick={() => setShowCreate(true)} style={{ ...s.btn, ...s.primaryBtn }}><Plus className="w-4 h-4" /> List Item</button>}
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-[12px]" style={{ background: 'var(--raised)' }}>
        {(['browse', 'my-orders', 'my-listings'] as TabType[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className="flex-1 py-2 px-3 rounded-[10px] text-[11px] font-semibold transition-all"
            style={tab === t ? { background: 'var(--surface)', color: 'var(--ink)', boxShadow: 'var(--card-shadow)' } : { color: 'var(--muted)' }}>
            {t === 'browse' ? 'Browse' : t === 'my-orders' ? `Orders (${orders.length})` : 'My Listings'}
          </button>
        ))}
      </div>

      {tab === 'browse' && (
        <>
          {/* Filter Bar */}
          <section style={s.card} className="mb-5">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setShowFilters(!showFilters)} style={{ ...s.chip, ...(showFilters ? { background: 'var(--gold)', color: 'var(--night)', border: '1px solid var(--gold)' } : s.chipInactive) }}>
                <Filter className="w-3.5 h-3.5" /> Filters
              </button>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCategory(c)} style={{ ...s.chip, ...(category === c ? s.chipActive : s.chipInactive) }}>
                  {CATEGORY_ICONS[c] || null} {c}
                </button>
              ))}
              <div className="flex-1" />
              <div className="flex items-center gap-1">
                <SortAsc className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
                {(['curated', 'newest', 'price'] as SortMode[]).map(sm => (
                  <button key={sm} onClick={() => setSort(sm)} style={{ ...s.chipSort, ...(sort === sm ? s.chipSortActive : s.chipSortInactive) }}>
                    {sm.charAt(0).toUpperCase() + sm.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {showFilters && (
              <div className="mt-4 pt-4 animate-rise" style={{ borderTop: '1px solid var(--line)' }}>
                <label className="text-[10px] font-semibold block mb-2" style={{ color: 'var(--muted)' }}>County</label>
                <select value={county} onChange={e => setCounty(e.target.value)} style={{ ...s.input, maxWidth: 250 }}>
                  <option value="">All counties</option>
                  {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </section>

          {/* Listings grid */}
          <section>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
                    <div className="skeleton h-[160px]" />
                    <div className="p-[14px] space-y-2"><div className="skeleton h-4 w-3/4" /><div className="skeleton h-3 w-1/2" /></div>
                  </div>
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div style={s.card} className="text-center py-16">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--muted)', opacity: 0.3 }} />
                <p className="font-medium mb-2" style={{ color: 'var(--ink)' }}>No listings found</p>
                <p className="text-xs mb-6" style={{ color: 'var(--muted)' }}>Be the first to list in your area</p>
                {profile && <button onClick={() => setShowCreate(true)} style={{ ...s.btn, ...s.primaryBtn }}><Plus className="w-4 h-4" /> Create listing</button>}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {listings.map(item => {
                  const isSaved = savedIds.has(item.id)
                  return (
                    <div key={item.id} style={{ ...s.card, padding: 0, overflow: 'hidden', cursor: 'pointer' }} className="card-hover" onClick={() => openDetail(item)}>
                      <div className="relative h-[160px] flex items-center justify-center overflow-hidden" style={{ background: 'var(--raised)' }}>
                        {item.images && item.images.length > 0 ? (
                          <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-2" style={{ color: 'var(--muted)', opacity: 0.4 }}>
                            <Package className="w-8 h-8" /><span className="text-[9px]">No image</span>
                          </div>
                        )}
                        <button onClick={e => { e.stopPropagation(); toggleSave(item.id) }}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full grid place-items-center"
                          style={{ background: isSaved ? 'var(--red)' : 'color-mix(in oklab, var(--night) 70%, transparent)', color: isSaved ? '#fff' : 'var(--ink)' }}>
                          <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                      <div className="p-[14px]">
                        <h3 className="text-[13px] font-bold truncate" style={{ color: 'var(--ink)' }}>{item.title}</h3>
                        <p className="text-[15px] font-extrabold mt-1" style={{ color: 'var(--gold-text)' }}>KSh {item.price.toLocaleString()}</p>
                        <div className="flex items-center gap-2 mt-2 text-[10px]" style={{ color: 'var(--muted)' }}>
                          {item.county && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.county}</span>}
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {item.views_count || 0}</span>
                          {item.seller_rating > 0 && <span className="flex items-center gap-1"><Star className="w-3 h-3" style={{ color: 'var(--gold)' }} /> {item.seller_rating}</span>}
                        </div>
                        {item.profiles && <p className="text-[10px] mt-1.5 truncate" style={{ color: 'var(--muted)' }}>by {item.profiles.full_name || item.profiles.username}</p>}
                        <div className="flex gap-2" style={{ marginTop: 10 }}>
                          <button onClick={e => { e.stopPropagation(); setBuyItem(item) }}
                            style={{ flex: 1, ...s.btn, ...s.primaryBtn, justifyContent: 'center', padding: '8px', fontSize: 11 }}>
                            <ShoppingBag className="w-3.5 h-3.5" /> Buy Now
                          </button>
                          <Link href={`/messages?user=${item.seller_id}`} onClick={e => e.stopPropagation()} aria-label="Message seller"
                            style={{ ...s.btn, ...s.secondaryBtn, justifyContent: 'center', padding: '8px' }}>
                            <MessageCircle className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}

      {tab === 'my-orders' && profile && (
        <section>
          <h3 className="text-[12px] font-bold mb-4" style={{ color: 'var(--ink)' }}>Your Orders</h3>
          {orders.length === 0 ? (
            <div style={s.card} className="text-center py-12">
              <Package className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--muted)', opacity: 0.3 }} />
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No orders yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => {
                const isBuyer = order.buyer_id === profile.id
                const statusCfg = ORDER_STATUSES[order.status] || { label: order.status, color: 'var(--muted)' }
                return (
                  <div key={order.id} style={s.card}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>{order.listings?.title || 'Listing'}</p>
                        <p className="text-[11px]" style={{ color: 'var(--muted)' }}>KSh {order.total_price.toLocaleString()} × {order.quantity}</p>
                      </div>
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: `color-mix(in oklab, ${statusCfg.color} 20%, transparent)`, color: statusCfg.color }}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] mb-3" style={{ color: 'var(--muted)' }}>
                      <span>{isBuyer ? `Seller: ${order.seller?.full_name || order.seller?.username || 'Unknown'}` : `Buyer: ${order.buyer?.full_name || order.buyer?.username || 'Unknown'}`}</span>
                      <span>{new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                    {order.delivery_address && <p className="text-[10px] mb-2" style={{ color: 'var(--muted)' }}>📍 {order.delivery_address} {order.contact_phone && `📞 ${order.contact_phone}`}</p>}
                    <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
                      {isBuyer && order.status === 'pending' && (
                        <button onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')} style={{ ...s.btn, padding: '7px 14px', fontSize: 10, background: 'color-mix(in oklab, var(--red) 15%, var(--surface))', color: 'var(--red)' }}>Cancel</button>
                      )}
                      {!isBuyer && order.status === 'pending' && (
                        <button onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')} style={{ ...s.btn, padding: '7px 14px', fontSize: 10, background: 'color-mix(in oklab, var(--blue) 15%, var(--surface))', color: 'var(--blue)' }}><Check className="w-3 h-3" /> Confirm</button>
                      )}
                      {!isBuyer && order.status === 'confirmed' && (
                        <button onClick={() => handleUpdateOrderStatus(order.id, 'shipped')} style={{ ...s.btn, padding: '7px 14px', fontSize: 10, background: 'color-mix(in oklab, var(--earth) 15%, var(--surface))', color: 'var(--earth)' }}><Truck className="w-3 h-3" /> Mark Shipped</button>
                      )}
                      {isBuyer && order.status === 'shipped' && (
                        <button onClick={() => handleUpdateOrderStatus(order.id, 'delivered')} style={{ ...s.btn, padding: '7px 14px', fontSize: 10, background: 'color-mix(in oklab, var(--green) 15%, var(--surface))', color: 'var(--green)' }}><Check className="w-3 h-3" /> Received</button>
                      )}
                      {isBuyer && order.status === 'delivered' && (
                        <span className="text-[10px]" style={{ color: 'var(--green)' }}>✓ Delivered</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {tab === 'my-listings' && profile && (
        <section>
          <h3 className="text-[12px] font-bold mb-4" style={{ color: 'var(--ink)' }}>My Listings ({myListings.length})</h3>
          {myListings.length === 0 ? (
            <div style={s.card} className="text-center py-12">
              <Package className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--muted)', opacity: 0.3 }} />
              <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>You haven't listed anything yet</p>
              <button onClick={() => setShowCreate(true)} style={{ ...s.btn, ...s.primaryBtn }}><Plus className="w-4 h-4" /> Create listing</button>
            </div>
          ) : (
            <div className="space-y-3">
              {myListings.map(item => (
                <div key={item.id} style={s.card} className="flex gap-4">
                  <div className="w-[80px] h-[80px] rounded-[10px] flex-shrink-0 overflow-hidden" style={{ background: 'var(--raised)' }}>
                    {item.images && item.images.length > 0 ? <img src={item.images[0]} alt="" className="w-full h-full object-cover" /> : <Package className="w-6 h-6" style={{ color: 'var(--muted)', opacity: 0.4 }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h3 className="text-[13px] font-bold truncate" style={{ color: 'var(--ink)' }}>{item.title}</h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: item.status === 'active' ? 'color-mix(in oklab, var(--green) 20%, var(--surface))' : 'color-mix(in oklab, var(--red) 20%, var(--surface))', color: item.status === 'active' ? 'var(--green)' : 'var(--red)' }}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-[14px] font-extrabold mt-0.5" style={{ color: 'var(--gold-text)' }}>KSh {item.price.toLocaleString()}</p>
                    <div className="flex items-center gap-3 text-[10px] mt-1" style={{ color: 'var(--muted)' }}>
                      <span><Eye className="w-3 h-3 inline" /> {item.views_count || 0}</span>
                      <span><ShoppingBag className="w-3 h-3 inline" /> {item.orders_count || 0} orders</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button onClick={() => openEdit(item)} style={{ ...s.btn, padding: '7px 14px', fontSize: 10, ...s.secondaryBtn }}>
                        <Upload className="w-3 h-3" /> Edit / Photos
                      </button>
                      <button onClick={() => setDetailItem(item)} style={{ ...s.btn, padding: '7px 14px', fontSize: 10, ...s.secondaryBtn }}>
                        <Eye className="w-3 h-3" /> View
                      </button>
                      <Link href={`/messages?user=${item.seller_id}`} style={{ ...s.btn, padding: '7px 14px', fontSize: 10, ...s.secondaryBtn }}>
                        <MessageCircle className="w-3 h-3" /> DM Seller
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Create Listing Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-center-scroll" style={{ background: 'color-mix(in oklab, var(--night) 70%, transparent)' }} onClick={() => setShowCreate(false)}>
          <div style={{ ...s.card, width: 'min(480px, 100%)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-base" style={{ color: 'var(--ink)' }}>List an Item</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>Title</label><input value={createForm.title} onChange={e => setCreateForm(p => ({ ...p, title: e.target.value }))} style={s.input} placeholder="What are you selling?" /></div>
              <div><label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>Description</label><textarea value={createForm.description} onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))} style={{ ...s.input, minHeight: 70, resize: 'vertical' }} placeholder="Describe your item..." rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>Price (KSh)</label><input type="number" value={createForm.price} onChange={e => setCreateForm(p => ({ ...p, price: e.target.value }))} style={s.input} placeholder="0" /></div>
                <div><label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>Category</label>
                  <select value={createForm.category} onChange={e => setCreateForm(p => ({ ...p, category: e.target.value }))} style={s.input}>
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>County</label>
                <select value={createForm.county} onChange={e => setCreateForm(p => ({ ...p, county: e.target.value }))} style={s.input}>
                  <option value="">Select county</option>
                  {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>Image (optional)</label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                {createForm.imagePreview ? (
                  <div className="relative rounded-[11px] overflow-hidden" style={{ background: 'var(--raised)' }}>
                    <img src={createForm.imagePreview} alt="Preview" className="w-full h-[160px] object-cover" />
                    <button onClick={() => { URL.revokeObjectURL(createForm.imagePreview); setCreateForm(p => ({ ...p, imageFile: null, imagePreview: '' })) }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full grid place-items-center" style={{ background: 'color-mix(in oklab, var(--night) 70%, transparent)', color: '#fff', border: 0, cursor: 'pointer' }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    style={{ ...s.input, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '20px', cursor: 'pointer', borderStyle: 'dashed' }}>
                    <ImageIcon className="w-5 h-5" style={{ color: 'var(--muted)' }} />
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>Tap to upload image</span>
                  </button>
                )}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--raised)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: 'var(--gold)' }} />
                  </div>
                )}
              </div>
              <button onClick={handleCreateListing} disabled={creating} style={{ ...s.btn, ...s.primaryBtn, width: '100%', justifyContent: 'center' }}>
                {creating ? 'Listing...' : 'Publish Listing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Listing Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-center-scroll" style={{ background: 'color-mix(in oklab, var(--night) 70%, transparent)' }} onClick={() => setEditItem(null)}>
          <div style={{ ...s.card, width: 'min(520px, 100%)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-base" style={{ color: 'var(--ink)' }}>Edit Listing</h3>
              <button onClick={() => setEditItem(null)} style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>Title</label><input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} style={s.input} /></div>
              <div><label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>Description</label><textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} style={{ ...s.input, minHeight: 70, resize: 'vertical' }} rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>Price (KSh)</label><input type="number" value={editForm.price} onChange={e => setEditForm(p => ({ ...p, price: e.target.value }))} style={s.input} /></div>
                <div><label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>Category</label>
                  <select value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))} style={s.input}>
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>County</label>
                  <select value={editForm.county} onChange={e => setEditForm(p => ({ ...p, county: e.target.value }))} style={s.input}>
                    <option value="">Select county</option>
                    {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>Status</label>
                  <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} style={s.input}>
                    <option value="active">Active</option>
                    <option value="sold">Sold</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>Photos ({editImages.length + newPhotos.length})</label>
                <input ref={editFileInputRef} type="file" accept="image/*" multiple onChange={handleEditImageSelect} style={{ display: 'none' }} />
                {(editImages.length > 0 || newPhotos.length > 0) && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {editImages.map((url, i) => (
                      <div key={`e-${i}`} className="relative rounded-[10px] overflow-hidden h-[80px]" style={{ background: 'var(--raised)' }}>
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => removeExistingPhoto(url)} aria-label="Remove photo"
                          className="absolute top-1 right-1 w-6 h-6 rounded-full grid place-items-center" style={{ background: 'color-mix(in oklab, var(--night) 70%, transparent)', color: '#fff', border: 0, cursor: 'pointer' }}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {newPhotos.map((p, i) => (
                      <div key={`n-${i}`} className="relative rounded-[10px] overflow-hidden h-[80px]" style={{ background: 'var(--raised)' }}>
                        <img src={p.preview} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => removeNewPhoto(i)} aria-label="Remove photo"
                          className="absolute top-1 right-1 w-6 h-6 rounded-full grid place-items-center" style={{ background: 'color-mix(in oklab, var(--night) 70%, transparent)', color: '#fff', border: 0, cursor: 'pointer' }}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => editFileInputRef.current?.click()}
                  style={{ ...s.input, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '14px', cursor: 'pointer', borderStyle: 'dashed' }}>
                  <ImageIcon className="w-5 h-5" style={{ color: 'var(--muted)' }} />
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>Add more photos</span>
                </button>
              </div>
              <button onClick={handleSaveEdit} disabled={savingEdit} style={{ ...s.btn, ...s.primaryBtn, width: '100%', justifyContent: 'center' }}>
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buy Modal */}
      {buyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-center-scroll" style={{ background: 'color-mix(in oklab, var(--night) 70%, transparent)' }} onClick={() => setBuyItem(null)}>
          <div style={{ ...s.card, width: 'min(440px, 100%)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Buy: {buyItem.title}</h3>
              <button onClick={() => setBuyItem(null)} style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer' }}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-[18px] font-extrabold mb-4" style={{ color: 'var(--gold-text)' }}>KSh {buyItem.price.toLocaleString()}</p>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>Quantity</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setBuyForm(p => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))} style={{ ...s.chip, ...s.chipInactive, padding: '8px 12px' }}>-</button>
                  <span className="text-[15px] font-bold px-4" style={{ color: 'var(--ink)' }}>{buyForm.quantity}</span>
                  <button onClick={() => setBuyForm(p => ({ ...p, quantity: p.quantity + 1 }))} style={{ ...s.chip, ...s.chipInactive, padding: '8px 12px' }}>+</button>
                </div>
              </div>
              <div><label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>Phone number</label><input value={buyForm.phone} onChange={e => setBuyForm(p => ({ ...p, phone: e.target.value }))} style={s.input} placeholder="0712 345 678" /></div>
              <div><label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>Delivery address</label><textarea value={buyForm.address} onChange={e => setBuyForm(p => ({ ...p, address: e.target.value }))} style={{ ...s.input, minHeight: 60, resize: 'vertical' }} placeholder="Village, landmark, directions..." rows={2} /></div>
              <div><label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>Notes (optional)</label><input value={buyForm.notes} onChange={e => setBuyForm(p => ({ ...p, notes: e.target.value }))} style={s.input} placeholder="Any special instructions" /></div>
              <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--line)' }}>
                <span className="text-[13px]" style={{ color: 'var(--muted)' }}>Total: <strong className="text-[18px]" style={{ color: 'var(--gold-text)' }}>KSh {(buyItem.price * buyForm.quantity).toLocaleString()}</strong></span>
                <button onClick={handleBuy} disabled={buying} style={{ ...s.btn, ...s.primaryBtn }}>
                  {buying ? '...' : <><CreditCard className="w-4 h-4" /> Place Order</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Listing Detail Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-center-scroll" style={{ background: 'color-mix(in oklab, var(--night) 70%, transparent)' }} onClick={() => setDetailItem(null)}>
          <div style={{ ...s.card, width: 'min(520px, 100%)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base" style={{ color: 'var(--ink)' }}>{detailItem.title}</h3>
              <button onClick={() => setDetailItem(null)} style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer' }}><X className="w-5 h-5" /></button>
            </div>
            {detailItem.images && detailItem.images.length > 0 && (
              <div className="h-[200px] rounded-[12px] overflow-hidden mb-4" style={{ background: 'var(--raised)' }}>
                <img src={detailItem.images[0]} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <p className="text-[22px] font-extrabold mb-3" style={{ color: 'var(--gold-text)' }}>KSh {detailItem.price.toLocaleString()}</p>
            <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--ink)' }}>{detailItem.description || 'No description provided.'}</p>
            <div className="flex flex-wrap gap-3 text-[11px] mb-4" style={{ color: 'var(--muted)' }}>
              {detailItem.county && <span><MapPin className="w-3.5 h-3.5 inline" /> {detailItem.county}</span>}
              <span><Eye className="w-3.5 h-3.5 inline" /> {detailItem.views_count || 0} views</span>
              <span><ShoppingBag className="w-3.5 h-3.5 inline" /> {detailItem.orders_count || 0} sold</span>
              {detailItem.profiles && <span>by {detailItem.profiles.full_name || detailItem.profiles.username}</span>}
            </div>
            {detailItem.seller_rating > 0 && (
              <div className="flex items-center gap-1 mb-4">
                {[1,2,3,4,5].map(i => <Star key={i} className={`w-4 h-4 ${i <= Math.round(detailItem.seller_rating) ? 'fill-current' : ''}`} style={{ color: 'var(--gold)' }} />)}
                <span className="text-[11px] ml-1" style={{ color: 'var(--muted)' }}>{detailItem.seller_rating}</span>
              </div>
            )}
            {/* Reviews */}
            {reviews[detailItem.id]?.length > 0 && (
              <div className="mb-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
                <h4 className="text-[11px] font-bold mb-3" style={{ color: 'var(--ink)' }}>Reviews ({reviews[detailItem.id].length})</h4>
                {reviews[detailItem.id].map(r => (
                  <div key={r.id} className="mb-3 pb-3" style={{ borderBottom: '1px solid var(--line)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      {[1,2,3,4,5].map(i => <Star key={i} className={`w-3 h-3 ${i <= r.rating ? 'fill-current' : ''}`} style={{ color: 'var(--gold)' }} />)}
                      <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{r.reviewer?.full_name || r.reviewer?.username}</span>
                    </div>
                    {r.comment && <p className="text-[11px]" style={{ color: 'var(--muted)' }}>{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
              <button onClick={() => { setDetailItem(null); setBuyItem(detailItem) }} style={{ flex: 1, ...s.btn, ...s.primaryBtn, justifyContent: 'center' }}>
                <ShoppingBag className="w-4 h-4" /> Buy Now
              </button>
              <Link href={`/messages?user=${detailItem.seller_id}`} style={{ ...s.btn, ...s.secondaryBtn }} aria-label="Message seller">
                <MessageCircle className="w-4 h-4" />
              </Link>
              <button onClick={() => { toggleSave(detailItem.id); setDetailItem(null) }} style={{ ...s.btn, ...s.secondaryBtn }}>
                <Heart className={`w-4 h-4 ${savedIds.has(detailItem.id) ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-center-scroll" style={{ background: 'color-mix(in oklab, var(--night) 70%, transparent)' }} onClick={() => setReviewOrder(null)}>
          <div style={{ ...s.card, width: 'min(400px, 100%)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Rate your purchase</h3>
              <button onClick={() => setReviewOrder(null)} style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer' }}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-[12px] mb-4" style={{ color: 'var(--muted)' }}>How was your experience with {reviewOrder.seller?.full_name || reviewOrder.seller?.username || 'the seller'}?</p>
            <div className="flex items-center gap-2 mb-4 justify-center">
              {[1,2,3,4,5].map(i => (
                <button key={i} onClick={() => setReviewRating(i)} style={{ background: 'none', border: 0, cursor: 'pointer' }}>
                  <Star className={`w-8 h-8 ${i <= reviewRating ? 'fill-current' : ''}`} style={{ color: i <= reviewRating ? 'var(--gold)' : 'var(--line)' }} />
                </button>
              ))}
            </div>
            <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} style={{ ...s.input, minHeight: 80, marginBottom: 16 }} placeholder="Tell others about your experience..." rows={3} />
            <button onClick={handleSubmitReview} style={{ ...s.btn, ...s.primaryBtn, width: '100%', justifyContent: 'center' }}>Submit Review</button>
          </div>
        </div>
      )}
    </div>
  )
}
