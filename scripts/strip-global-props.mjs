// scripts/strip-global-props.mjs
//
// Wrangler's `wrangler types` command auto-generates a `GlobalProps.mainModule`
// entry in worker-configuration.d.ts that does a `typeof import(...)` on the
// built worker file (e.g. .svelte-kit/cloudflare/_worker.js).
// This forces TS to type-check that generated build output, producing thousands
// of unrelated errors.
// This script strips that block out right after generation.

import { readFileSync, writeFileSync } from 'node:fs';

const path = 'worker-configuration.d.ts';
const content = readFileSync(path, 'utf8');

const stripped = content.replace(
	/\n[ \t]*interface GlobalProps\s*\{[^}]*mainModule[^}]*\}\n?/,
	'\n'
);

if (stripped === content) {
	console.warn(
		'[strip-global-props] No generated GlobalProps (mainModule) block found — nothing to strip.'
	);
} else {
	writeFileSync(path, stripped);
	console.log(
		'[strip-global-props] Removed generated GlobalProps block from worker-configuration.d.ts'
	);
}
