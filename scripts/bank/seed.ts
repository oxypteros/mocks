import { spawnSync } from 'node:child_process';
import { relative } from 'node:path';
import { hasErrors } from '../../src/lib/authoring/schema.ts';
import { writeBankArtifacts } from './artifacts.ts';
import { loadBankSource, printIssues, printSummary, repoRoot } from './source.ts';

const args = process.argv.slice(2);
const targets = args.filter((argument) => argument === '--local' || argument === '--remote');
if (targets.length > 1) {
	console.error('Choose one of --local or --remote, not both.');
	process.exit(1);
}

const target = targets[0] === '--remote' ? 'remote' : 'local';
const dryRun = args.includes('--dry-run');
const rootArgument = args.find((argument) => !argument.startsWith('--'));

let source;
try {
	source = loadBankSource(rootArgument, { requireQuestions: true });
} catch (error) {
	console.error((error as Error).message);
	process.exit(1);
}

printSummary(source);
printIssues(source.issues);

if (hasErrors(source.issues)) {
	process.exit(1);
}

let artifacts;
try {
	artifacts = writeBankArtifacts(source);
} catch (error) {
	console.error((error as Error).message);
	process.exit(1);
}

console.log(`Wrote ${relative(repoRoot, artifacts.sqlPath)}`);

if (dryRun) {
	console.log('Dry run: the SQL was generated but not applied.');
	process.exit(0);
}

console.log(`Seeding ${source.bank.id} into the ${target} D1 database (mocks-db)...`);
const result = spawnSync(
	'pnpm',
	[
		'exec',
		'wrangler',
		'd1',
		'execute',
		'mocks-db',
		target === 'remote' ? '--remote' : '--local',
		`--file=${artifacts.sqlPath}`
	],
	{ cwd: repoRoot, stdio: 'inherit' }
);

if (result.error) {
	console.error(result.error.message);
	process.exit(1);
}

process.exit(result.status ?? 1);
