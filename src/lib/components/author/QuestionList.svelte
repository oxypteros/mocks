<script lang="ts">
	import { cn } from '#lib/utils/cn';
	import type { Question } from '#lib/authoring/schema';

	type QuestionListProps = {
		questions: Question[];
		selectedIndex: number;
		onselect: (index: number) => void;
	};

	let { questions, selectedIndex, onselect }: QuestionListProps = $props();
</script>

<div class="flex min-h-0 flex-col lg:flex-1">
	<h2 class="text-lg font-bold text-on-surface">Question List</h2>
	<p class="text-xs font-semibold tracking-wide text-on-surface-muted uppercase">
		{questions.length}
		{questions.length === 1 ? 'question' : 'questions'} in this bank
	</p>

	{#if questions.length === 0}
		<p
			class="mt-2 w-full min-w-50 rounded border border-dashed border-on-surface-muted bg-surface-muted p-3 text-sm text-on-surface-muted"
		>
			No questions yet. Use <strong>New question</strong> to start one.
		</p>
	{:else}
		<ol
			class="mt-2 min-h-0 space-y-1.5 pr-1 sm:grid sm:grid-cols-2 sm:gap-x-4 lg:flex lg:flex-1 lg:flex-col lg:overflow-y-auto lg:overscroll-contain"
		>
			{#each questions as question, index (index)}
				{@const selected = index === selectedIndex}
				<li>
					<button
						type="button"
						class={cn(
							'oxy-focus block w-full rounded border-2 px-2.5 py-2 text-left',
							selected
								? 'border-primary-accent bg-surface-accent'
								: 'border-on-surface bg-surface-muted hover:bg-surface-muted'
						)}
						aria-current={selected ? 'true' : undefined}
						onclick={() => onselect(index)}
					>
						<span class="block truncate font-mono text-xs font-bold text-on-surface">
							{question.id || 'No ID yet'}
						</span>
						<span class="mt-0.5 block truncate text-[11px] text-on-surface-muted">
							{question.module || 'No module'} · {question.status}
						</span>
					</button>
				</li>
			{/each}
		</ol>
	{/if}
</div>
