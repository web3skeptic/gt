// Persistence and sync layer for the gym tracker.
//
// The UI keeps working on its own plain model ({exercises, activeExercises, bodyweight}).
// This module mirrors that model into a local PouchDB database using the same document
// layout as the `organizer` CouchDB (datum-style: {_id, data, meta}, ids "<field>:<time>…"),
// and replicates that database live with a remote CouchDB.
//
//   exercise:<name>                          catalog entry (muscles, hidden, active, order)
//   gym:<utc>_<exercise>_<kg>x<reps>         one document per set
//   weight:<utc>                             one document per bodyweight record
import PouchDB from 'pouchdb-browser';
import { setStatus } from './syncStatus.svelte.js';

export const LOCAL_DB_NAME = 'organizer';
const MANAGED_FIELDS = new Set(['exercise', 'gym', 'weight']);
const SYNC_KEY = 'gt-sync';
const SET_ID_STRUCTURE = '%occurTime%_%exercise%_%weightKg%x%reps%';

export const local = new PouchDB(LOCAL_DB_NAME, { auto_compaction: true });

// ---------------------------------------------------------------- sync config
export function defaultRemoteUrl() {
  const h = location.hostname;
  const isWeb = location.protocol === 'http:' || location.protocol === 'https:';
  if (!isWeb || window.gtDesktop || h === 'localhost' || h === '127.0.0.1') return 'http://127.0.0.1:5984/organizer';
  return `${location.origin}/couch/organizer`;
}

export function loadSyncConfig() {
  try {
    const saved = localStorage.getItem(SYNC_KEY);
    if (saved) return { url: defaultRemoteUrl(), user: '', password: '', ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return { url: defaultRemoteUrl(), user: '', password: '', enabled: false };
}

export function saveSyncConfig(cfg) {
  localStorage.setItem(SYNC_KEY, JSON.stringify(cfg));
}

// ---------------------------------------------------------------- datum helpers
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function datumTime(ms) {
  const d = new Date(ms);
  return { utc: d.toISOString(), o: -d.getTimezoneOffset() / 60, tz: TZ };
}

function humanId() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
}

// ---------------------------------------------------------------- model <-> documents
// UI model -> Map<_id, {data, idStructure?}>
export function stateToDocs({ exercises, activeExercises, bodyweight }) {
  const out = new Map();
  const active = new Set(activeExercises || []);
  (exercises || []).forEach((ex, i) => {
    out.set(`exercise:${ex.name}`, {
      idStructure: '%name%',
      data: {
        field: 'exercise',
        name: ex.name,
        muscles: (ex.engagedMuscles || []).map(m => ({ name: m.name, engagement: num(m.engagement) })),
        hidden: !!ex.isHidden,
        active: active.has(ex.name),
        order: i
      }
    });
    const seen = new Map();
    for (const s of ex.history || []) {
      const t = datumTime(s.timestamp);
      const w = num(s.weight), r = num(s.repetitions);
      const data = { field: 'gym', exercise: ex.name, weightKg: w, reps: r, occurTime: t, source: s.source || 'gym-tracker' };
      if (s.note) data.note = s.note;
      if (s.isDropset) data.dropset = true;
      if (s.isMioset) data.mioset = true;
      let id = `gym:${t.utc}_${ex.name}_${w}x${r}`;
      const n = seen.get(id) || 0;
      seen.set(id, n + 1);
      if (n) out.set(`${id}_${n + 1}`, { data });          // identical set logged twice: keep both
      else out.set(id, { data, idStructure: SET_ID_STRUCTURE });
    }
  });
  for (const b of bodyweight || []) {
    const t = datumTime(b.timestamp);
    const data = { field: 'weight', weightKg: num(b.weight), occurTime: t, source: b.source || 'gym-tracker' };
    if (b.id && !String(b.id).startsWith('weight:')) data.sourceId = b.id;
    if (b.note) data.note = b.note;
    out.set(`weight:${t.utc}`, { data });
  }
  return out;
}

// documents -> UI model
export function docsToState(docs) {
  const exMap = new Map();
  const sets = [], bodyweight = [];
  for (const doc of docs) {
    const d = doc.data;
    if (!d || !MANAGED_FIELDS.has(d.field)) continue;
    if (d.field === 'exercise') {
      exMap.set(d.name, {
        name: d.name, history: [], isHidden: !!d.hidden, engagedMuscles: d.muscles || [],
        _active: !!d.active, _order: typeof d.order === 'number' ? d.order : Infinity
      });
    } else if (d.field === 'gym') {
      sets.push(d);
    } else if (d.field === 'weight' && d.occurTime) {
      bodyweight.push({
        id: d.sourceId || doc._id, timestamp: Date.parse(d.occurTime.utc),
        weight: d.weightKg, note: d.note || '', source: d.source
      });
    }
  }
  for (const d of sets) {
    if (!d.occurTime) continue;
    let ex = exMap.get(d.exercise);
    if (!ex) {
      ex = { name: d.exercise, history: [], isHidden: false, engagedMuscles: [], _active: true, _order: Infinity };
      exMap.set(d.exercise, ex);
    }
    ex.history.push({
      weight: d.weightKg, repetitions: d.reps, note: d.note || '', timestamp: Date.parse(d.occurTime.utc),
      isDropset: !!d.dropset, isMioset: !!d.mioset, ...(d.source && d.source !== 'gym-tracker' ? { source: d.source } : {})
    });
  }
  const exercises = [...exMap.values()].sort((a, b) =>
    (a._order === b._order ? 0 : a._order - b._order) || a.name.localeCompare(b.name));
  const activeExercises = [];
  for (const ex of exercises) {
    ex.history.sort((a, b) => b.timestamp - a.timestamp);
    if (ex._active) activeExercises.push(ex.name);
    delete ex._active;
    delete ex._order;
  }
  bodyweight.sort((a, b) => a.timestamp - b.timestamp);
  return { exercises, activeExercises, bodyweight };
}

// keep provenance and extra fields (e.g. scale body composition) that the UI does not model
function mergeData(existing, desired) {
  const merged = { ...existing, ...desired };
  if (existing.source) merged.source = existing.source;
  if (existing.sourceId && !desired.sourceId) merged.sourceId = existing.sourceId;
  for (const k of ['note', 'dropset', 'mioset']) if (!(k in desired)) delete merged[k];
  return merged;
}

// ---------------------------------------------------------------- local database
let cache = new Map();        // _id -> doc, every managed doc in the local db
const ownRevs = new Set();    // revisions we wrote ourselves; skipped by the change feed

export async function loadAll() {
  const res = await local.allDocs({ include_docs: true });
  cache = new Map();
  for (const row of res.rows) {
    const d = row.doc.data;
    if (d && MANAGED_FIELDS.has(d.field)) cache.set(row.id, row.doc);
  }
  return snapshot();
}

export function snapshot() {
  return { state: docsToState(cache.values()), knownIds: new Set(cache.keys()) };
}

// Write the UI model into the local db. Only documents the model was built from (knownIds)
// may be deleted, so documents that arrived by replication in the meantime are never lost.
export async function persist(state, knownIds) {
  const desired = stateToDocs(state);
  const now = datumTime(Date.now());
  const writes = [];
  for (const [id, { data, idStructure }] of desired) {
    const existing = cache.get(id);
    if (!existing) {
      const meta = { humanId: humanId(), createTime: now, modifyTime: now };
      if (idStructure) meta.idStructure = idStructure;
      writes.push({ _id: id, data, meta });
    } else {
      const merged = mergeData(existing.data, data);
      if (!deepEqual(merged, existing.data)) {
        writes.push({ ...existing, data: merged, meta: { ...(existing.meta || {}), modifyTime: now } });
      }
    }
  }
  for (const [id, doc] of cache) {
    if (!desired.has(id) && knownIds.has(id)) writes.push({ _id: id, _rev: doc._rev, _deleted: true });
  }
  if (!writes.length) return { written: 0, conflicts: 0 };
  const res = await local.bulkDocs(writes);
  let written = 0, conflicts = 0;
  res.forEach((r, i) => {
    const w = writes[i];
    if (r.ok) {
      written++;
      ownRevs.add(r.rev);
      if (w._deleted) cache.delete(w._id);
      else cache.set(w._id, { ...w, _rev: r.rev });
    } else {
      conflicts++;
      console.warn('persist:', w._id, r);
    }
  });
  return { written, conflicts };
}

// Notify when documents change underneath us (replication, another tab).
export function watchChanges(onExternalChange) {
  let timer;
  const feed = local.changes({ since: 'now', live: true, include_docs: true });
  feed.on('change', ch => {
    const d = ch.doc && ch.doc.data;
    const managed = ch.deleted ? cache.has(ch.id) : d && MANAGED_FIELDS.has(d.field);
    if (!managed) return;
    if (ch.deleted) cache.delete(ch.id); else cache.set(ch.id, ch.doc);
    if (ownRevs.has(ch.doc._rev)) { ownRevs.delete(ch.doc._rev); return; }
    clearTimeout(timer);
    timer = setTimeout(onExternalChange, 250);
  });
  feed.on('error', e => console.error('changes feed', e));
  return feed;
}

// ---------------------------------------------------------------- replication
let syncHandler = null;

function remoteDb(cfg) {
  const opts = { skip_setup: true };
  if (cfg.user) opts.auth = { username: cfg.user, password: cfg.password };
  return new PouchDB(cfg.url, opts);
}

export async function testConnection(cfg) {
  const info = await remoteDb(cfg).info();
  return info;
}

export function startSync(cfg) {
  stopSync();
  if (!cfg || !cfg.enabled || !cfg.url) { setStatus({ state: 'off', error: '', remote: '' }); return; }
  setStatus({ state: 'connecting', error: '', remote: cfg.url });
  syncHandler = local.sync(remoteDb(cfg), { live: true, retry: true })
    .on('change', info => setStatus({ state: 'syncing', lastChange: Date.now(), error: '' }))
    .on('active', () => setStatus({ state: 'syncing', error: '' }))
    .on('paused', err => setStatus(err
      ? { state: 'error', error: describe(err) }
      : { state: 'idle', error: '', lastSync: Date.now() }))
    .on('denied', err => setStatus({ state: 'error', error: 'denied: ' + describe(err) }))
    .on('error', err => setStatus({ state: 'error', error: describe(err) }));
}

export function stopSync() {
  if (syncHandler) { syncHandler.cancel(); syncHandler = null; }
}

function describe(err) {
  if (!err) return '';
  if (err.status === 401) return 'wrong user name or password';
  if (err.status === 404) return 'database not found';
  return err.message || err.reason || err.name || String(err);
}

// ---------------------------------------------------------------- bluetooth scale (desktop)
// Readings come from the Electron shell (see electron/scale.cjs); each becomes a `weight`
// document in the same shape the Python importer writes for the Beurer BF500.
export const scaleAvailable = () => typeof window !== 'undefined' && !!window.gtDesktop?.readScale;

export async function readScaleIntoDb(onProgress = () => {}) {
  const desktop = window.gtDesktop;
  const stop = desktop.onScaleProgress(onProgress);
  try {
    const { readings, timedOut } = await desktop.readScale();
    const docs = [];
    for (const r of readings) {
      const t = datumTime(Date.parse(r.scaleTime));          // the scale's clock, local time
      const data = {
        field: 'weight', weightKg: r.weightKg, occurTime: t, source: 'beurer-bf500',
        userIndex: r.userIndex, heightM: r.heightM, bmi: r.bmi,
        receivedAt: datumTime(Date.parse(r.receivedAt)), raw: r.raw
      };
      if (r.bodyComposition) data.bodyComposition = r.bodyComposition;
      const now = datumTime(Date.now());
      docs.push({ _id: `weight:${t.utc}`, data, meta: { humanId: humanId(), createTime: now, modifyTime: now } });
    }
    let added = 0;
    if (docs.length) {
      const res = await local.bulkDocs(docs);   // goes through the change feed, so the UI updates itself
      added = res.filter(r => r.ok).length;
    }
    return { readings: readings.length, added, timedOut };
  } finally {
    stop();
  }
}
