<script>
  let { exercises } = $props();

  const DAY_SIZE = 11;
  const DAY_GAP = 2;
  const STEP = DAY_SIZE + DAY_GAP;

  const toLocalDateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const DEFAULT_BODYWEIGHT_KG = 75;

  // Build a map: dateKey (YYYY-MM-DD) -> total volume (weight * reps).
  // For bodyweight sets (weight === 0) we substitute DEFAULT_BODYWEIGHT_KG
  // so those workouts are not treated as zero-volume rest days.
  const activityMap = $derived(() => {
    const map = {};
    exercises.forEach(ex => {
      if (!ex.history) return;
      ex.history.forEach(set => {
        if (!set.timestamp) return;
        const date = new Date(set.timestamp);
        const key = toLocalDateKey(date);
        const effectiveWeight = (set.weight && set.weight > 0) ? set.weight : DEFAULT_BODYWEIGHT_KG;
        const volume = effectiveWeight * (set.repetitions || 1);
        map[key] = (map[key] || 0) + volume;
      });
    });
    return map;
  });

  // Find first and last dates
  const dateRange = $derived(() => {
    const map = activityMap();
    const keys = Object.keys(map);
    if (keys.length === 0) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDate = new Date(keys.reduce((a, b) => a < b ? a : b));
    firstDate.setHours(0, 0, 0, 0);

    // Align firstDate back to Sunday (start of week)
    const dayOfWeek = firstDate.getDay();
    firstDate.setDate(firstDate.getDate() - dayOfWeek);

    return { firstDate, today };
  });

  // Build columns of weeks (each column = 7 days, top-to-bottom = Sun..Sat)
  const weeks = $derived(() => {
    const range = dateRange();
    if (!range) return [];
    const map = activityMap();

    const { firstDate, today } = range;
    const allDays = [];
    const cursor = new Date(firstDate);

    while (cursor <= today) {
      allDays.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    // Chunk into weeks (columns of 7)
    const result = [];
    for (let i = 0; i < allDays.length; i += 7) {
      result.push(allDays.slice(i, i + 7));
    }

    // Find max volume for intensity normalization
    const values = Object.values(map);
    const maxVolume = values.length > 0 ? Math.max(...values) : 1;

    return { columns: result, map, maxVolume };
  });

  const getColor = (dateKey, map, maxVolume) => {
    const volume = map[dateKey];
    if (!volume) return '#e5e7eb'; // gray-200
    const intensity = volume / maxVolume;
    if (intensity < 0.25) return '#bbf7d0'; // green-200
    if (intensity < 0.5)  return '#4ade80'; // green-400
    if (intensity < 0.75) return '#16a34a'; // green-600
    return '#14532d'; // green-900
  };

  const formatDate = (date) => {
    return date.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  let tooltip = $state(null);

  const showTooltip = (e, date, volume) => {
    tooltip = {
      x: e.clientX,
      y: e.clientY,
      text: formatDate(date) + (volume ? ` — ${Math.round(volume).toLocaleString()} vol` : ' — rest day')
    };
  };

  const hideTooltip = () => {
    tooltip = null;
  };
</script>

<div class="bg-white p-4 rounded-lg shadow mb-6">
  <h2 class="text-lg font-semibold mb-3">Activity History</h2>

  {#if !weeks() || weeks().columns?.length === 0}
    <p class="text-sm text-gray-500 italic">No workout history yet.</p>
  {:else}
    {@const { columns, map, maxVolume } = weeks()}

    <div class="overflow-x-auto">
      <div class="flex gap-[2px]" style="min-width: max-content;">
        {#each columns as week}
          <div class="flex flex-col gap-[2px]">
            {#each week as day}
              {@const key = toLocalDateKey(day)}
              {@const volume = map[key]}
              {@const color = getColor(key, map, maxVolume)}
              {@const isToday = key === toLocalDateKey(new Date())}
              <div
                style="width: {DAY_SIZE}px; height: {DAY_SIZE}px; background-color: {color}; border-radius: 2px; {isToday ? 'outline: 2px solid #3b82f6; outline-offset: 1px;' : ''}"
                onmouseenter={(e) => showTooltip(e, day, volume)}
                onmouseleave={hideTooltip}
                role="img"
                aria-label={formatDate(day)}
              ></div>
            {/each}
          </div>
        {/each}
      </div>
    </div>

    <!-- Legend -->
    <div class="flex items-center gap-2 mt-3 text-xs text-gray-500">
      <span>Less</span>
      <div style="width: 11px; height: 11px; background-color: #e5e7eb; border-radius: 2px;"></div>
      <div style="width: 11px; height: 11px; background-color: #bbf7d0; border-radius: 2px;"></div>
      <div style="width: 11px; height: 11px; background-color: #4ade80; border-radius: 2px;"></div>
      <div style="width: 11px; height: 11px; background-color: #16a34a; border-radius: 2px;"></div>
      <div style="width: 11px; height: 11px; background-color: #14532d; border-radius: 2px;"></div>
      <span>More</span>
    </div>
  {/if}
</div>

{#if tooltip}
  <div
    class="fixed z-50 bg-gray-900 text-white text-xs px-2 py-1 rounded pointer-events-none"
    style="left: {tooltip.x + 12}px; top: {tooltip.y - 8}px;"
  >
    {tooltip.text}
  </div>
{/if}
