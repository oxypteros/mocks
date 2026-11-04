import { defineConfig } from 'drizzle-kit';

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const databaseId = process.env.CLOUDFLARE_DATABASE_ID;
const token = process.env.CLOUDFLARE_D1_TOKEN;

if (!accountId || !databaseId || !token) {
	throw new Error(
		'Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID and CLOUDFLARE_D1_TOKEN for remote drizzle-kit commands.'
	);
}

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'sqlite',
	driver: 'd1-http',
	dbCredentials: { accountId, databaseId, token },
	verbose: true,
	strict: true
});
