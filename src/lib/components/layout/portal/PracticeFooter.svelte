<script lang="ts">
	import { browser } from '$app/env';
	import { beforeNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import type { Exam } from '#lib/domain/types';
	import ExamExitDialog from '#lib/components/layout/portal/ExamExitDialog.svelte';
	import Button from '#lib/components/ui/Buttons.svelte';
	import {
		clearPracticeSession,
		practiceCounts,
		readPracticeSession
	} from '#lib/utils/practice-storage';

	// Icons
	import IconExit from '~icons/oxy/square-arrow-right-exit';

	interface Props {
		exam: Exam;
		/**
		 * `session` ends the session and opens the summary. `summary` restarts
		 * practice instead, because ending a finished session is moo.
		 */
		mode?: 'session' | 'summary';
	}

	let { exam, mode = 'session' }: Props = $props();

	let exitDialogOpen = $state(false);
	let endDialogOpen = $state(false);
	let endChecked = $state(0);
	let endSkipped = $state(0);
	let allowNavigation = false;

	const examHref = $derived(resolve('/portal/[exam]', { exam: exam.slug }));
	const summaryHref = $derived(resolve('/portal/[exam]/practice/summary', { exam: exam.slug }));
	const practiceHref = $derived(resolve('/portal/[exam]/practice', { exam: exam.slug }));

	// Leaving the session should not leave the browser stuck in fullscreen
	onMount(() => {
		return () => {
			if (browser && document.fullscreenElement) {
				void document.exitFullscreen().catch(() => {
					// Ignore if the browser has already left fullscreen
				});
			}
		};
	});

	// Browser Back is Leave practice, not a silent return to the exam page. A
	// confirmed Exit or End session is allowed through. The summary is the end
	// of the flow, so there is nothing left to guard.
	beforeNavigate(({ to, cancel, willUnload }) => {
		if (mode === 'summary' || !browser || willUnload || !to || allowNavigation) return;

		const target = to.route.id ?? '';
		if (target === '/portal/[exam]/practice' || target === '/portal/[exam]/practice/summary') {
			return;
		}

		cancel();
		// Close the Review dialog if it is open before stacking the exit dialog
		window.dispatchEvent(new Event('mocks:practice-exit-request'));
		exitDialogOpen = true;
	});

	async function navigateAway(href: string) {
		allowNavigation = true;

		try {
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- href is built with resolve().
			await goto(href);
		} finally {
			allowNavigation = false;
		}
	}

	function confirmExit() {
		clearPracticeSession(exam.slug);
		void navigateAway(examHref);
	}

	function openEndDialog() {
		const session = readPracticeSession(exam.slug);
		const counts = session
			? practiceCounts(session)
			: { total: 0, checked: 0, correct: 0, wrong: 0, skipped: 0 };

		endChecked = counts.checked;
		endSkipped = counts.skipped;
		endDialogOpen = true;
	}

	function confirmEnd() {
		void navigateAway(summaryHref);
	}

	function practiceAgain() {
		clearPracticeSession(exam.slug);
		void navigateAway(practiceHref);
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
				Leave practice
			</Button>
			<div class="hidden min-w-0 items-center gap-2 sm:flex">
				<span class="h-3 w-0.5 bg-primary-accent"></span>
				<span lang={exam.contentLocale} class="truncate">{exam.title}</span>
			</div>
		</div>

		{#if mode === 'summary'}
			<Button size="sm" type="button" onclick={practiceAgain}>Practice again</Button>
		{:else}
			<Button
				variant="danger"
				size="sm"
				type="button"
				aria-haspopup="dialog"
				onclick={openEndDialog}
			>
				End session
			</Button>
		{/if}
	</div>
</footer>

{#snippet endSummary()}
	<dl class="mt-4 grid min-w-0 grid-cols-2 gap-2">
		<div
			class="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-lg border border-surface-muted bg-light px-3 py-2 sm:flex-col sm:items-start sm:justify-between sm:gap-1"
		>
			<dt
				class="min-w-0 text-xs font-semibold tracking-wide wrap-anywhere text-on-surface-muted uppercase"
			>
				Checked
			</dt>
			<dd class="shrink-0 font-mono text-lg font-bold text-dark tabular-nums">{endChecked}</dd>
		</div>

		<div
			class="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-lg border border-surface-muted bg-light px-3 py-2 sm:flex-col sm:items-start sm:justify-between sm:gap-1"
		>
			<dt
				class="min-w-0 text-xs font-semibold tracking-wide wrap-anywhere text-on-surface-muted uppercase"
			>
				Skipped
			</dt>
			<dd class="shrink-0 font-mono text-lg font-bold text-dark tabular-nums">{endSkipped}</dd>
		</div>
	</dl>
{/snippet}

<ExamExitDialog
	open={exitDialogOpen}
	onOpenChange={(open) => (exitDialogOpen = open)}
	onconfirm={confirmExit}
	title="Leave practice?"
	description="Your practice answers will be cleared and you will return to the exam page."
	confirmLabel="Leave practice"
	cancelLabel="Stay in practice"
/>

{#if mode === 'session'}
	<ExamExitDialog
		open={endDialogOpen}
		onOpenChange={(open) => (endDialogOpen = open)}
		onconfirm={confirmEnd}
		title="End the practice session?"
		description="Unchecked questions count as skipped, not wrong. The summary keeps your session until you leave it."
		content={endSummary}
		confirmLabel="End session"
		cancelLabel="Keep practicing"
	/>
{/if}
