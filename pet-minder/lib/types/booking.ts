// ─── Booking Request (created by Dev 5 / Pet Owner flow) ──────────────────
export type BookingRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled'

export type BookingRequest = {
  id: string
  owner_id: string
  minder_id: string
  requested_date_time: string    // ISO string
  duration_minutes: number
  care_instructions: string | null
  status: BookingRequestStatus
  created_at: string
  // Joined fields (from .select with relationships)
  owner?: {
    full_name: string
    email: string
  }
  booking_pets?: {
    pet_profiles: {
      id: string
      name: string
      pet_type: string
      medical_info: string | null
      dietary_requirements: string | null
    }
  }[]
}

// ─── Confirmed Booking (created when minder accepts a request) ────────────
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export type Booking = {
  id: string
  request_id: string
  owner_id: string
  minder_id: string
  start_date_time: string
  end_date_time: string
  care_instructions: string | null
  status: BookingStatus
  cancellation_deadline: string
  cancelled_at: string | null
  completed_at: string | null
  created_at: string
  activity?: Activity | null
  owner?: { full_name: string }
  booking_pets?: {
    pet_profiles: {
      id: string
      name: string
      pet_type: string
    }
  }[]
}

// ─── Activity / Session (one per booking) ────────────────────────────────
export type SessionStatus = 'started' | 'ongoing' | 'completed'

export type TrackingPoint = {
  lat: number
  lng: number
  timestamp: string
}

export type Activity = {
  id: string
  booking_id: string
  session_status: SessionStatus
  session_log: string | null
  live_tracking_data: TrackingPoint[]
  recorded_at: string | null
}