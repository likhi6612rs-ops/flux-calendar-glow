# Flux v8 — Tiered UPI Subscriptions, Verification & Admin Approval

Replaces the current mock localStorage paywall with a real database-backed tier system, a privacy-safe UPI payment flow, manual UTR verification, an admin approval dashboard, and an enhanced signup + email-verification gate.

## Decisions (please confirm)
- **Payment stays manual/mock** (consistent with project memory): no payment gateway charges money. Users pay via their own UPI app through a deep link, submit the UTR, and an admin manually approves. No card processing.
- **Email OTP is simulated**: no external email provider is configured, so the 6-digit code is generated and shown to the user in-app (demo banner/toast) rather than emailed. Same gated UX as a real OTP. Can be swapped to a real email later.
- **Admin = role-based + the hardcoded email** `likhi6612rs@gmail.com` (already seeded as `admin` in the DB). Admin always gets Ultra Pro and bypasses all paywalls.
- **VPA placeholder**: `yourVPA@bank` in one constant you can edit later.

## 1. Database (one migration)
Extend `profiles`:
- `full_name text`, `mobile text`
- `tier text not null default 'free'` — one of `free | premium | pro | ultra`
- `email_verified boolean not null default false`

New table `subscription_requests`:
- `id, user_id, tier, amount numeric, currency text, utr text (12 digits), status text default 'pending' (pending|approved|rejected), created_at, updated_at`
- GRANTs: authenticated + service_role.
- RLS: users insert/select their own; admins (`has_role`) select/update all.
Add admin UPDATE policy on `profiles` (via `has_role`) so approval can set a user's tier; plus update `handle_new_user` to store `full_name`/`mobile` from signup metadata.

## 2. Tier engine (`src/lib/premium.tsx` rewrite)
- Load the user's `tier` + `email_verified` from `profiles` on mount; admin → forced `ultra`.
- Tier ordering `free < premium < pro < ultra`; helper `hasTier(required)` and `guard(feature, requiredTier, action)`.
- `openPaywall(feature, requiredTier)`; expose `tier`, `isAdmin`.
- Remove auto-unlock localStorage upgrade. Unlock only happens when DB tier changes (admin approval).

## 3. UPI deep link + UTR flow (`PaywallModal.tsx` rewrite → checkout)
- **Pricing selector**: 3 tier cards with INR/USD toggle (₹99/$1.99, ₹199/$3.99, ₹399/$7.99) and per-tier feature lists. No phone number, no QR image anywhere.
- **Buy Now** builds `upi://pay?pa=yourVPA@bank&pn=AppPremium&am=<amount>&cu=INR` and triggers it via an `<a href>`/`window.location` so mobile opens the native intent picker with a fixed amount. (USD shown for display; the UPI `am` is always the INR amount + `cu=INR`, since UPI is INR-only.)
- After tapping pay, the modal transitions to a **verification state**: a 12-digit UTR input (validated `^\d{12}$`) → inserts a `subscription_requests` row and sets `profiles.sub`/keeps tier locked, status `pending_verification`. Shows a "pending review" confirmation. No auto-unlock.

## 4. Feature gatekeeping by tier
- **premium**: `MultiMonthCalendar` 12-month swipe + "Today" snap button.
- **pro**: + 30-day Procrastination Analytics (`ProcrastinationTracker`/`InsightsView` chart).
- **ultra**: + AI Task Breakdown (`TaskList`) + ambient soundscapes (`AmbientSounds`/`FocusPane`).
Each gated entry calls `guard(feature, requiredTier, action)` → opens the paywall preselected to the needed tier. Locked routes/modules render the paywall instead of the feature.

## 5. Enhanced signup + email verification gate (`auth.tsx` + new gate)
- Signup form adds **Full Name**, **Mobile** (country-code selector defaulting to **+91**), with strict zod validation; name/mobile passed as `signUp` user metadata → stored by `handle_new_user`.
- After signup, `email_verified=false`. A **VerificationGate** wraps the authenticated app: if `!email_verified` and not admin, show a 6-digit OTP screen (code generated client-side and surfaced in a demo banner). Correct code sets `email_verified=true`.

## 6. Admin Approval View (`admin.tsx`)
- New "Pending Approvals" section, admin-only, lists `subscription_requests` with status `pending` joined to profile: **Full Name, Email, Mobile, Tier, 12-digit UTR**.
- **Approve** (green): sets request `approved` + bumps that user's `profiles.tier` to the requested tier (admin RLS update). **Reject** (red): sets request `rejected`. Uses TanStack Query mutations with optimistic refetch.

## Security notes
- Tier is authoritative in the DB, never trusted from the client; gating is UX, the DB tier + RLS is the source of truth.
- Admin actions guarded by `has_role('admin')` RLS, not just the client email check.
- UTR validated client + server (zod) and length-limited.

## Files
- migration (profiles + subscription_requests + policies + handle_new_user)
- rewrite `src/lib/premium.tsx`
- rewrite `src/components/flux/PaywallModal.tsx` (pricing + UPI + UTR)
- new `src/components/flux/VerificationGate.tsx`
- edit `auth.tsx`, `_authenticated/index.tsx`, `admin.tsx`, `FluxApp.tsx`, `TaskList.tsx`, `ProcrastinationTracker.tsx`/`InsightsView.tsx`, `MultiMonthCalendar.tsx`, `AmbientSounds.tsx`/`FocusPane.tsx`
