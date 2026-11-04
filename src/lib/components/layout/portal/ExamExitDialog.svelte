<script lang="ts">
	import { AlertDialog } from 'bits-ui';
	import type { Snippet } from 'svelte';

	import Button from '#lib/components/ui/Buttons.svelte';

	interface Props {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		onconfirm: () => void;
		title?: string;
		description?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		/** Extra content shown between the description and the actions. */
		content?: Snippet;
	}

	let {
		open,
		onOpenChange,
		onconfirm,
		title = 'Leave exam?',
		description = 'Any progress in this attempt will be lost and you will return to the exam page.',
		confirmLabel = 'Leave exam',
		cancelLabel = 'Stay on exam',
		content
	}: Props = $props();
</script>

<AlertDialog.Root {open} {onOpenChange}>
	<AlertDialog.Portal>
		<AlertDialog.Overlay class="fixed inset-0 z-40 bg-on-surface/60" />
		<AlertDialog.Content
			class="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[calc(100dvh-2rem)] max-w-md -translate-y-1/2 overflow-y-auto rounded-lg border-2 border-on-surface-muted bg-surface-accent p-6 text-on-surface shadow-xl"
		>
			<AlertDialog.Title class="text-lg font-bold">{title}</AlertDialog.Title>
			<AlertDialog.Description class="mt-2 text-sm leading-relaxed">
				{description}
			</AlertDialog.Description>

			{@render content?.()}

			<div class="mt-6 flex flex-col-reverse gap-4 sm:flex-row sm:justify-end">
				<AlertDialog.Cancel>
					{#snippet child({ props })}
						<Button {...props} type="button" variant="secondary" size="sm" class="bg-light">
							{cancelLabel}
						</Button>
					{/snippet}
				</AlertDialog.Cancel>
				<AlertDialog.Action onclick={onconfirm}>
					{#snippet child({ props })}
						<Button {...props} variant="danger" type="button" size="sm">{confirmLabel}</Button>
					{/snippet}
				</AlertDialog.Action>
			</div>
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>
