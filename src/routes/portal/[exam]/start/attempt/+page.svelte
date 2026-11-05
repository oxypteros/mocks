<script lang="ts">
	import type { PageProps } from './$types';
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { AttemptQuestion } from '#lib/domain/types';
	import Button from '#lib/components/ui/Buttons.svelte';
	import ExamTimer from '#lib/components/layout/portal/ExamTimer.svelte';
	import FullscreenButton from '#lib/components/layout/portal/FullscreenButton.svelte';
	import QuestionPlayer from '#lib/components/layout/portal/QuestionPlayer.svelte';
	import ExamReviewDialog from '#lib/components/layout/portal/ExamReviewDialog.svelte';
	import {
		createAttempt,
		readAttempt,
		writeAttempt,
		type StoredAttempt
	} from '#lib/utils/attempt-storage';
	import { clearExamTimer } from '#lib/utils/exam-timer-storage';
	import { readExamDuration } from '#lib/utils/exam-duration';
	import { site } from '#lib/settings/site';

	// Icons
	import IconArrowLeft from '~icons/oxy/arrow-left';

	const Logo = site.logo;
	let { data }: PageProps = $props();

	const questionsEndpoint = $derived(
		resolve('/portal/[exam]/start/attempt/questions', { exam: data.exam.slug })
	);
	const resultsHref = $derived(resolve('/portal/[exam]/results', { exam: data.exam.slug }));

	let attempt = $state<StoredAttempt | null>(null);
	let loading = $state(true);
	let errorMessage = $state('');
	let announcement = $state('');
	let reviewOpen = $state(false);
	let reviewButton = $state<HTMLElement | null>(null);
	let submitted = false;

	// The time limit chosen on the exam page, read once on mount. The attempt
	// records it , so a resumed attempt keeps the limit it started with.
	let chosenDuration = $state<number | null>(null);
	const configuredDuration = $derived(chosenDuration ?? data.exam.durationMinutes);
	const attemptDuration = $derived(attempt?.durationMinutes ?? configuredDuration);

	const total = $derived(attempt?.questions.length ?? data.exam.questionCount);
	const currentIndex = $derived(attempt?.currentIndex ?? 0);
	const question = $derived(attempt ? attempt.questions[currentIndex] : null);
	const selectedOptionId = $derived(
		attempt && question ? (attempt.answers[question.id] ?? null) : null
	);
	const flagged = $derived(attempt && question ? Boolean(attempt.flags[question.id]) : false);

	onMount(() => {
		// Browser Back opens the footer's Exit dialog. Closes the Review dialog
		// first so two modals are never stacked.
		const handleExitRequest = () => {
			if (!reviewOpen) return;
			reviewOpen = false;
		};

		window.addEventListener('mocks:attempt-exit-request', handleExitRequest);

		chosenDuration = readExamDuration(data.exam.slug);
		const stored = readAttempt(data.exam.slug);

		if (stored) {
			attempt = stored;
			loading = false;
			void focusHeading();
		} else {
			void loadQuestions();
		}

		return () => window.removeEventListener('mocks:attempt-exit-request', handleExitRequest);
	});

	async function loadQuestions() {
		loading = true;
		errorMessage = '';

		try {
			const response = await fetch(questionsEndpoint, {
				headers: { accept: 'application/json' }
			});

			if (!response.ok) {
				errorMessage =
					response.status === 409
						? 'This exam is not ready yet. Its question bank may still be in review.'
						: 'The exam questions could not be loaded. Check your connection and try again.';
				return;
			}

			const payload = (await response.json()) as { questions?: AttemptQuestion[] };

			if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
				errorMessage = 'The exam questions could not be loaded. Please try again.';
				return;
			}

			attempt = createAttempt(data.exam.slug, payload.questions, configuredDuration);
			writeAttempt(attempt);
		} catch {
			errorMessage = 'The exam questions could not be loaded. Check your connection and try again.';
		} finally {
			loading = false;
		}

		if (attempt) await focusHeading();
	}

	async function focusHeading() {
		await tick();
		requestAnimationFrame(() => document.getElementById('question-heading')?.focus());
	}

	function persist() {
		if (attempt) writeAttempt(attempt);
	}

	function selectOption(optionId: string) {
		if (!attempt || !question) return;

		attempt.answers[question.id] = optionId;
		persist();
	}

	function toggleFlag() {
		if (!attempt || !question) return;

		const nowFlagged = !attempt.flags[question.id];

		if (nowFlagged) {
			attempt.flags[question.id] = true;
		} else {
			delete attempt.flags[question.id];
		}

		persist();
		announcement = nowFlagged
			? `Question ${currentIndex + 1} flagged for review.`
			: `Flag removed from question ${currentIndex + 1}.`;
	}

	function goTo(index: number) {
		if (!attempt) return;

		const nextIndex = Math.min(Math.max(index, 0), attempt.questions.length - 1);
		if (nextIndex === attempt.currentIndex) return;

		attempt.currentIndex = nextIndex;
		persist();
		void focusHeading();
	}

	function handleReviewOpenChange(open: boolean) {
		reviewOpen = open;

		if (!open) {
			reviewButton?.focus();
		}
	}

	function handleReviewSelect(index: number) {
		reviewOpen = false;
		goTo(index);
		void focusHeading();
	}

	function handleTimeUp() {
		if (submitted) return;

		submitted = true;
		announcement = 'Time is up. Submitting your answers.';
		clearExamTimer(data.exam.slug);
		void goto(resultsHref);
	}
</script>

<svelte:head>
	<title>{data.exam.title} — Mocks</title>
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<header class="sticky top-0 z-20 border-b border-on-surface-muted bg-surface-accent">
		<div
			class="mx-auto flex min-h-11 w-full max-w-8xl flex-wrap items-center justify-between gap-2 px-2 py-1 sm:px-4"
		>
			{#if attempt}
				<div class="flex items-center gap-2">
					<Logo class="hidden sm:block" aria-hidden="true" />
					<span class="hidden h-3 w-0.5 bg-primary-accent sm:block"></span>
					<Button
						variant="ghost"
						size="sm"
						type="button"
						class="px-2 disabled:opacity-60 disabled:hover:cursor-not-allowed"
						aria-label="Previous question"
						disabled={currentIndex === 0}
						onclick={() => goTo(currentIndex - 1)}
					>
						<IconArrowLeft class="size-4" aria-hidden="true" />
						Previous
					</Button>
				</div>

				<div class="flex items-center gap-2">
					<ExamTimer
						durationMinutes={attemptDuration}
						examSlug={data.exam.slug}
						running
						onTimeUp={handleTimeUp}
					/>
					<span class="h-3 w-0.5 bg-primary-accent"></span>
					<FullscreenButton />
					<Button
						size="sm"
						type="button"
						bind:ref={reviewButton}
						aria-label="Review questions"
						aria-haspopup="dialog"
						onclick={() => (reviewOpen = true)}
					>
						Review
					</Button>
				</div>
			{:else}
				<p class="text-sm font-semibold text-on-surface-muted">Loading questions…</p>
			{/if}
		</div>
	</header>

	<p class="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>

	<main
		id="main-content"
		tabindex="-1"
		class="mx-auto flex w-full max-w-8xl flex-1 justify-center px-4 py-8 pb-28 sm:px-6 lg:pt-12"
	>
		{#if loading}
			<p role="status" class="self-start text-sm text-on-surface-muted">
				Loading the exam questions…
			</p>
		{:else if errorMessage}
			<div
				role="alert"
				class="h-fit w-full max-w-xl rounded border-2 border-on-surface-muted bg-surface-accent p-5"
			>
				<h1 class="text-lg font-bold">The exam could not start</h1>
				<p class="mt-2 text-sm leading-relaxed text-on-surface-muted">{errorMessage}</p>
				<Button type="button" class="mt-4" onclick={loadQuestions}>Try again</Button>
			</div>
		{:else if attempt && question}
			<QuestionPlayer
				{question}
				number={currentIndex + 1}
				{total}
				{selectedOptionId}
				{flagged}
				isLast={currentIndex === total - 1}
				onselect={selectOption}
				onnext={() => goTo(currentIndex + 1)}
				onflag={toggleFlag}
			/>
		{/if}
	</main>
</div>

{#if attempt}
	<ExamReviewDialog
		open={reviewOpen}
		onOpenChange={handleReviewOpenChange}
		questions={attempt.questions}
		answers={attempt.answers}
		flags={attempt.flags}
		{currentIndex}
		onselect={handleReviewSelect}
	/>
{/if}
