// src/lib/services/booking-minder.ts
// ─────────────────────────────────────────────────────────────────────────────
// All Supabase queries for the Pet Minder side of the booking system.
// No UI code here — only data functions. Pages import from this file.
//
// Mirrors the pattern in src/lib/services/pet-profile.ts exactly:
//   - Every function takes `supabase: SupabaseClient` as first arg
//   - Returns { data, error } or { error } — never throws
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type { BookingRequest, Booking, TrackingPoint } from '@/lib/types/booking'

const REQUESTS_TABLE  = 'booking_requests'
const BOOKINGS_TABLE  = 'bookings'
const ACTIVITIES_TABLE = 'activities'

// ─── Booking Requests ─────────────────────────────────────────────────────────

/**
 * URF 3.5 — Load all PENDING booking requests sent to this minder.
 * Used on /dashboard/bookings/requests page.
 *
 * Joins: owner name + email, and each pet's profile details.
 * The minder_id here is minder_profiles.id (NOT users.id).
 */
export async function listBookingRequestsForMinder(
  supabase: SupabaseClient,
  minderId: string,
): Promise<{ data: BookingRequest[]; error: Error | null }> {
  const { data, error } = await supabase
    .from(REQUESTS_TABLE)
    .select(`
      *,
      owner:users!owner_id ( full_name, email ),
      booking_pets (
        pet_profiles ( id, name, pet_type, medical_info, dietary_requirements )
      )
    `)
    .eq('minder_id', minderId)
    .eq('status', 'pending')
    .order('requested_date_time', { ascending: true })

  if (error) return { data: [], error: new Error(error.message) }
  return { data: (data ?? []) as BookingRequest[], error: null }
}

/**
 * URF 3.6 — Accept a booking request.
 * This does three things in sequence:
 *   1. Creates a confirmed Booking row (start/end times, 48h cancellation deadline)
 *   2. Creates an Activity row for the session (session_status: 'started')
 *   3. Marks the BookingRequest as 'accepted'
 *
 * The minder_id here is minder_profiles.id (NOT users.id).
 */
export async function acceptBookingRequest(
  supabase: SupabaseClient,
  requestId: string,
  minderId: string,
): Promise<{ data: Booking | null; error: Error | null }> {
  // Step 1: fetch the request so we have dates + owner
  const { data: req, error: fetchErr } = await supabase
    .from(REQUESTS_TABLE)
    .select('*')
    .eq('id', requestId)
    .eq('minder_id', minderId)
    .single()

  if (fetchErr || !req) {
    return { data: null, error: new Error(fetchErr?.message ?? 'Request not found') }
  }

  const start    = new Date(req.requested_date_time)
  const end      = new Date(start.getTime() + req.duration_minutes * 60_000)
  const deadline = new Date(start.getTime() - 48 * 60 * 60_000)  // URF 2.17 / 3.7

  // Step 2: create the confirmed Booking
  const { data: booking, error: bookingErr } = await supabase
    .from(BOOKINGS_TABLE)
    .insert({
      request_id:            requestId,
      owner_id:              req.owner_id,
      minder_id:             minderId,
      start_date_time:       start.toISOString(),
      end_date_time:         end.toISOString(),
      care_instructions:     req.care_instructions,
      status:                'confirmed',
      cancellation_deadline: deadline.toISOString(),
    })
    .select('*')
    .single()

  if (bookingErr || !booking) {
    return { data: null, error: new Error(bookingErr?.message ?? 'Failed to create booking') }
  }

  // Step 3: create the Activity row — one per booking (class diagram composition)
  await supabase.from(ACTIVITIES_TABLE).insert({
    booking_id:         booking.id,
    session_status:     'started',       // not yet 'ongoing' — minder starts it manually
    live_tracking_data: [],
    session_log:        null,
  })

  // Step 4: mark the request as accepted
  await supabase
    .from(REQUESTS_TABLE)
    .update({ status: 'accepted' })
    .eq('id', requestId)

  return { data: booking as Booking, error: null }
}

/**
 * URF 3.6 — Decline a booking request.
 * Simply marks the request as 'declined'. Owner is notified via Realtime/UI.
 */
export async function declineBookingRequest(
  supabase: SupabaseClient,
  requestId: string,
  minderId: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from(REQUESTS_TABLE)
    .update({ status: 'declined' })
    .eq('id', requestId)
    .eq('minder_id', minderId)

  if (error) return { error: new Error(error.message) }
  return { error: null }
}

/**
 * hasConflict — sequence diagram step 6 (View Booking Requests).
 * Checks whether the minder already has a confirmed/pending booking that
 * overlaps with the requested time window.
 *
 * Returns true if there is a conflict, false if the slot is free.
 */
export async function hasConflict(
  supabase: SupabaseClient,
  minderId: string,
  requestedDateTime: string,
  durationMinutes: number,
): Promise<boolean> {
  const start = new Date(requestedDateTime)
  const end   = new Date(start.getTime() + durationMinutes * 60_000)

  const { data } = await supabase
    .from(BOOKINGS_TABLE)
    .select('id, start_date_time, end_date_time')
    .eq('minder_id', minderId)
    .in('status', ['confirmed', 'pending'])

  if (!data || data.length === 0) return false

  // Two ranges overlap when: start < existingEnd AND end > existingStart
  return data.some((b) => {
    const bStart = new Date(b.start_date_time)
    const bEnd   = new Date(b.end_date_time)
    return start < bEnd && end > bStart
  })
}

// ─── Confirmed Bookings ───────────────────────────────────────────────────────

/**
 * Load all non-cancelled bookings for this minder, newest first.
 * Used on /dashboard/bookings/[id] and the bookings list.
 *
 * Joins: owner name, pet profiles, and the activity session row.
 */
export async function listBookingsForMinder(
  supabase: SupabaseClient,
  minderId: string,
): Promise<{ data: Booking[]; error: Error | null }> {
  const { data, error } = await supabase
    .from(BOOKINGS_TABLE)
    .select(`
      *,
      owner:users!owner_id ( full_name ),
      booking_pets (
        pet_profiles ( id, name, pet_type )
      ),
      activity:activities (*)
    `)
    .eq('minder_id', minderId)
    .not('status', 'eq', 'cancelled')
    .order('start_date_time', { ascending: true })

  if (error) return { data: [], error: new Error(error.message) }
  return { data: (data ?? []) as Booking[], error: null }
}

// ─── Activity / Session ───────────────────────────────────────────────────────

/**
 * URF 3.9 — Start the pet minding session.
 * Changes session_status from 'started' → 'ongoing'.
 * Sets recorded_at to now so there's a timestamp for when it began.
 */
export async function startSession(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from(ACTIVITIES_TABLE)
    .update({
      session_status: 'ongoing',
      recorded_at:    new Date().toISOString(),
    })
    .eq('booking_id', bookingId)

  if (error) return { error: new Error(error.message) }
  return { error: null }
}

/**
 * URF 3.10 — End / terminate the session.
 * Changes session_status → 'completed' and marks the booking as completed too.
 */
export async function endSession(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<{ error: Error | null }> {
  // Update the activity row
  const { error: actErr } = await supabase
    .from(ACTIVITIES_TABLE)
    .update({ session_status: 'completed' })
    .eq('booking_id', bookingId)

  if (actErr) return { error: new Error(actErr.message) }

  // Also close the booking itself
  const { error: bookErr } = await supabase
    .from(BOOKINGS_TABLE)
    .update({
      status:       'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', bookingId)

  if (bookErr) return { error: new Error(bookErr.message) }
  return { error: null }
}

/**
 * URF 3.11 — Submit the session activity log.
 * Saves the minder's written summary to activities.session_log.
 */
export async function submitLog(
  supabase: SupabaseClient,
  bookingId: string,
  log: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from(ACTIVITIES_TABLE)
    .update({ session_log: log.trim() })
    .eq('booking_id', bookingId)

  if (error) return { error: new Error(error.message) }
  return { error: null }
}

/**
 * URF 3.12 — Push a new set of GPS tracking points to the activity row.
 * Replaces the entire live_tracking_data array with the new points
 * (Supabase JSONB — no array append support, so always send the full array).
 */
export async function updateTracking(
  supabase: SupabaseClient,
  bookingId: string,
  points: Omit<TrackingPoint, 'timestamp'>[],
): Promise<{ error: Error | null }> {
  const withTimestamps: TrackingPoint[] = points.map((p) => ({
    ...p,
    timestamp: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from(ACTIVITIES_TABLE)
    .update({ live_tracking_data: withTimestamps })
    .eq('booking_id', bookingId)

  if (error) return { error: new Error(error.message) }
  return { error: null }
}