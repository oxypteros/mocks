import { relative } from 'node:path';
import { hasErrors } from '../../src/lib/authoring/schema.ts';
import { writeBankArtifacts } from './artifacts.ts';
import { loadBankSource, printIssues, printSummary, repoRoot } from './source.ts';

const rootArgument = process.argv.slice(2).find((argument) => !argument.startsWith('--'));

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

try {
	const artifacts = writeBankArtifacts(source);
	console.log(`Wrote ${relative(repoRoot, artifacts.jsonPath)}`);
	console.log(`Wrote ${relative(repoRoot, artifacts.sqlPath)}`);
} catch (error) {
	console.error((error as Error).message);
	process.exit(1);
}
