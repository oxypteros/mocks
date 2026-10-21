<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Path } from '$app/types';
	import { m } from '#lib/paraglide/messages.js';
	import { localizeHref, locales } from '#lib/paraglide/runtime.js';
	import MocksLogo from '~icons/oxy/mocks-logo';

	type Locale = (typeof locales)[number];

	let { locale }: { locale: Locale } = $props();

	const items = $derived([
		{ href: '/about', label: m.nav_AboutLabel() },
		{ href: '/privacy', label: m.nav_PrivacyLabel() },
		{ href: '/accessibility', label: m.nav_AccessibilityLabel() }
	]);

	const linkClasses =
		'font-normal underline decoration-1 underline-offset-2 transition-all duration-300 hover:underline-offset-4 hover:text-brand';

	const startYear = 2026;
	const currentYear = $derived(new Date().getFullYear());
	const displayYear = $derived(
		currentYear === startYear
			? startYear.toString()
			: `${startYear}-${currentYear.toString().slice(-2)}`
	);
</script>

<footer class="border-border border-t bg-surface">
	<div class="mx-auto flex w-full max-w-8xl flex-col gap-4 px-4 py-8 text-sm sm:px-6 lg:px-8">
		<div class="flex w-full flex-col justify-between gap-2.5">
			<small class="flex items-center gap-2 text-[12px]">
				<a href={resolve(localizeHref('/', { locale }) as Path)}>
					<MocksLogo class="h-2.5 w-auto text-brand" />
					<span class="sr-only">Mocks - Home</span>
				</a>
				<span class="size-1 bg-brand"></span>
				<span>&copy; {displayYear}</span>
			</small>
			<small class="inline-flex items-center gap-2 text-[12px] font-semibold"
				>Code:
				<a href="https://github.com" target="_blank" rel="noopener noreferrer" class={linkClasses}
					>MIT</a
				>
				<span class="size-1 bg-brand"></span>
				Content:
				<a
					href="https://creativecommons.org/licenses/by-sa/4.0/deed.en"
					target="_blank"
					rel="noopener noreferrer"
					class={linkClasses}>CC BY-SA 4.0</a
				>
			</small>
		</div>
		<ul class="flex flex-wrap items-center gap-x-5 gap-y-2">
			{#each items as item (item.href)}
				<li>
					<a
						href={resolve(localizeHref(item.href, { locale }) as Path)}
						class="text-ink-muted hover:text-ink underline-offset-4 hover:underline"
					>
						{item.label}
					</a>
				</li>
			{/each}
		</ul>

		<p class="max-w-3xl">{m.footer_Disclaimer()}</p>
		<p>Code MIT · Content CC BY-SA 4.0</p>
	</div>
</footer>
