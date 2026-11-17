#!/usr/bin/env bash
# Back up the Arena database (players, wallets, transactions, tournaments,
# chats, auth users) to a dated file on this device. The free Supabase plan
# has no backups, so run this daily and always before a migration.
#
#   bash scripts/backup-db.sh                 # asks for the connection string
#   ARENA_DB_URL='postgresql://...' bash scripts/backup-db.sh
#
# Connection string: Supabase dashboard > Connect > "Session pooler" (works on
# IPv4 mobile data; the direct db.* host is IPv6 only). It contains the
# database password, so it is read at a hidden prompt and never saved.
#
# Files go to ~/arena-backups (outside the repo, so never committed). The
# newest 30 are kept. Needs pg_dump: pkg install postgresql
#
# Restore (into an empty project, or after a disaster):
#   pg_restore --no-owner --no-privileges -d "$ARENA_DB_URL" ~/arena-backups/<file>.dump
# Private messages stay encrypted with the Vault key 'dm_message_key'; a
# restore into a different project can only read them if that key is
# copied there too.
set -euo pipefail

command -v pg_dump >/dev/null || { echo "pg_dump not found. Install it with: pkg install postgresql"; exit 1; }

db="${ARENA_DB_URL:-}"
[ -n "$db" ] || { read -rsp "Session pooler connection string: " db; echo; }

dir="$HOME/arena-backups"
mkdir -p "$dir"
chmod 700 "$dir"
file="$dir/arena-$(date +%Y%m%d-%H%M).dump"

echo "Dumping to $file ..."
# public: app data; auth: user accounts; storage: file records (files are on B2)
pg_dump "$db" -Fc --no-owner --no-privileges \
  -n public -n auth -n storage \
  -f "$file.part"
mv "$file.part" "$file"
chmod 600 "$file"

# Quick check the file can be read back
tables=$(pg_restore -l "$file" | grep -c "TABLE DATA" || true)
echo "Done: $(du -h "$file" | cut -f1), $tables tables with data."

# Keep the newest 30 backups
ls -1t "$dir"/arena-*.dump 2>/dev/null | tail -n +31 | xargs -r rm --
echo "Backups kept: $(ls -1 "$dir"/arena-*.dump | wc -l) in $dir"
