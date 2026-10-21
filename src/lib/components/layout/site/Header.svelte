<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Path } from '$app/types';
	import SkipLink from '#lib/components/ui/SkipLink.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { localizeHref, locales } from '#lib/paraglide/runtime.js';
	//Icons
	import MocksLogo from '~icons/oxy/mocks-logo';
	type Locale = (typeof locales)[number];

	let { pathname, locale }: { pathname: string; locale: Locale } = $props();
</script>

<header>
	<SkipLink />
	<a href={resolve(localizeHref('/', { locale }) as Path)} class="">
		<MocksLogo class="h-4 w-auto" />
	</a>
</header>
