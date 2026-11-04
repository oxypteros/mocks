CREATE TABLE `banks` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`version` text DEFAULT '0.1.0' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "banks_kind_check" CHECK("banks"."kind" in ('exam', 'practice', 'demo')),
	CONSTRAINT "banks_status_check" CHECK("banks"."status" in ('draft', 'published', 'retired'))
);
--> statement-breakpoint
CREATE INDEX `banks_exam_id_idx` ON `banks` (`exam_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `banks_exam_id_id_unique` ON `banks` (`exam_id`,`id`);--> statement-breakpoint
CREATE TABLE `exams` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`provider` text NOT NULL,
	`provider_url` text,
	`unofficial` integer DEFAULT true NOT NULL,
	`content_locale` text DEFAULT 'en' NOT NULL,
	`blueprint_version` text DEFAULT 'TBD' NOT NULL,
	`duration_minutes` integer NOT NULL,
	`question_count` integer NOT NULL,
	`option_count` integer NOT NULL,
	`pass_percent` integer NOT NULL,
	`sampling` text DEFAULT 'stratified' NOT NULL,
	`question_order` text DEFAULT 'mixed' NOT NULL,
	`option_order` text DEFAULT 'shuffle' NOT NULL,
	`option_label_style` text DEFAULT 'numeric' NOT NULL,
	`disclaimer` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "exams_duration_check" CHECK("exams"."duration_minutes" > 0),
	CONSTRAINT "exams_question_count_check" CHECK("exams"."question_count" > 0),
	CONSTRAINT "exams_option_count_check" CHECK("exams"."option_count" >= 2),
	CONSTRAINT "exams_pass_percent_check" CHECK("exams"."pass_percent" between 0 and 100),
	CONSTRAINT "exams_sampling_check" CHECK("exams"."sampling" in ('stratified', 'random')),
	CONSTRAINT "exams_question_order_check" CHECK("exams"."question_order" in ('mixed', 'grouped')),
	CONSTRAINT "exams_option_order_check" CHECK("exams"."option_order" in ('shuffle', 'fixed')),
	CONSTRAINT "exams_option_label_style_check" CHECK("exams"."option_label_style" in ('numeric', 'alpha', 'none')),
	CONSTRAINT "exams_status_check" CHECK("exams"."status" in ('draft', 'published', 'retired'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exams_slug_unique` ON `exams` (`slug`);--> statement-breakpoint
CREATE TABLE `modules` (
	`id` text NOT NULL,
	`bank_id` text NOT NULL,
	`title` text NOT NULL,
	`position` integer NOT NULL,
	`question_count` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`bank_id`, `id`),
	FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "modules_position_check" CHECK("modules"."position" >= 0),
	CONSTRAINT "modules_question_count_check" CHECK("modules"."question_count" is null or "modules"."question_count" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `modules_bank_position_unique` ON `modules` (`bank_id`,`position`);--> statement-breakpoint
CREATE TABLE `options` (
	`id` text NOT NULL,
	`question_id` text NOT NULL,
	`position` integer NOT NULL,
	`text` text NOT NULL,
	`short_label` text NOT NULL,
	`rationale` text NOT NULL,
	`is_correct` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`question_id`, `id`),
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "options_position_check" CHECK("options"."position" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `options_question_position_unique` ON `options` (`question_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `options_one_correct_unique` ON `options` (`question_id`) WHERE "options"."is_correct" = 1;--> statement-breakpoint
CREATE TABLE `question_images` (
	`question_id` text NOT NULL,
	`position` integer NOT NULL,
	`r2_key` text NOT NULL,
	`alt` text NOT NULL,
	`long_description` text,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	PRIMARY KEY(`question_id`, `position`),
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "question_images_position_check" CHECK("question_images"."position" >= 0),
	CONSTRAINT "question_images_width_check" CHECK("question_images"."width" > 0),
	CONSTRAINT "question_images_height_check" CHECK("question_images"."height" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `question_images_r2_key_unique` ON `question_images` (`r2_key`);--> statement-breakpoint
CREATE TABLE `question_references` (
	`question_id` text NOT NULL,
	`position` integer NOT NULL,
	`kind` text DEFAULT 'web' NOT NULL,
	`title` text NOT NULL,
	`url` text,
	`author` text,
	`year` text,
	`note` text,
	PRIMARY KEY(`question_id`, `position`),
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "question_references_position_check" CHECK("question_references"."position" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `question_references_question_url_unique` ON `question_references` (`question_id`,`url`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`bank_id` text NOT NULL,
	`module_id` text NOT NULL,
	`type` text DEFAULT 'single' NOT NULL,
	`stem` text NOT NULL,
	`explanation` text NOT NULL,
	`difficulty` integer DEFAULT 1 NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`provenance` text DEFAULT 'authored' NOT NULL,
	`reviewer` text,
	`reviewed_at` integer,
	`source_checked_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`bank_id`,`module_id`) REFERENCES `modules`(`bank_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`exam_id`,`bank_id`) REFERENCES `banks`(`exam_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "questions_type_check" CHECK("questions"."type" in ('single')),
	CONSTRAINT "questions_difficulty_check" CHECK("questions"."difficulty" between 1 and 5),
	CONSTRAINT "questions_status_check" CHECK("questions"."status" in ('draft', 'review', 'published', 'retired')),
	CONSTRAINT "questions_provenance_check" CHECK("questions"."provenance" in ('authored', 'llm_assisted'))
);
--> statement-breakpoint
CREATE INDEX `questions_bank_module_status_idx` ON `questions` (`bank_id`,`module_id`,`status`);--> statement-breakpoint
CREATE INDEX `questions_exam_status_idx` ON `questions` (`exam_id`,`status`);