<script lang="ts">
	import Button from '#lib/components/ui/Buttons.svelte';
	import {
		BANK_KINDS,
		BANK_STATUSES,
		issuesAt,
		type BankKind,
		type BankSettings,
		type Issue
	} from '#lib/authoring/schema';
	import { setBankKind } from '#lib/authoring/workspace';

	// Icons
	import IconDelete from '~icons/oxy/trash';

	type Props = {
		bank: BankSettings;
		issues: Issue[];
	};

	let { bank = $bindable(), issues }: Props = $props();

	const inputClass =
		'oxy-focus mt-1 w-full rounded border-2 border-on-surface-muted bg-light px-3 py-2 text-sm text-on-surface';
	const labelClass = 'block text-sm font-semibold text-on-surface';

	function errorId(path: string): string {
		return `bank-error-${path.replace(/[^a-z0-9]+/gi, '-')}`;
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

	function updateKind(event: Event): void {
		setBankKind(bank, (event.currentTarget as HTMLSelectElement).value as BankKind);
	}

	function addModule(): void {
		let index = bank.modules.length + 1;
		while (bank.modules.some((module) => module.id === `module-${index}`)) index++;
		bank.modules.push({
			id: `module-${index}`,
			title: '',
			questionCount: bank.kind === 'exam' ? 1 : null
		});
	}

	function removeModule(index: number): void {
		bank.modules.splice(index, 1);
	}

	function updateCount(event: Event, moduleIndex: number): void {
		const value = (event.currentTarget as HTMLInputElement).valueAsNumber;
		bank.modules[moduleIndex].questionCount =
			Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
	}

	function updateOptionCount(event: Event): void {
		const value = (event.currentTarget as HTMLInputElement).valueAsNumber;
		if (Number.isFinite(value) && value >= 2) bank.optionCount = Math.floor(value);
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

<details class="rounded border-2 border-on-surface-muted bg-surface-accent p-4">
	<summary class="oxy-focus cursor-pointer text-base font-bold text-on-surface">
		Bank settings
		<span class="ml-2 font-mono text-xs font-medium text-on-surface-muted">
			{bank.id || 'no id'} | {bank.kind} | {bank.status}
		</span>
	</summary>

	<p class="mt-2 text-xs text-on-surface-muted">
		The bank envelope for the exported JSON. Exam format is data, not a code constant; the defaults
		mirror <code>docs/exam_schema.yaml</code>.
	</p>

	<div class="mt-4 grid gap-4 sm:grid-cols-2">
		<div>
			<label class={labelClass} for="bank-exam-slug">Exam slug</label>
			<input
				autocomplete="off"
				id="bank-exam-slug"
				class={inputClass}
				bind:value={bank.examSlug}
				aria-invalid={hasError('examSlug') ? 'true' : undefined}
				aria-describedby={describedBy('examSlug')}
			/>
			<p class="mt-1 text-xs text-on-surface-muted">Question IDs must start with this slug.</p>
			{@render fieldErrors('examSlug')}
		</div>

		<div>
			<label class={labelClass} for="bank-id">Bank ID</label>
			<input
				autocomplete="off"
				id="bank-id"
				class={inputClass}
				bind:value={bank.id}
				aria-invalid={hasError('id') ? 'true' : undefined}
				aria-describedby={describedBy('id')}
			/>
			{@render fieldErrors('id')}
		</div>

		<div>
			<label class={labelClass} for="bank-title">Bank title</label>
			<input
				autocomplete="off"
				id="bank-title"
				class={inputClass}
				bind:value={bank.title}
				aria-invalid={hasError('title') ? 'true' : undefined}
				aria-describedby={describedBy('title')}
			/>
			{@render fieldErrors('title')}
		</div>

		<div>
			<label class={labelClass} for="bank-version">Version</label>
			<input
				autocomplete="off"
				id="bank-version"
				class={inputClass}
				bind:value={bank.version}
				aria-invalid={hasError('version') ? 'true' : undefined}
				aria-describedby={describedBy('version')}
			/>
			{@render fieldErrors('version')}
		</div>

		<div>
			<label class={labelClass} for="bank-kind">Kind</label>
			<select
				autocomplete="off"
				id="bank-kind"
				class={inputClass}
				value={bank.kind}
				onchange={updateKind}
			>
				{#each BANK_KINDS as kind (kind)}
					<option value={kind}>{kind}</option>
				{/each}
			</select>
			<p class="mt-1 text-xs text-on-surface-muted">
				Practice banks validate option counts per question and ignore draw counts.
			</p>
		</div>

		<div>
			<label class={labelClass} for="bank-status">Bank status</label>
			<select autocomplete="off" id="bank-status" class={inputClass} bind:value={bank.status}>
				{#each BANK_STATUSES as status (status)}
					<option value={status}>{status}</option>
				{/each}
			</select>
		</div>

		<div>
			<label class={labelClass} for="bank-option-count">Options per exam question</label>
			<input
				autocomplete="off"
				id="bank-option-count"
				type="number"
				min="2"
				max="10"
				class={inputClass}
				value={bank.optionCount}
				oninput={updateOptionCount}
				aria-invalid={hasError('optionCount') ? 'true' : undefined}
				aria-describedby={describedBy('optionCount')}
			/>
			<p class="mt-1 text-xs text-on-surface-muted">CPACC uses 4. Practice banks are exempt.</p>
			{@render fieldErrors('optionCount')}
		</div>
	</div>

	<fieldset class="mt-6">
		<legend class="text-base font-bold text-on-surface">Modules</legend>
		<p class="text-xs text-on-surface-muted">
			Exam draw counts must be positive; practice modules leave them empty. The sum should match the
			exam's question count (checked at publish).
		</p>
		{@render fieldErrors('modules')}

		<div class="mt-3 space-y-3">
			{#each bank.modules as module, index (index)}
				<fieldset class="rounded border border-on-surface-muted bg-light p-3">
					<legend class="px-1 text-sm font-bold text-on-surface">Module {index + 1}</legend>

					<div class="grid gap-3 sm:grid-cols-3">
						<div>
							<label class={labelClass} for={`module-${index}-id`}>
								<span class="sr-only">Module {index + 1} </span>Module ID
							</label>
							<input
								autocomplete="off"
								id={`module-${index}-id`}
								class={inputClass}
								bind:value={module.id}
								aria-invalid={hasError(`modules.${index}.id`) ? 'true' : undefined}
								aria-describedby={describedBy(`modules.${index}.id`)}
							/>
							{@render fieldErrors(`modules.${index}.id`)}
						</div>

						<div>
							<label class={labelClass} for={`module-${index}-title`}>
								<span class="sr-only">Module {index + 1} </span>Title
							</label>
							<input
								autocomplete="off"
								id={`module-${index}-title`}
								class={inputClass}
								bind:value={module.title}
								aria-invalid={hasError(`modules.${index}.title`) ? 'true' : undefined}
								aria-describedby={describedBy(`modules.${index}.title`)}
							/>
							{@render fieldErrors(`modules.${index}.title`)}
						</div>

						<div>
							<label class={labelClass} for={`module-${index}-count`}>
								<span class="sr-only">Module {index + 1} </span>Draw count
							</label>
							<input
								autocomplete="off"
								id={`module-${index}-count`}
								type="number"
								min="1"
								class={inputClass}
								value={module.questionCount ?? ''}
								oninput={(event) => updateCount(event, index)}
								disabled={bank.kind !== 'exam'}
								aria-invalid={hasError(`modules.${index}.questionCount`) ? 'true' : undefined}
								aria-describedby={describedBy(`modules.${index}.questionCount`)}
							/>
							{#if bank.kind !== 'exam'}
								<p class="mt-1 text-xs text-on-surface-muted">Not used for practice.</p>
							{/if}
							{@render fieldErrors(`modules.${index}.questionCount`)}
						</div>
					</div>

					<div class="mt-3">
						<Button
							variant="ghost"
							size="sm"
							type="button"
							disabled={bank.modules.length <= 1}
							onclick={() => removeModule(index)}
						>
							<IconDelete aria-hidden="true" />
							Remove module {index + 1}
						</Button>
					</div>
				</fieldset>
			{/each}
		</div>

		<div class="mt-3">
			<Button size="sm" type="button" onclick={addModule}>Add module</Button>
		</div>
	</fieldset>
</details>
