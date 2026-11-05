import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import {
	BankNotReadyError,
	ExamNotFoundError,
	InvalidAttemptError,
	getBankRepository
} from '#lib/server/repositories';
import type { SubmittedAnswer } from '#lib/domain/types';
import type { RequestHandler } from './$types';

function isSubmittedAnswer(value: unknown): value is SubmittedAnswer {
	if (typeof value !== 'object' || value === null) return false;

	const answer = value as Partial<SubmittedAnswer>;
	return (
		typeof answer.questionId === 'string' &&
		(answer.selectedOptionId === null || typeof answer.selectedOptionId === 'string')
	);
}

function isSubmittedAnswerList(value: unknown): value is SubmittedAnswer[] {
	return Array.isArray(value) && value.every(isSubmittedAnswer);
}

/**
 * Scores an ephemeral attempt. The client keeps the attempt in sessionStorage,
 * this endpoint only turns the submitted answers into feedback and stores
 * nothing.
 */
export const POST: RequestHandler = async ({ params, request, platform }) => {
	let body: unknown;

	try {
		body = await request.json();
	} catch {
		error(400, 'Expected a JSON body');
	}

	const answers = (body as { answers?: unknown } | null)?.answers;
	if (!isSubmittedAnswerList(answers)) {
		error(400, 'Expected an answers array');
	}

	const repository = getBankRepository(platform?.env.DB ?? env.DB);

	try {
		const result = await repository.scoreAttempt(params.exam, answers);
		return Response.json(result, { headers: { 'cache-control': 'no-store' } });
	} catch (cause) {
		if (cause instanceof ExamNotFoundError) {
			error(404, 'Exam not found');
		}
		if (cause instanceof BankNotReadyError) {
			error(409, 'This exam is not ready yet');
		}
		if (cause instanceof InvalidAttemptError) {
			error(400, 'The submitted answers are not valid for this exam');
		}
		throw cause;
	}
};
