<script lang="ts">
	import { cn } from '#lib/utils/cn';
	import { parseMarkdownText, type RichTextRun } from '#lib/utils/markdown-text';

	interface Props {
		text: string;
		class?: string;
	}

	let { text, class: className }: Props = $props();

	const blocks = $derived(parseMarkdownText(text));

	const codeBlockClass =
		'my-2 block overflow-x-auto rounded-sm border border-surface-muted bg-surface px-3 py-2 font-mono text-[0.8125rem] leading-relaxed font-normal whitespace-pre text-on-surface';
	const inlineCodeClass =
		'rounded-xs bg-surface px-1 py-px font-mono text-[0.95em] font-medium text-dark';
</script>

{#snippet inlineRun(run: RichTextRun)}
	{#if run.code}
		<code class={inlineCodeClass}>{run.text}</code>
	{:else if run.strong && run.emphasis}
		<strong class="font-bold"><em>{run.text}</em></strong>
	{:else if run.strong}
		<strong class="font-bold">{run.text}</strong>
	{:else if run.emphasis}
		<em>{run.text}</em>
	{:else}
		{run.text}
	{/if}
{/snippet}

<span class={cn('min-w-0', className)}>
	{#each blocks as block, blockIndex (blockIndex)}
		{#if block.type === 'code'}
			<span class={codeBlockClass}><code>{block.code}</code></span>
		{:else}
			<span class="whitespace-pre-line"
				>{#each block.runs as run, runIndex (runIndex)}{@render inlineRun(run)}{/each}</span
			>
		{/if}
	{/each}
</span>
