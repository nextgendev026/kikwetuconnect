export const COUNTIES = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Eldoret', 'Kitale', 'Nakuru', 'Thika', 'Kericho',
  'Isiolo', 'Garissa', 'Lamu', 'Wajir', 'Mandera', 'Kilifi', 'Kwale', 'Taita-Taveta',
  'Makueni', 'Kajiado', 'Narok', 'Bomet', 'Nyamira', 'Kisii', 'Homa Bay', 'Siaya',
  'Bungoma', 'Busia', 'Kakamega', 'Vihiga', 'Nandi', 'Baringo', 'West Pokot', 'Samburu',
  'Laikipia', 'Embu', 'Meru', 'Tharaka-Nithi', 'Nyeri', 'Murang\'a', 'Kirinyaga', 'Machakos',
  'Kiambu', 'Turkana', 'Trans Nzoia', 'Uasin Gishu',
] as const

export const TABS = [
  { id: 'for_you', label: 'For you' },
  { id: 'following', label: 'Following' },
  { id: 'near_you', label: 'Near you' },
  { id: 'latest', label: 'Latest' },
  { id: 'saved', label: 'Saved' },
] as const

export type TabId = (typeof TABS)[number]['id']

export const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'baraza', label: 'Baraza' },
  { id: 'article', label: 'Article' },
  { id: 'poll', label: 'Poll' },
] as const

export type TypeFilter = (typeof TYPE_FILTERS)[number]['id']

export const EMOJI_REACTIONS = ['🔥', '❤️', '😂', '😮', '😢', '🙏', '💡', '🗳️'] as const
