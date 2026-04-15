import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://drbeynfabvbydukjajrz.supabase.co'
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyYmV5bmZhYnZieWR1a2phanJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTA3OTQsImV4cCI6MjA5MDk4Njc5NH0.A2_fdtdCwQrLpi2OZ5lw-_n21QoFxYPtFSRa1ROuSuM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type ApiKey = {
  id: string
  name: string
  key: string
  created_at: string
}

export type UsageRecord = {
  date: string
  cyber: number
  video: number
  flow: number
  analytics: number
}

export type PlanInfo = {
  name: string
  price: string
  period: string
  quota: {
    cyber: number
    video: number
    flow: number
    analytics: number
  }
  features: string[]
}
