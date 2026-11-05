import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildBankFile } from '../../src/lib/authoring/bank-source.ts';
import { buildBankSql } from '../../src/lib/authoring/bank-sql.ts';
import { bankFileSchema, type BankFile } from '../../src/lib/authoring/schema.ts';
import { repoRoot, type BankSource } from './source.ts';

export interface BankArtifacts {
	bankFile: BankFile;
	jsonPath: string;
	sqlPath: string;
}

/**
 * Write the generated bank envelope and D1 seed into `build/bank/`. Both are
 * build artifacts, the per-question files remain the source of truth.
 */
export function writeBankArtifacts(source: BankSource): BankArtifacts {
	const questions = source.questions.map((item) => item.question);
	const bankFile = bankFileSchema.parse(buildBankFile(source.meta, questions));
	const sql = buildBankSql(source.exam, source.bank, questions);

	const outputDirectory = join(repoRoot, 'build/bank');
	mkdirSync(outputDirectory, { recursive: true });

	const jsonPath = join(outputDirectory, `${source.bank.id}-v${source.bank.version}.json`);
	const sqlPath = join(outputDirectory, `${source.bank.id}.sql`);
	writeFileSync(jsonPath, `${JSON.stringify(bankFile, null, '\t')}\n`);
	writeFileSync(sqlPath, sql);

	return { bankFile, jsonPath, sqlPath };
}
