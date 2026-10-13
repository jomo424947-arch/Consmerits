const { spawnSync } = require('child_process');
const path = require('path');
const electron = require('electron');

const vitestPath = path.resolve(__dirname, 'node_modules', 'vitest', 'vitest.mjs');

const args = [vitestPath, 'run', '--config', 'vitest.config.ts', ...process.argv.slice(2)];

const result = spawnSync(electron, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
  },
});

process.exit(result.status ?? 0);
