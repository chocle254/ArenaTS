# Quick Start - Stripe Integration

## 🚀 Get Started in 3 Steps

### Step 1: Get Stripe Test Keys
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy **Publishable key** (pk_test_...)
3. Copy **Secret key** (sk_test_...)

### Step 2: Configure Keys

**Frontend** - Create `.env` file:
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

**Backend** - Add to Supabase Secrets:
- Name: `STRIPE_SECRET_KEY`
- Value: `sk_test_your_key_here`

### Step 3: Test Payment
1. Click "ADD FUNDS"
2. Enter amount
3. Use card: `4242 4242 4242 4242`
4. Expiry: `12/34`, CVC: `123`
5. Click "PAY NOW"

## ✅ You're Ready!

The wallet will work without webhook secret during development.

---

## 📝 Notes

- **Webhook Secret**: Not needed for testing (optional)
- **Balance Updates**: May need manual trigger in Stripe Dashboard
- **Test Cards**: See STRIPE_SETUP_GUIDE.md for more cards
- **Production**: Follow full setup guide before going live

---

## 🔗 Resources

- **Full Setup Guide**: `STRIPE_SETUP_GUIDE.md`
- **Documentation**: `WALLET_STRIPE_INTEGRATION.md`
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Test Cards**: https://stripe.com/docs/testing

---

## ⚠️ Important

- Use **test keys** only (pk_test_ and sk_test_)
- Never commit keys to git
- Switch to live keys before production
- Set up webhooks before going live
