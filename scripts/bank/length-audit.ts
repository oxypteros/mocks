import { loadBankSource, printSummary, type BankSource } from './source.ts';

/**
 * Length audit. Reports the correct option's length rank per question and
 * the distribution per module and per 20-question window. It never edits
 * content, padding options to hit a target is forbidden, so a violation is
 * fixed by rewriting the claim an option makes.
 *
 * Usage:
 *   node scripts/bank/length-audit.ts [bank-root] [--strict]
 */

const arguments_ = process.argv.slice(2);
const strict = arguments_.includes('--strict');
const rootArgument = arguments_.find((argument) => !argument.startsWith('--'));

const ABSOLUTE =
	/\b(all|always|never|only|must|every|none|no|exclusively|entirely|completely|guarantee[sd]?)\b/i;
const WINDOW = 20;
const TARGET_MIN = 0.15;
const TARGET_MAX = 0.35;
const LIMIT_MIN = 0.1;
const LIMIT_MAX = 0.4;
const MAX_RUN = 3;
const LONG_OPTION = 140;

type Rank = 'longest' | 'middle' | 'shortest' | 'tied';

interface Result {
	id: string;
	module: string;
	rank: Rank;
	correct: number;
	distractorLengths: number[];
}

function rankOf(correct: number, distractors: number[]): Rank {
	const min = Math.min(...distractors);
	const max = Math.max(...distractors);
	if (correct > max) return 'longest';
	if (correct < min) return 'shortest';
	if (distractors.includes(correct)) return 'tied';
	return 'middle';
}

function collect(source: BankSource): Result[] {
	return source.questions.map(({ question }) => {
		const correctOption = question.options.find((option) => option.id === question.correctOptionId);
		const distractors = question.options.filter((option) => option.id !== question.correctOptionId);
		const correct = correctOption?.text.length ?? 0;
		return {
			id: question.id,
			module: question.module,
			rank: rankOf(
				correct,
				distractors.map((option) => option.text.length)
			),
			correct,
			distractorLengths: distractors.map((option) => option.text.length)
		};
	});
}

function countRanks(results: Result[]): Record<Rank, number> {
	const counts: Record<Rank, number> = { longest: 0, middle: 0, shortest: 0, tied: 0 };
	for (const result of results) counts[result.rank] += 1;
	return counts;
}

function longestRun(results: Result[]): { rank: Rank | null; length: number; end: string | null } {
	let best: Rank | null = null;
	let bestLength = 0;
	let bestEnd: string | null = null;
	let current: Rank | null = null;
	let currentLength = 0;
	for (const result of results) {
		if (result.rank === current) currentLength += 1;
		else {
			current = result.rank;
			currentLength = 1;
		}
		if (currentLength > bestLength) {
			best = current;
			bestLength = currentLength;
			bestEnd = result.id;
		}
	}
	return { rank: best, length: bestLength, end: bestEnd };
}

const source = loadBankSource(rootArgument);
printSummary(source);

const results = collect(source);
if (results.length === 0) {
	console.log('No complete questions to audit.');
	process.exit(0);
}

const problems: string[] = [];

console.log('\nPer-question rank (C = correct option length):');
for (const result of results) {
	const lengths = [...result.distractorLengths, result.correct].sort((a, b) => a - b).join('/');
	console.log(
		`  ${result.id.padEnd(32)} ${result.rank.padEnd(8)} C=${result.correct} (${lengths})`
	);
}

const modules = [...new Set(results.map((result) => result.module))];
console.log('\nRank distribution by module:');
for (const module of modules) {
	const moduleResults = results.filter((result) => result.module === module);
	const counts = countRanks(moduleResults);
	const total = moduleResults.length;
	const share = (count: number) => Math.round((count / total) * 100);
	console.log(
		`  ${module.padEnd(14)} n=${total}  ` +
			`longest ${counts.longest} (${share(counts.longest)}%)  ` +
			`middle ${counts.middle} (${share(counts.middle)}%)  ` +
			`shortest ${counts.shortest} (${share(counts.shortest)}%)  ` +
			`tied ${counts.tied} (${share(counts.tied)}%)`
	);
	if (total >= 10) {
		for (const [rank, count] of Object.entries(counts) as [Rank, number][]) {
			const ratio = count / total;
			if (ratio < LIMIT_MIN || ratio > LIMIT_MAX) {
				problems.push(
					`${module}: ${rank} is ${Math.round(ratio * 100)}% of ${total} questions ` +
						`(fail band ${LIMIT_MIN * 100}–${LIMIT_MAX * 100}%)`
				);
			} else if (ratio < TARGET_MIN || ratio > TARGET_MAX) {
				console.log(
					`  note: ${rank} is ${Math.round(ratio * 100)}%, outside the ` +
						`${TARGET_MIN * 100}–${TARGET_MAX * 100}% target but inside the fail band`
				);
			}
		}
	}
	const run = longestRun(moduleResults);
	if (run.length > MAX_RUN) {
		problems.push(
			`${module}: ${run.length} consecutive "${run.rank}" questions ending at ${run.end}`
		);
	}
}

console.log(`\n${WINDOW}-question windows (target 3–7 per bucket):`);
for (let start = 0; start < results.length; start += WINDOW) {
	const window = results.slice(start, start + WINDOW);
	if (window.length < WINDOW) continue;
	const counts = countRanks(window);
	const label = `${window[0].id}..${window[window.length - 1].id}`;
	console.log(
		`  ${label}  longest ${counts.longest}  middle ${counts.middle}  ` +
			`shortest ${counts.shortest}  tied ${counts.tied}`
	);
	for (const [rank, count] of Object.entries(counts) as [Rank, number][]) {
		if (count < 2 || count > 8) {
			problems.push(`${WINDOW}-question window ${label}: ${rank} is ${count} (fail band 2–8)`);
		} else if (count < 3 || count > 7) {
			console.log(
				`  note: ${label}: ${rank} is ${count}, outside the 3–7 target but inside the fail band`
			);
		}
	}
}

const uniqueLongest = results.filter((result) => result.rank === 'longest').length;
const uniqueShortest = results.filter((result) => result.rank === 'shortest').length;
console.log(
	`\nUnique longest ${uniqueLongest}/${results.length}, unique shortest ` +
		`${uniqueShortest}/${results.length}, tied or middle ` +
		`${results.length - uniqueLongest - uniqueShortest}/${results.length}`
);

console.log('\nSurface cues:');
let cueCount = 0;
for (const { question } of source.questions) {
	for (const option of question.options) {
		if (option.id === question.correctOptionId) continue;
		if (ABSOLUTE.test(option.text)) {
			console.log(`  ${question.id}: absolute word in ${option.id}`);
			cueCount += 1;
		}
	}
	for (const option of question.options) {
		if (option.text.length > LONG_OPTION) {
			console.log(`  ${question.id}: ${option.id} is ${option.text.length} characters`);
			cueCount += 1;
		}
	}
}
if (cueCount === 0) console.log('  none');
else
	problems.push(
		`${cueCount} surface cue(s): absolute words in distractors or options over ` +
			`${LONG_OPTION} characters`
	);

console.log(
	'\nSame-subject and "false for a stated reason" cannot be checked mechanically; ' +
		'review them against the stem and the BoK by hand.'
);

if (problems.length > 0) {
	console.log('\nADR-048 findings:');
	for (const problem of problems) console.log(`  - ${problem}`);
	if (strict) process.exit(1);
} else {
	console.log('\nNo ADR-048 findings.');
}
