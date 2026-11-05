<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { DropdownMenu } from 'bits-ui';
	import Button from '#lib/components/ui/Buttons.svelte';
	import Tooltip from '#lib/components/ui/Tooltip.svelte';

	import {
		buildTimerMilestones,
		formatSpokenTimer,
		formatTimer,
		getDueAnnouncement,
		type TimerAnnouncementPriority,
		type TimerMilestone
	} from '#lib/utils/exam-timer';
	import {
		createExamTimer,
		pauseExamTimer,
		readExamTimer,
		resumeExamTimer,
		secondsRemaining,
		writeExamTimer,
		type StoredExamTimer
	} from '#lib/utils/exam-timer-storage';

	// Icons
	import IconTime from '~icons/oxy/clock-fading';
	import IconTimeMenu from '~icons/oxy/ellipsis-vertical';

	interface Props {
		durationMinutes: number;
		examSlug: string;
		/**
		 * The lobby shows the real controls with a paused display, the attempt
		 * starts the countdown
		 */
		running?: boolean;
		onTimeUp?: () => void;
	}

	let { durationMinutes, examSlug, running = false, onTimeUp }: Props = $props();
	const uid = $props.id();
	const timerTimeId = `${uid}-timer-time`;
	const timerModeId = `${uid}-timer-mode`;

	let durationSeconds = $derived(Math.max(0, Math.floor(durationMinutes * 60)));
	let milestones = $derived(buildTimerMilestones(durationSeconds));

	let remainingSeconds = $state(0);
	let accessibleRemaining = $state(0);
	let previousSeconds = 0;
	let deadline: number | null = null;
	let started = $state(false);
	let paused = $state(false);
	let collapsed = $state(false);
	let timerButtonFocused = false;
	let politeAnnouncement = $state('');
	let assertiveAnnouncement = $state('');
	let pendingAnnouncement: {
		text: string;
		priority: TimerAnnouncementPriority;
	} | null = null;

	const acknowledged = new SvelteSet<number>();
	let intervalId: number | undefined;
	let announcementVersion = 0;
	let storedTimer: StoredExamTimer | null = null;
	let timeUpNotified = false;

	let displaySeconds = $derived(started ? remainingSeconds : durationSeconds);
	let accessibleSeconds = $derived(started ? accessibleRemaining : durationSeconds);
	let displayTime = $derived(formatTimer(displaySeconds));

	let timerAction = $derived(collapsed ? 'Show remaining time' : 'Hide remaining time');
	let timerModeDescription = $derived(
		!started
			? 'Timer paused. It starts when the attempt begins. Pausing is available during the exam.'
			: [
					paused ? 'Timer paused.' : '',
					collapsed
						? 'Half-hour timer announcements are off while the timer is hidden. The final 10, 5, and 1 minute warnings and time-up are still announced.'
						: 'Half-hour timer announcements are on.'
				]
					.filter(Boolean)
					.join(' ')
	);

	function describedBy(tooltipId: unknown) {
		const ids = [timerTimeId, timerModeId];
		if (typeof tooltipId === 'string' && tooltipId) ids.push(tooltipId);
		return ids.join(' ');
	}

	function announcementText(milestone: TimerMilestone): string | null {
		if (milestone.seconds === 0) return 'Time is up.';
		return `${formatSpokenTimer(milestone.seconds)} remaining.`;
	}

	function deliverAnnouncement(text: string, priority: TimerAnnouncementPriority) {
		announcementVersion += 1;

		if (priority === 'assertive') {
			assertiveAnnouncement = text;
			politeAnnouncement = '';
			return;
		}

		politeAnnouncement = text;
	}

	function queueAnnouncement(text: string, priority: TimerAnnouncementPriority) {
		if (document.hidden) {
			if (pendingAnnouncement?.priority === 'assertive' && priority === 'polite') return;
			pendingAnnouncement = { text, priority };
			return;
		}

		deliverAnnouncement(text, priority);
	}

	function announce(milestone: TimerMilestone) {
		const text = announcementText(milestone);
		if (text) queueAnnouncement(text, milestone.priority);
	}

	function startInterval() {
		if (intervalId !== undefined) return;
		intervalId = window.setInterval(tick, 250);
	}

	function stopInterval() {
		if (intervalId === undefined) return;
		window.clearInterval(intervalId);
		intervalId = undefined;
	}

	function tick() {
		if (!started || paused || deadline === null) return;

		const nextSeconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

		if (nextSeconds === previousSeconds) {
			stopAtZero(nextSeconds);
			return;
		}

		const due = getDueAnnouncement(
			previousSeconds,
			nextSeconds,
			milestones,
			acknowledged,
			collapsed
		);

		for (const seconds of due.acknowledged) acknowledged.add(seconds);
		if (due.milestone) announce(due.milestone);

		previousSeconds = nextSeconds;
		remainingSeconds = nextSeconds;
		if (!timerButtonFocused || nextSeconds === 0) accessibleRemaining = nextSeconds;

		stopAtZero(nextSeconds);
	}

	function stopAtZero(seconds: number) {
		if (seconds !== 0 || timeUpNotified) return;
		timeUpNotified = true;
		stopInterval();
		onTimeUp?.();
	}

	function resumeTimer() {
		if (!started || paused || document.hidden) return;

		const pending = pendingAnnouncement;
		pendingAnnouncement = null;
		const version = announcementVersion;

		tick();
		if (timerButtonFocused) accessibleRemaining = remainingSeconds;

		if (pending && version === announcementVersion) {
			deliverAnnouncement(pending.text, pending.priority);
		}
	}

	function handleVisibilityChange() {
		if (!document.hidden) resumeTimer();
	}

	function handleFocus() {
		resumeTimer();
	}

	function handleTimerFocus() {
		accessibleRemaining = remainingSeconds;
		timerButtonFocused = true;
	}

	function handleTimerBlur() {
		timerButtonFocused = false;
		accessibleRemaining = remainingSeconds;
	}

	function pause() {
		if (!started || paused || !storedTimer) return;

		storedTimer = pauseExamTimer(storedTimer);
		remainingSeconds = storedTimer.remainingSeconds;
		accessibleRemaining = remainingSeconds;
		deadline = null;
		paused = true;
		pendingAnnouncement = null;
		stopInterval();
		writeExamTimer(examSlug, storedTimer);
		queueAnnouncement(
			`Exam timer paused. ${formatSpokenTimer(remainingSeconds)} remaining.`,
			'polite'
		);
	}

	function resume() {
		if (!started || !paused || !storedTimer) return;

		storedTimer = resumeExamTimer(storedTimer);
		remainingSeconds = storedTimer.remainingSeconds;
		accessibleRemaining = remainingSeconds;
		deadline = storedTimer.deadline;
		paused = false;
		previousSeconds = remainingSeconds;
		writeExamTimer(examSlug, storedTimer);
		startInterval();
		queueAnnouncement(
			`Exam timer resumed. ${formatSpokenTimer(remainingSeconds)} remaining.`,
			'polite'
		);
	}

	function togglePaused() {
		if (paused) {
			resume();
		} else {
			pause();
		}
	}

	function toggleCollapsed() {
		collapsed = !collapsed;

		if (storedTimer) {
			storedTimer = { ...storedTimer, collapsed };
			writeExamTimer(examSlug, storedTimer);
		}

		const message = !running
			? collapsed
				? 'Timer hidden. It will be visible when the exam starts.'
				: 'Timer shown.'
			: collapsed
				? 'Timer hidden. Half-hour announcements are off; the final warnings remain.'
				: 'Timer shown. Half-hour announcements are on.';

		queueAnnouncement(message, 'polite');
	}

	onMount(() => {
		if (!running) {
			// Lobby shows the configured duration without starting the countdown.
			started = false;
			paused = true;
			remainingSeconds = durationSeconds;
			accessibleRemaining = durationSeconds;
			previousSeconds = durationSeconds;
			return;
		}

		const now = Date.now();
		const restored = readExamTimer(examSlug, durationSeconds, now);
		const timer = restored ?? createExamTimer(durationSeconds, now);

		// TODO(attempt): sessionStorage is temporary UI-prototype persistence.
		// Replace this with a server-issued D1 attempt deadline before launch.
		storedTimer = timer;
		if (!restored) writeExamTimer(examSlug, timer);

		collapsed = timer.collapsed;
		paused = timer.paused;
		deadline = timer.deadline;
		started = true;

		const initialSeconds = secondsRemaining(timer, now);
		remainingSeconds = initialSeconds;
		accessibleRemaining = initialSeconds;
		previousSeconds = initialSeconds;

		if (initialSeconds === 0) {
			timeUpNotified = true;
			queueAnnouncement('Time is up.', 'assertive');
			onTimeUp?.();
			return;
		}

		if (paused) {
			queueAnnouncement(
				`Exam timer paused. ${formatSpokenTimer(initialSeconds)} remaining.`,
				'polite'
			);
			return;
		}

		queueAnnouncement(
			`Exam timer ${restored ? 'resumed' : 'started'}. ${formatSpokenTimer(initialSeconds)} remaining.`,
			'polite'
		);

		startInterval();
		tick();

		return () => stopInterval();
	});
</script>

<svelte:window onfocus={handleFocus} />
<svelte:document onvisibilitychange={handleVisibilityChange} />

<div class="flex items-center gap-0">
	<div
		role="group"
		aria-label="Exam timer"
		class="relative inline-flex items-center rounded border-2 border-transparent text-on-surface transition-colors hover:border-on-surface-muted"
	>
		<span
			class={collapsed
				? 'pointer-events-none flex size-9 items-center justify-center'
				: 'pointer-events-none flex min-h-9 items-center gap-1.5 px-1 py-1 sm:px-2'}
			aria-hidden="true"
		>
			<IconTime class="hidden size-4 shrink-0 sm:block" aria-hidden="true" />
			{#if !collapsed}
				<span class="font-mono text-sm font-semibold tabular-nums">{displayTime}</span>
				{#if !started || paused}
					<span class="text-[11px] font-medium tracking-wide text-dark uppercase">(Paused)</span>
				{/if}
			{/if}
		</span>
		<span
			id={timerTimeId}
			role="timer"
			aria-live="off"
			aria-atomic="true"
			class="pointer-events-none sr-only"
		>
			{!started || paused ? 'Timer paused at' : 'Time remaining:'}
			{formatSpokenTimer(accessibleSeconds)}
		</span>
		<span id={timerModeId} class="pointer-events-none sr-only">{timerModeDescription}</span>

		<Tooltip text={timerAction} side="bottom">
			{#snippet trigger({ props })}
				<Button
					{...props}
					type="button"
					variant="ghost"
					size="sm"
					class="absolute inset-0 h-full w-full rounded border-0 bg-transparent px-0 py-0 hover:bg-transparent hover:shadow-none"
					aria-label={timerAction}
					aria-describedby={describedBy(props['aria-describedby'])}
					onfocusin={handleTimerFocus}
					onfocusout={handleTimerBlur}
					onclick={(event) => {
						if (typeof props.onclick === 'function') props.onclick(event);
						toggleCollapsed();
					}}
				></Button>
			{/snippet}
		</Tooltip>
	</div>

	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} type="button" variant="ghost" size="icon" aria-label="Timer options">
					<IconTimeMenu class="size-4" aria-hidden="true" />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Portal>
			<DropdownMenu.Content
				align="end"
				sideOffset={6}
				class="oxy-focus z-50 min-w-48 rounded-lg border border-on-surface-muted bg-surface-accent p-1 text-sm shadow-md"
			>
				<DropdownMenu.Item
					class="oxy-focus flex cursor-pointer items-center rounded px-2 py-2 font-medium outline-none select-none data-disabled:cursor-not-allowed data-disabled:opacity-60 data-highlighted:bg-surface-muted"
					disabled={!running || remainingSeconds === 0}
					onSelect={togglePaused}
				>
					{#if !running}
						Paused timer
					{:else if paused}
						Resume timer
					{:else}
						Pause timer
					{/if}
				</DropdownMenu.Item>
				<DropdownMenu.Item
					class="oxy-focus flex cursor-pointer items-center rounded-md px-2 py-2 font-medium outline-none select-none data-highlighted:bg-surface-muted"
					onSelect={toggleCollapsed}
				>
					{collapsed ? 'Show timer' : 'Hide timer'}
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Portal>
	</DropdownMenu.Root>

	<div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
		{politeAnnouncement}
	</div>
	<div class="sr-only" role="alert" aria-atomic="true">{assertiveAnnouncement}</div>
</div>
