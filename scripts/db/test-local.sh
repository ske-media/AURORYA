#!/usr/bin/env bash
# `pnpm db:test` — applique les migrations sur un Postgres local jetable et exécute les tests d'isolation.
# Sert en attendant un projet Supabase : un test sur l'instance locale de Supabase reste à ajouter (T-006).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BIN="$(dirname "$(find /usr/lib/postgresql -name initdb -type f 2>/dev/null | sort | tail -1)")"
[ -x "$BIN/initdb" ] || { echo "Postgres introuvable (initdb)"; exit 1; }
WORK="$(mktemp -d)"
PORT=54329
run() { if [ "$(id -u)" = "0" ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
[ "$(id -u)" = "0" ] && chown postgres "$WORK"
cleanup() { run "$BIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT
run "$BIN/initdb" -D "$WORK/data" -U postgres --auth=trust >/dev/null
run "$BIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -c listen_addresses='' -k $WORK" -w start >/dev/null
PSQL=(psql -X -q -v ON_ERROR_STOP=1 -h "$WORK" -p "$PORT" -U postgres -d postgres)
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_shim.sql"
for migration in "$ROOT"/supabase/migrations/*.sql; do
  echo "migration $(basename "$migration")"
  "${PSQL[@]}" -f "$migration"
done
"${PSQL[@]}" -f "$ROOT/supabase/tests/10_rls.sql" 2>&1 | sed -n 's/^.*NOTICE:  //p; /ÉCHEC\|ERROR/p'
test "${PIPESTATUS[0]}" = "0"
echo "db:test : migrations appliquées, tests d'isolation réussis."
