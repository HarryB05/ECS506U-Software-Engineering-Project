import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardHomeContent } from '@/components/dashboard-home-content'
import { DashboardPageIntro } from '@/components/dashboard-page-intro'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/login')
  }

  // Check if user has completed onboarding (has roles)
  const { data: roles, error: rolesError } = await supabase
    .from('roles')
    .select('created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)

  // If no roles found, user hasn't completed onboarding - redirect to onboarding
  if (!rolesError && (!roles || roles.length === 0)) {
    redirect('/onboarding')
  }

  // Check if user JUST completed onboarding (within last 5 minutes)
  const onboardingTime = roles?.[0]?.created_at ? new Date(roles[0].created_at) : null
  const now = new Date()
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

  // If roles were just created (new user who just onboarded) and they don't have verified ID, send to verify
  if (onboardingTime && onboardingTime > fiveMinutesAgo) {
    const { data: verifiedRecord } = await supabase
      .from('id_verifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('doc_type', 'identity')
      .eq('status', 'approved')
      .limit(1)

    // New user who hasn't verified yet
    if (!verifiedRecord || verifiedRecord.length === 0) {
      redirect('/verify')
    }
  }

  // Existing user or new user who already verified - allow dashboard access
  return (
    <div className="max-w-content mx-auto">
      <DashboardPageIntro />
      <DashboardHomeContent />
    </div>
  )
}
