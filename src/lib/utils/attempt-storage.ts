import type { AttemptQuestion } from '#lib/domain/types';

/**
 * Ephemeral attempt state for one tab. v0 never persists attempts server-side,
 * this module is the only place the attempt is stored
 */
export interface StoredAttempt {
	examSlug: string;
	startedAt: number;
	/**
	 * The time limit this attempt ran with, in minutes.
	 */
	durationMinutes?: number;
	questions: AttemptQuestion[];
	/** questionId --> selected optionId. Unanswered questions are absent */
	answers: Record<string, string>;
	/** questionId --> true. Unflagged questions are absent */
	flags: Record<string, boolean>;
	currentIndex: number;
}

const KEY_PREFIX = 'mocks:attempt:v1:';

function storageKey(examSlug: string) {
	return `${KEY_PREFIX}${examSlug}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isQuestion(value: unknown): value is AttemptQuestion {
	if (typeof value !== 'object' || value === null) return false;
	const question = value as Partial<AttemptQuestion>;
	return (
		typeof question.id === 'string' &&
		typeof question.moduleId === 'string' &&
		typeof question.stem === 'string' &&
		Array.isArray(question.options) &&
		question.options.length > 0 &&
		question.options.every(
			(option) => typeof option?.id === 'string' && typeof option?.text === 'string'
		)
	);
}

export function createAttempt(
	examSlug: string,
	questions: AttemptQuestion[],
	durationMinutes: number
): StoredAttempt {
	return {
		examSlug,
		startedAt: Date.now(),
		durationMinutes,
		questions,
		answers: {},
		flags: {},
		currentIndex: 0
	};
}

export function readAttempt(examSlug: string): StoredAttempt | null {
	if (typeof sessionStorage === 'undefined') return null;

	try {
		const raw = sessionStorage.getItem(storageKey(examSlug));
		if (!raw) return null;

		const parsed = JSON.parse(raw) as Partial<StoredAttempt>;
		if (
			parsed.examSlug !== examSlug ||
			!Array.isArray(parsed.questions) ||
			parsed.questions.length === 0 ||
			!parsed.questions.every(isQuestion)
		) {
			sessionStorage.removeItem(storageKey(examSlug));
			return null;
		}

		const questions = parsed.questions;
		const rawIndex = parsed.currentIndex;
		const currentIndex =
			typeof rawIndex === 'number' && Number.isInteger(rawIndex)
				? Math.min(Math.max(rawIndex, 0), questions.length - 1)
				: 0;

		const answers = isRecord(parsed.answers)
			? Object.fromEntries(
					Object.entries(parsed.answers).filter(
						([questionId, optionId]) =>
							typeof optionId === 'string' &&
							questions.some(
								(question) =>
									question.id === questionId &&
									question.options.some((option) => option.id === optionId)
							)
					)
				)
			: {};

		const flags = isRecord(parsed.flags)
			? Object.fromEntries(
					Object.entries(parsed.flags).filter(
						([questionId, flagged]) =>
							flagged === true && questions.some((question) => question.id === questionId)
					)
				)
			: {};

		const durationMinutes =
			typeof parsed.durationMinutes === 'number' &&
			Number.isInteger(parsed.durationMinutes) &&
			parsed.durationMinutes > 0
				? parsed.durationMinutes
				: undefined;

		return {
			examSlug,
			startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : Date.now(),
			durationMinutes,
			questions,
			answers,
			flags,
			currentIndex
		};
	} catch {
		sessionStorage.removeItem(storageKey(examSlug));
		return null;
	}
}

export function writeAttempt(attempt: StoredAttempt): void {
	if (typeof sessionStorage === 'undefined') return;

	try {
		sessionStorage.setItem(storageKey(attempt.examSlug), JSON.stringify(attempt));
	} catch {
		// Quota or privacy-mode failure: the attempt continues in memory only
	}
}

export function clearAttempt(examSlug: string): void {
	if (typeof sessionStorage === 'undefined') return;

	try {
		sessionStorage.removeItem(storageKey(examSlug));
	} catch {
		// Ignore storage failures
	}
}

export function answeredCount(attempt: StoredAttempt): number {
	return Object.keys(attempt.answers).length;
}

export function flaggedCount(attempt: StoredAttempt): number {
	return Object.values(attempt.flags).filter(Boolean).length;
}
