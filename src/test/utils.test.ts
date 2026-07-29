import { describe, it, expect } from 'vitest'

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

describe('timeAgo', () => {
  it('returns "now" for recent dates', () => {
    expect(timeAgo(new Date().toISOString())).toBe('now')
  })

  it('returns minutes for recent past', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(timeAgo(fiveMinAgo)).toBe('5m ago')
  })

  it('returns hours for older dates', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    expect(timeAgo(twoHoursAgo)).toBe('2h ago')
  })

  it('returns days for old dates', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400 * 1000).toISOString()
    expect(timeAgo(threeDaysAgo)).toBe('3d ago')
  })
})

describe('getInitials', () => {
  it('returns ? for null', () => {
    expect(getInitials(null)).toBe('?')
  })

  it('returns ? for undefined', () => {
    expect(getInitials(undefined)).toBe('?')
  })

  it('returns first two initials', () => {
    expect(getInitials('John Doe')).toBe('JD')
  })

  it('returns single initial for single name', () => {
    expect(getInitials('Kenya')).toBe('K')
  })
})
