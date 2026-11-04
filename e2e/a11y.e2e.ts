import { test, expect, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import axe, { type Result } from 'axe-core';

/**
 * Automated accessibility gate for pull requests into `main`.
 *
 * A green run means "no machine-detectable violations". It does not replace the
 * manual keyboard, screen-reader, zoom, forced-colors, and reduced-motion checks.
 *
 * Tags: axe has no `wcag21aaa` or `wcag22aaaa`. Unknown tags are silently
 * ignored, so the only AAA tag is `wcag2aaa`. The guard test at the bottom fails
 * if the AAA rules stop running.
 */
const AXE_TAGS = [
	'wcag2a',
	'wcag2aa',
	'wcag2aaa',
	'wcag21a',
	'wcag21aa',
	'wcag22aa',
	'best-practice'
];

/**
 * Every rule axe currently tags `wcag2aaa`, read from axe's metadata so a
 * renamed or newly added AAA rule fails the guard instead of dropping.
 * `wcag21aaa`/`wcag22aaa` do not exist, so this is the whole AAA
 * surface axe can evaluate.
 */
const AAA_RULES = axe
	.getRules()
	.filter((rule) => rule.tags.includes('wcag2aaa'))
	.map((rule) => rule.ruleId);

/** Rules that must be evaluated (pass, fail, incomplete, or inapplicable). */
const REQUIRED_RULES = ['color-contrast', ...AAA_RULES];

const VIEWPORTS = [
	{ name: 'mobile 320', width: 320, height: 800 },
	{ name: 'desktop 1280', width: 1280, height: 900 }
];

type Seed = 'attempt' | 'practice-summary';

interface ScanTarget {
	name: string;
	path: string;
	/** Selector that only matches once client-side data has rendered. */
	ready?: string;
	seed?: Seed;
	/**
	 * Puts the page into the state being scanned (open a dialog, reveal
	 * feedback, expand a result). Runs after `ready` and before the scan.
	 */
	prepare?: (page: Page) => Promise<void>;
}

/**
 * Waits for finite CSS transitions and animations to finish before scanning.
 * axe samples computed colours once, so scanning mid-transition reports contrast
 * ratios that never exist in the settled UI — the results filters fade between
 * light-on-dark and dark-on-light, and dialogs fade in.
 */
async function settleAnimations(page: Page) {
	await page.evaluate(async () => {
		const finite = document.getAnimations().filter((animation) => {
			const endTime = (animation.effect as KeyframeEffect | null)?.getComputedTiming().endTime;
			return typeof endTime === 'number' && Number.isFinite(endTime);
		});

		await Promise.all(finite.map((animation) => animation.finished.catch(() => undefined)));
	});
}

const TARGETS: ScanTarget[] = [
	{ name: 'home', path: '/' },
	{ name: 'about', path: '/about' },
	{ name: 'accessibility statement', path: '/accessibility' }
];

function formatResults(results: Result[]): string {
	return results
		.map((result) => {
			const nodes = result.nodes
				.map((node) => `    ${node.target.join(' ')}\n      ${node.failureSummary ?? ''}`)
				.join('\n');

			return `${result.id} (${result.impact ?? 'n/a'}): ${result.help}\n  ${result.helpUrl}\n${nodes}`;
		})
		.join('\n\n');
}

/**
 * "Incomplete" means axe could not decide (for example, text over an image or
 * gradient). These never fail the gate, so attach them to the report and add an
 * annotation so they are visible and reviewable in the PR.
 */
async function reportIncomplete(testInfo: TestInfo, label: string, incomplete: Result[]) {
	if (incomplete.length === 0) return;

	testInfo.annotations.push({
		type: 'axe-incomplete',
		description: `${label}: ${incomplete.map((r) => r.id).join(', ')}`
	});

	await testInfo.attach('axe-incomplete.txt', {
		body: formatResults(incomplete),
		contentType: 'text/plain'
	});
}

for (const viewport of VIEWPORTS) {
	for (const target of TARGETS) {
		const label = `${target.name} — ${viewport.name}`;

		test(label, async ({ page }, testInfo) => {
			await page.setViewportSize({ width: viewport.width, height: viewport.height });

			await page.goto(target.path);

			if (target.ready) {
				await page.locator(target.ready).first().waitFor({ state: 'visible' });
			}

			await expect(page.locator('body')).toBeVisible();

			if (target.prepare) {
				await target.prepare(page);
			}

			await settleAnimations(page);

			const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();

			await reportIncomplete(testInfo, label, results.incomplete);

			expect(
				results.violations,
				`axe violations on ${label}:\n\n${formatResults(results.violations)}`
			).toEqual([]);
		});
	}
}

/**
 * Guard: proves the gate actually evaluates the rules it claims to. If a tag is
 * misspelled or axe renames a rule, this fails instead of passing silently.
 */
test('axe gate evaluates the required rules', async ({ page }) => {
	// A future axe that drops the `wcag2aaa` tag would leave REQUIRED_RULES with
	// only `color-contrast` and quietly weaken the gate.
	expect(AAA_RULES.length, 'axe no longer tags any rule as wcag2aaa.').toBeGreaterThan(0);

	await page.goto('/');
	await expect(page.locator('body')).toBeVisible();

	const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();

	const evaluated = new Set(
		[...results.passes, ...results.violations, ...results.incomplete, ...results.inapplicable].map(
			(rule) => rule.id
		)
	);

	for (const rule of REQUIRED_RULES) {
		expect(evaluated, `axe did not evaluate "${rule}". Check AXE_TAGS.`).toContain(rule);
	}
});
