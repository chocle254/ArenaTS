# Wallet Page with Stripe Integration - Complete Documentation

## Overview
A complete Wallet page with real Stripe payment integration supporting multiple currencies and countries. Features include balance management, add funds via Stripe Elements, withdrawals via Stripe Connect, transaction history, and multi-currency support.

## Features

### 1. Balance Hero Section
- **Dark card** with violet and cyan gradient background (low opacity)
- **"TOTAL BALANCE" label**: Cyan, uppercase, JetBrains Mono font
- **Balance amount**: 52px, gold color (#F5C842), soft glow effect
- **Count-up animation**: Animates from 0 to real value over 1.5 seconds with ease-out
- **Two pill badges**:
  - Green pill with dot: Available balance
  - Gold pill with dot: Pending balance (with tooltip)
- **Tooltip**: "Funds locked in active tournaments. Released automatically when match ends."

### 2. Action Buttons
- **WITHDRAW button**: Violet to cyan gradient, Orbitron font
- **ADD FUNDS button**: Dark with subtle border, Orbitron font
- Side-by-side layout on desktop, stacked on mobile

### 3. ADD FUNDS Modal (Stripe Elements)
- **Slide-up modal** with Framer Motion animation
- **Amount selector**: Quick pills ($5, $10, $25, $50, $100) + custom input
- **Stripe Elements CardElement**: Custom dark styling
  - Background: #0F1118
  - Text: white
  - Border: rgba(124, 58, 237, 0.4)
  - Focus border: cyan
- **Payment method icons**: Visa, Mastercard, American Express
- **PAY NOW button**: Full width, violet to cyan gradient, dynamic amount display
- **Success animation**: Green checkmark drawing itself, balance updates in real-time
- **Error handling**: Red message below card field
- **Environment variable**: VITE_STRIPE_PUBLISHABLE_KEY

### 4. WITHDRAWAL Modal (Stripe Connect)
- **Check for Connect account**: If not connected, show onboarding screen
- **Onboarding screen**:
  - Title: "Set Up Payouts" (Orbitron font)
  - Explanation text about supported methods
  - Grid of payment method cards (Bank, Debit Card, M-Pesa, Airtel Money)
  - CONNECT PAYOUT ACCOUNT button (violet to cyan gradient)
- **Withdrawal form** (if connected):
  - Withdrawal method display
  - Amount input with available balance validation
  - Estimated arrival time info
  - WITHDRAW button with dynamic amount
- **Success**: Toast notification and balance update

### 5. Currency Support
- **Currency selector dropdown** at top of page
- **Supported currencies**: USD, KES, NGN, GHS, UGX, TZS
- **Auto-detection**: Based on user's timezone
- **All amounts** display in selected currency
- **Stripe handles conversion** automatically
- **Stored in profile**: Currency preference saved to database

### 6. Transaction History
- **Label**: "RECENT TRANSACTIONS"
- **Filter pills**: All, Wins, Fees, Withdrawals, Deposits
- **Transaction rows**:
  - Colored icon box (green trophy, red controller, gray arrow, blue plus)
  - Transaction name and description
  - Date and time (JetBrains Mono font)
  - Amount (green + for incoming, red - for outgoing)
- **Pagination**: Load 10 at a time with LOAD MORE button
- **Real-time updates**: Fetches from Supabase transactions table

### 7. Empty State
- **Displayed when**: No transactions and zero balance
- **Content**:
  - Large trophy icon (muted, opacity 50%)
  - "No earnings yet" heading
  - "Join tournaments to start earning" text
  - JOIN TOURNAMENT button (links to /tournaments)

### 8. Security Notice
- **Lock icon** with security message
- **Text**: "Payments secured by Stripe. Your card details are never stored on Arena servers. All transactions are encrypted."
- **Styling**: Small muted text in card at bottom

## Database Schema

### profiles table (additions)
```sql
available_balance numeric(10, 2) DEFAULT 0
pending_balance numeric(10, 2) DEFAULT 0
currency text DEFAULT 'USD'
stripe_customer_id text
stripe_connect_account_id text
```

### transactions table
```sql
id uuid PRIMARY KEY
user_id uuid NOT NULL
type text NOT NULL -- 'credit', 'debit', 'withdrawal', 'refund'
amount numeric(10, 2) NOT NULL
currency text DEFAULT 'USD'
status text DEFAULT 'completed' -- 'pending', 'completed', 'failed', 'cancelled'
stripe_payment_intent_id text
stripe_payout_id text
description text
metadata jsonb
created_at timestamptz
updated_at timestamptz
```

### Database Functions

**update_user_balance(p_user_id, p_amount, p_balance_type)**
- Updates available or pending balance
- SECURITY DEFINER for safe execution

**transfer_pending_to_available(p_user_id, p_amount)**
- Moves funds from pending to available
- Used when tournaments complete

## Stripe Integration

### Edge Functions

#### 1. create-payment-intent
**Purpose**: Creates Stripe payment intent for adding funds

**Request**:
```json
{
  "amount": 25.00,
  "currency": "usd"
}
```

**Response**:
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

**Process**:
1. Get or create Stripe customer
2. Create payment intent with automatic payment methods
3. Create pending transaction in database
4. Return client secret for frontend

#### 2. stripe-webhook
**Purpose**: Handles Stripe webhook events

**Events handled**:
- `payment_intent.succeeded`: Update transaction status, add to balance
- `payment_intent.payment_failed`: Update transaction status to failed
- `payout.paid`: Mark payout as completed
- `payout.failed`: Refund balance to user

**Security**: Verifies webhook signature using STRIPE_WEBHOOK_SECRET

#### 3. create-connect-account
**Purpose**: Creates or retrieves Stripe Connect account for payouts

**Response**:
```json
{
  "url": "https://connect.stripe.com/setup/..."
}
```

**Process**:
1. Check if user has Connect account
2. If yes: Create account link for re-onboarding
3. If no: Create new Express account
4. Save account ID to profile
5. Return onboarding URL

#### 4. create-payout
**Purpose**: Creates payout to user's Connect account

**Request**:
```json
{
  "amount": 50.00,
  "currency": "usd"
}
```

**Process**:
1. Verify Connect account exists and is active
2. Check available balance
3. Create Stripe transfer to Connect account
4. Deduct from user balance
5. Create transaction record

### Environment Variables

**Frontend** (.env):
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

**Backend** (Supabase secrets):
```
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx (optional for development)
```

**Development Mode**: If `STRIPE_WEBHOOK_SECRET` is not set, the webhook handler will work without signature verification. This is useful for testing before your site is published, but is **insecure** and should only be used for development.

**Production Mode**: Once your site is published, you must configure a webhook endpoint in Stripe Dashboard and set `STRIPE_WEBHOOK_SECRET` for secure webhook verification.

See `STRIPE_SETUP_GUIDE.md` for detailed setup instructions.

## Components

### AddFundsModal.tsx
**Props**:
```typescript
{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currency: string;
}
```

**Features**:
- Slide-up animation from bottom
- Amount selection (quick amounts + custom)
- Stripe CardElement integration
- Payment processing with loading state
- Success animation (green checkmark)
- Error handling with user-friendly messages
- Real-time balance update on success

**Stripe Elements Styling**:
```javascript
{
  style: {
    base: {
      color: '#ffffff',
      fontFamily: '"Inter", sans-serif',
      fontSize: '16px',
      backgroundColor: '#0F1118',
      '::placeholder': { color: '#6b7280' },
    },
    invalid: {
      color: '#ef4444',
      iconColor: '#ef4444',
    },
  },
}
```

### WithdrawModal.tsx
**Props**:
```typescript
{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  availableBalance: number;
  currency: string;
}
```

**Features**:
- Checks for Stripe Connect account
- Onboarding screen if not connected
- Withdrawal form with amount validation
- Payment method display
- Estimated arrival time info
- Processing state with loading indicator
- Success toast notification

### Wallet.tsx (Main Page)
**Features**:
- Currency selector dropdown
- Balance hero with count-up animation
- Available/pending balance pills with tooltip
- Action buttons (WITHDRAW, ADD FUNDS)
- Transaction history with filters
- Pagination (load more)
- Empty state
- Security notice
- Stripe Elements provider wrapper

## Utilities

### currency.ts
**Functions**:
- `formatCurrencyAmount(amount, currencyCode)`: Formats amount with currency symbol
- `getCurrencySymbol(currencyCode)`: Returns currency symbol
- `detectCurrency()`: Auto-detects currency from timezone

**Supported Currencies**:
```typescript
{
  USD: { symbol: '$', name: 'US Dollar' },
  KES: { symbol: 'KSh', name: 'Kenyan Shilling' },
  NGN: { symbol: '₦', name: 'Nigerian Naira' },
  GHS: { symbol: 'GH₵', name: 'Ghanaian Cedi' },
  UGX: { symbol: 'USh', name: 'Ugandan Shilling' },
  TZS: { symbol: 'TSh', name: 'Tanzanian Shilling' },
}
```

### use-count-up.ts
**Hook**: `useCountUp(end, duration, start)`

**Purpose**: Animates number from start to end value

**Parameters**:
- `end`: Target value
- `duration`: Animation duration (default: 1500ms)
- `start`: Starting value (default: 0)

**Easing**: Cubic ease-out function

**Usage**:
```typescript
const animatedBalance = useCountUp(totalBalance, 1500, 0);
```

## Animations

### 1. Count-up Animation
- **Duration**: 1.5 seconds
- **Easing**: Cubic ease-out
- **Effect**: Balance counts from 0 to real value on page load

### 2. Success Animation
- **Green checkmark**: Scales from 0 to 1 with spring animation
- **Path drawing**: SVG path animates from 0 to 100%
- **Text fade-in**: Success message fades in with delay
- **Duration**: 2 seconds total

### 3. Modal Animations
- **Slide-up**: Modals slide from bottom (y: 100% → 0)
- **Backdrop fade**: Background fades in (opacity: 0 → 1)
- **Spring physics**: Damping 30, stiffness 300

### 4. Hover Effects
- **Buttons**: Subtle scale and brightness changes
- **Pills**: Border color transitions
- **Transaction rows**: Background color on hover

## User Flows

### Adding Funds
1. User clicks ADD FUNDS button
2. Modal slides up from bottom
3. User selects amount (quick pill or custom)
4. User enters card details in Stripe Elements
5. User clicks PAY NOW
6. Frontend creates payment intent via Edge Function
7. Stripe confirms payment
8. Success animation plays
9. Balance updates in real-time
10. Modal closes, toast notification shown

### Withdrawing Funds
1. User clicks WITHDRAW button
2. Modal slides up from bottom
3. **If no Connect account**:
   - Show onboarding screen
   - User clicks CONNECT PAYOUT ACCOUNT
   - Redirect to Stripe Connect onboarding
   - User completes onboarding
   - Returns to wallet page
4. **If Connect account exists**:
   - Show withdrawal form
   - User enters amount
   - User clicks WITHDRAW
   - Frontend creates payout via Edge Function
   - Balance deducted immediately
   - Transaction created
   - Toast notification shown

### Viewing Transactions
1. User scrolls to transaction history
2. Transactions load automatically (10 at a time)
3. User can filter by type (All, Wins, Fees, Withdrawals, Deposits)
4. User clicks LOAD MORE for pagination
5. More transactions load and append to list

## Security

### Payment Security
- **Stripe.js loaded from official CDN**: https://js.stripe.com/v3/
- **No raw card data**: All card input handled by Stripe Elements
- **PCI compliance**: Stripe handles all sensitive data
- **Webhook verification**: Signatures verified using secret
- **HTTPS only**: All communication encrypted

### Database Security
- **RLS policies**: Users can only view their own transactions
- **SECURITY DEFINER**: Balance update functions use elevated privileges
- **Input validation**: Amount limits enforced (min $5, max balance)
- **Transaction atomicity**: Balance updates and transaction creation in single operation

### API Security
- **Authentication required**: All Edge Functions check auth token
- **Rate limiting**: Prevent abuse (handled by Supabase)
- **Error handling**: No sensitive data in error messages
- **Metadata**: User IDs stored in Stripe metadata for verification

## Testing Checklist

### Add Funds
- [ ] Click ADD FUNDS button
- [ ] Modal slides up from bottom
- [ ] Select $5 quick amount
- [ ] Select $100 quick amount
- [ ] Enter custom amount ($25.50)
- [ ] Enter card details (use Stripe test card: 4242 4242 4242 4242)
- [ ] Click PAY NOW
- [ ] Verify processing state
- [ ] Verify success animation plays
- [ ] Verify balance updates
- [ ] Verify toast notification
- [ ] Verify modal closes
- [ ] Check transaction appears in history

### Withdraw Funds
- [ ] Click WITHDRAW button
- [ ] If no Connect account: verify onboarding screen
- [ ] Click CONNECT PAYOUT ACCOUNT
- [ ] Complete Stripe Connect onboarding
- [ ] Return to wallet
- [ ] Click WITHDRAW again
- [ ] Verify withdrawal form shows
- [ ] Enter amount less than available balance
- [ ] Click WITHDRAW
- [ ] Verify balance deducts immediately
- [ ] Verify toast notification
- [ ] Check transaction appears in history

### Currency Support
- [ ] Verify currency auto-detected on first load
- [ ] Change currency to KES
- [ ] Verify all amounts update to KSh
- [ ] Change currency to NGN
- [ ] Verify all amounts update to ₦
- [ ] Refresh page
- [ ] Verify currency preference persists

### Transaction History
- [ ] Verify transactions load on page load
- [ ] Click "Wins" filter
- [ ] Verify only tournament wins show
- [ ] Click "Deposits" filter
- [ ] Verify only deposits show
- [ ] Click "All" filter
- [ ] Verify all transactions show
- [ ] Scroll to bottom
- [ ] Click LOAD MORE
- [ ] Verify more transactions load

### Empty State
- [ ] Create new account with zero balance
- [ ] Visit wallet page
- [ ] Verify empty state shows
- [ ] Verify trophy icon displays
- [ ] Verify "No earnings yet" message
- [ ] Click JOIN TOURNAMENT button
- [ ] Verify redirects to tournaments page

### Animations
- [ ] Refresh wallet page
- [ ] Verify balance counts up from 0
- [ ] Verify animation takes ~1.5 seconds
- [ ] Hover over pending balance pill
- [ ] Verify tooltip appears
- [ ] Add funds successfully
- [ ] Verify green checkmark animation
- [ ] Verify checkmark draws itself

### Mobile Responsiveness
- [ ] Open wallet on mobile device
- [ ] Verify currency selector fits
- [ ] Verify balance card displays correctly
- [ ] Verify action buttons stack vertically
- [ ] Open ADD FUNDS modal
- [ ] Verify modal slides from bottom
- [ ] Verify amount pills wrap correctly
- [ ] Verify card input is usable
- [ ] Open WITHDRAW modal
- [ ] Verify onboarding screen fits
- [ ] Verify withdrawal form is usable

## Stripe Test Cards

### Successful Payments
- **Visa**: 4242 4242 4242 4242
- **Mastercard**: 5555 5555 5555 4444
- **American Express**: 3782 822463 10005

### Failed Payments
- **Declined**: 4000 0000 0000 0002
- **Insufficient funds**: 4000 0000 0000 9995
- **Expired card**: 4000 0000 0000 0069

### Test Details
- **Expiry**: Any future date (e.g., 12/34)
- **CVC**: Any 3 digits (e.g., 123)
- **ZIP**: Any 5 digits (e.g., 12345)

## Testing Without Webhooks

If you're testing before your site is published and don't have webhook secret configured:

### Manual Balance Update (Development Only)

You can manually update user balances for testing using SQL:

```sql
-- Add $25 to available balance
UPDATE profiles
SET available_balance = COALESCE(available_balance, 0) + 25
WHERE id = 'your-user-id';

-- Or use the helper function
SELECT update_user_balance(
  'your-user-id'::uuid,
  25,
  'available'
);
```

### Simulate Webhook Events

You can also manually trigger webhook processing:

1. Make a test payment in Stripe Dashboard
2. Go to the payment details
3. Click "Send test webhook"
4. Select `payment_intent.succeeded`
5. Send to: `https://your-project.supabase.co/functions/v1/stripe-webhook`

This will trigger the webhook handler and update the balance automatically.

### Using Stripe CLI

For more realistic testing, use Stripe CLI to forward webhooks:

```bash
stripe listen --forward-to https://your-project.supabase.co/functions/v1/stripe-webhook
```

This gives you a temporary webhook secret you can use for testing.

---

## Troubleshooting

### Payment Intent Creation Fails
- **Check**: STRIPE_SECRET_KEY is set in Supabase secrets
- **Check**: User is authenticated
- **Check**: Amount is at least $5
- **Check**: Currency is valid

### Webhook Not Receiving Events
- **Check**: STRIPE_WEBHOOK_SECRET is set
- **Check**: Webhook endpoint is configured in Stripe Dashboard
- **Check**: Webhook URL is correct (https://your-project.supabase.co/functions/v1/stripe-webhook)
- **Check**: Webhook signature verification passes

### Connect Account Creation Fails
- **Check**: User is authenticated
- **Check**: STRIPE_SECRET_KEY has Connect permissions
- **Check**: Return URL and refresh URL are valid

### Balance Not Updating
- **Check**: Webhook received and processed
- **Check**: Transaction status is 'completed'
- **Check**: update_user_balance function executed successfully
- **Check**: Profile has available_balance column

### Currency Not Persisting
- **Check**: Profile has currency column
- **Check**: User is authenticated
- **Check**: Currency update query succeeds

## Future Enhancements

- [ ] Add refund functionality
- [ ] Add dispute handling
- [ ] Add transaction receipts (PDF download)
- [ ] Add email notifications for transactions
- [ ] Add spending limits
- [ ] Add transaction search
- [ ] Add date range filters
- [ ] Add export to CSV
- [ ] Add multi-factor authentication for withdrawals
- [ ] Add automatic currency conversion rates display
- [ ] Add transaction categories
- [ ] Add spending analytics
- [ ] Add budget tracking
- [ ] Add recurring payments
- [ ] Add saved payment methods
- [ ] Add payout schedules
- [ ] Add tax reporting
- [ ] Add invoice generation

## Files Created/Modified

### New Files
1. `/supabase/migrations/00024_create_wallet_and_transactions.sql` - Database schema
2. `/supabase/functions/create-payment-intent/index.ts` - Payment intent creation
3. `/supabase/functions/stripe-webhook/index.ts` - Webhook handler
4. `/supabase/functions/create-connect-account/index.ts` - Connect account creation
5. `/supabase/functions/create-payout/index.ts` - Payout processing
6. `/src/components/AddFundsModal.tsx` - Add funds modal with Stripe Elements
7. `/src/components/WithdrawModal.tsx` - Withdrawal modal with Connect
8. `/src/lib/currency.ts` - Currency utilities
9. `/src/hooks/use-count-up.ts` - Count-up animation hook

### Modified Files
1. `/src/pages/Wallet.tsx` - Complete rebuild with all features
2. `/src/types/database.ts` - Added wallet fields to Profile interface
3. `package.json` - Added @stripe/stripe-js and @stripe/react-stripe-js

---

**Version**: 1.0  
**Last Updated**: 2026-04-22  
**Status**: Complete ✅
