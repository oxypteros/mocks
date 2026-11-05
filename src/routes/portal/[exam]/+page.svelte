<script lang="ts">
	import type { PageProps } from './$types';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { RadioGroup } from 'bits-ui';
	import Button from '#lib/components/ui/Buttons.svelte';
	import ExternalLink from '#lib/components/ui/ExternalLink.svelte';
	import SiteHeader from '#lib/components/layout/site/SiteHeader.svelte';
	import SiteFooter from '#lib/components/layout/site/SiteFooter.svelte';
	import {
		buildDurationOptions,
		readExamDuration,
		writeExamDuration
	} from '#lib/utils/exam-duration';

	// Icons
	import IconClock from '~icons/oxy/clock';
	import IconCheck from '~icons/oxy/circle-check';

	let { data }: PageProps = $props();

	// Every number on this page comes from the exam record. Only the time limit
	// is adjustable.
	const durationOptions = $derived(buildDurationOptions(data.exam.durationMinutes));
	const modules = $derived([...data.exam.modules].sort((a, b) => a.position - b.position));

	let chosenMinutes = $state<string | null>(null);
	const selectedMinutes = $derived(chosenMinutes ?? String(data.exam.durationMinutes));
	const selectedOption = $derived(
		durationOptions.find((option) => String(option.minutes) === selectedMinutes) ??
			durationOptions[0]
	);
	const extended = $derived(selectedOption.minutes !== data.exam.durationMinutes);

	const lobbyHref = $derived(resolve('/portal/[exam]/start', { exam: data.exam.slug }));
	const practiceHref = $derived(resolve('/portal/[exam]/practice', { exam: data.exam.slug }));

	// Restore the last choice when the user comes back from the lobby
	onMount(() => {
		const stored = readExamDuration(data.exam.slug);
		if (stored && durationOptions.some((option) => option.minutes === stored)) {
			chosenMinutes = String(stored);
		}
	});

	function handleStart() {
		writeExamDuration(data.exam.slug, selectedOption.minutes);
	}
</script>

<svelte:head>
	<title>{data.exam.title} — Mocks</title>
	<meta
		name="description"
		content="Unofficial {data.exam.title} practice exam: {data.exam.questionCount} questions, {data
			.exam.durationMinutes} minutes, {data.exam.passPercent}% to pass. Free and anonymous."
	/>
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<header>
		<SiteHeader />
	</header>

	<main
		id="main-content"
		tabindex="-1"
		class="mx-auto w-full max-w-6xl flex-1 px-3 py-10 sm:px-6 sm:py-14"
	>
		<div class="pb-8">
			<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
				{#if data.exam.unofficial}
					<span
						class="rounded bg-on-surface-muted px-1 py-0.5 font-mono text-xs font-bold text-surface-accent uppercase"
					>
						Unofficial
					</span>
				{/if}
				<span class="inline-flex items-center gap-2 text-sm text-on-surface-muted">
					{data.exam.provider}
					<span class="size-1 rounded bg-on-surface-muted"></span>
					<span class="sr-only">Exam language:</span>
					<span class="uppercase">{data.exam.contentLocale}</span>
				</span>
			</div>

			<h1 class="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
				{data.exam.title}
			</h1>
			<div class="my-6 h-2 w-full bg-on-surface-muted"></div>
		</div>

		<section aria-labelledby="start-heading">
			<h2
				id="start-heading"
				class="mb-4 font-mono text-xs font-bold tracking-wider text-on-surface-muted uppercase"
			>
				Practice for the exam
			</h2>

			<div class="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
				<!-- Left Column (1) Timed Exam -->
				<div
					class="flex h-full flex-col justify-between rounded-lg border-2 border-on-surface-muted bg-surface-accent p-5 transition-colors duration-300 hover:border-primary hover:bg-light sm:p-8"
				>
					<div>
						<h3 class="text-2xl font-bold">Timed Mock Exam</h3>
						<p class="mt-2 text-sm leading-relaxed text-pretty text-on-surface-muted">
							Questions are drawn from all {modules.length} modules. Answers and explanations appear after
							you submit.
						</p>
						<div>
							<div
								class="my-12 flex w-full flex-wrap justify-between gap-2 text-base leading-relaxed text-pretty text-on-surface-muted"
							>
								<p>
									<span class="font-mono text-xl font-semibold text-on-surface"
										>{data.exam.questionCount}</span
									>
									questions.
								</p>
								<p>
									<span class="font-mono text-xl font-semibold text-on-surface"
										>{data.exam.optionCount}</span
									>
									options each.
								</p>

								<p>
									<span class="font-mono text-xl font-semibold text-on-surface"
										>{data.exam.passPercent}%</span
									>
									to pass.
								</p>
							</div>
						</div>

						<fieldset class="mt-6 border-t-2 border-on-surface-muted pt-3">
							<legend
								id="time-heading"
								class="flex items-center gap-1.5 text-xs font-bold tracking-wide text-on-surface uppercase"
							>
								<IconClock class="size-4" aria-hidden="true" />
								Time limit
							</legend>
							<p
								id="time-description"
								class="mt-1 text-sm leading-relaxed text-pretty text-on-surface-muted"
							>
								Extra time changes the exam duration only. You can pause the timer at any point
								during the exam.
							</p>

							<RadioGroup.Root
								value={selectedMinutes}
								onValueChange={(value) => (chosenMinutes = value)}
								aria-labelledby="time-heading"
								aria-describedby="time-description"
								class="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4"
							>
								{#each durationOptions as option (option.multiplier)}
									{@const checked = selectedMinutes === String(option.minutes)}
									<RadioGroup.Item
										value={String(option.minutes)}
										class="oxy-focus flex cursor-pointer flex-col rounded border-2 p-2.5 text-left text-xs transition-colors
							{checked
											? 'border-primary-accent bg-light font-semibold'
											: 'border-on-surface-muted bg-light/70 font-medium hover:bg-surface-accent'}"
									>
										<span class="flex items-center justify-between gap-2">
											<span class="text-[14px]">{option.label}</span>
											{#if checked}
												<IconCheck
													class="size-3.5 shrink-0 text-primary-accent"
													aria-hidden="true"
												/>
											{/if}
										</span>
										<span class="mt-1 text-xs font-normal text-on-surface">
											{option.detail}
										</span>
									</RadioGroup.Item>
								{/each}
							</RadioGroup.Root>
						</fieldset>
					</div>

					<div class="mt-6 pt-6">
						<Button href={lobbyHref} size="lg" class="w-full" onclick={handleStart}>
							Start exam
							<span class="font-mono text-sm font-normal">({selectedOption.minutes} min)</span>
						</Button>
						<p class="mt-3 text-xs font-medium text-on-surface-muted">
							{#if extended}
								Extended time selected.
							{/if}
						</p>
					</div>
				</div>

				<!-- Right Column (2) -->
				<div class="flex flex-col gap-6">
					<!-- Blueprint (takes natural height needed for table) -->
					<section
						aria-labelledby="blueprint-heading"
						class="rounded-lg border-2 border-on-surface-muted bg-surface-accent/50 p-5 sm:p-8"
					>
						<h2 id="blueprint-heading" class="text-xl font-bold">Mock Exam blueprint</h2>
						<p class="mt-1 text-sm text-on-surface-muted">
							Questions are drawn from each module in these proportions.
						</p>

						<table class="mt-4 w-full border-collapse text-left text-sm">
							<caption class="sr-only">
								Modules in {data.exam.title} and the number of questions drawn from each
							</caption>
							<thead>
								<tr class="border-b-2 border-on-surface-muted font-mono text-xs uppercase">
									<th scope="col" class="py-2 pr-4 font-bold text-on-surface-muted">Module</th>
									<th scope="col" class="py-2 text-right font-bold text-on-surface-muted"
										>Questions</th
									>
								</tr>
							</thead>
							<tbody class="divide-y divide-on-surface-muted/30">
								{#each modules as module (module.id)}
									<tr>
										<th scope="row" class="py-2.5 pr-4 font-medium">{module.title}</th>
										<td class="py-2.5 text-right font-mono font-semibold tabular-nums">
											{module.questionCount ?? '—'}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</section>

					<!-- Practice mode -->
					<div
						class="flex flex-1 flex-col justify-between rounded-lg border-2 border-on-surface-muted bg-surface-accent p-5 transition-colors duration-300 hover:border-primary hover:bg-light sm:p-8"
					>
						<div>
							<h3 class="text-2xl font-bold">Practice Mode</h3>
							<p class="mt-2 text-sm leading-relaxed text-pretty text-on-surface-muted">
								Untimed practice with loose question format and feedback as you check each answer.
								Up to 20 random questions, or the whole bank when it is smaller.
							</p>
						</div>
						<div class="mt-6">
							{#if data.exam.practiceBank}
								<Button variant="secondary" size="lg" class="w-full" href={practiceHref}
									>Start practice</Button
								>
							{:else}
								<Button variant="secondary" size="lg" class="w-full" disabled
									>Not available yet</Button
								>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</section>

		<div
			class="mt-12 border-t-3 border-on-surface pt-6 text-xs leading-relaxed font-medium text-on-surface"
		>
			<h2 class="text-sm font-bold text-on-surface-muted">This is a practice exam</h2>
			<div class="w-full max-w-4xl">
				<p class="mt-2 text-pretty">
					Mocks is not affiliated with, endorsed by, or sponsored by the certification provider.
				</p>
				<p class="mt-1">
					{#if data.exam.disclaimer}
						{data.exam.disclaimer}
					{/if}
					{#if data.exam.providerUrl}
						Always check the
						<ExternalLink href={data.exam.providerUrl} iconClass="size-[0.9em]"
							>official exam page</ExternalLink
						>.
					{/if}
				</p>
				<p class="mt-1 max-w-3xl text-pretty">
					Your score here is practice feedback, <strong>not an official result</strong>, and does
					not predict or guarantee a pass.
				</p>
			</div>
		</div>
	</main>

	<footer class="w-full">
		<SiteFooter />
	</footer>
</div>
