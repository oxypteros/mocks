import { and, asc, eq, getTableColumns, inArray, ne, sql } from 'drizzle-orm';
import type {
	AttemptPayload,
	AttemptOption,
	AttemptQuestion,
	AttemptResult,
	BankKind,
	BankSummary,
	Exam,
	ExamSummary,
	ModuleSummary,
	PracticeOption,
	PracticePayload,
	QuestionResult,
	QuestionType,
	Reference,
	ReferenceKind,
	ResultOption,
	SampleQuestion,
	SubmittedAnswer
} from '../../domain/types';
import { PRACTICE_SESSION_SIZE } from '../../domain/practice';
import { getDb } from '../db';
import { banks, exams, modules, options, questionReferences, questions } from '../db/schema';
import {
	BankNotReadyError,
	ExamNotFoundError,
	InvalidAttemptError,
	type BankRepository
} from './bank';

type Db = ReturnType<typeof getDb>;
type ExamRow = typeof exams.$inferSelect;
type ModuleRow = typeof modules.$inferSelect;
type BankRow = typeof banks.$inferSelect;
type OptionRow = typeof options.$inferSelect;
type ReferenceRow = typeof questionReferences.$inferSelect;

/** Stay well below D1's 100 bound-parameter limit. */
const PARAM_CHUNK_SIZE = 50;

function chunk<T>(items: T[], size = PARAM_CHUNK_SIZE): T[][] {
	const chunks: T[][] = [];
	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}
	return chunks;
}

function shuffle<T>(items: T[]): T[] {
	const result = [...items];
	for (let index = result.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.floor(Math.random() * (index + 1));
		const current = result[index];
		result[index] = result[randomIndex];
		result[randomIndex] = current;
	}
	return result;
}

function toExamSummary(row: ExamRow): ExamSummary {
	return {
		id: row.id,
		slug: row.slug,
		title: row.title,
		provider: row.provider,
		providerUrl: row.providerUrl,
		unofficial: row.unofficial,
		contentLocale: row.contentLocale,
		blueprintVersion: row.blueprintVersion,
		durationMinutes: row.durationMinutes,
		questionCount: row.questionCount,
		optionCount: row.optionCount,
		passPercent: row.passPercent,
		sampling: row.sampling as ExamSummary['sampling'],
		questionOrder: row.questionOrder as ExamSummary['questionOrder'],
		optionOrder: row.optionOrder as ExamSummary['optionOrder'],
		optionLabelStyle: row.optionLabelStyle as ExamSummary['optionLabelStyle'],
		disclaimer: row.disclaimer
	};
}

function toModuleSummary(row: ModuleRow): ModuleSummary {
	return {
		id: row.id,
		title: row.title,
		position: row.position,
		questionCount: row.questionCount
	};
}

function toBankSummary(row: BankRow): BankSummary {
	return {
		id: row.id,
		kind: row.kind as BankKind,
		version: row.version
	};
}

function toReference(row: ReferenceRow): Reference {
	return {
		kind: (row.kind as ReferenceKind) ?? 'web',
		title: row.title,
		...(row.url ? { url: row.url } : {}),
		...(row.author ? { author: row.author } : {}),
		...(row.year ? { year: row.year } : {}),
		...(row.note ? { note: row.note } : {})
	};
}

function groupByQuestion<T extends { questionId: string }>(rows: T[]): Map<string, T[]> {
	const grouped = new Map<string, T[]>();
	for (const row of rows) {
		const existing = grouped.get(row.questionId);
		if (existing) {
			existing.push(row);
		} else {
			grouped.set(row.questionId, [row]);
		}
	}
	return grouped;
}

export class D1BankRepository implements BankRepository {
	constructor(private readonly db: Db) {}

	async listExams(): Promise<ExamSummary[]> {
		const rows = await this.db
			.selectDistinct(getTableColumns(exams))
			.from(exams)
			.innerJoin(banks, and(eq(banks.examId, exams.id), eq(banks.status, 'published')))
			.where(eq(exams.status, 'published'))
			.orderBy(asc(exams.title));

		return rows.map(toExamSummary);
	}

	async getExam(slug: string): Promise<Exam | null> {
		const [examRow] = await this.db
			.select()
			.from(exams)
			.where(and(eq(exams.slug, slug), eq(exams.status, 'published')))
			.limit(1);

		if (!examRow) return null;

		const [bankRow] = await this.db
			.select()
			.from(banks)
			.where(and(eq(banks.examId, examRow.id), eq(banks.status, 'published')))
			.orderBy(
				sql`case when ${banks.kind} = 'exam' then 0 when ${banks.kind} = 'demo' then 1 else 2 end`
			)
			.limit(1);

		if (!bankRow) return null;

		const [practiceBankRow] = await this.db
			.select()
			.from(banks)
			.where(
				and(eq(banks.examId, examRow.id), eq(banks.kind, 'practice'), eq(banks.status, 'published'))
			)
			.limit(1);

		const moduleRows = await this.db
			.select()
			.from(modules)
			.where(eq(modules.bankId, bankRow.id))
			.orderBy(asc(modules.position));

		return {
			...toExamSummary(examRow),
			modules: moduleRows.map(toModuleSummary),
			bank: toBankSummary(bankRow),
			practiceBank: practiceBankRow ? toBankSummary(practiceBankRow) : null
		};
	}

	async getSampleQuestion(
		slug: string,
		excludeQuestionId?: string,
		bankKind?: BankKind
	): Promise<SampleQuestion | null> {
		const exam = await this.getExam(slug);
		if (!exam) return null;

		// Try the requested bank first, then fall back to the exam's active bank so
		// the homepage always has a sample even when the practice bank is empty.
		const bankIds = [exam.bank.id];

		if (bankKind && bankKind !== exam.bank.kind) {
			const [bankRow] = await this.db
				.select({ id: banks.id })
				.from(banks)
				.where(
					and(eq(banks.examId, exam.id), eq(banks.kind, bankKind), eq(banks.status, 'published'))
				)
				.limit(1);

			if (bankRow) bankIds.unshift(bankRow.id);
		}

		const fetchSample = async (bankId: string): Promise<SampleQuestion | null> => {
			const publishedWhere = and(
				eq(questions.examId, exam.id),
				eq(questions.bankId, bankId),
				eq(questions.status, 'published')
			);

			const sampleQuery = (excludeId?: string) =>
				this.db
					.select({
						id: questions.id,
						moduleId: questions.moduleId,
						stem: questions.stem,
						explanation: questions.explanation
					})
					.from(questions)
					.where(excludeId ? and(publishedWhere, ne(questions.id, excludeId)) : publishedWhere)
					.orderBy(sql`random()`)
					.limit(1);

			const [row] = await sampleQuery(excludeQuestionId);
			let sample = row;
			// A bank with a single question cannot exclude it; show it again instead
			// of returning nothing.
			if (!sample && excludeQuestionId) {
				[sample] = await sampleQuery();
			}
			if (!sample) return null;

			const optionRows = await this.db
				.select()
				.from(options)
				.where(eq(options.questionId, sample.id))
				.orderBy(asc(options.position));

			return {
				id: sample.id,
				moduleId: sample.moduleId,
				prompt: sample.stem,
				explanation: sample.explanation,
				options: optionRows.map((option) => ({
					id: option.id,
					label: option.text,
					correct: option.isCorrect
				}))
			};
		};

		for (const bankId of bankIds) {
			const sample = await fetchSample(bankId);
			if (sample) return sample;
		}

		return null;
	}

	async drawAttempt(slug: string): Promise<AttemptPayload> {
		const exam = await this.getExam(slug);
		if (!exam) throw new ExamNotFoundError(slug);
		if (exam.modules.length === 0) throw new BankNotReadyError(`Exam ${slug} has no modules`);
		if (exam.sampling !== 'stratified') {
			throw new BankNotReadyError(`Unsupported sampling mode: ${exam.sampling}`);
		}

		const draws = exam.modules.map((module) => {
			if (module.questionCount === null) {
				throw new BankNotReadyError(`Module ${module.title} has no draw count`);
			}

			return {
				module,
				query: this.db
					.select({
						id: questions.id,
						moduleId: questions.moduleId,
						stem: questions.stem,
						type: questions.type
					})
					.from(questions)
					.where(
						and(
							eq(questions.examId, exam.id),
							eq(questions.bankId, exam.bank.id),
							eq(questions.moduleId, module.id),
							eq(questions.status, 'published')
						)
					)
					.orderBy(sql`random()`)
					.limit(module.questionCount)
			};
		});

		const drawResults = await this.db.batch(
			draws.map((draw) => draw.query) as [
				(typeof draws)[number]['query'],
				...(typeof draws)[number]['query'][]
			]
		);
		const drawn: { id: string; moduleId: string; stem: string; type: string }[] = [];

		for (let index = 0; index < drawResults.length; index += 1) {
			const module = draws[index].module;
			const required = module.questionCount;
			const rows = drawResults[index];
			if (required === null) {
				throw new BankNotReadyError(`Module ${module.title} has no draw count`);
			}
			if (rows.length < required) {
				throw new BankNotReadyError(
					`Module ${module.title} needs ${required} published questions but has ${rows.length}`
				);
			}
			drawn.push(...rows);
		}

		const orderedQuestions = exam.questionOrder === 'mixed' ? shuffle(drawn) : drawn;
		const questionIds = orderedQuestions.map((question) => question.id);
		const optionRows = await this.fetchOptions(questionIds);
		const optionsByQuestion = groupByQuestion(optionRows);

		const attemptQuestions: AttemptQuestion[] = orderedQuestions.map((question) => {
			const questionOptions = optionsByQuestion.get(question.id) ?? [];
			if (questionOptions.length !== exam.optionCount) {
				throw new BankNotReadyError(
					`Question ${question.id} has ${questionOptions.length} options; expected ${exam.optionCount}`
				);
			}

			const orderedOptions =
				exam.optionOrder === 'shuffle' ? shuffle(questionOptions) : questionOptions;

			return {
				id: question.id,
				moduleId: question.moduleId,
				type: question.type as QuestionType,
				stem: question.stem,
				options: orderedOptions.map((option): AttemptOption => ({
					id: option.id,
					text: option.text
				}))
			};
		});

		return { exam, questions: attemptQuestions };
	}

	async drawPracticeSession(slug: string): Promise<PracticePayload> {
		const exam = await this.getExam(slug);
		if (!exam) throw new ExamNotFoundError(slug);
		if (!exam.practiceBank) {
			throw new BankNotReadyError(`Exam ${slug} has no published practice bank`);
		}

		const questionRows = await this.db
			.select({
				id: questions.id,
				moduleId: questions.moduleId,
				stem: questions.stem,
				explanation: questions.explanation,
				type: questions.type
			})
			.from(questions)
			.where(
				and(
					eq(questions.examId, exam.id),
					eq(questions.bankId, exam.practiceBank.id),
					eq(questions.status, 'published')
				)
			)
			.orderBy(sql`random()`)
			.limit(PRACTICE_SESSION_SIZE);

		if (questionRows.length === 0) {
			throw new BankNotReadyError(`Practice bank for ${slug} has no published questions`);
		}

		const questionIds = questionRows.map((question) => question.id);
		const [optionRows, referenceRows] = await Promise.all([
			this.fetchOptions(questionIds),
			this.fetchReferences(questionIds)
		]);
		const optionsByQuestion = groupByQuestion(optionRows);
		const referencesByQuestion = groupByQuestion(referenceRows);

		const practiceQuestions = questionRows.map((question) => {
			const questionOptions = optionsByQuestion.get(question.id) ?? [];
			const correctOptions = questionOptions.filter((option) => option.isCorrect);

			// Practice validates per question (ADR-028): two-option true/false is
			// valid, and the exam's option count does not apply.
			if (questionOptions.length < 2 || correctOptions.length !== 1) {
				throw new BankNotReadyError(
					`Practice question ${question.id} needs at least two options and exactly one correct option`
				);
			}

			const orderedOptions = shuffle(questionOptions);

			return {
				id: question.id,
				moduleId: question.moduleId,
				type: question.type as QuestionType,
				stem: question.stem,
				explanation: question.explanation,
				options: orderedOptions.map((option): PracticeOption => ({
					id: option.id,
					text: option.text,
					shortLabel: option.shortLabel,
					rationale: option.rationale,
					isCorrect: option.isCorrect
				})),
				references: (referencesByQuestion.get(question.id) ?? []).map(toReference)
			};
		});

		return { exam, questions: practiceQuestions };
	}

	async scoreAttempt(slug: string, answers: SubmittedAnswer[]): Promise<AttemptResult> {
		const exam = await this.getExam(slug);
		if (!exam) throw new ExamNotFoundError(slug);

		const questionIds = answers.map((answer) => answer.questionId);
		if (answers.length !== exam.questionCount) {
			throw new InvalidAttemptError(
				`Expected ${exam.questionCount} answers, received ${answers.length}`
			);
		}
		if (new Set(questionIds).size !== questionIds.length) {
			throw new InvalidAttemptError('Duplicate question IDs in submission');
		}

		const questionRows = await this.fetchQuestions(questionIds, exam);
		if (questionRows.length !== questionIds.length) {
			throw new InvalidAttemptError('One or more questions do not belong to this exam');
		}

		const [optionRows, referenceRows] = await Promise.all([
			this.fetchOptions(questionIds),
			this.fetchReferences(questionIds)
		]);
		const questionsById = new Map(questionRows.map((question) => [question.id, question]));
		const optionsByQuestion = groupByQuestion(optionRows);
		const referencesByQuestion = groupByQuestion(referenceRows);

		let correctCount = 0;
		const questionResults: QuestionResult[] = [];

		for (const answer of answers) {
			const question = questionsById.get(answer.questionId);
			if (!question) throw new InvalidAttemptError(`Unknown question: ${answer.questionId}`);

			const questionOptions = optionsByQuestion.get(question.id) ?? [];
			if (questionOptions.length !== exam.optionCount) {
				throw new BankNotReadyError(
					`Question ${question.id} has ${questionOptions.length} options; expected ${exam.optionCount}`
				);
			}

			const correctOption = questionOptions.find((option) => option.isCorrect);
			if (!correctOption) {
				throw new BankNotReadyError(`Question ${question.id} has no correct option`);
			}

			if (
				answer.selectedOptionId !== null &&
				!questionOptions.some((option) => option.id === answer.selectedOptionId)
			) {
				throw new InvalidAttemptError(
					`Option ${answer.selectedOptionId} does not belong to question ${question.id}`
				);
			}

			const correct = answer.selectedOptionId === correctOption.id;
			if (correct) correctCount += 1;

			questionResults.push({
				id: question.id,
				moduleId: question.moduleId,
				stem: question.stem,
				explanation: question.explanation,
				selectedOptionId: answer.selectedOptionId,
				correctOptionId: correctOption.id,
				correct,
				options: questionOptions.map((option): ResultOption => ({
					id: option.id,
					text: option.text,
					shortLabel: option.shortLabel,
					rationale: option.rationale,
					isCorrect: option.isCorrect
				})),
				references: (referencesByQuestion.get(question.id) ?? []).map(toReference)
			});
		}

		const moduleResults = exam.modules.map((module) => {
			const moduleQuestions = questionResults.filter((question) => question.moduleId === module.id);
			return {
				moduleId: module.id,
				title: module.title,
				correctCount: moduleQuestions.filter((question) => question.correct).length,
				questionCount: moduleQuestions.length
			};
		});

		const scorePercent = Math.round((correctCount / exam.questionCount) * 100);

		return {
			exam,
			correctCount,
			questionCount: exam.questionCount,
			scorePercent,
			passed: scorePercent >= exam.passPercent,
			modules: moduleResults,
			questions: questionResults
		};
	}

	private async fetchQuestions(questionIds: string[], exam: Exam) {
		const results = await Promise.all(
			chunk(questionIds).map((ids) =>
				this.db
					.select()
					.from(questions)
					.where(
						and(
							inArray(questions.id, ids),
							eq(questions.examId, exam.id),
							eq(questions.bankId, exam.bank.id)
						)
					)
					.orderBy(asc(questions.id))
			)
		);
		return results.flat();
	}

	private async fetchOptions(questionIds: string[]): Promise<OptionRow[]> {
		const results = await Promise.all(
			chunk(questionIds).map((ids) =>
				this.db
					.select()
					.from(options)
					.where(inArray(options.questionId, ids))
					.orderBy(asc(options.questionId), asc(options.position))
			)
		);
		return results.flat();
	}

	private async fetchReferences(questionIds: string[]): Promise<ReferenceRow[]> {
		const results = await Promise.all(
			chunk(questionIds).map((ids) =>
				this.db
					.select()
					.from(questionReferences)
					.where(inArray(questionReferences.questionId, ids))
					.orderBy(asc(questionReferences.questionId), asc(questionReferences.position))
			)
		);
		return results.flat();
	}
}
