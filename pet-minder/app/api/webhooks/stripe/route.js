import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// IMPORTANT: must export this to disable body parsing for webhook signature verification
export const dynamic = 'force-dynamic'

export async function POST(req) {
  const body = await req.text()
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature error:', err)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const session = event.data.object
  const userId = session.metadata?.user_id

  if (!userId) {
    return Response.json({ error: 'No user_id in metadata' }, { status: 400 })
  }

  if (event.type === 'identity.verification_session.verified') {
    // Identity confirmed - update verification record and minder profile
    await supabase
      .from('verification_records')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString()
      })
      .eq('stripe_session_id', session.id)
      .eq('user_id', userId)

    // Update minder profile verification status
    await supabase
      .from('minder_profiles')
      .update({ is_verified: true })
      .eq('user_id', userId)

  } else if (event.type === 'identity.verification_session.requires_input') {
    // Verification failed - update verification record and minder profile
    await supabase
      .from('verification_records')
      .update({ status: 'unverified' })
      .eq('stripe_session_id', session.id)
      .eq('user_id', userId)

    // Update minder profile verification status
    await supabase
      .from('minder_profiles')
      .update({ is_verified: false })
      .eq('user_id', userId)
  }

  return Response.json({ received: true })
}