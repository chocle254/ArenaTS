# 1v1 Direct Challenge System - Complete Documentation

## Overview
A complete 1v1 Direct Challenge system allowing players to challenge each other to direct matches with real money stakes. Features two main views: Send Challenge (slide-up panel) and Incoming Challenge (modal with countdown timer).

## Features

### View 1: Send Challenge Panel
- **Trigger**: CHALLENGE button on player profile pages (below stats)
- **UI**: Slide-up panel from bottom (mobile-optimized)
- **Components**:
  - Opponent info (avatar, name, W/L record, rank)
  - Stake selection (pill buttons: $2, $5, $10, $25, Custom)
  - Game selection (CODM with red accent, PUBG with gold accent)
  - Send button with dynamic label showing stake amount
  - Violet to cyan gradient with sheen animation
  - Orbitron font for button text

### View 2: Incoming Challenge Modal
- **Trigger**: Automatic when challenge received
- **UI**: Centered modal (max-width 400px on mobile)
- **Components**:
  - Header "CHALLENGE RECEIVED" in Orbitron
  - Countdown timer (red badge, pulsing dot, format "4:32")
  - Two player avatars facing each other with VS between
  - 2x2 detail grid (Stake, Game, Mode, Prize Pool)
  - Prize pool shows combined stake minus 10% Arena cut (green)
  - ACCEPT CHALLENGE button (violet to cyan gradient)
  - DECLINE button (red outline)
  - Auto-close on timer expiry with toast notification

## Database Schema

### challenges table
```sql
CREATE TABLE challenges (
  id uuid PRIMARY KEY,
  challenger_id uuid NOT NULL,
  opponent_id uuid NOT NULL,
  game text NOT NULL,
  stake_amount numeric(10, 2) NOT NULL,
  prize_pool numeric(10, 2) NOT NULL,
  platform_fee numeric(10, 2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  completed_at timestamptz,
  winner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### Status Values
- `pending`: Challenge sent, awaiting response
- `accepted`: Challenge accepted, match starting
- `declined`: Challenge declined by opponent
- `expired`: Challenge expired (5 minute timeout)
- `completed`: Match finished
- `cancelled`: Cancelled by challenger

### Constraints
- `stake_amount` must be between $2 and $1000
- `challenger_id` and `opponent_id` must be different
- Only opponent can accept/decline pending challenges
- Only challenger can cancel pending challenges

## Components

### 1. SendChallengePanel.tsx
**Location**: `/src/components/SendChallengePanel.tsx`

**Props**:
```typescript
interface SendChallengePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opponent: {
    user_id: string;
    gamertag: string;
    avatar_url: string | null;
    wins: number;
    losses: number;
    rank?: string;
  };
}
```

**Features**:
- Slide-up animation from bottom using Framer Motion
- Stake selection with pill buttons ($2, $5, $10, $25, Custom)
- Custom stake input with validation (min $2, max $1000)
- Game selection (CODM red, PUBG gold)
- Dynamic button label: "Send Challenge · $10"
- Sheen animation on send button
- Toast notification on success
- Automatic prize pool calculation

**Animations**:
- Slide-up: `initial={{ y: '100%' }}` → `animate={{ y: 0 }}`
- Backdrop fade: `initial={{ opacity: 0 }}` → `animate={{ opacity: 1 }}`
- Sheen sweep: 3-second infinite animation

### 2. IncomingChallengeModal.tsx
**Location**: `/src/components/IncomingChallengeModal.tsx`

**Props**:
```typescript
interface IncomingChallengeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: Challenge | null;
}
```

**Features**:
- Centered modal with backdrop
- Countdown timer (updates every second)
- Auto-close on expiry
- Player avatars with VS separator
- 2x2 detail grid
- Accept/Decline buttons
- Real-time timer display (M:SS format)
- Pulsing red dot animation
- Sheen animation on accept button

**Timer Logic**:
- Calculates time remaining from `expires_at`
- Updates every second
- Auto-closes modal when timer reaches 0
- Shows toast "Challenge expired"

### 3. ChallengeContext.tsx
**Location**: `/src/contexts/ChallengeContext.tsx`

**Purpose**: Manages challenge state and real-time updates

**Features**:
- Fetches pending challenges for current user
- Subscribes to real-time challenge updates
- Automatically shows modal for new challenges
- Expires old challenges on load
- Provides unread count for notifications
- Queues multiple challenges (shows one at a time)

**Context API**:
```typescript
interface ChallengeContextType {
  pendingChallenges: Challenge[];
  unreadCount: number;
  refreshChallenges: () => Promise<void>;
}
```

**Real-time Subscriptions**:
- INSERT events: New challenges received
- UPDATE events: Challenge status changes
- Filter: `opponent_id=eq.${user.id}`

## Profile Page Integration

### Updated Profile.tsx
**Location**: `/src/pages/Profile.tsx`

**New Features**:
- Support for viewing other users' profiles via `/profile/:userId`
- CHALLENGE button (only shown on other users' profiles)
- Button styling: Violet gradient, Orbitron font, Swords icon
- Positioned below player stats
- Opens SendChallengePanel on click

**Profile Routes**:
- `/profile` - Current user's profile
- `/profile/:userId` - Other user's profile

**Stats Display**:
- Tournaments Played
- Wins
- Losses
- Total Earnings

## Database Functions

### expire_old_challenges()
```sql
CREATE OR REPLACE FUNCTION expire_old_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE challenges
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$;
```

**Purpose**: Automatically expire challenges past their 5-minute window

**Called**: 
- On page load
- Before fetching challenges
- Via cron job (recommended)

### calculate_challenge_prize(stake)
```sql
CREATE OR REPLACE FUNCTION calculate_challenge_prize(stake numeric)
RETURNS TABLE (
  prize_pool numeric,
  platform_fee numeric
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (stake * 2 * 0.9)::numeric(10, 2) as prize_pool,
    (stake * 2 * 0.1)::numeric(10, 2) as platform_fee;
END;
$$;
```

**Purpose**: Calculate prize pool and platform fee

**Formula**:
- Total pot = stake × 2
- Platform fee = total pot × 10%
- Prize pool = total pot - platform fee

**Example**:
- Stake: $10
- Total pot: $20
- Platform fee: $2
- Prize pool: $18

## Row Level Security (RLS)

### View Challenges
```sql
CREATE POLICY "Users can view their own challenges"
  ON challenges FOR SELECT
  TO authenticated
  USING (
    auth.uid() = challenger_id OR 
    auth.uid() = opponent_id
  );
```

### Create Challenges
```sql
CREATE POLICY "Users can create challenges"
  ON challenges FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = challenger_id AND
    stake_amount >= 2 AND
    stake_amount <= 1000
  );
```

### Update Challenges (Opponent)
```sql
CREATE POLICY "Opponents can update challenge status"
  ON challenges FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = opponent_id AND
    status = 'pending'
  )
  WITH CHECK (
    status IN ('accepted', 'declined')
  );
```

### Cancel Challenges (Challenger)
```sql
CREATE POLICY "Challengers can cancel pending challenges"
  ON challenges FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = challenger_id AND
    status = 'pending'
  )
  WITH CHECK (
    status = 'cancelled'
  );
```

## User Flow

### Sending a Challenge
1. User visits another player's profile (`/profile/:userId`)
2. Clicks CHALLENGE button below stats
3. Slide-up panel appears from bottom
4. User selects stake amount ($2-$1000)
5. User selects game (CODM or PUBG)
6. User clicks "Send Challenge · $X"
7. Challenge created in database with 5-minute expiry
8. Toast notification: "Challenge sent to [opponent]"
9. Panel closes

### Receiving a Challenge
1. Challenge inserted into database
2. Real-time subscription triggers
3. ChallengeContext fetches challenge with profiles
4. Modal automatically opens
5. Countdown timer starts (5 minutes)
6. User sees opponent info, stake, game, prize pool
7. User clicks ACCEPT or DECLINE
8. Challenge status updated in database
9. Toast notification shown
10. Modal closes

### Challenge Expiry
1. Timer reaches 0:00
2. Modal auto-closes
3. Toast notification: "Challenge expired"
4. Database status updated to 'expired' (via function)

## Styling & Design

### Color Scheme
- **Violet**: `#8B5CF6` - Primary gradient start
- **Cyan**: `#22D3EE` - Primary gradient end
- **Red**: `#ef4444` - CODM accent, timer, decline button
- **Gold/Amber**: `#f59e0b` - PUBG accent
- **Green**: `#22c55e` - Prize pool highlight

### Typography
- **Orbitron**: Headers, buttons, "VS" text
- **JetBrains Mono**: Timer, stake amounts
- **System**: Body text

### Animations
1. **Slide-up Panel**:
   - Type: Spring animation
   - Damping: 30
   - Stiffness: 300
   - Direction: Bottom to center

2. **Modal Fade**:
   - Type: Spring animation
   - Damping: 25
   - Stiffness: 300
   - Scale: 0.95 → 1

3. **Sheen Sweep**:
   - Duration: 3 seconds
   - Loop: Infinite
   - Direction: Left to right
   - Skew: -15deg

4. **Pulsing Dot**:
   - Duration: 2 seconds
   - Loop: Infinite
   - Opacity: 1 → 0.5 → 1

### Responsive Design
- **Mobile (<768px)**:
  - Send panel: Full width, slide from bottom
  - Modal: Max-width 400px, centered
  - Buttons: Full width
  - Grid: 2 columns

- **Desktop (≥768px)**:
  - Send panel: Max-width 600px, centered
  - Modal: Max-width 400px, centered
  - Buttons: Flex layout
  - Grid: 2 columns

## Toast Notifications

### Success Messages
- "Challenge sent to [opponent]"
- "Challenge accepted! Match starting soon..."
- "Challenge declined"

### Error Messages
- "You must be logged in to send challenges"
- "Stake must be between $2 and $1000"
- "Failed to send challenge"
- "Failed to accept challenge"
- "Failed to decline challenge"
- "Challenge expired"

## Real-time Features

### Supabase Realtime
- **Channel**: `challenges`
- **Events**: INSERT, UPDATE
- **Filter**: `opponent_id=eq.${user.id}`
- **Actions**: Refresh challenges, show modal

### Subscription Lifecycle
1. Subscribe on user login
2. Listen for INSERT (new challenges)
3. Listen for UPDATE (status changes)
4. Unsubscribe on component unmount
5. Unsubscribe on user logout

## Testing Checklist

- [ ] Send challenge with $2 stake
- [ ] Send challenge with $1000 stake
- [ ] Try to send challenge with $1 (should fail)
- [ ] Try to send challenge with $1001 (should fail)
- [ ] Send challenge with custom amount
- [ ] Select CODM game (red accent)
- [ ] Select PUBG game (gold accent)
- [ ] Verify toast notification on send
- [ ] Verify panel closes after send
- [ ] Receive challenge (modal opens automatically)
- [ ] Verify countdown timer updates every second
- [ ] Verify timer format (M:SS)
- [ ] Verify pulsing red dot animation
- [ ] Verify player avatars display correctly
- [ ] Verify W/L records show correctly
- [ ] Verify stake amount displays correctly
- [ ] Verify game name displays correctly
- [ ] Verify prize pool calculation (stake × 2 × 0.9)
- [ ] Click ACCEPT button
- [ ] Verify toast notification on accept
- [ ] Verify modal closes on accept
- [ ] Click DECLINE button
- [ ] Verify toast notification on decline
- [ ] Verify modal closes on decline
- [ ] Wait for timer to expire
- [ ] Verify modal auto-closes on expiry
- [ ] Verify toast "Challenge expired"
- [ ] Verify challenge status updates in database
- [ ] Test on mobile device (slide-up panel)
- [ ] Test on desktop (centered modal)
- [ ] Verify sheen animation on buttons
- [ ] Verify real-time challenge updates
- [ ] Send multiple challenges (queue system)
- [ ] Verify CHALLENGE button only shows on other profiles
- [ ] Verify CHALLENGE button hidden on own profile

## Future Enhancements

- [ ] Add match execution after challenge accepted
- [ ] Add result submission for 1v1 matches
- [ ] Add dispute resolution for 1v1 matches
- [ ] Add challenge history page
- [ ] Add challenge statistics
- [ ] Add rank-based matchmaking
- [ ] Add challenge notifications badge
- [ ] Add challenge sound effects
- [ ] Add challenge animations (confetti on accept)
- [ ] Add challenge reminders
- [ ] Add challenge chat
- [ ] Add challenge spectating
- [ ] Add challenge replays
- [ ] Add challenge leaderboard
- [ ] Add challenge achievements
- [ ] Add challenge seasons
- [ ] Support more games
- [ ] Add team challenges (2v2, 3v3)
- [ ] Add tournament-style challenges
- [ ] Add best-of-3/5 challenges
- [ ] Add wager limits based on rank
- [ ] Add challenge cooldowns
- [ ] Add challenge restrictions (level, rank)

## Files Created/Modified

### New Files
1. `/supabase/migrations/00023_create_challenges_table.sql` - Database schema
2. `/src/components/SendChallengePanel.tsx` - Send challenge UI
3. `/src/components/IncomingChallengeModal.tsx` - Receive challenge UI
4. `/src/contexts/ChallengeContext.tsx` - Challenge state management

### Modified Files
1. `/src/pages/Profile.tsx` - Added CHALLENGE button and user profile viewing
2. `/src/routes.tsx` - Added `/profile/:userId` route
3. `/src/App.tsx` - Added ChallengeProvider

## API Reference

### Create Challenge
```typescript
const { error } = await supabase
  .from('challenges')
  .insert({
    challenger_id: user.id,
    opponent_id: opponent.user_id,
    game: 'codm',
    stake_amount: 10,
    prize_pool: 18,
    platform_fee: 2,
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    status: 'pending'
  });
```

### Accept Challenge
```typescript
const { error } = await supabase
  .from('challenges')
  .update({
    status: 'accepted',
    accepted_at: new Date().toISOString()
  })
  .eq('id', challengeId);
```

### Decline Challenge
```typescript
const { error } = await supabase
  .from('challenges')
  .update({ status: 'declined' })
  .eq('id', challengeId);
```

### Fetch Pending Challenges
```typescript
const { data, error } = await supabase
  .from('challenges')
  .select('*')
  .eq('opponent_id', user.id)
  .eq('status', 'pending')
  .order('created_at', { ascending: false });
```

---

**Version**: 1.0  
**Last Updated**: 2026-04-22  
**Status**: Complete ✅
