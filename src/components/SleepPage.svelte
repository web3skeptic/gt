<script>
  import { Plus, Edit2, Trash2, X, Check, ChevronDown, ChevronUp } from 'lucide-svelte';
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

  // ---- timeline: one row per day, from 20:00 the evening before to 20:00, so a night is one line ----
  const ROW_H = 14, LABEL_W = 46, TOTAL_W = 44, STRIP_W = 600, DAY_MS = 24 * 3600 * 1000;
  const WINDOW_START_HOUR = 20;
  const rowStart = (dateKey) => {           // 20:00 of the previous calendar day, local time
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, d - 1, WINDOW_START_HOUR, 0).getTime();
  };
  const timeline = $derived.by(() => {
    if (!sleep.length) return null;
    const latest = Math.max(Date.now(), ...sleep.map(b => b.end));
    const earliest = Math.min(...sleep.map(b => b.start));
    const nDays = Math.min(400, Math.ceil((latest - earliest) / DAY_MS) + 1);
    const rows = [];
    for (let i = 0; i < nDays; i++) {
      const key = dateInput(latest - i * DAY_MS);
      const start = rowStart(key), end = start + DAY_MS;
      const segs = [];
      let total = 0;
      for (const b of sleep) {
        const s0 = Math.max(b.start, start), s1 = Math.min(b.end, end);
        if (s1 <= s0) continue;
        segs.push({ x: ((s0 - start) / DAY_MS) * STRIP_W, w: Math.max(1.5, ((s1 - s0) / DAY_MS) * STRIP_W), block: b });
        total += s1 - s0;
      }
      rows.push({ key, ts: start + DAY_MS / 2, segs, total, y: i * ROW_H });
    }
    const ticks = [20, 0, 4, 8, 12, 16].map((h, i) => ({ h, x: (i * 4 / 24) * STRIP_W }));
    return { rows, ticks, h: rows.length * ROW_H, width: LABEL_W + STRIP_W + TOTAL_W };
  });
  let hoverBlock = $state(null);
  let historyOpen = $state(false);
  // the strip scales with its container; show 10 rows and let the rest scroll
  const VISIBLE_ROWS = 10, HEADER_H = 14;
  let stripWidth = $state(0);
  const unit = $derived(timeline && stripWidth ? stripWidth / timeline.width : 0);
  const stripMaxHeight = $derived(unit ? (HEADER_H + VISIBLE_ROWS * ROW_H + 2) * unit : 0);
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

  <!-- Timeline -->
  <div class="mb-6 bg-white p-4 rounded-lg shadow">
    <div class="flex items-baseline justify-between mb-2">
      <h2 class="text-lg font-semibold">When you slept</h2>
      {#if hoverBlock}
        <span class="text-xs text-gray-600">{formatDate(hoverBlock.start)} {timeInput(hoverBlock.start)} – {timeInput(hoverBlock.end)} · {hours(hoverBlock.end - hoverBlock.start)}</span>
      {:else}
        <span class="text-xs text-gray-400">20:00 → 20:00, one row per day</span>
      {/if}
    </div>
    {#if timeline}
      <div bind:clientWidth={stripWidth} class="overflow-y-auto overscroll-contain" style="max-height: {stripMaxHeight ? stripMaxHeight + 'px' : 'none'}">
      <svg viewBox="0 0 {timeline.width} {timeline.h + 16}" class="w-full h-auto" role="img" aria-label="Sleep timeline">
        {#each timeline.ticks as tick (tick.h)}
          <line x1={LABEL_W + tick.x} x2={LABEL_W + tick.x} y1="12" y2={timeline.h + 14} stroke={tick.h === 0 ? '#9ca3af' : '#e5e7eb'} stroke-width="1" />
          <text x={LABEL_W + tick.x} y="9" text-anchor="middle" font-size="9" fill="#6b7280">{pad(tick.h)}:00</text>
        {/each}
        {#each timeline.rows as row (row.key)}
          <text x={LABEL_W - 6} y={14 + row.y + ROW_H - 4} text-anchor="end" font-size="9" fill={row.segs.length ? '#374151' : '#c4c8d0'}>{new Date(row.ts).toLocaleDateString([], { day: '2-digit', month: 'short' })}</text>
          <rect x={LABEL_W} y={14 + row.y + 1} width={STRIP_W} height={ROW_H - 2} fill="#f9fafb" />
          {#each row.segs as seg, i (i)}
            <rect
              x={LABEL_W + seg.x} y={14 + row.y + 1} width={seg.w} height={ROW_H - 2} rx="1.5"
              fill={seg.block.end - seg.block.start < 2 * 3600 * 1000 ? '#93c5fd' : '#3b82f6'}
              role="presentation"
              onpointerenter={() => hoverBlock = seg.block}
              onpointerleave={() => hoverBlock = null}
              onclick={() => startEdit(seg.block)}
              class="cursor-pointer"
            >
              <title>{timeInput(seg.block.start)} – {timeInput(seg.block.end)} · {hours(seg.block.end - seg.block.start)}{seg.block.note ? ` · ${seg.block.note}` : ''}</title>
            </rect>
          {/each}
          {#if row.total}
            <text x={LABEL_W + STRIP_W + 6} y={14 + row.y + ROW_H - 4} font-size="9" fill={row.total < 6 * 3600 * 1000 ? '#d97706' : '#374151'}>{hours(row.total)}</text>
          {/if}
        {/each}
      </svg>
      </div>
      {#if timeline.rows.length > VISIBLE_ROWS}
        <p class="text-[11px] text-gray-400 mt-1">Scroll the strip for earlier days ({timeline.rows.length} days).</p>
      {/if}
    {:else}
      <p class="text-sm text-gray-500 text-center py-6">No sleep recorded yet.</p>
    {/if}
  </div>

  <!-- History -->
  <div class="bg-white p-4 rounded-lg shadow">
    <button onclick={() => historyOpen = !historyOpen} class="w-full flex items-center justify-between text-left">
      <h2 class="text-lg font-semibold">
        History {#if days.length}<span class="text-sm font-normal text-gray-500">({days.length} days)</span>{/if}
      </h2>
      {#if historyOpen}<ChevronUp size={18} class="text-gray-500" />{:else}<ChevronDown size={18} class="text-gray-500" />{/if}
    </button>
    {#if !historyOpen}
      <!-- collapsed -->
    {:else if !days.length}
      <p class="text-sm text-gray-500 text-center py-4">No records yet.</p>
    {:else}
      <div class="space-y-3 max-h-[28rem] overflow-y-auto mt-3">
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
