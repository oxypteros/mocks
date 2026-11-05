<script lang="ts">
	import type { PageProps } from './$types';
	import { onMount, tick } from 'svelte';
	import { resolve } from '$app/paths';
	import type { AttemptResult, SubmittedAnswer } from '#lib/domain/types';
	import Button from '#lib/components/ui/Buttons.svelte';
	import ModuleScoreBars from '#lib/components/layout/portal/ModuleScoreBars.svelte';
	import ResultQuestionList from '#lib/components/layout/portal/ResultQuestionList.svelte';
	import { readAttempt } from '#lib/utils/attempt-storage';
	import { buildResultsView, type ResultsView } from '#lib/utils/results-view';

	let { data }: PageProps = $props();

	const examHref = $derived(resolve('/portal/[exam]', { exam: data.exam.slug }));
	const startHref = $derived(resolve('/portal/[exam]/start', { exam: data.exam.slug }));
	const scoreEndpoint = $derived(resolve('/portal/[exam]/results/score', { exam: data.exam.slug }));

	let view = $state<ResultsView | null>(null);
	let status = $state<'loading' | 'ready' | 'empty' | 'error'>('loading');
	let errorMessage = $state('');

	onMount(() => {
		void load();
	});

	async function load() {
		status = 'loading';
		errorMessage = '';
		view = null;

		const attempt = readAttempt(data.exam.slug);
		if (!attempt) {
			status = 'empty';
			return;
		}

		// Every drawn question is submitted, with null for a blank answer. The
		// scorer requires exactly exam.questionCount answers.
		const answers: SubmittedAnswer[] = attempt.questions.map((question) => ({
			questionId: question.id,
			selectedOptionId: attempt.answers[question.id] ?? null
		}));

		try {
			const response = await fetch(scoreEndpoint, {
				method: 'POST',
				headers: { 'content-type': 'application/json', accept: 'application/json' },
				body: JSON.stringify({ answers })
			});

			if (!response.ok) {
				errorMessage =
					response.status === 400
						? 'This attempt could not be scored. Start a new attempt to see results.'
						: 'The results could not be loaded. Check your connection and try again.';
				status = 'error';
				return;
			}

			const result = (await response.json()) as AttemptResult;
			view = buildResultsView(attempt, result);
			status = 'ready';

			await tick();
			document.getElementById('results-heading')?.focus();
		} catch {
			errorMessage = 'The results could not be loaded. Check your connection and try again.';
			status = 'error';
		}
	}
</script>

<svelte:head>
	<title>Results — {data.exam.title} — Mocks</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<header class="sticky top-0 z-20 border-b border-surface-muted bg-surface-accent">
		<div
			class="mx-auto flex min-h-11 w-full max-w-8xl items-center justify-between gap-3 px-2 sm:px-4"
		>
			<p class="min-w-0 truncate text-sm font-semibold text-on-surface">
				Results
				<span class="font-normal text-on-surface-muted">· {data.exam.title}</span>
			</p>

			<Button variant="ghost" size="sm" class="px-2" href={examHref}>Back to exam</Button>
		</div>
	</header>

	<main
		id="main-content"
		tabindex="-1"
		class="mx-auto w-full max-w-6xl flex-1 px-3 py-8 sm:px-6 sm:py-12"
	>
		<h1 id="results-heading" tabindex="-1" class="sr-only">Results for {data.exam.title}</h1>

		{#if status === 'loading'}
			<p role="status" class="text-sm text-on-surface-muted">Scoring your attempt…</p>
		{:else if status === 'empty'}
			<div class="max-w-xl rounded border-2 border-on-surface-muted bg-surface-accent p-5">
				<h2 class="text-lg font-bold">No results to show</h2>
				<p class="mt-2 text-sm leading-relaxed text-on-surface-muted">
					This tab has no finished attempt. Results are kept in this tab only, so start an exam to
					see your score.
				</p>
				<Button class="mt-4" href={startHref}>Start an exam</Button>
			</div>
		{:else if status === 'error'}
			<div
				role="alert"
				class="max-w-xl rounded border-2 border-on-surface-muted bg-surface-accent p-5"
			>
				<h2 class="text-lg font-bold">The results could not be shown</h2>
				<p class="mt-2 text-sm leading-relaxed text-on-surface-muted">{errorMessage}</p>
				<div class="mt-4 flex flex-wrap gap-2">
					<Button type="button" onclick={load}>Try again</Button>
					<Button variant="secondary" href={startHref}>Start a new attempt</Button>
				</div>
			</div>
		{:else if view}
			<div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
				<section aria-labelledby="score-heading" class="min-w-0">
					<h2 id="score-heading" class="sr-only">Score</h2>

					<div class="score-block">
						<p class="text-sm font-semibold text-on-surface">
							Pass threshold
							<span class="font-mono text-base">{view.passPercent}%</span>
						</p>

						<p
							class="score-value"
							class:text-on-correct-surface={view.passed}
							class:text-on-wrong-surface={!view.passed}
						>
							<span class="sr-only">Your score: </span>{view.scorePercent}<span
								class="score-percent"
								aria-hidden="true">%</span
							><span class="sr-only"> percent</span>
						</p>

						<p
							class="mt-2 text-sm font-bold"
							class:text-on-correct-surface={view.passed}
							class:text-on-wrong-surface={!view.passed}
						>
							{view.passed ? 'Passed' : 'Not passed'}
						</p>

						<p class="mt-1 text-sm text-on-surface-muted">
							<span class="font-mono tabular-nums">{view.correctCount}</span> of
							<span class="font-mono tabular-nums">{view.questionCount}</span> correct
						</p>

						{#if view.durationMinutes !== null && view.durationMinutes !== view.exam.durationMinutes}
							<p class="mt-2 text-xs text-on-surface-muted">
								Extended time: <span class="font-mono tabular-nums">{view.durationMinutes}</span>
								minutes, against the standard
								<span class="font-mono tabular-nums">{view.exam.durationMinutes}</span>.
							</p>
						{/if}

						<Button variant="secondary" size="sm" class="mt-4" href={startHref}>
							Start a new attempt
						</Button>
					</div>
				</section>

				<ModuleScoreBars modules={view.modules} />
			</div>

			<ResultQuestionList questions={view.questions} counts={view.counts} />
		{/if}
	</main>
</div>

<style>
	/*
	 * The score box is sized from the container, not the number, so 10% and 85%
	 * occupy the same height and width. `cqi` keeps it inside the grid
	 * column instead of overflowing like `vw`.
	 */
	.score-block {
		container-type: inline-size;
	}

	.score-value {
		margin-top: 0.5rem;
		font-size: clamp(4.5rem, 26cqi, 11rem);
		font-weight: 300;
		line-height: 0.85;
		letter-spacing: -0.04em;
		font-variant-numeric: tabular-nums;
	}

	.score-percent {
		font-size: 0.4em;
		font-weight: 400;
		letter-spacing: 0;
	}
</style>
