import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { getBankRepository } from '#lib/server/repositories';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, platform }) => {
	const repository = getBankRepository(platform?.env.DB ?? env.DB);
	const exam = await repository.getExam(params.exam);

	if (!exam) {
		error(404, 'Exam not found');
	}

	return { exam };
};
