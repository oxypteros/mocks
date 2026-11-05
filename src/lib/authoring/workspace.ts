import {
	bankFileSchema,
	bankSettingsSchema,
	questionSchema,
	SCHEMA_VERSION,
	type BankFile,
	type BankKind,
	type BankSettings,
	type ModuleDefinition,
	type Question,
	type QuestionOption,
	type Workspace
} from './schema';

/**
 * Initial editor values for the CPACC exam bank. These are authoring defaults,
 * not runtime exam configuration, edit or replace them in the bank settings
 * panel.
 */
const CPACC_MODULES: ModuleDefinition[] = [
	{
		id: 'disabilities',
		title: 'Disabilities, Challenges, and Assistive Technologies',
		questionCount: 40
	},
	{
		id: 'accessibility',
		title: 'Accessibility and Universal Design',
		questionCount: 40
	},
	{
		id: 'standards',
		title: 'Standards, Laws, and Management Strategies',
		questionCount: 20
	}
];

export function defaultBankSettings(): BankSettings {
	return {
		examSlug: 'cpacc',
		id: 'cpacc-exam',
		kind: 'exam',
		title: 'CPACC Exam Bank',
		version: '0.1.0',
		status: 'draft',
		optionCount: 4,
		modules: CPACC_MODULES.map((module) => ({ ...module }))
	};
}

export function createWorkspace(): Workspace {
	return { bank: defaultBankSettings(), questions: [] };
}

export function suggestQuestionId(
	bankId: string,
	moduleId: string,
	questions: Pick<Question, 'id'>[],
	fallbackModule = 'question'
): string {
	const modulePart = moduleId || fallbackModule;
	const prefix = `${bankId}-${modulePart}-`;
	let highest = 0;
	for (const question of questions) {
		if (!question.id.startsWith(prefix)) continue;
		const suffix = question.id.slice(prefix.length);
		if (!/^\d{4}$/.test(suffix)) continue;
		highest = Math.max(highest, Number(suffix));
	}
	return `${prefix}${String(highest + 1).padStart(4, '0')}`;
}

export function newQuestion(
	bankId: string,
	moduleId: string,
	optionCount: number,
	questions: Pick<Question, 'id'>[]
): Question {
	return {
		id: suggestQuestionId(bankId, moduleId, questions),
		module: moduleId,
		type: 'single',
		stem: '',
		options: Array.from({ length: optionCount }, (_item, index) => ({
			id: `option-${index + 1}`,
			text: '',
			shortLabel: '',
			rationale: ''
		})),
		correctOptionId: '',
		explanation: '',
		references: [{ kind: 'web', title: '', url: '' }],
		images: [],
		difficulty: 2,
		tags: [],
		status: 'draft',
		provenance: 'authored',
		reviewer: null,
		reviewedAt: null,
		sourceCheckedAt: null
	};
}

/** Switching kind keeps exam counts for known modules and clears practice
 * counts.
 */
export function setBankKind(bank: BankSettings, kind: BankKind): void {
	bank.kind = kind;
	for (const module of bank.modules) {
		if (kind === 'exam') {
			module.questionCount ??=
				CPACC_MODULES.find((candidate) => candidate.id === module.id)?.questionCount ?? 1;
		} else {
			module.questionCount = null;
		}
	}
}

export function parseTags(value: string): string[] {
	const tags = value
		.split(',')
		.map((tag) => tag.trim())
		.filter(Boolean);
	return [...new Set(tags)];
}

export function nextOptionId(options: QuestionOption[]): string {
	const used = new Set(options.map((option) => option.id));
	let index = 1;
	while (used.has(`option-${index}`)) index++;
	return `option-${index}`;
}

/** Canonical key order for a question file*/
export function toQuestionFile(question: Question): Question {
	return {
		id: question.id,
		module: question.module,
		type: question.type,
		stem: question.stem,
		options: question.options.map((option) => ({
			id: option.id,
			text: option.text,
			shortLabel: option.shortLabel,
			rationale: option.rationale
		})),
		correctOptionId: question.correctOptionId,
		explanation: question.explanation,
		references: question.references.map((reference) => {
			// Export only the fields that belong to the chosen kind. Older drafts
			// without a kind are web references
			if (reference.kind === 'publication') {
				return {
					kind: reference.kind,
					title: reference.title,
					author: reference.author,
					year: reference.year,
					url: reference.url || undefined
				};
			}
			if (reference.kind === 'general') {
				return {
					kind: reference.kind,
					title: reference.title,
					note: reference.note
				};
			}
			return {
				kind: 'web' as const,
				title: reference.title,
				url: reference.url
			};
		}),
		images: question.images,
		difficulty: question.difficulty,
		tags: [...question.tags],
		status: question.status,
		provenance: question.provenance,
		reviewer: question.reviewer,
		reviewedAt: question.reviewedAt,
		sourceCheckedAt: question.sourceCheckedAt
	};
}

/** The reviewable text source for the bank. */
export function toBankFile(bank: BankSettings, questions: Question[]): BankFile {
	return {
		schemaVersion: SCHEMA_VERSION,
		exam: bank.examSlug,
		bank: {
			id: bank.id,
			kind: bank.kind,
			title: bank.title,
			version: bank.version,
			status: bank.status,
			optionCount: bank.optionCount
		},
		modules: bank.modules.map((module) => ({
			id: module.id,
			title: module.title,
			questionCount: module.questionCount
		})),
		questions: questions.map(toQuestionFile)
	};
}

export type ParsedAuthoringFile =
	| { kind: 'question'; question: Question }
	| { kind: 'bank'; bank: BankSettings; questions: Question[] }
	| { kind: 'questions'; questions: Question[] }
	| { kind: 'error'; message: string };

function describeIssues(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
	return error.issues
		.slice(0, 3)
		.map((issue) => {
			const path = issue.path.map(String).join('.');
			return path ? `${path}: ${issue.message}` : issue.message;
		})
		.join(' ');
}

/**
 * A bare array is the transfer shape used by older bank exports and hand-written
 * files. Validate every question and report `questions.N.path` so a bad item is
 * findable without reading the whole array.
 */
function parseQuestionArray(data: unknown[]): ParsedAuthoringFile {
	if (data.length === 0) {
		return { kind: 'error', message: 'That file has no questions.' };
	}

	const questions: Question[] = [];
	const issues: { path: PropertyKey[]; message: string }[] = [];

	data.forEach((item, index) => {
		const parsed = questionSchema.safeParse(item);
		if (parsed.success) {
			questions.push(parsed.data);
			return;
		}
		issues.push(
			...parsed.error.issues.map((issue) => ({
				path: ['questions', index, ...issue.path],
				message: issue.message
			}))
		);
	});

	if (issues.length > 0) {
		return {
			kind: 'error',
			message: `The question list is invalid. ${describeIssues({ issues })}`
		};
	}

	return { kind: 'questions', questions };
}

/**
 * Accept a single question file, a bank file exported by this tool, or a bare
 * array of questions. Questions are parsed (and trimmed) through the schema;
 * unknown image keys are preserved by the loose image schema.
 */
export function parseAuthoringFile(text: string): ParsedAuthoringFile {
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch {
		return { kind: 'error', message: 'That file is not valid JSON.' };
	}

	if (Array.isArray(data)) {
		return parseQuestionArray(data);
	}

	const question = questionSchema.safeParse(data);
	if (question.success) {
		return { kind: 'question', question: question.data };
	}

	const bankFile = bankFileSchema.safeParse(data);
	if (bankFile.success) {
		const settings = bankSettingsSchema.safeParse({
			examSlug: bankFile.data.exam,
			id: bankFile.data.bank.id,
			kind: bankFile.data.bank.kind,
			title: bankFile.data.bank.title,
			version: bankFile.data.bank.version,
			status: bankFile.data.bank.status,
			optionCount: bankFile.data.bank.optionCount,
			modules: bankFile.data.modules
		});
		if (!settings.success) {
			return {
				kind: 'error',
				message: `The bank settings are invalid. ${describeIssues(settings.error)}`
			};
		}
		return { kind: 'bank', bank: settings.data, questions: bankFile.data.questions };
	}

	return {
		kind: 'error',
		message: `The file is neither a question nor a bank file. ${describeIssues(bankFile.error)}`
	};
}

export function serialize(value: unknown): string {
	return `${JSON.stringify(value, null, '\t')}\n`;
}
