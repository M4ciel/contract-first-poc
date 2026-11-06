/**
 * Tolerant responses (Postel's law): be strict in what you send, tolerant in what you receive.
 *
 * Orval emits every model schema as `zod.strictObject` and every enum as a closed `zod.enum`. That
 * is right for requests, but an old client parsing a response would break as soon as the server
 * adds a field or an enum value, which the compatibility rules allow. This module rewrites only
 * the response schemas so that:
 *
 * - `strictObject` / `looseObject` become `object` (unknown fields are accepted and dropped);
 * - every string `enum` gains an `'unknown'` member and `.catch('unknown')`.
 *
 * It works on the TypeScript AST, never on regular expressions, and is pure: the runner
 * (`apply-response-enum-fallback.ts`) does the file I/O.
 */
import ts from 'typescript';

export const UNKNOWN_ENUM_VALUE = 'unknown';

/** Schemas that are part of every error response, even when no alias names them directly. */
export const ALWAYS_TOLERANT = ['ProblemDetails'] as const;

interface Edit {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

export interface FallbackResult {
  readonly source: string;
  /** Exported declarations whose names are response schemas, in source order. */
  readonly matched: readonly string[];
  /** The subset of `matched` that was rewritten. */
  readonly changed: readonly string[];
}

const parse = (fileName: string, source: string): ts.SourceFile =>
  ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

const propertyName = (member: ts.TypeElement): string | undefined =>
  ts.isPropertySignature(member) &&
  (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name))
    ? member.name.text
    : undefined;

/** Collects the schema names referenced by a type, skipping `Array` and the `Output` suffix. */
const collectTypeReferences = (node: ts.Node, names: Set<string>): void => {
  if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
    const name = node.typeName.text;
    if (name !== 'Array' && name !== 'ReadonlyArray') {
      names.add(name.endsWith('Output') ? name.slice(0, -'Output'.length) : name);
    }
  }
  ts.forEachChild(node, (child) => collectTypeReferences(child, names));
};

/**
 * Finds the response schema names in an Orval client. A response alias is a type literal with
 * both `data` and `status` properties (`type getLoanResponse200 = { data: Loan; status: 200 }`).
 * Requiring `status` matters: react-query mutation variables (`{ data: CreateLoanRequest }`) also
 * have a `data` property but describe a request.
 */
export const collectResponseTypeNames = (clientSource: string): Set<string> => {
  const names = new Set<string>(ALWAYS_TOLERANT);
  const sourceFile = parse('client.ts', clientSource);

  for (const statement of sourceFile.statements) {
    if (!ts.isTypeAliasDeclaration(statement) || !ts.isTypeLiteralNode(statement.type)) continue;

    const members = statement.type.members;
    const data = members.find((member) => propertyName(member) === 'data');
    const hasStatus = members.some((member) => propertyName(member) === 'status');
    if (data && hasStatus && ts.isPropertySignature(data) && data.type) {
      collectTypeReferences(data.type, names);
    }
  }
  return names;
};

/** The local name of `import * as <name> from 'zod'` (Orval uses `zod`), if any. */
const zodNamespace = (sourceFile: ts.SourceFile): string | undefined => {
  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === 'zod' &&
      statement.importClause?.namedBindings &&
      ts.isNamespaceImport(statement.importClause.namedBindings)
    ) {
      return statement.importClause.namedBindings.name.text;
    }
  }
  return undefined;
};

/** `zod.<method>(...)` where `zod` is the namespace import. */
const isZodCall = (
  node: ts.Node,
  namespace: string,
  methods: readonly string[],
): node is ts.CallExpression =>
  ts.isCallExpression(node) &&
  ts.isPropertyAccessExpression(node.expression) &&
  ts.isIdentifier(node.expression.expression) &&
  node.expression.expression.text === namespace &&
  methods.includes(node.expression.name.text);

/** True when `.catch(...)` is already chained anywhere after the given call. */
const hasCatchInChain = (call: ts.CallExpression): boolean => {
  let current: ts.Node = call;
  while (ts.isPropertyAccessExpression(current.parent) && current.parent.expression === current) {
    if (current.parent.name.text === 'catch') return true;
    const next = current.parent.parent;
    if (!ts.isCallExpression(next)) return false;
    current = next;
  }
  return false;
};

const enumEdits = (call: ts.CallExpression, sourceFile: ts.SourceFile): Edit[] => {
  const [values] = call.arguments;
  if (!values || !ts.isArrayLiteralExpression(values) || hasCatchInChain(call)) return [];

  const elements = values.elements.filter(ts.isStringLiteral);
  // Only string enums get the fallback: a numeric enum has no meaningful 'unknown'.
  if (elements.length === 0 || elements.length !== values.elements.length) return [];

  const edits: Edit[] = [];
  const last = elements[elements.length - 1];
  if (last && !elements.some((element) => element.text === UNKNOWN_ENUM_VALUE)) {
    const quote = sourceFile.text[last.getStart(sourceFile)] === '"' ? '"' : "'";
    edits.push({ start: last.end, end: last.end, text: `, ${quote}${UNKNOWN_ENUM_VALUE}${quote}` });
  }
  edits.push({ start: call.end, end: call.end, text: `.catch('${UNKNOWN_ENUM_VALUE}')` });
  return edits;
};

/**
 * Rewrites the exported declarations of a `*.zod.ts` file whose names are in `responseNames`.
 * Other declarations (request bodies, parameters) are left untouched.
 */
export const applyResponseFallback = (
  schemaSource: string,
  responseNames: ReadonlySet<string>,
  fileName = 'schema.zod.ts',
): FallbackResult => {
  const sourceFile = parse(fileName, schemaSource);
  const namespace = zodNamespace(sourceFile);
  if (!namespace) return { source: schemaSource, matched: [], changed: [] };

  const edits: Edit[] = [];
  const matched: string[] = [];
  const changed: string[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const exported = statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported) continue;

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !responseNames.has(declaration.name.text)) continue;
      if (!declaration.initializer) continue;
      matched.push(declaration.name.text);

      const before = edits.length;
      const visit = (node: ts.Node): void => {
        if (isZodCall(node, namespace, ['strictObject', 'looseObject'])) {
          const name = (node.expression as ts.PropertyAccessExpression).name;
          edits.push({ start: name.getStart(sourceFile), end: name.end, text: 'object' });
        } else if (isZodCall(node, namespace, ['enum'])) {
          edits.push(...enumEdits(node, sourceFile));
        }
        ts.forEachChild(node, visit);
      };
      visit(declaration.initializer);
      if (edits.length > before) changed.push(declaration.name.text);
    }
  }

  // Back to front, so earlier positions stay valid while later text changes.
  const source = edits
    .sort((a, b) => b.start - a.start)
    .reduce(
      (text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end),
      schemaSource,
    );

  return { source, matched, changed };
};
