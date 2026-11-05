<script lang="ts">
	import { cn } from '#lib/utils/cn';
	import {
		filterQuestions,
		type ResultQuestionStatus,
		type ResultsFilter,
		type ResultsOptionView,
		type ResultsQuestionView
	} from '#lib/utils/results-view';
	import ExternalLink from '#lib/components/ui/ExternalLink.svelte';
	import MarkdownText from '#lib/components/ui/MarkdownText.svelte';
	// Icons
	import IconChevronDown from '~icons/oxy/chevron-down';

	interface ResultsListProps {
		questions: ResultsQuestionView[];
		counts: { correct: number; wrong: number };
	}

	let { questions, counts }: ResultsListProps = $props();

	// Local debugging helper only. Vite replaces `import.meta.env.DEV` with
	// `false` in builds, so the question-ID block is removed from production.
	const showQuestionIds = import.meta.env.DEV;

	let filter = $state<ResultsFilter>('all');
	let announcement = $state('');

	const visible = $derived(filterQuestions(questions, filter));

	const filters = $derived([
		{ value: 'all' as const, label: 'All', count: questions.length },
		{ value: 'correct' as const, label: 'Correct', count: counts.correct },
		{ value: 'wrong' as const, label: 'Wrong', count: counts.wrong }
	]);

	function statusLabel(status: ResultQuestionStatus): string {
		if (status === 'correct') return 'Correct';
		if (status === 'incorrect') return 'Wrong';
		return 'Not answered';
	}

	function statusClasses(status: ResultQuestionStatus): string {
		return cn(
			'inline-flex min-w-20 shrink-0 items-center justify-center rounded-full border px-2 py-0.5 text-xs font-bold whitespace-nowrap',
			status === 'correct'
				? 'border-on-correct-surface/40 bg-correct-surface text-on-correct-surface'
				: 'border-on-wrong-surface/40 bg-wrong-surface text-on-wrong-surface'
		);
	}

	function optionClasses(option: ResultsOptionView): string {
		return cn(
			'rounded-sm border-l-4 py-2 pr-3 pl-3',
			option.isCorrect
				? 'border-on-correct-surface bg-correct-surface'
				: option.selected
					? 'border-on-wrong-surface bg-wrong-surface'
					: 'border-surface-muted bg-surface'
		);
	}

	function optionNote(option: ResultsOptionView): string {
		if (option.isCorrect && option.selected) return 'Your answer · Correct';
		if (option.isCorrect) return 'Correct answer';
		if (option.selected) return 'Your answer · Wrong';
		return '';
	}

	function safeHref(url: string): string | null {
		return /^https?:\/\//i.test(url) ? url : null;
	}

	function setFilter(next: ResultsFilter) {
		filter = next;

		const shown = filterQuestions(questions, next).length;
		const label =
			next === 'all'
				? 'All questions'
				: next === 'correct'
					? 'Correct questions'
					: 'Wrong questions';
		announcement = `${label}: showing ${shown} of ${questions.length}.`;
	}
</script>

<section aria-labelledby="review-heading" class="mt-12">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h2 id="review-heading" class="text-lg font-bold">Question review</h2>
			<p class="mt-1 text-sm text-on-surface-muted">
				Expand a question to see why each answer is right or wrong.
			</p>
		</div>

		<div role="group" aria-label="Filter questions" class="flex flex-wrap gap-2">
			{#each filters as option (option.value)}
				<button
					type="button"
					class={cn(
						'oxy-focus rounded-full border-2 px-3 py-1 text-xs font-semibold transition-colors duration-200',
						filter === option.value
							? 'border-dark bg-dark text-light'
							: 'border-on-surface-muted bg-surface-accent text-on-surface hover:bg-surface'
					)}
					aria-pressed={filter === option.value}
					onclick={() => setFilter(option.value)}
				>
					{option.label}
					<span class="font-mono tabular-nums">({option.count})</span>
				</button>
			{/each}
		</div>
	</div>

	<p class="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>

	{#if visible.length === 0}
		<p
			class="mt-5 rounded border border-surface-muted bg-surface-accent p-4 text-sm text-on-surface-muted"
		>
			{filter === 'correct' ? 'No correct answers.' : 'No wrong or unanswered questions.'}
		</p>
	{:else}
		<ol class="mt-5 space-y-2">
			{#each visible as question (question.id)}
				<li>
					<details
						class="group rounded border border-surface-muted bg-surface-accent open:border-on-surface-muted"
					>
						<summary
							class="oxy-focus flex cursor-pointer list-none flex-wrap items-start gap-x-3 gap-y-1.5 rounded p-3 [&::-webkit-details-marker]:hidden"
						>
							<span class={statusClasses(question.status)}>{statusLabel(question.status)}</span>
							<span
								class="mt-0.5 shrink-0 font-mono text-xs font-bold text-on-surface-muted tabular-nums"
							>
								{question.number}
							</span>
							<span
								class="line-clamp-2 min-w-0 flex-1 basis-48 text-sm leading-snug font-medium text-on-surface group-open:line-clamp-none"
							>
								<MarkdownText text={question.stem} />
							</span>
							<IconChevronDown
								class="mt-0.5 size-4 shrink-0 text-on-surface-muted transition-transform duration-200 group-open:rotate-180"
								aria-hidden="true"
							/>
						</summary>

						<div class="border-t border-surface-muted px-3 py-3 sm:px-4">
							<!-- Local debugging helper, shows the question ID for cross-referencing the seed data. -->
							{#if showQuestionIds}
								<p class="mb-2 font-mono text-xs text-on-surface-muted">
									Question ID: <span class="select-all">{question.id}</span>
								</p>
							{/if}

							<p class="text-sm leading-relaxed">
								{#if question.status === 'correct'}
									You chose <strong class="font-semibold">{question.selectedShortLabel}</strong>.
								{:else if question.status === 'incorrect'}
									You chose <strong class="font-semibold">{question.selectedShortLabel}</strong>.
									The correct answer is
									<strong class="font-semibold">{question.correctShortLabel}</strong>.
								{:else}
									You did not answer. The correct answer is
									<strong class="font-semibold">{question.correctShortLabel}</strong>.
								{/if}
							</p>

							<p class="mt-2 text-sm leading-relaxed text-on-surface-muted">
								<MarkdownText text={question.explanation} />
							</p>

							<h3 class="mt-4 text-xs font-bold tracking-wide text-on-surface-muted uppercase">
								Answer options
							</h3>

							<ul class="mt-2 space-y-2">
								{#each question.options as option (option.id)}
									<li class={optionClasses(option)}>
										<div class="flex items-start gap-2">
											<span
												class="mt-0.5 font-mono text-xs font-bold text-on-surface-muted tabular-nums"
												aria-hidden="true">{option.number}.</span
											>
											<MarkdownText
												text={option.text}
												class="min-w-0 flex-1 text-sm leading-snug"
											/>
										</div>

										{#if optionNote(option)}
											<p
												class={cn(
													'mt-1 text-xs font-bold',
													option.isCorrect ? 'text-on-correct-surface' : 'text-on-wrong-surface'
												)}
											>
												{optionNote(option)}
											</p>
										{/if}

										<p class="mt-1 text-xs leading-relaxed text-on-surface-muted">
											<MarkdownText text={option.rationale} />
										</p>
									</li>
								{/each}
							</ul>

							{#if question.references.length > 0}
								<h3 class="mt-4 text-xs font-bold tracking-wide text-on-surface-muted uppercase">
									Sources
								</h3>

								<ul class="mt-1 space-y-1 text-xs leading-relaxed text-on-surface-muted">
									{#each question.references as reference, index (index)}
										{@const href = reference.url ? safeHref(reference.url) : null}
										<li>
											{#if href}
												<ExternalLink {href} iconClass="size-[0.95em]">
													{reference.title}
												</ExternalLink>
											{:else}
												{reference.title}
											{/if}
											{#if reference.author || reference.year}
												<span>
													— {[reference.author, reference.year].filter(Boolean).join(', ')}</span
												>
											{/if}
											{#if reference.note}
												<span>— {reference.note}</span>
											{/if}
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					</details>
				</li>
			{/each}
		</ol>
	{/if}
</section>
