import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { BankNotReadyError, ExamNotFoundError, getBankRepository } from '#lib/server/repositories';
import type { RequestHandler } from './$types';

/**
 * Draws a practice session from the exam's practice bank. Unlike the exam
 * payload, this one carries correctness and feedback so checking an answer is
 * local. The draw must never be cached, it is per session.
 */
export const GET: RequestHandler = async ({ params, platform }) => {
	const repository = getBankRepository(platform?.env.DB ?? env.DB);

	try {
		const { questions } = await repository.drawPracticeSession(params.exam);
		return Response.json({ questions }, { headers: { 'cache-control': 'no-store' } });
	} catch (cause) {
		if (cause instanceof ExamNotFoundError) {
			error(404, 'Exam not found');
		}
		if (cause instanceof BankNotReadyError) {
			error(409, 'Practice is not available for this exam yet');
		}
		throw cause;
	}
};
