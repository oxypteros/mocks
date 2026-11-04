<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconArrowUpRight from '~icons/oxy/arrow-up-right';
	import { cn } from '#lib/utils/cn';

	let {
		href,
		class: className,
		iconClass,
		children
	}: {
		href: string;
		class?: string;
		iconClass?: string;
		children: Snippet;
	} = $props();
</script>

<a
	{href}
	target="_blank"
	rel="external noopener noreferrer"
	class={cn(
		'oxy-focus rounded px-px font-medium text-dark underline underline-offset-2 transition-all duration-300 hover:underline-offset-4',
		className
	)}
	>{@render children()}<IconArrowUpRight
		class={cn('ml-[0.1em] inline size-[1.15em] align-[-0.95em] text-on-surface-muted', iconClass)}
		aria-hidden="true"
	/><span class="sr-only"> (opens in a new tab)</span></a
>
