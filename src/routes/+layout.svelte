<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';
	import { Tooltip } from 'bits-ui';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>
<Tooltip.Provider delayDuration={300}>
	{@render children()}
</Tooltip.Provider>
