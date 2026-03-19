# Pet Minder — Design System

> **For AI agents (Cursor):** This document is the authoritative design reference for the Pet Minder app.
> When building any UI, follow this file exactly. Do not invent colours, spacing, or component patterns — use what is defined here.
> Stack: **Next.js 14 App Router · TypeScript · Tailwind CSS v3 · shadcn/ui (New York) · Supabase · next-themes · lucide-react**

---

## Design Principles

Apply these to every screen you build:

1. **Calm, not exciting.** This is a safety-critical app. Generous white space. Subtle animations only.
2. **Status is always visible.** Booking states, session states, and live tracking should be immediately legible — never buried.
3. **Role-aware.** Pet Owner and Pet Minder have different dashboards and flows. Never mix them.
4. **Mobile-first.** Build for 375px width first. Enhance for `md:` (768px) and `lg:` (1024px).
5. **Trust through clarity.** Every label, button, and empty state should reduce anxiety, not create it.

---

## 1. Project Setup

Run these commands once when initialising the project:

```bash
npx create-next-app@latest pet-minder --typescript --tailwind --eslint --app --src-dir
cd pet-minder

# shadcn — choose New York style, Neutral base colour, CSS variables: yes
npx shadcn@latest init

# Core dependencies
npm install geist next-themes @supabase/supabase-js @supabase/ssr

# shadcn components used in this app
npx shadcn@latest add button card input label badge avatar separator sheet dialog dropdown-menu toast skeleton tabs
```

---

## 2. File: `src/lib/fonts.ts`

```ts
import { Geist } from 'geist/font/sans'
import { DM_Serif_Display } from 'next/font/google'

export const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
})
```

---

## 3. File: `src/app/layout.tsx`

```tsx
import type { Metadata } from 'next'
import { geist, dmSerif } from '@/lib/fonts'
import { ThemeProvider } from 'next-themes'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pet Minder',
  description: 'Find trusted pet care, near you.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${dmSerif.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

---

## 4. File: `src/app/globals.css`

Replace the entire file with this. Do not modify the HSL values — they are calibrated for WCAG AA contrast.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* shadcn semantic tokens — bare HSL channels, no hsl() wrapper */
    --background:         60 11% 97%;
    --foreground:         40 6% 10%;
    --card:               0 0% 100%;
    --card-foreground:    40 6% 10%;
    --popover:            0 0% 100%;
    --popover-foreground: 40 6% 10%;
    --primary:            158 68% 29%;
    --primary-foreground: 0 0% 100%;
    --secondary:          60 8% 93%;
    --secondary-foreground: 40 5% 29%;
    --muted:              60 8% 93%;
    --muted-foreground:   40 4% 47%;
    --accent:             60 8% 93%;
    --accent-foreground:  40 6% 10%;
    --destructive:        4 63% 46%;
    --destructive-foreground: 0 0% 100%;
    --border:             60 6% 77%;
    --input:              60 8% 93%;
    --ring:               158 68% 29%;
    --radius:             0.625rem;

    /* Extended palette — used via Tailwind custom colours */
    --teal-50:  #EEF8F6;
    --teal-100: #D6EFEB;
    --teal-300: #4DA892;
    --teal-500: #1A7A66;
    --teal-700: #0F5C4E;
    --teal-900: #0D3D35;

    --amber-100: #FDF0E0;
    --amber-300: #F4BC82;
    --amber-500: #E8933A;

    --success-100: #D4EDDF;
    --success-500: #2E7D52;
    --danger-100:  #FAE0DE;
    --danger-500:  #C0392B;
    --warning-100: #FDF3D0;
    --warning-500: #B8860B;
    --info-100:    #D6EAF8;
    --info-500:    #2471A3;
  }

  .dark {
    --background:         40 5% 7%;
    --foreground:         55 10% 94%;
    --card:               40 5% 11%;
    --card-foreground:    55 10% 94%;
    --popover:            40 5% 11%;
    --popover-foreground: 55 10% 94%;
    --primary:            161 57% 40%;
    --primary-foreground: 0 0% 100%;
    --secondary:          40 4% 18%;
    --secondary-foreground: 55 10% 80%;
    --muted:              40 4% 18%;
    --muted-foreground:   40 4% 55%;
    --accent:             40 4% 18%;
    --accent-foreground:  55 10% 94%;
    --destructive:        4 63% 55%;
    --destructive-foreground: 0 0% 100%;
    --border:             40 4% 18%;
    --input:              40 4% 18%;
    --ring:               161 57% 40%;

    --teal-50:  #0D3D35;
    --teal-100: #0D3D35;
    --teal-300: #1A7A66;
    --teal-500: #2A9E86;
    --teal-700: #4DA892;
    --teal-900: #D6EFEB;

    --success-100: #0D2E1C;
    --success-500: #4CAF79;
    --danger-100:  #2E0D0A;
    --danger-500:  #E05A4E;
    --warning-100: #2A1F00;
    --warning-500: #D4A017;
    --info-100:    #0A1E30;
    --info-500:    #4A9FD4;
  }

  * { @apply border-border; }

  body { @apply bg-background text-foreground font-sans antialiased; }

  /* Display font on headings */
  h1, h2 { font-family: var(--font-display); }
}

@layer utilities {
  /* Live GPS pulse — used on the position marker dot */
  @keyframes live-pulse {
    0%, 100% { transform: scale(1);   opacity: 0.6; }
    50%       { transform: scale(1.5); opacity: 0; }
  }
  /* Active booking card amber glow */
  @keyframes card-glow {
    0%, 100% { box-shadow: 0 0 0 0   rgba(232, 147, 58, 0); }
    50%       { box-shadow: 0 0 0 4px rgba(232, 147, 58, 0.3); }
  }
  /* Skeleton loading shimmer */
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }

  @media (prefers-reduced-motion: no-preference) {
    .animate-live-pulse { animation: live-pulse 1.5s ease-in-out infinite; }
    .animate-card-glow  { animation: card-glow  2s   ease-in-out infinite; }
    .animate-shimmer    { animation: shimmer    1.8s ease-in-out infinite; }
  }

  .animate-shimmer {
    background: linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted) / 0.5) 50%, hsl(var(--muted)) 75%);
    background-size: 200% 100%;
  }
}
```

---

## 5. File: `tailwind.config.ts`

Replace entirely:

```ts
import type { Config } from 'tailwindcss'
import { fontFamily } from 'tailwindcss/defaultTheme'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/app/**/*.{ts,tsx}',
  ],
  theme: {
    container: { center: true, padding: '1.5rem', screens: { '2xl': '1400px' } },
    extend: {
      colors: {
        /* shadcn semantic — required, do not rename */
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary:     { DEFAULT: 'hsl(var(--primary))',     foreground: 'hsl(var(--primary-foreground))' },
        secondary:   { DEFAULT: 'hsl(var(--secondary))',   foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted:       { DEFAULT: 'hsl(var(--muted))',       foreground: 'hsl(var(--muted-foreground))' },
        accent:      { DEFAULT: 'hsl(var(--accent))',      foreground: 'hsl(var(--accent-foreground))' },
        popover:     { DEFAULT: 'hsl(var(--popover))',     foreground: 'hsl(var(--popover-foreground))' },
        card:        { DEFAULT: 'hsl(var(--card))',        foreground: 'hsl(var(--card-foreground))' },

        /* Brand palette — adapts to dark mode via CSS vars */
        teal: {
          50:  'var(--teal-50)',
          100: 'var(--teal-100)',
          300: 'var(--teal-300)',
          500: 'var(--teal-500)',
          700: 'var(--teal-700)',
          900: 'var(--teal-900)',
        },
        amber:   { 100: 'var(--amber-100)',   300: 'var(--amber-300)',   500: 'var(--amber-500)' },
        success: { 100: 'var(--success-100)', 500: 'var(--success-500)' },
        danger:  { 100: 'var(--danger-100)',  500: 'var(--danger-500)'  },
        warning: { 100: 'var(--warning-100)', 500: 'var(--warning-500)' },
        info:    { 100: 'var(--info-100)',     500: 'var(--info-500)'    },
      },
      fontFamily: {
        sans:    ['var(--font-sans)',    ...fontFamily.sans],
        display: ['var(--font-display)', ...fontFamily.serif],
      },
      fontSize: {
        xs:    ['0.6875rem', { lineHeight: '1.3', letterSpacing: '0.05em' }],
        sm:    ['0.75rem',   { lineHeight: '1.4' }],
        base:  ['0.875rem',  { lineHeight: '1.5' }],
        lg:    ['1rem',      { lineHeight: '1.5' }],
        xl:    ['1.125rem',  { lineHeight: '1.4' }],
        '2xl': ['1.375rem',  { lineHeight: '1.3' }],
        '3xl': ['1.75rem',   { lineHeight: '1.25' }],
        '4xl': ['2.25rem',   { lineHeight: '1.2' }],
      },
      borderRadius: {
        sm:   '6px',
        md:   'var(--radius)',
        lg:   'calc(var(--radius) + 4px)',
        xl:   'calc(var(--radius) + 10px)',
        full: '9999px',
      },
      boxShadow: {
        card:        '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
        'card-hover':'0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(26,122,102,0.2)',
      },
      maxWidth: {
        content: '1200px',
        narrow:  '480px',
        medium:  '720px',
      },
      keyframes: {
        'live-pulse': { '0%,100%': { transform: 'scale(1)',   opacity: '0.6' }, '50%': { transform: 'scale(1.5)', opacity: '0' } },
        'card-glow':  { '0%,100%': { boxShadow: '0 0 0 0 rgba(232,147,58,0)' }, '50%': { boxShadow: '0 0 0 4px rgba(232,147,58,0.3)' } },
        shimmer:      { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        'live-pulse': 'live-pulse 1.5s ease-in-out infinite',
        'card-glow':  'card-glow  2s   ease-in-out infinite',
        shimmer:      'shimmer    1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
```

---

## 6. Supabase Client Setup

### File: `src/lib/supabase/client.ts`
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### File: `src/lib/supabase/server.ts`
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()         { return cookieStore.getAll() },
        setAll(toSet)    { try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )
}
```

### File: `src/middleware.ts`
```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()      { return request.cookies.getAll() },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          toSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect all /dashboard routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect logged-in users away from auth pages
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

### Environment variables (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 7. Database Schema Reference

The Supabase database has these tables. Use the Supabase MCP to inspect columns and relationships before writing queries.

| Table | Purpose |
|---|---|
| `users` | Auth accounts. `id` matches `auth.users.id`. Columns: `email`, `full_name`, `location` (PostGIS point), `two_factor_enabled`, `is_active`, `created_at`, `updated_at`, `deleted_at` |
| `roles` | Links a user to `owner` or `minder` role. A user can have both. Soft-deleted via `deleted_at`. |
| `pet_profiles` | Pets owned by a user. FK: `owner_id → users.id`. Columns: `name`, `pet_type`, `age`, `medical_info`, `dietary_requirements`. Soft-deleted. |
| `minder_profiles` | Extended minder data. FK: `user_id → users.id`. Columns: `service_description`, `supported_pet_types` (text[]), `service_pricing`, `is_verified`, `average_rating`. Soft-deleted. |
| `minder_availability` | Weekly recurring slots. FK: `minder_id → minder_profiles.id`. Columns: `day_of_week` (enum), `start_time`, `end_time`. |
| `booking_requests` | Owner's intent to book. Status enum: `pending \| accepted \| declined \| cancelled`. |
| `bookings` | Confirmed booking. Created when a request is accepted. Status enum: `pending \| confirmed \| cancelled \| completed`. Has `cancellation_deadline`, `cancelled_at`, `completed_at`. |
| `booking_pets` | Junction: which pets are in a booking. PK: `(booking_id, pet_id)`. |
| `activities` | One per booking. `live_tracking_data` is JSONB array of `{lat, lng, timestamp}`. `session_status` enum: `started \| ongoing \| completed`. |
| `reviews` | Bidirectional. `reviewer_id` and `reviewee_id` both FK to `users.id`. Max 2 per booking. `is_moderated` boolean. |
| `admin_logs` | Append-only audit log. Never updated or deleted. |

**Query pattern for active user session:**
```ts
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
// user.id matches users.id and roles.user_id
```

**Query pattern for user's role:**
```ts
const { data: roles } = await supabase
  .from('roles')
  .select('role_type')
  .eq('user_id', user.id)
  .is('deleted_at', null)
```

---

## 8. Auth Pages

### Login page — `src/app/(auth)/login/page.tsx`

- Route: `/login`
- Layout: centred card, `max-w-narrow` (480px), white card on warm background
- Uses Supabase email+password auth
- On success → redirect to `/dashboard`
- Link to `/signup`

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-narrow shadow-card">
        <CardHeader className="space-y-1 pb-2">
          <h1 className="font-display text-3xl text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your Pet Minder account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-danger-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            No account? <a href="/signup" className="text-primary hover:underline">Sign up</a>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
```

### Sign-up page additions

On sign-up, after `supabase.auth.signUp()` succeeds, also insert a row into `users` and the chosen `roles`:

```ts
const supabase = createClient()
const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
if (!authError && authData.user) {
  // Insert into public.users (triggers/RLS must allow this)
  await supabase.from('users').insert({
    id: authData.user.id,
    email,
    full_name: fullName,
  })
  // Insert chosen role(s)
  await supabase.from('roles').insert({ user_id: authData.user.id, role_type: selectedRole })
}
```

### Sign-out

```ts
const supabase = createClient()
await supabase.auth.signOut()
router.push('/')
router.refresh()
```

---

## 9. Component Patterns

### StatusBadge — `src/components/ui/status-badge.tsx`

```tsx
import { cn } from '@/lib/utils'

type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'

const config: Record<BookingStatus, { label: string; className: string }> = {
  pending:   { label: 'Pending',   className: 'bg-warning-100  text-warning-500  border-warning-500/20' },
  confirmed: { label: 'Confirmed', className: 'bg-info-100     text-info-500     border-info-500/20' },
  active:    { label: 'Live',      className: 'bg-amber-100    text-amber-500    border-amber-500/20 animate-card-glow' },
  completed: { label: 'Completed', className: 'bg-success-100  text-success-500  border-success-500/20' },
  cancelled: { label: 'Cancelled', className: 'bg-muted        text-muted-foreground border-transparent' },
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  const { label, className } = config[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide border', className)}>
      {status === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-live-pulse" />}
      {label}
    </span>
  )
}
```

### Button variants — extend `src/components/ui/button.tsx`

Add `live` to the `variant` cva map:

```ts
live: 'bg-amber-500 text-white hover:bg-amber-500/90 animate-card-glow',
```

Ensure all button sizes use `h-11` (44px) as default for touch targets.

### Skeleton — `src/components/ui/skeleton.tsx`

```tsx
import { cn } from '@/lib/utils'
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-md animate-shimmer bg-muted', className)} {...props} />
}
```

### ThemeToggle — `src/components/theme-toggle.tsx`

```tsx
'use client'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
```

---

## 10. Page Layouts

### Landing page structure (`src/app/page.tsx`)

- Full-width, `bg-background`
- Nav: logo left (`font-display text-xl`), CTA buttons right (`Sign in` + `Get started`)
- Hero: `font-display text-4xl` heading, subtitle `text-lg text-muted-foreground`, two CTAs
- Feature cards: 3-column grid on `md:`, single column on mobile. Use `bg-card shadow-card`.
- No coloured hero backgrounds — keep it clean and trustworthy

### Dashboard layout (`src/app/dashboard/layout.tsx`)

- Desktop: left sidebar `w-60`, main content `flex-1 bg-background`
- Mobile: bottom nav bar `h-16 fixed bottom-0`, content padded `pb-20`
- Sidebar active nav item: `bg-teal-100 text-teal-700 rounded-lg`
- Sidebar inactive: `text-muted-foreground hover:bg-secondary rounded-lg`

### Auth layout (`src/app/(auth)/layout.tsx`)

- Centred single-column, `min-h-screen bg-background flex items-center justify-center`
- No sidebar or nav
- Logo at top of card

---

## 11. Typography Rules

| Element | Classes |
|---|---|
| Page title / hero | `font-display text-4xl text-foreground` |
| Section heading | `font-display text-3xl text-foreground` |
| Card / modal heading | `text-2xl font-medium text-foreground` |
| Subsection / name | `text-xl font-medium text-foreground` |
| Body copy | `text-lg text-foreground` |
| UI labels | `text-base text-foreground` (default) |
| Meta / timestamps | `text-sm text-muted-foreground` |
| Badges / chips | `text-xs font-medium uppercase tracking-wide` |

- `h1`, `h2` automatically use DM Serif Display (set in `globals.css`)
- Never use `font-bold` (`font-weight: 700`) — use `font-medium` (500) as the strong weight
- Never go below `text-xs` (11px)

---

## 12. Colour Usage Rules

| Situation | Classes to use |
|---|---|
| Page background | `bg-background` |
| Card / panel surface | `bg-card` |
| Card default shadow | `shadow-card` |
| Card on hover | `hover:shadow-card-hover hover:border-teal-300 transition-all duration-150` |
| Primary action button | `<Button>` (default variant = teal) |
| Outline / secondary button | `<Button variant="outline">` |
| Live session button | `<Button variant="live">` |
| Input field | `<Input>` — `bg-input` applied automatically |
| Section divider | `border-border` |
| Tinted section bg | `bg-teal-50` or `bg-teal-100` |
| Live / active accent | `bg-amber-100 text-amber-500` |
| Success state | `bg-success-100 text-success-500` |
| Error / destructive | `bg-danger-100 text-danger-500` |
| Warning / pending | `bg-warning-100 text-warning-500` |
| Info / confirmed | `bg-info-100 text-info-500` |
| Avatar | `rounded-full` |
| Verified minder icon | `ShieldCheck` with `text-success-500` |

---

## 13. Live Session UI

When `activities.session_status = 'ongoing'`, the booking card must show the live state:

```tsx
<Card className={cn(
  'shadow-card transition-all duration-150',
  isLive && 'border-amber-500/50 animate-card-glow'
)}>
  <CardHeader className="flex flex-row items-center gap-3">
    <StatusBadge status="active" />
    <span className="text-sm text-muted-foreground">Walk in progress</span>
  </CardHeader>
  {/* Map area — use react-leaflet or mapbox-gl */}
  <div className="mx-4 mb-4 h-48 rounded-lg bg-teal-50 relative overflow-hidden">
    {/* GPS pulse marker */}
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center">
      <span className="absolute h-6 w-6 rounded-full bg-amber-500/40 animate-live-pulse" />
      <span className="relative z-10 h-3 w-3 rounded-full bg-amber-500" />
    </div>
  </div>
  <CardContent>
    {/* Activity log: timestamped list, text-sm text-muted-foreground */}
  </CardContent>
</Card>
```

Live tracking data is in `activities.live_tracking_data` — a JSONB array of `{ lat: number, lng: number, timestamp: string }`. Subscribe via Supabase Realtime:

```ts
supabase
  .channel(`activity:${bookingId}`)
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'activities', filter: `booking_id=eq.${bookingId}` }, payload => {
    setTrackingData(payload.new.live_tracking_data)
  })
  .subscribe()
```

---

## 14. Iconography

Import from `lucide-react`. Size via Tailwind `size-*` classes.

| Size | Class | Context |
|---|---|---|
| 16px | `size-4` | Inside buttons, inline with text |
| 20px | `size-5` | Navigation sidebar / bottom bar |
| 24px | `size-6` | Card feature icons, empty states |
| 48px | `size-12` | Onboarding illustrations |

Stroke width: always default (1.5px). Never use filled variants.

| Concept | Icon name |
|---|---|
| Pet profile | `PawPrint` |
| Dog walking | `Footprints` |
| Pet sitting | `Home` |
| Live tracking (amber pulse) | `MapPin` |
| Booking | `CalendarCheck` |
| Availability | `Clock` |
| Reviews / rating | `Star` |
| Verified minder | `ShieldCheck` |
| Activity log | `ClipboardList` |
| Care instructions | `NotebookPen` |
| Admin | `Settings2` |
| Dashboard | `LayoutDashboard` |
| Search | `Search` |
| User / profile | `User` |
| Sign out | `LogOut` |

---

## 15. Route Structure

```
src/app/
├── page.tsx                          # Landing page (public)
├── layout.tsx                        # Root layout — fonts + ThemeProvider
├── globals.css
├── (auth)/
│   ├── layout.tsx                    # Centred auth layout, no sidebar
│   ├── login/page.tsx
│   └── signup/page.tsx
└── dashboard/
    ├── layout.tsx                    # Sidebar (desktop) + bottom nav (mobile)
    ├── page.tsx                      # Dashboard home — role-aware
    ├── bookings/
    │   ├── page.tsx                  # Booking list
    │   └── [id]/page.tsx             # Booking detail + live session
    ├── pets/
    │   └── page.tsx                  # Pet profiles (owner only)
    ├── minder/
    │   └── page.tsx                  # Minder profile + availability (minder only)
    ├── search/
    │   └── page.tsx                  # Find a minder (owner only)
    └── admin/
        └── page.tsx                  # Admin panel (admin role only)
```

---

## 16. Voice & Tone

Apply to all copy written in components:

- **Warm but competent.** "Your booking is confirmed" — not "Yay, you're all set! 🎉"
- **Direct labels.** "Confirm booking" — not "Click here to proceed"
- **Calm empty states.** "No minders available for this time — try expanding your search radius." — not "Oops, nothing here!"
- **No emoji in functional UI.** Reserve for marketing copy only, even then sparingly.
- **Surface-level safety.** Say "Verified minder" in cards. Reserve the detail (what verification means) for the profile page.

---

*Stack: Next.js 14 App Router · TypeScript · Tailwind CSS v3 · shadcn/ui (New York) · Supabase (@supabase/ssr) · next-themes · lucide-react · Geist · DM Serif Display*