import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Mark verification as completed for this user
    const { error: updateError } = await supabase
      .from('user_verification_status')
      .update({
        verification_completed: true,
        requires_verification: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error marking verification complete:', updateError)
      return Response.json({ error: 'Failed to update verification status' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Mark verified error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}