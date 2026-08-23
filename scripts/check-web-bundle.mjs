// Compiles the exported web bundle the way a browser does when it is loaded via
// <script src="..."> — as a classic script, not a module.
//
// This exists because of a real failure. pdf.js carries `createRequire(import.meta.url)` in two
// Node-only branches, and `import.meta` is a *parse-time* error in a classic script. Bundling
// pdf.js therefore killed the entire app before a line of it ran: a white screen whose only clue
// was one SyntaxError in the console. Every other gate passed — typecheck, lint, tests, the export
// itself, and even `node --check`, which parses ambiguously and lets `import.meta` through.
//
// vm.Script compiles in script context, so it reproduces the browser's behaviour exactly.

import { createRequire } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
void require;

const BUNDLE_DIR = join('dist', '_expo', 'static', 'js', 'web');

let files;
try {
  files = readdirSync(BUNDLE_DIR).filter((name) => name.endsWith('.js'));
} catch {
  console.error(`No bundle directory at ${BUNDLE_DIR}. Run \`expo export --platform web\` first.`);
  process.exit(1);
}

if (files.length === 0) {
  console.error(`No JavaScript bundles found in ${BUNDLE_DIR}.`);
  process.exit(1);
}

let failed = false;

for (const name of files) {
  const code = readFileSync(join(BUNDLE_DIR, name), 'utf8');
  try {
    new vm.Script(code, { filename: name });
    console.log(`ok    ${name} — compiles as a classic script`);
  } catch (error) {
    failed = true;
    console.error(`FAIL  ${name} — ${error.message}`);
    console.error(
      '      A browser loading this with <script src> would throw the same error and render nothing.'
    );
  }
}

process.exit(failed ? 1 : 0);
