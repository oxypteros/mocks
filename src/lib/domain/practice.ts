import type { Reference } from './types';

/**
 * Practice sessions draw a fixed number of questions, or every question when the
 * bank is smaller.
 */
export const PRACTICE_SESSION_SIZE = 20;

/**
 * Everything the question player needs to render a checked practice answer.
 */
export interface PracticeFeedback {
	correctOptionId: string;
	correctLabel: string;
	correctText: string;
	correctRationale: string;
	selectedLabel: string;
	selectedText: string;
	selectedRationale: string;
	correct: boolean;
	explanation: string;
	references: Reference[];
}
