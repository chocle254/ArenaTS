# ARENA - Tournament Platform MVP

## 🎮 Project Overview

ARENA is a competitive gaming tournament platform where players can discover and join paid tournaments, track their competitive history and earnings, and compete for real prize money. This MVP provides the foundational architecture and core features to get started.

## ✅ Completed Features

### 1. **Authentication System**
- ✅ Email/password sign up and sign in
- ✅ Google SSO integration (using Supabase SSO)
- ✅ User profile syncing with database
- ✅ Protected routes with RouteGuard
- ✅ First user automatically becomes admin

### 2. **Database Architecture**
- ✅ Comprehensive schema with 10+ tables:
  - `profiles` - User profiles with stats and wallet
  - `gamertags` - Game-specific player IDs
  - `tournaments` - Tournament information and brackets
  - `tournament_participants` - Player registrations
  - `matches` - Match data and scores
  - `match_messages` - In-match chat
  - `disputes` - Dispute resolution system
  - `transactions` - Wallet transaction history
  - `payouts` - Payout requests and processing
  - `orders` - Stripe payment orders
- ✅ Row Level Security (RLS) policies for all tables
- ✅ Storage buckets for avatars and evidence
- ✅ Helper functions for role-based access

### 3. **Design System**
- ✅ Minimal aesthetic with esports dark theme
- ✅ Custom color palette:
  - Deep space black backgrounds (--background: 220 15% 5%)
  - Electric cyan for CTAs (--primary: 187 85% 70%)
  - Gold for prizes (--accent: 45 95% 62%)
  - Green for wins (--success: 142 70% 55%)
  - Red for live indicators (--destructive: 350 85% 62%)
- ✅ Typography system:
  - Orbitron for headers
  - DM Sans for body text
  - JetBrains Mono for stats and numbers
- ✅ Custom utility classes (gradient-text, text-gold, animate-live-pulse)
- ✅ Card hover glow effects

### 4. **Core Pages**
- ✅ **Dashboard** - User stats overview with earnings, tournaments played, win rate, and rank
- ✅ **Tournaments** - Browse tournaments with search and game filters
- ✅ **Leaderboard** - Placeholder for rankings (ready for implementation)
- ✅ **Wallet** - Balance display (ready for transaction history)
- ✅ **Sign In/Sign Up** - Full authentication flow

### 5. **Layout & Navigation**
- ✅ Responsive main layout with header and footer
- ✅ Desktop navigation with active state indicators
- ✅ Mobile hamburger menu with Sheet component
- ✅ User dropdown menu with profile and admin links
- ✅ Proper routing with React Router

### 6. **Type Safety**
- ✅ Complete TypeScript interfaces for all database tables
- ✅ Enum types for status fields
- ✅ Game info constants with icons

## 🚧 Features To Implement

### High Priority

#### 1. **Stripe Payment Integration**
**Files to create:**
- `supabase/functions/create_stripe_checkout/index.ts`
- `supabase/functions/verify_stripe_payment/index.ts`

**Steps:**
1. Register Stripe secret key using `register_secrets` tool or manually add to Supabase dashboard
2. Deploy Edge Functions using `supabase_deploy_edge_function`
3. Update Tournament Detail page to include Join Tournament flow
4. Create multi-step modal for tournament entry:
   - Step 1: Review rules
   - Step 2: Enter gamertag
   - Step 3: Stripe Checkout (call `create_stripe_checkout`)
   - Step 4: Confirmation (call `verify_stripe_payment`)

**Reference:** See `<PAYMENT_REQUIREMENTS>` section in system prompt for complete implementation guide.

#### 2. **Create Tournament Flow**
**File to create:** `src/pages/CreateTournament.tsx`

**Features:**
- 6-step form wizard:
  1. Basic Info (name, game, description, format, max players)
  2. Schedule (date picker, time, check-in window)
  3. Rules & Format (bracket type, score reporting, tie-break rules)
  4. Prize Structure (entry fee, distribution calculator, platform fee display)
  5. Review & Publish
  6. Share (tournament link, QR code, social buttons)
- Form validation with proper error handling
- Insert tournament into database with proper prize distribution JSON

#### 3. **Matches Section**
**File to create:** `src/pages/Matches.tsx`

**Features:**
- Three tabs: Upcoming, Live, Past
- Match cards with:
  - Tournament info and game icon
  - Countdown timers for upcoming matches
  - Pulsing LIVE badge for active matches
  - Result display (WIN/LOSS) for past matches
- Live match room modal with:
  - Score reporting form
  - Real-time chat (see #4)
  - Dispute button

#### 4. **Real-Time Chat**
**Component to create:** `src/components/MatchChat.tsx`

**Features:**
- Supabase Realtime subscription to `match_messages` table
- Message input with send button
- Image upload for evidence (use Supabase Storage)
- System messages for match events
- Gamertag share button
- Dispute filing form

**Implementation:**
```typescript
// Enable Realtime for match_messages table
await supabase
  .channel('match-chat')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'match_messages',
    filter: `match_id=eq.${matchId}`
  }, (payload) => {
    // Add new message to state
  })
  .subscribe();
```

#### 5. **Admin Dashboard**
**Files to create:**
- `src/pages/admin/AdminDashboard.tsx`
- `src/pages/admin/PayoutVerification.tsx`
- `src/pages/admin/DisputeResolution.tsx`
- `src/pages/admin/PlayerManagement.tsx`
- `src/pages/admin/TournamentManagement.tsx`

**Features:**
- KPI cards with animated count-up (use framer-motion)
- Charts using recharts library
- Payout approval workflow
- Dispute resolution interface
- Player and tournament CRUD operations

### Medium Priority

#### 6. **Tournament Bracket Visualization**
**Component to create:** `src/components/TournamentBracket.tsx`

**Features:**
- Visual bracket tree rendering
- Match nodes with player avatars and scores
- Current user path highlighted in cyan
- Real-time updates via Supabase Realtime
- Zoom controls
- Download as image functionality

#### 7. **Player Profile Page**
**File to create:** `src/pages/Profile.tsx`

**Features:**
- Profile header with avatar upload
- Stats grid with animated numbers
- Earnings chart (use recharts)
- Match history table with pagination
- Achievement badges

#### 8. **Wallet Enhancements**
**Update:** `src/pages/Wallet.tsx`

**Features:**
- Withdrawal request form
- Transaction history table
- Filter by transaction type
- Export to CSV

### Low Priority

#### 9. **Framer Motion Animations**
**Files to enhance:** All page components

**Animations to add:**
- Page load with staggerChildren
- Card hover effects (scale, glow)
- Tab transitions
- Modal entrance/exit
- Live badge pulse (already in CSS)
- Prize count-up animation

**Example:**
```typescript
import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

<motion.div variants={container} initial="hidden" animate="show">
  {items.map(item => (
    <motion.div key={item.id} variants={item}>
      {/* Card content */}
    </motion.div>
  ))}
</motion.div>
```

## 📁 Project Structure

```
src/
├── components/
│   ├── layouts/
│   │   └── MainLayout.tsx          ✅ Main app layout
│   ├── ui/                          ✅ shadcn/ui components
│   └── common/
│       ├── RouteGuard.tsx           ✅ Auth protection
│       └── IntersectObserver.tsx    ✅ Intersection observer
├── contexts/
│   └── AuthContext.tsx              ✅ Authentication context
├── db/
│   └── supabase.ts                  ✅ Supabase client
├── pages/
│   ├── SignIn.tsx                   ✅ Sign in page
│   ├── SignUp.tsx                   ✅ Sign up page
│   ├── Dashboard.tsx                ✅ User dashboard
│   ├── Tournaments.tsx              ✅ Tournament discovery
│   ├── TournamentDetail.tsx         ✅ Tournament detail (placeholder)
│   ├── Leaderboard.tsx              ✅ Leaderboard (placeholder)
│   ├── Wallet.tsx                   ✅ Wallet (basic)
│   ├── Matches.tsx                  🚧 TO IMPLEMENT
│   ├── CreateTournament.tsx         🚧 TO IMPLEMENT
│   ├── Profile.tsx                  🚧 TO IMPLEMENT
│   └── admin/                       🚧 TO IMPLEMENT
│       ├── AdminDashboard.tsx
│       ├── PayoutVerification.tsx
│       ├── DisputeResolution.tsx
│       ├── PlayerManagement.tsx
│       └── TournamentManagement.tsx
├── types/
│   └── database.ts                  ✅ TypeScript types
├── routes.tsx                       ✅ Route definitions
├── App.tsx                          ✅ Main app component
└── index.css                        ✅ Design system

supabase/
├── migrations/
│   ├── *_create_initial_schema.sql              ✅ Database schema
│   └── *_create_auth_trigger_and_policies.sql   ✅ RLS policies
└── functions/                                    🚧 TO IMPLEMENT
    ├── create_stripe_checkout/
    │   └── index.ts
    └── verify_stripe_payment/
        └── index.ts
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm
- Supabase account

### Installation

1. **Install dependencies:**
```bash
pnpm install
```

2. **Environment variables:**
The `.env` file should already be configured with Supabase credentials.

3. **Run development server:**
```bash
pnpm dev
```

4. **Create first admin user:**
- Sign up with email/password
- First user is automatically assigned admin role
- Access admin panel from user dropdown menu

### Database Setup

The database schema and RLS policies are already applied. To verify:

```bash
# Check tables exist
# Go to Supabase Dashboard > Table Editor
```

## 🎨 Design Tokens

### Colors
```css
--background: 220 15% 5%        /* Deep space black */
--primary: 187 85% 70%          /* Electric cyan */
--accent: 45 95% 62%            /* Gold for prizes */
--success: 142 70% 55%          /* Green for wins */
--destructive: 350 85% 62%      /* Red for live/danger */
--muted: 220 10% 15%            /* Subtle backgrounds */
```

### Typography
- **Headers:** Orbitron (700-900 weight)
- **Body:** DM Sans (400-700 weight)
- **Stats/Numbers:** JetBrains Mono (400-700 weight)

### Utility Classes
- `.gradient-text` - Cyan to gold gradient
- `.text-gold` - Gold color for prizes
- `.animate-live-pulse` - Pulsing animation for LIVE badges
- `.card-hover-glow` - Hover effect with cyan glow
- `.backdrop-blur-card` - Frosted glass effect

## 🔐 Authentication Flow

1. User signs up with email/password or Google SSO
2. Email verification sent (if email verification enabled)
3. On confirmation, `handle_new_user()` trigger creates profile
4. First user gets `admin` role, subsequent users get `user` role
5. User redirected to dashboard after sign in

## 💾 Database Schema Highlights

### Profiles Table
- Stores user stats: earnings, tournaments played, wins, losses, win rate
- Tracks global rank and tier
- Suspension management

### Tournaments Table
- Complete tournament configuration
- Bracket data stored as JSONB
- Prize distribution as JSONB
- Status tracking (open, active, completed, cancelled)

### Matches Table
- Links to tournament and players
- Score submission tracking
- Dispute status
- Admin override capability

### RLS Policies
- Users can view their own data
- Admins have full access
- Match participants can view/update their matches
- Public profiles viewable by all authenticated users

## 📝 Implementation Notes

### Stripe Integration
- Use Edge Functions for all Stripe API calls
- Never expose Stripe secret key to client
- Implement proper webhook handling for payment events
- Store order status in database for reconciliation

### Real-Time Features
- Enable Realtime replication for tables that need live updates:
  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE match_messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE matches;
  ```
- Use Supabase Realtime channels for chat and bracket updates
- Implement proper cleanup on component unmount

### Image Uploads
- Use Supabase Storage buckets (already created: `avatars`, `evidence`)
- Implement client-side compression for images >1MB
- Convert to WebP format for optimal performance
- Use signed URLs for private evidence images

### Performance Optimization
- Implement cursor-based pagination for large lists
- Use `.maybeSingle()` instead of `.single()` to avoid errors
- Always use `.order()` with `.limit()`
- Index frequently queried columns (already done in schema)

## 🐛 Known Issues / Limitations

1. **Tournament Detail Page** - Currently placeholder, needs full implementation
2. **Wallet Transactions** - No transaction history display yet
3. **Leaderboard** - Placeholder page, needs ranking calculation logic
4. **No Framer Motion animations** - Static UI, animations to be added
5. **No admin pages** - Admin functionality not yet implemented
6. **No Stripe integration** - Payment flow not connected

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Stripe API](https://stripe.com/docs/api)
- [React Router](https://reactrouter.com/)

## ⚠️ Important Reminders

### User Agreement & Privacy Policy
The sign-up page includes checkboxes for User Agreement and Privacy Policy. **Please create proper legal documents and update the links in `SignUp.tsx` to mitigate legal risks.**

### Stripe Configuration
Before implementing payment features:
1. Create a Stripe account at https://stripe.com
2. Get your API keys from https://dashboard.stripe.com/apikeys
3. Add `STRIPE_SECRET_KEY` to Supabase Edge Function secrets
4. Test in Stripe test mode before going live

### First User is Admin
The first user to sign up automatically becomes an admin. Make sure you create your admin account first before opening registration to others.

## 🎯 Next Steps

1. **Implement Stripe payment flow** (highest priority for monetization)
2. **Create Tournament flow** (core feature for platform)
3. **Build Matches section** (essential for user engagement)
4. **Add real-time chat** (competitive feature)
5. **Implement admin dashboard** (platform management)
6. **Add animations** (polish and user experience)

---

**Built with:** React, TypeScript, Tailwind CSS, shadcn/ui, Supabase, Stripe

**License:** MIT
