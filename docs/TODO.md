# Pet Minder — Project TODO

Stack: Next.js (React) · Supabase · Vercel

---

## Done

### Auth & Accounts
- [x] User registration (email + password) with role selection (owner / minder / both) — URF 1.1–1.3
- [x] Login and logout — URF 1.5, 1.6
- [x] Forgot password / update password flow
- [x] Account info update — URF 1.7
- [x] Delete account — URF 1.8
- [x] Role-based access control and feature gating — URF 1.10
- [x] Role mode switching (owner ↔ minder) within dashboard — URF 1.11
- [x] User location stored on profile — URF 1.9
- [x] Onboarding flow for new users

### Pet Owner — Pet Profiles
- [x] Create / edit / delete pet profiles — URF 2.1, 2.7, 2.8
- [x] Pet name, type, age, sex fields — URF 2.2, 2.3, 2.4
- [x] Medical info and dietary requirements fields — URF 2.5, 2.6

### Pet Minder — Profile Management
- [x] Create and manage minder professional profile (bio, qualifications, service description) — URF 3.1
- [x] Set supported pet types — URF 3.2
- [x] Set service pricing — URF 3.3
- [ ] Set availability schedule — URF 3.4
- [x] Minder workspace with profile editor and public-profile preview

### Search & Discovery
- [x] Search page: filter minders by name/keywords and pet type — URF 2.9, 2.12
- [x] Filter by verified status — URF 2.11 (partial)
- [x] Sort results by rating and price — URF 2.11
- [x] View individual minder public profile — URF 2.13
- [x] Verified minder badge display

### UI / Infrastructure
- [x] Responsive dashboard shell with sidebar navigation — URC 2.5
- [x] Dark / light theme toggle
- [x] Next.js + Supabase + Vercel stack set up — URC 3.3, 3.4
- [x] Fix UI issues on radius filter on minder-search

### Pet-Profile fix
- [x] Add a pet size section to a pet profile.

---

## To Do

### Booking System (core, must-have) - Harry & Canute
- [x] Full booking request flow: owner selects minder → picks date/time → submits request — URF 2.14, 2.15
- [x] Attach care instructions to a booking — URF 2.16
- [x] Minder views incoming booking requests — URF 3.5
- [x] Minder accepts or declines a booking request (with conflict check) — URF 3.6, URF 3.8
- [x] Booking confirmation stored in DB and shown in both users' accounts
- [x] Owner cancels a booking (≥ 3 days before) — URF 2.17, 2.19
- [x] Minder cancels a confirmed booking (≥ 48 h before) — URF 3.7
- [x] Owner reschedules a booking before minder confirmation — URF 2.18
- [ ] Filter minder search results by availability — URF 2.10

### Sessions & Live Tracking - [On Hold For Now]
- [ ] Minder starts and ends a pet minding session — URF 3.9, 3.10
- [ ] Minder updates live activity tracking during a session — URF 3.12
- [ ] Owner views live activity tracking during an active session — URF 2.20
- [ ] Minder submits session activity log on completion — URF 3.11
- [ ] Owner views completed activity logs — URF 2.21

### Reviews & Ratings
- [x] Star rating (1–5) between owner and minder after a booking — URF 1.12
- [x] Written review on completed bookings — URF 1.13
- [x] Calculate and display average rating on minder profile — URF 1.14

### Map / Location Search [Rayyan]
- [x] Replace map placeholder with real map showing minder pins — URF 2.9
- [x] Location-radius filtering in search results — URF 2.9

### Admin Panel [Luqman]
- [x] Admin view of all registered users — URF 4.1
- [x] Suspend / deactivate user accounts — URF 4.2
- [x] Verify pet minder profiles before activation — URF 4.3
- [x] Resolve booking disputes — URF 4.4
- [x] Moderate and remove inappropriate reviews — URF 4.5
- [x] Log all admin actions with timestamps — URF 4.6

### Security & Constraints [TO DISCUSS]
- [ ] Two-factor authentication (2FA) on login — URF 1.4
- [ ] Account lockout after 5 consecutive failed login attempts — URC 1.5
- [ ] Automatic session expiry after 15 minutes of inactivity — URC 1.3

### Notifications [TO DISCUSS]
- [ ] Notify minder of new booking request
- [ ] Notify owner of booking acceptance or decline
