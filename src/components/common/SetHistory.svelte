<script>
  import { formatDate, getDateString } from '../../utils/formatters.js';
  import { Edit, Trash2 } from 'lucide-svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';

  let { history, onEditSet, onDeleteSet } = $props();

  let activeItem = $state(null);
  let deleteConfirmation = $state(null);

  // Format time (hours, minutes, seconds)
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Calculate volume for a set (weight × reps)
  const calculateSetVolume = (set) => {
    return set.weight * set.repetitions;
  };

  // Toggle active item on click
  const toggleActiveItem = (setId) => {
    activeItem = activeItem === setId ? null : setId;
  };

  // Group sets by date
  const groupedSets = $derived(
    Object.entries(
      history.reduce((groups, set) => {
        const dateKey = getDateString(set.timestamp);
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(set);
        return groups;
      }, {})
    ).sort((a, b) => new Date(b[0]) - new Date(a[0]))
  );
</script>

{#if history.length === 0}
  <p class="text-gray-500 text-center py-4">No sets recorded yet</p>
{:else}
  <div class="space-y-6 relative">
    <ConfirmDialog
      open={!!deleteConfirmation}
      message={deleteConfirmation ? `Are you sure you want to delete this set of ${deleteConfirmation.weight} kg × ${deleteConfirmation.repetitions} reps?` : ''}
      onCancel={() => deleteConfirmation = null}
      onConfirm={() => {
        onDeleteSet(deleteConfirmation);
        deleteConfirmation = null;
        activeItem = null;
      }}
    />

    {#each groupedSets as [dateString, sets]}
      {@const allZeroWeight = sets.every(set => set.weight === 0)}
      {@const totalDayVolume = sets.reduce((total, set) => {
        if (allZeroWeight) {
          return total + set.repetitions;
        } else {
          return total + calculateSetVolume(set);
        }
      }, 0)}

      <div class="bg-white rounded-lg shadow overflow-hidden">
        <div class="bg-gray-100 p-2 border-b flex justify-between items-center">
          <h3 class="font-medium text-gray-700">{formatDate(sets[0].timestamp)}</h3>
          <div class="text-sm text-gray-600">
            Vol: {totalDayVolume.toFixed(0)} {allZeroWeight ? 'reps' : 'kg'}
          </div>
        </div>
        <div class="divide-y">
          {#each sets as set, idx}
            {@const setId = `${dateString}-${idx}`}
            {@const isActive = activeItem === setId}

            <div class="relative">
              <!-- Main content -->
              <div
                role="button"
                tabindex="0"
                class="p-3 bg-white cursor-pointer transition-all duration-200 {isActive ? 'bg-gray-50' : ''}"
                onclick={() => toggleActiveItem(setId)}
                onkeydown={(e) => e.key === 'Enter' && toggleActiveItem(setId)}
              >
                <div class="flex justify-between items-center">
                  <div class="font-medium flex items-center gap-2">
                    {set.weight === 0 ?
                      `${set.repetitions} reps` :
                      `${set.weight} kg × ${set.repetitions} reps`}
                    {#if set.isDropset}
                      <span class="text-xs font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">D</span>
                    {:else if set.isMioset}
                      <span class="text-xs font-bold bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">M</span>
                    {/if}
                  </div>
                  <div class="text-xs text-gray-500">
                    {formatTime(set.timestamp)}
                  </div>
                </div>
                {#if set.note}
                  <p class="text-sm text-gray-600 mt-1">{set.note}</p>
                {/if}
              </div>

              <!-- Action buttons - visible only when active -->
              {#if isActive}
                <div class="flex justify-end p-2 bg-gray-50 border-t">
                  <button
                    onclick={(e) => {
                      e.stopPropagation();
                      onEditSet(set);
                      activeItem = null;
                    }}
                    class="p-2 bg-blue-500 text-white rounded-md mr-2 flex items-center"
                  >
                    <Edit size={16} class="mr-1" />
                    <span>Edit</span>
                  </button>
                  <button
                    onclick={(e) => {
                      e.stopPropagation();
                      deleteConfirmation = set;
                    }}
                    class="p-2 bg-red-500 text-white rounded-md flex items-center"
                  >
                    <Trash2 size={16} class="mr-1" />
                    <span>Delete</span>
                  </button>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
{/if}
