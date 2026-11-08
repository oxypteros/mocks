// scripts/wrangler-init.mjs
//
// `wrangler.jsonc` carries the D1 database id for one Cloudflare account, so it
// is not committed.
// Local development and CI start from the committed `wrangler.example.jsonc`.
// Copy it only when the real config is absent so an existing local config is
// never overwritten.

import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../wrangler.example.jsonc', import.meta.url));
const target = fileURLToPath(new URL('../wrangler.jsonc', import.meta.url));

if (existsSync(target)) {
	console.log('[wrangler-init] wrangler.jsonc already exists; leaving it untouched.');
} else {
	copyFileSync(source, target);
	console.log('[wrangler-init] Created wrangler.jsonc from wrangler.example.jsonc.');
	console.log('[wrangler-init] Replace the placeholder database_id before deploying remotely.');
}
