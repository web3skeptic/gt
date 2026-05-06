<script>
  import { AlertTriangle } from 'lucide-svelte';

  let {
    open,
    title = 'Confirm Deletion',
    message,
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel
  } = $props();
</script>

{#if open}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
    <div class="bg-white rounded-lg p-4 max-w-sm w-full mx-4 shadow-lg">
      <div class="flex items-center mb-4 text-amber-600">
        <AlertTriangle class="mr-2" size={24} />
        <h3 class="font-bold text-lg">{title}</h3>
      </div>
      <p class="mb-6">{message}</p>
      <div class="flex justify-end space-x-3">
        <button
          class="px-4 py-2 bg-gray-200 rounded-md"
          onclick={onCancel}
        >
          {cancelLabel}
        </button>
        <button
          class="px-4 py-2 bg-red-500 text-white rounded-md"
          onclick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
{/if}
