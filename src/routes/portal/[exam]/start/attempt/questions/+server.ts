import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { BankNotReadyError, ExamNotFoundError, getBankRepository } from '#lib/server/repositories';
import type { RequestHandler } from './$types';

/**
 * Draws this attempt's questions from D1. Correctness and feedback are withheld
 * until scoring, and the draw must never be cached (the order is per attempt).
 */
export const GET: RequestHandler = async ({ params, platform }) => {
	const repository = getBankRepository(platform?.env.DB ?? env.DB);

	try {
		const { questions } = await repository.drawAttempt(params.exam);
		return Response.json({ questions }, { headers: { 'cache-control': 'no-store' } });
	} catch (cause) {
		if (cause instanceof ExamNotFoundError) {
			error(404, 'Exam not found');
		}
		if (cause instanceof BankNotReadyError) {
			error(409, 'This exam is not ready yet');
		}
		throw cause;
	}
};
