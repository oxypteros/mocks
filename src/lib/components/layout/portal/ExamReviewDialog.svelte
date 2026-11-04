<script lang="ts">
	import { Dialog } from 'bits-ui';
	import type { AttemptQuestion } from '#lib/domain/types';
	import { cn } from '#lib/utils/cn';
	import Button from '#lib/components/ui/Buttons.svelte';
	// Icons
	import IconFlag from '~icons/oxy/flag-triangle-right-active';

	interface ExamReviewProps {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		questions: AttemptQuestion[];
		answers: Record<string, string>;
		flags: Record<string, boolean>;
		currentIndex: number;
		onselect: (index: number) => void;
		/** Practice does not flag questions, so the flag legend is hidden. */
		showFlags?: boolean;
	}

	let {
		open,
		onOpenChange,
		questions,
		answers,
		flags,
		currentIndex,
		onselect,
		showFlags = true
	}: ExamReviewProps = $props();

	const answeredTotal = $derived(questions.filter((question) => answers[question.id]).length);
	const flaggedTotal = $derived(
		showFlags ? questions.filter((question) => flags[question.id]).length : 0
	);

	function statusLabel(index: number): string {
		const question = questions[index];
		const answered = Boolean(answers[question.id]);
		const flagged = showFlags && Boolean(flags[question.id]);
		const current = index === currentIndex;

		return [
			`Question ${index + 1}`,
			answered ? 'answered' : 'unanswered',
			flagged ? 'flagged' : '',
			current ? 'current question' : ''
		]
			.filter(Boolean)
			.join(', ');
	}

	function statusClasses(index: number): string {
		const question = questions[index];
		const answered = Boolean(answers[question.id]);
		const current = index === currentIndex;

		return cn(
			'oxy-focus relative flex aspect-square w-full items-center justify-center rounded-sm border-2 font-mono text-sm font-bold tabular-nums transition-colors duration-200',

			answered
				? 'border-dark bg-dark text-light hover:bg-on-surface'
				: 'border-on-surface-muted bg-surface-accent text-on-surface hover:bg-surface',
			current && 'ring-2 ring-dark ring-offset-2 ring-offset-surface'
		);
	}
</script>

<Dialog.Root {open} {onOpenChange}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-40 bg-on-surface/60" />
		<Dialog.Content
			class="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[calc(100dvh-2rem)] max-w-lg -translate-y-1/2 overflow-y-auto rounded-lg border-2 border-on-surface-muted bg-surface-accent p-6 text-on-surface shadow-xl"
		>
			<Dialog.Title class="text-lg font-bold">Review questions</Dialog.Title>
			<Dialog.Description class="mt-2 text-sm leading-relaxed">
				{answeredTotal} of {questions.length} answered{flaggedTotal
					? `, ${flaggedTotal} flagged`
					: ''}. Choose a question to go to it.
			</Dialog.Description>
			<ul class="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-muted">
				<li class="flex items-center gap-1.5">
					<span class="size-3 rounded-xs bg-dark" aria-hidden="true"></span>
					Answered
				</li>
				<li class="flex items-center gap-1.5">
					<span
						class="size-3 rounded-xs border-2 border-on-surface-muted bg-surface-accent"
						aria-hidden="true"
					></span>
					Unanswered
				</li>
				{#if showFlags}
					<li class="flex items-center gap-1.5">
						<IconFlag class="size-3.5 text-dark" aria-hidden="true" />
						Flagged
					</li>
				{/if}
				<li class="flex items-center gap-1.5">
					<span class="size-3 rounded-xs ring-2 ring-dark" aria-hidden="true"></span>
					Current
				</li>
			</ul>
			<ul class="mt-5 grid grid-cols-6 gap-2 sm:grid-cols-10">
				{#each questions as question, index (question.id)}
					<li>
						<button
							type="button"
							class={statusClasses(index)}
							aria-label={statusLabel(index)}
							aria-current={index === currentIndex ? 'true' : undefined}
							onclick={() => onselect(index)}
						>
							<span aria-hidden="true">{index + 1}</span>
							{#if showFlags && flags[question.id]}
								<IconFlag class="absolute top-px right-0 size-3.5 text-dark" aria-hidden="true" />
							{/if}
						</button>
					</li>
				{/each}
			</ul>

			<div class="mt-6 flex justify-end">
				<Dialog.Close>
					{#snippet child({ props })}
						<Button {...props} type="button" variant="secondary" size="sm">Close review</Button>
					{/snippet}
				</Dialog.Close>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
