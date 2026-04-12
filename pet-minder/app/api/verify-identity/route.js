import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const { userId } = await req.json()

    if (!userId) {
      return Response.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Create a Stripe Identity verification session
    const session = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: {
        user_id: userId // attach so we can match in webhook
      },
      options: {
        document: {
          allowed_types: ['driving_license', 'passport', 'id_card'],
          require_live_capture: true,
          require_matching_selfie: true
        }
      }
    })

    // Save a pending record to DB immediately
    await supabase.from('verification_records').insert({
      user_id: userId,
      type: 'identity',
      status: 'pending',
      stripe_session_id: session.id
    })

    // Return client_secret — needed to open Stripe modal on frontend
    return Response.json({ clientSecret: session.client_secret })

  } catch (err) {
    console.error('Stripe session error:', err)
    return Response.json({ error: 'Failed to create verification session' }, { status: 500 })
  }
}