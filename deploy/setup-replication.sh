#!/usr/bin/env bash
# Keep the Mac's CouchDB (local-organizer) and the server's CouchDB in continuous two-way sync.
# Run on the Mac; the Mac initiates both directions because the server cannot reach the Mac.
#   LOCAL_PASSWORD='…' SERVER_PASSWORD='…' bash deploy/setup-replication.sh
# Replication jobs live in the Mac CouchDB's _replicator database and survive restarts; CouchDB's
# scheduler retries them automatically when the Mac is offline.
set -euo pipefail
: "${LOCAL_PASSWORD:?set LOCAL_PASSWORD}"; : "${SERVER_PASSWORD:?set SERVER_PASSWORD}"
LOCAL="${LOCAL_URL:-http://127.0.0.1:5984}"
LOCAL_DB="${LOCAL_DB:-organizer}"
SERVER_DB_URL="${SERVER_DB_URL:-https://interslavic.space/couch/organizer}"
SERVER_USER="${SERVER_USER:-admin}"

auth_local=(-u "admin:${LOCAL_PASSWORD}")
server_auth=$(python3 -c "import json,sys; print(json.dumps({'basic': {'username': sys.argv[1], 'password': sys.argv[2]}}))" "${SERVER_USER}" "${SERVER_PASSWORD}")

put_job() {  # name source target
  local name="$1" src="$2" tgt="$3" rev
  rev=$(curl -s "${auth_local[@]}" "${LOCAL}/_replicator/${name}" | python3 -c "import json,sys; print(json.load(sys.stdin).get('_rev',''))")
  python3 - "$name" "$src" "$tgt" "$rev" "$server_auth" <<'PY' | curl -s "${auth_local[@]}" -X PUT "${LOCAL}/_replicator/${name}" -H 'Content-Type: application/json' -d @-
import json, sys
name, src, tgt, rev, server_auth = sys.argv[1:6]
server_auth = json.loads(server_auth)
def ep(url):
    return {"url": url, "auth": server_auth} if url.startswith("https://") else {"url": url, "auth": {"basic": {"username": "admin", "password": __import__("os").environ["LOCAL_PASSWORD"]}}}
doc = {"_id": name, "source": ep(src), "target": ep(tgt), "continuous": True, "create_target": False}
if rev: doc["_rev"] = rev
print(json.dumps(doc))
PY
  echo
}

put_job organizer-push "${LOCAL}/${LOCAL_DB}" "${SERVER_DB_URL}"
put_job organizer-pull "${SERVER_DB_URL}" "${LOCAL}/${LOCAL_DB}"
sleep 3
curl -s "${auth_local[@]}" "${LOCAL}/_scheduler/docs" | python3 -c "
import json,sys
for d in json.load(sys.stdin)['docs']:
    print(f\"{d['doc_id']:16s} {d['state']:10s} {d.get('info') or ''}\")"
