#!/usr/bin/env bash
# Show the UpesiPay wallet balances (payments, disbursement, service).
# Signs in as an Arena admin and calls the mpesa function's admin-only
# "balances" action. Nothing is saved: the password is read at a hidden prompt.
#
#   bash scripts/upesi-balance.sh                 # asks for email and password
#   ARENA_EMAIL=you@example.com bash scripts/upesi-balance.sh
set -euo pipefail

URL="https://zzanvdihageyedfnrdcx.supabase.co"
KEY="sb_publishable_5PYXvDqU4itpz1oaqft8aQ_TTOBbELo" # public key, same as the website

email="${ARENA_EMAIL:-}"
[ -n "$email" ] || read -rp "Admin email: " email
read -rsp "Password: " password; echo

login() {
  curl -s "$URL/auth/v1/token?grant_type=password" \
    -H "apikey: $KEY" -H "Content-Type: application/json" \
    -d "$(python3 -c 'import json,sys; print(json.dumps({"email": sys.argv[1], "password": sys.argv[2]}))' "$email" "$password")"
}
fn() { # POST to an edge function
  curl -s -X POST "$URL/functions/v1/$1" -H "apikey: $KEY" -H "Content-Type: application/json" -d "$2"
}
resp=$(login)
# Password sign-ins need the emailed sign-in code first (login-code hook)
if grep -q login_code_required <<<"$resp"; then
  fn send-otp "$(python3 -c 'import json,sys; print(json.dumps({"email": sys.argv[1], "purpose": "signin"}))' "$email")" >/dev/null
  read -rp "Code sent to $email: " code
  fn verify-otp "$(python3 -c 'import json,sys; print(json.dumps({"email": sys.argv[1], "code": sys.argv[2], "purpose": "signin"}))' "$email" "$code")" >/dev/null
  resp=$(login)
fi
token=$(python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("access_token") or "")' <<<"$resp")
unset password
[ -n "$token" ] || { echo "Sign-in failed. Check the email and password." >&2; exit 1; }

curl -s -X POST "$URL/functions/v1/mpesa" \
  -H "apikey: $KEY" -H "Authorization: Bearer $token" -H "Content-Type: application/json" \
  -d '{"action":"balances"}' \
  | python3 -c '
import sys, json
d = json.load(sys.stdin)
if "error" in d:
    sys.exit("Error: " + str(d["error"]))
labels = [("service_wallet_balance", "Service wallet"),
          ("disbursement_wallet_balance", "Disbursement wallet (pays winners)"),
          ("payments_wallet_balance", "Payments wallet")]
shown = set()
for k, name in labels:
    if k in d:
        shown.add(k)
        print(f"{name:<38} KES {float(d[k]):>12,.2f}")
for k, v in d.items():
    if k not in shown:
        print(f"{k:<38} {v}")
'
