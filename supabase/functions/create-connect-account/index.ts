// Retired (2026-10-21). Stripe payouts skipped the M-Pesa withdrawal limits,
// ID checks and reviews. Winnings are withdrawn with M-Pesa (the mpesa
// function). The old code is in git history before this commit.
Deno.serve(() =>
  new Response(JSON.stringify({ error: 'Card payouts are no longer available. Withdraw to M-Pesa from your wallet.' }), {
    status: 410,
    headers: { 'Content-Type': 'application/json' },
  }),
);
