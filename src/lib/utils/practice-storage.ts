import type { PracticeOption, PracticeQuestion } from '#lib/domain/types';

/**
 * Ephemeral practice state for one tab. Practice is client-side only in v0, like
 * the exam (ADR-018, ADR-027). `answers` holds checked answers only: a
 * selection that was never checked is not an answer and counts as skipped
 * (ADR-043)
 */
export interface StoredPracticeSession {
	examSlug: string;
	startedAt: number;
	questions: PracticeQuestion[];
	/** questionId --> committed optionId. Unchecked questions are absent */
	answers: Record<string, string>;
	currentIndex: number;
}

export interface PracticeCounts {
	total: number;
	checked: number;
	correct: number;
	wrong: number;
	skipped: number;
}

const KEY_PREFIX = 'mocks:practice:v1:';

function storageKey(examSlug: string) {
	return `${KEY_PREFIX}${examSlug}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPracticeOption(value: unknown): value is PracticeOption {
	if (typeof value !== 'object' || value === null) return false;
	const option = value as Partial<PracticeOption>;
	return (
		typeof option.id === 'string' &&
		typeof option.text === 'string' &&
		typeof option.shortLabel === 'string' &&
		typeof option.rationale === 'string' &&
		typeof option.isCorrect === 'boolean'
	);
}

function isPracticeQuestion(value: unknown): value is PracticeQuestion {
	if (typeof value !== 'object' || value === null) return false;
	const question = value as Partial<PracticeQuestion>;
	return (
		typeof question.id === 'string' &&
		typeof question.moduleId === 'string' &&
		typeof question.stem === 'string' &&
		typeof question.explanation === 'string' &&
		Array.isArray(question.references) &&
		Array.isArray(question.options) &&
		question.options.length >= 2 &&
		question.options.every(isPracticeOption)
	);
}

export function createPracticeSession(
	examSlug: string,
	questions: PracticeQuestion[]
): StoredPracticeSession {
	return {
		examSlug,
		startedAt: Date.now(),
		questions,
		answers: {},
		currentIndex: 0
	};
}

export function readPracticeSession(examSlug: string): StoredPracticeSession | null {
	if (typeof sessionStorage === 'undefined') return null;

	try {
		const raw = sessionStorage.getItem(storageKey(examSlug));
		if (!raw) return null;

		const parsed = JSON.parse(raw) as Partial<StoredPracticeSession>;
		if (
			parsed.examSlug !== examSlug ||
			!Array.isArray(parsed.questions) ||
			parsed.questions.length === 0 ||
			!parsed.questions.every(isPracticeQuestion)
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

		return {
			examSlug,
			startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : Date.now(),
			questions,
			answers,
			currentIndex
		};
	} catch {
		sessionStorage.removeItem(storageKey(examSlug));
		return null;
	}
}

export function writePracticeSession(session: StoredPracticeSession): void {
	if (typeof sessionStorage === 'undefined') return;

	try {
		sessionStorage.setItem(storageKey(session.examSlug), JSON.stringify(session));
	} catch {
		// Quota or privacy-mode failure: the session continues in memory only
	}
}

export function clearPracticeSession(examSlug: string): void {
	if (typeof sessionStorage === 'undefined') return;

	try {
		sessionStorage.removeItem(storageKey(examSlug));
	} catch {
		// Ignore storage failures
	}
}

export function checkedAnswer(session: StoredPracticeSession, questionId: string): string | null {
	return session.answers[questionId] ?? null;
}

export function correctOption(question: PracticeQuestion): PracticeOption | null {
	return question.options.find((option) => option.isCorrect) ?? null;
}

/**
 * Correct, wrong, and skipped totals. Skipped is not wrong (ADR-029) a
 * question that was never checked stays unanswered
 */
export function practiceCounts(session: StoredPracticeSession): PracticeCounts {
	let correct = 0;

	for (const question of session.questions) {
		const selectedOptionId = session.answers[question.id];
		if (!selectedOptionId) continue;

		const option = question.options.find((candidate) => candidate.id === selectedOptionId);
		if (option?.isCorrect) correct += 1;
	}

	const checked = Object.keys(session.answers).length;

	return {
		total: session.questions.length,
		checked,
		correct,
		wrong: checked - correct,
		skipped: session.questions.length - checked
	};
}
