import { browser } from '$app/env';
import type { Workspace } from './schema';

const STORAGE_KEY = 'mocks:authoring:v1';

interface StoredShape {
	bank: unknown;
	questions: unknown[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Autosave is intentionally lenient, drafts may contain empty fields, so this
 * checks the shape only. Structural validation happens in the editor.
 */
export function loadWorkspace(): Workspace | null {
	if (!browser) return null;

	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;

		const data: unknown = JSON.parse(raw);
		if (!isRecord(data) || !isRecord(data.bank) || !Array.isArray(data.questions)) {
			return null;
		}

		return data as unknown as Workspace & StoredShape;
	} catch {
		return null;
	}
}

export function saveWorkspace(workspace: Workspace): boolean {
	if (!browser) return false;

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
		return true;
	} catch {
		return false;
	}
}
