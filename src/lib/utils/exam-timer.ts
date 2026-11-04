export const MINUTE_SECONDS = 60;
export const HALF_HOUR_SECONDS = 30 * MINUTE_SECONDS;

const FINAL_MILESTONE_SECONDS = [10 * MINUTE_SECONDS, 5 * MINUTE_SECONDS, MINUTE_SECONDS] as const;
const FINAL_MILESTONE_SET = new Set<number>([...FINAL_MILESTONE_SECONDS, 0]);

export type TimerAnnouncementPriority = 'polite' | 'assertive';

export interface TimerMilestone {
	seconds: number;
	priority: TimerAnnouncementPriority;
}

export interface DueTimerAnnouncement {
	milestone: TimerMilestone | null;
	acknowledged: number[];
}

/**
 * Builds the announcement points for a session. Initial time is announced
 * separately.
 * Here is covered half-hour marks and the final ten minutes.
 */
export function buildTimerMilestones(durationSeconds: number): TimerMilestone[] {
	const duration = Math.max(0, Math.floor(durationSeconds));
	const milestones = new Map<number, TimerMilestone>();

	for (let elapsed = HALF_HOUR_SECONDS; elapsed < duration; elapsed += HALF_HOUR_SECONDS) {
		const remaining = duration - elapsed;
		milestones.set(remaining, { seconds: remaining, priority: 'polite' });
	}

	for (const seconds of FINAL_MILESTONE_SECONDS) {
		if (seconds < duration) {
			milestones.set(seconds, {
				seconds,
				priority: seconds === MINUTE_SECONDS ? 'assertive' : 'polite'
			});
		}
	}

	milestones.set(0, { seconds: 0, priority: 'assertive' });

	return [...milestones.values()].sort((a, b) => b.seconds - a.seconds);
}

/** Quiet mode (hidden timer) keeps only the final 10/5/1 warnings and time-up */
export function isMilestoneAudible(seconds: number, quiet: boolean): boolean {
	return !quiet || FINAL_MILESTONE_SET.has(seconds);
}

/**
 * Finds milestones crossed since the previous tick. Only the most urgent audible
 * milestone is returned, while all crossed milestones are acknowledged
 */
export function getDueAnnouncement(
	previousSeconds: number,
	remainingSeconds: number,
	milestones: readonly TimerMilestone[],
	acknowledged: ReadonlySet<number>,
	quiet: boolean
): DueTimerAnnouncement {
	const previous = Math.max(0, Math.floor(previousSeconds));
	const remaining = Math.max(0, Math.floor(remainingSeconds));
	const crossed = milestones.filter(
		(milestone) =>
			milestone.seconds < previous &&
			milestone.seconds >= remaining &&
			!acknowledged.has(milestone.seconds)
	);

	if (crossed.length === 0) {
		return { milestone: null, acknowledged: [] };
	}

	const audible = crossed.filter((milestone) => isMilestoneAudible(milestone.seconds, quiet));
	const milestone =
		audible.length > 0
			? audible.reduce((mostUrgent, candidate) =>
					candidate.seconds < mostUrgent.seconds ? candidate : mostUrgent
				)
			: null;

	return {
		milestone,
		acknowledged: crossed.map((item) => item.seconds)
	};
}

export function formatTimer(totalSeconds: number): string {
	const safeSeconds = Math.max(0, Math.floor(totalSeconds));
	const hours = Math.floor(safeSeconds / 3600);
	const minutes = Math.floor((safeSeconds % 3600) / 60);
	const seconds = safeSeconds % 60;

	if (hours > 0) {
		return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}

	return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const unitFormatters = new Map<string, Intl.NumberFormat>();
const listFormatters = new Map<string, Intl.ListFormat>();

function unitFormatter(locale: string, unit: Intl.NumberFormatOptions['unit']) {
	const key = `${locale}:${unit}`;
	let formatter = unitFormatters.get(key);

	if (!formatter) {
		formatter = new Intl.NumberFormat(locale, {
			style: 'unit',
			unit,
			unitDisplay: 'long',
			maximumFractionDigits: 0
		});
		unitFormatters.set(key, formatter);
	}

	return formatter;
}

function listFormatter(locale: string) {
	let formatter = listFormatters.get(locale);

	if (!formatter) {
		formatter = new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' });
		listFormatters.set(locale, formatter);
	}

	return formatter;
}

/** Human-readable time for screen readers, e.g "2 hours" or "1 minute". */
export function formatSpokenTimer(totalSeconds: number, locale = 'en'): string {
	const safeSeconds = Math.max(0, Math.floor(totalSeconds));
	const hours = Math.floor(safeSeconds / 3600);
	const minutes = Math.floor((safeSeconds % 3600) / 60);
	const seconds = safeSeconds % 60;
	const parts: string[] = [];

	if (hours > 0) parts.push(unitFormatter(locale, 'hour').format(hours));
	if (minutes > 0) parts.push(unitFormatter(locale, 'minute').format(minutes));
	if (seconds > 0 || parts.length === 0) {
		parts.push(unitFormatter(locale, 'second').format(seconds));
	}

	return listFormatter(locale).format(parts);
}
