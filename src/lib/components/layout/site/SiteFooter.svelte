<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { site } from '#lib/settings/site';
	import Button from '#lib/components/ui/Buttons.svelte';
	import Tooltip from '#lib/components/ui/Tooltip.svelte';
	import ExternalLink from '#lib/components/ui/ExternalLink.svelte';

	//Icons
	import IconPi from '~icons/oxy/pi';

	const startYear = site.startYear;
	const currentYear = $derived(new Date().getFullYear());
	const displayYear = $derived(
		currentYear === startYear
			? startYear.toString()
			: `${startYear}-${currentYear.toString().slice(-2)}`
	);

	const homeHref = resolve('/(site)');

	const isHome = $derived(page.route.id === '/(site)');
</script>

<div class="mx-auto flex w-full max-w-8xl flex-col gap-4 px-4 py-8 text-sm sm:px-6 lg:px-8">
	<div class="flex w-full flex-wrap items-center justify-between gap-2">
		<div class="flex flex-col gap-2.5">
			<!-- Footer Copyright -->
			<small class="flex items-center gap-2 text-[12px]">
				<a
					href={homeHref}
					class="oxy-focus flex items-center gap-2 rounded px-px"
					aria-current={isHome ? 'page' : undefined}
				>
					<span class="font-mono text-xl font-black tracking-tight text-on-surface-muted uppercase"
						>{site.name}</span
					>
					<span class="sr-only"> Home</span>
				</a>
				<span class="size-1 rounded bg-on-surface-muted"></span>
				<span>&copy; {displayYear}</span>
			</small>
		</div>
		<!-- Footer Navigation -->
		<nav aria-label={`${site.name} informative links`} class="flex sm:justify-end">
			<ul class="flex flex-wrap gap-4">
				{#each site.footerLinks as item (item.id)}
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
	<div class="flex flex-col gap-4">
		<p class="max-w-2xl text-xs text-balance">
			<span class="font-semibold">Disclaimer:</span>
			{site.disclaimer}
		</p>
		<small class="inline-flex items-center gap-2 text-[12px] font-semibold">
			{#each site.licenseLinks as license, index (license.label)}
				{#if index > 0}<span class="size-1 rounded bg-on-surface-muted"></span>{/if}
				{#if license.prefix}{license.prefix}{/if}
				<ExternalLink href={license.href}>{license.label}</ExternalLink>
			{/each}
		</small>
	</div>
</div>
{#if site.credit.enabled}
	<div class="flex w-full justify-end px-2 pb-2 sm:px-4">
		<Tooltip text="Designed and developed by Oxypteros">
			{#snippet link({ props })}
				<a
					{...props}
					href="https://oxypteros.com"
					target="_blank"
					rel="external noreferrer"
					class="oxy-focus rounded px-px"
				>
					<IconPi class="size-2.75" aria-hidden="true" />
					<span class="sr-only">Designed and developed by Oxypteros (opens in a new tab)</span>
				</a>
			{/snippet}
		</Tooltip>
	</div>
{/if}
