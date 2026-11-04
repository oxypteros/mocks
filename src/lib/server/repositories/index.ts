import { getDb } from '../db';
import type { BankRepository } from './bank';
import { D1BankRepository } from './d1';

export { BankNotReadyError, ExamNotFoundError, InvalidAttemptError } from './bank';
export type { BankRepository } from './bank';

/**
 * The single server-side entry point for content. Svelte templates should call
 * this from a `+page.server.ts`/`+layout.server.ts` load function and receive
 * domain objects, never D1 rows
 */
export function getBankRepository(d1: D1Database | undefined): BankRepository {
	if (!d1) {
		throw new Error('D1 binding DB is not available on this platform');
	}
	return new D1BankRepository(getDb(d1));
}
