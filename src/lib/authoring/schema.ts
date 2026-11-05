import { z } from 'zod';

/**
 * Authoring schemas for the official question bank.
 *
 * These mirror intrernal schemaVersion 3 plus the review metadata.
 * They are not the runtime D1 schema.
 */

export const SCHEMA_VERSION = 3;

export const BANK_KINDS = ['exam', 'practice', 'demo'] as const;
export const BANK_STATUSES = ['draft', 'published', 'retired'] as const;
export const QUESTION_STATUSES = ['draft', 'review', 'published', 'retired'] as const;
export const PROVENANCES = ['authored', 'llm_assisted'] as const;

const slug = z
	.string()
	.trim()
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens.');

const id = z.string().trim().min(1, 'This field is required.');

export const optionSchema = z.object({
	id: id,
	text: z.string().trim().min(1, 'Option text is required.'),
	shortLabel: z.string().trim().min(1, 'A short label is required for feedback.'),
	rationale: z.string().trim().min(1, 'Explain why this option is right or wrong.')
});

/**
 * A reference is not always a URL. `web` sources link to a page or online
 * report, `publication` sources identify a book, article, standard, or report by
 * author/publisher and year, and `general` sources record background knowledge
 * whose warrant does not depend on a single document.
 */
export const REFERENCE_KINDS = ['web', 'publication', 'general'] as const;
export type ReferenceKind = (typeof REFERENCE_KINDS)[number];

/** Treat an empty form input as "not provided" so optional fields stay absent. */
function blankToUndefined(value: unknown): unknown {
	return typeof value === 'string' && value.trim() === '' ? undefined : value;
}

const optionalText = z.preprocess(
	blankToUndefined,
	z.string().trim().min(1, 'This field cannot be blank.').optional()
);

const optionalUrl = z.preprocess(
	blankToUndefined,
	z
		.url({
			protocol: /^https?$/,
			error: 'Use a public URL starting with https:// (or http://).'
		})
		.optional()
);

const optionalYear = z.preprocess(
	(value) => {
		// Hand-written JSON sometimes uses a number for the year so keep the stored
		// shape text while accepting that input.
		if (typeof value === 'number' && Number.isInteger(value)) return String(value);
		return blankToUndefined(value);
	},
	z
		.string()
		.trim()
		.regex(/^\d{4}$/, 'Use a four-digit year, such as 2013.')
		.optional()
);

export const referenceSchema = z
	.object({
		/** Older files without a kind are treated as web sources. */
		kind: z.enum(REFERENCE_KINDS).default('web'),
		title: z.string().trim().min(1, 'A reference title is required.'),
		url: optionalUrl,
		author: optionalText,
		year: optionalYear,
		note: optionalText
	})
	.superRefine((reference, ctx) => {
		if (reference.kind === 'web' && !reference.url) {
			ctx.addIssue({
				code: 'custom',
				path: ['url'],
				message: 'A web reference needs a public URL.'
			});
		}

		if (reference.kind === 'publication') {
			if (!reference.author) {
				ctx.addIssue({
					code: 'custom',
					path: ['author'],
					message: 'A publication needs an author or publisher.'
				});
			}
			if (!reference.year) {
				ctx.addIssue({
					code: 'custom',
					path: ['year'],
					message: 'A publication needs a publication year.'
				});
			}
		}

		if (reference.kind === 'general' && !reference.note) {
			ctx.addIssue({
				code: 'custom',
				path: ['note'],
				message: 'Explain why this claim does not depend on a single source.'
			});
		}
	});

/**
 * v0 has no image rows, but imported files may carry them. Keep the
 * shape loose so editing a question never silently drops image metadata.
 */
export const imageSchema = z.looseObject({
	src: z.string().min(1),
	alt: z.string(),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional()
});

export const questionSchema = z.object({
	id: z
		.string()
		.trim()
		.regex(
			/^[a-z0-9]+(?:-[a-z0-9]+)*-\d{4}$/,
			'Use a stable ID ending in four digits, such as cpacc-exam-disabilities-0001.'
		),
	module: id,
	type: z.literal('single'),
	stem: z.string().trim().min(1, 'The question text is required.'),
	options: z.array(optionSchema).min(2, 'A question needs at least two options.'),
	correctOptionId: z.string().trim().min(1, 'Choose the correct option.'),
	explanation: z.string().trim().min(1, 'The shared explanation is required.'),
	references: z.array(referenceSchema).min(1, 'Add at least one public reference.'),
	images: z.array(imageSchema),
	difficulty: z.number().int().min(1).max(5),
	tags: z.array(z.string().trim().min(1)),
	status: z.enum(QUESTION_STATUSES),
	provenance: z.enum(PROVENANCES),
	reviewer: z.string().trim().min(1).nullable(),
	reviewedAt: z.iso.date().nullable(),
	sourceCheckedAt: z.iso.date().nullable()
});

export const moduleSchema = z.object({
	id: slug,
	title: z.string().trim().min(1, 'A module title is required.'),
	questionCount: z
		.number()
		.int()
		.positive()
		.nullable()
		.describe('Exam draw count. Practice modules leave this null.')
});

export const bankSettingsSchema = z
	.object({
		examSlug: slug,
		id: slug,
		kind: z.enum(BANK_KINDS),
		title: z.string().trim().min(1, 'A bank title is required.'),
		version: z.string().trim().min(1, 'A bank version is required.'),
		status: z.enum(BANK_STATUSES),
		/** Per-exam option count, only exam-kind questions are validated against it. */
		optionCount: z.number().int().min(2).max(10),
		modules: z.array(moduleSchema).min(1, 'Add at least one module.')
	})
	.superRefine((bank, ctx) => {
		const moduleIds = bank.modules.map((module) => module.id);
		if (new Set(moduleIds).size !== moduleIds.length) {
			ctx.addIssue({
				code: 'custom',
				path: ['modules'],
				message: 'Module IDs must be unique.'
			});
		}
		if (bank.kind === 'exam' && bank.modules.some((module) => module.questionCount === null)) {
			ctx.addIssue({
				code: 'custom',
				path: ['modules'],
				message: 'Exam modules need a draw count.'
			});
		}
		if (bank.kind !== 'exam' && bank.modules.some((module) => module.questionCount !== null)) {
			ctx.addIssue({
				code: 'custom',
				path: ['modules'],
				message: 'Practice modules leave the draw count empty.'
			});
		}
	});

/** The JSON file exported for the whole bank. */
export const bankFileSchema = z.object({
	schemaVersion: z.literal(SCHEMA_VERSION),
	exam: slug,
	bank: z.object({
		id: slug,
		kind: z.enum(BANK_KINDS),
		title: z.string().trim().min(1),
		version: z.string().trim().min(1),
		status: z.enum(BANK_STATUSES),
		optionCount: z.number().int().min(2).max(10)
	}),
	modules: z.array(moduleSchema).min(1),
	questions: z.array(questionSchema)
});

export const workspaceSchema = z.object({
	bank: bankSettingsSchema,
	questions: z.array(questionSchema)
});

export type QuestionOption = z.infer<typeof optionSchema>;
export type QuestionReference = z.infer<typeof referenceSchema>;
export type QuestionImage = z.infer<typeof imageSchema>;
export type Question = z.infer<typeof questionSchema>;
export type ModuleDefinition = z.infer<typeof moduleSchema>;
export type BankKind = (typeof BANK_KINDS)[number];
export type BankStatus = (typeof BANK_STATUSES)[number];
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];
export type Provenance = (typeof PROVENANCES)[number];
export type BankSettings = z.infer<typeof bankSettingsSchema>;
export type BankFile = z.infer<typeof bankFileSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;

export type Severity = 'error' | 'warning';

export interface Issue {
	path: string;
	message: string;
	severity: Severity;
}

export interface QuestionContext {
	examSlug: string;
	bankKind: BankKind;
	optionCount: number;
	moduleIds: string[];
	/** IDs of the other questions in the bank, for the uniqueness check. */
	otherQuestionIds: string[];
}

function zodIssues(error: z.ZodError, prefix = ''): Issue[] {
	return error.issues.map((issue) => {
		const path = issue.path.map(String).join('.');
		return {
			path: prefix ? `${prefix}.${path}` : path,
			message: issue.message,
			severity: 'error'
		};
	});
}

function walkStrings(
	value: unknown,
	path: string,
	visit: (path: string, value: string) => void
): void {
	if (typeof value === 'string') {
		visit(path, value);
		return;
	}
	if (Array.isArray(value)) {
		value.forEach((item, index) => walkStrings(item, `${path}.${index}`, visit));
		return;
	}
	if (value && typeof value === 'object') {
		for (const [key, item] of Object.entries(value)) {
			walkStrings(item, path ? `${path}.${key}` : key, visit);
		}
	}
}

function normalize(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Content identity for the bank-level duplicate check, ignoring IDs and review
 * metadata. Only complete questions are compared, so blank drafts do not all
 * look like duplicates. Options are sorted so authoring-order chnges do not
 * hide a copy, and the correct option's text is part of the signature
 */
export function contentSignature(question: Question): string | null {
	const stem = normalize(question.stem);
	if (!stem) return null;

	const optionTexts = question.options.map((option) => normalize(option.text));
	if (optionTexts.length < 2 || optionTexts.some((text) => !text)) return null;

	const correct = question.options.find(
		(option) => option.id.trim() === question.correctOptionId.trim()
	);
	if (!correct) return null;

	return [stem, ...optionTexts.sort(), normalize(correct.text)].join('\u0000');
}

/**
 * Field-level rules that a relational database cannot enforce cheaply.
 */
export function validateQuestion(question: Question, ctx: QuestionContext): Issue[] {
	const issues: Issue[] = [];

	const parsed = questionSchema.safeParse(question);
	if (!parsed.success) issues.push(...zodIssues(parsed.error));

	const options = question.options;
	const optionIds = options.map((option) => option.id.trim()).filter(Boolean);
	if (new Set(optionIds).size !== optionIds.length) {
		issues.push({
			path: 'options',
			message: 'Option IDs must be unique within the question.',
			severity: 'error'
		});
	}

	const optionTexts = options.map((option) => normalize(option.text)).filter(Boolean);
	if (new Set(optionTexts).size !== optionTexts.length) {
		issues.push({
			path: 'options',
			message: 'Two options have the same text.',
			severity: 'error'
		});
	}

	if (
		question.correctOptionId &&
		!options.some((option) => option.id.trim() === question.correctOptionId.trim())
	) {
		issues.push({
			path: 'correctOptionId',
			message: 'The correct answer must be one of the option IDs.',
			severity: 'error'
		});
	}

	if (ctx.bankKind === 'exam' && options.length !== ctx.optionCount) {
		issues.push({
			path: 'options',
			message: `This exam bank uses exactly ${ctx.optionCount} options per question.`,
			severity: 'error'
		});
	}

	if (question.module && !ctx.moduleIds.includes(question.module)) {
		issues.push({
			path: 'module',
			message: 'Choose a module that exists in the bank settings.',
			severity: 'error'
		});
	}

	if (question.id && !question.id.startsWith(`${ctx.examSlug}-`)) {
		issues.push({
			path: 'id',
			message: `Question IDs start with the exam slug (${ctx.examSlug}-).`,
			severity: 'error'
		});
	}

	if (question.id && ctx.otherQuestionIds.includes(question.id)) {
		issues.push({
			path: 'id',
			message: 'Another question already uses this ID.',
			severity: 'error'
		});
	}

	const referenceUrls = question.references
		.map((reference) => normalize(reference.url ?? ''))
		.filter(Boolean);
	if (new Set(referenceUrls).size !== referenceUrls.length) {
		issues.push({
			path: 'references',
			message: 'Each reference URL can appear only once.',
			severity: 'error'
		});
	}

	if (question.status === 'published') {
		if (!question.reviewer) {
			issues.push({
				path: 'reviewer',
				message: 'A published question needs a reviewer.',
				severity: 'error'
			});
		}
		if (!question.reviewedAt) {
			issues.push({
				path: 'reviewedAt',
				message: 'A published question needs a review date.',
				severity: 'error'
			});
		}
		if (!question.sourceCheckedAt) {
			issues.push({
				path: 'sourceCheckedAt',
				message: 'A published question needs a source-check date.',
				severity: 'error'
			});
		}
	}

	// Placeholders must never reach a bank.
	walkStrings(question, '', (path, value) => {
		if (/\bTODO\b/.test(value)) {
			issues.push({
				path,
				message: 'Replace the TODO placeholder with real content.',
				severity: 'error'
			});
		}
	});

	if (/\b(?:option|answer)\s*#?\s*[1-4]\b/i.test(question.explanation)) {
		issues.push({
			path: 'explanation',
			message: 'Do not refer to option numbers; learners see a shuffled order.',
			severity: 'warning'
		});
	}

	return issues;
}

/** Format a path for a human, e.g. `options.0.text` → `Option 1 text`. */
export function humanizePath(path: string): string {
	const acronyms: Record<string, string> = { id: 'ID', url: 'URL' };
	const fieldLabels: Record<string, string> = {
		stem: 'Question text',
		kind: 'Source type',
		note: 'Justification note'
	};
	const parts = path.split('.').filter(Boolean);
	const labels: string[] = [];
	for (let index = 0; index < parts.length; index++) {
		const part = parts[index];
		const next = parts[index + 1];
		if (part === 'options' && next !== undefined) {
			labels.push(`Option ${Number(next) + 1}`);
			index++;
		} else if (part === 'references' && next !== undefined) {
			labels.push(`Reference ${Number(next) + 1}`);
			index++;
		} else if (part === 'images' && next !== undefined) {
			labels.push(`Image ${Number(next) + 1}`);
			index++;
		} else if (part === 'tags' && next !== undefined) {
			labels.push(`Tag ${Number(next) + 1}`);
			index++;
		} else if (fieldLabels[part]) {
			labels.push(fieldLabels[part]);
		} else if (acronyms[part]) {
			labels.push(acronyms[part]);
		} else {
			const words = part
				.replace(/([A-Z])/g, ' $1')
				.toLowerCase()
				.split(' ')
				.filter(Boolean)
				.map((word) => acronyms[word] ?? word);
			const label = words.join(' ');
			const afterIndex = /^(?:Option|Reference|Image|Tag) \d+$/.test(labels.at(-1) ?? '');
			labels.push(afterIndex ? label : label.charAt(0).toUpperCase() + label.slice(1));
		}
	}
	return labels.join(' ');
}

/** Issues attached to a specific field, including nested fields. */
export function issuesAt(issues: Issue[], path: string): Issue[] {
	return issues.filter((issue) => issue.path === path || issue.path.startsWith(`${path}.`));
}

export function hasErrors(issues: Issue[]): boolean {
	return issues.some((issue) => issue.severity === 'error');
}

/**
 * Bank-level checks used before exporting the whole file: bank settings plus
 * every question, with IDs checked against the rest of the bank.
 */
export function collectBankIssues(bank: BankSettings, questions: Question[]): Issue[] {
	const issues: Issue[] = [];
	const settings = bankSettingsSchema.safeParse(bank);
	if (!settings.success) issues.push(...zodIssues(settings.error));

	const moduleIds = bank.modules.map((module) => module.id);
	questions.forEach((question, index) => {
		const otherQuestionIds = questions
			.filter((_item, otherIndex) => otherIndex !== index)
			.map((item) => item.id);
		const questionIssues = validateQuestion(question, {
			examSlug: bank.examSlug,
			bankKind: bank.kind,
			optionCount: bank.optionCount,
			moduleIds,
			otherQuestionIds
		});
		issues.push(
			...questionIssues.map((issue) => ({
				...issue,
				path: issue.path ? `questions.${index}.${issue.path}` : `questions.${index}`
			}))
		);
	});

	if (questions.length === 0) {
		issues.push({
			path: 'questions',
			message: 'Add at least one question before exporting the bank.',
			severity: 'error'
		});
	}

	const seenContent = new Map<string, Question>();
	questions.forEach((question, index) => {
		const signature = contentSignature(question);
		if (!signature) return;

		const match = seenContent.get(signature);
		if (match) {
			issues.push({
				path: `questions.${index}`,
				message: `This question has the same content as ${match.id || 'an earlier question'}. A bank must not contain the same question twice.`,
				severity: 'error'
			});
		} else {
			seenContent.set(signature, question);
		}
	});

	if (bank.kind === 'exam') {
		const usedModules = new Set(questions.map((question) => question.module));
		bank.modules.forEach((module, index) => {
			if (!usedModules.has(module.id)) {
				issues.push({
					path: `modules.${index}`,
					message: `The ${module.id} module has no questions yet.`,
					severity: 'warning'
				});
			}
		});
	}

	return issues;
}

export { zodIssues };
