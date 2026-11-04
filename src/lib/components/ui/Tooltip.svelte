<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils/cn.ts';

	interface Props {
		text: string;
		side?: 'top' | 'bottom' | 'left' | 'right';
		sideOffset?: number;
		class?: string;
		// For <a> tags (strips type="button")
		link?: Snippet<[{ props: Record<string, unknown> }]>;
		// For  custom <button> tags
		trigger?: Snippet<[{ props: Record<string, unknown> }]>;
		//For static content
		children?: Snippet;
	}

	let {
		text,
		side = 'top',
		sideOffset = 10,
		class: className,
		link,
		trigger,
		children
	}: Props = $props();

	// `Tooltip.Trigger` injects `type="button"` into the child, <a> must not receive it.
	function withoutTriggerType(props: Record<string, unknown>) {
		const rest = { ...props };
		delete rest.type;
		return rest;
	}

	const contentClasses = $derived(
		cn(
			'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=bottom]:slide-in-from-top-4 data-[side=left]:slide-in-from-right-4 data-[side=right]:slide-in-from-left-4 data-[side=top]:slide-in-from-bottom-4 z-50 inline-flex w-fit max-w-xs items-center gap-1.5 rounded bg-surface-accent px-2 py-1 text-xs font-medium shadow-lg ring-1 ring-on-surface-muted mx-2',
			className
		)
	);
</script>

<Tooltip.Root>
	{#if link}
		<!-- Link -->
		<Tooltip.Trigger>
			{#snippet child({ props })}
				{@render link({ props: withoutTriggerType(props) })}
			{/snippet}
		</Tooltip.Trigger>
	{:else if trigger}
		<!-- Button -->
		<Tooltip.Trigger>
			{#snippet child({ props })}
				{@render trigger({ props })}
			{/snippet}
		</Tooltip.Trigger>
	{:else if children}
		<!-- Static icon/element: -->
		<Tooltip.Trigger>
			{@render children()}
		</Tooltip.Trigger>
	{/if}

	<Tooltip.Portal>
		<Tooltip.Content {side} {sideOffset} class={contentClasses}>
			{text}
		</Tooltip.Content>
	</Tooltip.Portal>
</Tooltip.Root>
