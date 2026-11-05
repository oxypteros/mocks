/**
 * A deliberately small Markdown renderer for question content.
 *
 * The stored `stem`, option `text`, `explanation`, and option `rationale` may
 * contain Markdown. Question content is treated as untrusted input so this
 * parser supports only the subset the UI can render safely and predictably:
 *
 * - fenced code blocks (``` or ~~~, with an optional info string)
 * - inline code spans
 * - strong (`**text**` or `__text__`) and emphasis (`*text*` or `_text_`)
 *
 * Links, images, headings, lists, tables, and raw HTML are not parsed. They stay
 * literal text, and the Svelte renderer prints every run through text
 * interpolation, so markup can never become DOM.
 */

export interface RichTextRun {
	text: string;
	strong: boolean;
	emphasis: boolean;
	code: boolean;
}

export interface RichTextTextBlock {
	type: 'text';
	runs: RichTextRun[];
}

export interface RichTextCodeBlock {
	type: 'code';
	code: string;
}

export type RichTextBlock = RichTextTextBlock | RichTextCodeBlock;

const FENCE_OPEN = /^[ \t]{0,3}(`{3,}|~{3,})(.*)$/;
const FENCE_CLOSE = /^[ \t]{0,3}(`{3,}|~{3,})[ \t]*$/;
const PUNCTUATION = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';

function isWhitespace(value: string): boolean {
	return /\s/.test(value);
}

function isWord(value: string): boolean {
	return /[A-Za-z0-9]/.test(value);
}

function runLength(value: string, start: number, character: string): number {
	let length = 0;
	while (value[start + length] === character) length++;
	return length;
}

/**
 * Finds the next matching backtick run. Backslash escapes do not apply inside a
 * code span, so the search does not skip them.
 */
function findBacktickRun(value: string, from: number, length: number): number {
	for (let index = from; index < value.length; index++) {
		if (value[index] !== '`') continue;
		const run = runLength(value, index, '`');
		if (run === length) return index;
		index += run - 1;
	}
	return -1;
}

/**
 * Finds a closing emphasis run of exactly `length` characters, skipping escaped
 * characters and code spans. Requiring an exact run avoids treating the opening
 * `**` of nested bold text as the closing delimiter of an outer italic span.
 */
function findEmphasisClose(value: string, from: number, character: string, length: number): number {
	for (let index = from; index < value.length; index++) {
		const current = value[index];

		if (current === '\\' && index + 1 < value.length && PUNCTUATION.includes(value[index + 1])) {
			index++;
			continue;
		}

		if (current === '`') {
			const run = runLength(value, index, '`');
			const close = findBacktickRun(value, index + run, run);
			index = close === -1 ? index + run - 1 : close + run - 1;
			continue;
		}

		if (current !== character) continue;

		const run = runLength(value, index, character);
		const previous = index > 0 ? value[index - 1] : '';
		const next = value[index + run] ?? '';
		const canClose =
			previous !== '' &&
			!isWhitespace(previous) &&
			(character === '*' || !(isWord(previous) && isWord(next)));

		if (run === length && canClose) return index;
		index += run - 1;
	}

	return -1;
}

function parseInline(value: string, strong: boolean, emphasis: boolean): RichTextRun[] {
	const runs: RichTextRun[] = [];
	let buffer = '';
	let index = 0;

	const commit = (text: string, options: Partial<RichTextRun> = {}) => {
		if (!text) return;
		runs.push({
			text,
			strong: options.strong ?? strong,
			emphasis: options.emphasis ?? emphasis,
			code: options.code ?? false
		});
	};

	const flush = () => {
		commit(buffer);
		buffer = '';
	};

	while (index < value.length) {
		const character = value[index];

		if (character === '\\' && index + 1 < value.length && PUNCTUATION.includes(value[index + 1])) {
			buffer += value[index + 1];
			index += 2;
			continue;
		}

		if (character === '`') {
			const run = runLength(value, index, '`');
			const close = findBacktickRun(value, index + run, run);

			if (close !== -1) {
				flush();
				commit(value.slice(index + run, close).replace(/\n/g, ' '), {
					code: true,
					strong: false,
					emphasis: false
				});
				index = close + run;
				continue;
			}

			buffer += value.slice(index, index + run);
			index += run;
			continue;
		}

		if (character === '*' || character === '_') {
			const run = Math.min(runLength(value, index, character), 3);
			const next = value[index + run] ?? '';
			const previous = index > 0 ? value[index - 1] : '';
			const canOpen =
				next !== '' &&
				!isWhitespace(next) &&
				(character === '*' || !isWord(previous) || !isWord(next));

			if (canOpen) {
				const close = findEmphasisClose(value, index + run, character, run);

				if (close !== -1) {
					flush();
					const inner = value.slice(index + run, close);
					runs.push(...parseInline(inner, strong || run >= 2, emphasis || run === 1 || run === 3));
					index = close + run;
					continue;
				}
			}

			buffer += value.slice(index, index + run);
			index += run;
			continue;
		}

		buffer += character;
		index++;
	}

	flush();
	return runs;
}

function parseBlocks(value: string): RichTextBlock[] {
	const lines = value.split('\n');
	const blocks: RichTextBlock[] = [];
	let textLines: string[] = [];

	const flushText = () => {
		if (textLines.length === 0) return;
		const text = textLines.join('\n');
		const runs = parseInline(text, false, false);
		if (runs.length > 0) blocks.push({ type: 'text', runs });
		textLines = [];
	};

	for (let index = 0; index < lines.length; index++) {
		const opening = FENCE_OPEN.exec(lines[index]);

		if (opening) {
			const marker = opening[1][0];
			const length = opening[1].length;
			let closeIndex = -1;

			for (let cursor = index + 1; cursor < lines.length; cursor++) {
				const closing = FENCE_CLOSE.exec(lines[cursor]);
				if (closing && closing[1][0] === marker && closing[1].length >= length) {
					closeIndex = cursor;
					break;
				}
			}

			if (closeIndex !== -1) {
				flushText();
				blocks.push({
					type: 'code',
					code: lines.slice(index + 1, closeIndex).join('\n')
				});
				index = closeIndex;
				continue;
			}
		}

		textLines.push(lines[index]);
	}

	flushText();
	return blocks;
}

/**
 * Parses the supported Markdown subset into blocks and inline runs. The output
 * is rendered by MarkdownText.svelte with ordinary Svelte text nodes, NEVER
 * with `{@html}`, so no content can inject markup.
 */
export function parseMarkdownText(value: string): RichTextBlock[] {
	if (!value) return [];
	return parseBlocks(value.replace(/\r\n?/g, '\n'));
}
