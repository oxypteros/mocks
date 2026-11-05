import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { repoRoot } from './source.ts';

/**
 * Checks every reference URL in the question JSON and reports the questions
 * whose link is gone. A 404 (or 410) fails the run so a broken source is caught
 * before the bank is built. Unreachable hosts also fail, 401/403/429 are
 * reported as "blocked" because they usually mean the site refused the
 * automated request, not that the page is missing.
 *
 * Usage:
 *   node scripts/bank/link-check.ts [bank-root...] [--verbose] [--lenient]
 *                                   [--timeout=20000] [--concurrency=6]
 *
 * With no root it checks `content/cpacc/exam` and `content/cpacc/practice`.
 */

const arguments_ = process.argv.slice(2);
if (arguments_.includes('--help') || arguments_.includes('-h')) {
	console.log(`Check the reference URLs in question JSON and flag broken links.

Usage: node scripts/bank/link-check.ts [bank-root...] [options]

  --verbose           print every URL, including the ones that resolve
  --lenient           exit 0 even when a link is missing or unreachable
  --timeout=20000     request timeout per attempt in milliseconds
  --concurrency=6     parallel requests

With no root it checks content/cpacc/exam and content/cpacc/practice.
A 404 or 410 fails the run so a gone source is caught before the bank is built.
`);
	process.exit(0);
}

const verbose = arguments_.includes('--verbose');
const lenient = arguments_.includes('--lenient');

function flagValue(name: string, fallback: number): number {
	const match = arguments_.find((argument) => argument.startsWith(`--${name}=`));
	if (!match) return fallback;
	const value = Number(match.slice(name.length + 3));
	return Number.isFinite(value) && value > 0 ? value : fallback;
}

const timeoutMs = flagValue('timeout', 20000);
const concurrency = flagValue('concurrency', 6);

const roots =
	arguments_.filter((argument) => !argument.startsWith('--')).length > 0
		? arguments_.filter((argument) => !argument.startsWith('--'))
		: [join(repoRoot, 'content/cpacc/exam'), join(repoRoot, 'content/cpacc/practice')];

interface Target {
	url: string;
	questions: string[];
}

type Verdict = 'ok' | 'not-found' | 'blocked' | 'error' | 'unreachable';

interface Check {
	url: string;
	questions: string[];
	verdict: Verdict;
	status: number | null;
	finalUrl?: string;
	detail?: string;
}

const USER_AGENT = 'mocks-dev-link-check/1.0 (+https://github.com/; CPACC bank source validation)';

function questionFiles(directory: string): string[] {
	if (!existsSync(directory)) return [];
	return readdirSync(directory, { withFileTypes: true })
		.flatMap((entry) => {
			const fullPath = join(directory, entry.name);
			if (entry.isDirectory()) return questionFiles(fullPath);
			return entry.isFile() && entry.name.endsWith('.json') ? [fullPath] : [];
		})
		.sort();
}

function collectTargets(root: string): { targets: Map<string, Target>; files: number } {
	const targets = new Map<string, Target>();
	let files = 0;

	for (const file of questionFiles(join(root, 'questions'))) {
		if (statSync(file).size === 0) continue;
		files += 1;

		let question: { id?: string; references?: Array<{ url?: string }> };
		try {
			question = JSON.parse(readFileSync(file, 'utf8'));
		} catch (error) {
			console.warn(`Skipping ${relative(root, file)}: ${(error as Error).message}`);
			continue;
		}

		const id = question.id ?? relative(root, file).split(sep).join('/');
		for (const reference of question.references ?? []) {
			const url = reference.url?.trim();
			if (!url) continue;
			const target = targets.get(url) ?? { url, questions: [] };
			if (!target.questions.includes(id)) target.questions.push(id);
			targets.set(url, target);
		}
	}

	return { targets, files };
}

function verdictFor(status: number | null): Verdict {
	if (status === null) return 'unreachable';
	if (status === 404 || status === 410) return 'not-found';
	if (status === 401 || status === 403 || status === 405 || status === 429) return 'blocked';
	if (status >= 200 && status < 400) return 'ok';
	return 'error';
}

async function request(url: string, method: 'HEAD' | 'GET'): Promise<Response> {
	return fetch(url, {
		method,
		redirect: 'follow',
		signal: AbortSignal.timeout(timeoutMs),
		headers: {
			'user-agent': USER_AGENT,
			accept: '*/*',
			...(method === 'GET' ? { range: 'bytes=0-2047' } : {})
		}
	});
}

async function probe(url: string): Promise<Check> {
	const base = {
		url,
		questions: [],
		verdict: 'unreachable' as Verdict,
		status: null as number | null
	};

	for (let attempt = 0; attempt < 2; attempt += 1) {
		try {
			let response = await request(url, 'HEAD');
			// Some servers reject HEAD even when the page exists; confirm with a
			// ranged GET before calling the link blocked.
			if ([400, 403, 405, 501].includes(response.status)) {
				await response.body?.cancel();
				response = await request(url, 'GET');
			}

			const status = response.status;
			await response.body?.cancel();

			if ([429, 500, 502, 503, 504].includes(status) && attempt === 0) {
				await new Promise((resolveTimer) => setTimeout(resolveTimer, 1500));
				continue;
			}

			return {
				...base,
				verdict: verdictFor(status),
				status,
				finalUrl: response.url && response.url !== url ? response.url : undefined
			};
		} catch (error) {
			if (attempt === 0) {
				await new Promise((resolveTimer) => setTimeout(resolveTimer, 1500));
				continue;
			}
			const message = error instanceof Error ? error.message : String(error);
			return { ...base, verdict: 'unreachable', status: null, detail: message };
		}
	}

	return base;
}

async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
	const queue = [...items];
	const lanes = Math.min(limit, queue.length);
	await Promise.all(
		Array.from({ length: lanes }, async () => {
			for (;;) {
				const item = queue.shift();
				if (item === undefined) return;
				await worker(item);
			}
		})
	);
}

const targets = new Map<string, Target>();
let fileCount = 0;
let skippedRoots = 0;

for (const root of roots) {
	const absolute = resolve(root);
	if (!existsSync(join(absolute, 'questions'))) {
		console.warn(`No questions directory under ${absolute}`);
		skippedRoots += 1;
		continue;
	}
	console.log(`Reading ${absolute}`);
	const collected = collectTargets(absolute);
	fileCount += collected.files;
	for (const [url, target] of collected.targets) {
		const existing = targets.get(url) ?? { url, questions: [] };
		for (const id of target.questions) {
			if (!existing.questions.includes(id)) existing.questions.push(id);
		}
		targets.set(url, existing);
	}
}

if (skippedRoots === roots.length) {
	console.error('No bank roots to check.');
	process.exit(2);
}

const list = [...targets.values()].sort((left, right) => left.url.localeCompare(right.url));
console.log(
	`\nChecking ${list.length} unique URL(s) from ${fileCount} question file(s) ` +
		`(timeout ${timeoutMs} ms, concurrency ${concurrency})\n`
);

const checks: Check[] = new Array(list.length);
let next = 0;
let completed = 0;
await runPool(list, concurrency, async () => {
	const index = next++;
	const target = list[index];
	const check = await probe(target.url);
	check.questions = target.questions;
	checks[index] = check;
	completed += 1;
	if (verbose || check.verdict !== 'ok') {
		const status = check.status === null ? 'ERR' : String(check.status);
		console.log(`  ${status.padStart(3)}  ${check.verdict.padEnd(11)} ${check.url}`);
	} else if (process.stdout.isTTY && completed % 10 === 0) {
		process.stdout.write(`  ... ${completed}/${list.length}\r`);
	}
});

const byVerdict = (verdict: Verdict) => checks.filter((check) => check.verdict === verdict);
const notFound = byVerdict('not-found');
const unreachable = byVerdict('unreachable');
const blocked = byVerdict('blocked');
const errors = byVerdict('error');
const ok = byVerdict('ok');

function printQuestions(check: Check) {
	for (const id of check.questions) console.log(`      ${id}`);
	if (check.finalUrl) console.log(`      redirected to ${check.finalUrl}`);
	if (check.detail) console.log(`      ${check.detail}`);
}

if (notFound.length > 0) {
	console.log(`\nNot found (404/410) — ${notFound.length} URL(s):`);
	for (const check of notFound) {
		console.log(`  ${check.status}  ${check.url}`);
		printQuestions(check);
	}
}

if (unreachable.length > 0) {
	console.log(`\nUnreachable — ${unreachable.length} URL(s):`);
	for (const check of unreachable) {
		console.log(`  ERR  ${check.url}`);
		printQuestions(check);
	}
}

if (errors.length > 0) {
	console.log(`\nServer errors (5xx) — ${errors.length} URL(s):`);
	for (const check of errors) {
		console.log(`  ${check.status}  ${check.url}`);
		printQuestions(check);
	}
}

if (blocked.length > 0) {
	console.log(`\nBlocked or rate-limited (check by hand) — ${blocked.length} URL(s):`);
	for (const check of blocked) {
		console.log(`  ${check.status}  ${check.url}`);
		printQuestions(check);
	}
}

const flagged = new Set([...notFound, ...unreachable].flatMap((check) => check.questions));
console.log(
	`\nSummary: ${list.length} URL(s), ${ok.length} ok, ${notFound.length} not found, ` +
		`${errors.length} server error(s), ${blocked.length} blocked, ` +
		`${unreachable.length} unreachable`
);
if (flagged.size > 0) {
	console.log(`Questions with a broken link (${flagged.size}):`);
	for (const id of [...flagged].sort()) console.log(`  ${id}`);
}

if (!lenient && (notFound.length > 0 || unreachable.length > 0)) {
	process.exit(1);
}
