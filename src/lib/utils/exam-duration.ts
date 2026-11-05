/**
 * Pre-start time choice for one exam.
 *
 * Time is the only adjustable exam parameter: the question count, the modules
 * and the pass mark come from the bank and never change from the end-user.
 * The choice is written before the lobby and read once when the attempt is
 * created, so the attempt itself records the limit that was actually shown.
 * Clearing the attempt on Exit also clears this key.
 */
const STORAGE_PREFIX = 'mocks:exam-duration:v1:';

/** Upper bound guards against a corrupted value turning into a week-long timer. */
const MAX_MINUTES = 24 * 60;

/**
 * The multipliers offered on the exam page. 1 is the standard limit defined by
 * the official exam source the rest are extended time. There is no "untimed"
 * option, the timer can be paused for as long as needed, which covers the same
 * need without removing the limit.
 */
export const DURATION_MULTIPLIERS = [1, 1.25, 1.5, 2] as const;

export interface DurationOption {
	multiplier: number;
	minutes: number;
	/** Short name shown on the option card. */
	label: string;
	/** The time added to the standard limit. */
	detail: string;
}

export function buildDurationOptions(baseMinutes: number): DurationOption[] {
	const base = Math.max(1, Math.floor(baseMinutes));

	return DURATION_MULTIPLIERS.map((multiplier) => {
		const minutes = Math.round(base * multiplier);
		const extra = minutes - base;

		return {
			multiplier,
			minutes,
			label: multiplier === 1 ? 'Standard' : `Time x${multiplier}`,
			detail: multiplier === 1 ? `${base} minutes` : `+${extra} minutes`
		};
	});
}

export function examDurationStorageKey(examSlug: string): string {
	return `${STORAGE_PREFIX}${examSlug}`;
}

/** The chosen limit in minutes, or null when nothing valid is stored. */
export function readExamDuration(examSlug: string): number | null {
	if (typeof sessionStorage === 'undefined') return null;

	try {
		const raw = sessionStorage.getItem(examDurationStorageKey(examSlug));
		if (!raw) return null;

		const minutes = Number(raw);
		if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_MINUTES) {
			sessionStorage.removeItem(examDurationStorageKey(examSlug));
			return null;
		}

		return minutes;
	} catch {
		return null;
	}
}

export function writeExamDuration(examSlug: string, minutes: number): void {
	if (typeof sessionStorage === 'undefined') return;

	const value = Math.floor(minutes);
	if (!Number.isInteger(value) || value < 1 || value > MAX_MINUTES) return;

	try {
		sessionStorage.setItem(examDurationStorageKey(examSlug), String(value));
	} catch {
		// Storage can be unavailable, the attempt falls back to the exam default.
	}
}

export function clearExamDuration(examSlug: string): void {
	if (typeof sessionStorage === 'undefined') return;

	try {
		sessionStorage.removeItem(examDurationStorageKey(examSlug));
	} catch {
		// Ignore unavailable storage, there is nothing else to clear.
	}
}
