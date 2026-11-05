<script lang="ts">
	import { resolve } from '$app/paths';
	import { onDestroy, tick } from 'svelte';
	import Button from '#lib/components/ui/Buttons.svelte';
	import BankSettingsPanel from '#lib/components/author/BankSettingsPanel.svelte';
	import ConfirmDialog from '#lib/components/author/ConfirmDialog.svelte';
	import QuestionForm from '#lib/components/author/QuestionForm.svelte';
	import QuestionList from '#lib/components/author/QuestionList.svelte';
	import QuestionPreview from '#lib/components/author/QuestionPreview.svelte';
	import {
		bankSettingsSchema,
		collectBankIssues,
		humanizePath,
		validateQuestion,
		zodIssues,
		type Workspace
	} from '#lib/authoring/schema';
	import {
		createWorkspace,
		newQuestion,
		parseAuthoringFile,
		toBankFile,
		toQuestionFile
	} from '#lib/authoring/workspace';
	import { loadWorkspace, saveWorkspace } from '#lib/authoring/storage';
	import { downloadJson, safeFilename } from '#lib/authoring/download';
	import AuthorFooter from '#lib/components/author/AuthorFooter.svelte';

	// Icons
	import IconArrowback from '~icons/oxy/arrow-left';
	import Logo from '~icons/oxy/logo';
	import IconArchive from '~icons/oxy/archive';
	import IconArrowUp from '~icons/oxy/arrow-up';
	import IconFileDown from '~icons/oxy/file-down';
	import IconPlus from '~icons/oxy/plus';
	import IconRotateCcw from '~icons/oxy/rotate-ccw';
	import IconDelete from '~icons/oxy/trash';
	import IconUpload from '~icons/oxy/file-up';

	let workspace = $state<Workspace>(loadWorkspace() ?? createWorkspace());
	let selectedIndex = $state(workspace.questions.length > 0 ? 0 : -1);
	let actionMessage = $state('');
	let pendingSave: Workspace | null = null;
	/** Validation is deferred until the author asks to export, not shown on a blank draft. */
	let attemptedQuestion = $state(false);
	let attemptedExport = $state(false);
	let confirmKind = $state<'delete' | 'reset' | null>(null);
	let confirmIndex = $state(-1);

	const selected = $derived(workspace.questions[selectedIndex] ?? null);
	const moduleIds = $derived(workspace.bank.modules.map((module) => module.id));
	const otherQuestionIds = $derived(
		workspace.questions
			.filter((_question, index) => index !== selectedIndex)
			.map((question) => question.id)
	);

	const selectedIssues = $derived(
		selected
			? validateQuestion(selected, {
					examSlug: workspace.bank.examSlug,
					bankKind: workspace.bank.kind,
					optionCount: workspace.bank.optionCount,
					moduleIds,
					otherQuestionIds
				})
			: []
	);

	const selectedErrorCount = $derived(
		selectedIssues.filter((issue) => issue.severity === 'error').length
	);
	const selectedWarningCount = $derived(
		selectedIssues.filter((issue) => issue.severity === 'warning').length
	);
	const visibleQuestionIssues = $derived(attemptedQuestion ? selectedIssues : []);

	const settingsIssues = $derived.by(() => {
		const parsed = bankSettingsSchema.safeParse(workspace.bank);
		return parsed.success ? [] : zodIssues(parsed.error);
	});

	const exportIssues = $derived(collectBankIssues(workspace.bank, workspace.questions));
	const exportErrorCount = $derived(
		exportIssues.filter((issue) => issue.severity === 'error').length
	);
	// Bank-wide errors that are not tied to a field in the form, such as the
	// duplicate-content rule (ADR-035), need their reason shown here.
	const bankLevelIssues = $derived(
		exportIssues.filter(
			(issue) => issue.severity === 'error' && /^questions(\.\d+)?$/.test(issue.path)
		)
	);

	const invalidQuestionEntries = $derived.by(() => {
		const indices: number[] = [];
		for (const issue of exportIssues) {
			if (issue.severity !== 'error' || !issue.path) continue;
			const match = /^questions\.(\d+)/.exec(issue.path);
			if (!match) continue;
			const index = Number(match[1]);
			if (!indices.includes(index)) indices.push(index);
		}
		return indices
			.sort((a, b) => a - b)
			.map((index) => ({
				index,
				id: workspace.questions[index]?.id || `Question ${index + 1}`
			}));
	});

	const confirmQuestion = $derived(
		confirmIndex >= 0 ? (workspace.questions[confirmIndex] ?? null) : null
	);
	const confirmTitle = $derived(confirmKind === 'delete' ? 'Delete question?' : 'Reset question?');
	const confirmDescription = $derived.by(() => {
		const id =
			confirmQuestion?.id || (confirmKind === 'delete' ? 'this draft question' : 'this question');
		return confirmKind === 'delete'
			? `Delete ${id}? This cannot be undone. Export a copy first if you might need it.`
			: `Reset ${id}? Every field will be cleared. This cannot be undone.`;
	});

	$effect(() => {
		const snapshot = $state.snapshot(workspace) as Workspace;
		pendingSave = snapshot;
		const timer = setTimeout(() => {
			if (saveWorkspace(snapshot)) pendingSave = null;
		}, 400);
		return () => clearTimeout(timer);
	});

	function flushPending(): void {
		if (pendingSave) {
			saveWorkspace(pendingSave);
			pendingSave = null;
		}
	}

	onDestroy(flushPending);

	function announce(message: string): void {
		actionMessage = message;
	}

	/** 11px labels with a 44px minimum target (WCAG 2.5.5 AAA). */
	const toolbarButtonClass = 'min-h-11 min-w-11 gap-1.5 px-2.5 text-[11px]';

	function goToTop(): void {
		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
		document.getElementById('page-title')?.focus({ preventScroll: true });
	}

	async function addQuestion(): Promise<void> {
		const moduleId = workspace.bank.modules[0]?.id ?? '';
		const optionCount = workspace.bank.kind === 'exam' ? workspace.bank.optionCount : 2;
		const question = newQuestion(workspace.bank.id, moduleId, optionCount, workspace.questions);
		workspace.questions.push(question);
		selectedIndex = workspace.questions.length - 1;
		attemptedQuestion = false;
		attemptedExport = false;
		announce('Started a new question.');
		await tick();
		document.getElementById('question-stem')?.focus();
	}

	function requestDelete(index: number): void {
		if (!workspace.questions[index]) return;
		confirmIndex = index;
		confirmKind = 'delete';
	}

	function requestReset(): void {
		if (!selected) return;
		confirmIndex = selectedIndex;
		confirmKind = 'reset';
	}

	function runConfirmedAction(): void {
		const kind = confirmKind;
		const index = confirmIndex;
		confirmKind = null;
		confirmIndex = -1;
		if (kind === 'delete') performDelete(index);
		else if (kind === 'reset') performReset(index);
	}

	function performDelete(index: number): void {
		const question = workspace.questions[index];
		if (!question) return;
		workspace.questions.splice(index, 1);
		selectedIndex = Math.min(index, workspace.questions.length - 1);
		attemptedQuestion = false;
		attemptedExport = false;
		announce('Question deleted.');
		void restoreFocusAfterDelete();
	}

	async function restoreFocusAfterDelete(): Promise<void> {
		await tick();
		setTimeout(() => {
			const rows = document.querySelectorAll<HTMLButtonElement>(
				'aside[aria-label="Questions in this bank"] ol button'
			);
			const target = rows[selectedIndex] ?? document.getElementById('new-question-button');
			target?.focus();
		}, 0);
	}

	function performReset(index: number): void {
		const question = workspace.questions[index];
		if (!question) return;
		const moduleId = workspace.bank.modules.some((module) => module.id === question.module)
			? question.module
			: (workspace.bank.modules[0]?.id ?? '');
		const optionCount = workspace.bank.kind === 'exam' ? workspace.bank.optionCount : 2;
		const others = workspace.questions
			.filter((_item, otherIndex) => otherIndex !== index)
			.map((item) => ({ id: item.id }));

		workspace.questions[index] = newQuestion(workspace.bank.id, moduleId, optionCount, others);
		attemptedQuestion = false;
		attemptedExport = false;
		announce('Question reset. Every field was cleared.');
	}

	async function revealChecks(): Promise<void> {
		await tick();
		document
			.getElementById('checks-heading')
			?.scrollIntoView({ block: 'start', behavior: 'smooth' });
	}

	async function exportQuestion(): Promise<void> {
		if (!selected) return;
		attemptedQuestion = true;

		if (selectedErrorCount > 0) {
			announce(
				`Question export blocked by ${selectedErrorCount} ${selectedErrorCount === 1 ? 'error' : 'errors'}. Review the checks.`
			);
			await revealChecks();
			return;
		}

		const filename = `${safeFilename(selected.id, 'question')}.json`;
		downloadJson(filename, toQuestionFile(selected));
		attemptedQuestion = false;
		announce(`Exported ${filename}.`);
	}

	async function exportBank(): Promise<void> {
		if (workspace.questions.length === 0) {
			announce('Add at least one question before exporting the bank.');
			return;
		}

		attemptedExport = true;

		if (exportErrorCount > 0) {
			const first = invalidQuestionEntries[0];
			if (first) {
				selectedIndex = first.index;
				attemptedQuestion = true;
			}
			announce(
				`Bank export blocked by ${exportErrorCount} ${exportErrorCount === 1 ? 'error' : 'errors'}. Review the highlighted questions.`
			);
			await revealChecks();
			return;
		}

		const file = toBankFile(workspace.bank, workspace.questions);
		const version = safeFilename(workspace.bank.version, '0');
		const filename = `${safeFilename(workspace.bank.id, 'bank')}-v${version}.json`;
		downloadJson(filename, file);
		attemptedExport = false;
		attemptedQuestion = false;
		announce(`Exported ${file.questions.length} questions as ${filename}.`);
	}

	async function goToQuestion(index: number): Promise<void> {
		selectedIndex = index;
		attemptedQuestion = true;
		await revealChecks();
	}

	async function loadFile(event: Event): Promise<void> {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		try {
			const parsed = parseAuthoringFile(await file.text());

			if (parsed.kind === 'error') {
				announce(parsed.message);
				return;
			}

			if (parsed.kind === 'question') {
				const existingIndex = workspace.questions.findIndex(
					(question) => question.id === parsed.question.id
				);
				if (existingIndex >= 0) {
					workspace.questions[existingIndex] = parsed.question;
					selectedIndex = existingIndex;
					announce(`Replaced ${parsed.question.id}.`);
				} else {
					workspace.questions.push(parsed.question);
					selectedIndex = workspace.questions.length - 1;
					announce(`Loaded ${parsed.question.id}.`);
				}
				attemptedQuestion = false;
				attemptedExport = false;
				return;
			}

			if (
				workspace.questions.length > 0 &&
				!window.confirm(
					`Replace the current bank (${workspace.questions.length} questions) with the imported file?`
				)
			) {
				announce('Import canceled.');
				return;
			}

			if (parsed.kind === 'bank') {
				workspace.bank = parsed.bank;
				announce(`Imported ${parsed.questions.length} questions from ${parsed.bank.id}.`);
			} else {
				announce(`Imported ${parsed.questions.length} questions. Bank settings were kept.`);
			}

			workspace.questions = parsed.questions;
			selectedIndex = parsed.questions.length > 0 ? 0 : -1;
			attemptedQuestion = false;
			attemptedExport = false;
		} catch {
			announce('Could not read that file. Choose a JSON question or bank file.');
		}
	}
</script>

<svelte:head>
	<title>Question authoring · Mocks</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<svelte:window onbeforeunload={flushPending} />
<div class="flex min-h-dvh flex-col">
	<header>
		<a
			href="#main-content"
			class="oxy-focus absolute left-2 z-99 -translate-y-24 rounded px-px focus-visible:-translate-y-1"
			>Skip to main</a
		>
		<div
			class="mx-auto flex w-full max-w-8xl flex-wrap items-center justify-between gap-4 px-3 py-2 sm:px-6"
		>
			<a
				href={resolve('/(site)')}
				class="oxy-focus flex w-fit shrink-0 items-center gap-2 rounded px-px"
			>
				<Logo aria-hidden="true" />
				<span class="font-mono text-xl font-black tracking-tight text-on-surface-muted uppercase"
					>Mocks</span
				>
				<span class="sr-only"> Home</span>
			</a>
		</div>
	</header>
	<main id="main-content" class="flex-1">
		<div class="mx-auto w-full max-w-8xl px-3 py-12 sm:px-6">
			<div class="flex items-center justify-between gap-2">
				<p class="mt-3 text-xs font-bold tracking-wide text-on-surface-muted uppercase">
					Local authoring tool
				</p>
				<Button
					variant="navLink"
					size="navLink"
					class="text-xs font-semibold"
					href={resolve('/(site)')}
				>
					<IconArrowback class="size-3.5" aria-hidden="true" /> Back to Homepage
				</Button>
			</div>

			<h1 id="page-title" tabindex="-1" class="oxy-focus mt-1 text-3xl font-black text-on-surface">
				Question authoring
			</h1>
			<p class="mt-2 max-w-2xl text-sm leading-relaxed text-on-surface-muted">
				Fill the fields to build exam or practice questions without editing JSON by hand. Drafts are
				saved in this browser; nothing is uploaded. Export a question as a single file, or export
				the assembled bank when the checks pass.
			</p>

			<div class="mt-4 flex flex-wrap gap-2" role="group" aria-label="JSON actions">
				<label
					class="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-on-surface-muted bg-surface-accent px-4 text-sm font-semibold text-on-surface-muted shadow-md transition-all focus-within:outline-3 focus-within:outline-offset-4 focus-within:outline-primary-accent hover:bg-surface hover:text-on-surface"
				>
					<IconUpload class="size-4" aria-hidden="true" />
					Load JSON
					<input type="file" accept=".json,application/json" class="sr-only" onchange={loadFile} />
				</label>
				<Button variant="secondary" type="button" disabled={!selected} onclick={exportQuestion}>
					<IconFileDown class="size-4" aria-hidden="true" />
					Export question JSON
				</Button>
				<Button
					variant="secondary"
					type="button"
					disabled={workspace.questions.length === 0}
					onclick={exportBank}
				>
					<IconArchive class="size-4" aria-hidden="true" />
					Export bank JSON
				</Button>
			</div>

			<div class="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-xs">
				<p role="status" class="font-semibold text-on-surface">{actionMessage}</p>
			</div>

			{#if attemptedExport && exportErrorCount > 0}
				<div
					class="mt-2 rounded border-2 border-on-wrong-surface bg-wrong-surface p-2 text-xs font-semibold text-on-wrong-surface"
				>
					<p>
						Bank export is blocked by {exportErrorCount}
						{exportErrorCount === 1 ? 'error' : 'errors'}. Fix the highlighted fields, then export
						again.
					</p>
					{#if invalidQuestionEntries.length > 0}
						<p class="mt-1">Questions with errors:</p>
						<ul class="mt-1 flex flex-wrap gap-x-3 gap-y-1">
							{#each invalidQuestionEntries as entry (entry.index)}
								<li>
									<button
										type="button"
										class="oxy-focus rounded underline underline-offset-2"
										onclick={() => goToQuestion(entry.index)}
									>
										{entry.id}
									</button>
								</li>
							{/each}
						</ul>
					{/if}
					{#if bankLevelIssues.length > 0}
						<ul class="mt-1 space-y-1">
							{#each bankLevelIssues as issue, index (index)}
								<li>{issue.message}</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/if}
		</div>
		<div
			class="mx-auto my-12 grid w-full grid-cols-1 gap-6 px-3 sm:px-6 lg:grid-cols-[0.5fr_2fr_1.1fr] xl:grid-cols-[0.2fr_2fr_1.3fr]"
		>
			<!--Left column-->
			<aside
				class="lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100dvh-2rem)] lg:flex-col lg:self-start"
				aria-label="Questions in this bank"
			>
				<QuestionList
					questions={workspace.questions}
					{selectedIndex}
					onselect={(index) => (selectedIndex = index)}
				/>
			</aside>
			<!-- Middle Column-->

			<section class="min-w-0 space-y-6" aria-labelledby="bank-heading">
				<div>
					<h2 id="bank-heading" class="text-lg font-bold text-on-surface">Main Editor</h2>
					<p class="text-sm text-on-surface-muted">Draft changes are saved locally as you type.</p>
				</div>
				<BankSettingsPanel
					bind:bank={workspace.bank}
					issues={attemptedExport ? settingsIssues : []}
				/>

				{#if selected}
					{#if attemptedQuestion}
						<section
							aria-labelledby="checks-heading"
							class="rounded border-2 border-on-surface-muted bg-surface-accent p-4"
						>
							<h2 id="checks-heading" class="text-lg font-bold text-on-surface">Checks</h2>
							<p class="mt-1 text-sm text-on-surface-muted">
								{selectedErrorCount}
								{selectedErrorCount === 1 ? 'error' : 'errors'},
								{selectedWarningCount}
								{selectedWarningCount === 1 ? 'warning' : 'warnings'}.
								{#if selectedErrorCount === 0}
									This question can be exported.
								{/if}
							</p>

							{#if selectedIssues.length > 0}
								<ul
									class="mt-2 max-h-52 space-y-1 overflow-y-auto rounded border border-on-surface-muted bg-surface-accent p-2"
								>
									{#each selectedIssues as issue, index (index)}
										<li class="text-xs leading-relaxed text-on-surface">
											<span
												class={issue.severity === 'error'
													? 'font-bold text-on-wrong-surface'
													: 'font-bold text-primary-accent'}
											>
												{issue.severity === 'error' ? 'Error' : 'Warning'}:
											</span>
											{#if issue.path}
												<span class="font-semibold">{humanizePath(issue.path)}:</span>
											{/if}
											{issue.message}
										</li>
									{/each}
								</ul>
							{/if}
						</section>
					{/if}

					<QuestionForm
						bind:question={workspace.questions[selectedIndex]}
						bank={workspace.bank}
						issues={visibleQuestionIssues}
						{otherQuestionIds}
					/>
				{:else}
					<p
						class="rounded border-2 border-dashed border-on-surface-muted bg-surface-muted p-6 text-center text-sm text-on-surface-muted"
					>
						No question selected. Use <strong>New question</strong> below or load a question JSON file.
					</p>
				{/if}

				<div
					class="sticky bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-20 mt-6 flex flex-nowrap items-center justify-between gap-1 rounded-2xl border border-on-surface-muted/60 bg-surface p-1 shadow-lg"
				>
					<div class="flex min-w-0 items-center gap-1" role="group" aria-label="Question actions">
						<Button
							id="new-question-button"
							size="sm"
							type="button"
							class={toolbarButtonClass}
							onclick={addQuestion}
						>
							<IconPlus class="size-4" aria-hidden="true" /> New
						</Button>
						<Button
							variant="secondary"
							size="sm"
							type="button"
							class={toolbarButtonClass}
							disabled={!selected}
							onclick={requestReset}
						>
							<IconRotateCcw class="size-4" aria-hidden="true" /> Reset
						</Button>
						<Button
							variant="danger"
							size="sm"
							type="button"
							class={toolbarButtonClass}
							disabled={!selected}
							onclick={() => requestDelete(selectedIndex)}
						>
							<IconDelete class="size-4" aria-hidden="true" /> Delete
						</Button>
					</div>

					<Button
						variant="secondary"
						size="sm"
						type="button"
						class={toolbarButtonClass}
						onclick={goToTop}
					>
						<IconArrowUp class="size-4" aria-hidden="true" />
						<span class="sr-only">Go to </span>Top
					</Button>
				</div>
			</section>

			<!-- Right Column -->
			<div class="lg:sticky lg:top-4 lg:self-start">
				{#if selected}
					<QuestionPreview question={selected} />
				{:else}
					<p
						class="mt-18 rounded border-2 border-dashed border-on-surface-muted bg-surface-muted p-6 text-center text-sm text-on-surface-muted"
					>
						The preview appears when a question is selected.
					</p>
				{/if}
			</div>
		</div>
	</main>
	<ConfirmDialog
		open={confirmKind !== null}
		onOpenChange={(open) => {
			if (!open) confirmKind = null;
		}}
		title={confirmTitle}
		description={confirmDescription}
		confirmLabel={confirmKind === 'delete' ? 'Delete question' : 'Reset question'}
		tone={confirmKind === 'delete' ? 'danger' : 'primary'}
		onconfirm={runConfirmedAction}
	/>
	<footer class="w-full">
		<AuthorFooter />
	</footer>
</div>

<style>
	/* Keep focused fields clear of the sticky action bar (WCAG 2.4.11). */
	:global(#main-content :is(input, textarea, select)) {
		scroll-margin-bottom: 6rem;
	}
</style>
