<script>
  import { ChevronRight } from 'lucide-svelte';

  let { name, lastPerformed, onclick } = $props();
</script>

<div
  role="button"
  tabindex="0"
  onclick={onclick}
  onkeydown={(e) => e.key === 'Enter' && onclick()}
  class="bg-white rounded-lg shadow p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
>
  <div class="flex flex-col">
    <div class="flex items-center">
      <span class="text-sm text-gray-500 mr-2">{lastPerformed}</span>
      <h2 class="font-medium text-lg">{name}</h2>
    </div>
  </div>
  <ChevronRight class="text-gray-400" />
</div>
