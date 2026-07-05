const { spawnSync } = require('node:child_process');
const path = require('node:path');

const eslintBin = path.join(path.dirname(require.resolve('eslint/package.json')), 'bin/eslint.js');
const result = spawnSync(process.execPath, [eslintBin, ...process.argv.slice(2)], {
  env: { ...process.env, ESLINT_USE_FLAT_CONFIG: 'false' },
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
