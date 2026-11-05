<script lang="ts">
	import { browser } from '$app/env';
	import { beforeNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import type { Exam } from '#lib/domain/types';
	import ExamExitDialog from '#lib/components/layout/portal/ExamExitDialog.svelte';
	import Button from '#lib/components/ui/Buttons.svelte';
	import {
		answeredCount,
		clearAttempt,
		flaggedCount,
		readAttempt
	} from '#lib/utils/attempt-storage';
	import { formatTimer } from '#lib/utils/exam-timer';
	import { clearExamTimer, readExamTimer, secondsRemaining } from '#lib/utils/exam-timer-storage';
	import { clearExamDuration } from '#lib/utils/exam-duration';
	// Icons
	import IconExit from '~icons/oxy/square-arrow-right-exit';

	interface Props {
		exam: Exam;
	}

	let { exam }: Props = $props();

	let exitDialogOpen = $state(false);
	let endDialogOpen = $state(false);
	let endRemaining = $state<number | null>(null);
	let endUnanswered = $state(0);
	let endFlagged = $state(0);
	let allowNavigation = false;

	const examHref = $derived(resolve('/portal/[exam]', { exam: exam.slug }));
	const resultsHref = $derived(resolve('/portal/[exam]/results', { exam: exam.slug }));
	const isAttempt = $derived(page.route.id === '/portal/[exam]/start/attempt');

	// Leaving the start flow (Exit, End exam, or a direct navigation) should not
	// leave the browser stuck in fullscreen on the next page.
	// The footer persists between the lobby and the attempt, so this only runs
	// when the flow unmounts.
	onMount(() => {
		return () => {
			if (browser && document.fullscreenElement) {
				void document.exitFullscreen().catch(() => {
					// Ignore if the browser has already left fullscreen.
				});
			}
		};
	});

	// Browser Back is Exit, not a silent return to the lobby
	// The guard runs only on the attempt. Submitting to results and the
	// confirmed Exit are allowed through.
	beforeNavigate(({ to, cancel, willUnload }) => {
		if (!browser || willUnload || !to || allowNavigation || !isAttempt) return;

		const target = to.route.id ?? '';
		if (target === '/portal/[exam]/start/attempt' || target === '/portal/[exam]/results') {
			return;
		}

		cancel();
		// Close the Review dialog if it is open before stacking the exit dialog
		window.dispatchEvent(new Event('mocks:attempt-exit-request'));
		exitDialogOpen = true;
	});

	async function navigateAway(href: string) {
		allowNavigation = true;

		try {
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- href is built with resolve() at the call site.
			await goto(href);
		} finally {
			allowNavigation = false;
		}
	}

	function confirmExit() {
		clearExamTimer(exam.slug);
		clearAttempt(exam.slug);
		clearExamDuration(exam.slug);
		void navigateAway(examHref);
	}

	function openEndDialog() {
		const attempt = readAttempt(exam.slug);
		// The timer was created with the attempt's limit
		const minutes = attempt?.durationMinutes ?? exam.durationMinutes;
		const timer = readExamTimer(exam.slug, minutes * 60);

		endRemaining = timer ? secondsRemaining(timer) : null;
		endUnanswered = attempt ? attempt.questions.length - answeredCount(attempt) : 0;
		endFlagged = attempt ? flaggedCount(attempt) : 0;
		endDialogOpen = true;
	}

	function confirmEnd() {
		clearExamTimer(exam.slug);
		void navigateAway(resultsHref);
	}
</script>

<footer
	class="fixed inset-x-0 bottom-0 z-20 border-t border-on-surface-muted bg-surface-accent px-2 py-1 sm:px-4"
>
	<div class="mx-auto flex w-full max-w-8xl items-center justify-between gap-4">
		<div class="flex min-w-0 items-center gap-2 text-xs font-semibold">
			<Button
				variant="ghost"
				size="sm"
				type="button"
				aria-haspopup="dialog"
				onclick={() => (exitDialogOpen = true)}
			>
				<IconExit class="size-4" aria-hidden="true" />
				Exit exam
			</Button>
			<div class="hidden min-w-0 items-center gap-2 sm:flex">
				<span class="h-3 w-0.5 bg-primary-accent"></span>
				<span lang={exam.contentLocale} class="truncate">{exam.title}</span>
			</div>
		</div>

		{#if isAttempt}
			<Button
				variant="danger"
				size="sm"
				type="button"
				aria-haspopup="dialog"
				onclick={openEndDialog}
			>
				Submit exam
			</Button>
		{/if}
	</div>
</footer>

{#snippet endSummary()}
	<dl class="mt-4 grid min-w-0 gap-2 sm:grid-cols-[1.3fr_1fr_1fr]">
		<div
			class="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-lg border border-surface-muted bg-light px-3 py-2 sm:flex-col sm:items-start sm:justify-between sm:gap-1"
		>
			<dt
				class="min-w-0 text-xs font-semibold tracking-wide wrap-anywhere text-on-surface-muted uppercase"
			>
				Time remaining
			</dt>
			<dd class="shrink-0 font-mono text-lg font-bold text-black tabular-nums">
				{endRemaining === null ? '—' : formatTimer(endRemaining)}
			</dd>
		</div>

		<div
			class="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-lg border border-surface-muted bg-light px-3 py-2 sm:flex-col sm:items-start sm:justify-between sm:gap-1"
		>
			<dt
				class="min-w-0 text-xs font-semibold tracking-wide wrap-anywhere text-on-surface-muted uppercase"
			>
				Unanswered
			</dt>
			<dd class="shrink-0 font-mono text-lg font-bold text-dark tabular-nums">{endUnanswered}</dd>
		</div>

		<div
			class="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-lg border border-surface-muted bg-light px-3 py-2 sm:flex-col sm:items-start sm:justify-between sm:gap-1"
		>
			<dt
				class="min-w-0 text-xs font-semibold tracking-wide wrap-anywhere text-on-surface-muted uppercase"
			>
				Flagged
			</dt>
			<dd class="shrink-0 font-mono text-lg font-bold text-dark tabular-nums">{endFlagged}</dd>
		</div>
	</dl>
{/snippet}

<ExamExitDialog
	open={exitDialogOpen}
	onOpenChange={(open) => (exitDialogOpen = open)}
	onconfirm={confirmExit}
	title="Exit the exam?"
	description="Your answers and the timer for this attempt will be cleared and you will return to the exam page."
	confirmLabel="Exit exam"
	cancelLabel="Stay on exam"
/>

<ExamExitDialog
	open={endDialogOpen}
	onOpenChange={(open) => (endDialogOpen = open)}
	onconfirm={confirmEnd}
	title="Submit exam and see results?"
	description="Answers cannot be changed after you submit."
	content={endSummary}
	confirmLabel="Submit exam"
	cancelLabel="Keep answering"
/>
