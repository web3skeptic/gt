<script>
  import { Plus, Edit2, Trash2, X, Check, ChevronDown, ChevronUp } from 'lucide-svelte';
  import { formatDate } from '../utils/formatters.js';
  import { MUSIC_METRICS } from '../lib/db.js';

  let { pieces, setPieces, music, setMusic } = $props();

  const pad = (n) => String(n).padStart(2, '0');
  const dateInput = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const timeInput = (ts) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const fromInputs = (dateStr, timeStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = (timeStr || '00:00').split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm).getTime();
  };

  const METRICS = [
    { key: 'score', label: 'Score', unit: '/100', better: 'up' },
    { key: 'errors', label: 'Errors', unit: '', better: 'down' },
    { key: 'perfectPct', label: 'Perfect', unit: '%', better: 'up' },
    { key: 'avgDevMs', label: 'Avg deviation', unit: ' ms', better: 'down' },
    { key: 'cleanReleasesPct', label: 'Clean releases', unit: '%', better: 'up' },
    { key: 'bestStreak', label: 'Best streak', unit: '', better: 'up' },
    { key: 'hits', label: 'Hits', unit: '', better: 'up' }
  ];

  // ---- pieces ----
  let selected = $state('');
  $effect(() => { if (!selected && pieces.length) selected = pieces[0].name; });
  let newPieceName = $state('');
  let addingPiece = $state(false);
  const addPiece = () => {
    const name = newPieceName.trim();
    if (!name || name.includes(':')) return;
    if (!pieces.some(p => p.name === name)) setPieces([...pieces, { name, active: true }]);
    selected = name; newPieceName = ''; addingPiece = false;
  };
  const removePiece = (name) => {
    const runs = music.filter(r => r.piece === name).length;
    if (!confirm(runs ? `Delete "${name}" and its ${runs} runs?` : `Delete "${name}"?`)) return;
    setPieces(pieces.filter(p => p.name !== name));
    setMusic(music.filter(r => r.piece !== name));
    if (selected === name) selected = pieces.find(p => p.name !== name)?.name || '';
  };

  // ---- runs of the selected piece ----
  const runs = $derived(music.filter(r => r.piece === selected).sort((a, b) => a.timestamp - b.timestamp));
  const latest = $derived(runs.at(-1) || null);

  // ---- form ----
  const emptyForm = () => ({ date: dateInput(Date.now()), time: timeInput(Date.now()), grade: '', note: '',
    ...Object.fromEntries(MUSIC_METRICS.map(k => [k, ''])) });
  let form = $state(emptyForm());
  let editingId = $state(null);
  const resetForm = () => { form = emptyForm(); editingId = null; };
  const hasMetric = $derived(MUSIC_METRICS.some(k => form[k] !== '' && form[k] !== null));

  const submitForm = () => {
    if (!selected || !hasMetric) return;
    const timestamp = fromInputs(form.date, form.time);
    const rec = { piece: selected, timestamp, note: form.note.trim(), grade: form.grade.trim().toUpperCase() };
    for (const k of MUSIC_METRICS) if (form[k] !== '' && form[k] !== null) rec[k] = Number(form[k]);
    if (editingId) {
      setMusic(music.map(r => r.id === editingId ? { ...r, ...rec, ...Object.fromEntries(MUSIC_METRICS.filter(k => !(k in rec)).map(k => [k, undefined])) } : r));
    } else {
      setMusic([...music, { id: `${timestamp}-${Math.random().toString(36).slice(2, 8)}`, ...rec }]);
    }
    resetForm();
  };

  const startEdit = (r) => {
    editingId = r.id;
    form = { date: dateInput(r.timestamp), time: timeInput(r.timestamp), grade: r.grade || '', note: r.note || '',
      ...Object.fromEntries(MUSIC_METRICS.map(k => [k, r[k] ?? ''])) };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const deleteRun = (id) => {
    if (!confirm('Delete this run?')) return;
    setMusic(music.filter(r => r.id !== id));
    if (editingId === id) resetForm();
  };

  // ---- chart of one metric over the runs ----
  let metricKey = $state('errors');
  const CHART_W = 600, CHART_H = 180, PAD_L = 36, PAD_R = 12, PAD_T = 12, PAD_B = 24;
  const chart = $derived.by(() => {
    const metric = METRICS.find(m => m.key === metricKey);
    const pts = runs.filter(r => typeof r[metricKey] === 'number');
    if (pts.length < 1) return null;
    const vals = pts.map(r => r[metricKey]);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (lo === hi) { lo -= 1; hi += 1; }
    const padV = (hi - lo) * 0.1; lo = Math.max(0, lo - padV); hi += padV;
    const x = (i) => PAD_L + (pts.length === 1 ? (CHART_W - PAD_L - PAD_R) / 2 : (i / (pts.length - 1)) * (CHART_W - PAD_L - PAD_R));
    const y = (v) => PAD_T + (1 - (v - lo) / (hi - lo)) * (CHART_H - PAD_T - PAD_B);
    const points = pts.map((r, i) => ({ x: x(i), y: y(r[metricKey]), v: r[metricKey], r }));
    const ticks = [0, 0.5, 1].map(f => { const v = lo + f * (hi - lo); return { v: Math.round(v * 10) / 10, y: y(v) }; });
    const first = pts[0][metricKey], last = pts.at(-1)[metricKey];
    const improved = metric.better === 'up' ? last > first : last < first;
    return { metric, points, ticks, path: points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '), first, last, improved };
  });
  let historyOpen = $state(false);
</script>

<div class="p-4">
  <h1 class="text-2xl font-bold mb-6">Music</h1>

  <!-- Piece selector -->
  <div class="mb-6 bg-white p-4 rounded-lg shadow">
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-sm font-semibold text-gray-700">Composition</h2>
      <button onclick={() => addingPiece = !addingPiece} class="text-sm text-blue-600 flex items-center gap-1"><Plus size={14} /> Add</button>
    </div>
    {#if addingPiece}
      <div class="flex gap-2 mb-2">
        <input type="text" bind:value={newPieceName} placeholder="e.g. Clair de Lune" class="flex-1 p-2 border rounded-md text-sm" onkeydown={(e) => e.key === 'Enter' && addPiece()} />
        <button onclick={addPiece} disabled={!newPieceName.trim()} class="px-3 py-2 bg-blue-500 text-white rounded-md text-sm disabled:opacity-50">Save</button>
      </div>
    {/if}
    {#if pieces.length}
      <div class="flex flex-wrap gap-2">
        {#each pieces as p (p.name)}
          <button
            onclick={() => selected = p.name}
            class="px-3 py-1.5 rounded-full text-sm border {selected === p.name ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300'}"
          >{p.name}</button>
        {/each}
      </div>
      {#if latest}
        <div class="mt-3 text-xs text-gray-600">
          Last run {formatDate(latest.timestamp)} {timeInput(latest.timestamp)}:
          {#if latest.score !== undefined} score {latest.score}/100 ·{/if}
          {#if latest.errors !== undefined} {latest.errors} errors ·{/if}
          {#if latest.perfectPct !== undefined} {latest.perfectPct}% perfect ·{/if}
          {#if latest.avgDevMs !== undefined} {latest.avgDevMs} ms{/if}
          <span class="text-gray-400">· {runs.length} runs</span>
        </div>
      {/if}
    {:else}
      <p class="text-sm text-gray-500">No compositions yet. Add one to start tracking.</p>
    {/if}
  </div>

  {#if selected}
    <!-- Add / edit run -->
    <div class="mb-6 bg-white p-4 rounded-lg shadow">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold">{editingId ? 'Edit run' : 'Add run'} <span class="text-sm font-normal text-gray-500">· {selected}</span></h2>
        {#if editingId}
          <button onclick={resetForm} class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"><X size={16} /> Cancel</button>
        {/if}
      </div>
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label for="mu-date" class="block text-xs text-gray-600 mb-1">Date</label>
            <input id="mu-date" type="date" bind:value={form.date} class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <div>
            <label for="mu-time" class="block text-xs text-gray-600 mb-1">Time</label>
            <input id="mu-time" type="time" bind:value={form.time} class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
        </div>
        <div class="grid grid-cols-4 gap-2">
          <div>
            <label for="mu-grade" class="block text-xs text-gray-600 mb-1">Grade</label>
            <input id="mu-grade" type="text" maxlength="2" bind:value={form.grade} placeholder="D" class="w-full px-2 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          {#each METRICS as m (m.key)}
            <div>
              <label for={'mu-' + m.key} class="block text-xs text-gray-600 mb-1">{m.label}{m.unit.trim() ? ` (${m.unit.trim()})` : ''}</label>
              <input id={'mu-' + m.key} type="number" step="1" min="0" inputmode="numeric" bind:value={form[m.key]} class="w-full px-2 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
          {/each}
        </div>
        <div>
          <label for="mu-note" class="block text-xs text-gray-600 mb-1">Note (optional)</label>
          <textarea id="mu-note" bind:value={form.note} rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-y"></textarea>
        </div>
        <button onclick={submitForm} disabled={!hasMetric} class="w-full flex items-center justify-center px-3 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300">
          {#if editingId}<Check size={16} class="mr-1" /> Save changes{:else}<Plus size={16} class="mr-1" /> Add run{/if}
        </button>
      </div>
    </div>

    <!-- Progress chart -->
    <div class="mb-6 bg-white p-4 rounded-lg shadow">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold">Progress</h2>
        <select bind:value={metricKey} class="text-sm border rounded-md p-1">
          {#each METRICS as m (m.key)}<option value={m.key}>{m.label}</option>{/each}
        </select>
      </div>
      {#if chart}
        <svg viewBox="0 0 {CHART_W} {CHART_H}" class="w-full h-auto" role="img" aria-label="{chart.metric.label} over runs">
          {#each chart.ticks as t (t.y)}
            <line x1={PAD_L} x2={CHART_W - PAD_R} y1={t.y} y2={t.y} stroke="#e5e7eb" />
            <text x={PAD_L - 6} y={t.y + 4} text-anchor="end" font-size="10" fill="#6b7280">{t.v}</text>
          {/each}
          <path d={chart.path} fill="none" stroke={chart.improved ? '#16a34a' : '#3b82f6'} stroke-width="2" />
          {#each chart.points as p, i (i)}
            <circle cx={p.x} cy={p.y} r="4" fill={chart.improved ? '#16a34a' : '#3b82f6'}><title>{formatDate(p.r.timestamp)} {timeInput(p.r.timestamp)}: {p.v}{chart.metric.unit}</title></circle>
            {#if i === 0 || i === chart.points.length - 1 || chart.points.length <= 8}
              <text x={p.x} y={CHART_H - 8} text-anchor="middle" font-size="9" fill="#9ca3af">{new Date(p.r.timestamp).toLocaleDateString([], { day: '2-digit', month: 'short' })}</text>
            {/if}
          {/each}
        </svg>
        <p class="text-xs text-gray-500 mt-1">{chart.metric.label}: {chart.first}{chart.metric.unit} → {chart.last}{chart.metric.unit} over {chart.points.length} runs{chart.improved ? ', improving' : ''}.</p>
      {:else}
        <p class="text-sm text-gray-500 text-center py-6">No runs with this value yet.</p>
      {/if}
    </div>

    <!-- History -->
    <div class="bg-white p-4 rounded-lg shadow">
      <button onclick={() => historyOpen = !historyOpen} class="w-full flex items-center justify-between text-left">
        <h2 class="text-lg font-semibold">History <span class="text-sm font-normal text-gray-500">({runs.length})</span></h2>
        {#if historyOpen}<ChevronUp size={18} class="text-gray-500" />{:else}<ChevronDown size={18} class="text-gray-500" />{/if}
      </button>
      {#if historyOpen}
        <div class="space-y-1 max-h-96 overflow-y-auto mt-3">
          {#each [...runs].reverse() as r (r.id)}
            <div class="flex items-start justify-between bg-gray-50 px-3 py-2 rounded">
              <div class="min-w-0 flex-1 mr-2">
                <div class="text-sm font-semibold">
                  {#if r.grade}{r.grade}{/if}{#if r.score !== undefined} {r.score}/100{/if}
                  {#if r.errors !== undefined}<span class="font-normal"> · {r.errors} errors</span>{/if}
                  {#if r.perfectPct !== undefined}<span class="font-normal"> · {r.perfectPct}% perfect</span>{/if}
                </div>
                <div class="text-xs text-gray-600">{formatDate(r.timestamp)} · {timeInput(r.timestamp)}
                  {#if r.avgDevMs !== undefined} · {r.avgDevMs} ms{/if}{#if r.cleanReleasesPct !== undefined} · {r.cleanReleasesPct}% clean{/if}{#if r.bestStreak !== undefined} · streak {r.bestStreak}{/if}{#if r.hits !== undefined} · {r.hits} hits{/if}
                </div>
                {#if r.note}<div class="text-xs text-gray-700 mt-1 whitespace-pre-wrap break-words">{r.note}</div>{/if}
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button onclick={() => startEdit(r)} aria-label="Edit run" class="p-2 text-gray-500 hover:text-blue-600"><Edit2 size={16} /></button>
                <button onclick={() => deleteRun(r.id)} aria-label="Delete run" class="p-2 text-gray-500 hover:text-red-600"><Trash2 size={16} /></button>
              </div>
            </div>
          {/each}
        </div>
        <button onclick={() => removePiece(selected)} class="mt-3 text-xs text-red-500">Delete this composition</button>
      {/if}
    </div>
  {/if}
</div>
