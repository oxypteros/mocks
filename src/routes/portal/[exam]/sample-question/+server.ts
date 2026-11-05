import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import type { BankKind } from '#lib/domain/types';
import { getBankRepository } from '#lib/server/repositories';
import type { RequestHandler } from './$types';

const BANK_KINDS: BankKind[] = ['exam', 'practice', 'demo'];

/**
 * Returns one published sample question with its correctness, for a homepage
 * sample widget.
 *
 * `?bank=practice` draws from the exam's practice bank, falling back to the
 * exam's active bank when the practice bank is missing or empty.
 * `?exclude=<questionId>` asks for a different question so the "Try again"
 * button does not repeat the one already shown.
 */
export const GET: RequestHandler = async ({ params, url, platform }) => {
	const repository = getBankRepository(platform?.env.DB ?? env.DB);
	const excludeQuestionId = url.searchParams.get('exclude') || undefined;
	const bankParam = url.searchParams.get('bank');
	const bankKind = BANK_KINDS.find((kind) => kind === bankParam);
	const question = await repository.getSampleQuestion(params.exam, excludeQuestionId, bankKind);

	if (!question) {
		error(404, 'No sample question available for this exam');
	}

	return Response.json(question, {
		headers: { 'cache-control': 'no-store' }
	});
};
