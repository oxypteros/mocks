import type { AttemptResult, ModuleResult, Reference, ResultOption, Exam } from '#lib/domain/types';
import type { StoredAttempt } from './attempt-storage';

/**
 * Turns a scored attempt into the shape the results page renders.
 *
 * `scoreAttempt()` returns questions in submission order but options in
 * authoring order, while the attempt showed a shuffled option order. The view
 * therefore re-orders options by the stored attempt and maps them by option ID,
 * never by index (ADR-039).
 */
export type ResultQuestionStatus = 'correct' | 'incorrect' | 'unanswered';

export type ResultsFilter = 'all' | 'correct' | 'wrong';

export interface ResultsOptionView extends ResultOption {
	/** 1-based position as shown during the attempt. */
	number: number;
	selected: boolean;
}

export interface ResultsQuestionView {
	id: string;
	/** 1-based position as shown during the attempt. */
	number: number;
	moduleId: string;
	moduleTitle: string;
	stem: string;
	explanation: string;
	status: ResultQuestionStatus;
	correct: boolean;
	selectedOptionId: string | null;
	correctOptionId: string;
	selectedShortLabel: string | null;
	correctShortLabel: string;
	options: ResultsOptionView[];
	references: Reference[];
}

export interface ResultsModuleView extends ModuleResult {
	/** Rounded percent correct, used for both the label and the bar width */
	percent: number;
}

export interface ResultsView {
	exam: Exam;
	/** The time limit the attempt ran with, or null for attempts stored before ADR-041 */
	durationMinutes: number | null;
	correctCount: number;
	questionCount: number;
	scorePercent: number;
	passed: boolean;
	passPercent: number;
	modules: ResultsModuleView[];
	questions: ResultsQuestionView[];
	/** Correct and wrong counts wrong includes unanswered (ADR-039) */
	counts: { correct: number; wrong: number };
}

function modulePercent(module: ModuleResult): number {
	if (module.questionCount === 0) return 0;
	return Math.round((module.correctCount / module.questionCount) * 100);
}

export function buildResultsView(attempt: StoredAttempt, result: AttemptResult): ResultsView {
	if (result.questions.length !== attempt.questions.length) {
		throw new Error(
			`Expected ${attempt.questions.length} scored questions, received ${result.questions.length}`
		);
	}

	const scoredById = new Map(result.questions.map((question) => [question.id, question]));
	const moduleTitles = new Map(result.modules.map((module) => [module.moduleId, module.title]));

	const questions = attempt.questions.map((shown, index): ResultsQuestionView => {
		const scored = scoredById.get(shown.id);
		if (!scored) {
			throw new Error(`Question ${shown.id} is missing from the scored result`);
		}

		const optionsById = new Map(scored.options.map((option) => [option.id, option]));
		const options = shown.options.map((shownOption, optionIndex): ResultsOptionView => {
			const option = optionsById.get(shownOption.id);
			if (!option) {
				throw new Error(`Option ${shownOption.id} is missing from question ${shown.id}`);
			}

			return {
				...option,
				number: optionIndex + 1,
				selected: scored.selectedOptionId === shownOption.id
			};
		});

		const selected = options.find((option) => option.selected);
		const correctOption = options.find((option) => option.isCorrect);
		if (!correctOption) {
			throw new Error(`Question ${shown.id} has no correct option in the scored result`);
		}

		const status: ResultQuestionStatus =
			scored.selectedOptionId === null ? 'unanswered' : scored.correct ? 'correct' : 'incorrect';

		return {
			id: shown.id,
			number: index + 1,
			moduleId: shown.moduleId,
			moduleTitle: moduleTitles.get(shown.moduleId) ?? shown.moduleId,
			stem: scored.stem,
			explanation: scored.explanation,
			status,
			correct: scored.correct,
			selectedOptionId: scored.selectedOptionId,
			correctOptionId: scored.correctOptionId,
			selectedShortLabel: selected?.shortLabel ?? null,
			correctShortLabel: correctOption.shortLabel,
			options,
			references: scored.references
		};
	});

	const correctCount = questions.filter((question) => question.status === 'correct').length;

	return {
		exam: result.exam,
		durationMinutes: attempt.durationMinutes ?? null,
		correctCount: result.correctCount,
		questionCount: result.questionCount,
		scorePercent: result.scorePercent,
		passed: result.passed,
		passPercent: result.exam.passPercent,
		modules: result.modules.map((module) => ({
			...module,
			percent: modulePercent(module)
		})),
		questions,
		counts: {
			correct: correctCount,
			wrong: questions.length - correctCount
		}
	};
}

/** Wrong groups incorrect and unanswered questions together. */
export function filterQuestions(
	questions: ResultsQuestionView[],
	filter: ResultsFilter
): ResultsQuestionView[] {
	if (filter === 'all') return questions;
	if (filter === 'correct') return questions.filter((question) => question.status === 'correct');
	return questions.filter((question) => question.status !== 'correct');
}
