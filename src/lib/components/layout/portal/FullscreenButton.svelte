<script lang="ts">
	import { browser } from '$app/env';
	import { onMount } from 'svelte';
	import Button from '#lib/components/ui/Buttons.svelte';
	import Tooltip from '#lib/components/ui/Tooltip.svelte';

	// Icons
	import IconFullscreen from '~icons/oxy/fullscreen';
	import IconMinimize from '~icons/oxy/minimize';

	let isFullscreen = $state(false);
	let supported = $state(false);

	onMount(() => {
		if (!browser) return;

		supported = Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen);

		const syncFullscreen = () => {
			isFullscreen = document.fullscreenElement !== null;
		};

		document.addEventListener('fullscreenchange', syncFullscreen);
		syncFullscreen();

		return () => document.removeEventListener('fullscreenchange', syncFullscreen);
	});

	async function toggleFullscreen() {
		if (!browser || !supported) return;

		try {
			if (document.fullscreenElement) {
				await document.exitFullscreen();
			} else {
				await document.documentElement.requestFullscreen();
			}
		} catch {
			// Fullscreen can be rejected when the browser/OS blocks it.
			isFullscreen = document.fullscreenElement !== null;
		}
	}

	const label = $derived(isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen');
</script>

{#if supported}
	<Tooltip text={label} side="bottom" class="bg-surface-accent">
		{#snippet trigger({ props })}
			<Button
				{...props}
				type="button"
				variant="ghost"
				size="icon"
				aria-label={label}
				onclick={toggleFullscreen}
				class="hidden lg:inline-flex"
			>
				{#if isFullscreen}
					<IconMinimize class="size-4" aria-hidden="true" />
				{:else}
					<IconFullscreen class="size-4" aria-hidden="true" />
				{/if}
			</Button>
		{/snippet}
	</Tooltip>
{/if}
