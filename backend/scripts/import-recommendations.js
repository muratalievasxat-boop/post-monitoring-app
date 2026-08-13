#!/usr/bin/env node

// Compatibility entrypoint. The authoritative importer lives in tools/ and
// targets only the canonical public UUID schema.
import path from 'node:path';
import { runCleanImport } from '../../tools/import-xlsx-clean.js';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node scripts/import-recommendations.js <path-to-xlsx>');
  process.exit(1);
}

runCleanImport(filePath)
  .then(result => {
    console.log(`Imported ${result.rows} rows from ${path.basename(result.filePath)}`);
    console.log(
      `Control: ${result.control.total} | ${result.control.active} | `
      + `${result.control.done} | ${result.control.excluded}`,
    );
  })
  .catch(error => {
    console.error(`Import failed: ${error.message}`);
    process.exit(1);
  });
