import type { RouteId } from '$app/types';
// Icons (change logo here)
import Logo from '~icons/oxy/logo';

/** A link to a route inside the site. `id` must match a route that exists. */
export type SiteNavLink = {
	/** Route id, including the route group, for example `/(site)/about`. */
	id: RouteId;
	label: string;
};

/** A link that leaves the site. */
export type SiteExternalLink = {
	label: string;
	href: string;
	/** Optional text shown before the link, for example `Code:`. */
	prefix?: string;
};

/**
 * Brand and navigation for the site header and footer.
 *
 * Change the name, swap the logo import, and edit the link lists.
 * The header and footer read everything from here.
 */
export const site = {
	/** Brand name */
	name: 'Mocks',

	/** Logo mark shown beside the name. Swap the import above to change it. */
	logo: Logo,

	/** First year in the footer copyright range. */
	startYear: 2026,

	headerLinks: [{ id: '/(site)/about', label: 'About' }] as const satisfies readonly SiteNavLink[],

	footerLinks: [
		{ id: '/(site)/accessibility', label: 'Accessibility' }
	] as const satisfies readonly SiteNavLink[],

	disclaimer:
		'Mocks is an independent, non-commercial, open-source platform. All certification names and trademarks are property of their respective owners.',

	licenseLinks: [
		{
			prefix: 'Code:',
			label: 'MIT',
			href: 'https://github.com/oxypteros/mocks/blob/main/LICENSE'
		},
		{
			prefix: 'Content:',
			label: 'CC BY-SA 4.0',
			href: 'https://github.com/oxypteros/mocks/blob/main/content/LICENSE'
		}
	] as const satisfies readonly SiteExternalLink[],

	credit: {
		/** Set to false to hide the author credit in the footer. */
		enabled: true
	}
};
