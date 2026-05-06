<script>
  import { restTimer } from '../stores/timerStore.svelte.js';
</script>

{#if restTimer.remaining > 0}
  <div class="bg-white rounded-lg shadow p-4 border border-gray-200 mb-4">
    <div class="text-5xl font-mono font-bold tabular-nums text-blue-600 text-center mb-4">
      {restTimer.format(restTimer.remaining)}
    </div>

    <div class="grid grid-cols-3 gap-2">
      <button
        onclick={() => restTimer.adjust(-30)}
        class="py-2 px-3 bg-gray-200 text-gray-800 rounded-md font-medium"
      >
        −30s
      </button>
      <button
        onclick={() => restTimer.cancel()}
        class="py-2 px-3 bg-red-500 text-white rounded-md font-medium"
      >
        Cancel
      </button>
      <button
        onclick={() => restTimer.adjust(30)}
        class="py-2 px-3 bg-gray-200 text-gray-800 rounded-md font-medium"
      >
        +30s
      </button>
    </div>
  </div>
{/if}
