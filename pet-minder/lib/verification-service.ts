import { createClient } from '@/lib/supabase/server'

export async function getUserVerificationRecords(userId: string) {
  const supabase = await createClient()

  const { data: records, error } = await supabase
    .from('verification_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return { records: [] }
  }

  return { records: records || [] }
}

export async function getLatestVerificationRecord(userId: string, type: string = 'identity') {
  const supabase = await createClient()

  const { data: record, error } = await supabase
    .from('verification_records')
    .select('*')
    .eq('user_id', userId)
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    return { record: null }
  }

  return { record }
}

export async function updateMinderVerificationStatus(userId: string, isVerified: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('minder_profiles')
    .update({ is_verified: isVerified })
    .eq('user_id', userId)

  if (error) {
    console.error('Failed to update minder verification status:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function revokeUserVerification(userId: string, reason?: string) {
  const supabase = await createClient()

  // Update verification record to mark as revoked
  const { error: updateError } = await supabase
    .from('verification_records')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_reason: reason
    })
    .eq('user_id', userId)
    .eq('status', 'verified')

  if (updateError) {
    console.error('Failed to revoke verification:', updateError)
    return { success: false, error: updateError.message }
  }

  // Update minder profile to mark as unverified
  await updateMinderVerificationStatus(userId, false)

  return { success: true }
}