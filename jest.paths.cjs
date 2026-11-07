// Builds Jest's `moduleNameMapper` from the `paths` of a project's tsconfig.json, so the folder
// aliases (`@config/*`, `@problems/*`, ...) are declared once, in the tsconfig.
const path = require('node:path');
const ts = require('typescript');

module.exports.tsconfigPathsMapper = (projectDir) => {
  const file = path.join(projectDir, 'tsconfig.json');
  const { config, error } = ts.readConfigFile(file, ts.sys.readFile);
  if (error) throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'));
  const paths = config.compilerOptions?.paths ?? {};
  return Object.fromEntries(
    Object.entries(paths).map(([alias, [target]]) => [
      // `@config/app-config.js` (Node ESM needs the extension) maps back to the `.ts` source.
      `^${alias.replace('/*', '')}/(.*?)(\\.js)?$`,
      `<rootDir>/${target.replace(/^\.\//, '').replace('/*', '')}/$1`,
    ]),
  );
};
