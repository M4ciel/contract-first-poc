import {
  ALWAYS_TOLERANT,
  applyResponseFallback,
  collectResponseTypeNames,
} from './apply-response-enum-fallback-core.ts';

// Fixtures mirror the shape Orval 8 emits (see `contracts:generate`). If an Orval upgrade changes
// that shape, update them from the real output and keep every case below passing.

const header = `import * as zod from 'zod';\n\n`;

const loanSchema = `${header}export const Loan = zod
  .strictObject({
    id: zod.uuid(),
    status: zod.enum(['active', 'returned', 'overdue']).describe('Loan status.'),
  })
  .describe('A loan.');

export type Loan = zod.input<typeof Loan>;
`;

const responses = new Set(['Loan', 'BookPage', 'ProblemDetails']);

describe('collectResponseTypeNames', () => {
  const client = `
export type getLoanResponse200 = {
  data: Loan;
  status: 200;
};
export type listBooksResponse200 = { data: BookPageOutput; status: 200 };
export type listTagsResponse200 = { data: Array<Tag>; status: 200 };
export type listAuthorsResponse200 = { data: Author[]; status: 200 };
export type getLoanResponse404 = { 'data': LoanNotFoundResponse; status: 404 };
export type getLoanResponseError = getLoanResponse404 & { headers: Headers };
export type CreateLoanMutationVariables = { data: CreateLoanRequest };
export type CreateLoanMutationBody = CreateLoanRequest;
export type Indexed = { [key: string]: Ignored; method(): void; status: 200 };
export type Weird = { data?: never; status: 200 } | string;
export const getLoan = async (loanId: string): Promise<getLoanResponse200> => fetch(loanId) as never;
`;
  const names = collectResponseTypeNames(client);

  it('collects the types inside `data` of response aliases', () => {
    expect(names).toContain('Loan');
    expect(names).toContain('LoanNotFoundResponse');
  });

  it('strips the Output suffix and unwraps arrays', () => {
    expect(names).toContain('BookPage');
    expect(names).toContain('Tag');
    expect(names).toContain('Author');
    expect(names).not.toContain('BookPageOutput');
    expect(names).not.toContain('Array');
  });

  it('always includes ProblemDetails', () => {
    expect([...ALWAYS_TOLERANT].every((name) => collectResponseTypeNames('').has(name))).toBe(true);
  });

  it('ignores request types, even in aliases with a `data` property', () => {
    expect(names).not.toContain('CreateLoanRequest');
    expect(names).not.toContain('Headers');
    expect(names).not.toContain('Ignored');
  });
});

describe('applyResponseFallback', () => {
  it('replaces strictObject and looseObject with object', () => {
    const source = `${header}export const ProblemDetails = zod.looseObject({
  errors: zod.array(zod.strictObject({ pointer: zod.string() })).optional(),
});
`;
    const { source: output, changed } = applyResponseFallback(source, responses);

    expect(output).not.toMatch(/strictObject|looseObject/);
    expect(output.match(/zod\.object\(/g)).toHaveLength(2);
    expect(changed).toEqual(['ProblemDetails']);
  });

  it("adds 'unknown' and .catch('unknown') to an enum without them", () => {
    const { source } = applyResponseFallback(loanSchema, responses);

    expect(source).toContain(
      "zod.enum(['active', 'returned', 'overdue', 'unknown']).catch('unknown').describe('Loan status.')",
    );
  });

  it("only adds .catch to an enum that already has 'unknown'", () => {
    const source = loanSchema.replace("'overdue']", "'overdue', 'unknown']");
    const { source: output } = applyResponseFallback(source, responses);

    expect(output).toContain(
      "zod.enum(['active', 'returned', 'overdue', 'unknown']).catch('unknown')",
    );
    expect(output.match(/'unknown'/g)).toHaveLength(2);
  });

  it('leaves an enum that already has .catch untouched', () => {
    const source = loanSchema.replace(
      ".describe('Loan status.')",
      ".describe('Loan status.').catch('active')",
    );
    const { source: output } = applyResponseFallback(source, responses);

    expect(output).toContain(
      "zod.enum(['active', 'returned', 'overdue']).describe('Loan status.').catch('active')",
    );
    expect(output).not.toContain("'unknown'");
  });

  it('does not change request schemas', () => {
    const source = `${header}export const CreateLoanBody = zod.strictObject({
  bookId: zod.uuid(),
  kind: zod.enum(['standard', 'express']),
});
`;
    const result = applyResponseFallback(source, responses);

    expect(result.source).toBe(source);
    expect(result.matched).toEqual([]);
    expect(result.changed).toEqual([]);
  });

  it('rewrites schemas nested inside a response', () => {
    const source = `${header}export const BookPage = zod.strictObject({
  items: zod.array(
    zod.strictObject({
      format: zod.enum(['paperback', 'ebook']).optional(),
    }),
  ),
  nextCursor: zod.string().nullable(),
});
`;
    const { source: output } = applyResponseFallback(source, responses);

    expect(output).not.toContain('strictObject');
    expect(output).toContain(
      "zod.enum(['paperback', 'ebook', 'unknown']).catch('unknown').optional()",
    );
  });

  it('only touches the exported response declarations of a file', () => {
    const source = `${loanSchema}
export const LoanBody = zod.strictObject({ status: zod.enum(['active']) });
const Loan2 = zod.strictObject({});
export let Untyped;
export const { Destructured } = { Destructured: 1 };
export function helper() {}
`;
    const { source: output, matched } = applyResponseFallback(
      source,
      new Set([...responses, 'Loan2', 'Untyped', 'Destructured']),
    );

    expect(matched).toEqual(['Loan']);
    expect(output).toContain(
      "export const LoanBody = zod.strictObject({ status: zod.enum(['active']) });",
    );
    expect(output).toContain('const Loan2 = zod.strictObject({});');
  });

  it('reports a response schema with nothing to rewrite as matched but not changed', () => {
    const source = `${header}export const Loan = zod.object({ id: zod.uuid() });\n`;
    const result = applyResponseFallback(source, responses);

    expect(result).toEqual({ source, matched: ['Loan'], changed: [] });
  });

  it('skips non-string enums, enums without a literal list, and other namespaces', () => {
    const source = `${header}import * as other from 'other';
export const Loan = zod.object({
  priority: zod.enum([1, 2]),
  empty: zod.enum([]),
  dynamic: zod.enum(values),
  missing: zod.enum(),
  foreign: other.enum(['a']),
  method: zod.string().enum(['a']),
  computed: zod['enum'](['a']),
});
`;
    expect(applyResponseFallback(source, responses).source).toBe(source);
  });

  it('stops looking for .catch at a property that is not called', () => {
    const source = `${header}export const Loan = zod.object({ status: zod.enum(['a']).description });\n`;

    expect(applyResponseFallback(source, responses).source).toContain(
      "zod.enum(['a', 'unknown']).catch('unknown').description",
    );
  });

  it('keeps double quotes when the generator used them', () => {
    const source = `${header}export const Loan = zod.object({ status: zod.enum(["active"]) });\n`;

    expect(applyResponseFallback(source, responses).source).toContain(
      `zod.enum(["active", "unknown"]).catch('unknown')`,
    );
  });

  it('uses the local name of the zod namespace import', () => {
    const source = `import 'side-effect';
import { z as named } from 'zod';
import * as z from 'zod';
export const Loan = z.strictObject({ status: z.enum(['active']) });
`;
    expect(applyResponseFallback(source, responses).source).toContain(
      "z.object({ status: z.enum(['active', 'unknown']).catch('unknown') })",
    );
  });

  it('returns files without a zod namespace import unchanged', () => {
    const source = `import { z } from 'zod';\nexport const Loan = z.strictObject({});\n`;

    expect(applyResponseFallback(source, responses)).toEqual({ source, matched: [], changed: [] });
  });
});
