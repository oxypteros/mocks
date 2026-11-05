<script lang="ts">
	import type { ResultsModuleView } from '#lib/utils/results-view';

	interface ScoreBarsProps {
		modules: ResultsModuleView[];
	}

	let { modules }: ScoreBarsProps = $props();
</script>

<section aria-labelledby="module-heading" class="min-w-0">
	<div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
		<h2 id="module-heading" class="text-xs font-bold tracking-wide text-on-surface-muted uppercase">
			By module
		</h2>
		<ul class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-on-surface-muted">
			<li class="flex items-center gap-1.5">
				<span class="size-2.5 rounded-sm bg-on-correct-surface" aria-hidden="true"></span>
				Correct
			</li>
			<li class="flex items-center gap-1.5">
				<span class="size-2.5 rounded-sm bg-on-wrong-surface" aria-hidden="true"></span>
				Wrong
			</li>
		</ul>
	</div>

	<ul class="mt-4 space-y-4">
		{#each modules as module (module.moduleId)}
			{@const clipId = `module-bar-${module.moduleId}`}
			<li>
				<div class="flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
					<p class="text-sm font-semibold text-balance">{module.title}</p>
					<p class="ml-auto shrink-0 font-mono text-sm tabular-nums">
						<span class="font-bold">{module.percent}%</span>
						<span class="text-on-surface-muted">
							· {module.correctCount}/{module.questionCount}
						</span>
					</p>
				</div>

				<!-- The bar repeats the counts above, so it is decorative. -->
				<svg class="mt-1.5 h-2 w-full" aria-hidden="true" focusable="false">
					<defs>
						<clipPath id={clipId}>
							<rect x="0" y="0" width="100%" height="100%" rx="2" />
						</clipPath>
					</defs>
					<g clip-path="url(#{clipId})">
						<rect x="0" y="0" width="100%" height="100%" class="fill-on-wrong-surface" />
						<rect
							x="0"
							y="0"
							width="{module.percent}%"
							height="100%"
							class="fill-on-correct-surface"
						/>
					</g>
				</svg>
			</li>
		{/each}
	</ul>
</section>
