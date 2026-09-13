#!/usr/bin/env bash
# One-time CouchDB setup on the interslavic.space box (Ubuntu). Run as root:
#   COUCHDB_PASSWORD='…' bash server-setup.sh
# Installs CouchDB 3 from the Apache apt repo, binds it to 127.0.0.1:5984 (nginx exposes it
# under /couch/), requires authentication for every request, and creates the `organizer` db.
set -euo pipefail
: "${COUCHDB_PASSWORD:?set COUCHDB_PASSWORD}"
DB_NAME="${DB_NAME:-organizer}"

if ! command -v couchdb >/dev/null && [ ! -x /opt/couchdb/bin/couchdb ]; then
  apt-get update -qq
  apt-get install -y -qq curl apt-transport-https gnupg debconf-utils
  curl -fsSL https://couchdb.apache.org/repo/keys.asc | gpg --dearmor --yes -o /usr/share/keyrings/couchdb-archive-keyring.gpg
  . /etc/os-release
  CODENAME="${VERSION_CODENAME}"
  # the CouchDB repo lags new Ubuntu releases; fall back to the newest LTS it ships
  if ! curl -fsSI "https://apache.jfrog.io/artifactory/couchdb-deb/dists/${CODENAME}/Release" >/dev/null 2>&1; then
    CODENAME=noble
  fi
  echo "deb [signed-by=/usr/share/keyrings/couchdb-archive-keyring.gpg] https://apache.jfrog.io/artifactory/couchdb-deb/ ${CODENAME} main" > /etc/apt/sources.list.d/couchdb.list
  apt-get update -qq
  debconf-set-selections <<SEL
couchdb couchdb/mode select standalone
couchdb couchdb/mode seen true
couchdb couchdb/bindaddress string 127.0.0.1
couchdb couchdb/bindaddress seen true
couchdb couchdb/cookie string $(openssl rand -hex 16)
couchdb couchdb/cookie seen true
couchdb couchdb/adminpass password ${COUCHDB_PASSWORD}
couchdb couchdb/adminpass seen true
couchdb couchdb/adminpass_again password ${COUCHDB_PASSWORD}
couchdb couchdb/adminpass_again seen true
SEL
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq couchdb
fi

cat > /opt/couchdb/etc/local.d/organizer.ini <<INI
[couchdb]
single_node = true

[chttpd]
port = 5984
bind_address = 127.0.0.1
require_valid_user = true

[chttpd_auth]
; session cookies for the web app last a day
timeout = 86400
INI
chown couchdb:couchdb /opt/couchdb/etc/local.d/organizer.ini
systemctl enable --now couchdb
systemctl restart couchdb

for i in $(seq 1 30); do
  curl -fsS -u "admin:${COUCHDB_PASSWORD}" http://127.0.0.1:5984/ >/dev/null 2>&1 && break
  sleep 1
done
curl -fsS -u "admin:${COUCHDB_PASSWORD}" http://127.0.0.1:5984/
echo
for db in _users _replicator "${DB_NAME}"; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -u "admin:${COUCHDB_PASSWORD}" -X PUT "http://127.0.0.1:5984/${db}")
  echo "db ${db}: ${code}"
done
echo "CouchDB ready on 127.0.0.1:5984"
