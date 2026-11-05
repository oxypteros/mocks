<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Tooltip from '#lib/components/ui/Tooltip.svelte';

	//Icons
	import IconPi from '~icons/oxy/pi';

	const linkClasses =
		'font-medium underline decoration-1 underline-offset-2 transition-all duration-300 hover:underline-offset-4 hover:text-dark oxy-focus px-px rounded';

	const startYear = 2026;
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
						>Mocks</span
					>
					<span class="sr-only"> Back to home</span>
				</a>
				<span class="size-1 rounded bg-on-surface-muted"></span>
				<span>&copy; {displayYear}</span>
			</small>
		</div>
	</div>
	<div class="flex flex-col gap-4">
		<p class="max-w-2xl text-xs text-balance">
			<span class="font-semibold">Disclaimer:</span>
			Mocks is an independent, non-commercial, open-source platform. All certification names and trademarks
			are property of their respective owners.
		</p>
		<small class="inline-flex items-center gap-2 text-[12px] font-semibold">
			Code:
			<a
				href="https://github.com/oxypteros/mocks/blob/main/LICENSE"
				target="_blank"
				rel="noopener noreferrer"
				class={linkClasses}
				>MIT
				<span class="sr-only">(opens in a new tab)</span>
			</a>
			<span class="size-1 rounded bg-on-surface-muted"></span>
			Content:
			<a
				href="https://creativecommons.org/licenses/by-sa/4.0/deed.en"
				target="_blank"
				rel="noopener noreferrer"
				class={linkClasses}
			>
				CC BY-SA 4.0
				<span class="sr-only">(opens in a new tab)</span></a
			>
		</small>
	</div>
</div>
<div class="flex w-full justify-end px-2 pb-2 sm:px-4">
	<Tooltip text="Designed and developed by Oxypteros">
		{#snippet link({ props })}
			<a
				{...props}
				href="https://oxypteros.com"
				target="_blank"
				rel="noreferrer"
				class="oxy-focus rounded px-px"
			>
				<IconPi class="size-2.75" aria-hidden="true" />
				<span class="sr-only">Oxypteros website (opens in a new tab)</span>
			</a>
		{/snippet}
	</Tooltip>
</div>
