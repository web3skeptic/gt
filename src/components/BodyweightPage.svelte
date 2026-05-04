<script>
  import { Plus, Edit2, Trash2, X, Check, FileText, ChevronDown, ChevronUp } from 'lucide-svelte';
  import { formatDate } from '../utils/formatters.js';

  let { bodyweight, setBodyweight } = $props();

  const pad = (n) => String(n).padStart(2, '0');

  const toLocalDateInput = (ts) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const toLocalTimeInput = (ts) => {
    const d = new Date(ts);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const fromLocalInputs = (dateStr, timeStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = (timeStr || '00:00').split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm).getTime();
  };

  const now = Date.now();
  let formWeight = $state('');
  let formDate = $state(toLocalDateInput(now));
  let formTime = $state(toLocalTimeInput(now));
  let formNote = $state('');
  let editingId = $state(null);

  const sortedRecords = $derived(
    [...bodyweight].sort((a, b) => b.timestamp - a.timestamp)
  );

  const resetForm = () => {
    const t = Date.now();
    formWeight = '';
    formDate = toLocalDateInput(t);
    formTime = toLocalTimeInput(t);
    formNote = '';
    editingId = null;
  };

  const submitForm = () => {
    const weight = parseFloat(formWeight);
    if (!weight || weight <= 0) return;
    if (!formDate) return;

    const timestamp = fromLocalInputs(formDate, formTime);
    const note = formNote.trim();

    if (editingId) {
      setBodyweight(
        bodyweight.map(r =>
          r.id === editingId ? { ...r, weight, timestamp, note } : r
        )
      );
    } else {
      const id = `${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
      setBodyweight([...bodyweight, { id, timestamp, weight, note }]);
    }
    resetForm();
  };

  const startEdit = (record) => {
    editingId = record.id;
    formWeight = String(record.weight);
    formDate = toLocalDateInput(record.timestamp);
    formTime = toLocalTimeInput(record.timestamp);
    formNote = record.note || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteRecord = (id) => {
    if (!confirm('Delete this record?')) return;
    setBodyweight(bodyweight.filter(r => r.id !== id));
    if (editingId === id) resetForm();
  };

  // Bulk text import. Format:
  //   2010
  //   1 Jan (10:00): 40.4
  //   4 Jan (11.00): 42.0 (optional note)
  // Year lines set the active year for following entries until another year appears.
  const MONTHS = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11
  };

  const ENTRY_RE = /^\s*(\d{1,2})\s+([A-Za-z]+)\s*\(\s*(\d{1,2})\s*[:.]\s*(\d{2})\s*\)\s*:\s*(\d+(?:\.\d+)?)\s*(?:\(([^)]*)\))?\s*$/;

  let bulkText = $state('');
  let bulkOpen = $state(false);
  let bulkError = $state('');
  let bulkPreview = $state(null);
  let advancedOpen = $state(false);

  const parseBulk = (text) => {
    const lines = text.split('\n');
    const parsed = [];
    const errors = [];
    let year = null;

    lines.forEach((rawLine, idx) => {
      const line = rawLine.trim();
      if (!line) return;

      const yearMatch = line.match(/^(\d{4})$/);
      if (yearMatch) {
        year = Number(yearMatch[1]);
        return;
      }

      const m = line.match(ENTRY_RE);
      if (!m) {
        errors.push(`Line ${idx + 1}: could not parse "${line}"`);
        return;
      }

      if (year === null) {
        errors.push(`Line ${idx + 1}: no year set yet`);
        return;
      }

      const day = Number(m[1]);
      const monthKey = m[2].toLowerCase();
      const month = MONTHS[monthKey];
      if (month === undefined) {
        errors.push(`Line ${idx + 1}: unknown month "${m[2]}"`);
        return;
      }

      const hours = Number(m[3]);
      const minutes = Number(m[4]);
      const weight = parseFloat(m[5]);
      const note = (m[6] || '').trim();

      if (!Number.isFinite(weight) || weight <= 0) {
        errors.push(`Line ${idx + 1}: invalid weight`);
        return;
      }

      const timestamp = new Date(year, month, day, hours, minutes).getTime();
      parsed.push({ timestamp, weight, note });
    });

    return { parsed, errors };
  };

  const previewBulk = () => {
    bulkError = '';
    bulkPreview = null;
    if (!bulkText.trim()) {
      bulkError = 'Paste some lines first.';
      return;
    }
    const { parsed, errors } = parseBulk(bulkText);
    if (errors.length > 0) {
      bulkError = errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n…and ${errors.length - 5} more` : '');
    }
    bulkPreview = parsed;
  };

  const applyBulk = () => {
    if (!bulkPreview || bulkPreview.length === 0) return;

    // Dedupe against existing records by exact timestamp
    const existingTimestamps = new Set(bodyweight.map(r => r.timestamp));
    const fresh = bulkPreview.filter(r => !existingTimestamps.has(r.timestamp));

    const newRecords = fresh.map(r => ({
      id: `${r.timestamp}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: r.timestamp,
      weight: r.weight,
      note: r.note
    }));

    setBodyweight([...bodyweight, ...newRecords]);
    const skipped = bulkPreview.length - fresh.length;
    bulkText = '';
    bulkPreview = null;
    bulkError = '';
    bulkOpen = false;
    alert(`Imported ${newRecords.length} record(s)${skipped > 0 ? `, skipped ${skipped} duplicate(s)` : ''}.`);
  };

  // Chart geometry — chronological order (oldest left, newest right)
  const chartData = $derived(
    [...bodyweight].sort((a, b) => a.timestamp - b.timestamp)
  );

  const CHART_W = 600;
  const CHART_H = 220;
  const PAD_L = 40;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 28;

  let selectedPointId = $state(null);
  let chartSvgEl = $state(null);

  // Catmull-Rom → cubic Bézier path for a smooth curve through all points.
  const buildSmoothPath = (pts) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;

    const tension = 0.5; // 0 = sharp, 1 = looser; 0.5 is a balanced default
    let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) * (tension / 6);
      const cp1y = p1.y + (p2.y - p0.y) * (tension / 6);
      const cp2x = p2.x - (p3.x - p1.x) * (tension / 6);
      const cp2y = p2.y - (p3.y - p1.y) * (tension / 6);

      d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  };

  const chart = $derived.by(() => {
    if (chartData.length === 0) return null;

    const weights = chartData.map(r => r.weight);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const range = maxW - minW || 1;
    const yMin = minW - range * 0.1;
    const yMax = maxW + range * 0.1;
    const ySpan = yMax - yMin || 1;

    const tMin = chartData[0].timestamp;
    const tMax = chartData[chartData.length - 1].timestamp;
    const tSpan = tMax - tMin || 1;

    const innerW = CHART_W - PAD_L - PAD_R;
    const innerH = CHART_H - PAD_T - PAD_B;

    const xFor = (ts) =>
      chartData.length === 1
        ? PAD_L + innerW / 2
        : PAD_L + ((ts - tMin) / tSpan) * innerW;
    const yFor = (w) => PAD_T + innerH - ((w - yMin) / ySpan) * innerH;

    const points = chartData.map(r => ({
      x: xFor(r.timestamp),
      y: yFor(r.weight),
      record: r
    }));

    const path = buildSmoothPath(points);

    const yTicks = [yMin, (yMin + yMax) / 2, yMax].map(v => ({
      value: v,
      y: yFor(v)
    }));

    const xTicks =
      chartData.length === 1
        ? [{ ts: tMin, x: xFor(tMin) }]
        : [
            { ts: tMin, x: xFor(tMin) },
            { ts: tMax, x: xFor(tMax) }
          ];

    return { points, path, yTicks, xTicks };
  });

  // Currently selected point (or default to the latest one once data exists)
  const selectedPoint = $derived.by(() => {
    if (!chart) return null;
    if (selectedPointId) {
      const found = chart.points.find(p => p.record.id === selectedPointId);
      if (found) return found;
    }
    return chart.points[chart.points.length - 1];
  });

  // Convert a pointer event to SVG-viewBox X coords, then pick the nearest point
  const handleChartPointer = (event) => {
    if (!chart || !chartSvgEl) return;
    const rect = chartSvgEl.getBoundingClientRect();
    const ratio = CHART_W / rect.width;
    const svgX = (event.clientX - rect.left) * ratio;

    let nearest = chart.points[0];
    let bestDist = Math.abs(chart.points[0].x - svgX);
    for (let i = 1; i < chart.points.length; i++) {
      const d = Math.abs(chart.points[i].x - svgX);
      if (d < bestDist) {
        bestDist = d;
        nearest = chart.points[i];
      }
    }
    selectedPointId = nearest.record.id;
  };
</script>

<div class="p-4 pb-24">
  <h1 class="text-2xl font-bold mb-6">Bodyweight</h1>

  <!-- Section 1: Add / Edit -->
  <div class="mb-6 bg-white p-4 rounded-lg shadow">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-lg font-semibold">
        {editingId ? 'Edit record' : 'Add record'}
      </h2>
      {#if editingId}
        <button
          onclick={resetForm}
          class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <X size={16} /> Cancel
        </button>
      {/if}
    </div>

    <div class="space-y-3">
      <div>
        <label for="bw-weight" class="block text-xs text-gray-600 mb-1">Weight (kg)</label>
        <input
          id="bw-weight"
          type="number"
          step="0.1"
          min="0"
          inputmode="decimal"
          bind:value={formWeight}
          placeholder="e.g. 75.4"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div>
          <label for="bw-date" class="block text-xs text-gray-600 mb-1">Date</label>
          <input
            id="bw-date"
            type="date"
            bind:value={formDate}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label for="bw-time" class="block text-xs text-gray-600 mb-1">Time</label>
          <input
            id="bw-time"
            type="time"
            bind:value={formTime}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label for="bw-note" class="block text-xs text-gray-600 mb-1">Note (optional)</label>
        <textarea
          id="bw-note"
          bind:value={formNote}
          rows="2"
          placeholder="e.g. after fasting, post-workout"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        ></textarea>
      </div>

      <button
        onclick={submitForm}
        disabled={!formWeight || !formDate}
        class="w-full flex items-center justify-center px-3 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300"
      >
        {#if editingId}
          <Check size={16} class="mr-1" /> Save changes
        {:else}
          <Plus size={16} class="mr-1" /> Add record
        {/if}
      </button>
    </div>
  </div>

  <!-- Section 2: Chart -->
  <div class="mb-6 bg-white p-4 rounded-lg shadow">
    <div class="flex items-baseline justify-between mb-3">
      <h2 class="text-lg font-semibold">Weight history</h2>
      {#if selectedPoint}
        <div class="text-right">
          <div class="text-sm font-semibold">{selectedPoint.record.weight} kg</div>
          <div class="text-xs text-gray-600">
            {formatDate(selectedPoint.record.timestamp)} · {toLocalTimeInput(selectedPoint.record.timestamp)}
          </div>
        </div>
      {/if}
    </div>
    {#if chart}
      <svg
        bind:this={chartSvgEl}
        viewBox="0 0 {CHART_W} {CHART_H}"
        class="w-full h-auto touch-none cursor-crosshair"
        preserveAspectRatio="none"
        role="img"
        aria-label="Bodyweight over time"
        onpointerdown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); handleChartPointer(e); }}
        onpointermove={(e) => { if (e.buttons || e.pointerType === 'touch') handleChartPointer(e); }}
      >
        {#each chart.yTicks as tick (tick.value)}
          <line
            x1={PAD_L}
            x2={CHART_W - PAD_R}
            y1={tick.y}
            y2={tick.y}
            stroke="#e5e7eb"
            stroke-width="1"
          />
          <text
            x={PAD_L - 6}
            y={tick.y + 4}
            text-anchor="end"
            font-size="11"
            fill="#6b7280"
          >
            {tick.value.toFixed(1)}
          </text>
        {/each}

        {#each chart.xTicks as tick (tick.ts)}
          <text
            x={tick.x}
            y={CHART_H - 8}
            text-anchor="middle"
            font-size="11"
            fill="#6b7280"
          >
            {formatDate(tick.ts)}
          </text>
        {/each}

        <path
          d={chart.path}
          fill="none"
          stroke="#3b82f6"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />

        {#each chart.points as p (p.record.id)}
          <circle cx={p.x} cy={p.y} r="3" fill="#3b82f6">
            <title>{formatDate(p.record.timestamp)}: {p.record.weight} kg</title>
          </circle>
        {/each}

        {#if selectedPoint}
          <line
            x1={selectedPoint.x}
            x2={selectedPoint.x}
            y1={PAD_T}
            y2={CHART_H - PAD_B}
            stroke="#3b82f6"
            stroke-width="1"
            stroke-dasharray="3 3"
            opacity="0.6"
          />
          <circle
            cx={selectedPoint.x}
            cy={selectedPoint.y}
            r="5"
            fill="#3b82f6"
            stroke="white"
            stroke-width="2"
          />
        {/if}
      </svg>
    {:else}
      <p class="text-sm text-gray-500 text-center py-6">
        No records yet. Add one above to see the chart.
      </p>
    {/if}
  </div>

  <!-- Section 3: History -->
  <div class="bg-white p-4 rounded-lg shadow">
    <h2 class="text-lg font-semibold mb-3">
      History {#if sortedRecords.length > 0}<span class="text-sm font-normal text-gray-500">({sortedRecords.length})</span>{/if}
    </h2>
    {#if sortedRecords.length === 0}
      <p class="text-sm text-gray-500 text-center py-4">No records yet.</p>
    {:else}
      <div class="space-y-1 max-h-96 overflow-y-auto">
        {#each sortedRecords as record (record.id)}
          <div class="flex items-start justify-between bg-gray-50 px-3 py-2 rounded">
            <div class="min-w-0 flex-1 mr-2">
              <div class="text-sm font-semibold">{record.weight} kg</div>
              <div class="text-xs text-gray-600">
                {formatDate(record.timestamp)} · {toLocalTimeInput(record.timestamp)}
              </div>
              {#if record.note}
                <div class="text-xs text-gray-700 mt-1 whitespace-pre-wrap break-words">{record.note}</div>
              {/if}
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button
                onclick={() => startEdit(record)}
                aria-label="Edit record"
                class="p-2 text-gray-500 hover:text-blue-600"
              >
                <Edit2 size={16} />
              </button>
              <button
                onclick={() => deleteRecord(record.id)}
                aria-label="Delete record"
                class="p-2 text-gray-500 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Advanced (bulk import) -->
  <div class="mt-6 bg-white p-4 rounded-lg shadow">
    <button
      onclick={() => advancedOpen = !advancedOpen}
      class="w-full flex items-center justify-between text-left text-gray-600"
    >
      <span class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
        Advanced
      </span>
      {#if advancedOpen}<ChevronUp size={18} />{:else}<ChevronDown size={18} />{/if}
    </button>

    {#if advancedOpen}
      <div class="mt-4">
        <button
          onclick={() => bulkOpen = !bulkOpen}
          class="w-full flex items-center justify-between text-left"
        >
          <span class="flex items-center gap-2 text-base font-semibold">
            <FileText size={16} /> Bulk import from text
          </span>
          {#if bulkOpen}<ChevronUp size={18} />{:else}<ChevronDown size={18} />{/if}
        </button>

        {#if bulkOpen}
          <div class="mt-3 space-y-3">
            <p class="text-xs text-gray-600 leading-snug">
              One year per line, then entries below it. Time can use <code>:</code> or <code>.</code>.
              Optional note in trailing parentheses.
            </p>
            <pre class="text-xs bg-gray-50 p-2 rounded border border-gray-200 overflow-x-auto">{`2010
1 Jan (10:00): 40.4
4 Jan (11.00): 42.0 (post-workout)`}</pre>

            <textarea
              bind:value={bulkText}
              rows="8"
              placeholder="Paste records here…"
              class="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            ></textarea>

            {#if bulkError}
              <pre class="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200 whitespace-pre-wrap">{bulkError}</pre>
            {/if}

            {#if bulkPreview && bulkPreview.length > 0}
              <div class="text-xs bg-blue-50 border border-blue-200 rounded p-2">
                <div class="font-semibold mb-1">Preview ({bulkPreview.length} record{bulkPreview.length === 1 ? '' : 's'}):</div>
                <div class="max-h-32 overflow-y-auto space-y-0.5">
                  {#each bulkPreview.slice(0, 20) as p (p.timestamp)}
                    <div>
                      {formatDate(p.timestamp)} · {toLocalTimeInput(p.timestamp)} — {p.weight} kg{#if p.note} <span class="text-gray-600">({p.note})</span>{/if}
                    </div>
                  {/each}
                  {#if bulkPreview.length > 20}
                    <div class="text-gray-600">…and {bulkPreview.length - 20} more</div>
                  {/if}
                </div>
              </div>
            {/if}

            <div class="grid grid-cols-2 gap-2">
              <button
                onclick={previewBulk}
                disabled={!bulkText.trim()}
                class="px-3 py-2 bg-gray-200 text-gray-800 rounded-md disabled:opacity-50"
              >
                Preview
              </button>
              <button
                onclick={applyBulk}
                disabled={!bulkPreview || bulkPreview.length === 0}
                class="px-3 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300"
              >
                Import {bulkPreview && bulkPreview.length > 0 ? `(${bulkPreview.length})` : ''}
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
