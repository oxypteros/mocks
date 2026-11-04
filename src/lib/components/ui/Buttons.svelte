<script lang="ts">
	import { Button } from 'bits-ui';
	import type { ButtonRootProps } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { twMerge } from 'tailwind-merge';

	export type MocksButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'navLink';
	export type MocksButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'navLink';

	export type MocksButtonProps = ButtonRootProps & {
		variant?: MocksButtonVariant;
		size?: MocksButtonSize;
		class?: string;
		children?: Snippet;
	};

	let {
		variant = 'primary',
		size = 'md',
		class: className,
		ref = $bindable<HTMLElement | null>(null),
		children,
		...restProps
	}: MocksButtonProps = $props();

	const baseClass =
		"group/button oxy-focus inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-transparent bg-clip-padding font-semibold whitespace-nowrap transition-all duration-300 select-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:grayscale [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 shadow-md hover:shadow-sm";

	const variantClasses: Record<MocksButtonVariant, string> = {
		primary: 'bg-primary text-on-primary hover:bg-primary-muted border-primary-accent',
		secondary:
			'border-on-surface-muted bg-surface-accent text-on-surface-muted hover:bg-surface-muted rounded-full hover:text-on-surface',
		ghost: 'bg-transparent text-dark hover:border-on-surface-muted shadow-none',
		danger: 'bg-wrong-surface text-on-wrong-surface border-on-wrong hover:bg-wrong-surface/60',
		navLink:
			'hover:underline shadow-none hover:shadow-none hover:decoration-2 hover:underline-offset-4 text-dark rounded'
	};

	const sizeClasses: Record<MocksButtonSize, string> = {
		icon: 'size-9',
		sm: 'min-h-9 px-4 py-1.5 text-xs',
		md: 'min-h-11 gap-1.5 px-2.5 text-sm',
		lg: 'min-h-12 px-5 py-3 text-base',
		navLink: 'h-fit py-0.5'
	};

	let mergedClass = $derived(
		twMerge(baseClass, variantClasses[variant], sizeClasses[size], className)
	);
</script>

<Button.Root bind:ref class={mergedClass} {...restProps}>
	{@render children?.()}
</Button.Root>
