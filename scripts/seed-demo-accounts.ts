/**
 * Demo Account Seeding Script
 * Run: npx ts-node scripts/seed-demo-accounts.ts
 * 
 * This creates demo admin and user accounts for testing
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const demoAccounts = [
  {
    email: 'admin@kikwetuconnect.demo',
    password: 'Demo@Admin123',
    profile: {
      username: 'admin_demo',
      full_name: 'Admin Demo',
      county_hub: 'Nairobi',
      is_verified_expert: true,
      heshima_rating: 1000,
    },
  },
  {
    email: 'user@kikwetuconnect.demo',
    password: 'Demo@User123',
    profile: {
      username: 'user_demo',
      full_name: 'Demo User',
      county_hub: 'Mombasa',
      is_verified_expert: false,
      heshima_rating: 150,
    },
  },
  {
    email: 'expert@kikwetuconnect.demo',
    password: 'Demo@Expert123',
    profile: {
      username: 'expert_demo',
      full_name: 'Expert Demo',
      county_hub: 'Kisumu',
      is_verified_expert: true,
      heshima_rating: 750,
    },
  },
]

async function seedDemoAccounts() {
  console.log('🌱 Starting demo account seeding...\n')

  for (const account of demoAccounts) {
    try {
      // Create auth user
      console.log(`Creating user: ${account.email}`)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
      })

      if (authError) {
        console.error(`✗ Auth error for ${account.email}:`, authError.message)
        continue
      }

      if (!authData.user) {
        console.error(`✗ No user returned for ${account.email}`)
        continue
      }

      // Create profile
      console.log(`Creating profile for: ${account.profile.full_name}`)
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        ...account.profile,
      })

      if (profileError) {
        console.error(`✗ Profile error for ${account.email}:`, profileError.message)
        continue
      }

      console.log(`✓ Successfully created account for ${account.email}\n`)
    } catch (err) {
      console.error(`✗ Unexpected error for ${account.email}:`, err)
    }
  }

  console.log('✓ Demo account seeding complete!\n')
  console.log('Demo Credentials:')
  console.log('─'.repeat(50))
  demoAccounts.forEach((account) => {
    console.log(`Email: ${account.email}`)
    console.log(`Password: ${account.password}`)
    console.log(`Username: ${account.profile.username}`)
    console.log(`Role: ${account.profile.is_verified_expert ? 'Expert/Admin' : 'User'}`)
    console.log('─'.repeat(50))
  })
}

// Run with error handling
seedDemoAccounts().catch((err) => {
  console.error('Seeding failed:', err)
  process.exit(1)
})
