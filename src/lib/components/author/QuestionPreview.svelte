<script lang="ts">
	import NewTabLink from '#lib/components/ui/ExternalLink.svelte';
	import MarkdownText from '#lib/components/ui/MarkdownText.svelte';
	import type { Question } from '#lib/authoring/schema';

	type QuestionPreviewProps = { question: Question };

	let { question }: QuestionPreviewProps = $props();

	const correctOption = $derived(
		question.options.find((option) => option.id === question.correctOptionId)
	);
</script>

<section aria-labelledby="preview-heading">
	<h2 id="preview-heading" class="text-lg font-bold text-on-surface">Preview</h2>
	<p class="text-xs text-on-surface-muted">
		Authoring order shown. Learners get a shuffled order and labels derived at render time.
	</p>

	<div class="mt-3 rounded bg-surface-accent p-4 ring-2 ring-on-surface-muted sm:p-5">
		<p class="text-[11px] font-bold tracking-wide text-on-surface-muted uppercase">Question</p>
		<p class="mt-2 text-base leading-snug font-semibold text-dark">
			{#if question.stem}
				<MarkdownText text={question.stem} />
			{:else}
				The question text will appear here.
			{/if}
		</p>

		<ol class="mt-4 space-y-2">
			{#each question.options as option, index (index)}
				<li
					class="flex items-start gap-2 rounded border border-on-surface-muted bg-input px-3 py-2 transition-colors duration-300 hover:bg-input/40"
				>
					<span class="mt-0.5 font-mono text-xs font-bold text-on-surface-muted">
						{index + 1}.
					</span>
					<div class="min-w-0 flex-1">
						<MarkdownText
							text={option.text || `Option ${index + 1}`}
							class="text-sm leading-snug text-on-surface"
						/>
						{#if option.rationale}
							<p class="mt-1 text-xs leading-relaxed text-on-surface-muted">
								<span class="sr-only">Rationale: </span>
								<MarkdownText text={option.rationale} />
							</p>
						{/if}
					</div>
					{#if option.id === question.correctOptionId}
						<span
							class="shrink-0 rounded bg-on-correct-surface px-1.5 py-0.5 text-[11px] font-bold tracking-wide whitespace-nowrap text-correct-surface uppercase"
						>
							Correct
						</span>
					{/if}
				</li>
			{/each}
		</ol>

		<div class="mt-4 border-t border-on-surface-muted pt-3">
			<p class="text-[11px] font-bold tracking-wide text-on-surface-muted uppercase">Explanation</p>
			<p class="mt-1 text-sm leading-relaxed text-on-surface">
				{#if question.explanation}
					<MarkdownText text={question.explanation} />
				{:else}
					The shared explanation will appear after submission.
				{/if}
			</p>
			{#if correctOption}
				<p class="mt-2 text-xs text-on-surface-muted">
					Feedback refers to the correct answer as
					<strong class="text-on-surface">{correctOption.shortLabel || correctOption.id}</strong>
					using its short label.
				</p>
			{/if}
		</div>

		{#if question.references.some((reference) => reference.title || reference.url || reference.note)}
			<div class="mt-3 border-t border-on-surface-muted pt-3">
				<h3 class="text-[11px] font-bold tracking-wide text-on-surface-muted uppercase">Sources</h3>
				<ul class="mt-1 space-y-1 text-sm">
					{#each question.references as reference, index (index)}
						{#if reference.title || reference.url || reference.note}
							<li>
								{#if reference.url}
									<NewTabLink href={reference.url}>
										{reference.title || reference.url}
									</NewTabLink>
								{:else}
									{reference.title}
								{/if}
								{#if (reference.kind ?? 'web') === 'publication' && (reference.author || reference.year)}
									<span class="text-on-surface-muted">
										<span aria-hidden="true">— </span>
										<span class="sr-only">Published by </span>
										{[reference.author, reference.year].filter(Boolean).join(', ')}
									</span>
								{/if}
								{#if (reference.kind ?? 'web') === 'general' && reference.note}
									<span class="block text-xs text-on-surface-muted">
										{reference.note}
									</span>
								{/if}
							</li>
						{/if}
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</section>
