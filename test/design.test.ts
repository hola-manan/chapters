import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

function getTsFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getTsFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      results.push(fullPath);
    }
  }
  return results;
}

function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '');
}

export function findPackageImportViolations(files: string[]): { file: string; specifier: string }[] {
  const violations: { file: string; specifier: string }[] = [];

  const staticImportRegex = /\bimport\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  const dynamicRegex = /\b(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const stripped = stripComments(content);

    let match: RegExpExecArray | null;

    staticImportRegex.lastIndex = 0;
    while ((match = staticImportRegex.exec(stripped)) !== null) {
      const specifier = match[1];
      if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
        violations.push({
          file: path.relative(process.cwd(), filePath),
          specifier,
        });
      }
    }

    dynamicRegex.lastIndex = 0;
    while ((match = dynamicRegex.exec(stripped)) !== null) {
      const specifier = match[1];
      if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
        violations.push({
          file: path.relative(process.cwd(), filePath),
          specifier,
        });
      }
    }
  }

  return violations;
}

test('enforce no-package-import rule for design/ layer (permits relative imports)', () => {
  const designDir = path.resolve(process.cwd(), 'design');
  assert.ok(fs.existsSync(designDir), 'design/ directory must exist');

  const files = getTsFiles(designDir);
  assert.ok(files.length > 0, 'design/ directory must contain .ts files');

  const violations = findPackageImportViolations(files);

  assert.strictEqual(
    violations.length,
    0,
    `Files under design/ may only use relative imports (starting with ./ or ../) within design/. Package imports found:\n${JSON.stringify(
      violations,
      null,
      2
    )}`
  );
});

test('verify themes.ts contains no hex literals', () => {
  const themesPath = path.resolve(process.cwd(), 'design', 'themes.ts');
  assert.ok(fs.existsSync(themesPath), 'design/themes.ts must exist');

  const content = fs.readFileSync(themesPath, 'utf8');
  const stripped = stripComments(content);

  const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;
  const matches = stripped.match(hexRegex);

  assert.strictEqual(
    matches,
    null,
    `themes.ts must not contain hex literals. Found: ${JSON.stringify(matches)}`
  );
});

test('verify files under ui/ and features/ contain no hex colour literals', () => {
  const uiDir = path.resolve(process.cwd(), 'ui');
  const featuresDir = path.resolve(process.cwd(), 'features');
  assert.ok(fs.existsSync(uiDir), 'ui/ directory must exist');
  assert.ok(fs.existsSync(featuresDir), 'features/ directory must exist');

  const files = [...getTsFiles(uiDir), ...getTsFiles(featuresDir)];
  assert.ok(files.length > 0, 'ui/ and features/ directories must contain files');

  const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;
  const violations: { file: string; matches: string[] }[] = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const stripped = stripComments(content);
    const matches = stripped.match(hexRegex);
    if (matches && matches.length > 0) {
      violations.push({
        file: path.relative(process.cwd(), filePath),
        matches,
      });
    }
  }

  assert.strictEqual(
    violations.length,
    0,
    `Files under ui/ and features/ must not contain hex colour literals. Found violations:\n${JSON.stringify(
      violations,
      null,
      2
    )}`
  );
});

test('enforce tier 2 imports rule for ui/ layer (may import design/ or relative within ui/ only)', () => {
  const uiDir = path.resolve(process.cwd(), 'ui');
  assert.ok(fs.existsSync(uiDir), 'ui/ directory must exist');

  const files = getTsFiles(uiDir);
  assert.ok(files.length > 0, 'ui/ directory must contain files');

  const forbiddenImports: { file: string; specifier: string }[] = [];
  const relativeImportRegex = /\bfrom\s+['"](\.\.[^'"]+)['"]/g;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const stripped = stripComments(content);
    let match: RegExpExecArray | null;

    relativeImportRegex.lastIndex = 0;
    while ((match = relativeImportRegex.exec(stripped)) !== null) {
      const specifier = match[1];
      const resolved = path.resolve(path.dirname(filePath), specifier);
      const designDir = path.resolve(process.cwd(), 'design');
      const uiDirResolved = path.resolve(process.cwd(), 'ui');

      if (!resolved.startsWith(uiDirResolved) && !resolved.startsWith(designDir)) {
        forbiddenImports.push({
          file: path.relative(process.cwd(), filePath),
          specifier,
        });
      }
    }
  }

  assert.strictEqual(
    forbiddenImports.length,
    0,
    `Files under ui/ may only import from design/ or within ui/. Forbidden relative imports found:\n${JSON.stringify(
      forbiddenImports,
      null,
      2
    )}`
  );
});
