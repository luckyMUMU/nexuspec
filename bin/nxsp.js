#!/usr/bin/env node

import('../dist/index.js').catch((err) => {
  console.error('Error starting nxsp:', err);
  process.exit(1);
});
