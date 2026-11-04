/**
 * Storage-independent content types shared by the repository and Svelte templates.
 * Nothing here imports Drizzle or D1.
 */

export type BankKind = 'exam' | 'practice' | 'demo';
export type QuestionType = 'single';

export interface ExamSummary {
	id: string;
	slug: string;
	title: string;
	provider: string;
	/** The provider's official page for this exam, if it has one. */
	providerUrl: string | null;
	unofficial: boolean;
	contentLocale: string;
	blueprintVersion: string;
	durationMinutes: number;
	questionCount: number;
	optionCount: number;
	passPercent: number;
	sampling: 'stratified' | 'random';
	questionOrder: 'mixed' | 'grouped';
	optionOrder: 'shuffle' | 'fixed';
	optionLabelStyle: 'numeric' | 'alpha' | 'none';
	disclaimer: string;
}

export interface ModuleSummary {
	id: string;
	title: string;
	position: number;
	/** Exam draw count: null for practice modules */
	questionCount: number | null;
}

export interface BankSummary {
	id: string;
	kind: BankKind;
	version: string;
}

export interface Exam extends ExamSummary {
	modules: ModuleSummary[];
	/** The exam's active bank. */
	bank: BankSummary;
	/**
	 * The exam's published practice bank, if one exists. `null` hides the
	 * practice entry points instead of linking to a session that cannot load
	 */
	practiceBank: BankSummary | null;
}

/**
 * A single public sample question for marketing pages.
 */
export interface SampleOption {
	id: string;
	label: string;
	correct: boolean;
}

export interface SampleQuestion {
	id: string;
	moduleId: string;
	prompt: string;
	options: SampleOption[];
	explanation: string;
}

/** An option as shown during an attempt. Correctness and feedback are withheld. */
export interface AttemptOption {
	id: string;
	text: string;
}

export interface AttemptQuestion {
	id: string;
	moduleId: string;
	type: QuestionType;
	stem: string;
	options: AttemptOption[];
}

export interface AttemptPayload {
	exam: Exam;
	questions: AttemptQuestion[];
}

export interface SubmittedAnswer {
	questionId: string;
	selectedOptionId: string | null;
}

/** An option in a practice session, feedback is in the payload */
export interface PracticeOption extends AttemptOption {
	shortLabel: string;
	rationale: string;
	isCorrect: boolean;
}

/**
 * A practice question carries its feedback from the moment the session is
 * drawn, so checking an answer never calls the server
 */
export interface PracticeQuestion extends Omit<AttemptQuestion, 'options'> {
	options: PracticeOption[];
	explanation: string;
	references: Reference[];
}

export interface PracticePayload {
	exam: Exam;
	questions: PracticeQuestion[];
}

export type ReferenceKind = 'web' | 'publication' | 'general';

/**
 * A source supporting a question. Not every source is a URL: a publication is
 * identified by author/publisher and year, and background knowledge that does
 * not depend on a single document is justified with a note instead of a link
 */
export interface Reference {
	kind: ReferenceKind;
	title: string;
	url?: string;
	author?: string;
	year?: string;
	note?: string;
}

/** Feedback shown after submission */
export interface ResultOption extends AttemptOption {
	shortLabel: string;
	rationale: string;
	isCorrect: boolean;
}

export interface QuestionResult {
	id: string;
	moduleId: string;
	stem: string;
	explanation: string;
	selectedOptionId: string | null;
	correctOptionId: string;
	correct: boolean;
	options: ResultOption[];
	references: Reference[];
}

export interface ModuleResult {
	moduleId: string;
	title: string;
	correctCount: number;
	questionCount: number;
}

export interface AttemptResult {
	exam: Exam;
	correctCount: number;
	questionCount: number;
	scorePercent: number;
	passed: boolean;
	modules: ModuleResult[];
	questions: QuestionResult[];
}
