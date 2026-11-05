<script lang="ts">
	import { AlertDialog } from 'bits-ui';
	import Button from '#lib/components/ui/Buttons.svelte';

	type ConfirmDialogProps = {
		open: boolean;
		title: string;
		description: string;
		confirmLabel: string;
		cancelLabel?: string;
		tone?: 'primary' | 'danger';
		onOpenChange: (open: boolean) => void;
		onconfirm: () => void;
	};

	let {
		open,
		title,
		description,
		confirmLabel,
		cancelLabel = 'Cancel',
		tone = 'primary',
		onOpenChange,
		onconfirm
	}: ConfirmDialogProps = $props();
</script>

<AlertDialog.Root {open} {onOpenChange}>
	<AlertDialog.Portal>
		<AlertDialog.Overlay class="fixed inset-0 z-40 bg-on-surface/60" />
		<AlertDialog.Content
			class="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[calc(100dvh-2rem)] max-w-md -translate-y-1/2 overflow-y-auto rounded-lg border-2 border-on-surface-muted bg-light p-6 text-on-surface shadow-xl"
		>
			<AlertDialog.Title class="text-lg font-bold">{title}</AlertDialog.Title>
			<AlertDialog.Description class="mt-2 text-sm leading-relaxed text-on-surface-muted">
				{description}
			</AlertDialog.Description>

			<div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<AlertDialog.Cancel>
					{#snippet child({ props })}
						<Button {...props} type="button" variant="secondary">{cancelLabel}</Button>
					{/snippet}
				</AlertDialog.Cancel>
				<AlertDialog.Action onclick={onconfirm}>
					{#snippet child({ props })}
						<Button {...props} type="button" variant={tone}>{confirmLabel}</Button>
					{/snippet}
				</AlertDialog.Action>
			</div>
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>
