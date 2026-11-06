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
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          // Generated code is git-ignored, so it is outside the Nx project graph. Package entry
          // points may re-export it; nothing else in a package may import it.
          allow: ['./generated/**'],
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
