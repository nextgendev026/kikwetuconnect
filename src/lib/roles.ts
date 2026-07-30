export const ROLES = {
  GENERAL: 'general',
  MEMBER: 'member',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const PLATFORM_ROLES: readonly Role[] = Object.values(ROLES) as readonly Role[]

export const SPACE_ROLES = {
  MEMBER: 'member',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
  OWNER: 'owner',
} as const

export type SpaceRole = (typeof SPACE_ROLES)[keyof typeof SPACE_ROLES]

export const NYUMBA_ROLES = {
  MEMBER: 'member',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
} as const

export type NyumbaRole = (typeof NYUMBA_ROLES)[keyof typeof NYUMBA_ROLES]

export function isAdmin(role: string | null | undefined): boolean {
  return role === ROLES.ADMIN
}

export function isModerator(role: string | null | undefined): boolean {
  return role === ROLES.MODERATOR
}

export function isStaff(role: string | null | undefined): boolean {
  return role === ROLES.ADMIN || role === ROLES.MODERATOR
}

export function canManageSpace(role: string | null | undefined): boolean {
  return role === SPACE_ROLES.ADMIN || role === SPACE_ROLES.OWNER || role === SPACE_ROLES.MODERATOR
}
