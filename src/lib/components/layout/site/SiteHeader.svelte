<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Button from '#lib/components/ui/Buttons.svelte';
	import { site } from '#lib/settings/site';

	const Logo = site.logo;
	const homeHref = resolve('/(site)');
	const isHome = $derived(page.route.id === '/(site)');
</script>

<Button
	variant="secondary"
	size="sm"
	href="#main-content"
	class="absolute left-2 z-99 -translate-y-24 rounded px-px focus-visible:translate-y-2"
	>Skip to main</Button
>
<div
	class="mx-auto flex min-h-11 w-full max-w-8xl flex-wrap items-center justify-between gap-4 px-3 py-1 sm:px-6"
>
	<a
		href={homeHref}
		class="oxy-focus flex w-fit shrink-0 items-center gap-2 rounded px-px"
		aria-current={isHome ? 'page' : undefined}
	>
		<Logo aria-hidden="true" />
		<span class="font-mono text-xl font-black tracking-tight text-on-surface-muted uppercase"
			>{site.name}</span
		>
		<span class="sr-only"> Home</span>
	</a>
	<!-- Header Navigation -->
	<nav aria-label={`${site.name} header links`} class="shrink-0">
		<ul class="flex flex-wrap gap-4">
			{#each site.headerLinks as item (item.id)}
				{@const isCurrent = page.route.id === item.id}
				<li>
					<Button
						variant="navLink"
						size="navLink"
						href={resolve(item.id)}
						aria-current={isCurrent ? 'page' : undefined}
						class="px-0 aria-[current=page]:underline aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-4"
					>
						{item.label}
					</Button>
				</li>
			{/each}
		</ul>
	</nav>
</div>
