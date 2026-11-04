/**
 * Temporary client-side exam timer persistence.
 *
 * TODO(attempt): sessionStorage is a UI-prototyping shortcut. When the attempt
 * model moves to D1, this must be replaced with a server-issued attempt deadline
 * and enforce it on submission. Until then, the timer is per-tab only, can be
 * cleared by the user, and cannot survive closing the tab.
 */

const STORAGE_PREFIX = 'mocks:exam-timer:v2';
const FUTURE_TOLERANCE_MS = 60_000;

export interface StoredExamTimer {
	startedAt: number;
	durationSeconds: number;
	/** Last known remaining seconds. Authoritative while paused, a fallback while running. */
	remainingSeconds: number;
	/** Null while paused */
	deadline: number | null;
	paused: boolean;
	pausedAt: number | null;
	/** Total time spent paused, in milliseconds */
	pausedMs: number;
	collapsed: boolean;
}

export function examTimerStorageKey(examSlug: string): string {
	return `${STORAGE_PREFIX}:${examSlug}`;
}

export function createExamTimer(durationSeconds: number, now = Date.now()): StoredExamTimer {
	const duration = Math.max(0, Math.floor(durationSeconds));

	return {
		startedAt: now,
		durationSeconds: duration,
		remainingSeconds: duration,
		deadline: now + duration * 1000,
		paused: false,
		pausedAt: null,
		pausedMs: 0,
		collapsed: false
	};
}

/** Remaining seconds, rounded up so the last second is shown as 0:01, not 0:00 */
export function secondsRemaining(timer: StoredExamTimer, now = Date.now()): number {
	if (timer.paused || timer.deadline === null) {
		return Math.max(0, Math.floor(timer.remainingSeconds));
	}

	return Math.max(0, Math.ceil((timer.deadline - now) / 1000));
}

export function pauseExamTimer(timer: StoredExamTimer, now = Date.now()): StoredExamTimer {
	if (timer.paused) return timer;

	return {
		...timer,
		remainingSeconds: secondsRemaining(timer, now),
		deadline: null,
		paused: true,
		pausedAt: now
	};
}

export function resumeExamTimer(timer: StoredExamTimer, now = Date.now()): StoredExamTimer {
	if (!timer.paused) return timer;

	const pausedAt = timer.pausedAt ?? now;

	return {
		...timer,
		deadline: now + Math.max(0, Math.floor(timer.remainingSeconds)) * 1000,
		paused: false,
		pausedAt: null,
		pausedMs: timer.pausedMs + Math.max(0, now - pausedAt)
	};
}

export function parseStoredExamTimer(
	raw: string | null,
	durationSeconds: number,
	now = Date.now()
): StoredExamTimer | null {
	if (!raw) return null;

	let value: unknown;
	try {
		value = JSON.parse(raw);
	} catch {
		return null;
	}

	if (!value || typeof value !== 'object') return null;

	const candidate = value as Partial<StoredExamTimer>;
	const duration = Math.max(0, Math.floor(durationSeconds));

	if (
		typeof candidate.startedAt !== 'number' ||
		!Number.isFinite(candidate.startedAt) ||
		candidate.startedAt > now + FUTURE_TOLERANCE_MS ||
		candidate.durationSeconds !== duration ||
		typeof candidate.remainingSeconds !== 'number' ||
		!Number.isFinite(candidate.remainingSeconds) ||
		candidate.remainingSeconds < 0 ||
		candidate.remainingSeconds > duration ||
		typeof candidate.paused !== 'boolean' ||
		typeof candidate.pausedMs !== 'number' ||
		!Number.isFinite(candidate.pausedMs) ||
		candidate.pausedMs < 0 ||
		typeof candidate.collapsed !== 'boolean'
	) {
		return null;
	}

	if (candidate.paused) {
		if (candidate.deadline !== null) return null;
		if (typeof candidate.pausedAt !== 'number' || !Number.isFinite(candidate.pausedAt)) return null;
	} else {
		if (typeof candidate.deadline !== 'number' || !Number.isFinite(candidate.deadline)) return null;
		if (candidate.deadline > now + duration * 1000 + FUTURE_TOLERANCE_MS) return null;
		if (candidate.pausedAt !== null) return null;
	}

	return {
		startedAt: candidate.startedAt,
		durationSeconds: duration,
		remainingSeconds: Math.floor(candidate.remainingSeconds),
		deadline: candidate.deadline,
		paused: candidate.paused,
		pausedAt: candidate.pausedAt ?? null,
		pausedMs: candidate.pausedMs,
		collapsed: candidate.collapsed
	};
}

export function readExamTimer(
	examSlug: string,
	durationSeconds: number,
	now = Date.now()
): StoredExamTimer | null {
	if (typeof window === 'undefined') return null;

	try {
		const raw = window.sessionStorage.getItem(examTimerStorageKey(examSlug));
		return parseStoredExamTimer(raw, durationSeconds, now);
	} catch {
		return null;
	}
}

export function writeExamTimer(examSlug: string, timer: StoredExamTimer): void {
	if (typeof window === 'undefined') return;

	try {
		window.sessionStorage.setItem(examTimerStorageKey(examSlug), JSON.stringify(timer));
	} catch {
		// Storage can be unavailable or full, the in-memory timer still works.
	}
}

export function clearExamTimer(examSlug: string): void {
	if (typeof window === 'undefined') return;

	try {
		window.sessionStorage.removeItem(examTimerStorageKey(examSlug));
	} catch {
		// Ignore unavailable storage, there is nothing else to clear
	}
}
