<script lang="ts">
	import { browser } from '$app/env';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import MocksSiteFooter from '#lib/components/layout/site/Footer.svelte';
	import MocksSiteHeader from '#lib/components/layout/site/Header.svelte';
	import { deLocalizeUrl, getLocaleForUrl } from '#lib/paraglide/runtime.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const pathname = $derived(deLocalizeUrl(page.url).pathname);
	const locale = $derived(getLocaleForUrl(page.url.href));

	afterNavigate(({ from }) => {
		if (!browser || !from) return;
		document.getElementById('main-content')?.focus();
	});
</script>

<div class="flex min-h-dvh flex-col">
	<MocksSiteHeader {pathname} {locale} />

	<main
		id="main-content"
		tabindex="-1"
		class="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:px-8"
	>
		{@render children()}
	</main>

	<MocksSiteFooter {locale} />
</div>
