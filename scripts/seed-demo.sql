-- Demo content only. Used for CI tests and for development previews.
-- NOT FOR PRODUCTION
-- IDs are prefixed with cpacc-demo so cleanup is scoped to this data.
-- Seeds two banks for the cpacc-demo exam: the exam bank and a practice bank.

-- Remove any previous demo seed. Questions first, then modules (bank-scoped),
-- then banks, then the exam.
DELETE FROM questions WHERE bank_id IN ('cpacc-demo', 'cpacc-demo-practice');
DELETE FROM modules WHERE bank_id IN ('cpacc-demo', 'cpacc-demo-practice');
DELETE FROM banks WHERE id IN ('cpacc-demo', 'cpacc-demo-practice');
DELETE FROM exams WHERE id = 'cpacc-demo';

INSERT INTO exams (
	id,
	slug,
	title,
	provider,
	provider_url,
	unofficial,
	content_locale,
	blueprint_version,
	duration_minutes,
	question_count,
	option_count,
	pass_percent,
	sampling,
	question_order,
	option_order,
	option_label_style,
	disclaimer,
	status
) VALUES (
	'cpacc-demo',
	'cpacc-demo',
	'CPACC Demo (test data)',
	'Mocks demo',
	'https://www.accessibilityassociation.org/cpacc',
	1,
	'en',
	'demo',
	12,
	10,
	4,
	80,
	'stratified',
	'mixed',
	'shuffle',
	'numeric',
	'The official CPACC exam is administered by IAAP, which sets the curriculum, fees, booking, scoring and proctoring.',
	'published'
);

INSERT INTO banks (id, exam_id, kind, title, version, status) VALUES
	('cpacc-demo', 'cpacc-demo', 'demo', 'CPACC Demo Bank', '0.0.0-demo', 'published');

INSERT INTO modules (id, bank_id, title, position, question_count) VALUES
	('disabilities', 'cpacc-demo', 'Disabilities, Challenges, and Assistive Technologies', 0, 4),
	('accessibility', 'cpacc-demo', 'Accessibility and Universal Design', 1, 4),
	('standards', 'cpacc-demo', 'Standards, Laws, and Management Strategies', 2, 2);

INSERT INTO questions (
	id,
	exam_id,
	bank_id,
	module_id,
	type,
	stem,
	explanation,
	difficulty,
	tags,
	status,
	provenance,
	reviewer,
	reviewed_at,
	source_checked_at
) VALUES
	(
		'cpacc-demo-disabilities-0001',
		'cpacc-demo',
		'cpacc-demo',
		'disabilities',
		'single',
		'Which model of disability locates disability primarily in barriers created by society and the environment?',
		'The social model separates impairment from disability and focuses on removing the barriers that exclude people from participation.',
		2,
		'["models"]',
		'published',
		'authored',
		'demo-reviewer',
		unixepoch() * 1000,
		unixepoch() * 1000
	),
	(
		'cpacc-demo-disabilities-0002',
		'cpacc-demo',
		'cpacc-demo',
		'disabilities',
		'single',
		'Which term describes a difference in body function or structure, such as a visual or mobility difference?',
		'Impairment refers to a difference in body function or structure. Disability describes the interaction between that difference and barriers in the environment.',
		1,
		'["models"]',
		'published',
		'authored',
		'demo-reviewer',
		unixepoch() * 1000,
		unixepoch() * 1000
	),
	(
		'cpacc-demo-disabilities-0003',
		'cpacc-demo',
		'cpacc-demo',
		'disabilities',
		'single',
		'Which of these is an example of assistive technology?',
		'Assistive technology is a product or system that maintains or improves the functional capabilities of a person with a disability. A screen reader is one example.',
		1,
		'["assistive-technology"]',
		'published',
		'authored',
		'demo-reviewer',
		unixepoch() * 1000,
		unixepoch() * 1000
	),
	(
		'cpacc-demo-disabilities-0004',
		'cpacc-demo',
		'cpacc-demo',
		'disabilities',
		'single',
		'What is the main purpose of person-first language?',
		'Person-first language places the person before the disability in wording, for example "a person with a disability". It is a language choice, not a requirement to hide disability.',
		1,
		'["language"]',
		'published',
		'authored',
		'demo-reviewer',
		unixepoch() * 1000,
		unixepoch() * 1000
	),
	(
		'cpacc-demo-accessibility-0001',
		'cpacc-demo',
		'cpacc-demo',
		'accessibility',
		'single',
		'Which principle of universal design is about providing the same means of use for all users?',
		'Equitable use means the design is useful and marketable to people with diverse abilities and provides the same means of use where possible.',
		2,
		'["universal-design"]',
		'published',
		'authored',
		'demo-reviewer',
		unixepoch() * 1000,
		unixepoch() * 1000
	),
	(
		'cpacc-demo-accessibility-0002',
		'cpacc-demo',
		'cpacc-demo',
		'accessibility',
		'single',
		'What does WCAG stand for?',
		'WCAG is the Web Content Accessibility Guidelines, published by the W3C Web Accessibility Initiative.',
		1,
		'["wcag"]',
		'published',
		'authored',
		'demo-reviewer',
		unixepoch() * 1000,
		unixepoch() * 1000
	),
	(
		'cpacc-demo-accessibility-0003',
		'cpacc-demo',
		'cpacc-demo',
		'accessibility',
		'single',
		'Which practice most directly helps keyboard-only users?',
		'A visible focus indicator shows keyboard users where they are on the page as they move through interactive controls.',
		1,
		'["keyboard"]',
		'published',
		'authored',
		'demo-reviewer',
		unixepoch() * 1000,
		unixepoch() * 1000
	),
	(
		'cpacc-demo-accessibility-0004',
		'cpacc-demo',
		'cpacc-demo',
		'accessibility',
		'single',
		'What should alternative text for an informative image do?',
		'Alternative text should convey the purpose or information the image provides in its context. Repeating a nearby caption or describing every color is usually not helpful.',
		1,
		'["alt-text"]',
		'published',
		'authored',
		'demo-reviewer',
		unixepoch() * 1000,
		unixepoch() * 1000
	),
	(
		'cpacc-demo-standards-0001',
		'cpacc-demo',
		'cpacc-demo',
		'standards',
		'single',
		'Which U.S. law prohibits discrimination against people with disabilities in public accommodations?',
		'The Americans with Disabilities Act (ADA) prohibits discrimination on the basis of disability in employment, public services, and public accommodations.',
		1,
		'["law"]',
		'published',
		'authored',
		'demo-reviewer',
		unixepoch() * 1000,
		unixepoch() * 1000
	),
	(
		'cpacc-demo-standards-0002',
		'cpacc-demo',
		'cpacc-demo',
		'standards',
		'single',
		'What is an Accessibility Conformance Report (ACR) used for?',
		'An ACR documents how a product conforms to accessibility standards, usually by recording the results of an accessibility conformance evaluation.',
		2,
		'["acr"]',
		'published',
		'authored',
		'demo-reviewer',
		unixepoch() * 1000,
		unixepoch() * 1000
	);

INSERT INTO options (id, question_id, position, text, short_label, rationale, is_correct) VALUES
	('social-model', 'cpacc-demo-disabilities-0001', 0, 'The social model', 'Social model', 'Locates disability in barriers created by society and the environment.', 1),
	('medical-model', 'cpacc-demo-disabilities-0001', 1, 'The medical model', 'Medical model', 'Frames disability as a problem located within the individual.', 0),
	('charity-model', 'cpacc-demo-disabilities-0001', 2, 'The charity model', 'Charity model', 'Frames disabled people as recipients of care or pity.', 0),
	('tragedy-model', 'cpacc-demo-disabilities-0001', 3, 'The tragedy model', 'Tragedy model', 'Frames disability as a personal misfortune.', 0),

	('impairment', 'cpacc-demo-disabilities-0002', 0, 'Impairment', 'Impairment', 'A difference in body function or structure.', 1),
	('disability', 'cpacc-demo-disabilities-0002', 1, 'Disability', 'Disability', 'The interaction between a person and barriers in society.', 0),
	('barrier', 'cpacc-demo-disabilities-0002', 2, 'Barrier', 'Barrier', 'An obstacle in the environment or society.', 0),
	('accommodation', 'cpacc-demo-disabilities-0002', 3, 'Accommodation', 'Accommodation', 'A change that removes a barrier for a person.', 0),

	('screen-reader', 'cpacc-demo-disabilities-0003', 0, 'A screen reader', 'Screen reader', 'Software that converts on-screen content to speech or braille.', 1),
	('standard-keyboard', 'cpacc-demo-disabilities-0003', 1, 'A standard keyboard', 'Standard keyboard', 'A general input device, not assistive technology by itself.', 0),
	('monitor', 'cpacc-demo-disabilities-0003', 2, 'A computer monitor', 'Monitor', 'A general display device.', 0),
	('standing-desk', 'cpacc-demo-disabilities-0003', 3, 'A standing desk', 'Standing desk', 'Furniture that is not assistive technology in this context.', 0),

	('person-first', 'cpacc-demo-disabilities-0004', 0, 'To refer to the person before the disability', 'Person first', 'Emphasizes the person rather than the disability.', 1),
	('avoid-mention', 'cpacc-demo-disabilities-0004', 1, 'To avoid mentioning disability at all', 'Avoid mention', 'Person-first language does not require hiding disability.', 0),
	('diagnosis', 'cpacc-demo-disabilities-0004', 2, 'To describe a medical diagnosis', 'Diagnosis', 'It is a language choice, not a diagnosis.', 0),
	('legal-compliance', 'cpacc-demo-disabilities-0004', 3, 'To satisfy legal requirements', 'Legal compliance', 'It is not primarily a legal compliance tool.', 0),

	('equitable-use', 'cpacc-demo-accessibility-0001', 0, 'Equitable use', 'Equitable use', 'Provides the same means of use for all users where possible.', 1),
	('flexibility-in-use', 'cpacc-demo-accessibility-0001', 1, 'Flexibility in use', 'Flexibility', 'Accommodates a wide range of preferences and abilities.', 0),
	('simple-intuitive', 'cpacc-demo-accessibility-0001', 2, 'Simple and intuitive use', 'Simple use', 'Makes use easy to understand regardless of experience.', 0),
	('tolerance-for-error', 'cpacc-demo-accessibility-0001', 3, 'Tolerance for error', 'Error tolerance', 'Minimizes the consequences of accidental actions.', 0),

	('wcag', 'cpacc-demo-accessibility-0002', 0, 'Web Content Accessibility Guidelines', 'WCAG', 'The correct expansion of WCAG.', 1),
	('wca-guide', 'cpacc-demo-accessibility-0002', 1, 'Web Compliance Accessibility Guide', 'Compliance guide', 'Not the correct expansion.', 0),
	('wca-group', 'cpacc-demo-accessibility-0002', 2, 'Wide Content Access Group', 'Access group', 'Not the correct expansion.', 0),
	('wcag-guarantee', 'cpacc-demo-accessibility-0002', 3, 'Web Content Access Guarantee', 'Access guarantee', 'Not the correct expansion.', 0),

	('visible-focus', 'cpacc-demo-accessibility-0003', 0, 'Showing a visible focus indicator', 'Visible focus', 'Shows keyboard users where they are on the page.', 1),
	('autoplay', 'cpacc-demo-accessibility-0003', 1, 'Starting media automatically', 'Autoplay', 'Can distract users and does not help keyboard navigation.', 0),
	('small-targets', 'cpacc-demo-accessibility-0003', 2, 'Using very small click targets', 'Small targets', 'Makes pointing and keyboard focus harder to use.', 0),
	('color-only', 'cpacc-demo-accessibility-0003', 3, 'Using color alone to show status', 'Color only', 'Excludes users who cannot perceive the color difference.', 0),

	('purpose-alt', 'cpacc-demo-accessibility-0004', 0, 'Convey the purpose or information of the image', 'Purpose', 'Describes what the image communicates in context.', 1),
	('repeat-caption', 'cpacc-demo-accessibility-0004', 1, 'Repeat the nearby caption word for word', 'Repeat caption', 'Usually adds no new information.', 0),
	('list-colors', 'cpacc-demo-accessibility-0004', 2, 'List every color used in the image', 'List colors', 'Describing colors is rarely the purpose of the image.', 0),
	('image-label', 'cpacc-demo-accessibility-0004', 3, 'Say that it is an image', 'Image label', 'The screen reader already announces that it is an image.', 0),

	('ada', 'cpacc-demo-standards-0001', 0, 'Americans with Disabilities Act', 'ADA', 'Prohibits disability discrimination in public accommodations and other areas.', 1),
	('ferpa', 'cpacc-demo-standards-0001', 1, 'Family Educational Rights and Privacy Act', 'FERPA', 'Protects education records, not public accommodations.', 0),
	('hipaa', 'cpacc-demo-standards-0001', 2, 'Health Insurance Portability and Accountability Act', 'HIPAA', 'Protects health information privacy.', 0),
	('dmca', 'cpacc-demo-standards-0001', 3, 'Digital Millennium Copyright Act', 'DMCA', 'Addresses copyright, not disability discrimination.', 0),

	('acr-conformance', 'cpacc-demo-standards-0002', 0, 'To document how a product conforms to accessibility standards', 'Conformance', 'Records the results of an accessibility conformance evaluation.', 1),
	('legal-cert', 'cpacc-demo-standards-0002', 1, 'To certify that a product is legally compliant in every country', 'Legal certificate', 'An ACR documents conformance, not universal legal certification.', 0),
	('replace-testing', 'cpacc-demo-standards-0002', 2, 'To replace accessibility testing', 'Replace testing', 'An ACR reports evaluation results; it does not replace testing.', 0),
	('price-list', 'cpacc-demo-standards-0002', 3, 'To list the prices of assistive technology', 'Price list', 'An ACR is not a price list.', 0);

INSERT INTO question_references (question_id, position, title, url) VALUES
	('cpacc-demo-disabilities-0001', 0, 'Demo reference: models of disability', 'https://example.org/demo/models'),
	('cpacc-demo-disabilities-0002', 0, 'Demo reference: impairment and disability', 'https://example.org/demo/impairment'),
	('cpacc-demo-disabilities-0003', 0, 'Demo reference: assistive technology', 'https://example.org/demo/assistive-technology'),
	('cpacc-demo-disabilities-0004', 0, 'Demo reference: person-first language', 'https://example.org/demo/person-first'),
	('cpacc-demo-accessibility-0001', 0, 'Demo reference: universal design principles', 'https://example.org/demo/universal-design'),
	('cpacc-demo-accessibility-0002', 0, 'Demo reference: WCAG overview', 'https://example.org/demo/wcag'),
	('cpacc-demo-accessibility-0003', 0, 'Demo reference: keyboard accessibility', 'https://example.org/demo/keyboard'),
	('cpacc-demo-accessibility-0004', 0, 'Demo reference: alternative text', 'https://example.org/demo/alt-text'),
	('cpacc-demo-standards-0001', 0, 'Demo reference: ADA overview', 'https://example.org/demo/ada'),
	('cpacc-demo-standards-0002', 0, 'Demo reference: accessibility conformance reports', 'https://example.org/demo/acr');

-- Practice bank for the same demo exam. Practice questions are not bound to the
-- exam's modules or option count: true/false items have two options and the
-- modules below carry a null draw count (ADR-028).
INSERT INTO banks (id, exam_id, kind, title, version, status) VALUES
	('cpacc-demo-practice', 'cpacc-demo', 'practice', 'CPACC Demo Practice Bank', '0.0.0-demo', 'published');

INSERT INTO modules (id, bank_id, title, position, question_count) VALUES
	('general', 'cpacc-demo-practice', 'General accessibility', 0, NULL),
	('docs-code', 'cpacc-demo-practice', 'Documentation and code', 1, NULL);

INSERT INTO questions (
	id,
	exam_id,
	bank_id,
	module_id,
	type,
	stem,
	explanation,
	difficulty,
	tags,
	status,
	provenance,
	reviewer,
	reviewed_at,
	source_checked_at
) VALUES
	(
		'cpacc-demo-practice-general-0001',
		'cpacc-demo',
		'cpacc-demo-practice',
		'general',
		'single',
		'Accessibility only concerns people who use screen readers.',
		'Accessibility covers a wide range of disabilities and situations, including low vision, hearing, motor, cognitive, and temporary or situational limitations. Screen-reader support is one part of it.',
		1,
		'["basics"]',
		'published',
		'authored',
		'demo-reviewer',
		unixepoch() * 1000,
		unixepoch() * 1000
	),
	(
		'cpacc-demo-practice-general-0002',
		'cpacc-demo',
		'cpacc-demo-practice',
		'general',
		'single',
		'Captions help people who are deaf or hard of hearing and can also help people watching in a noisy place.',
		'Captions serve more than one audience. They are essential for people who cannot hear the audio and useful for anyone in a noisy or silent environment.',
		1,
		'["media"]',
		'published',
		'authored',
		'demo-reviewer',
		unixepoch() * 1000,
		unixepoch() * 1000
	),
	(
		'cpacc-demo-practice-general-0003',
		'cpacc-demo',
		'cpacc-demo-practice',
		'general',
		'single',
		'Text alternatives are only needed for images that contain text.',
		'Every meaningful image needs a text alternative, whether or not it contains text. Purely decorative images are the exception and should be hidden from assistive technology.',
		1,
		'["images"]',
		'published',
		'authored',
		'demo-reviewer',
		unixepoch() * 1000,
		unixepoch() * 1000
	),
	(
		'cpacc-demo-practice-general-0004',
		'cpacc-demo',
		'cpacc-demo-practice',
		'general',
		'single',
		'Building accessibility in from the start is usually cheaper than retrofitting it later.',
		'Retrofitting often means reworking layout, content, and components. Treating accessibility as a requirement from the beginning avoids repeated rework.',
		1,
		'["process"]',
		'published',
		'authored',
		'demo-reviewer',
		unixepoch() * 1000,
		unixepoch() * 1000
	),
	(
		'cpacc-demo-practice-general-0005',
		'cpacc-demo',
		'cpacc-demo-practice',
		'general',
		'single',
		'Passing automated accessibility checks is enough to call a website accessible.',
		'Automated checks catch only a subset of issues. Manual testing, including keyboard and screen-reader use, is required to judge accessibility.',
		1,
		'["testing"]',
		'published',
		'authored',
		'demo-reviewer',
		unixepoch() * 1000,
		unixepoch() * 1000
	),
	(
		'cpacc-demo-practice-general-0006',
		'cpacc-demo',
		'cpacc-demo-practice',
		'general',
		'single',
		'Keyboard access only matters for people who cannot use a mouse.',
		'Many people use a keyboard or another input device: keyboard-only users, switch users, people with temporary injuries, and power users. Keyboard support is a baseline requirement.',
		1,
		'["keyboard"]',
		'published',
		'authored',
		'demo-reviewer',
		unixepoch() * 1000,
		unixepoch() * 1000
	),
	(
		'cpacc-demo-practice-docs-code-0001',
		'cpacc-demo',
		'cpacc-demo-practice',
		'docs-code',
		'single',
		'In HTML, which attribute provides the text alternative for an image?',
		'The alt attribute is the standard text alternative for an image. It is read in place of the image and should describe its purpose in context.',
		1,
		'["html"]',
		'published',
		'authored',
		'demo-reviewer',
		unixepoch() * 1000,
		unixepoch() * 1000
	),
	(
		'cpacc-demo-practice-docs-code-0002',
		'cpacc-demo',
		'cpacc-demo-practice',
		'docs-code',
		'single',
		'What is the most reliable way to associate a visible form label with its input?',
		'A label element whose for attribute matches the input id gives the input an accessible name and lets clicking the label focus the input.',
		1,
		'["forms"]',
		'published',
		'authored',
		'demo-reviewer',
		unixepoch() * 1000,
		unixepoch() * 1000
	),
	(
		'cpacc-demo-practice-docs-code-0003',
		'cpacc-demo',
		'cpacc-demo-practice',
		'docs-code',
		'single',
		'Which heading structure is best for a documentation page?',
		'One h1 for the page title, then h2 and h3 in order, gives screen-reader users a navigable outline and keeps the document structure meaningful.',
		1,
		'["structure"]',
		'published',
		'authored',
		'demo-reviewer',
		unixepoch() * 1000,
		unixepoch() * 1000
	),
	(
		'cpacc-demo-practice-docs-code-0004',
		'cpacc-demo',
		'cpacc-demo-practice',
		'docs-code',
		'single',
		'What is the most accessible link text in documentation?',
		'Link text should describe the destination or purpose, so it makes sense when read out of context in a list of links.',
		1,
		'["links"]',
		'published',
		'authored',
		'demo-reviewer',
		unixepoch() * 1000,
		unixepoch() * 1000
	);

INSERT INTO options (id, question_id, position, text, short_label, rationale, is_correct) VALUES
	('true', 'cpacc-demo-practice-general-0001', 0, 'True', 'True', 'Accessibility is much broader than screen-reader use.', 0),
	('false', 'cpacc-demo-practice-general-0001', 1, 'False', 'False', 'Correct: accessibility covers many disabilities and situations.', 1),

	('true', 'cpacc-demo-practice-general-0002', 0, 'True', 'True', 'Correct: captions help both audiences.', 1),
	('false', 'cpacc-demo-practice-general-0002', 1, 'False', 'False', 'Captions are not limited to one audience.', 0),

	('true', 'cpacc-demo-practice-general-0003', 0, 'True', 'True', 'Meaningful images need alternatives even without text.', 0),
	('false', 'cpacc-demo-practice-general-0003', 1, 'False', 'False', 'Correct: any meaningful image needs a text alternative.', 1),

	('true', 'cpacc-demo-practice-general-0004', 0, 'True', 'True', 'Correct: early accessibility avoids expensive rework.', 1),
	('false', 'cpacc-demo-practice-general-0004', 1, 'False', 'False', 'Retrofitting usually costs more, not less.', 0),

	('true', 'cpacc-demo-practice-general-0005', 0, 'True', 'True', 'Automated checks cannot judge the whole experience.', 0),
	('false', 'cpacc-demo-practice-general-0005', 1, 'False', 'False', 'Correct: manual testing is still required.', 1),

	('true', 'cpacc-demo-practice-general-0006', 0, 'True', 'True', 'Keyboard access matters well beyond mouse-only users.', 0),
	('false', 'cpacc-demo-practice-general-0006', 1, 'False', 'False', 'Correct: many kinds of users rely on keyboard access.', 1),

	('alt', 'cpacc-demo-practice-docs-code-0001', 0, 'alt', 'alt', 'The alt attribute provides the text alternative.', 1),
	('src', 'cpacc-demo-practice-docs-code-0001', 1, 'src', 'src', 'src points to the image file, not its text alternative.', 0),
	('title', 'cpacc-demo-practice-docs-code-0001', 2, 'title', 'title', 'title is a tooltip and is not a reliable text alternative.', 0),
	('caption', 'cpacc-demo-practice-docs-code-0001', 3, 'caption', 'caption', 'caption belongs to tables, not images.', 0),

	('placeholder', 'cpacc-demo-practice-docs-code-0002', 0, 'Use placeholder text as the label', 'Placeholder only', 'Placeholder text disappears on input and is not a label.', 0),
	('label-for', 'cpacc-demo-practice-docs-code-0002', 1, 'Use a label element with a for attribute matching the input id', 'label for', 'This gives a programmatic label and a larger click target.', 1),
	('adjacent-text', 'cpacc-demo-practice-docs-code-0002', 2, 'Place a paragraph next to the input', 'Adjacent text', 'Visual proximity alone does not associate the text with the input.', 0),
	('title-attr', 'cpacc-demo-practice-docs-code-0002', 3, 'Add a title attribute to the input', 'title attribute', 'title is not a substitute for a visible, programmatic label.', 0),

	('single-h1', 'cpacc-demo-practice-docs-code-0003', 0, 'One h1 for the page title, then h2 and h3 in order', 'One h1, ordered', 'A single h1 and ordered subheadings form a usable outline.', 1),
	('all-h2', 'cpacc-demo-practice-docs-code-0003', 1, 'Make every heading an h2', 'All h2', 'Flattening the outline removes the page structure.', 0),
	('skip-levels', 'cpacc-demo-practice-docs-code-0003', 2, 'Skip from h1 to h4 for visual size', 'Skip levels', 'Skipping levels breaks the outline for assistive technology.', 0),
	('bold-text', 'cpacc-demo-practice-docs-code-0003', 3, 'Use bold paragraphs instead of headings', 'Bold text', 'Bold text is not announced as a heading.', 0),

	('click-here', 'cpacc-demo-practice-docs-code-0004', 0, 'Click here', 'Click here', 'It makes no sense out of context.', 0),
	('read-more', 'cpacc-demo-practice-docs-code-0004', 1, 'Read more', 'Read more', 'It does not say what will be read.', 0),
	('raw-url', 'cpacc-demo-practice-docs-code-0004', 2, 'The full URL', 'Full URL', 'A raw URL is hard to understand and to read aloud.', 0),
	('descriptive', 'cpacc-demo-practice-docs-code-0004', 3, 'Text that describes the destination or purpose', 'Descriptive text', 'Descriptive link text stays meaningful in a list of links.', 1);

INSERT INTO question_references (question_id, position, title, url) VALUES
	('cpacc-demo-practice-general-0001', 0, 'Demo reference: who accessibility helps', 'https://example.org/demo/audiences'),
	('cpacc-demo-practice-general-0002', 0, 'Demo reference: captions', 'https://example.org/demo/captions'),
	('cpacc-demo-practice-general-0003', 0, 'Demo reference: text alternatives', 'https://example.org/demo/alt-text'),
	('cpacc-demo-practice-general-0004', 0, 'Demo reference: accessibility business case', 'https://example.org/demo/business-case'),
	('cpacc-demo-practice-general-0005', 0, 'Demo reference: automated testing limits', 'https://example.org/demo/testing'),
	('cpacc-demo-practice-general-0006', 0, 'Demo reference: keyboard access', 'https://example.org/demo/keyboard'),
	('cpacc-demo-practice-docs-code-0001', 0, 'Demo reference: images in HTML', 'https://example.org/demo/html-images'),
	('cpacc-demo-practice-docs-code-0002', 0, 'Demo reference: labelling form controls', 'https://example.org/demo/forms'),
	('cpacc-demo-practice-docs-code-0003', 0, 'Demo reference: heading structure', 'https://example.org/demo/headings'),
	('cpacc-demo-practice-docs-code-0004', 0, 'Demo reference: link purpose', 'https://example.org/demo/links');
