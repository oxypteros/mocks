<script lang="ts">
	import type { PageProps } from './$types';
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/ui/Buttons.svelte';
	import ExamTimer from '#lib/components/layout/portal/ExamTimer.svelte';
	import FullscreenButton from '#lib/components/layout/portal/FullscreenButton.svelte';
	import { clearAttempt } from '#lib/utils/attempt-storage';
	import { clearExamTimer } from '#lib/utils/exam-timer-storage';
	import { readExamDuration } from '#lib/utils/exam-duration';
	import { site } from '#lib/settings/site';

	const Logo = site.logo;
	let { data }: PageProps = $props();

	const attemptHref = $derived(resolve('/portal/[exam]/start/attempt', { exam: data.exam.slug }));

	// The limit picked on the exam page. The timer re-derives its display from
	// the prop, so it updates as soon as this is read on mount
	let chosenDuration = $state<number | null>(null);
	const durationMinutes = $derived(chosenDuration ?? data.exam.durationMinutes);
	const extended = $derived(durationMinutes !== data.exam.durationMinutes);

	let countingDown = $state(false);
	let count = $state(3);
	let skipCountdown = $state(false);
	let navigating = $state(false);
	let announcement = $state('');
	let startNowButton: HTMLElement | null = $state(null);
	let countdownTimer: number | undefined;

	const countdownCaption = $derived(
		count === 3 ? 'Are you ready?' : count === 2 ? "Let's go!" : 'Good luck.'
	);

	// The lobby is the start of a new session. Drop any timer or finished attempt
	// left in this tab, so Start never resumes a scored attempt.
	onMount(() => {
		clearExamTimer(data.exam.slug);
		clearAttempt(data.exam.slug);
		chosenDuration = readExamDuration(data.exam.slug);

		// Touch-first and narrow screens skip the countdown and go straight in.
		skipCountdown =
			window.matchMedia('(pointer: coarse)').matches ||
			window.matchMedia('(max-width: 639px)').matches;

		return () => clearInterval(countdownTimer);
	});

	async function handleStart(event: MouseEvent) {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();

		if (countingDown || navigating) return;

		if (skipCountdown) {
			navigating = true;
			void goto(attemptHref);
			return;
		}

		countingDown = true;
		count = 3;
		announcement = 'Starting in 3 seconds. Press Start now to skip the countdown.';

		const startedAt = Date.now();
		countdownTimer = window.setInterval(() => {
			const remaining = 3 - Math.floor((Date.now() - startedAt) / 1000);
			if (remaining <= 0) {
				finishCountdown();
				return;
			}
			count = remaining;
		}, 100);

		await tick();
		startNowButton?.focus();
	}

	function finishCountdown() {
		if (!countingDown || navigating) return;

		navigating = true;
		clearInterval(countdownTimer);
		countdownTimer = undefined;
		announcement = 'Starting the exam.';
		void goto(attemptHref);
	}
</script>

<svelte:head>
	<title>Start {data.exam.title} — Mocks</title>
	<meta
		name="description"
		content="Read the exam details and tips, then start your timed {data.exam.title} practice exam."
	/>
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<header class="sticky top-0 border-b border-on-surface-muted bg-surface-accent">
		<div
			class="mx-auto flex min-h-11 w-full max-w-8xl flex-wrap items-center justify-between gap-3 px-2 sm:px-4"
		>
			<div class="flex items-center gap-2">
				<Logo aria-hidden="true" />
				<p class="font-semibold text-on-surface-muted">Exam lobby</p>
			</div>

			<div class="flex items-center gap-1">
				<ExamTimer {durationMinutes} examSlug={data.exam.slug} />
				<span class="hidden h-3 w-0.5 bg-primary-accent lg:block"></span>
				<FullscreenButton />
			</div>
		</div>
	</header>

	<p class="sr-only" role="status" aria-live="polite">{announcement}</p>

	<main
		id="main-content"
		tabindex="-1"
		class="mx-auto flex w-full max-w-8xl flex-1 flex-col px-4 pt-10 pb-24 sm:px-6 lg:pt-16"
	>
		{#if countingDown}
			<div class="flex flex-1 flex-col items-center justify-center gap-6 text-center">
				<h1 class="text-xs font-bold tracking-wide text-on-surface-muted uppercase">
					Starting the exam
				</h1>

				{#key count}
					<p
						class="countdown-digit font-mono text-[clamp(7rem,28vw,12rem)] leading-none font-extrabold text-primary-accent"
						aria-hidden="true"
					>
						{count}
					</p>
				{/key}

				<p class="text-2xl font-bold text-balance">{countdownCaption}</p>

				<Button
					type="button"
					variant="secondary"
					size="lg"
					bind:ref={startNowButton}
					onclick={finishCountdown}
				>
					Start now
				</Button>
			</div>
		{:else}
			<div
				class="mx-auto flex w-full flex-col justify-between gap-10 lg:flex-row lg:gap-8 lg:py-16"
			>
				<!-- Hero -->
				<section aria-labelledby="lobby-heading" class="flex w-full flex-col items-center">
					<div>
						<p class="text-xs font-bold tracking-wide text-on-surface-muted uppercase">
							{data.exam.unofficial ? 'Unofficial practice exam' : 'Practice exam'}
						</p>
						<h1
							id="lobby-heading"
							class="mt-3 text-4xl font-bold tracking-tight text-balance sm:text-5xl"
						>
							{data.exam.title}
						</h1>
						<p
							class="mt-4 w-full max-w-xl text-lg leading-relaxed text-pretty text-on-surface-muted"
						>
							Take a moment to check the exams details. The timer stays paused until you start.
						</p>
						<Button
							href={attemptHref}
							size="lg"
							class="mt-12 w-full sm:w-auto sm:min-w-50"
							onclick={handleStart}
						>
							Start exam
						</Button>
						<p
							class="mt-12 rounded-r-lg border-l-4 border-primary-accent bg-surface-muted p-3 text-sm leading-relaxed lg:hidden"
						>
							<strong class="font-semibold">Desktop recommended.</strong>
							For conditions closest to the official exam, use a desktop or laptop.
						</p>
					</div>
				</section>

				<!-- Right col (Spans both rows, establishes total height) -->
				<aside
					aria-labelledby="exam-details-heading"
					class="mx-auto flex w-full max-w-lg grow flex-col rounded-lg border-2 border-on-surface-muted bg-surface-accent p-5 lg:col-start-2 lg:row-span-2 lg:max-w-80"
				>
					<h2 id="exam-details-heading" class="text-lg font-bold">Exam details</h2>

					<dl class="mt-3 divide-y divide-on-surface-muted/30 text-sm">
						<div class="flex items-baseline justify-between gap-4 py-2">
							<dt class="text-on-surface-muted">Questions</dt>
							<dd class="font-mono font-semibold">{data.exam.questionCount}</dd>
						</div>
						<div class="flex items-baseline justify-between gap-4 py-2">
							<dt class="text-on-surface-muted">Duration</dt>
							<dd class="font-mono font-semibold">
								{durationMinutes} min{#if extended}<span
										class="ml-1 font-sans text-xs font-normal text-on-surface-muted"
										>(extended)</span
									>{/if}
							</dd>
						</div>
						<div class="flex items-baseline justify-between gap-4 py-2">
							<dt class="text-on-surface-muted">Pass mark</dt>
							<dd class="font-mono font-semibold">{data.exam.passPercent}%</dd>
						</div>
					</dl>

					<h3 class="mt-6 text-xs font-bold tracking-wide uppercase">Tips</h3>
					<ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-on-surface-muted">
						<li>Don't spend too long on one question. Flag it and come back.</li>
						<li>Answer every question. A blank answer is marked wrong.</li>
						<li>Use the full time. Revisit flagged questions before you submit.</li>
						<li>Read all answers before choosing.</li>
					</ul>
				</aside>
			</div>
		{/if}
	</main>
</div>

<style>
	@keyframes countdown-pop {
		from {
			opacity: 0;
			transform: scale(0.8);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.countdown-digit {
		animation: countdown-pop 320ms ease-out;
	}

	@media (prefers-reduced-motion: reduce) {
		.countdown-digit {
			animation: none;
		}
	}
</style>
