<script lang="ts">
	import type { PageProps } from './$types';
	import { onMount, tick } from 'svelte';
	import { resolve } from '$app/paths';

	import type { PracticeOption, PracticeQuestion } from '#lib/domain/types';
	import Button from '#lib/components/ui/Buttons.svelte';
	import { cn } from '#lib/utils/cn';
	import FullscreenButton from '#lib/components/layout/portal/FullscreenButton.svelte';
	import PracticeFooter from '#lib/components/layout/portal/PracticeFooter.svelte';
	import SiteHeader from '#lib/components/layout/site/SiteHeader.svelte';
	import SiteFooter from '#lib/components/layout/site/SiteFooter.svelte';
	import ExternalLink from '#lib/components/ui/ExternalLink.svelte';
	import MarkdownText from '#lib/components/ui/MarkdownText.svelte';
	import {
		practiceCounts,
		readPracticeSession,
		type StoredPracticeSession
	} from '#lib/utils/practice-storage';
	import { site } from '#lib/settings/site';

	const Logo = site.logo;
	// Icons
	import IconCorrect from '~icons/oxy/circle-check';
	import IconWrong from '~icons/oxy/circle-x';
	import IconSkip from '~icons/oxy/redo-dot';
	import IconLoading from '~icons/oxy/loader';
	import IconChevronDown from '~icons/oxy/chevron-down';
	let { data }: PageProps = $props();

	const practiceHref = $derived(resolve('/portal/[exam]/practice', { exam: data.exam.slug }));
	const examHref = $derived(resolve('/portal/[exam]', { exam: data.exam.slug }));

	interface SummaryQuestion {
		number: number;
		question: PracticeQuestion;
		selected: PracticeOption;
		correct: PracticeOption;
		isCorrect: boolean;
	}

	let session = $state<StoredPracticeSession | null>(null);
	let ready = $state(false);

	const counts = $derived(session ? practiceCounts(session) : null);

	// The review covers checked questions. Skipped questions are counted but
	// never shown as wrong.
	const review = $derived.by((): SummaryQuestion[] => {
		if (!session) return [];

		return session.questions.flatMap((question, index): SummaryQuestion[] => {
			const selectedId = session?.answers[question.id];
			if (!selectedId) return [];

			const selected = question.options.find((option) => option.id === selectedId);
			const correct = question.options.find((option) => option.isCorrect);
			if (!selected || !correct) return [];

			return [
				{
					number: index + 1,
					question,
					selected,
					correct,
					isCorrect: selected.isCorrect
				}
			];
		});
	});

	onMount(() => {
		session = readPracticeSession(data.exam.slug);
		ready = true;
		void focusHeading();
	});

	async function focusHeading() {
		await tick();
		requestAnimationFrame(() => document.getElementById('summary-heading')?.focus());
	}

	function statusClasses(isCorrect: boolean) {
		return cn(
			'inline-flex min-w-20 shrink-0 items-center justify-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-bold whitespace-nowrap',
			isCorrect
				? 'border-on-correct-surface bg-correct-surface text-on-correct-surface'
				: 'border-on-wrong-surface/40 bg-wrong-surface text-on-wrong-surface'
		);
	}

	function optionClasses(option: PracticeOption) {
		return cn(
			'rounded-r-sm border-l-4 py-2 pr-3 pl-3',
			option.isCorrect
				? 'border-on-correct-surface bg-correct-surface'
				: 'border-on-surface-muted bg-surface'
		);
	}

	function optionNote(option: PracticeOption, selectedId: string): string {
		if (option.isCorrect && option.id === selectedId) return 'Your answer is correct';
		if (option.isCorrect) return 'Correct answer';
		if (option.id === selectedId) return 'Your answer is not correct';
		return '';
	}

	/** Only https reference URLs become links, anything else text. */
	function safeHref(url: string): string | null {
		return /^https?:\/\//i.test(url) ? url : null;
	}
</script>

<svelte:head>
	<title>Practice summary — {data.exam.title} | Mocks</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex min-h-dvh flex-col">
	{#if session}
		<header class="sticky top-0 z-20 border-b border-on-surface-muted bg-surface-accent">
			<Button
				variant="secondary"
				size="sm"
				href="#main-content"
				class="absolute left-2 z-99 -translate-y-24 rounded px-px focus-visible:translate-y-2"
				>Skip to main</Button
			>
			<div
				class="mx-auto flex min-h-11 w-full max-w-8xl flex-wrap items-center justify-between gap-4 px-3 py-1 sm:px-6"
			>
				<div class="flex items-center gap-2">
					<Logo class="hidden sm:block" aria-hidden="true" />
					<span class="hidden h-3 w-0.5 bg-primary-accent sm:block"></span>
					<p class="min-w-0 truncate text-sm font-semibold text-on-surface">Practice summary</p>
				</div>
				<div class="flex items-center gap-2">
					<FullscreenButton />
				</div>
			</div>
		</header>
	{:else}
		<header>
			<SiteHeader />
		</header>
	{/if}

	<main
		id="main-content"
		tabindex="-1"
		class="mx-auto mb-12 w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12"
	>
		{#if session}
			<h1 id="summary-heading" class="text-3xl font-bold tracking-tight sm:text-4xl">
				Practice summary
			</h1>
		{/if}
		{#if !ready}
			<p role="status" class="text-medium mt-6 self-center text-on-surface">
				<span class="inline-flex items-center gap-2"
					><IconLoading class="size-4 animate-spin text-dark" aria-hidden="true" />
					Loading your session…
				</span>
			</p>
		{:else if !session || !counts}
			<div class="flex h-full w-full flex-col items-center justify-center">
				<div class="mt-6 max-w-xl rounded border-2 border-on-surface-muted bg-surface-accent p-5">
					<h1 class="text-lg font-bold">No practice session found</h1>
					<p class="mt-2 text-sm leading-relaxed text-on-surface">
						You haven't completed or started a practice session yet. Choose an option below to begin
						studying.
					</p>

					<div class="mt-4 flex flex-wrap justify-between gap-2">
						<Button href={practiceHref} size="sm">Start practicing</Button>
						<Button variant="secondary" size="sm" href={examHref}>Back to the exam</Button>
					</div>
				</div>
			</div>
		{:else}
			<p class="mt-2 text-sm leading-relaxed text-on-surface-muted">
				You answered <span class="font-mono font-bold tabular-nums">{counts.checked}</span> of
				<span class="font-mono font-bold tabular-nums">{counts.total}</span> questions.
			</p>

			<section aria-labelledby="totals-heading" class="mt-6">
				<h2 id="totals-heading" class="sr-only">Session totals</h2>

				<dl class="grid grid-cols-3 gap-2 sm:gap-4">
					<div
						class="borderon-correct-surface rounded-lg border-2 bg-correct-surface px-3 py-3 sm:px-4"
					>
						<dt class="text-xs font-semibold tracking-wide text-on-surface-muted uppercase">
							Correct
						</dt>
						<dd
							class="mt-1 flex items-center gap-2 font-mono text-3xl font-bold text-on-correct-surface tabular-nums"
						>
							<IconCorrect class="size-5 shrink-0" aria-hidden="true" />
							{counts.correct}
						</dd>
					</div>

					<div
						class="rounded-lg border-2 border-on-wrong-surface bg-wrong-surface px-3 py-3 sm:px-4"
					>
						<dt class="text-xs font-semibold tracking-wide text-on-surface-muted uppercase">
							Not Correct
						</dt>
						<dd
							class="mt-1 flex items-center gap-2 font-mono text-3xl font-bold text-on-wrong-surface tabular-nums"
						>
							<IconWrong class="size-5 shrink-0" aria-hidden="true" />
							{counts.wrong}
						</dd>
					</div>

					<div
						class="rounded-lg border-2 border-on-surface-muted bg-surface-accent px-3 py-3 sm:px-4"
					>
						<dt class="text-xs font-semibold tracking-wide text-on-surface-muted uppercase">
							Skipped
						</dt>
						<dd
							class="mt-1 flex items-center gap-2 font-mono text-3xl font-bold text-on-surface tabular-nums"
						>
							<IconSkip class="size-5 shrink-0" aria-hidden="true" />
							{counts.skipped}
						</dd>
					</div>
				</dl>

				<p class="mt-3 text-xs leading-relaxed font-medium text-on-surface">
					Skipped questions are not counted as wrong.
				</p>
			</section>

			<section aria-labelledby="review-heading" class="mt-12">
				<h2 id="review-heading" class="text-lg font-bold">Question review</h2>
				<p class="mt-1 text-sm text-on-surface-muted">
					Expand a question to see the explanation, every rationale, and the sources.
				</p>

				{#if review.length === 0}
					<p
						class="mt-5 rounded-sm border border-on-surface-muted bg-surface-accent p-4 text-sm text-on-surface-muted"
					>
						You did not answer any questions in this session.
					</p>
				{:else}
					<ol class="mt-5 space-y-2">
						{#each review as item (item.question.id)}
							<li>
								<details
									class="group rounded border border-on-surface-muted bg-surface-accent open:border-on-surface-muted"
								>
									<summary
										class="oxy-focus flex cursor-pointer list-none flex-wrap items-start gap-x-3 gap-y-1.5 rounded p-3 [&::-webkit-details-marker]:hidden"
									>
										<span class={statusClasses(item.isCorrect)}>
											{#if item.isCorrect}
												<IconCorrect class="size-3.5 shrink-0" aria-hidden="true" />
												Correct
											{:else}
												<IconWrong class="size-3.5 shrink-0" aria-hidden="true" />
												Not correct
											{/if}
										</span>
										<span
											class="mt-0.5 shrink-0 font-mono text-xs font-bold text-on-surface-muted tabular-nums"
										>
											{item.number}
										</span>
										<span
											class="line-clamp-2 min-w-0 flex-1 basis-48 text-sm leading-snug font-medium text-on-surface group-open:line-clamp-none"
										>
											<MarkdownText text={item.question.stem} />
										</span>
										<IconChevronDown
											class="mt-0.5 size-4 shrink-0 text-on-surface-muted transition-transform duration-200 group-open:rotate-180"
											aria-hidden="true"
										/>
									</summary>

									<div class="border-t border-surface-muted px-3 py-3 sm:px-4">
										<p class="text-sm leading-relaxed">
											{#if item.isCorrect}
												You chose:
												<strong class="font-semibold">{item.selected.shortLabel}</strong>.
											{:else}
												You chose:
												<strong class="font-semibold">{item.selected.shortLabel}</strong>. The
												correct answer is:
												<strong class="font-semibold">{item.correct.shortLabel}</strong>.
											{/if}
										</p>

										<p class="mt-2 text-sm leading-relaxed text-on-surface">
											<MarkdownText text={item.question.explanation} />
										</p>

										<h3
											class="mt-4 text-xs font-bold tracking-wide text-on-surface-muted uppercase"
										>
											Answer options
										</h3>

										<ul class="mt-2 space-y-2">
											{#each item.question.options as option, index (option.id)}
												<li class={optionClasses(option)}>
													<div class="flex items-start gap-2">
														<span
															class="mt-0.5 font-mono text-xs font-bold text-on-surface-muted tabular-nums"
															aria-hidden="true">{index + 1}.</span
														>
														<MarkdownText
															text={option.text}
															class="min-w-0 flex-1 text-sm leading-snug"
														/>
													</div>

													{#if optionNote(option, item.selected.id)}
														<p
															class={cn(
																'mt-1 text-xs font-bold',
																option.isCorrect
																	? 'text-on-correct-surface'
																	: 'text-on-wrong-surface'
															)}
														>
															{optionNote(option, item.selected.id)}
														</p>
													{/if}

													<p class="mt-1 text-xs leading-relaxed text-on-surface-muted">
														<MarkdownText text={option.rationale} />
													</p>
												</li>
											{/each}
										</ul>

										{#if item.question.references.length > 0}
											<h3
												class="mt-4 text-xs font-bold tracking-wide text-on-surface-muted uppercase"
											>
												Sources
											</h3>

											<ul class="mt-1 space-y-1 text-xs leading-relaxed text-on-surface-muted">
												{#each item.question.references as reference, index (index)}
													{@const href = reference.url ? safeHref(reference.url) : null}
													<li>
														{#if href}
															<ExternalLink {href} iconClass="size-[0.9em]">
																{reference.title}
															</ExternalLink>
														{:else}
															{reference.title}
														{/if}
														{#if reference.author || reference.year}
															<span>
																— {[reference.author, reference.year]
																	.filter(Boolean)
																	.join(', ')}</span
															>
														{/if}
														{#if reference.note}
															<span>— {reference.note}</span>
														{/if}
													</li>
												{/each}
											</ul>
										{/if}
									</div>
								</details>
							</li>
						{/each}
					</ol>
				{/if}
			</section>
		{/if}
	</main>

	{#if ready && session}
		<PracticeFooter exam={data.exam} mode="summary" />
	{:else if !session || !counts}
		<footer class="w-full">
			<SiteFooter />
		</footer>
	{/if}
</div>
