<script lang="ts">
	import { browser } from '$app/env';
	import { afterNavigate } from '$app/navigation';
	import SiteFooter from '#lib/components/layout/site/SiteFooter.svelte';
	import SiteHeader from '#lib/components/layout/site/SiteHeader.svelte';

	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	afterNavigate(({ from }) => {
		if (!browser || !from) return;
		document.getElementById('main-content')?.focus();
	});
</script>

<div class="flex min-h-dvh flex-col">
	<header>
		<SiteHeader />
	</header>

	<main id="main-content" tabindex="-1" class="mx-auto w-full max-w-6xl flex-1 px-3 sm:px-6">
		{@render children()}
	</main>
	<footer class="w-full">
		<SiteFooter />
	</footer>
</div>
