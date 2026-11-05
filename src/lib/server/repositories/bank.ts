import type {
	AttemptPayload,
	AttemptResult,
	BankKind,
	Exam,
	ExamSummary,
	PracticePayload,
	SampleQuestion,
	SubmittedAnswer
} from '../../domain/types';

/**
 * The only data boundary templates use. Implementations return domain objects,
 * never Drizzle rows or fixture modules.
 */
export interface BankRepository {
	listExams(): Promise<ExamSummary[]>;
	getExam(slug: string): Promise<Exam | null>;
	/**
	 * A published question for marketing pages. Pass the currently shown ID to
	 * prefer a different question, when the bank has only one question, that
	 * question is returned again.
	 *
	 * Pass `bankKind` to draw from a specific bank (for example `practice`).
	 * When that bank is missing or empty, the exam's active bank is used.
	 */
	getSampleQuestion(
		slug: string,
		excludeQuestionId?: string,
		bankKind?: BankKind
	): Promise<SampleQuestion | null>;
	drawAttempt(slug: string): Promise<AttemptPayload>;
	/**
	 * Draws a practice session from the exam's practice bank: 20 random published
	 * questions, or all of them when the bank is smaller. The payload carries
	 * correctness and feedback so checking an answer needs no request (ADR-029).
	 *
	 * There is deliberately no falback to the exam bank, a missing practice bank
	 * is `BankNotReadyError`, not a session over exam questions
	 */
	drawPracticeSession(slug: string): Promise<PracticePayload>;
	scoreAttempt(slug: string, answers: SubmittedAnswer[]): Promise<AttemptResult>;
}

export class ExamNotFoundError extends Error {
	constructor(slug: string) {
		super(`Exam not found: ${slug}`);
		this.name = 'ExamNotFoundError';
	}
}

export class BankNotReadyError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'BankNotReadyError';
	}
}

export class InvalidAttemptError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidAttemptError';
	}
}
