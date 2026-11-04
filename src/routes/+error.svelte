<script lang="ts">
	import { tick } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import SiteHeader from '#lib/components/layout/site/SiteHeader.svelte';
	import SiteFooter from '#lib/components/layout/site/SiteFooter.svelte';
	import Button from '#lib/components/ui/Buttons.svelte';
	import ExternalLink from '#lib/components/ui/ExternalLink.svelte';
	import { cn } from '#lib/utils/cn';

	// Icons
	import IconCorrect from '~icons/oxy/circle-check';
	import IconWrong from '~icons/oxy/circle-x';

	const isMissing = $derived(page.status === 404);
	const isServerError = $derived(page.status >= 500);
	const title = $derived(isMissing ? 'Page not found' : 'Something went wrong');

	const CORRECT_OPTION_ID = 'd';

	const options = [
		{
			id: 'a',
			label: 'The URL was typed incorrectly or contains a typo.',
			rationale: 'A mistyped address is a common cause. But it is not the only one.'
		},
		{
			id: 'b',
			label: 'The page or exam session was moved or retired.',
			rationale: 'A moved or retired page can cause this. But it is not the only cause.'
		},
		{
			id: 'c',
			label: 'You followed a broken or outdated bookmark.',
			rationale: 'An outdated bookmark can cause this. But it is not the only cause.'
		},
		{
			id: 'd',
			label: 'All of the above.',
			rationale: 'Correct. Any of these can trigger a 404.'
		}
	];

	const correctIndex = options.findIndex((option) => option.id === CORRECT_OPTION_ID);
	const correctOption = options[correctIndex];

	let selectedId = $state<string | null>(null);
	let checked = $state(false);

	const selectedIndex = $derived(options.findIndex((option) => option.id === selectedId));
	const selectedOption = $derived(selectedIndex === -1 ? null : options[selectedIndex]);
	const answered = $derived(checked && selectedOption !== null);
	const isCorrect = $derived(answered && selectedId === CORRECT_OPTION_ID);

	function isCorrectOption(optionId: string) {
		return answered && optionId === CORRECT_OPTION_ID;
	}

	function isWrongSelection(optionId: string) {
		return answered && selectedId === optionId && !isCorrect;
	}

	function optionClasses(optionId: string) {
		return cn(
			'oxy-focus-container flex w-full items-start gap-3 rounded-sm border border-on-surface-muted bg-input p-3 text-left transition-colors duration-300',
			!answered && 'cursor-pointer hover:bg-input/40 has-[:focus-visible]:bg-input/40',
			!answered && selectedId === optionId && 'border-dark bg-input/40 ring-1 ring-dark',
			isCorrectOption(optionId) &&
				'border-on-correct-surface bg-correct-surface ring-1 ring-on-correct-surface',
			isWrongSelection(optionId) &&
				'border-on-wrong-surface bg-wrong-surface ring-1 ring-on-wrong-surface',
			answered && 'cursor-default'
		);
	}

	function indicatorClasses(optionId: string) {
		return cn(
			'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2 bg-surface-accent',
			selectedId === optionId ? 'border-dark' : 'border-on-surface-muted',
			isCorrectOption(optionId) && 'border-on-correct-surface',
			isWrongSelection(optionId) && 'border-on-wrong-surface'
		);
	}

	function optionNote(optionId: string): string {
		if (isCorrectOption(optionId)) return 'Correct answer';
		if (isWrongSelection(optionId)) return 'Your answer';
		return '';
	}

	// ADR-043: an explicit check step, because arrow keys move a native radio
	// selection without committing it. Feedback is announced by focus, not a live
	// region, so it is not read twice.
	async function checkAnswer() {
		if (!selectedOption) return;
		checked = true;
		await tick();
		requestAnimationFrame(() => document.getElementById('error-feedback')?.focus());
	}

	async function tryAgain() {
		selectedId = null;
		checked = false;
		await tick();
		requestAnimationFrame(() => document.getElementById('error-question-heading')?.focus());
	}
</script>

<svelte:head>
	<title>{title} | Mocks</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<header class="w-full">
		<SiteHeader />
	</header>

	<main
		id="main-content"
		tabindex="-1"
		class="mx-auto w-full max-w-3xl flex-1 px-3 py-16 sm:px-6 sm:pt-12 sm:pb-24"
	>
		<p
			class="w-fit rounded-sm bg-on-surface-muted px-2 py-0.5 font-mono text-sm font-bold tracking-wide text-surface uppercase"
		>
			Error {page.status}
		</p>
		<h1 class="mt-2 text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">{title}</h1>

		<div class="mt-12 max-w-xl">
			{#if isMissing}
				<!-- 404 easter egg -->
				<div
					class="w-full min-w-0 rounded bg-surface-accent p-4 ring-2 ring-on-surface-muted sm:p-5"
				>
					<div
						class="flex items-center justify-between gap-4 border-b-4 border-on-surface-muted pb-3"
					>
						<span class="font-mono text-xs font-bold tracking-wide text-on-surface-muted uppercase">
							HTTP Error 404
						</span>
						<span class="font-mono text-xs font-semibold text-on-surface-muted tabular-nums">
							Score: {answered ? (isCorrect ? 1 : 0) : '—'} / 1
						</span>
					</div>

					<h2
						id="error-question-heading"
						tabindex="-1"
						class="mt-3 scroll-mt-24 text-base leading-snug font-semibold text-dark sm:text-lg"
					>
						The requested resource could not be located. Which of the following represents the most
						probable cause?
					</h2>

					<p id="error-question-help" class="mt-1.5 text-xs text-on-surface">
						{answered ? 'You can try again below.' : 'Choose one answer.'}
					</p>

					<fieldset
						class="mt-4 min-w-0"
						aria-labelledby="error-question-heading"
						aria-describedby="error-question-help"
					>
						<legend class="sr-only">Answer options</legend>

						<div class="space-y-2">
							{#each options as option, index (option.id)}
								<label class={optionClasses(option.id)}>
									<input
										type="radio"
										name="error-answer"
										value={option.id}
										checked={selectedId === option.id}
										disabled={answered}
										onchange={() => (selectedId = option.id)}
										class="sr-only"
									/>

									<!-- Radio dot indicator -->
									<span class={indicatorClasses(option.id)} aria-hidden="true">
										{#if isCorrectOption(option.id)}
											<span class="selected-dot size-2 rounded-full bg-on-correct-surface"></span>
										{:else if isWrongSelection(option.id)}
											<span class="selected-dot size-2 rounded-full bg-on-wrong-surface"></span>
										{:else if selectedId === option.id}
											<span class="selected-dot size-2 rounded-full bg-dark"></span>
										{/if}
									</span>

									<!-- Content column -->
									<div class="min-w-0 flex-1">
										<div class="flex items-start gap-2">
											<span
												class="mt-0.5 font-mono text-xs font-bold text-on-surface-muted select-none"
												aria-hidden="true"
											>
												{index + 1}.
											</span>

											<span
												class="text-sm leading-snug font-medium whitespace-pre-line text-on-surface"
											>
												{option.label}
											</span>
										</div>

										{#if optionNote(option.id)}
											<div class="mt-1 ml-6">
												<span
													class={cn(
														'inline-flex items-center gap-2 rounded-sm px-1.5 py-px font-mono text-[11px] font-bold tracking-wide uppercase',
														isCorrectOption(option.id)
															? 'bg-on-correct-surface text-correct-surface'
															: 'bg-on-wrong-surface text-wrong-surface'
													)}
												>
													{optionNote(option.id)}
												</span>
											</div>
										{/if}
									</div>
								</label>
							{/each}
						</div>
					</fieldset>

					{#if answered}
						<section
							id="error-feedback"
							tabindex="-1"
							aria-labelledby="error-feedback-heading"
							class={cn(
								'oxy-focus mt-4 scroll-mt-24 rounded-sm border-2 p-3.5',
								isCorrect
									? 'border-on-correct-surface bg-correct-surface'
									: 'border-on-wrong-surface bg-wrong-surface'
							)}
						>
							<h3
								id="error-feedback-heading"
								class={cn(
									'flex items-center gap-2 text-sm font-bold',
									isCorrect ? 'text-on-correct-surface' : 'text-on-wrong-surface'
								)}
							>
								{#if isCorrect}
									<IconCorrect class="size-4.5 shrink-0" aria-hidden="true" />
									Correct
								{:else}
									<IconWrong class="size-4.5 shrink-0" aria-hidden="true" />
									Not quite
								{/if}
							</h3>

							<p class="mt-2 text-sm leading-relaxed text-on-surface">
								<span class="font-bold text-on-correct-surface">
									Correct answer: {correctIndex + 1}. {correctOption.label}
								</span>
							</p>

							{#if !isCorrect && selectedOption}
								<p class="mt-1 text-sm leading-relaxed text-on-surface">
									<span class="font-bold text-on-wrong-surface">
										Your answer: {selectedIndex + 1}. {selectedOption.label}
									</span>
								</p>
								<p class="mt-1 text-sm leading-relaxed text-on-surface">
									{selectedOption.rationale}
								</p>
							{/if}

							<p class="mt-3 text-sm leading-relaxed text-on-surface">
								A 404 only says the server could not find the resource at that address; it does not
								reveal why. Use the links below to get back on track.
							</p>
						</section>
					{/if}

					<div
						class="mt-4 flex items-center justify-between gap-4 border-t-2 border-on-surface-muted pt-3"
					>
						{#if answered}
							<Button variant="secondary" size="sm" href={resolve('/portal')}>Go to exam</Button>
							<Button size="sm" href={resolve('/(site)')}>Return home</Button>
						{:else}
							<Button
								type="button"
								size="sm"
								onclick={answered ? tryAgain : checkAnswer}
								disabled={!answered && !selectedId}
							>
								Check answer
							</Button>
							<Button size="sm" href={resolve('/(site)')}>Return home</Button>
						{/if}
					</div>
				</div>
			{:else if isServerError}
				<!-- 500: no quiz. The cause is mine, not something the visitor can answer. -->
				<div
					class="w-full min-w-0 rounded bg-surface-accent p-4 ring-2 ring-on-surface-muted sm:p-5"
				>
					<div
						class="flex items-center justify-between gap-4 border-b-4 border-on-surface-muted pb-3"
					>
						<span class="font-mono text-xs font-bold tracking-wide text-on-surface-muted uppercase">
							HTTP Error {page.status}
						</span>
						<span class="font-mono text-xs font-semibold text-on-surface-muted">Server error</span>
					</div>

					<h2 class="mt-3 text-base leading-snug font-semibold text-dark sm:text-lg">
						The server could not complete this request.
					</h2>

					<p class="mt-2 text-sm leading-relaxed font-medium text-on-surface">
						This one is on us, nothing you did caused it. Retrying often fixes a temporary failure.
					</p>

					<p class="mt-2 text-sm leading-relaxed text-on-surface">
						If it keeps happening,
						<ExternalLink href="https://github.com/oxypteros/mocks/issues" iconClass="size-[0.9em]">
							report the problem on GitHub
						</ExternalLink>
						with the path below.
					</p>

					<div
						class="mt-4 flex items-center justify-between border-t-2 border-on-surface-muted pt-3"
					>
						<Button size="sm" href={page.url.href}>Try again</Button>

						<Button href={resolve('/(site)')} size="sm" variant="secondary">Return home</Button>
					</div>
				</div>
			{:else}
				<p class="text-sm leading-relaxed font-semibold text-on-surface-muted">
					{page.error?.message ?? 'The page could not be loaded.'}: Try again, or start from the
					home page.
				</p>
				<div class="mt-6 flex flex-wrap gap-2">
					<Button href={resolve('/(site)')} size="sm">Return home</Button>
				</div>
			{/if}

			{#if isMissing || isServerError}
				<div
					class="mt-12 flex items-center gap-2 font-mono text-xs font-medium text-on-surface-muted"
				>
					<span class="h-2 w-8 bg-on-surface-muted"></span>
					<p class="break-all">
						Path attempted: <code
							class="font-semibold underline decoration-dotted decoration-2 underline-offset-2"
							>{page.url.pathname}</code
						>
					</p>
				</div>
			{/if}
		</div>
	</main>

	<footer class="w-full">
		<SiteFooter />
	</footer>
</div>
