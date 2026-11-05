<script lang="ts">
	import type { AttemptQuestion } from '#lib/domain/types';
	import type { PracticeFeedback } from '#lib/domain/practice';
	import { cn } from '#lib/utils/cn';
	import Button from '#lib/components/ui/Buttons.svelte';
	import ExternalLink from '#lib/components/ui/ExternalLink.svelte';
	import MarkdownText from '#lib/components/ui/MarkdownText.svelte';
	// Icons
	import IconNext from '~icons/oxy/arrow-right';
	import IconSkip from '~icons/oxy/redo-dot';
	import IconCorrect from '~icons/oxy/circle-check';
	import IconWrong from '~icons/oxy/circle-x';
	import IconFlag from '~icons/oxy/flag-triangle-left';
	import IconFlagOff from '~icons/oxy/flag-triangle-right-active';

	interface Props {
		question: AttemptQuestion;
		number: number;
		total: number;
		selectedOptionId: string | null;
		flagged?: boolean;
		isLast: boolean;
		onselect: (optionId: string) => void;
		onnext: () => void;
		onflag?: () => void;
		/** Practice swaps Flag for Check answer and reveals feedback after checking. */
		mode?: 'exam' | 'practice';
		feedback?: PracticeFeedback | null;
		oncheck?: () => void;
		onskip?: () => void;
		onfinish?: () => void;
	}

	let {
		question,
		number,
		total,
		selectedOptionId,
		flagged = false,
		isLast,
		onselect,
		onnext,
		onflag,
		mode = 'exam',
		feedback = null,
		oncheck,
		onskip,
		onfinish
	}: Props = $props();

	const isPractice = $derived(mode === 'practice');
	const checked = $derived(isPractice && feedback !== null);

	function isCorrectOption(optionId: string) {
		return checked && feedback?.correctOptionId === optionId;
	}

	function isWrongSelection(optionId: string) {
		return checked && selectedOptionId === optionId && feedback?.correctOptionId !== optionId;
	}

	function optionClasses(optionId: string) {
		return cn(
			'oxy-focus-container flex w-full items-start gap-3 rounded-sm border border-on-surface-muted bg-input p-3 text-left transition-colors	 duration-300',
			!checked && 'cursor-pointer hover:bg-input/40 has-[:focus-visible]:bg-input/40',
			!checked && selectedOptionId === optionId && 'border-dark bg-input/40 ring-1 ring-dark',
			isCorrectOption(optionId) &&
				'border-on-correct-surface bg-correct-surface ring-1 ring-on-correct-surface',
			isWrongSelection(optionId) &&
				'border-on-wrong-surface bg-wrong-surface ring-1 ring-on-wrong-surface',
			checked && 'cursor-default'
		);
	}

	function indicatorClasses(optionId: string) {
		return cn(
			'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2 bg-surface-accent',
			selectedOptionId === optionId ? 'border-dark' : 'border-on-surface-muted',
			isCorrectOption(optionId) && 'border-on-correct-surface',
			isWrongSelection(optionId) && 'border-on-wrong-surface'
		);
	}

	function optionNote(optionId: string): string {
		if (isCorrectOption(optionId)) return 'Correct answer';
		if (isWrongSelection(optionId)) return 'Your answer';
		return '';
	}

	/** Only https reference URLs become links. Anything else renders as text. */
	function safeHref(url: string): string | null {
		return /^https?:\/\//i.test(url) ? url : null;
	}
</script>

<section aria-labelledby="question-heading" class="w-full max-w-xl min-w-0">
	<div class="w-full min-w-0 rounded bg-surface-accent p-4 ring-2 ring-on-surface-muted sm:p-5">
		<p
			class="text-[11px] font-bold tracking-wide text-on-surface-muted uppercase tabular-nums"
			aria-hidden="true"
		>
			Question {number} of {total}
		</p>

		<h1
			id="question-heading"
			tabindex="-1"
			class="mt-2 scroll-mt-24 text-base leading-snug font-semibold text-dark sm:text-lg"
		>
			<span class="sr-only">Question {number} of {total}. </span>
			<MarkdownText text={question.stem} />
		</h1>

		<p id="question-help" class="mt-1.5 text-xs text-on-surface-muted">
			{#if !isPractice}
				Choose one answer.
			{:else if checked}
				This answer is registered.
			{:else}
				Choose one answer, then check it.
			{/if}
		</p>

		<fieldset
			class="mt-4 min-w-0"
			aria-labelledby="question-heading"
			aria-describedby="question-help"
		>
			<legend class="sr-only">Answer options</legend>

			<div class="space-y-2">
				{#each question.options as option, index (option.id)}
					<label class={optionClasses(option.id)}>
						<input
							type="radio"
							name="answer"
							value={option.id}
							checked={selectedOptionId === option.id}
							disabled={checked}
							onchange={() => onselect(option.id)}
							class="sr-only"
						/>

						<!-- Radio dot indicator -->
						<span class={indicatorClasses(option.id)} aria-hidden="true">
							{#if isCorrectOption(option.id)}
								<span class="selected-dot size-2 rounded-full bg-on-correct-surface"></span>
							{:else if isWrongSelection(option.id)}
								<span class="selected-dot size-2 rounded-full bg-on-wrong-surface"></span>
							{:else if selectedOptionId === option.id}
								<span class="selected-dot size-2 rounded-full bg-dark"></span>
							{/if}
						</span>

						<!-- Content column -->
						<div class="min-w-0 flex-1">
							<!-- Number + Text  -->
							<div class="flex items-start gap-2">
								<span
									class="mt-0.5 font-mono text-xs font-bold text-on-surface-muted select-none"
									aria-hidden="true"
								>
									{index + 1}.
								</span>

								<MarkdownText
									text={option.text}
									class="text-sm leading-snug font-medium text-on-surface"
								/>
							</div>

							<!-- Status Pill  -->
							{#if optionNote(option.id)}
								<div class="mt-1 ml-6">
									<span
										class={cn(
											'inline-flex items-center gap-2 rounded-sm px-1.5 py-px font-mono text-[11px] font-bold tracking-wide uppercase',
											isCorrectOption(option.id)
												? 'bg-on-correct-surface text-correct-surface'
												: 'bg-on-wrong-surface text-wrong-surface'
										)}
									>
										{optionNote(option.id)}
									</span>
								</div>
							{/if}
						</div>
					</label>
				{/each}
			</div>
		</fieldset>

		{#if checked && feedback}
			<section
				id="practice-feedback"
				tabindex="-1"
				aria-labelledby="practice-feedback-heading"
				class={cn(
					'mt-4 scroll-mt-24 rounded-sm border-2 p-3.5',
					feedback.correct
						? 'border-on-correct-surface bg-correct-surface'
						: 'border-on-wrong-surface bg-wrong-surface'
				)}
			>
				<h2
					id="practice-feedback-heading"
					class={cn(
						'flex items-center gap-2 text-sm font-bold',
						feedback.correct ? 'text-on-correct-surface' : 'text-on-wrong-surface'
					)}
				>
					{#if feedback.correct}
						<IconCorrect class="size-4.5 shrink-0" aria-hidden="true" />
						Correct
					{:else}
						<IconWrong class="size-4.5 shrink-0" aria-hidden="true" />
						Not quite
					{/if}
				</h2>

				<p class="mt-2 text-sm leading-relaxed text-on-surface">
					<span class="font-bold text-on-correct-surface"
						>Correct answer: {feedback.correctLabel}.</span
					>
				</p>
				<p class="mt-1 text-sm leading-relaxed text-on-surface">
					<MarkdownText text={feedback.correctText} />
				</p>
				<p class="mt-1 text-sm leading-relaxed text-on-surface">
					<MarkdownText text={feedback.correctRationale} />
				</p>

				{#if !feedback.correct}
					<p class="mt-3 text-sm leading-relaxed text-on-surface">
						<span class="font-bold text-on-wrong-surface"
							>Your answer: {feedback.selectedLabel}.</span
						>
					</p>
					<p class="mt-1 text-sm leading-relaxed text-on-surface">
						<MarkdownText text={feedback.selectedText} />
					</p>
					<p class="mt-1 text-sm leading-relaxed text-on-surface">
						<MarkdownText text={feedback.selectedRationale} />
					</p>
				{/if}

				<p class="mt-3 text-sm leading-relaxed text-on-surface">
					<MarkdownText text={feedback.explanation} />
				</p>

				{#if feedback.references.length > 0}
					<h3 class="mt-3 text-xs font-bold tracking-wide text-on-surface-muted uppercase">
						Sources
					</h3>
					<ul class="mt-1 space-y-1 text-xs leading-relaxed text-on-surface-muted">
						{#each feedback.references as reference, index (index)}
							{@const href = reference.url ? safeHref(reference.url) : null}
							<li>
								{#if href}
									<ExternalLink {href} iconClass="size-[0.9em]">
										{reference.title}
									</ExternalLink>
								{:else}
									{reference.title}
								{/if}
								{#if reference.author || reference.year}
									<span>— {[reference.author, reference.year].filter(Boolean).join(', ')}</span>
								{/if}
								{#if reference.note}
									<span>— {reference.note}</span>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}

		<div
			class="mt-4 flex items-center justify-between gap-4 border-t-2 border-on-surface-muted pt-3"
		>
			{#if isPractice}
				{#if checked}
					<Button size="sm" class="min-w-20" type="button" onclick={isLast ? onfinish : onnext}>
						{isLast ? 'See summary' : 'Next'}
						<IconNext aria-hidden="true" />
					</Button>
				{:else}
					<Button
						size="sm"
						class="min-w-30"
						type="button"
						disabled={!selectedOptionId}
						onclick={oncheck}
					>
						Check answer
					</Button>
					<Button variant="ghost" size="sm" type="button" onclick={onskip}
						><IconSkip aria-hidden="true" />Skip question</Button
					>
				{/if}
			{:else}
				<Button size="sm" class="min-w-20" type="button" disabled={isLast} onclick={onnext}>
					Next
					<IconNext aria-hidden="true" />
				</Button>
				<Button variant="ghost" size="sm" type="button" aria-pressed={flagged} onclick={onflag}>
					{#if flagged}
						<IconFlagOff class="text-dark" aria-hidden="true" />
					{:else}
						<IconFlag class="text-dark" aria-hidden="true" />
					{/if}
					Flag for review
				</Button>
			{/if}
		</div>

		{#if isPractice && isLast}
			<p class="mt-2 text-xs text-on-surface">
				{#if checked}
					This was the last question. See your summary to review the session.
				{:else}
					This is the last question. Skipping it ends the session.
				{/if}
			</p>
		{:else if !isPractice && isLast}
			<p class="mt-2 text-xs text-on-surface">
				This is the last question. Review your answers or end the exam.
			</p>
		{/if}

		{#if !isPractice && flagged}
			<p class="mt-2 text-right text-xs font-semibold text-on-surface">This question is flagged.</p>
		{/if}
	</div>
</section>
