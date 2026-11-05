import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ZodError } from 'zod';
import {
	bankMetaSchema,
	bankMetaToSettings,
	examConfigSchema,
	validateBankSource,
	type BankMeta,
	type ExamConfig,
	type SourceIssue,
	type SourceQuestion
} from '../../src/lib/authoring/bank-source.ts';
import {
	questionSchema,
	type BankSettings,
	type Question
} from '../../src/lib/authoring/schema.ts';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export interface BankSource {
	root: string;
	meta: BankMeta;
	exam: ExamConfig;
	bank: BankSettings;
	questions: SourceQuestion[];
	placeholders: string[];
	issues: SourceIssue[];
}

function formatZodError(error: ZodError): string {
	return error.issues
		.map((issue) => `${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`)
		.join('\n');
}

function readJson(file: string, label: string): unknown {
	if (!existsSync(file)) {
		throw new Error(`Missing ${label}: ${file}`);
	}
	try {
		return JSON.parse(readFileSync(file, 'utf8'));
	} catch (error) {
		throw new Error(`${label} is not valid JSON: ${(error as Error).message}`, {
			cause: error
		});
	}
}

function questionFiles(directory: string): string[] {
	if (!existsSync(directory)) return [];
	return readdirSync(directory, { withFileTypes: true })
		.flatMap((entry) => {
			const fullPath = join(directory, entry.name);
			if (entry.isDirectory()) return questionFiles(fullPath);
			return entry.isFile() && entry.name.endsWith('.json') ? [fullPath] : [];
		})
		.sort();
}

function toSourcePath(root: string, file: string): string {
	return relative(root, file).split(sep).join('/');
}

export function loadBankSource(
	rootArgument?: string,
	options: { requireQuestions?: boolean } = {}
): BankSource {
	const root = resolve(rootArgument ?? join(repoRoot, 'content/cpacc/exam'));
	const examFile = resolve(root, '..', 'exam.json');

	const metaResult = bankMetaSchema.safeParse(readJson(join(root, 'bank.json'), 'bank.json'));
	if (!metaResult.success) {
		throw new Error(`bank.json is invalid:\n${formatZodError(metaResult.error)}`);
	}

	const examResult = examConfigSchema.safeParse(readJson(examFile, 'exam.json'));
	if (!examResult.success) {
		throw new Error(`exam.json is invalid:\n${formatZodError(examResult.error)}`);
	}

	const meta = metaResult.data;
	const exam = examResult.data;
	const questions: SourceQuestion[] = [];
	const placeholders: string[] = [];
	const issues: SourceIssue[] = [];

	for (const file of questionFiles(join(root, 'questions'))) {
		const sourcePath = toSourcePath(root, file);
		if (statSync(file).size === 0) {
			placeholders.push(sourcePath);
			continue;
		}

		let raw: unknown;
		try {
			raw = JSON.parse(readFileSync(file, 'utf8'));
		} catch (error) {
			issues.push({
				file: sourcePath,
				path: '',
				message: `Invalid JSON: ${(error as Error).message}`,
				severity: 'error'
			});
			continue;
		}

		const parsed = questionSchema.safeParse(raw);
		if (!parsed.success) {
			for (const issue of parsed.error.issues) {
				issues.push({
					file: sourcePath,
					path: issue.path.map(String).join('.'),
					message: issue.message,
					severity: 'error'
				});
			}
			continue;
		}

		questions.push({ file: sourcePath, question: parsed.data as Question });
	}

	issues.push(
		...validateBankSource({
			meta,
			exam,
			questions,
			placeholders,
			requireQuestions: options.requireQuestions
		})
	);

	return {
		root,
		meta,
		exam,
		bank: bankMetaToSettings(meta),
		questions,
		placeholders,
		issues
	};
}

export function printIssues(issues: SourceIssue[]): void {
	const ordered = [...issues].sort((left, right) => {
		const leftFile = left.file ?? '';
		const rightFile = right.file ?? '';
		return (
			leftFile.localeCompare(rightFile) ||
			left.path.localeCompare(right.path) ||
			left.message.localeCompare(right.message)
		);
	});

	for (const issue of ordered) {
		const location = [issue.file, issue.path].filter(Boolean).join(':');
		const prefix = issue.severity === 'error' ? 'error' : 'warning';
		console.error(`${prefix}${location ? ` ${location}` : ''}: ${issue.message}`);
	}
}

export function printSummary(source: BankSource): void {
	const { bank, exam, questions, placeholders } = source;
	const errors = source.issues.filter((issue) => issue.severity === 'error').length;
	const warnings = source.issues.filter((issue) => issue.severity === 'warning').length;

	console.log(`Bank: ${bank.id} (${bank.kind}, ${bank.status}) — ${bank.title} v${bank.version}`);
	console.log(
		`Exam: ${exam.id} — ${exam.questionCount} questions, ${exam.durationMinutes} min, ` +
			`${exam.optionCount} options, ${exam.passPercent}% to pass`
	);
	console.log(`Questions: ${questions.length} complete, ${placeholders.length} empty`);
	for (const module of bank.modules) {
		const complete = questions.filter((item) => item.question.module === module.id).length;
		const empty = placeholders.filter((file) => file.startsWith(`questions/${module.id}/`)).length;
		const draw = module.questionCount === null ? 'practice' : `${module.questionCount} draw`;
		console.log(`  ${module.id}: ${complete} complete, ${empty} empty, ${draw}`);
	}
	console.log(`Issues: ${errors} error(s), ${warnings} warning(s)`);
}
