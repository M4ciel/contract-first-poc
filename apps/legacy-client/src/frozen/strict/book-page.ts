// FROZEN copy of @acme/api-types@1.0.0 (strict: Orval output without post-processing, for comparison only).
// It simulates the code installed in an app that was never updated. Do not regenerate it.

import * as zod from 'zod';

export const BookPage = zod
  .strictObject({
    items: zod.array(
      zod
        .strictObject({
          id: zod.uuid().describe('Book identifier.'),
          title: zod.string().min(1).describe('Book title.'),
          author: zod.string().min(1).describe('Author display name.'),
          publishedAt: zod.iso
            .datetime({ offset: true })
            .describe('Publication instant, ISO 8601 with timezone.'),
          createdAt: zod.iso
            .datetime({ offset: true })
            .describe('When the book was added to the catalog, ISO 8601 with timezone.'),
        })
        .describe('A book in the catalog (v1 shape).'),
    ),
    nextCursor: zod
      .string()
      .nullable()
      .describe('Opaque cursor for the next page, or null on the last page.'),
  })
  .describe('A page of books. Pass `nextCursor` as `cursor` to fetch the next page.');

export type BookPage = zod.input<typeof BookPage>;
export type BookPageOutput = zod.output<typeof BookPage>;
