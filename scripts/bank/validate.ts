import { hasErrors } from '../../src/lib/authoring/schema.ts';
import { loadBankSource, printIssues, printSummary } from './source.ts';

const rootArgument = process.argv.slice(2).find((argument) => !argument.startsWith('--'));

let source;
try {
	source = loadBankSource(rootArgument);
} catch (error) {
	console.error((error as Error).message);
	process.exit(1);
}

printSummary(source);
printIssues(source.issues);

if (hasErrors(source.issues)) {
	process.exit(1);
}

if (source.issues.length === 0) {
	console.log('No content issues.');
}
