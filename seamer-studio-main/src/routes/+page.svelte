<script lang="ts">
  import { base } from '$app/paths';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    void goto(`${base}/studio`);
  });
</script>

<svelte:head>
  <title>Opening FabricNow Studio</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center" role="status">
  <span class="loading loading-spinner loading-md mr-3"></span>
  Opening FabricNow Studio…
</div>
