<script lang="ts">
	import type { Snippet } from 'svelte';

	type ContentLayoutProps = {
		title?: string;
		subtitle?: string;
		date?: string;
		children?: Snippet;
	};

	let { title = '', subtitle, date, children }: ContentLayoutProps = $props();

	const displayDate = $derived.by(() => {
		if (!date) return null;
		const parsed = new Date(date);
		if (Number.isNaN(parsed.getTime())) return date;

		const y = parsed.getFullYear();
		const m = String(parsed.getMonth() + 1).padStart(2, '0');
		const d = String(parsed.getDate()).padStart(2, '0');

		return `${y}.${m}.${d}`;
	});
</script>

<svelte:head>
	<title>{title ? `${title} | Mocks` : 'Mocks'}</title>
</svelte:head>

<article class="mt-12 pb-24">
	{#if title}
		<h1 class="max-w-3xl text-5xl leading-tight font-bold tracking-tight text-balance sm:text-6xl">
			{title}
		</h1>
	{/if}
	{#if subtitle}
		<p class="mt-4 max-w-xl text-lg leading-relaxed font-medium text-pretty text-on-surface-muted">
			{subtitle}
		</p>
	{/if}
	<div
		class="prose mt-12 max-w-3xl prose-mocks prose-h2:mt-12 prose-h2:mb-3 prose-a:underline prose-a:underline-offset-2 prose-a:hover:decoration-2 prose-a:hover:underline-offset-4 prose-strong:font-semibold"
	>
		{@render children?.()}
	</div>
	{#if displayDate}
		<footer
			class="mt-12 flex items-center gap-2 font-mono text-xs font-medium text-on-surface-muted"
		>
			<span class="h-2 w-8 bg-on-surface-muted"></span>
			<span class="font-sans font-semibold">Last updated:</span>
			<time datetime={date}>{displayDate}</time>
		</footer>
	{/if}
</article>
