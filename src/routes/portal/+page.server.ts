import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { env } from 'cloudflare:workers';
import { getBankRepository } from '#lib/server/repositories';
import type { PageServerLoad } from './$types';

/**
 * v0 ships one exam and no picker. A hand-typed `/portal` link should still
 * land on that exam instead of an empty page, so  resolve the first published
 * exam and redirect to its info page. When the picker lands, this load will
 * become the picker's list load
 */
export const load: PageServerLoad = async ({ platform }) => {
	const repository = getBankRepository(platform?.env.DB ?? env.DB);
	const [exam] = await repository.listExams();

	if (!exam) {
		error(404, 'No exams are available yet');
	}

	redirect(307, resolve('/portal/[exam]', { exam: exam.slug }));
};
