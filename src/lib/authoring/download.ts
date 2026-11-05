import { browser } from '$app/env';
import { serialize } from './workspace';

/** Strip characters that are unsafe in file names on common platforms */
export function safeFilename(name: string, fallback = 'question'): string {
	const cleaned = name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return cleaned || fallback;
}

/** Download a JSON file entirely in the browser (no server round trip) */
export function downloadJson(filename: string, value: unknown): void {
	if (!browser) return;

	const blob = new Blob([serialize(value)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');

	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();

	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
