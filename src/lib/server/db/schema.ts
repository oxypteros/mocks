import { sql } from 'drizzle-orm';
import {
	check,
	foreignKey,
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
	uniqueIndex
} from 'drizzle-orm/sqlite-core';

/**
 * Mocks content schema (v0).
 *
 * This schema stores the official question bank only. Attempts and results are
 * intentionally absent: v0 keeps them in the browser for the duration of the
 * exam.
 *
 * Naming: `snake_case` in SQLite, `camelCase` in TypeScript.
 */

const timestamps = () => ({
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch() * 1000)`)
		// App-side: Drizzle sets this on update() calls. Raw SQL and seed scripts
		// must set it explicitly.
		.$onUpdate(() => new Date())
});

/**
 * An exam is the product-level entry (for example CPACC).
 *
 * Format fields are configuration, not constants. Another exam can be different
 * e.g. one module, 80 questions, 60 minutes, and a different pass threshold
 * without a code change (exam agnostic).
 */
export const exams = sqliteTable(
	'exams',
	{
		/** Stable identifier, for example `cpacc` */
		id: text('id').primaryKey(),
		/** URL-safe stable slug. May equal `id` (kept separate for future renames) */
		slug: text('slug').notNull(),
		title: text('title').notNull(),
		provider: text('provider').notNull(),
		/**
		 * The provider's own page for this exam, linked from the practice-exam
		 * notice. Null when the provider has no canonical page, the notice then
		 * renders without a link instead of guessing a URL.
		 */
		providerUrl: text('provider_url'),
		/** Mocks is unofficial! the UI must say so */
		unofficial: integer('unofficial', { mode: 'boolean' }).notNull().default(true),
		contentLocale: text('content_locale').notNull().default('en'),
		/** Blueprint/Body of Knowledge edition this bank targets. */
		blueprintVersion: text('blueprint_version').notNull().default('TBD'),
		durationMinutes: integer('duration_minutes').notNull(),
		questionCount: integer('question_count').notNull(),
		optionCount: integer('option_count').notNull(),
		/** Fixed Mocks threshold, not an official scaled score. */
		passPercent: integer('pass_percent').notNull(),
		sampling: text('sampling').notNull().default('stratified'),
		questionOrder: text('question_order').notNull().default('mixed'),
		optionOrder: text('option_order').notNull().default('shuffle'),
		optionLabelStyle: text('option_label_style').notNull().default('numeric'),
		disclaimer: text('disclaimer').notNull(),
		status: text('status').notNull().default('draft'),
		...timestamps()
	},
	(table) => [
		uniqueIndex('exams_slug_unique').on(table.slug),
		check('exams_duration_check', sql`${table.durationMinutes} > 0`),
		check('exams_question_count_check', sql`${table.questionCount} > 0`),
		check('exams_option_count_check', sql`${table.optionCount} >= 2`),
		check('exams_pass_percent_check', sql`${table.passPercent} between 0 and 100`),
		check('exams_sampling_check', sql`${table.sampling} in ('stratified', 'random')`),
		check('exams_question_order_check', sql`${table.questionOrder} in ('mixed', 'grouped')`),
		check('exams_option_order_check', sql`${table.optionOrder} in ('shuffle', 'fixed')`),
		check(
			'exams_option_label_style_check',
			sql`${table.optionLabelStyle} in ('numeric', 'alpha', 'none')`
		),
		check('exams_status_check', sql`${table.status} in ('draft', 'published', 'retired')`)
	]
);

/**
 * A bank is a publishable question pool for an exam. v0 has `cpacc-exam` and
 * `cpacc-practice`. Separating banks now avoids mixing exam and practice pools
 * later.
 *
 * Deletion policy: parents use RESTRICT, so deleting an exam with banks or a
 * bank with questions fails. Retire content with `status` instead. Child rows
 * (options, references, images) cascade only when a question is deleted.
 */
export const banks = sqliteTable(
	'banks',
	{
		/** Stable bank ID, for example `cpacc-exam`. */
		id: text('id').primaryKey(),
		examId: text('exam_id')
			.notNull()
			.references(() => exams.id, { onDelete: 'restrict' }),
		kind: text('kind').notNull(),
		title: text('title').notNull(),
		version: text('version').notNull().default('0.1.0'),
		status: text('status').notNull().default('draft'),
		...timestamps()
	},
	(table) => [
		index('banks_exam_id_idx').on(table.examId),
		// Needed as the parent key for questions' composite FK
		uniqueIndex('banks_exam_id_id_unique').on(table.examId, table.id),
		check('banks_kind_check', sql`${table.kind} in ('exam', 'practice', 'demo')`),
		check('banks_status_check', sql`${table.status} in ('draft', 'published', 'retired')`)
	]
);

/**
 * Exam modules and their draw counts. Modules are bank-scoped, so the
 * practice bank can declare its own categories. `question_count` is the exam-mode
 * draw count and is set only for exam-bank modules, practice modules leave it
 * null. Module counts must sum to `exams.question_count`, that is enforced by
 * publish validation because SQLite cannot express it cheaply.
 */
export const modules = sqliteTable(
	'modules',
	{
		/** Module ID within a bank, for example `disabilities`. */
		id: text('id').notNull(),
		bankId: text('bank_id')
			.notNull()
			.references(() => banks.id, { onDelete: 'restrict' }),
		title: text('title').notNull(),
		position: integer('position').notNull(),
		/** Exam draw count, null for practice modules */
		questionCount: integer('question_count'),
		...timestamps()
	},
	(table) => [
		primaryKey({ columns: [table.bankId, table.id] }),
		uniqueIndex('modules_bank_position_unique').on(table.bankId, table.position),
		check('modules_position_check', sql`${table.position} >= 0`),
		check(
			'modules_question_count_check',
			sql`${table.questionCount} is null or ${table.questionCount} > 0`
		)
	]
);

/**
 * A question belongs to one exam, one bank, and one module. One composite
 * foreign key keeps the bank in the exam, another keeps the module in the bank.
 */
export const questions = sqliteTable(
	'questions',
	{
		/** Stable global ID, e.g. `cpacc-exam-disabilities-0001`. */
		id: text('id').primaryKey(),
		examId: text('exam_id').notNull(),
		bankId: text('bank_id').notNull(),
		moduleId: text('module_id').notNull(),
		/** v0 supports single-choice only. */
		type: text('type').notNull().default('single'),
		/** Markdown: sanitised before rendering. */
		stem: text('stem').notNull(),
		/** Shared lesson: must not reference option numbers. */
		explanation: text('explanation').notNull(),
		difficulty: integer('difficulty').notNull().default(1),
		tags: text('tags', { mode: 'json' })
			.$type<string[]>()
			.notNull()
			.default(sql`'[]'`),
		status: text('status').notNull().default('draft'),
		provenance: text('provenance').notNull().default('authored'),
		reviewer: text('reviewer'),
		reviewedAt: integer('reviewed_at', { mode: 'timestamp_ms' }),
		sourceCheckedAt: integer('source_checked_at', { mode: 'timestamp_ms' }),
		...timestamps()
	},
	(table) => [
		foreignKey({
			columns: [table.bankId, table.moduleId],
			foreignColumns: [modules.bankId, modules.id],
			name: 'questions_module_fk'
		}).onDelete('restrict'),
		foreignKey({
			columns: [table.examId, table.bankId],
			foreignColumns: [banks.examId, banks.id],
			name: 'questions_bank_fk'
		}).onDelete('restrict'),
		index('questions_bank_module_status_idx').on(table.bankId, table.moduleId, table.status),
		index('questions_exam_status_idx').on(table.examId, table.status),
		check('questions_type_check', sql`${table.type} in ('single')`),
		check('questions_difficulty_check', sql`${table.difficulty} between 1 and 5`),
		check(
			'questions_status_check',
			sql`${table.status} in ('draft', 'review', 'published', 'retired')`
		),
		check('questions_provenance_check', sql`${table.provenance} in ('authored', 'llm_assisted')`)
	]
);

/**
 * Options are stored in authoring order: display order is shuffled per attempt
 * and never stored. IDs are unique within a question.
 *
 * `options_one_correct_unique` enforces at most one correct option per
 * question. Publish validation enforces at least one.
 */
export const options = sqliteTable(
	'options',
	{
		/** Stable option ID within the question, e.g. `medical-model`. */
		id: text('id').notNull(),
		questionId: text('question_id')
			.notNull()
			.references(() => questions.id, { onDelete: 'cascade' }),
		/** Authoring order only, not exam order. */
		position: integer('position').notNull(),
		/** Full option text (Markdown, may be multiline). */
		text: text('text').notNull(),
		/** One-line answer reference used in feedback. */
		shortLabel: text('short_label').notNull(),
		/** Why this specific option is right or wrong (the teaching portion). */
		rationale: text('rationale').notNull(),
		isCorrect: integer('is_correct', { mode: 'boolean' }).notNull().default(false)
	},
	(table) => [
		primaryKey({ columns: [table.questionId, table.id] }),
		uniqueIndex('options_question_position_unique').on(table.questionId, table.position),
		uniqueIndex('options_one_correct_unique')
			.on(table.questionId)
			.where(sql`${table.isCorrect} = 1`),
		check('options_position_check', sql`${table.position} >= 0`)
	]
);

/** Sources supporting a question. At least one is required at publish time. */
export const questionReferences = sqliteTable(
	'question_references',
	{
		questionId: text('question_id')
			.notNull()
			.references(() => questions.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		/** `web`, `publication`, or `general`. */
		kind: text('kind').notNull().default('web'),
		title: text('title').notNull(),
		/** Nullable: only web and some publication references have a URL. */
		url: text('url'),
		/** Publication author or publisher. */
		author: text('author'),
		/** Four-digit publication year. */
		year: text('year'),
		/** Why a general claim is not made up. Should be verifiable. */
		note: text('note')
	},
	(table) => [
		primaryKey({ columns: [table.questionId, table.position] }),
		uniqueIndex('question_references_question_url_unique').on(table.questionId, table.url),
		check('question_references_position_check', sql`${table.position} >= 0`)
	]
);

/**
 * Images are deferred for latter version, the table exists so the contract does
 * not need a migration when images are introduced. No rows in v0.
 */
export const questionImages = sqliteTable(
	'question_images',
	{
		questionId: text('question_id')
			.notNull()
			.references(() => questions.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		/** Logical key resolved through R2. */
		r2Key: text('r2_key').notNull(),
		/** Required: describes the information needed to answer. */
		alt: text('alt').notNull(),
		/** Optional long description for complex images. */
		longDescription: text('long_description'),
		width: integer('width').notNull(),
		height: integer('height').notNull()
	},
	(table) => [
		primaryKey({ columns: [table.questionId, table.position] }),
		uniqueIndex('question_images_r2_key_unique').on(table.r2Key),
		check('question_images_position_check', sql`${table.position} >= 0`),
		check('question_images_width_check', sql`${table.width} > 0`),
		check('question_images_height_check', sql`${table.height} > 0`)
	]
);
