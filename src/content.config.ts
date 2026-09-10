import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';
import { z } from 'astro/zod';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
		}),
});

const docs = defineCollection({
	loader: docsLoader(),
	schema: docsSchema(),
});

// Starlight 内部引用 i18n collection，定义一个空的来消除警告
const i18n = defineCollection({
	loader: i18nLoader(),
	schema: i18nSchema(),
});

export const collections = { blog, docs, i18n };
