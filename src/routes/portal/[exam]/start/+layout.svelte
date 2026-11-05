<script lang="ts">
	import { browser } from '$app/env';
	import { afterNavigate } from '$app/navigation';
	import type { LayoutProps } from './$types';
	import ExamFooter from '#lib/components/layout/portal/ExamFooter.svelte';

	let { data, children }: LayoutProps = $props();

	// Move focus to the new page's main region when the lobby, attempt, or exit
	// changes routes. The attempt focuses its question heading once the questions
	// load, so this is the fallback duting that request.
	afterNavigate(({ from }) => {
		if (!browser || !from) return;

		const target =
			document.getElementById('question-heading') ?? document.getElementById('main-content');
		target?.focus();
	});
</script>

{@render children()}
<ExamFooter exam={data.exam} />
