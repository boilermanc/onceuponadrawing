# Comprehensive Code Review: Once Upon a Drawing

**Review Date:** January 20, 2026
**Reviewer:** Claude Code
**Project:** onceuponadrawing
**Status:** Pre-Migration Review

---

## Overview

This is a well-structured React + TypeScript PWA that transforms children's drawings into animated storybooks using Google Gemini AI. The architecture is clean, but there are several **critical issues** that must be addressed before running migrations or deploying to production.

### Tech Stack
- **Frontend:** React 19.2.3, TypeScript 5.8.2, Vite 6.2.0
- **Backend Services:** Supabase (Auth + Database + Storage)
- **AI Services:** Google Gemini, Veo (video generation)
- **Styling:** Tailwind CSS (CDN-loaded)
- **Email:** Resend (simulated)
- **PWA Support:** Service Worker + Manifest

---

## 🚨 CRITICAL Issues (Fix Before Production)

### 1. API Key Security Vulnerability
- [ ] **Status:** Not Fixed

**Location:** `vite.config.ts`

**Problem:** The `GEMINI_API_KEY` is exposed to the browser:
```typescript
define: {
  'process.env.API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
}
```
Anyone can see this key in browser dev tools. **This will get your API key stolen and abused.**

**Solution:** Move all AI calls to a backend server (Supabase Edge Functions, Vercel API routes, etc.)

---

### 2. Invalid/Deprecated AI Model Names
- [ ] **Status:** Not Verified

**Location:** `services/geminiService.ts`

**Problem:** The model names appear incorrect:
- `gemini-3-pro-preview` (line ~25)
- `gemini-2.5-flash-image` (line ~75)
- `veo-3.1-fast-generate-preview` (line ~95)

These don't match current Google AI model naming conventions.

**Solution:** Verify against the Google AI Studio documentation and update to valid model names.

---

### 3. Missing Supabase Package
- [ ] **Status:** Not Fixed

**Location:** `services/supabaseClient.ts`, `package.json`

**Problem:** The code imports Supabase from ESM CDN:
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
```
But `@supabase/supabase-js` is not in `package.json`. This could cause bundling issues.

**Solution:** Run `npm install @supabase/supabase-js`

---

### 4. No Actual Payment Processing
- [ ] **Status:** Not Fixed

**Location:** `components/OrderFlow.tsx`, `services/supabaseService.ts`

**Problem:** Card details are collected but never validated or charged. The status is hardcoded to `'payment_received'` in the service layer.

**Solution:** Integrate Stripe, Square, or another payment processor before accepting real orders.

---

## ⚠️ Supabase Migration Issues

**File:** `supabase_migration.sql`

### Issue 1: Trigger Function Dependency
- [ ] **Status:** Not Verified

**Problem:** The trigger `on_auth_user_created` depends on `raw_user_meta_data` containing `first_name`, `last_name`, and `email`. The signup call in `AuthScreen.tsx` must include these in the options:
```typescript
options: {
  data: {
    first_name: firstName,
    last_name: lastName,
  }
}
```

**Action:** Verify this matches exactly what the trigger expects, or profiles will have NULL names.

---

### Issue 2: Storage Bucket Visibility
- [ ] **Status:** Review Required

**Problem:** Lines 72-73 create buckets with `public = true`:
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('drawings', 'drawings', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('outputs', 'outputs', true);
```
This means **anyone can view all uploaded drawings**.

**Action:** Decide if this is acceptable. If you need privacy, set `public = false` and use signed URLs.

---

### Issue 3: Missing DELETE Policy on Drawings
- [ ] **Status:** Not Fixed

**Problem:** Users can INSERT, SELECT, and UPDATE their drawings, but **cannot delete them**.

**Solution:** Add this policy if users should be able to remove their artwork:
```sql
CREATE POLICY "Users can delete their own drawings"
  ON drawings FOR DELETE
  USING (auth.uid() = user_id);
```

---

### Issue 4: Orders Table - No UPDATE Policy
- [ ] **Status:** Review Required

**Problem:** Users can view and create orders but cannot update them (e.g., to cancel).

**Action:** Decide if this is intentional for order integrity, or if you need a cancellation flow.

---

### Issue 5: Cascade Behavior Risk
- [ ] **Status:** Review Required

**Problem:** All foreign keys use `ON DELETE CASCADE`. This means:
- Deleting a user deletes all their profiles, drawings, and orders
- Deleting a drawing deletes all associated orders

This could be dangerous if a drawing is accidentally deleted after someone paid for it.

**Solution:** Consider `ON DELETE SET NULL` for `orders.drawing_id`:
```sql
drawing_id UUID REFERENCES drawings(id) ON DELETE SET NULL,
```

---

### ✅ What's Good in Migration
- RLS enabled on all tables
- Proper UUID generation with `gen_random_uuid()`
- Correct timezone handling
- Storage policies properly restrict uploads to authenticated users

---

## 🔴 HIGH Priority Issues

### 5. Infinite Video Generation Loop
- [ ] **Status:** Not Fixed

**Location:** `services/geminiService.ts`

**Problem:** The video generation polls indefinitely:
```typescript
while (true) {
  // polls every 10 seconds with no timeout
}
```
If the API fails or hangs, users are stuck forever on the loading screen.

**Solution:** Add a maximum timeout (e.g., 10 minutes) and proper error handling.

---

### 6. Hardcoded MIME Type
- [ ] **Status:** Not Fixed

**Location:** `services/supabaseService.ts:12`

**Problem:** File uploads assume PNG:
```typescript
const blob = base64ToBlob(base64Data, 'image/png');
```
If a user uploads a JPEG, this could cause issues or corrupt the file.

**Solution:** Detect MIME type from base64 header or file extension.

---

### 7. Missing Environment Variables Documentation
- [ ] **Status:** Not Fixed

**Problem:** No `.env.example` file exists. Required variables:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`

**Solution:** Create `.env.example` file with placeholder values.

---

## 🟡 MEDIUM Priority Issues

### 8. Email Service is Mock Only
- [ ] **Status:** Not Fixed

**Location:** `services/emailService.ts`

**Problem:** Only simulates delays:
```typescript
await new Promise(resolve => setTimeout(resolve, 800));
```
No actual emails are sent.

**Solution:** Integrate Resend SDK before launch.

---

### 9. No Background Image Generation Feedback
- [ ] **Status:** Not Fixed

**Location:** `App.tsx`

**Problem:** `generateStoryImage()` runs for 12 pages without detailed user feedback. The progress bar helps, but users don't know if individual pages fail.

**Solution:** Add toast notifications or inline status updates for each page.

---

### 10. Card Validation is Superficial
- [ ] **Status:** Not Fixed

**Location:** `components/OrderFlow.tsx`

**Problem:** Only checks:
- Card number length (16 digits)
- Expiry format (MM/YY)
- CVC length (3-4 digits)

No Luhn algorithm, no actual validation. Users can enter `1111111111111111`.

**Solution:** Use Stripe Elements or implement proper validation (moot if using Stripe).

---

### 11. No COPPA Compliance Enforcement
- [ ] **Status:** Not Fixed

**Problem:** Terms mention children's privacy, but there's no age verification or parental consent flow for a product specifically targeting children's drawings.

**Solution:** Research COPPA requirements and implement appropriate consent mechanisms.

---

## 🟢 What's Done Well

1. **Clean Component Architecture** - Good separation of concerns with dedicated components for each step
2. **TypeScript Usage** - Proper interfaces and enums in `types.ts`
3. **RLS Policies** - Proper row-level security on all tables
4. **PWA Support** - Service worker and manifest configured
5. **Reusable UI Components** - `Button.tsx` with variants
6. **Auth State Management** - Proper Supabase auth listener with session checking
7. **Book Preview** - Impressive 18-spread book proof with navigation
8. **Order Flow UX** - Multi-step checkout with clear progression
9. **Loading States** - Rotating messages and progress bar during processing

---

## 📋 Pre-Migration Checklist

Before running `supabase_migration.sql`:

- [ ] Verify Supabase project is created and accessible
- [ ] Confirm you have the correct project URL and anon key
- [ ] Decide if storage buckets should be public or private
- [ ] Add DELETE policy for drawings if users should be able to remove them
- [ ] Consider changing `ON DELETE CASCADE` to `SET NULL` for `orders.drawing_id`
- [ ] Test the trigger by creating a test user and checking if profile is created
- [ ] Ensure your auth signup code passes `first_name` and `last_name` in metadata

---

## 📋 Pre-Launch Checklist

### Critical (Must Do)
- [ ] Move AI API calls to backend (critical security fix)
- [ ] Verify/update Google AI model names
- [ ] Add `@supabase/supabase-js` to package.json
- [ ] Integrate real payment processing

### High Priority
- [ ] Add video generation timeout
- [ ] Fix MIME type detection for uploads
- [ ] Create `.env.example` file

### Medium Priority
- [ ] Implement actual email sending
- [ ] Add proper error recovery/retry logic
- [ ] Test responsive design on mobile devices
- [ ] Improve card validation (or use Stripe Elements)

### Nice to Have
- [ ] Add individual page generation feedback
- [ ] Implement COPPA compliance measures
- [ ] Add analytics/monitoring
- [ ] Set up CI/CD pipeline

---

## File Structure Reference

```
onceuponadrawing/
├── App.tsx                           # Main app component & state
├── index.tsx                         # React root mount
├── types.ts                          # TypeScript interfaces & enums
├── index.html                        # HTML entry point
├── tsconfig.json                     # TS configuration
├── vite.config.ts                    # Vite build config
├── package.json                      # Dependencies
├── supabase_migration.sql            # Database schema
├── manifest.json                     # PWA manifest
├── sw.js                             # Service worker
├── README.md                         # Setup docs
├── CODE_REVIEW.md                    # This file
│
├── components/                       # React components
│   ├── StepInitial.tsx              # Landing page
│   ├── AuthScreen.tsx               # Login/signup
│   ├── StepUpload.tsx               # File upload
│   ├── StepRefining.tsx             # Metadata editor
│   ├── StepProcessing.tsx           # Loading state
│   ├── StepResult.tsx               # Video display
│   ├── StepAuthSuccess.tsx          # Welcome screen
│   ├── BookProof.tsx                # Book preview
│   ├── Storybook.tsx                # Book reader
│   ├── Confirmation.tsx             # Order receipt
│   ├── ProductSelection.tsx         # Product picker
│   ├── OrderFlow.tsx                # Checkout modal
│   ├── ProfilePage.tsx              # User profile
│   ├── Header.tsx                   # Top navigation
│   ├── Footer.tsx                   # Footer links
│   ├── InfoPages.tsx                # Legal pages
│   └── ui/
│       └── Button.tsx               # Reusable button
│
├── services/                        # Business logic
│   ├── supabaseClient.ts           # Supabase init
│   ├── supabaseService.ts          # DB operations
│   ├── geminiService.ts            # AI integration
│   └── emailService.ts             # Email (mock)
│
└── public/                          # Static assets
```

---

## Notes

_Add your notes here as you work through the issues._

---

**Next Steps:** Start with Critical issues #1-4, then address Supabase migration issues before running the migration.
