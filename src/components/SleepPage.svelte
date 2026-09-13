<script>
  import { Plus, Edit2, Trash2, X, Check } from 'lucide-svelte';
  import { formatDate } from '../utils/formatters.js';

  let { sleep, setSleep } = $props();

  const pad = (n) => String(n).padStart(2, '0');
  const dateInput = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const timeInput = (ts) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const fromInputs = (dateStr, timeStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = (timeStr || '00:00').split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm).getTime();
  };
  const hours = (ms) => {
    const mins = Math.round(ms / 60000);
    return `${Math.floor(mins / 60)}h${mins % 60 ? ` ${pad(mins % 60)}m` : ''}`;
  };

  // ---- form ----
  let formDate = $state(dateInput(Date.now()));
  let formStart = $state('');
  let formEnd = $state('');
  let formNote = $state('');
  let editingId = $state(null);

  // The block ends on formDate at formEnd; it started at formStart, the day before if that
  // time is later than the end time (a normal night's sleep).
  const formTimes = $derived.by(() => {
    if (!formDate || !formStart || !formEnd) return null;
    const end = fromInputs(formDate, formEnd);
    let start = fromInputs(formDate, formStart);
    if (start >= end) start -= 24 * 3600 * 1000;
    return { start, end };
  });

  const resetForm = () => {
    formDate = dateInput(Date.now());
    formStart = ''; formEnd = ''; formNote = '';
    editingId = null;
  };

  const submitForm = () => {
    if (!formTimes) return;
    const note = formNote.trim();
    if (editingId) {
      setSleep(sleep.map(b => b.id === editingId ? { ...b, ...formTimes, note } : b));
    } else {
      const id = `${formTimes.end}-${Math.random().toString(36).slice(2, 8)}`;
      setSleep([...sleep, { id, ...formTimes, note }]);
    }
    resetForm();
  };

  const startEdit = (b) => {
    editingId = b.id;
    formDate = dateInput(b.end); formStart = timeInput(b.start); formEnd = timeInput(b.end);
    formNote = b.note || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteBlock = (id) => {
    if (!confirm('Delete this sleep block?')) return;
    setSleep(sleep.filter(b => b.id !== id));
    if (editingId === id) resetForm();
  };

  // ---- grouping by the day the block ended ----
  const days = $derived.by(() => {
    const map = new Map();
    for (const b of [...sleep].sort((a, c) => c.end - a.end)) {
      const key = dateInput(b.end);
      if (!map.has(key)) map.set(key, { key, ts: b.end, blocks: [], total: 0 });
      const day = map.get(key);
      day.blocks.push(b);
      day.total += b.end - b.start;
    }
    return [...map.values()];
  });

  // ---- chart: total hours per day for the last 30 days that have data ----
  const CHART_W = 600, CHART_H = 160, PAD_L = 28, PAD_B = 22, PAD_T = 8;
  const chart = $derived.by(() => {
    const recent = days.slice(0, 30).reverse();
    if (!recent.length) return null;
    const maxH = Math.max(9, ...recent.map(d => d.total / 3600000));
    const w = (CHART_W - PAD_L) / recent.length;
    return {
      bars: recent.map((d, i) => {
        const h = d.total / 3600000;
        const bh = (h / maxH) * (CHART_H - PAD_B - PAD_T);
        return { x: PAD_L + i * w + w * 0.15, w: w * 0.7, y: CHART_H - PAD_B - bh, h: bh, hours: h, label: new Date(d.ts).getDate(), key: d.key };
      }),
      ticks: [0, 3, 6, 9].filter(t => t <= maxH).map(t => ({ t, y: CHART_H - PAD_B - (t / maxH) * (CHART_H - PAD_B - PAD_T) })),
      avg: recent.reduce((s, d) => s + d.total, 0) / recent.length
    };
  });
</script>

<div class="p-4">
  <h1 class="text-2xl font-bold mb-6">Sleep</h1>

  <!-- Add / edit -->
  <div class="mb-6 bg-white p-4 rounded-lg shadow">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-lg font-semibold">{editingId ? 'Edit sleep' : 'Add sleep'}</h2>
      {#if editingId}
        <button onclick={resetForm} class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"><X size={16} /> Cancel</button>
      {/if}
    </div>
    <div class="space-y-3">
      <div>
        <label for="sl-date" class="block text-xs text-gray-600 mb-1">Woke up on</label>
        <input id="sl-date" type="date" bind:value={formDate} class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label for="sl-start" class="block text-xs text-gray-600 mb-1">Fell asleep</label>
          <input id="sl-start" type="time" bind:value={formStart} class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label for="sl-end" class="block text-xs text-gray-600 mb-1">Woke up</label>
          <input id="sl-end" type="time" bind:value={formEnd} class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      {#if formTimes}
        <p class="text-xs text-gray-500">
          {formatDate(formTimes.start)} {timeInput(formTimes.start)} → {formatDate(formTimes.end)} {timeInput(formTimes.end)} · {hours(formTimes.end - formTimes.start)}
        </p>
      {/if}
      <div>
        <label for="sl-note" class="block text-xs text-gray-600 mb-1">Note (optional)</label>
        <textarea id="sl-note" bind:value={formNote} rows="2" placeholder="e.g. woke up early, nap" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"></textarea>
      </div>
      <button onclick={submitForm} disabled={!formTimes} class="w-full flex items-center justify-center px-3 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300">
        {#if editingId}<Check size={16} class="mr-1" /> Save changes{:else}<Plus size={16} class="mr-1" /> Add sleep{/if}
      </button>
    </div>
  </div>

  <!-- Chart -->
  <div class="mb-6 bg-white p-4 rounded-lg shadow">
    <div class="flex items-baseline justify-between mb-3">
      <h2 class="text-lg font-semibold">Hours per day</h2>
      {#if chart}<span class="text-xs text-gray-500">avg {hours(chart.avg)} over {chart.bars.length} days</span>{/if}
    </div>
    {#if chart}
      <svg viewBox="0 0 {CHART_W} {CHART_H}" class="w-full h-auto" role="img" aria-label="Sleep hours per day">
        {#each chart.ticks as tick (tick.t)}
          <line x1={PAD_L} x2={CHART_W} y1={tick.y} y2={tick.y} stroke="#e5e7eb" stroke-width="1" />
          <text x={PAD_L - 6} y={tick.y + 4} text-anchor="end" font-size="11" fill="#6b7280">{tick.t}h</text>
        {/each}
        {#each chart.bars as bar (bar.key)}
          <rect x={bar.x} y={bar.y} width={bar.w} height={bar.h} rx="2" fill={bar.hours < 6 ? '#f59e0b' : '#3b82f6'}>
            <title>{bar.key}: {hours(bar.hours * 3600000)}</title>
          </rect>
          <text x={bar.x + bar.w / 2} y={CHART_H - 6} text-anchor="middle" font-size="10" fill="#9ca3af">{bar.label}</text>
        {/each}
      </svg>
    {:else}
      <p class="text-sm text-gray-500 text-center py-6">No sleep recorded yet.</p>
    {/if}
  </div>

  <!-- History -->
  <div class="bg-white p-4 rounded-lg shadow">
    <h2 class="text-lg font-semibold mb-3">
      History {#if days.length}<span class="text-sm font-normal text-gray-500">({days.length} days)</span>{/if}
    </h2>
    {#if !days.length}
      <p class="text-sm text-gray-500 text-center py-4">No records yet.</p>
    {:else}
      <div class="space-y-3 max-h-[28rem] overflow-y-auto">
        {#each days as day (day.key)}
          <div>
            <div class="flex items-baseline justify-between text-sm">
              <span class="font-semibold">{formatDate(day.ts)}</span>
              <span class="text-gray-600">{hours(day.total)}</span>
            </div>
            {#each day.blocks as b (b.id)}
              <div class="flex items-start justify-between bg-gray-50 px-3 py-2 rounded mt-1">
                <div class="min-w-0 flex-1 mr-2">
                  <div class="text-sm">
                    {timeInput(b.start)}{dateInput(b.start) !== day.key ? ' (prev. day)' : ''} – {timeInput(b.end)}
                    <span class="text-xs text-gray-500 ml-1">{hours(b.end - b.start)}</span>
                  </div>
                  {#if b.note}<div class="text-xs text-gray-700 mt-1 whitespace-pre-wrap break-words">{b.note}</div>{/if}
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <button onclick={() => startEdit(b)} aria-label="Edit sleep block" class="p-2 text-gray-500 hover:text-blue-600"><Edit2 size={16} /></button>
                  <button onclick={() => deleteBlock(b.id)} aria-label="Delete sleep block" class="p-2 text-gray-500 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
            {/each}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
