import nx from '@nx/eslint-plugin';
import prettier from 'eslint-config-prettier';

/**
 * Module boundaries turn the architecture into a rule the linter enforces:
 * - `scope:domain` is pure and may not depend on anything else in the repo;
 * - `scope:contracts` (generated packages) may only depend on the domain;
 * - apps (`type:app`) consume packages but nobody may import an app.
 */
export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  prettier,
  {
    ignores: [
      '**/dist',
      '**/coverage',
      '**/reports',
      '**/artifacts',
      '**/src/generated',
      '**/.nx',
      '**/node_modules',
      '**/.terraform',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            { sourceTag: 'scope:domain', onlyDependOnLibsWithTags: [] },
            {
              sourceTag: 'scope:contracts',
              onlyDependOnLibsWithTags: ['scope:contracts', 'scope:domain'],
            },
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: ['scope:contracts', 'scope:domain'],
            },
          ],
        },
      ],
    },
  },
];
