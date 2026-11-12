/**
 * Rules of the software catalog (Backstage descriptors). The catalog is only useful if it cannot
 * drift from the repository: every API, event, app and package is described, every reference
 * points to an entity that exists, and a component's dependencies match its package.json.
 * File I/O lives in catalog-check.ts.
 */
import { posix } from 'node:path';

export const API_VERSION = 'backstage.io/v1alpha1';
const KINDS = ['Location', 'Domain', 'System', 'Group', 'Component', 'API'] as const;
const LIFECYCLES = ['experimental', 'production', 'deprecated'];
const API_TYPES = ['openapi', 'asyncapi', 'json-schema'];
const COMPONENT_TYPES = ['service', 'website', 'library'];
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface Entity {
  readonly apiVersion?: unknown;
  readonly kind?: unknown;
  readonly metadata?: {
    readonly name?: unknown;
    readonly title?: unknown;
    readonly description?: unknown;
  };
  readonly spec?: Record<string, unknown>;
}

/** One document of a descriptor file; `file` is relative to the repository root. */
export interface LoadedEntity {
  readonly file: string;
  readonly entity: Entity;
}

/** What the repository contains, gathered by the caller. Paths are relative to the root. */
export interface RepositoryFacts {
  /** Whether a file exists. */
  readonly exists: (file: string) => boolean;
  /** Every descriptor file found in the repository, the root Location excluded. */
  readonly descriptorFiles: readonly string[];
  /** `contracts/apis/<api>/openapi.yaml` files. */
  readonly openapiFiles: readonly string[];
  /** `contracts/events/<event>` folders. */
  readonly eventFolders: readonly string[];
  /** Folders of apps and published packages (`apps/*`, `contracts/packages/*`), with their manifest. */
  readonly projects: ReadonlyArray<{
    readonly folder: string;
    readonly name: string;
    readonly acmeDependencies: readonly string[];
  }>;
}

const list = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/** `team-lending`, `group:team-lending` and `group:default/team-lending` → `group:team-lending`. */
export const parseRef = (ref: string, defaultKind: string): string => {
  const [kind, rest] = ref.includes(':') ? ref.split(':', 2) : [defaultKind, ref];
  const name = String(rest).replace(/^default\//, '');
  return `${String(kind).toLowerCase()}:${name}`;
};

const keyOf = ({ entity }: LoadedEntity) =>
  `${String(entity.kind).toLowerCase()}:${String(entity.metadata?.name)}`;

/** Shape of a single entity: kind, name, description and the allowed values of its spec. */
export const checkEntity = ({ file, entity }: LoadedEntity): string[] => {
  const problems: string[] = [];
  const where = `${file} (${String(entity.kind)} ${String(entity.metadata?.name)})`;
  if (entity.apiVersion !== API_VERSION)
    problems.push(`${where}: apiVersion must be ${API_VERSION}`);
  if (!(KINDS as readonly unknown[]).includes(entity.kind)) {
    problems.push(`${where}: kind must be one of ${KINDS.join(', ')}`);
  }
  const name = entity.metadata?.name;
  if (typeof name !== 'string' || !NAME.test(name)) {
    problems.push(`${where}: metadata.name must be lowercase kebab-case`);
  }
  const description = entity.metadata?.description;
  if (typeof description !== 'string' || description.trim() === '') {
    problems.push(`${where}: metadata.description is required`);
  }
  const spec = entity.spec ?? {};
  const allowed = (field: string, values: readonly string[]) => {
    if (!values.includes(spec[field] as string)) {
      problems.push(`${where}: spec.${field} must be one of ${values.join(', ')}`);
    }
  };
  if (entity.kind === 'API') allowed('type', API_TYPES);
  if (entity.kind === 'Component') allowed('type', COMPONENT_TYPES);
  if (entity.kind === 'API' || entity.kind === 'Component') allowed('lifecycle', LIFECYCLES);
  return problems;
};

/** Every reference of an entity, as `[field, kind:name]`. */
const referencesOf = ({ entity }: LoadedEntity): Array<[string, string]> => {
  const spec = entity.spec ?? {};
  const single = (field: string, kind: string): Array<[string, string]> =>
    typeof spec[field] === 'string' ? [[field, parseRef(spec[field], kind)]] : [];
  const many = (field: string, kind: string): Array<[string, string]> =>
    list(spec[field]).map((ref) => [field, parseRef(ref, kind)]);
  return [
    ...single('owner', 'group'),
    ...single('system', 'system'),
    ...single('domain', 'domain'),
    ...many('providesApis', 'api'),
    ...many('consumesApis', 'api'),
    ...many('dependsOn', 'component'),
  ];
};

const definitionOf = ({ file, entity }: LoadedEntity): string | undefined => {
  const text = (entity.spec?.['definition'] as { $text?: unknown } | undefined)?.$text;
  return typeof text === 'string' ? posix.join(posix.dirname(file), text) : undefined;
};

/** Every rule that needs the whole catalog or the repository. */
export const checkCatalog = (
  location: LoadedEntity,
  entities: readonly LoadedEntity[],
  facts: RepositoryFacts,
): string[] => {
  const problems = entities.flatMap(checkEntity);
  const keys = new Map<string, LoadedEntity>();
  for (const loaded of entities) {
    const key = keyOf(loaded);
    if (keys.has(key)) problems.push(`${loaded.file}: ${key} is defined twice`);
    keys.set(key, loaded);
  }

  // References point to entities that exist, and owners are groups.
  for (const loaded of entities) {
    for (const [field, ref] of referencesOf(loaded)) {
      if (!keys.has(ref)) problems.push(`${loaded.file}: spec.${field} ${ref} does not exist`);
    }
    const required = {
      Component: ['owner', 'system'],
      API: ['owner', 'system'],
      System: ['owner', 'domain'],
      Domain: ['owner'],
    }[String(loaded.entity.kind)];
    for (const field of required ?? []) {
      if (typeof loaded.entity.spec?.[field] !== 'string') {
        problems.push(`${loaded.file}: spec.${field} is required`);
      }
    }
  }

  // The root Location lists exactly the descriptor files of the repository.
  const root = posix.dirname(location.file);
  const targets = list(location.entity.spec?.['targets']).map((target) => posix.join(root, target));
  for (const file of facts.descriptorFiles.filter((file) => !targets.includes(file))) {
    problems.push(`${location.file}: ${file} is not listed in spec.targets`);
  }
  for (const file of targets.filter((target) => !facts.descriptorFiles.includes(target))) {
    problems.push(`${location.file}: target ${file} does not exist`);
  }

  // Every API has a definition that exists, and exactly one component provides it.
  const apis = entities.filter(({ entity }) => entity.kind === 'API');
  const components = entities.filter(({ entity }) => entity.kind === 'Component');
  const definitions = new Set<string>();
  for (const api of apis) {
    const definition = definitionOf(api);
    if (definition === undefined || !facts.exists(definition)) {
      problems.push(`${api.file}: spec.definition.$text must point to an existing file`);
    } else {
      definitions.add(definition);
    }
    const providers = components.filter((component) =>
      list(component.entity.spec?.['providesApis'])
        .map((ref) => parseRef(ref, 'api'))
        .includes(keyOf(api)),
    );
    if (providers.length !== 1) {
      problems.push(
        `${api.file}: ${keyOf(api)} must be provided by exactly one component (found ${providers.length})`,
      );
    }
  }

  // Every contract is described in the catalog.
  for (const file of facts.openapiFiles.filter((file) => !definitions.has(file))) {
    problems.push(`${file}: no API entity uses it as its definition`);
  }
  for (const folder of facts.eventFolders) {
    if (!apis.some(({ file }) => posix.dirname(file) === folder)) {
      problems.push(`${folder}: the event has no catalog-info.yaml`);
    }
  }

  // Every app and package is a component whose dependencies match its package.json.
  const libraries = new Map(
    components
      .filter(({ entity }) => entity.spec?.['type'] === 'library')
      .map((loaded) => [String(loaded.entity.metadata?.title), keyOf(loaded)]),
  );
  for (const project of facts.projects) {
    const component = components.find(({ file }) => posix.dirname(file) === project.folder);
    if (!component) {
      problems.push(`${project.folder}: ${project.name} has no catalog-info.yaml`);
      continue;
    }
    if (
      component.entity.spec?.['type'] === 'library' &&
      component.entity.metadata?.title !== project.name
    ) {
      problems.push(`${component.file}: metadata.title must be the package name ${project.name}`);
    }
    const expected = project.acmeDependencies
      .map((name) => libraries.get(name) ?? `(no library component for ${name})`)
      .sort();
    const declared = list(component.entity.spec?.['dependsOn'])
      .map((ref) => parseRef(ref, 'component'))
      .sort();
    if (expected.join() !== declared.join()) {
      problems.push(
        `${component.file}: spec.dependsOn must match the @acme dependencies of package.json: [${expected.join(', ')}]`,
      );
    }
  }
  return problems;
};
