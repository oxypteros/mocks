<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, children }: { title?: string; children: Snippet } = $props();
</script>

<abbr {title} class="underline decoration-dotted decoration-2">{@render children()}</abbr>
