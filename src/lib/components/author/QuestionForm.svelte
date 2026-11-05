<script lang="ts">
	import Button from '#lib/components/ui/Buttons.svelte';
	import {
		issuesAt,
		QUESTION_STATUSES,
		PROVENANCES,
		REFERENCE_KINDS,
		type BankSettings,
		type Issue,
		type Question,
		type QuestionReference,
		type ReferenceKind
	} from '#lib/authoring/schema';
	import { nextOptionId, parseTags, suggestQuestionId } from '#lib/authoring/workspace';

	type QuestionFormProps = {
		question: Question;
		bank: BankSettings;
		issues: Issue[];
		/** IDs of the other questions in the bank, used by "Suggest ID". */
		otherQuestionIds: string[];
	};

	let { question = $bindable(), bank, issues, otherQuestionIds }: QuestionFormProps = $props();

	const inputClass =
		'oxy-focus mt-1 w-full rounded border-2 border-on-surface-muted bg-surface-accent px-3 py-2 text-sm text-on-surface';
	const labelClass = 'block text-sm font-semibold text-on-surface';
	const hintClass = 'mt-1 text-xs text-on-surface';

	function errorId(path: string): string {
		return `field-error-${path.replace(/[^a-z0-9]+/gi, '-')}`;
	}

	function fieldIssues(path: string): Issue[] {
		return issuesAt(issues, path);
	}

	function hasError(path: string): boolean {
		return fieldIssues(path).some((issue) => issue.severity === 'error');
	}

	function describedBy(path: string): string | undefined {
		return fieldIssues(path).length > 0 ? errorId(path) : undefined;
	}

	function describedByIds(...ids: (string | undefined)[]): string | undefined {
		return ids.filter((id): id is string => Boolean(id)).join(' ') || undefined;
	}

	function suggestId(): void {
		question.id = suggestQuestionId(
			bank.id,
			question.module,
			otherQuestionIds.map((id) => ({ id }))
		);
	}

	function addOption(): void {
		question.options.push({
			id: nextOptionId(question.options),
			text: '',
			shortLabel: '',
			rationale: ''
		});
	}

	function removeOption(index: number): void {
		const [removed] = question.options.splice(index, 1);
		if (removed && question.correctOptionId === removed.id) {
			question.correctOptionId = '';
		}
	}

	function updateTags(event: Event): void {
		question.tags = parseTags((event.currentTarget as HTMLInputElement).value);
	}

	function updateNullable(event: Event, assign: (value: string | null) => void): void {
		const value = (event.currentTarget as HTMLInputElement).value.trim();
		assign(value || null);
	}

	const referenceKindHints: Record<ReferenceKind, string> = {
		web: 'A page, online report, or standard you can link to. A URL is required.',
		publication:
			'A book, article, standard, or report identified by author or publisher and year. A URL or DOI is optional.',
		general:
			'Background knowledge whose warrant does not depend on a single document. Explain why it survives without one.'
	};

	function addReference(): void {
		question.references.push({ kind: 'web', title: '', url: '' });
	}

	function removeReference(index: number): void {
		question.references.splice(index, 1);
	}

	function referenceKind(reference: QuestionReference): ReferenceKind {
		return reference.kind ?? 'web';
	}

	/** Clear fields that do not belong to the newly chosen source type. */
	function updateReferenceKind(reference: QuestionReference, kind: ReferenceKind): void {
		reference.kind = kind;
		if (kind === 'web') {
			reference.author = undefined;
			reference.year = undefined;
			reference.note = undefined;
		} else if (kind === 'publication') {
			reference.note = undefined;
		} else {
			reference.url = undefined;
			reference.author = undefined;
			reference.year = undefined;
		}
	}

	function updateReferenceField(
		reference: QuestionReference,
		field: 'url' | 'author' | 'year' | 'note',
		value: string
	): void {
		reference[field] = value === '' ? undefined : value;
	}
</script>

{#snippet fieldErrors(path: string)}
	{@const found = fieldIssues(path)}
	{#if found.length > 0}
		<div id={errorId(path)} class="mt-1 space-y-0.5 text-xs font-semibold">
			{#each found as issue, index (index)}
				<p class={issue.severity === 'error' ? 'text-on-wrong-surface' : 'text-primary-accent'}>
					{issue.severity === 'error' ? 'Error:' : 'Warning:'}
					{issue.message}
				</p>
			{/each}
		</div>
	{/if}
{/snippet}

<div class="space-y-8">
	<section aria-labelledby="identity-heading">
		<h2 id="identity-heading" class="text-lg font-bold text-on-surface">Identity</h2>

		<div class="mt-3 grid gap-6 sm:grid-cols-2">
			<div class="sm:col-span-2">
				<label class={labelClass} for="question-id">Question ID</label>
				<div class="flex flex-wrap items-start gap-2">
					<input
						autocomplete="off"
						id="question-id"
						class={inputClass}
						bind:value={question.id}
						aria-invalid={hasError('id') ? 'true' : undefined}
						aria-describedby={describedBy('id')}
					/>
					<Button variant="secondary" size="sm" type="button" class="mt-1" onclick={suggestId}>
						Suggest next ID
					</Button>
				</div>
				<p class={hintClass}>Stable ID. Format: exam-module-0000.</p>
				{@render fieldErrors('id')}
			</div>

			<div>
				<label class={labelClass} for="question-module">Module</label>
				<select
					autocomplete="off"
					id="question-module"
					class={inputClass}
					bind:value={question.module}
					aria-invalid={hasError('module') ? 'true' : undefined}
					aria-describedby={describedBy('module')}
				>
					{#if question.module && !bank.modules.some((module) => module.id === question.module)}
						<option value={question.module}>{question.module} (missing from bank)</option>
					{/if}
					{#each bank.modules as module (module.id)}
						<option value={module.id}>{module.title || module.id}</option>
					{/each}
				</select>
				{@render fieldErrors('module')}
			</div>

			<div>
				<label class={labelClass} for="question-difficulty">Difficulty</label>
				<select
					autocomplete="off"
					id="question-difficulty"
					class={inputClass}
					bind:value={question.difficulty}
				>
					{#each [1, 2, 3, 4, 5] as level (level)}
						<option value={level}>{level}</option>
					{/each}
				</select>
				<p class={hintClass}>1 = easy, 5 = hard. Used for balance, not scoring.</p>
			</div>

			<div>
				<label class={labelClass} for="question-status">Question status</label>
				<select
					autocomplete="off"
					id="question-status"
					class={inputClass}
					bind:value={question.status}
					aria-invalid={hasError('status') ? 'true' : undefined}
					aria-describedby={describedBy('status')}
				>
					{#each QUESTION_STATUSES as status (status)}
						<option value={status}>{status}</option>
					{/each}
				</select>
				{@render fieldErrors('status')}
			</div>

			<div>
				<label class={labelClass} for="question-provenance">Provenance</label>
				<select
					autocomplete="off"
					id="question-provenance"
					class={inputClass}
					bind:value={question.provenance}
				>
					{#each PROVENANCES as provenance (provenance)}
						<option value={provenance}>{provenance.replace('_', ' ')}</option>
					{/each}
				</select>
			</div>

			<div class="sm:col-span-2">
				<label class={labelClass} for="question-tags">Tags</label>
				<input
					autocomplete="off"
					id="question-tags"
					class={inputClass}
					value={question.tags.join(', ')}
					onchange={updateTags}
					aria-describedby="question-tags-hint"
				/>
				<p id="question-tags-hint" class={hintClass}>
					Comma-separated, for review and future drills.
				</p>
			</div>
		</div>
	</section>

	<section aria-labelledby="content-heading">
		<h2 id="content-heading" class="text-lg font-bold text-on-surface">Question</h2>
		<p class={hintClass}>
			Markdown is supported in the question text, options, explanation, and rationales: bold,
			italic, inline code, and fenced code blocks. Links and raw HTML are shown as plain text.
		</p>

		<div class="mt-3">
			<label class={labelClass} for="question-stem">Question text</label>
			<textarea
				autocomplete="off"
				id="question-stem"
				class={inputClass}
				rows="2"
				bind:value={question.stem}
				aria-invalid={hasError('stem') ? 'true' : undefined}
				aria-describedby={['question-stem-hint', describedBy('stem')]
					.filter((id): id is string => Boolean(id))
					.join(' ') || undefined}></textarea>
			<p id="question-stem-hint" class={hintClass}>
				The prompt shown before the options (the stem in assessment authoring). One question, plain
				language, and no dependence on colour or position.
			</p>
			{@render fieldErrors('stem')}
		</div>

		<fieldset class="mt-6 rounded border-2 border-on-surface-muted bg-surface-accent p-4">
			<legend class="px-1 text-base font-bold text-on-surface">Options</legend>
			<p class="text-xs text-on-surface-muted">
				Authoring order only. Learners see a shuffled order and labels derived at render time
				(position is not stored).
			</p>
			{#if bank.kind === 'exam'}
				<p class="mt-1 text-xs font-semibold text-on-surface-muted">
					This exam bank uses exactly {bank.optionCount} options per question.
				</p>
			{/if}
			{@render fieldErrors('options')}
			{@render fieldErrors('correctOptionId')}

			<div class="mt-4 space-y-4">
				{#each question.options as option, index (index)}
					<fieldset class="rounded border border-on-surface-muted bg-light p-3">
						<legend class="px-1 text-sm font-bold text-on-surface">Option {index + 1}</legend>

						<div>
							<label class={labelClass} for={`option-${index}-text`}>
								<span class="sr-only">Option {index + 1} </span>Text
							</label>
							<textarea
								autocomplete="off"
								id={`option-${index}-text`}
								class={inputClass}
								rows="2"
								bind:value={option.text}
								aria-invalid={hasError(`options.${index}.text`) ? 'true' : undefined}
								aria-describedby={describedBy(`options.${index}.text`)}></textarea>
							{@render fieldErrors(`options.${index}.text`)}
						</div>

						<div class="mt-3 grid gap-3 sm:grid-cols-2">
							<div>
								<label class={labelClass} for={`option-${index}-short`}>
									<span class="sr-only">Option {index + 1} </span>Short label
								</label>
								<input
									autocomplete="off"
									id={`option-${index}-short`}
									class={inputClass}
									bind:value={option.shortLabel}
									aria-invalid={hasError(`options.${index}.shortLabel`) ? 'true' : undefined}
									aria-describedby={describedBy(`options.${index}.shortLabel`)}
								/>
								<p class={hintClass}>Used in feedback when referring to this answer.</p>
								{@render fieldErrors(`options.${index}.shortLabel`)}
							</div>

							<div class="mt-4 flex items-center justify-center">
								<label class="flex items-center gap-2 pb-2 text-sm font-semibold text-on-surface">
									<input
										type="radio"
										name="correct-option"
										value={option.id}
										bind:group={question.correctOptionId}
										class="size-4 accent-on-correct-surface"
									/>
									<span><span class="sr-only">Option {index + 1} </span>Mark as correct answer</span
									>
								</label>
							</div>
						</div>

						<div class="mt-3">
							<label class={labelClass} for={`option-${index}-rationale`}>
								<span class="sr-only">Option {index + 1} </span>Rationale
							</label>
							<textarea
								autocomplete="off"
								id={`option-${index}-rationale`}
								class={inputClass}
								rows="2"
								bind:value={option.rationale}
								aria-invalid={hasError(`options.${index}.rationale`) ? 'true' : undefined}
								aria-describedby={describedBy(`options.${index}.rationale`)}></textarea>
							{@render fieldErrors(`options.${index}.rationale`)}
						</div>

						<div class="mt-3">
							<label class={labelClass} for={`option-${index}-id`}>
								<span class="sr-only">Option {index + 1} </span>ID
							</label>
							<input
								autocomplete="off"
								id={`option-${index}-id`}
								class={inputClass}
								bind:value={option.id}
								aria-invalid={hasError(`options.${index}.id`) ? 'true' : undefined}
								aria-describedby={describedBy(`options.${index}.id`)}
							/>
							<p class={hintClass}>Stable within the question, for example social-model.</p>
							{@render fieldErrors(`options.${index}.id`)}
						</div>

						{#if bank.kind !== 'exam'}
							<div class="mt-3">
								<Button
									variant="ghost"
									size="sm"
									type="button"
									disabled={question.options.length <= 2}
									onclick={() => removeOption(index)}
								>
									Remove option {index + 1}
								</Button>
							</div>
						{/if}
					</fieldset>
				{/each}
			</div>

			{#if bank.kind !== 'exam'}
				<div class="mt-4">
					<Button variant="secondary" size="sm" type="button" onclick={addOption}>
						Add option
					</Button>
				</div>
			{/if}
		</fieldset>

		<div class="mt-6">
			<label class={labelClass} for="question-explanation">Explanation</label>
			<textarea
				autocomplete="off"
				id="question-explanation"
				class={inputClass}
				rows="3"
				bind:value={question.explanation}
				aria-invalid={hasError('explanation') ? 'true' : undefined}
				aria-describedby={describedBy('explanation')}></textarea>
			<p class={hintClass}>
				The shared lesson for every learner. Do not mention option numbers or labels.
			</p>
			{@render fieldErrors('explanation')}
		</div>
	</section>

	<section aria-labelledby="references-heading">
		<h2 id="references-heading" class="text-lg font-bold text-on-surface">References</h2>
		<p class="text-xs text-on-surface-muted">
			At least one source per question. Use a website or publication when a named document defines,
			requires, or reports the claim; use general knowledge only for background that survives
			without one.
		</p>
		{@render fieldErrors('references')}

		<div class="mt-3 space-y-3">
			{#each question.references as reference, index (index)}
				<fieldset class="rounded border border-on-surface-muted bg-light p-3">
					<legend class="px-1 text-sm font-bold text-on-surface">Reference {index + 1}</legend>

					<div class="">
						<label class={labelClass} for={`reference-${index}-kind`}>
							<span class="sr-only">Reference {index + 1} </span>Source type
						</label>
						<select
							autocomplete="off"
							id={`reference-${index}-kind`}
							class={inputClass}
							value={referenceKind(reference)}
							aria-describedby={`reference-${index}-kind-hint`}
							onchange={(event) =>
								updateReferenceKind(reference, event.currentTarget.value as ReferenceKind)}
						>
							{#each REFERENCE_KINDS as kind (kind)}
								<option value={kind}>
									{kind === 'web'
										? 'Website or online report'
										: kind === 'publication'
											? 'Book, article, or standard'
											: 'Widely established knowledge'}
								</option>
							{/each}
						</select>
						<p id={`reference-${index}-kind-hint`} class={hintClass} role="status">
							{referenceKindHints[referenceKind(reference)]}
						</p>
					</div>

					<div class="mt-3">
						<label class={labelClass} for={`reference-${index}-title`}>
							<span class="sr-only">Reference {index + 1} </span>
							{referenceKind(reference) === 'general' ? 'Claim or topic' : 'Title'}
						</label>
						<input
							autocomplete="off"
							id={`reference-${index}-title`}
							class={inputClass}
							bind:value={reference.title}
							aria-invalid={hasError(`references.${index}.title`) ? 'true' : undefined}
							aria-describedby={describedBy(`references.${index}.title`)}
						/>
						{@render fieldErrors(`references.${index}.title`)}
					</div>

					{#if referenceKind(reference) === 'web'}
						<div class="mt-3">
							<label class={labelClass} for={`reference-${index}-url`}>
								<span class="sr-only">Reference {index + 1} </span>URL
							</label>
							<input
								autocomplete="off"
								id={`reference-${index}-url`}
								type="url"
								class={inputClass}
								value={reference.url ?? ''}
								oninput={(event) =>
									updateReferenceField(reference, 'url', event.currentTarget.value)}
								aria-invalid={hasError(`references.${index}.url`) ? 'true' : undefined}
								aria-describedby={describedBy(`references.${index}.url`)}
							/>
							{@render fieldErrors(`references.${index}.url`)}
						</div>
					{/if}

					{#if referenceKind(reference) === 'publication'}
						<div class="mt-3 grid gap-3 sm:grid-cols-2">
							<div>
								<label class={labelClass} for={`reference-${index}-author`}>
									<span class="sr-only">Reference {index + 1} </span>Author or publisher
								</label>
								<input
									autocomplete="off"
									id={`reference-${index}-author`}
									class={inputClass}
									value={reference.author ?? ''}
									oninput={(event) =>
										updateReferenceField(reference, 'author', event.currentTarget.value)}
									aria-invalid={hasError(`references.${index}.author`) ? 'true' : undefined}
									aria-describedby={describedBy(`references.${index}.author`)}
								/>
								{@render fieldErrors(`references.${index}.author`)}
							</div>

							<div>
								<label class={labelClass} for={`reference-${index}-year`}>
									<span class="sr-only">Reference {index + 1} </span>Year
								</label>
								<input
									autocomplete="off"
									id={`reference-${index}-year`}
									class={inputClass}
									inputmode="numeric"
									maxlength="4"
									pattern={'[0-9]{4}'}
									placeholder="2013"
									value={reference.year ?? ''}
									oninput={(event) =>
										updateReferenceField(reference, 'year', event.currentTarget.value)}
									aria-invalid={hasError(`references.${index}.year`) ? 'true' : undefined}
									aria-describedby={describedBy(`references.${index}.year`)}
								/>
								{@render fieldErrors(`references.${index}.year`)}
							</div>
						</div>

						<div class="mt-3">
							<label class={labelClass} for={`reference-${index}-publication-url`}>
								<span class="sr-only">Reference {index + 1} </span>URL (optional)
							</label>
							<input
								autocomplete="off"
								id={`reference-${index}-publication-url`}
								type="url"
								class={inputClass}
								value={reference.url ?? ''}
								oninput={(event) =>
									updateReferenceField(reference, 'url', event.currentTarget.value)}
								aria-invalid={hasError(`references.${index}.url`) ? 'true' : undefined}
								aria-describedby={describedByIds(
									`reference-${index}-publication-url-hint`,
									describedBy(`references.${index}.url`)
								)}
							/>
							<p id={`reference-${index}-publication-url-hint`} class={hintClass}>
								For a DOI, use its doi.org link.
							</p>
							{@render fieldErrors(`references.${index}.url`)}
						</div>
					{/if}

					{#if referenceKind(reference) === 'general'}
						<div class="mt-3">
							<label class={labelClass} for={`reference-${index}-note`}>
								<span class="sr-only">Reference {index + 1} </span>Justification note
							</label>
							<textarea
								autocomplete="off"
								id={`reference-${index}-note`}
								class={inputClass}
								rows="3"
								value={reference.note ?? ''}
								oninput={(event) =>
									updateReferenceField(reference, 'note', event.currentTarget.value)}
								aria-invalid={hasError(`references.${index}.note`) ? 'true' : undefined}
								aria-describedby={describedByIds(
									`reference-${index}-note-hint`,
									describedBy(`references.${index}.note`)
								)}></textarea>
							<p id={`reference-${index}-note-hint`} class={hintClass}>
								State the consensus or observation that establishes the claim, and why it does not
								depend on one named source. If a specific document constitutes the claim, use a
								publication or web source instead.
							</p>
							{@render fieldErrors(`references.${index}.note`)}
						</div>
					{/if}

					<div class="mt-3">
						<Button
							variant="ghost"
							size="sm"
							type="button"
							disabled={question.references.length <= 1}
							onclick={() => removeReference(index)}
						>
							Remove reference {index + 1}
						</Button>
					</div>
				</fieldset>
			{/each}
		</div>

		<div class="mt-3">
			<Button variant="secondary" size="sm" type="button" onclick={addReference}>
				Add reference
			</Button>
		</div>
	</section>

	<section aria-labelledby="review-heading">
		<h2 id="review-heading" class="text-lg font-bold text-on-surface">Review</h2>
		<p class="text-xs text-on-surface-muted">
			Reviewer, review date, and source-check date become required for published questions.
		</p>

		<div class="mt-3 grid gap-4 sm:grid-cols-3">
			<div>
				<label class={labelClass} for="question-reviewer">Reviewer</label>
				<input
					autocomplete="off"
					id="question-reviewer"
					class={inputClass}
					value={question.reviewer ?? ''}
					oninput={(event) => (question.reviewer = event.currentTarget.value || null)}
					aria-invalid={hasError('reviewer') ? 'true' : undefined}
					aria-describedby={describedBy('reviewer')}
				/>
				{@render fieldErrors('reviewer')}
			</div>

			<div>
				<label class={labelClass} for="question-reviewed">Reviewed on</label>
				<input
					autocomplete="off"
					id="question-reviewed"
					type="date"
					class={inputClass}
					value={question.reviewedAt ?? ''}
					onchange={(event) => updateNullable(event, (value) => (question.reviewedAt = value))}
					aria-invalid={hasError('reviewedAt') ? 'true' : undefined}
					aria-describedby={describedBy('reviewedAt')}
				/>
				{@render fieldErrors('reviewedAt')}
			</div>

			<div>
				<label class={labelClass} for="question-source-checked">Source checked on</label>
				<input
					autocomplete="off"
					id="question-source-checked"
					type="date"
					class={inputClass}
					value={question.sourceCheckedAt ?? ''}
					onchange={(event) => updateNullable(event, (value) => (question.sourceCheckedAt = value))}
					aria-invalid={hasError('sourceCheckedAt') ? 'true' : undefined}
					aria-describedby={describedBy('sourceCheckedAt')}
				/>
				{@render fieldErrors('sourceCheckedAt')}
			</div>
		</div>

		<p class={hintClass}>
			{question.images.length > 0
				? `${question.images.length} imported image reference(s) are preserved but cannot be edited here.`
				: 'Images are not part of v0, the question is text-only.'}
		</p>
	</section>
</div>
