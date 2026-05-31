# Stripe Integration Setup Guide

## Development Setup (Without Webhooks)

Since your site hasn't been published yet, you can test the Stripe integration without webhook verification. The webhook handler has been configured to work in development mode.

### Step 1: Get Stripe Test Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Make sure you're in **Test Mode** (toggle in top right)
3. Copy your **Publishable key** (starts with `pk_test_`)
4. Copy your **Secret key** (starts with `sk_test_`)

### Step 2: Configure Frontend

Create a `.env` file in your project root:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

### Step 3: Configure Backend (Supabase)

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Add the following secret:
   - Name: `STRIPE_SECRET_KEY`
   - Value: `sk_test_your_key_here`

**Note**: You can skip `STRIPE_WEBHOOK_SECRET` for now. The webhook handler will work without it in development mode (though it will log warnings).

### Step 4: Test Payments

You can now test the payment flow:

1. **Add Funds**:
   - Click "ADD FUNDS" button
   - Select an amount
   - Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - Click "PAY NOW"

2. **Check Payment Status**:
   - Go to [Stripe Dashboard → Payments](https://dashboard.stripe.com/test/payments)
   - You should see your test payment

3. **Trigger Webhook Manually** (for testing):
   - In Stripe Dashboard, click on the payment
   - Click "Send test webhook" button
   - Select `payment_intent.succeeded`
   - Send to your webhook URL: `https://your-project.supabase.co/functions/v1/stripe-webhook`

### Development Mode Limitations

⚠️ **Important**: Without webhook verification:
- Webhooks will work but are **not secure**
- Anyone could send fake webhook events
- **Only use for development/testing**
- Balance updates may be delayed (manual webhook trigger needed)

---

## Production Setup (With Webhooks)

Once your site is published, follow these steps to enable secure webhook verification:

### Step 1: Get Production Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Switch to **Live Mode** (toggle in top right)
3. Copy your **Live Publishable key** (starts with `pk_live_`)
4. Copy your **Live Secret key** (starts with `sk_live_`)

### Step 2: Configure Webhook Endpoint

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Enter your webhook URL:
   ```
   https://your-project.supabase.co/functions/v1/stripe-webhook
   ```
4. Select events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payout.paid`
   - `payout.failed`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_`)

### Step 3: Update Environment Variables

**Frontend** (.env):
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_key_here
```

**Backend** (Supabase Secrets):
1. Update `STRIPE_SECRET_KEY` to your live key
2. Add `STRIPE_WEBHOOK_SECRET` with the signing secret from Step 2

### Step 4: Test Production Webhooks

1. Make a test payment in live mode
2. Check Stripe Dashboard → Webhooks → Your endpoint
3. Verify webhook was delivered successfully
4. Check your database to confirm balance was updated

---

## Testing Without Publishing

If you want to test webhooks before publishing, you can use **Stripe CLI**:

### Install Stripe CLI

**macOS**:
```bash
brew install stripe/stripe-cli/stripe
```

**Windows**:
```bash
scoop install stripe
```

**Linux**:
```bash
# Download from https://github.com/stripe/stripe-cli/releases
```

### Forward Webhooks to Local Development

1. Login to Stripe:
   ```bash
   stripe login
   ```

2. Forward webhooks to your Supabase function:
   ```bash
   stripe listen --forward-to https://your-project.supabase.co/functions/v1/stripe-webhook
   ```

3. Copy the webhook signing secret (starts with `whsec_`)

4. Add it to Supabase secrets as `STRIPE_WEBHOOK_SECRET`

5. Make test payments and watch webhooks arrive in real-time

---

## Troubleshooting

### Payment succeeds but balance doesn't update

**Cause**: Webhook not received or processed

**Solutions**:
1. Check Stripe Dashboard → Webhooks → Your endpoint
2. Look for failed webhook deliveries
3. Check webhook logs for errors
4. Manually trigger webhook from Stripe Dashboard
5. Verify `STRIPE_WEBHOOK_SECRET` is set correctly

### "Missing signature" error

**Cause**: Webhook secret is set but signature is invalid

**Solutions**:
1. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
2. Check webhook endpoint URL is correct
3. Ensure you're using the correct environment (test vs live)

### "Invalid amount" error

**Cause**: Amount is less than minimum ($5)

**Solution**: Enter amount of $5 or more

### Connect account onboarding fails

**Cause**: Stripe Connect not enabled or invalid return URL

**Solutions**:
1. Enable Stripe Connect in Dashboard → Settings → Connect
2. Verify return URL is correct (should be your site URL + `/wallet`)
3. Check browser console for errors

---

## Security Best Practices

### Development
- ✅ Use test keys only
- ✅ Never commit keys to git
- ✅ Use environment variables
- ✅ Test with Stripe test cards only

### Production
- ✅ Use live keys only
- ✅ Enable webhook signature verification
- ✅ Use HTTPS only
- ✅ Monitor webhook deliveries
- ✅ Set up webhook retry logic
- ✅ Log all payment events
- ✅ Enable Stripe Radar for fraud detection
- ✅ Set up email notifications for failed payments

---

## Stripe Test Cards

### Successful Payments
- **Visa**: `4242 4242 4242 4242`
- **Visa (debit)**: `4000 0566 5566 5556`
- **Mastercard**: `5555 5555 5555 4444`
- **American Express**: `3782 822463 10005`

### Failed Payments
- **Declined**: `4000 0000 0000 0002`
- **Insufficient funds**: `4000 0000 0000 9995`
- **Lost card**: `4000 0000 0000 9987`
- **Stolen card**: `4000 0000 0000 9979`

### 3D Secure Authentication
- **Required**: `4000 0027 6000 3184`
- **Optional**: `4000 0025 0000 3155`

### Test Details (for all cards)
- **Expiry**: Any future date (e.g., `12/34`)
- **CVC**: Any 3 digits (e.g., `123`)
- **ZIP**: Any 5 digits (e.g., `12345`)

---

## Monitoring & Logs

### Stripe Dashboard
- **Payments**: View all payment attempts
- **Webhooks**: Monitor webhook deliveries
- **Logs**: View API request logs
- **Events**: See all Stripe events

### Supabase Logs
- **Edge Functions**: View function execution logs
- **Database**: Monitor transaction inserts
- **Auth**: Track user authentication

### What to Monitor
- Payment success rate
- Webhook delivery rate
- Failed payment reasons
- Average transaction amount
- User balance changes
- Payout success rate

---

## Going Live Checklist

Before switching to live mode:

- [ ] Test all payment flows with test cards
- [ ] Test webhook delivery and processing
- [ ] Test Connect account onboarding
- [ ] Test payout creation
- [ ] Verify balance updates correctly
- [ ] Test transaction history display
- [ ] Test currency conversion
- [ ] Test error handling
- [ ] Review Stripe Dashboard settings
- [ ] Enable Stripe Radar
- [ ] Set up email notifications
- [ ] Update environment variables to live keys
- [ ] Configure production webhook endpoint
- [ ] Test one live payment with small amount
- [ ] Monitor logs for 24 hours
- [ ] Set up alerts for failed payments

---

## Support

### Stripe Support
- **Documentation**: https://stripe.com/docs
- **Support**: https://support.stripe.com
- **Status**: https://status.stripe.com

### Common Issues
- **Payment fails**: Check card details, try different card
- **Webhook not received**: Check endpoint URL, verify secret
- **Balance not updating**: Manually trigger webhook
- **Connect onboarding fails**: Check return URL, enable Connect

---

## Next Steps

1. **Now**: Test with development setup (no webhook secret needed)
2. **Before launch**: Set up production webhook endpoint
3. **After launch**: Monitor payments and webhooks
4. **Ongoing**: Review Stripe Dashboard regularly

**Current Status**: ✅ Development mode enabled (webhook verification disabled)

**When ready for production**: Follow "Production Setup" section above
