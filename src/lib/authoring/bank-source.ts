import { z } from 'zod';
import {
	bankFileSchema,
	bankSettingsSchema,
	contentSignature,
	validateQuestion,
	type BankFile,
	type BankSettings,
	type Issue,
	type Question
} from './schema.ts';

/**
 * Validation and assembly for the directory-based content source.
 *
 * These helpers are format-only and stay free of `node:fs`, so the scripts under
 * `scripts/bank/` can load the files and the rules can still be unit tested in
 * the server project. The `.ts` import extension is required because the scripts
 * run directly through Nodes type stripping.
 */

const slug = z
	.string()
	.trim()
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens.');

const httpUrl = z.url({
	protocol: /^https?$/,
	error: 'Use a public URL starting with https:// (or http://).'
});

/** `content/<exam>/exam.json` — the per-exam row, never hardcoded (ADR-014). */
export const examConfigSchema = z.object({
	id: slug,
	slug,
	title: z.string().trim().min(1, 'An exam title is required.'),
	provider: z.string().trim().min(1, 'A provider is required.'),
	providerUrl: httpUrl.optional(),
	unofficial: z.boolean().default(true),
	contentLocale: z.string().trim().min(1).default('en'),
	blueprintVersion: z.string().trim().min(1).default('TBD'),
	durationMinutes: z.number().int().positive(),
	questionCount: z.number().int().positive(),
	optionCount: z.number().int().min(2),
	passPercent: z.number().int().min(0).max(100),
	sampling: z.enum(['stratified', 'random']).default('stratified'),
	questionOrder: z.enum(['mixed', 'grouped']).default('mixed'),
	optionOrder: z.enum(['shuffle', 'fixed']).default('shuffle'),
	optionLabelStyle: z.enum(['numeric', 'alpha', 'none']).default('numeric'),
	disclaimer: z.string().trim().min(1, 'An exam disclaimer is required.'),
	status: z.enum(['draft', 'published', 'retired']).default('draft')
});

export type ExamConfig = z.infer<typeof examConfigSchema>;

/** `content/<exam>/<bank-kind>/bank.json` - the envelope without questions. */
export const bankMetaSchema = bankFileSchema.omit({ questions: true });
export type BankMeta = z.infer<typeof bankMetaSchema>;

export interface SourceQuestion {
	/** Path relative to the bank directory, using `/` separators. */
	file: string;
	question: Question;
}

export interface SourceIssue extends Issue {
	/** Path relative to the bank directory, absent for bank-level issues. */
	file?: string;
}

export interface BankSourceInput {
	meta: BankMeta;
	exam: ExamConfig;
	questions: SourceQuestion[];
	/** Zero-byte question files, relative to the bank directory. */
	placeholders: string[];
	requireQuestions?: boolean;
}

function directoryOf(file: string): string {
	return file.split('/').slice(0, -1).join('/');
}

function idFromFile(file: string): string {
	return (file.split('/').pop() ?? file).replace(/\.json$/, '');
}

export function bankMetaToSettings(meta: BankMeta): BankSettings {
	return { examSlug: meta.exam, ...meta.bank, modules: meta.modules };
}

function addIssue(
	issues: SourceIssue[],
	message: string,
	options: { file?: string; path?: string; severity?: 'error' | 'warning' } = {}
): void {
	issues.push({
		file: options.file,
		path: options.path ?? '',
		message,
		severity: options.severity ?? 'error'
	});
}

/**
 * Cross-file rules that no single question can check. Parsing and per-question
 * schema checks happen in the loader, `validateQuestion` repeats the schema pass
 * because it also enforces the review, reference, and option rules.
 */
export function validateBankSource(input: BankSourceInput): SourceIssue[] {
	const { meta, exam, questions, placeholders } = input;
	const issues: SourceIssue[] = [];
	const bank = bankMetaToSettings(meta);

	const settings = bankSettingsSchema.safeParse(bank);
	if (!settings.success) {
		for (const issue of settings.error.issues) {
			addIssue(issues, issue.message, {
				file: 'bank.json',
				path: issue.path.map(String).join('.')
			});
		}
	}

	if (meta.exam !== exam.slug) {
		addIssue(issues, `bank.json targets ${meta.exam}, but exam.json defines ${exam.slug}.`, {
			file: 'bank.json',
			path: 'exam'
		});
	}

	if (meta.bank.optionCount !== exam.optionCount) {
		addIssue(
			issues,
			`The bank uses ${meta.bank.optionCount} options but exam.json defines ${exam.optionCount}.`,
			{ file: 'bank.json', path: 'bank.optionCount' }
		);
	}

	if (meta.bank.kind === 'exam') {
		const drawCount = meta.modules.reduce((sum, module) => sum + (module.questionCount ?? 0), 0);
		if (drawCount !== exam.questionCount) {
			addIssue(
				issues,
				`Module draw counts add up to ${drawCount}, but exam.json defines ${exam.questionCount} questions.`,
				{ file: 'bank.json', path: 'modules' }
			);
		}
	}

	if (meta.bank.status === 'published' && exam.status !== 'published') {
		addIssue(issues, 'The bank is published but its exam is not.', {
			file: 'bank.json',
			path: 'bank.status'
		});
	}

	const moduleIds = meta.modules.map((module) => module.id);

	for (const item of questions) {
		const { question, file } = item;
		const expectedDirectory = `questions/${question.module}`;
		if (directoryOf(file) !== expectedDirectory) {
			addIssue(issues, `Place this file in ${expectedDirectory}/.`, {
				file,
				path: 'module'
			});
		}

		if (idFromFile(file) !== question.id) {
			addIssue(issues, `The file name must match the question ID (${question.id}.json).`, {
				file,
				path: 'id'
			});
		}

		if (question.images.length > 0) {
			addIssue(issues, 'Images are not published in v0; leave images empty (ADR-016).', {
				file,
				path: 'images'
			});
		}

		const questionIssues = validateQuestion(question, {
			examSlug: meta.exam,
			bankKind: meta.bank.kind,
			optionCount: meta.bank.optionCount,
			moduleIds,
			otherQuestionIds: questions
				.filter((other) => other.file !== item.file)
				.map((other) => other.question.id)
		});
		for (const issue of questionIssues) {
			addIssue(issues, issue.message, {
				file,
				path: issue.path,
				severity: issue.severity
			});
		}

		if (meta.bank.status === 'published' && question.status !== 'published') {
			addIssue(issues, 'A published bank can only contain published questions.', {
				file,
				path: 'status'
			});
		}
	}

	const seenContent = new Map<string, SourceQuestion>();
	for (const item of questions) {
		const signature = contentSignature(item.question);
		if (!signature) continue;
		const match = seenContent.get(signature);
		if (match) {
			addIssue(issues, `This question has the same content as ${match.question.id}.`, {
				file: item.file
			});
		} else {
			seenContent.set(signature, item);
		}
	}

	if (questions.length === 0) {
		addIssue(
			issues,
			`No complete questions yet; ${placeholders.length} empty file(s) are placeholders.`,
			{
				path: 'questions',
				severity: input.requireQuestions ? 'error' : 'warning'
			}
		);
	}

	if (meta.bank.status === 'published' && placeholders.length > 0) {
		addIssue(
			issues,
			`A published bank cannot contain empty question files; ${placeholders.length} remain.`,
			{ path: 'questions' }
		);
	}

	if (meta.bank.kind === 'exam') {
		for (const module of meta.modules) {
			if (module.questionCount === null) continue;
			const complete = questions.filter((item) => item.question.module === module.id).length;
			if (complete >= module.questionCount) continue;
			addIssue(
				issues,
				`The ${module.id} module has ${complete} complete question(s) but draws ${module.questionCount}.`,
				{
					path: `modules.${module.id}`,
					severity: meta.bank.status === 'published' ? 'error' : 'warning'
				}
			);
		}
	}

	return issues;
}

/** Assemble the full-bank envelope from the source directory */
export function buildBankFile(meta: BankMeta, questions: Question[]): BankFile {
	const moduleOrder = new Map(meta.modules.map((module, index) => [module.id, index]));
	const ordered = [...questions].sort((left, right) => {
		const leftModule = moduleOrder.get(left.module) ?? Number.MAX_SAFE_INTEGER;
		const rightModule = moduleOrder.get(right.module) ?? Number.MAX_SAFE_INTEGER;
		return leftModule - rightModule || left.id.localeCompare(right.id);
	});

	return {
		schemaVersion: meta.schemaVersion,
		exam: meta.exam,
		bank: meta.bank,
		modules: meta.modules,
		questions: ordered
	};
}
